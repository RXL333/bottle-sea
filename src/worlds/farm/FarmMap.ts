import manifest from '../../../public/models/farm/manifest.json';

export interface FarmRect {readonly x:number;readonly z:number;readonly width:number;readonly depth:number}
export interface FarmBounds {readonly minX:number;readonly maxX:number;readonly minZ:number;readonly maxZ:number}
export type FarmZoneKind='dock'|'center'|'building'|'parking'|'field'|'expansion'|'livestock'|'pasture';
export interface FarmZone extends FarmRect {readonly id:string;readonly name:string;readonly kind:FarmZoneKind;readonly reserved:boolean}
export interface FarmField extends FarmRect {
  readonly id:string;
  readonly grid:{readonly originX:number;readonly originZ:number;readonly cellSize:number;readonly columns:number;readonly rows:number};
  readonly headlands:{readonly north:FarmRect;readonly south:FarmRect};
}
export interface FarmAssetBounds {readonly min:readonly number[];readonly max:readonly number[]}

// Blender is Z-up; map coordinates and all footprints below use Three.js X/Z.
export const FARM_ASSET_BOUNDS=new Map<string,FarmAssetBounds>([...manifest.assets,...manifest.additionalAssets].map(a=>[a.id,a.boundsBlender]));
export const FARM_GROUND=4;
export const FARM_VEHICLE_SCALE=.5;
export const FARM_ROAD_WIDTH=5;
export const FARM_HEADLAND_DEPTH=10;
export const FARM_TURNING_DIAMETER=10;
export const FARM_LAND_BOUNDS:FarmBounds={minX:-36,maxX:36,minZ:-66,maxZ:10};
export const FARM_NAVIGATION_BOUNDS:FarmBounds={minX:-41,maxX:41,minZ:-71,maxZ:22};
export const FARM_DOCK={x:-4,z:13,minX:-4.954,maxX:-3.046,minZ:9.55,maxZ:15.49,top:FARM_GROUND};
export const FARM_ARRIVAL={id:'farm_dock_arrival',position:[-4,4.44,14.5],lookAt:[-4,4.5,5]} as const;
export const FARM_BOAT={x:-2.55,z:14.5,interaction:{x:-3.25,y:4.44,z:14.5,range:1.4}};

export const FARM_VEHICLE_ENVELOPES=['tractor','seeder','combine_harvester','farm_trailer','plow'].map(asset=>{
  const b=FARM_ASSET_BOUNDS.get(asset)!;
  return Object.freeze({asset,scale:FARM_VEHICLE_SCALE,width:(b.max[0]-b.min[0])*FARM_VEHICLE_SCALE,depth:(b.max[1]-b.min[1])*FARM_VEHICLE_SCALE,height:(b.max[2]-b.min[2])*FARM_VEHICLE_SCALE});
});

function field(id:string,x:number):FarmField{
  const z=-19,width=12,depth=18;
  return Object.freeze({id,x,z,width,depth,
    grid:Object.freeze({originX:x-width/2,originZ:z-depth/2,cellSize:1,columns:width,rows:depth}),
    headlands:Object.freeze({north:{x,z:z-depth/2-FARM_HEADLAND_DEPTH/2,width,depth:FARM_HEADLAND_DEPTH},south:{x,z:z+depth/2+FARM_HEADLAND_DEPTH/2,width,depth:FARM_HEADLAND_DEPTH}}),
  });
}
export const FARM_FIELDS:readonly FarmField[]=[field('field-west',-22),field('field-central',0),field('field-east',22)];
export const FARM_ROADS:readonly (FarmRect&{readonly id:string})[]=[
  {id:'dock-road',x:-4,z:4,width:FARM_ROAD_WIDTH,depth:12},
  {id:'south-lane',x:0,z:-5,width:62,depth:FARM_ROAD_WIDTH},
  {id:'north-lane',x:0,z:-33,width:62,depth:FARM_ROAD_WIDTH},
  {id:'west-spine',x:-11,z:-28,width:FARM_ROAD_WIDTH,depth:51},
  {id:'east-spine',x:11,z:-30.5,width:FARM_ROAD_WIDTH,depth:56},
  {id:'reserve-lane',x:0,z:-39,width:62,depth:FARM_ROAD_WIDTH},
];
export const FARM_TURNING_AREAS:readonly FarmRect[]=FARM_FIELDS.flatMap(f=>[f.headlands.north,f.headlands.south].map(h=>({x:h.x,z:h.z,width:FARM_TURNING_DIAMETER,depth:FARM_TURNING_DIAMETER})));

