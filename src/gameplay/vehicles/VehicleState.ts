import { getImplement } from './ImplementRegistry';
import { CROPS } from '../farm/CropRegistry';
import { TRACTOR_ID,isCombineId } from './VehicleIds';
import { normalizeGrainTank } from './GrainTank';
import { normalizeTrailerCargo } from './TrailerCargo';
import type { InventorySnapshot } from '../Inventory';
export { TRACTOR_ID,COMBINE_ID } from './VehicleIds';
import type { HitchPort,ImplementId,ImplementWorkState } from './ImplementRegistry';
export interface VehiclePose { id:string;worldId:'FARM';x:number;z:number;yaw:number;headerState?:ImplementWorkState;workEnabled?:boolean;grainTank?:InventorySnapshot }
export interface ImplementPose extends VehiclePose { id:ImplementId;workState?:ImplementWorkState;seedCropId?:string;cargo?:InventorySnapshot }
export interface HitchRelation { vehicleId:string;implementId:ImplementId;port:HitchPort }
export interface VehicleSnapshot { version:2;vehicles:VehiclePose[];implements:ImplementPose[];attachments:HitchRelation[] }
export const normalizeYaw=(yaw:number)=>Math.atan2(Math.sin(yaw),Math.cos(yaw));

/** Only parked transforms are persisted; input, occupancy and velocity are transient. */
export function normalizeVehicles(value:unknown,grainCapacity=60):VehicleSnapshot {
  const result:VehicleSnapshot={version:2,vehicles:[],implements:[],attachments:[]};
  if(!value||typeof value!=='object')return result;
  const raw=value as Record<string,unknown>;
  const pose=(entry:unknown):VehiclePose|undefined=>{
    if(!entry||typeof entry!=='object')return;
    const v=entry as Record<string,unknown>;
    if(typeof v.id!=='string'||v.worldId!=='FARM')return;
    if(typeof v.x!=='number'||typeof v.z!=='number'||typeof v.yaw!=='number'||![v.x,v.z,v.yaw].every(Number.isFinite)||Math.abs(v.x)>100||Math.abs(v.z)>100)return;
    return {id:v.id,worldId:'FARM',x:v.x,z:v.z,yaw:normalizeYaw(v.yaw)};
  };
  for(const entry of Array.isArray(raw.vehicles)?raw.vehicles:[]){const p=pose(entry);if(p&&(p.id===TRACTOR_ID||isCombineId(p.id))&&!result.vehicles.some(v=>v.id===p.id)){
    const v=entry as Record<string,unknown>,headerState=v.headerState==='LOWERED'?'LOWERED':'RAISED';
    result.vehicles.push({...p,...(isCombineId(p.id)?{headerState,workEnabled:headerState==='LOWERED'&&v.workEnabled===true,grainTank:normalizeGrainTank(v.grainTank,undefined,grainCapacity)}:{})});
  }}
  result.vehicles.sort((a,b)=>(a.id===TRACTOR_ID?0:1)-(b.id===TRACTOR_ID?0:1));
  for(const entry of Array.isArray(raw.implements)?raw.implements:[]){
    const p=pose(entry),definition=p&&getImplement(p.id);
    if(p&&definition&&!result.implements.some(i=>i.id===p.id)){
      const v=entry as Record<string,unknown>,crop=typeof v.seedCropId==='string'?CROPS.get(v.seedCropId):undefined;
      result.implements.push({...p,id:definition.id,...(definition.work?{workState:v.workState==='LOWERED'?'LOWERED':'RAISED'}:{}),...(definition.work?.kind==='seed'?{seedCropId:(crop??CROPS.list()[0])?.id}:{}),...(definition.id==='farm.trailer'?{cargo:normalizeTrailerCargo(v.cargo)}:{})});
    }
  }
  for(const entry of Array.isArray(raw.attachments)?raw.attachments:[]){
    if(!entry||typeof entry!=='object')continue;const a=entry as Record<string,unknown>,definition=typeof a.implementId==='string'?getImplement(a.implementId):undefined;
    if(a.vehicleId!==TRACTOR_ID||!definition||(a.port!=='Hitch_Back'&&a.port!=='Hitch_Front')||!definition.ports.includes(a.port))continue;
    if(!result.vehicles.some(v=>v.id===TRACTOR_ID)||!result.implements.some(i=>i.id===definition.id)||result.attachments.some(i=>i.implementId===definition.id||i.port===a.port))continue;
    result.attachments.push({vehicleId:TRACTOR_ID,implementId:definition.id,port:a.port});
  }
  return result;
}
export class VehicleProgress {
  private state:VehicleSnapshot;
  constructor(saved?:unknown,private grainCapacity=60){this.state=normalizeVehicles(saved,grainCapacity);}
  setGrainCapacity(capacity:number){if(!Number.isSafeInteger(capacity)||capacity<this.grainCapacity)throw new Error('Invalid grain capacity');this.grainCapacity=capacity;}
  restore(saved:unknown,grainCapacity=this.grainCapacity){this.grainCapacity=grainCapacity;this.state=normalizeVehicles(saved,grainCapacity);}
  get(id:string){const pose=this.state.vehicles.find(v=>v.id===id);return pose?structuredClone(pose):undefined;}
  record(pose:VehiclePose){this.state=normalizeVehicles({...this.state,vehicles:[...this.state.vehicles.filter(v=>v.id!==pose.id),pose]},this.grainCapacity);}
  /** Publish the whole fleet at once; saving cannot observe half a hitch operation. */
  commitFleet(vehicle:VehiclePose,tools:readonly ImplementPose[],attachments:readonly HitchRelation[]){this.state=normalizeVehicles({...this.state,vehicles:[...this.state.vehicles.filter(v=>v.id!==vehicle.id),vehicle],implements:tools,attachments},this.grainCapacity);}
  snapshot():VehicleSnapshot{return structuredClone(this.state);}
}
