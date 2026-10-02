import { CylinderGeometry,Group,Mesh,MeshStandardMaterial,Vector3 } from 'three';
import type { ImplementId } from '../../gameplay/vehicles/ImplementRegistry';
import { hitchName } from '../../gameplay/vehicles/ImplementRegistry';
import type { HitchRelation,VehicleProgress } from '../../gameplay/vehicles/VehicleState';
import { normalizeYaw } from '../../gameplay/vehicles/VehicleState';
import { drawbarYaw,headingDifference,hullsOverlap } from '../../gameplay/vehicles/HitchMath';
import type { MotionPose } from '../../gameplay/vehicles/VehicleMotion';
import { hitsDynamicObstacle } from '../../world/Collision';
import type { InteractionOutcome,InteractionPosition } from '../InteractionSystem';
import type { VehicleAttachmentDriver,VehicleNavigation } from './Vehicle';
import type { TractorVehicle } from './TractorVehicle';
import type { ImplementVehicle } from './ImplementVehicle';
import type { PlowingSystem,PlowReport } from '../../gameplay/farm/PlowingSystem';
import type { SeedingSystem,SeedReport } from '../../gameplay/farm/SeedingSystem';

interface Choice { tool:ImplementVehicle;relation:HitchRelation;mode:'attach'|'detach';distance:number;prompt:string;reason?:string }
export class HitchSystem implements VehicleAttachmentDriver {
  readonly presentation=new Group();private links=new Map<ImplementId,Mesh>();
  private relations:HitchRelation[]=[];private progress?:VehicleProgress;
  private work?:PlowingSystem;private report?:PlowReport;private tilledThisRun=0;
  private seeding?:SeedingSystem;private seedReport?:SeedReport;private seededThisRun=0;
  private transport?:{hint:()=>string;unload:()=>InteractionOutcome};
  constructor(private tractor:TractorVehicle,readonly tools:readonly ImplementVehicle[],private navigation:VehicleNavigation,private save:()=>void=()=>{}){
    this.presentation.name='FarmHitchConnections';const material=new MeshStandardMaterial({color:'#515a59',roughness:.9});const geometry=new CylinderGeometry(.025,.025,1,6);
    for(const tool of tools){const link=new Mesh(geometry,material);link.name=`Coupling_${tool.id}`;link.visible=false;this.links.set(tool.id,link);this.presentation.add(link);}
    tractor.attachmentDriver=this;
  }
  isAttached(id:string){return this.relations.some(a=>a.implementId===id);}
  setTransport(driver:{hint:()=>string;unload:()=>InteractionOutcome}){this.transport=driver;}
  get cargoHint(){return this.isAttached('farm.trailer')?this.transport?.hint():undefined;}
  get machineControls(){return this.isAttached('farm.trailer')?'W / S 前进后退　A / D 转向　Space 刹车　H 挂接 / 分离　J 农具　K 换种　U 谷仓卸货　E 下车':undefined;}
  unload=():InteractionOutcome=>this.transport?.unload()??{status:'unavailable',message:'请挂接拖车并在谷仓停稳后卸货。'};
  get attachments(){return this.relations.map(a=>({...a}));}
  setWork(work:PlowingSystem,seeding?:SeedingSystem){this.work=work;this.seeding=seeding;this.resetFeedback();}
  private resetFeedback(){this.report=undefined;this.seedReport=undefined;this.tilledThisRun=0;this.seededThisRun=0;}
  bind(progress:VehicleProgress){
    this.progress=progress;const saved=progress.snapshot();this.relations=saved.attachments;
    const ignore=this.tools.map(t=>t.collision);
    // Validate against fixed terrain first; defaults must not obstruct a swapped
    // pair of valid saved tool positions while their models are being restored.
    for(const tool of this.tools){const pose=saved.implements.find(p=>p.id===tool.id);tool.seedCropId=tool.definition.work?.kind==='seed'?(pose?.seedCropId&&this.seeding?.registry.has(pose.seedCropId)?pose.seedCropId:this.seeding?.registry.list()[0]?.id):undefined;tool.setWorkState(pose?.workState??'RAISED',true);if(pose&&this.navigation.acceptsHull(tool.hull(pose),tool.height,ignore))tool.setPose(pose,true);}
  }
  restore(){
    for(const relation of [...this.relations]){
      const tool=this.tools.find(t=>t.id===relation.implementId)!;const pose=this.project(tool,relation,this.tractor.pose,true);
      if(pose&&this.valid(tool,pose))tool.setPose(pose,true);else this.relations=this.relations.filter(a=>a!==relation);
    }
    for(const tool of this.tools)if(!this.isAttached(tool.id)&&(!this.valid(tool,tool.pose)||hullsOverlap(tool.hull(tool.pose),this.tractor.collision))){
      const base=tool.defaultPose;
      for(const offset of [0,2,-2,4,-4]){const pose={...base,z:base.z+offset};if(this.valid(tool,pose)&&!hullsOverlap(tool.hull(pose),this.tractor.collision)){tool.setPose(pose,true);break;}}
    }
    for(const tool of this.tools)if(!this.isAttached(tool.id))tool.setWorkState('RAISED',true);
    this.record();this.updateLinks();
  }
  private valid(tool:ImplementVehicle,pose:MotionPose){return this.navigation.acceptsHull(tool.hull(pose),tool.height,[tool.collision]);}
  private project(tool:ImplementVehicle,relation:HitchRelation,parent:MotionPose,restoring=false):MotionPose|undefined {
    const joint=this.tractor.hitchPosition(relation.port,parent),expected=normalizeYaw(parent.yaw+(relation.port==='Hitch_Front'?Math.PI:0));
    let yaw=expected;
    if(tool.definition.coupling==='drawbar'){
      const previous=tool.frontPosition();yaw=drawbarYaw(tool.pose.yaw,expected,restoring?0:joint.x-previous.x,restoring?0:joint.z-previous.z,tool.frontLocal.z);
    }
    const f=tool.frontLocal,pose={x:joint.x-Math.cos(yaw)*f.x-Math.sin(yaw)*f.z,z:joint.z+Math.sin(yaw)*f.x-Math.cos(yaw)*f.z,yaw};
    const y=this.navigation.groundHull(tool.hull(pose));if(y===undefined||Math.abs(y+f.y-joint.y)>.25)return;
    return pose;
  }
  accepts(parent:MotionPose){
    const projected:{tool:ImplementVehicle;pose:MotionPose}[]=[];
    for(const relation of this.relations){const tool=this.tools.find(t=>t.id===relation.implementId)!,pose=this.project(tool,relation,parent);if(!pose||!this.valid(tool,pose))return false;projected.push({tool,pose});}
    return !projected.some((a,i)=>projected.slice(i+1).some(b=>hullsOverlap(a.tool.hull(a.pose),b.tool.hull(b.pose))));
  }
  move(parent:MotionPose){
    const sweeps:{tool:ImplementVehicle;from:MotionPose;to:MotionPose}[]=[];
    for(const relation of this.relations){const tool=this.tools.find(t=>t.id===relation.implementId)!,pose=this.project(tool,relation,parent);if(pose){sweeps.push({tool,from:tool.pose,to:pose});tool.setPose(pose);}}
    this.updateLinks(parent);
    for(const {tool,from,to} of sweeps)if(tool.workState==='LOWERED'&&tool.workFootprint&&this.tractor.occupied){
      if(tool.definition.work?.kind==='till'&&this.work){this.report=this.work.sweep(from,to,tool.workFootprint,()=>this.record());this.tilledThisRun+=this.report.changedCells;}
      if(tool.definition.work?.kind==='seed'&&this.seeding){
        this.seedReport=this.seeding.sweep(from,to,tool.workFootprint,tool.seedCropId??'',exhausted=>{if(exhausted)tool.setWorkState('RAISED');this.record();});this.seededThisRun+=this.seedReport.changedCells;
        if((this.seedReport.exhausted||this.seedReport.failed)&&tool.workState==='LOWERED'){tool.setWorkState('RAISED');this.record();this.save();}
      }
    }
  }
  record(){this.progress?.commitFleet({id:this.tractor.id,worldId:'FARM',...this.tractor.pose},this.tools.map(t=>t.snapshot()),this.relations);}
  get cameraDistance(){return this.relations.some(a=>a.port==='Hitch_Back')?4.8:3.4;}
  get hint(){const c=this.choose();return c?`H ${c.reason??c.prompt}`:'H 靠近农具并对准连接点';}
  private get seeder(){return this.tools.find(t=>t.definition.work?.kind==='seed'&&this.isAttached(t.id));}
  get seedChoices(){return this.seeder&&this.seeding?this.seeding.choices(this.seeder.seedCropId):[];}
  selectSeed(cropId?:string):InteractionOutcome {
    const tool=this.seeder,work=this.seeding;if(!tool||!work||!this.tractor.occupied)return {status:'unavailable',message:'请先上车并挂接播种机，再选择种子。'};
    const crops=work.registry.list(),id=cropId??crops[(crops.findIndex(c=>c.id===tool.seedCropId)+1)%crops.length]?.id;
    const crop=id?work.registry.get(id):undefined;if(!crop)return {status:'unavailable',message:'请选择已注册的作物种子。'};
    tool.seedCropId=crop.id;if(!work.count(crop.id)||work.plantingReason(crop.id))tool.setWorkState('RAISED');this.seedReport=undefined;this.seededThisRun=0;this.record();this.save();
    return {status:'success',changed:true,message:`已选择${crop.name}种子 · 背包剩余 ${work.count(crop.id)} 份${work.plantingReason(crop.id)?` · ${work.plantingReason(crop.id)}`:work.count(crop.id)?'':' · 种子不足，播种机已停止'}`};
  }
  private get workingTool(){return this.seeder??this.tools.find(t=>t.definition.work&&this.isAttached(t.id));}
  get presentationWork(){const tool=this.workingTool;return {kind:tool?.definition.work?.kind==='till'?'till' as const:tool?.definition.work?.kind==='seed'?'seed' as const:undefined,enabled:tool?.workState==='LOWERED',operations:tool?.definition.work?.kind==='seed'?this.seededThisRun:this.tilledThisRun};}
  get workHint(){
    const tool=this.workingTool;if(!tool)return 'J 挂接犁地机 / 播种机后可抬起 / 落下';
    const b=tool.workFootprint!,width=(b.maxX-b.minX).toFixed(2);
    if(tool.definition.work?.kind==='seed'){
      const crop=tool.seedCropId?this.seeding?.registry.get(tool.seedCropId):undefined,count=crop?this.seeding!.count(crop.id):0,r=this.seedReport;
      const mode=tool.workState==='LOWERED'?'落下 · 作业开启 · J 停止':'抬起 · 作业停止 · J 开启';
      const feedback=crop&&this.seeding?.plantingReason(crop.id)?this.seeding.plantingReason(crop.id):!crop?'请选择种子':!count?'种子不足 · 已停止播种':r?.failed?'播种失败 · 已停止':tool.workState==='RAISED'?'不播种':Math.abs(this.tractor.speed)<.02?'停稳待作业':r?.changedCells?'播种中':r?.protectedCells?'已有作物已保护':r&&!r.inField&&!r.coveredCells?'农田外 · 不播种':'仅在空白已耕地播种';
      return `播种机 ${mode} · ${crop?.name??'未选种'}种子 ${count} 份 · ${feedback} · 本次播种 ${this.seededThisRun} 格 · 宽 ${width}m · K 换种`;
    }
    if(tool.workState==='RAISED')return `犁地机 抬起 · 不作业 · J 落下 · 宽 ${width}m`;
    const r=this.report,feedback=Math.abs(this.tractor.speed)<.02?'停稳待作业':r?.protectedCells?'已有作物已保护':r&&!r.inField&&!r.coveredCells?'农田外 · 不作业':r?.alreadyTilledCells?'经过已耕地':r?.changedCells?'耕地中':'沿农田行驶作业';
    return `犁地机 落下 · J 抬起 · ${feedback} · 本次新增 ${this.tilledThisRun} 格`;
  }
  toggleWork():InteractionOutcome {
    const tool=this.workingTool;if(!tool||!this.work||!this.tractor.occupied)return {status:'unavailable',message:'请先上车并挂接作业农具，再按 J 抬起 / 落下。'};
    if(tool.definition.work?.kind==='seed'&&tool.workState==='RAISED'&&(!tool.seedCropId||!this.seeding?.count(tool.seedCropId)))return {status:'unavailable',message:'背包种子不足 · 换一种种子或补充后按 J 开启播种。'};
    if(tool.definition.work?.kind==='seed'&&tool.workState==='RAISED'&&tool.seedCropId){const reason=this.seeding?.plantingReason(tool.seedCropId);if(reason)return {status:'unavailable',message:reason};}
    tool.setWorkState(tool.workState==='RAISED'?'LOWERED':'RAISED');this.resetFeedback();this.record();this.save();
    return {status:'success',changed:true,message:tool.workState==='LOWERED'?(tool.definition.work?.kind==='seed'?'播种机已落下 · 使用背包种子，仅对空白已耕地播种。':'犁地机已落下 · 经过主农田时耕地，已有作物会被保护。'):`${tool.definition.name}已抬起 · 停止作业，可安全转场。`};
  }
  inspect(id?:ImplementId){return this.choose(id);}
  private choose(id?:ImplementId):Choice|undefined {
    const candidates:Choice[]=[];
    for(const tool of this.tools){
      if(id&&tool.id!==id)continue;
      const existing=this.relations.find(a=>a.implementId===tool.id);
      if(existing){candidates.push({tool,relation:existing,mode:'detach',distance:0,prompt:`分离${tool.definition.name} · ${hitchName(existing.port)}`,reason:Math.abs(this.tractor.speed)>.12?'Space 刹车 · 停稳后分离':undefined});continue;}
      for(const port of tool.definition.ports){
        const joint=this.tractor.hitchPosition(port),front=tool.frontPosition(),delta=front.clone().sub(joint),distance=Math.hypot(delta.x,delta.z),expected=this.tractor.yaw+(port==='Hitch_Front'?Math.PI:0);
        const side=Math.abs(delta.x*Math.cos(this.tractor.yaw)-delta.z*Math.sin(this.tractor.yaw)),angle=Math.abs(headingDifference(tool.pose.yaw,expected));
        let reason:string|undefined;
        if(this.relations.some(a=>a.port===port))reason=`${hitchName(port)}已占用，请先分离农具`;
        else if(Math.abs(this.tractor.speed)>.12)reason='Space 刹车 · 停稳后挂接';
        else if(distance>.55)reason=`${tool.definition.name}连接点距${hitchName(port)} ${distance.toFixed(1)}m · 靠近至 0.55m`;
        else if(side>.28)reason='横向错位 · 对准连接点';
        else if(angle>Math.PI/7.2)reason=`朝向偏差 ${Math.round(angle*180/Math.PI)}° · 对准农具方向`;
        else if(Math.abs(delta.y)>.25)reason='挂点高度不匹配 · 请停到平坦地面';
        const relation:HitchRelation={vehicleId:this.tractor.id,implementId:tool.id,port};
        if(!reason){const pose=this.project(tool,relation,this.tractor.pose);if(!pose||!this.valid(tool,pose))reason='连接区域有障碍物 · 调整停车位置';}
        candidates.push({tool,relation,mode:'attach',distance,prompt:`挂接${tool.definition.name} · ${hitchName(port)}`,reason});
      }
    }
    return candidates.find(c=>c.mode==='attach'&&!c.reason)??candidates.find(c=>c.mode==='detach')??candidates.sort((a,b)=>a.distance-b.distance)[0];
  }
  interact(id?:ImplementId,player?:InteractionPosition):InteractionOutcome {
    const choice=this.choose(id);if(!choice)return {status:'unavailable',message:'靠近兼容农具，并对准连接点。'};
    if(choice.reason)return {status:'unavailable',message:choice.reason};
    const {tool,relation}=choice;
    if(choice.mode==='attach'){
      const pose=this.project(tool,relation,this.tractor.pose);if(!pose||!this.valid(tool,pose))return {status:'unavailable',message:'挂接空间不足，请调整停车位置。'};
      if(player&&!this.tractor.occupied&&this.hitsPlayer(tool,pose,player))return {status:'unavailable',message:'请站在连接点侧面，再按 E 挂接。'};
      this.relations.push(relation);tool.setPose(pose,true);
    }else{
      const before=tool.pose;let parked:MotionPose|undefined;
      for(const gap of [.14,.24,.4,.6]){
        const pose={...before,x:before.x-Math.sin(before.yaw)*gap,z:before.z-Math.cos(before.yaw)*gap};
        if(this.valid(tool,pose)&&!hullsOverlap(tool.hull(pose),this.tractor.collision)&&(!player||this.tractor.occupied||!this.hitsPlayer(tool,pose,player))){parked=pose;break;}
      }
      if(!parked)return {status:'unavailable',message:'分离位置有障碍物，请移到空旷平地再分离。'};
      tool.setPose(parked,true);this.relations=this.relations.filter(a=>a.implementId!==tool.id);
    }
    tool.setWorkState('RAISED');this.resetFeedback();this.record();this.updateLinks();this.save();
    return {status:'success',changed:true,message:`已${choice.mode==='attach'?'挂接':'分离'}${tool.definition.name} · ${hitchName(relation.port)}`};
  }
  private hitsPlayer(tool:ImplementVehicle,pose:MotionPose,player:InteractionPosition){const hull=tool.hull(pose),y=this.navigation.groundHull(hull)!;return hitsDynamicObstacle(player.x,player.z,player.y,[{...tool.collision,...hull,minY:y,maxY:y+tool.height}],.16);}
  private updateLinks(parent=this.tractor.pose){
    for(const tool of this.tools){const link=this.links.get(tool.id)!,relation=this.relations.find(a=>a.implementId===tool.id);link.visible=!!relation;if(!relation)continue;
      const start=this.tractor.hitchPosition(relation.port,parent),end=tool.frontPosition(),delta=end.clone().sub(start),length=delta.length();link.position.copy(start).add(end).multiplyScalar(.5);link.scale.set(1,Math.max(.012,length),1);if(length>1e-6)link.quaternion.setFromUnitVectors(new Vector3(0,1,0),delta.normalize());
    }
  }
}
