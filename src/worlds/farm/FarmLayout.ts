import { FARM_ASSET_BOUNDS,FARM_DOCK,FARM_GROUND,FARM_SEED_SUPPLY,FARM_SIGNS,FARM_VEHICLE_SCALE,farmZone,rectBounds } from './FarmMap';
import type { FarmAssetId } from './FarmAssets';
import type { FarmRect } from './FarmMap';
import { farmGroundHeight } from './FarmTopography';
import { LIVESTOCK_ANIMALS,LIVESTOCK_PENS } from '../../gameplay/livestock/LivestockDefinition';

export interface FarmPlacement {id:string;asset:FarmAssetId;x:number;z:number;scale:number;y?:number;yaw?:number;solid?:boolean;animated?:boolean;independent?:boolean;zoneId?:string}
export interface FarmObstacle {minX:number;maxX:number;minZ:number;maxZ:number;minY:number;maxY:number}
const cottageZone=farmZone('cottage');
export const COTTAGE={x:cottageZone.x,z:cottageZone.z,scale:.8,yaw:Math.PI,floor:FARM_GROUND+.36*.8};
const shedZone=farmZone('shed'),barnZone=farmZone('barn'),towerZone=farmZone('tower');
export const FARM_PLACEMENTS:FarmPlacement[]=[
  {id:'barn',asset:'barn',x:barnZone.x,z:barnZone.z,scale:1.1,yaw:Math.PI,solid:true,zoneId:'barn'},
  {id:'cottage',asset:'farmhouse',...COTTAGE,zoneId:'cottage'},
  {id:'bed',asset:'bed',x:COTTAGE.x+.44,z:COTTAGE.z+.64,y:COTTAGE.floor,scale:.33,yaw:Math.PI,solid:true,zoneId:'cottage'},
  {id:'shed',asset:'tool_shed',x:shedZone.x,z:shedZone.z,scale:1,yaw:Math.PI,zoneId:'shed'},
  // Machines retain individual transforms for driving and implement attachment.
  {id:'combine',asset:'combine_harvester',x:-25,z:0,scale:FARM_VEHICLE_SCALE,yaw:Math.PI,solid:true,independent:true,zoneId:'shed'},
  {id:'yard-tractor',asset:'tractor',x:-20.5,z:2,scale:FARM_VEHICLE_SCALE,yaw:Math.PI,solid:true,independent:true,zoneId:'machinery-yard'},
  {id:'trailer',asset:'farm_trailer',x:-17.5,z:2.3,scale:FARM_VEHICLE_SCALE,yaw:Math.PI,solid:true,independent:true,zoneId:'machinery-yard'},
  {id:'seeder',asset:'seeder',x:-14.5,z:2,scale:FARM_VEHICLE_SCALE,yaw:Math.PI,solid:true,independent:true,zoneId:'machinery-yard'},
  {id:'plow',asset:'plow',x:-11.5,z:2,scale:FARM_VEHICLE_SCALE,yaw:Math.PI,solid:true,independent:true,zoneId:'machinery-yard'},
  {id:'mill',asset:'windmill',x:32.7,z:-60,scale:.75,solid:true,animated:true},
  {id:'tower',asset:'water_tower',x:towerZone.x,z:towerZone.z,scale:.9,solid:true,zoneId:'tower'},
  {id:'fishing',asset:'fishing_deck',x:-8,z:10.35,scale:.55},
  {id:'dock-end',asset:'dock_kit',x:FARM_DOCK.x,z:14.5,scale:.72,zoneId:'dock'},
  ...[12.52,10.54].map((z,i)=>({id:`dock-deck-${i}`,asset:'dock_platform' as const,x:FARM_DOCK.x,z,scale:.72,zoneId:'dock'})),
  ...[10,12.5].flatMap((z,i)=>[-4.89,-3.11].map((x,j)=>({id:`dock-post-${i}-${j}`,asset:'dock_pile' as const,x,z,scale:.72,zoneId:'dock'}))),
  ...LIVESTOCK_ANIMALS.map(a=>({id:a.id,asset:a.kind,x:a.x,z:a.z,yaw:a.yaw,scale:a.kind==='chicken'?.16:.33,independent:true,zoneId:`${a.kind}-reserve`})),
  ...[[-33,2],[-32.5,-10],[-33,-24],[-32,-40],[-32,-55],[-28,-61],[-20,-62],[-10,-63],[0,-63],[10,-63],[25,-62],
    [33,-5],[33,-17],[33,-30],[33,-44],[32,-54],[-12,7.8],[11.5,7.6],[31,8],[-31,7]].map(([x,z],i)=>({id:`tree-${i}`,asset:'orchard_tree' as const,x,z,scale:.72+(i%3)*.1})),
  ...[[24,4.5],[24.65,4.5],[24.35,4.5]].map(([x,z],i)=>({id:`hay-${i}`,asset:'hay_bale' as const,x,z,y:FARM_GROUND+(i===2?.6655*.55:0),scale:.55,solid:true,zoneId:'barn'})),
];

