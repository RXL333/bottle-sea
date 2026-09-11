import { seededRandom } from '../../utils/voxel';

export type TerrainSurface='sand'|'grass';
export type TerrainLayer={color:string;y:number;height:number};
export type TerrainCell={x:number;z:number;minX:number;maxX:number;minZ:number;maxZ:number;solidMinY:number;solidMaxY:number;top:number;nominalHeight:number;surface:TerrainSurface;layers:TerrainLayer[];grass?:{color:string;y:number}};

const START_X=-2.85,START_Z=-1.28,STEP=.21,SIZE=.209,HALF=SIZE/2;

function analyticHeight(x:number,z:number){
  const d=((x+.85)/1.9)**2+((z+.12)/1.04)**2;
  if(d<.58)return 3.83;if(d<.87)return 3.65;if(d<1.08)return 3.46;return 0;
}
function analyticBottom(x:number,z:number){
  const d=((x+.85)/1.9)**2+((z+.12)/1.04)**2;
  return 2.5+Math.min(1,d)*.78;
}

export const TERRAIN_CELLS:TerrainCell[]=[];
const terrainGrid=new Map<string,TerrainCell>();
const random=seededRandom(127);
for(let ix=0,x=START_X;x<1.18;ix++,x=START_X+ix*STEP)for(let iz=0,z=START_Z;z<1.1;iz++,z=START_Z+iz*STEP){
  const nominalHeight=analyticHeight(x,z);if(!nominalHeight)continue;
  const solidMinY=analyticBottom(x,z)+random()*.06,sandBottom=nominalHeight-.3;
  const layers:TerrainLayer[]=[];
  const rockColor=random()>.5?'#506f5e':'#587964';
  if(sandBottom>solidMinY)layers.push({color:rockColor,y:(solidMinY+sandBottom)/2,height:sandBottom-solidMinY});
  layers.push({color:['#d8c58a','#c6b783','#e1ce95'][Math.floor(random()*3)],y:nominalHeight-.16,height:.28});
  let top=nominalHeight-.02;const surface:TerrainSurface=nominalHeight>3.6?'grass':'sand';
  if(surface==='grass'){layers.push({color:['#4c8b35','#3a742f','#608e3d'][Math.floor(random()*3)],y:nominalHeight+.035,height:.11});top=nominalHeight+.09;}
  const cell:TerrainCell={x,z,minX:x-HALF,maxX:x+HALF,minZ:z-HALF,maxZ:z+HALF,solidMinY,solidMaxY:top,top,nominalHeight,surface,layers};
  if(nominalHeight>3.8&&random()<.15)cell.grass={color:'#6e9c43',y:nominalHeight+.15};
  TERRAIN_CELLS.push(cell);terrainGrid.set(`${ix}:${iz}`,cell);
}

export function terrainCellAt(x:number,z:number,tolerance=.001){
  const ix=Math.round((x-START_X)/STEP),iz=Math.round((z-START_Z)/STEP),cell=terrainGrid.get(`${ix}:${iz}`);
  return cell&&x>=cell.minX-tolerance&&x<=cell.maxX+tolerance&&z>=cell.minZ-tolerance&&z<=cell.maxZ+tolerance?cell:undefined;
}
export function terrainCellsNear(x:number,z:number,radius:number){
  const result:TerrainCell[]=[];const minX=Math.floor((x-radius-START_X)/STEP),maxX=Math.ceil((x+radius-START_X)/STEP),minZ=Math.floor((z-radius-START_Z)/STEP),maxZ=Math.ceil((z+radius-START_Z)/STEP);
  for(let ix=minX;ix<=maxX;ix++)for(let iz=minZ;iz<=maxZ;iz++){const cell=terrainGrid.get(`${ix}:${iz}`);if(cell)result.push(cell);}
  return result;
}
