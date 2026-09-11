type BoxObstacle={minX:number;maxX:number;minY:number;maxY:number;minZ:number;maxZ:number};
type RoundObstacle={x:number;z:number;radius:number;minY:number;maxY:number};
import { terrainCellsNear } from './island/TerrainData';
import { seabedCellsNear,seabedCellAt } from './underwater/SeabedData';

export const PLAYER_RADIUS=.14,PLAYER_FOOT_OFFSET=.44,PLAYER_HEAD_OFFSET=.08,STEP_HEIGHT=.31;
export type DynamicObstacle={x:number;z:number;previousX:number;previousZ:number;halfX:number;halfZ:number;minY:number;maxY:number;yaw:number;previousYaw:number};

const boxes:BoxObstacle[]=[
  // The deck is solid from below as well as a walking surface from above.
  {minX:.19,maxX:1.11,minY:3.54,maxY:3.68,minZ:.5785,maxZ:1.9165},
  {minX:-2.17,maxX:-.83,minY:3.75,maxY:5.35,minZ:-.71,maxZ:.31},
  ...([.24,1.06].flatMap(x=>[.77,1.8].map(z=>({minX:x-.07,maxX:x+.07,minY:2.48,maxY:3.98,minZ:z-.07,maxZ:z+.07})))),
  {minX:-2.15,maxX:-1.45,minY:1.68,maxY:2.36,minZ:.85,maxZ:1.36},
  {minX:-4.32,maxX:-2.96,minY:1.74,maxY:3.24,minZ:.53,maxZ:.77},
  {minX:2.56,maxX:3.04,minY:1.68,maxY:2.9,minZ:.16,maxZ:.64},
  {minX:3.41,maxX:3.89,minY:1.68,maxY:2.9,minZ:.16,maxZ:.64},
  {minX:2.42,maxX:4.02,minY:2.84,maxY:3.04,minZ:.18,maxZ:.62},
  {minX:.4,maxX:2.08,minY:1.7,maxY:2.3,minZ:-1.34,maxZ:-.25},
];
const rounds:RoundObstacle[]=[
  {x:.35,z:-.28,radius:.32,minY:3.75,maxY:6.35},
  {x:-2.19,z:-.22,radius:.18,minY:3.75,maxY:5.35},
  {x:-1.78,z:-.64,radius:.18,minY:3.75,maxY:5.65},
  {x:-.37,z:-.78,radius:.18,minY:3.75,maxY:5.45},
];

export function hitsWorldObstacle(x:number,z:number,y:number,radius=.14){
  const feet=y-PLAYER_FOOT_OFFSET,head=y+PLAYER_HEAD_OFFSET;
  for(const b of boxes)if(x>b.minX-radius&&x<b.maxX+radius&&z>b.minZ-radius&&z<b.maxZ+radius&&head>b.minY+.001&&feet<b.maxY-.001)return true;
  for(const obstacle of rounds)if(head>obstacle.minY+.001&&feet<obstacle.maxY-.001&&Math.hypot(x-obstacle.x,z-obstacle.z)<obstacle.radius+radius)return true;
  for(const cell of terrainCellsNear(x,z,radius))if(circleHitsBox(x,z,radius,cell)&&head>cell.solidMinY+.001&&feet<cell.solidMaxY-.001)return true;
  for(const cell of seabedCellsNear(x,z,radius))if(circleHitsBox(x,z,radius,cell)&&head>cell.minY+.001&&feet<cell.top-.001)return true;
  return false;
}

function circleHitsBox(x:number,z:number,radius:number,b:{minX:number;maxX:number;minZ:number;maxZ:number}){const dx=Math.max(b.minX-x,0,x-b.maxX),dz=Math.max(b.minZ-z,0,z-b.maxZ);return dx*dx+dz*dz<radius*radius;}