// Fence only the livestock reservation boundary, with a 5-wide gate gap to its west.
function fenceEdge(id:string,x1:number,z1:number,x2:number,z2:number,gap?:{center:number;width:number}){
  const horizontal=z1===z2,length=Math.hypot(x2-x1,z2-z1),count=Math.ceil(length/1.1),step=length/count;
  for(let i=0;i<count;i++){
    const x=x1+(x2-x1)*(i+.5)/count,z=z1+(z2-z1)*(i+.5)/count,along=horizontal?x:z;
    if(gap&&Math.abs(along-gap.center)<gap.width/2+step/2)continue;
    FARM_PLACEMENTS.push({id:`${id}-${i}`,asset:'fence_segment',x,z,scale:step/2.2,yaw:horizontal?0:Math.PI/2,solid:true});
  }
}
fenceEdge('livestock-west',14,-42,14,-62.5,{center:-55,width:5});
fenceEdge('livestock-east',30.3,-42,30.3,-62.5);
fenceEdge('livestock-north',14,-62.5,30.3,-62.5);
fenceEdge('livestock-south',14,-42,30.3,-42,{center:18,width:5});
// Short separator leaves both reserved shed footprints accessible from the entrance.
fenceEdge('chicken-cow-divider',22,-42,22,-46.7);
fenceEdge('pasture-sheep-divider',22,-49,22,-61.5,{center:-55,width:3});
fenceEdge('chicken-back',14,-47.5,22,-47.5);
fenceEdge('cow-entry',22,-47.8,30.3,-47.8,{center:26,width:2});
fenceEdge('sheep-entry',22,-48.2,30.3,-48.2,{center:26,width:2});
fenceEdge('sheep-back',22,-56.2,30.3,-56.2);

for(const p of FARM_PLACEMENTS)if(p.y===undefined)p.y=p.zoneId==='dock'||p.asset==='fishing_deck'?FARM_GROUND:farmGroundHeight(p.x,p.z);

