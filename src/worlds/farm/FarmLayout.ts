import manifest from '../../../public/models/farm/manifest.json';
import type { FarmAssetId } from './FarmAssets';

export interface FarmPlacement {id:string;asset:FarmAssetId;x:number;z:number;scale:number;y?:number;yaw?:number;solid?:boolean;animated?:boolean}
export interface FarmObstacle {minX:number;maxX:number;minZ:number;maxZ:number;minY:number;maxY:number}
export const COTTAGE={x:-8,z:-6.5,scale:.55,floor:4+.36*.55};
export const FARM_PLACEMENTS:FarmPlacement[]=[
  {id:'barn',asset:'barn',x:7,z:-6.75,scale:.60,solid:true},
  {id:'cottage',asset:'farmhouse',...COTTAGE},
  {id:'bed',asset:'bed',x:-7.65,z:-6.95,y:COTTAGE.floor,scale:.33,solid:true},
  {id:'shed',asset:'tool_shed',x:1,z:-7,scale:.62},
  {id:'shed-tractor',asset:'tractor',x:1,z:-6.9,y:4.12,scale:.34,solid:true},
  {id:'field-tractor',asset:'tractor',x:0,z:1.2,scale:.34,yaw:Math.PI,solid:true},
  {id:'plow',asset:'plow',x:0,z:2.05,scale:.34,yaw:Math.PI,solid:true},
  {id:'seeder',asset:'seeder',x:-1.1,z:7.7,scale:.34,yaw:Math.PI/2,solid:true},
  {id:'trailer',asset:'farm_trailer',x:1,z:7.9,scale:.34,yaw:Math.PI/2,solid:true},
  {id:'combine',asset:'combine_harvester',x:-8,z:2,scale:.35,solid:true},
  {id:'mill',asset:'windmill',x:10.7,z:7.9,scale:.55,solid:true,animated:true},
  {id:'tower',asset:'water_tower',x:-10.9,z:7.8,scale:.5,solid:true},
  {id:'fishing',asset:'fishing_deck',x:-8,z:10.35,scale:.55,animated:false},
  {id:'dock-end',asset:'dock_kit',x:-4,z:14.5,scale:.72},
  ...[12.52,10.54].map((z,i)=>({id:`dock-deck-${i}`,asset:'dock_platform' as const,x:-4,z,scale:.72})),
  ...[10,12.5].flatMap((z,i)=>[-4.89,-3.11].map((x,j)=>({id:`dock-post-${i}-${j}`,asset:'dock_pile' as const,x,z,scale:.72}))),
  ...[{x:7.35,z:.4,yaw:.3},{x:8.8,z:2.2,yaw:-.8}].map((p,i)=>({id:`cow-${i}`,asset:'cow' as const,...p,scale:.33,solid:true,animated:true})),
  ...[{x:6.5,z:3.1},{x:7.6,z:3.7},{x:9.6,z:1.3}].map((p,i)=>({id:`sheep-${i}`,asset:'sheep' as const,...p,scale:.33,yaw:i*.9,solid:true,animated:true})),
  ...[{x:-10.7,z:-4.7},{x:-11.4,z:-5.4},{x:-10.3,z:-5.5}].map((p,i)=>({id:`chicken-${i}`,asset:'chicken' as const,...p,scale:.16,yaw:i*1.4,animated:true})),
  ...[[-11,-1],[-11.4,4.5],[-12,-6.8],[-6.3,-8.4],[-2.4,-8.2],[4,-8.5],[11,-6.9],[11.7,-1.6],[11.5,4.4],[5,8.9]].map(([x,z],i)=>({id:`tree-${i}`,asset:'orchard_tree' as const,x,z,scale:.55+(i%3)*.07})),
  ...[[3,-6],[3.4,-6],[3.2,-6.3]].map(([x,z],i)=>({id:`hay-${i}`,asset:'hay_bale' as const,x,z,y:4+(i===2?.24:0),scale:.38,solid:true})),
];

// Livestock paddock: leave a full-width opening on the west side at z=1.
for(let z=-2.4;z<=4.5;z+=.70)for(const x of [5.35,10.7]){
  if(x===5.35&&z>-.4&&z<2.1)continue;
  FARM_PLACEMENTS.push({id:`fence-${x}-${z}`,asset:'fence_segment',x,z,scale:.35,yaw:Math.PI/2,solid:true});
}
for(let x=5.7;x<=10.5;x+=.7)for(const z of [-2.75,4.85])FARM_PLACEMENTS.push({id:`fence-${x}-${z}`,asset:Math.abs(x-7.8)<.1&&z<0?'fence_gate':'fence_segment',x,z,scale:.35,solid:true});

