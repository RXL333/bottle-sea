import { Group,Matrix4,Vector3 } from 'three';
import type { Object3D } from 'three';
import { VehicleMotion } from '../../gameplay/vehicles/VehicleMotion';
import type { DrivingInput,MotionPose } from '../../gameplay/vehicles/VehicleMotion';
import type { VehicleProgress,VehiclePose } from '../../gameplay/vehicles/VehicleState';
import type { VehicleDefinition } from '../../gameplay/vehicles/VehicleDefinition';
import type { DynamicObstacle } from '../../world/Collision';
import type { DriveableVehicle,VehicleNavigation,VehicleAttachmentDriver } from './Vehicle';
import type { HitchPort } from '../../gameplay/vehicles/ImplementRegistry';

interface Wheel { pivot:Object3D;roll:Group;steered:boolean;rear:boolean;side:number;radius:number;halfTrack:number }
export class WheeledVehicle implements DriveableVehicle {
  get id(){return this.definition.id;}get name(){return this.definition.name;}occupied=false;
  private motion:VehicleMotion;private wheels:Wheel[]=[];
  private seat:Object3D;private hitch:Object3D;readonly body:Object3D;
  protected progress?:VehicleProgress;
  attachmentDriver?:VehicleAttachmentDriver;
  private hitchLocal=new Map<HitchPort,Vector3>();
  readonly collision:DynamicObstacle={x:0,z:0,previousX:0,previousZ:0,halfX:0,halfZ:0,minY:0,maxY:0,yaw:0,previousYaw:0};
  constructor(readonly root:Group,private navigation:VehicleNavigation,readonly definition:VehicleDefinition){
    this.motion=new VehicleMotion({x:root.position.x,z:root.position.z,yaw:root.rotation.y},definition);this.collision.halfX=definition.hull.halfX;this.collision.halfZ=definition.hull.halfZ;
    const parts=new Map<string,Object3D>();root.traverse(o=>{if(typeof o.userData.part_id==='string')parts.set(o.userData.part_id,o);});
    this.body=parts.get('Body')??root;
    this.seat=parts.get('Seat')??this.anchor('Seat',new Vector3().fromArray(definition.seat));
    this.hitch=parts.get('Hitch_Back')??this.anchor('Hitch_Back',new Vector3(0,.457,-1.70));
    for(const spec of definition.wheels){
      const id=spec.part,pivot=parts.get(id);
      if(!pivot)throw new Error(`${definition.name} wheel node missing: ${id}`);
      const roll=new Group();roll.name=`${id}_Roll`;
      for(const child of [...pivot.children])roll.add(child);pivot.add(roll);
      this.wheels.push({pivot,roll,...spec,radius:spec.radius*root.scale.x,halfTrack:spec.halfTrack*root.scale.x});
    }
    this.sync(true);
    for(const port of ['Hitch_Back','Hitch_Front'] as const){
      const anchor=parts.get(port)??(port==='Hitch_Back'?this.hitch:this.anchor(port,new Vector3(0,.697,1.45)));
      this.hitchLocal.set(port,this.root.worldToLocal(anchor.getWorldPosition(new Vector3())));
    }
  }
  private anchor(id:string,position:Vector3){const o=new Group();o.name=id;o.userData.part_id=id;o.position.copy(position);const asset=this.root.getObjectByProperty('name','tractor')??this.root;asset.add(o);return o;}
  bind(progress:VehicleProgress){
    this.progress=progress;const saved=progress.get(this.id);
    if(saved&&this.navigation.accepts(saved)){Object.assign(this.motion.pose,{x:saved.x,z:saved.z,yaw:saved.yaw});this.sync(true);}
    this.record();
  }
  get speed(){return this.motion.speed;}get yaw(){return this.motion.pose.yaw;}
  get pose(){return {...this.motion.pose};}
  get hitchHint(){return this.attachmentDriver?.hint??'H 挂接 / 分离农具';}
  get workHint(){return this.attachmentDriver?.workHint;}
  get seedChoices(){return this.attachmentDriver?.seedChoices;}
  get cargoHint(){return this.attachmentDriver?.cargoHint;}
  get machineControls(){return this.attachmentDriver?.machineControls;}
  unload(){return this.attachmentDriver?.unload?.()??{status:'unavailable' as const,message:'请先挂接拖车，再停到谷仓卸货区。'};}
  get cameraDistance(){return this.attachmentDriver?.cameraDistance??this.definition.cameraDistance;}
  seatPosition(){this.root.updateMatrixWorld(true);return this.seat.getWorldPosition(new Vector3());}
  entryPosition(){return this.root.localToWorld(new Vector3().fromArray(this.definition.entry));}
  hitchBackTransform():Matrix4{this.root.updateMatrixWorld(true);return this.hitch.matrixWorld.clone();}
  hitchPosition(port:HitchPort,pose=this.motion.pose){
    const local=this.hitchLocal.get(port)!,x=local.x*this.root.scale.x,z=local.z*this.root.scale.z;
    return new Vector3(pose.x+Math.cos(pose.yaw)*x+Math.sin(pose.yaw)*z,(this.navigation.ground(pose)??this.root.position.y)+local.y*this.root.scale.y,pose.z-Math.sin(pose.yaw)*x+Math.cos(pose.yaw)*z);
  }
  occupy(value:boolean){this.occupied=value;this.stop();}
  stop(){this.motion.stop();this.sync(true);}
  advance(delta:number,input:DrivingInput){
    if(!this.occupied)return;
    let previous=this.pose;
    const distance=this.motion.update(delta,input,p=>this.navigation.accepts(p)&&(this.attachmentDriver?.accepts(p)??true),p=>{this.moved(previous,p);previous={...p};});
    this.sync();
    const curvature=Math.tan(this.motion.steering)/this.definition.wheelbase;
    for(const wheel of this.wheels){
      const factor=1-wheel.side*wheel.halfTrack*curvature;
      const steer=wheel.steered?(wheel.rear?-1:1)*Math.atan2(this.definition.wheelbase*curvature,factor):0;
      wheel.pivot.rotation.y=steer;
      const path=wheel.steered?Math.hypot(factor,this.definition.wheelbase*curvature):factor;
      wheel.roll.rotation.x=(wheel.roll.rotation.x+distance*path/wheel.radius)%(Math.PI*2);
    }
    if(distance){this.record();this.attachmentDriver?.record();}
  }
  private sync(reset=false){
    const p=this.motion.pose,h=this.navigation.hull(p),y=this.navigation.ground(p)??this.root.position.y,b=this.collision;
    b.previousX=reset?h.x:b.x;b.previousZ=reset?h.z:b.z;
    b.previousYaw=reset?p.yaw:p.yaw-Math.atan2(Math.sin(p.yaw-b.yaw),Math.cos(p.yaw-b.yaw));
    b.x=h.x;b.z=h.z;b.yaw=p.yaw;b.minY=y;b.maxY=y+this.definition.hull.height;
    this.root.position.set(p.x,y,p.z);this.root.rotation.y=p.yaw;this.root.updateMatrixWorld(true);
  }
  snapshot():VehiclePose{return {id:this.id,worldId:'FARM',...this.pose};}
  protected moved(_from:MotionPose,to:MotionPose){this.attachmentDriver?.move(to);}
  protected record(){this.progress?.record(this.snapshot());}
  findExit(cameraPosition?:Vector3){return this.navigation.findExit(this.motion.pose,this.collision,cameraPosition);}
  clipCamera(from:Vector3,to:Vector3){return this.navigation.clipCamera(from,to);}
}