export const FARM_ZONES:readonly FarmZone[]=[
  {id:'dock',name:'农场码头',kind:'dock',reserved:false,x:-4,z:12.5,width:2,depth:6},
  {id:'center',name:'农场中心',kind:'center',reserved:false,x:-2,z:3.5,width:18,depth:9},
  {id:'barn',name:'谷仓',kind:'building',reserved:false,x:20,z:4,width:10,depth:8},
  {id:'shed',name:'农机棚',kind:'building',reserved:false,x:-25,z:4,width:7,depth:6},
  {id:'cottage',name:'农场小屋',kind:'building',reserved:false,x:5,z:4.5,width:5,depth:6},
  {id:'tower',name:'水塔',kind:'building',reserved:false,x:29,z:5,width:3,depth:3},
  {id:'machinery-yard',name:'农具与车辆停放区',kind:'parking',reserved:false,x:-20.5,z:1.5,width:21,depth:3},
  ...FARM_FIELDS.map(f=>({id:f.id,name:f.id==='field-west'?'西侧农田':f.id==='field-central'?'中央农田':'东侧农田',kind:'field' as const,reserved:false,x:f.x,z:f.z,width:f.width,depth:f.depth})),
  {id:'expansion-west',name:'西侧扩展农田',kind:'expansion',reserved:true,x:-22,z:-50,width:14,depth:16},
  {id:'expansion-central',name:'中央扩展农田',kind:'expansion',reserved:true,x:0,z:-50,width:12,depth:16},
  {id:'chicken-reserve',name:'鸡舍预留区',kind:'livestock',reserved:true,x:18,z:-44.5,width:8,depth:6},
  {id:'cow-reserve',name:'牛棚预留区',kind:'livestock',reserved:true,x:26,z:-44.5,width:8,depth:6},
  {id:'sheep-reserve',name:'羊圈预留区',kind:'livestock',reserved:true,x:26,z:-52,width:8,depth:8},
  {id:'pasture-reserve',name:'牧场预留区',kind:'pasture',reserved:true,x:18,z:-55.5,width:8,depth:14},
];
export interface FarmSign {readonly id:string;readonly x:number;readonly z:number;readonly yaw:number;readonly title:string;readonly detail:string}
export const FARM_SIGNS:readonly FarmSign[]=[
  {id:'arrival-sign',x:-7.9,z:6.2,yaw:0,title:'农场岛',detail:'中心 ↑   农机 ←   谷仓 →'},
  {id:'center-sign',x:8,z:.6,yaw:0,title:'农场中心',detail:'农田 ↑   牧场 ↑   码头 ↓'},
  {id:'shed-sign',x:-29.5,z:2.5,yaw:Math.PI/2,title:'农机棚',detail:'车辆与农具停放区'},
  {id:'barn-sign',x:14.5,z:4,yaw:-Math.PI/2,title:'谷仓',detail:'仓储与装卸区'},
  {id:'cottage-sign',x:2.2,z:4.5,yaw:-Math.PI/2,title:'农场小屋',detail:'生活区'},
  ...FARM_FIELDS.map(f=>({id:`${f.id}-sign`,x:f.id==='field-west'?-15.1:f.x-7,z:f.z,yaw:f.id==='field-west'?Math.PI/2:-Math.PI/2,title:f.id==='field-west'?'西侧农田':f.id==='field-central'?'中央农田':'东侧农田',detail:'田头请保持畅通'})),
  {id:'expansion-sign',x:7,z:-44,yaw:-Math.PI/2,title:'农田预留区',detail:'待扩建'},
  {id:'livestock-sign',x:15,z:-42.3,yaw:0,title:'养殖预留区',detail:'鸡舍 · 牛棚 · 羊圈'},
  {id:'chicken-sign',x:13.8,z:-44.5,yaw:-Math.PI/2,title:'鸡舍预留区',detail:'待扩建'},
  {id:'cow-sign',x:30.8,z:-44.5,yaw:-Math.PI/2,title:'牛棚预留区',detail:'待扩建'},
  {id:'sheep-sign',x:30.8,z:-52,yaw:-Math.PI/2,title:'羊圈预留区',detail:'待扩建'},
  {id:'pasture-sign',x:13.8,z:-58,yaw:-Math.PI/2,title:'牧场预留区',detail:'待扩建'},
];
export function farmZone(id:string):FarmZone{
  const zone=FARM_ZONES.find(z=>z.id===id);if(!zone)throw new Error(`Unknown farm zone: ${id}`);return zone;
}
export function rectBounds(rect:FarmRect):FarmBounds{return {minX:rect.x-rect.width/2,maxX:rect.x+rect.width/2,minZ:rect.z-rect.depth/2,maxZ:rect.z+rect.depth/2};}
export function containsRect(rect:FarmRect,x:number,z:number,margin=0){return Math.abs(x-rect.x)<=rect.width/2+margin&&Math.abs(z-rect.z)<=rect.depth/2+margin;}
/** Pure spatial helpers only: no planting state, timers or save payloads. */
export function farmFieldCell(field:FarmField,x:number,z:number){
  const grid=field.grid,column=Math.floor((x-grid.originX)/grid.cellSize),row=Math.floor((z-grid.originZ)/grid.cellSize);
  return column>=0&&column<grid.columns&&row>=0&&row<grid.rows?{column,row}:null;
}
export function farmCellCenter(field:FarmField,column:number,row:number){
  if(!Number.isInteger(column)||!Number.isInteger(row)||column<0||column>=field.grid.columns||row<0||row>=field.grid.rows)return null;
  return {x:field.grid.originX+(column+.5)*field.grid.cellSize,z:field.grid.originZ+(row+.5)*field.grid.cellSize};
}
export const FARM_MAP=Object.freeze({version:1,ground:FARM_GROUND,bounds:FARM_LAND_BOUNDS,navigationBounds:FARM_NAVIGATION_BOUNDS,fields:FARM_FIELDS,roads:FARM_ROADS,zones:FARM_ZONES,turningAreas:FARM_TURNING_AREAS,vehicles:FARM_VEHICLE_ENVELOPES});