type Bounds={min:number[];max:number[]};
const mainBounds=new Map<string,Bounds>([...manifest.assets,...manifest.additionalAssets].map(a=>[a.id,a.boundsBlender]));
mainBounds.set('fence_segment',{min:[-1.1,-.10,0],max:[1.1,.10,1.14]});
mainBounds.set('fence_gate',{min:[-1.1,-.10,0],max:[1.1,.10,1.14]});
export function placedBox(p:Pick<FarmPlacement,'x'|'z'|'scale'|'y'|'yaw'>,min:number[],max:number[]):FarmObstacle{
  const c=Math.cos(p.yaw??0),s=Math.sin(p.yaw??0),xs:number[]=[],zs:number[]=[];
  for(const x of [min[0],max[0]])for(const z of [min[2],max[2]]){xs.push(p.x+(c*x+s*z)*p.scale);zs.push(p.z+(-s*x+c*z)*p.scale);}
  return {minX:Math.min(...xs),maxX:Math.max(...xs),minZ:Math.min(...zs),maxZ:Math.max(...zs),minY:(p.y??4)+min[1]*p.scale,maxY:(p.y??4)+max[1]*p.scale};
}
function assetBox(p:FarmPlacement){const b=mainBounds.get(p.asset)!;return placedBox(p,[b.min[0],b.min[2],-b.max[1]],[b.max[0],b.max[2],-b.min[1]]);}
export const FARM_OBSTACLES:FarmObstacle[]=FARM_PLACEMENTS.filter(p=>p.solid).map(assetBox);
const cottage=FARM_PLACEMENTS.find(p=>p.id==='cottage')!;
// Exact wall and lintel slabs, with the real door opening kept clear.
for(const [min,max] of [
  [[-1.72,.36,-1.76],[-1.62,2.64,1.76]],[[1.62,.36,-1.76],[1.72,2.64,1.76]],
  [[-1.62,.36,-1.76],[1.62,2.64,-1.66]],
  [[-1.72,.36,1.66],[-.56,2.64,1.76]],[[.26,.36,1.66],[1.72,2.64,1.76]],
  [[-.56,2.06,1.66],[.26,2.66,1.76]],
])FARM_OBSTACLES.push(placedBox(cottage,min,max));
const shed=FARM_PLACEMENTS.find(p=>p.id==='shed')!;
for(const [min,max] of [[[ -2.31,.18,-2.05],[-2.11,3.05,2.05]],[[2.11,.18,-2.05],[2.31,3.05,2.05]],[[-2.21,.18,-2.06],[2.21,3.05,-1.90]]])FARM_OBSTACLES.push(placedBox(shed,min,max));
for(const p of FARM_PLACEMENTS.filter(p=>p.asset==='orchard_tree'))FARM_OBSTACLES.push(placedBox(p,[-.18,0,-.18],[.18,2,.18]));
for(const z of [10,12.5,14.5-.8856,14.5+.8856])for(const x of [-4.89,-3.11])FARM_OBSTACLES.push({minX:x-.10,maxX:x+.10,minZ:z-.10,maxZ:z+.10,minY:3.1,maxY:4.43});
// Fishing furniture and corner piles, not the walkable platform as a whole.
const fishing=FARM_PLACEMENTS.find(p=>p.id==='fishing')!;
for(const [min,max] of [[[-.57,0,-.58],[.02,1.2,.04]],[[.28,0,-.57],[.72,.55,-.13]]])FARM_OBSTACLES.push(placedBox(fishing,min,max));
for(const x of [-.89,.89])for(const z of [-.85,.85])FARM_OBSTACLES.push(placedBox(fishing,[x-.14,-1.2,z-.14],[x+.14,.52,z+.14]));

export const FARM_SURFACES=[
  {minX:-4.954,maxX:-3.046,minZ:9.55,maxZ:15.49,top:4},
  {minX:-8.55,maxX:-7.45,minZ:9.81,maxZ:10.89,top:4},
  {minX:COTTAGE.x-1.81*.55,maxX:COTTAGE.x+1.81*.55,minZ:COTTAGE.z-1.86*.55,maxZ:COTTAGE.z+1.86*.55,top:COTTAGE.floor},
  {minX:COTTAGE.x-1.67*.55,maxX:COTTAGE.x+.95*.55,minZ:COTTAGE.z+1.72*.55,maxZ:COTTAGE.z+2.86*.55,top:4+.368*.55},
  {minX:-.48,maxX:2.48,minZ:-8.286,maxZ:-5.714,top:4.112},
] as const;

