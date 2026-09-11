import { bottleRadiusAt } from '../bottle/Bounds';
import { seededRandom } from '../../utils/voxel';

export type SeabedCell={x:number;z:number;minX:number;maxX:number;minZ:number;maxZ:number;centerY:number;minY:number;top:number;color:string};
const START_X=-5.45,START_Z=-1.36,STEP=.24,SIZE=.239,HALF=SIZE/2;
export const SEABED_CELLS:SeabedCell[]=[];
const grid=new Map<string,SeabedCell>(),random=seededRandom(601);
for(let ix=0,x=START_X;x<4.75;ix++,x=START_X+ix*STEP)for(let iz=0,z=START_Z;z<1.4;iz++,z=START_Z+iz*STEP){
  if(Math.abs(x+.2)>5.1&&Math.abs(z)>1)continue;
  const centerY=Math.max(1.62,3.72-Math.sqrt(Math.max(0,(bottleRadiusAt(x)-.16)**2-z*z)))+Math.floor(random()*3)*.035;
  const cell:SeabedCell={x,z,minX:x-HALF,maxX:x+HALF,minZ:z-HALF,maxZ:z+HALF,centerY,minY:centerY-.08,top:centerY+.08,color:['#a4ac77','#bdba84','#8f9f73','#c4be8b'][Math.floor(random()*4)]};
  SEABED_CELLS.push(cell);grid.set(`${ix}:${iz}`,cell);
}
export function seabedCellAt(x:number,z:number,tolerance=.001){
  const ix=Math.round((x-START_X)/STEP),iz=Math.round((z-START_Z)/STEP),cell=grid.get(`${ix}:${iz}`);
  return cell&&x>=cell.minX-tolerance&&x<=cell.maxX+tolerance&&z>=cell.minZ-tolerance&&z<=cell.maxZ+tolerance?cell:undefined;
}
export function seabedCellsNear(x:number,z:number,radius:number){
  const result:SeabedCell[]=[];const minX=Math.floor((x-radius-START_X)/STEP),maxX=Math.ceil((x+radius-START_X)/STEP),minZ=Math.floor((z-radius-START_Z)/STEP),maxZ=Math.ceil((z+radius-START_Z)/STEP);
  for(let ix=minX;ix<=maxX;ix++)for(let iz=minZ;iz<=maxZ;iz++){const cell=grid.get(`${ix}:${iz}`);if(cell)result.push(cell);}
  return result;
}