FARM_ASSET_BOUNDS.set('fence_segment',{min:[-1.1,-.10,0],max:[1.1,.10,1.14]});
FARM_ASSET_BOUNDS.set('fence_gate',{min:[-1.1,-.10,0],max:[1.1,.10,1.14]});
export function placedBox(p:Pick<FarmPlacement,'x'|'z'|'scale'|'y'|'yaw'>,min:readonly number[],max:readonly number[]):FarmObstacle{
  const c=Math.cos(p.yaw??0),s=Math.sin(p.yaw??0),xs:number[]=[],zs:number[]=[];
  for(const x of [min[0],max[0]])for(const z of [min[2],max[2]]){xs.push(p.x+(c*x+s*z)*p.scale);zs.push(p.z+(-s*x+c*z)*p.scale);}
  return {minX:Math.min(...xs),maxX:Math.max(...xs),minZ:Math.min(...zs),maxZ:Math.max(...zs),minY:(p.y??FARM_GROUND)+min[1]*p.scale,maxY:(p.y??FARM_GROUND)+max[1]*p.scale};
}
function assetBox(p:FarmPlacement){const b=FARM_ASSET_BOUNDS.get(p.asset)!;return placedBox(p,[b.min[0],b.min[2],-b.max[1]],[b.max[0],b.max[2],-b.min[1]]);}
// Vehicles and implements have moving colliders owned by FarmWorld.
export const FARM_OBSTACLES:FarmObstacle[]=FARM_PLACEMENTS.filter(p=>p.solid&&!['yard-tractor','combine','plow','seeder','trailer'].includes(p.id)).map(assetBox);
FARM_OBSTACLES.push({...rectBounds(FARM_SEED_SUPPLY),minY:FARM_GROUND,maxY:FARM_GROUND+FARM_SEED_SUPPLY.height});
for(const pen of LIVESTOCK_PENS){
  const {feeder,shelter}=pen;
  FARM_OBSTACLES.push({minX:feeder.x-.6,maxX:feeder.x+.6,minZ:feeder.z-.22,maxZ:feeder.z+.22,minY:farmGroundHeight(feeder.x,feeder.z),maxY:farmGroundHeight(feeder.x,feeder.z)+.3});
  for(const x of [shelter.x-.6,shelter.x+.6])for(const z of [shelter.z-.35,shelter.z+.35])FARM_OBSTACLES.push({minX:x-.05,maxX:x+.05,minZ:z-.05,maxZ:z+.05,minY:FARM_GROUND,maxY:FARM_GROUND+.9});
}
const cottage=FARM_PLACEMENTS.find(p=>p.id==='cottage')!;
for(const [min,max] of [
  [[-1.72,.36,-1.76],[-1.62,2.64,1.76]],[[1.62,.36,-1.76],[1.72,2.64,1.76]],
  [[-1.62,.36,-1.76],[1.62,2.64,-1.66]],
  [[-1.72,.36,1.66],[-.56,2.64,1.76]],[[.26,.36,1.66],[1.72,2.64,1.76]],
  [[-.56,2.06,1.66],[.26,2.66,1.76]],
  // Porch supports and entry steps, separate from the doorway.
  [[-1.68,.34,2.71],[-1.54,2.43,2.85]],[[.82,.34,2.71],[.96,2.43,2.85]],
])FARM_OBSTACLES.push(placedBox(cottage,min,max));
const shed=FARM_PLACEMENTS.find(p=>p.id==='shed')!;
for(const [min,max] of [
  [[-2.31,.18,-2.05],[-2.11,3.05,2.05]],[[2.11,.18,-2.05],[2.31,3.05,2.05]],[[-2.21,.18,-2.06],[2.21,3.05,-1.90]],
  [[.76,.18,-1.52],[2.02,1.06,-.08]],[[-1.83,.18,-1.86],[-.14,1.85,-1.36]],
])FARM_OBSTACLES.push(placedBox(shed,min,max));
for(const p of FARM_PLACEMENTS.filter(p=>p.asset==='orchard_tree'))FARM_OBSTACLES.push(placedBox(p,[-.18,0,-.18],[.18,2,.18]));
for(const z of [10,12.5,14.5-.8856,14.5+.8856])for(const x of [-4.89,-3.11])FARM_OBSTACLES.push({minX:x-.10,maxX:x+.10,minZ:z-.10,maxZ:z+.10,minY:3.1,maxY:4.43});
const fishing=FARM_PLACEMENTS.find(p=>p.id==='fishing')!;
for(const [min,max] of [[[-.57,0,-.58],[.02,1.2,.04]],[[.28,0,-.57],[.72,.55,-.13]]])FARM_OBSTACLES.push(placedBox(fishing,min,max));
for(const x of [-.89,.89])for(const z of [-.85,.85])FARM_OBSTACLES.push(placedBox(fishing,[x-.14,-1.2,z-.14],[x+.14,.52,z+.14]));
for(const sign of FARM_SIGNS){
  const p={...sign,scale:1,y:farmGroundHeight(sign.x,sign.z)};
  FARM_OBSTACLES.push(placedBox(p,[-.06,0,-.06],[.06,.85,.06]));
  FARM_OBSTACLES.push(placedBox(p,[-1.2,.62,-.06],[1.2,1.27,.06]));
}

function surface(p:FarmPlacement,rect:FarmRect,localTop:number){
  const b=placedBox(p,[rect.x-rect.width/2,localTop-.12,rect.z-rect.depth/2],[rect.x+rect.width/2,localTop,rect.z+rect.depth/2]);
  return {minX:b.minX,maxX:b.maxX,minZ:b.minZ,maxZ:b.maxZ,top:b.maxY};
}
export const FARM_SURFACES=[
  {...rectBounds({x:FARM_DOCK.x,z:12.52,width:FARM_DOCK.maxX-FARM_DOCK.minX,depth:FARM_DOCK.maxZ-FARM_DOCK.minZ}),minZ:FARM_DOCK.minZ,maxZ:FARM_DOCK.maxZ,top:FARM_DOCK.top},
  {minX:-8.55,maxX:-7.45,minZ:9.81,maxZ:10.89,top:FARM_GROUND},
  surface(cottage,{x:0,z:0,width:3.65,depth:3.73},.36),
  surface(cottage,{x:-.36,z:2.29,width:2.62,depth:1.15},.368),
  surface(cottage,{x:-.32,z:2.99,width:1.07,depth:.27},.255),
  surface(cottage,{x:-.32,z:3.21,width:1.07,depth:.27},.185),
  surface(shed,{x:0,z:0,width:4.8,depth:4.15},.18),
];
