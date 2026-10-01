import type { WorkFootprint } from '../farm/ImplementSweep';
export type HitchPort='Hitch_Back'|'Hitch_Front';
export type ImplementWorkState='RAISED'|'LOWERED';
export type ImplementId='farm.plow'|'farm.seeder'|'farm.trailer';
export interface ImplementDefinition {
  readonly id:ImplementId;readonly name:string;readonly asset:'plow'|'seeder'|'farm_trailer';readonly placementId:string;
  readonly coupling:'rigid'|'drawbar';readonly ports:readonly HitchPort[];readonly wheelRadius:number;
  readonly work?:{readonly kind:'till'|'seed';readonly footprint:WorkFootprint;readonly raisedAngle:number};
}
const definitions:readonly ImplementDefinition[]=[
  // Existing four shares: Blender X [-1.33,1.39], Y [0.11,0.635].
  // glTF forward is +Z, so Blender Y becomes -Z; the farm model scale is 0.5.
  {id:'farm.plow',name:'犁地机',asset:'plow',placementId:'plow',coupling:'rigid',ports:['Hitch_Back','Hitch_Front'],wheelRadius:.32,work:{kind:'till',footprint:{minX:-1.33,maxX:1.39,minZ:-.635,maxZ:-.11},raisedAngle:.45}},
  // Six row centres spaced 0.43m, half a row spacing beyond the outer centres.
  {id:'farm.seeder',name:'播种机',asset:'seeder',placementId:'seeder',coupling:'rigid',ports:['Hitch_Back'],wheelRadius:.44,work:{kind:'seed',footprint:{minX:-1.29,maxX:1.29,minZ:-1.33,maxZ:-.67},raisedAngle:.25}},
  {id:'farm.trailer',name:'拖车',asset:'farm_trailer',placementId:'trailer',coupling:'drawbar',ports:['Hitch_Back'],wheelRadius:.37},
];
/** Configuration only. World instances and ownership live in vehicle state. */
export const IMPLEMENTS:readonly ImplementDefinition[]=Object.freeze(definitions.map(d=>Object.freeze({...d,ports:Object.freeze([...d.ports]),...(d.work?{work:Object.freeze({...d.work,footprint:Object.freeze({...d.work.footprint})})}:{})})));
export const getImplement=(id:string)=>IMPLEMENTS.find(d=>d.id===id);
export const hitchName=(port:HitchPort)=>port==='Hitch_Back'?'后挂点':'前挂点';
