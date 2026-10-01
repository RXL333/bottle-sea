import { TRACTOR_HULL,TRACTOR_WHEELBASE } from './VehicleMotion';
import type { WorkFootprint } from '../farm/ImplementSweep';
export { COMBINE_ID } from './VehicleIds';
import { COMBINE_ID,TRACTOR_ID } from './VehicleIds';
export interface DrivingHull {halfX:number;halfZ:number;centerX?:number;centerZ:number;height:number}
export interface VehicleDefinition {
  id:string;name:string;hull:DrivingHull;wheelbase:number;forwardSpeed:number;reverseSpeed:number;
  seat:readonly [number,number,number];entry:readonly [number,number,number];cameraDistance:number;
  wheels:readonly {part:string;steered:boolean;rear:boolean;side:number;radius:number;halfTrack:number}[];
}
export const TRACTOR_DEFINITION:VehicleDefinition={id:TRACTOR_ID,name:'拖拉机',hull:TRACTOR_HULL,wheelbase:TRACTOR_WHEELBASE,forwardSpeed:3.2,reverseSpeed:1.5,seat:[0,1.387,-.47],entry:[1.6,1,-.05],cameraDistance:3.4,
  wheels:[true,false].flatMap(front=>[-1,1].map(side=>({part:`wheel_${front?'front':'rear'}_${side}`,steered:front,rear:false,side,radius:front?.47:.7,halfTrack:front?.78:.86})))};
export const COMBINE_DEFINITION:VehicleDefinition={id:COMBINE_ID,name:'联合收割机',hull:{halfX:1.15,halfZ:1.14,centerX:.25,centerZ:.216,height:1.5},wheelbase:.92,forwardSpeed:2.6,reverseSpeed:1.2,seat:[0,1.9,1.1],entry:[-2.6,.88,1.1],cameraDistance:4.5,
  wheels:[false,true].flatMap(rear=>[-1,1].map(side=>({part:`${rear?'steer':'drive'}_wheel_${side}`,steered:rear,rear,side,radius:rear?.43:.65,halfTrack:rear?.84:.94})))};
// Existing 22 cutting teeth: X +/-1.5285, Blender Y [-2.675,-2.325].
export const COMBINE_HEADER:WorkFootprint={minX:-1.5285*.5,maxX:1.5285*.5,minZ:2.325*.5,maxZ:2.675*.5};