function circleHitsObb(x:number,z:number,radius:number,b:DynamicObstacle,t=1){
  const cx=b.previousX+(b.x-b.previousX)*t,cz=b.previousZ+(b.z-b.previousZ)*t,yaw=b.previousYaw+(b.yaw-b.previousYaw)*t,c=Math.cos(yaw),s=Math.sin(yaw),dx=x-cx,dz=z-cz;
  const localX=c*dx-s*dz,localZ=s*dx+c*dz,qx=Math.max(Math.abs(localX)-b.halfX,0),qz=Math.max(Math.abs(localZ)-b.halfZ,0);return qx*qx+qz*qz<radius*radius;
}
export function hitsDynamicObstacle(x:number,z:number,y:number,obstacles:readonly DynamicObstacle[],radius=PLAYER_RADIUS){
  const feet=y-PLAYER_FOOT_OFFSET,head=y+PLAYER_HEAD_OFFSET;
  return obstacles.some(b=>head>b.minY&&feet<b.maxY&&circleHitsObb(x,z,radius,b));
}
export function resolveDynamicOverlap(position:{x:number;y:number;z:number},obstacles:readonly DynamicObstacle[],radius=PLAYER_RADIUS){
  const feet=position.y-PLAYER_FOOT_OFFSET,head=position.y+PLAYER_HEAD_OFFSET;
  for(const b of obstacles){if(head<=b.minY||feet>=b.maxY)continue;let hitAt=-1;for(let i=0;i<=8;i++)if(circleHitsObb(position.x,position.z,radius,b,i/8)){hitAt=i/8;break;}if(hitAt<0)continue;
    const separate=(t:number)=>{const cx=b.previousX+(b.x-b.previousX)*t,cz=b.previousZ+(b.z-b.previousZ)*t,yaw=b.previousYaw+(b.yaw-b.previousYaw)*t,c=Math.cos(yaw),s=Math.sin(yaw),dx=position.x-cx,dz=position.z-cz,lx=c*dx-s*dz,lz=s*dx+c*dz,outX=b.halfX+radius-Math.abs(lx),outZ=b.halfZ+radius-Math.abs(lz);if(outX<outZ){const target=Math.sign(lx||1)*(b.halfX+radius+.002);position.x=cx+c*target+s*lz;position.z=cz-s*target+c*lz;}else{const target=Math.sign(lz||1)*(b.halfZ+radius+.002);position.x=cx+c*lx+s*target;position.z=cz-s*lx+c*target;}};
    separate(hitAt);if(circleHitsObb(position.x,position.z,radius,b))separate(1);
  }
}

/** Highest real walkable surface under the player. */
export function supportHeightAt(x:number,z:number,currentFeet=Infinity){
  let top=seabedCellAt(x,z)?.top??1.65;
  for(const cell of seabedCellsNear(x,z,PLAYER_RADIUS))if(circleHitsBox(x,z,PLAYER_RADIUS,cell))top=Math.max(top,cell.top);
  for(const terrain of terrainCellsNear(x,z,PLAYER_RADIUS))if(circleHitsBox(x,z,PLAYER_RADIUS,terrain)&&terrain.top<=currentFeet+STEP_HEIGHT+.001)top=Math.max(top,terrain.top);
  for(const b of boxes)if(x>b.minX-PLAYER_RADIUS&&x<b.maxX+PLAYER_RADIUS&&z>b.minZ-PLAYER_RADIUS&&z<b.maxZ+PLAYER_RADIUS&&b.maxY<=currentFeet+STEP_HEIGHT+.001)top=Math.max(top,b.maxY);
  return top;
}

/** Sweep the camera volume vertically; a thin slab cannot be skipped between frames. */
export function resolveVerticalCollision(x:number,z:number,from:number,to:number,radius=.14){
  let result=to;
  const clip=(min:number,max:number)=>{
    if(to>from&&from<=min-PLAYER_HEAD_OFFSET&&to>min-PLAYER_HEAD_OFFSET)result=Math.min(result,min-PLAYER_HEAD_OFFSET);
    if(to<from&&from>=max+PLAYER_FOOT_OFFSET&&to<max+PLAYER_FOOT_OFFSET)result=Math.max(result,max+PLAYER_FOOT_OFFSET);
  };
  for(const b of boxes)if(x>b.minX-radius&&x<b.maxX+radius&&z>b.minZ-radius&&z<b.maxZ+radius)clip(b.minY,b.maxY);
  for(const b of rounds)if(Math.hypot(x-b.x,z-b.z)<b.radius+radius)clip(b.minY,b.maxY);
  for(const cell of terrainCellsNear(x,z,radius))if(circleHitsBox(x,z,radius,cell))clip(cell.solidMinY,cell.solidMaxY);
  for(const cell of seabedCellsNear(x,z,radius))if(circleHitsBox(x,z,radius,cell))clip(cell.minY,cell.top);
  return result;
}
