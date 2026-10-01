import { Group,Vector3 } from 'three';
import type { Object3D } from 'three';
import type { ImplementDefinition,ImplementWorkState } from '../../gameplay/vehicles/ImplementRegistry';
import type { WorkFootprint } from '../../gameplay/farm/ImplementSweep';
import type { ImplementPose } from '../../gameplay/vehicles/VehicleState';
import { normalizeYaw } from '../../gameplay/vehicles/VehicleState';
import type { MotionPose } from '../../gameplay/vehicles/VehicleMotion';
import type { DynamicObstacle } from '../../world/Collision';
import type { VehicleHull,VehicleNavigation } from './Vehicle';

export class ImplementVehicle {
  readonly defaultPose:MotionPose;readonly frontLocal:Vector3;readonly height:number;
  readonly collision:DynamicObstacle={x:0,z:0,previousX:0,previousZ:0,halfX:0,halfZ:0,minY:0,maxY:0,yaw:0,previousYaw:0};
  private wheels:{roll:Group;radius:number}[]=[];
  private lift?:Group;workState:ImplementWorkState='RAISED';seedCropId?:string;readonly workFootprint?:WorkFootprint;
  private centerX:number;private centerZ:number;
  constructor(readonly definition:ImplementDefinition,readonly root:Group,bounds:{min:readonly number[];max:readonly number[]},private navigation:VehicleNavigation){
    this.defaultPose=this.pose;this.root.updateMatrixWorld(true);let front:Object3D|undefined;
    this.root.traverse(o=>{if(o.userData.part_id==='Hitch_Front')front=o;});
    if(!front)throw new Error(`${definition.asset}: Hitch_Front is missing`);
    this.frontLocal=this.root.worldToLocal(front.getWorldPosition(new Vector3())).multiply(this.root.scale);
    this.centerX=(bounds.min[0]+bounds.max[0])/2*root.scale.x;this.centerZ=-(bounds.min[1]+bounds.max[1])/2*root.scale.z;
    this.collision.halfX=(bounds.max[0]-bounds.min[0])/2*root.scale.x+.02;this.collision.halfZ=(bounds.max[1]-bounds.min[1])/2*root.scale.z+.02;
    this.height=(bounds.max[2]-bounds.min[2])*root.scale.y;
    const pivots:Object3D[]=[];root.traverse(o=>{if(typeof o.userData.part_id==='string'&&o.userData.part_id.includes('wheel'))pivots.push(o);});
    for(const pivot of pivots){const roll=new Group();roll.name=`${pivot.name}_Roll`;for(const child of [...pivot.children])roll.add(child);pivot.add(roll);this.wheels.push({roll,radius:definition.wheelRadius*root.scale.x});}
    if(definition.work){
      const b=definition.work.footprint;this.workFootprint={minX:b.minX*root.scale.x,maxX:b.maxX*root.scale.x,minZ:b.minZ*root.scale.z,maxZ:b.maxZ*root.scale.z};
      // Lift geometry around the native coupling pin, retaining the anchor and
      // ground-space pose. Collision/sweep queries never read animation offsets.
      const parent=front.parent!,lift=new Group();lift.name='ImplementLift';lift.position.copy(front.position);parent.add(lift);parent.updateWorldMatrix(true,true);
      for(const child of [...parent.children])if(child!==front&&child!==lift)lift.attach(child);
      this.lift=lift;this.setWorkState('RAISED',true);
    }
    this.setPose(this.defaultPose,true);
  }
  get id(){return this.definition.id;}
  get pose():MotionPose{return {x:this.root.position.x,z:this.root.position.z,yaw:this.root.rotation.y};}
  hull(p:MotionPose):VehicleHull{return {x:p.x+Math.cos(p.yaw)*this.centerX+Math.sin(p.yaw)*this.centerZ,z:p.z-Math.sin(p.yaw)*this.centerX+Math.cos(p.yaw)*this.centerZ,halfX:this.collision.halfX,halfZ:this.collision.halfZ,yaw:p.yaw};}
  frontPosition(p=this.pose){const floor=this.navigation.groundHull(this.hull(p))??this.root.position.y;return new Vector3(p.x+Math.cos(p.yaw)*this.frontLocal.x+Math.sin(p.yaw)*this.frontLocal.z,floor+this.frontLocal.y,p.z-Math.sin(p.yaw)*this.frontLocal.x+Math.cos(p.yaw)*this.frontLocal.z);}
  setPose(p:MotionPose,reset=false){
    const before=this.pose,b=this.collision,h=this.hull(p),floor=this.navigation.groundHull(h)??this.root.position.y;
    const heading=before.yaw+normalizeYaw(p.yaw-before.yaw)/2;
    const distance=(p.x-before.x)*Math.sin(heading)+(p.z-before.z)*Math.cos(heading);
    this.root.position.set(p.x,floor,p.z);this.root.rotation.y=p.yaw;this.root.updateMatrixWorld(true);
    if(!reset)for(const wheel of this.wheels)wheel.roll.rotation.x=(wheel.roll.rotation.x+distance/wheel.radius)%(Math.PI*2);
    b.previousX=reset?h.x:b.x;b.previousZ=reset?h.z:b.z;b.previousYaw=reset?p.yaw:p.yaw-normalizeYaw(p.yaw-b.yaw);
    b.x=h.x;b.z=h.z;b.yaw=p.yaw;b.minY=floor;b.maxY=floor+this.height;
  }
  setWorkState(state:ImplementWorkState,snap=false){this.workState=this.definition.work?state:'RAISED';if(snap&&this.lift)this.lift.rotation.x=state==='RAISED'?this.definition.work!.raisedAngle:0;}
  updateVisual(delta:number){if(this.lift){const target=this.workState==='RAISED'?this.definition.work!.raisedAngle:0;this.lift.rotation.x+=(target-this.lift.rotation.x)*(1-Math.exp(-Math.max(0,delta)*12));}}
  snapshot():ImplementPose{return {id:this.id,worldId:'FARM',...this.pose,...(this.definition.work?{workState:this.workState}:{}),...(this.definition.work?.kind==='seed'?{seedCropId:this.seedCropId}:{})};}
}
