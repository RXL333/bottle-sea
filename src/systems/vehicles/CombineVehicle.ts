import { Vector3 } from 'three';
import type { Group,Object3D } from 'three';
import { WheeledVehicle } from './WheeledVehicle';
import type { VehicleNavigation } from './Vehicle';
import { COMBINE_DEFINITION,COMBINE_HEADER } from '../../gameplay/vehicles/VehicleDefinition';
import { GrainTank } from '../../gameplay/vehicles/GrainTank';
import { HarvestingSystem } from '../../gameplay/farm/HarvestingSystem';
import type { HarvestReport } from '../../gameplay/farm/HarvestingSystem';
import type { GameplayServices } from '../../gameplay/GameplayFoundation';
import type { MotionPose } from '../../gameplay/vehicles/VehicleMotion';
import type { ImplementWorkState } from '../../gameplay/vehicles/ImplementRegistry';
import type { InteractionOutcome } from '../InteractionSystem';
import { containsRect,FARM_GRAIN_UNLOAD } from '../../worlds/farm/FarmMap';

export class CombineVehicle extends WheeledVehicle {
  headerState:ImplementWorkState='RAISED';workEnabled=false;grainTank=new GrainTank();
  private header:Object3D;private reel:Object3D;private auger:Object3D;
  private game?:GameplayServices;private work?:HarvestingSystem;private report?:HarvestReport;private harvested=0;
  private transport?:{hint:()=>string;unload:()=>InteractionOutcome};
  setTransport(driver:{hint:()=>string;unload:()=>InteractionOutcome}){this.transport=driver;}
  constructor(root:Group,navigation:VehicleNavigation,id=COMBINE_DEFINITION.id){
    super(root,navigation,{...COMBINE_DEFINITION,id});const parts=new Map<string,Object3D>();root.traverse(o=>{if(typeof o.userData.part_id==='string')parts.set(o.userData.part_id,o);});
    const header=parts.get('header'),reel=parts.get('header_reel'),auger=parts.get('unloading_auger');if(!header||!reel||!auger)throw new Error('Combine model is missing header / reel / auger');
    this.header=header;this.reel=reel;this.auger=auger;root.updateMatrixWorld(true);header.attach(reel);header.rotation.x=-.35;
  }
  bindGameplay(game:GameplayServices){
    this.game=game;const saved=game.vehicles.get(this.id);this.headerState=saved?.headerState??'RAISED';this.workEnabled=saved?.workEnabled===true&&this.headerState==='LOWERED';
    this.grainTank=new GrainTank(game.items,saved?.grainTank,()=>{this.record();game.requestSave(true);},()=>this.record(),game.economy.grainCapacity);if(!this.grainTank.remaining)this.workEnabled=false;
    this.work=new HarvestingSystem(game.farm,this.grainTank);this.report=undefined;this.harvested=0;this.header.rotation.x=this.headerState==='RAISED'?-.35:0;super.bind(game.vehicles);
  }
  override snapshot(){return {...super.snapshot(),headerState:this.headerState,workEnabled:this.workEnabled,grainTank:this.grainTank.snapshot()};}
  override occupy(value:boolean){super.occupy(value);if(!value){this.workEnabled=false;this.record();}}
  override get hitchHint(){return this.transport?.hint()??'U 谷仓门前停车卸货 · 土豆保留手工收获';}
  get machineControls(){return 'W / S 前进后退　A / D 转向　Space 刹车　J 割台　L 收割开关　U 卸货　E 下车';}
  get presentationWork(){return {kind:'harvest' as const,enabled:this.headerState==='LOWERED'&&this.workEnabled,operations:this.harvested};}
  override get workHint(){
    const status=this.report?.blocked?'粮仓空间不足 · 已停止':this.workEnabled?Math.abs(this.speed)<.02?'已开启 · 停稳待作业':this.report?.changedCells?'收割中':this.report?.unsupportedCells?'土豆需手工收获':this.report?.protectedCells?'未成熟作物已保护':'寻找成熟小麦 / 玉米':'作业关闭';
    return `割台 ${this.headerState==='RAISED'?'抬起':'落下'} · J 抬落 · L 开关 · ${status} · 本次收割 ${this.harvested} 格 · 宽 ${(COMBINE_HEADER.maxX-COMBINE_HEADER.minX).toFixed(2)}m`;
  }
  get cargoHint(){const contents=this.grainTank.contents.map(s=>`${this.game?.items.get(s.itemId)?.name??s.itemId} × ${s.quantity}`).join('、');return `粮仓 ${this.grainTank.used} / ${this.grainTank.capacity} · ${contents||'空仓'} · ${this.atBarn?'已到谷仓卸货区':'前往谷仓门前卸货区'}`;}
  private get atBarn(){return containsRect(FARM_GRAIN_UNLOAD,this.pose.x,this.pose.z);}
  toggleHeader():InteractionOutcome {
    if(!this.occupied)return {status:'unavailable',message:'请先上车再操作割台。'};
    this.headerState=this.headerState==='RAISED'?'LOWERED':'RAISED';if(this.headerState==='RAISED')this.workEnabled=false;this.report=undefined;this.record();this.game?.requestSave(true);
    return {status:'success',changed:true,message:this.headerState==='RAISED'?'割台已抬起 · 收割停止。':'割台已落下 · 按 L 开启收割。'};
  }
  toggleMachine():InteractionOutcome {
    if(!this.occupied||this.headerState==='RAISED')return {status:'unavailable',message:'请上车并按 J 落下割台，再按 L 开启收割。'};
    if(!this.workEnabled){const minimum=Math.min(...(this.game?.crops.registry.list().filter(c=>c.machineHarvestable).map(c=>c.baseYield)??[]));if(this.grainTank.remaining<minimum)return {status:'unavailable',message:'粮仓空间不足 · 停车到谷仓按 U 卸货后再作业。'};}
    this.workEnabled=!this.workEnabled;this.report=undefined;this.harvested=0;this.record();this.game?.requestSave(true);return {status:'success',changed:true,message:this.workEnabled?'收割已开启 · 仅收成熟小麦和玉米，未成熟作物与土豆保持原状。':'收割已关闭。'};
  }
  unload():InteractionOutcome {
    if(this.transport)return this.transport.unload();
    if(!this.game||!this.atBarn)return {status:'unavailable',message:'请开到谷仓门前的卸货区，停车后按 U 卸货。'};
    if(Math.abs(this.speed)>.12||this.workEnabled)return {status:'unavailable',message:'请按 Space 停稳并按 L 关闭收割，再卸货。'};
    if(!this.grainTank.used)return {status:'unavailable',message:'粮仓为空，没有可卸的粮食。'};
    const description=this.grainTank.contents.map(s=>`${this.game!.items.get(s.itemId)?.name} × ${s.quantity}`).join('、');const result=this.grainTank.unloadTo(this.game.barn);
    if(!result.ok)return {status:'unavailable',message:'谷仓仓库空间不足 · 粮食仍在车载粮仓，没有损失。'};
    this.report=undefined;this.record();this.game.requestSave(true);return {status:'success',changed:true,message:`已卸入谷仓：${description} · 下车后 E 查看仓库或取到背包。`};
  }
  protected override moved(from:MotionPose,to:MotionPose){
    if(!this.work||!this.workEnabled||this.headerState!=='LOWERED')return;
    this.report=this.work.sweep(from,to,COMBINE_HEADER,stopped=>{if(stopped)this.workEnabled=false;this.record();});this.harvested+=this.report.changedCells;
    if(this.report.blocked){this.workEnabled=false;this.record();this.game?.requestSave(true);}
  }
  updateVisual(delta:number){if(this.game&&this.grainTank.capacity<this.game.economy.grainCapacity)this.grainTank.expandCapacity(this.game.economy.grainCapacity);const target=this.headerState==='RAISED'?-.35:0;this.header.rotation.x+=(target-this.header.rotation.x)*(1-Math.exp(-Math.max(0,delta)*12));if(this.workEnabled)this.reel.rotation.x=(this.reel.rotation.x+delta*8)%(Math.PI*2);}
  dischargePosition(){this.root.updateMatrixWorld(true);return this.auger.localToWorld(new Vector3(2.61-.78,2.27-2.12,-1.18+1.13));}
}
