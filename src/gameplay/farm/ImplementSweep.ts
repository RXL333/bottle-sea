import { normalizeYaw } from '../vehicles/VehicleState';
import type { MotionPose } from '../vehicles/VehicleMotion';
import type { FarmArea,FarmPoint } from './FarmDefinition';

export interface WorkFootprint { readonly minX:number;readonly maxX:number;readonly minZ:number;readonly maxZ:number }
const cross=(a:FarmPoint,b:FarmPoint,c:FarmPoint)=>(b.x-a.x)*(c.z-a.z)-(b.z-a.z)*(c.x-a.x);
function hull(points:FarmPoint[]):FarmPoint[]{
  const sorted=points.sort((a,b)=>a.x-b.x||a.z-b.z),lower:FarmPoint[]=[],upper:FarmPoint[]=[];
  for(const p of sorted){while(lower.length>=2&&cross(lower[lower.length-2],lower[lower.length-1],p)<=0)lower.pop();lower.push(p);}
  for(const p of [...sorted].reverse()){while(upper.length>=2&&cross(upper[upper.length-2],upper[upper.length-1],p)<=0)upper.pop();upper.push(p);}
  return [...lower.slice(0,-1),...upper.slice(0,-1)];
}
function corners(p:MotionPose,b:WorkFootprint,padding:number):FarmPoint[]{
  const c=Math.cos(p.yaw),s=Math.sin(p.yaw);
  return [b.minX-padding,b.maxX+padding].flatMap(x=>[b.minZ-padding,b.maxZ+padding].map(z=>({x:p.x+c*x+s*z,z:p.z-s*x+c*z})));
}
/** Accepted movement only. Convex sweeps bridge both footprints, including reverse
 * and turns. Small subdivisions bound rotation arcs instead of sampling cells. */
export function sweptWorkAreas(from:MotionPose,to:MotionPose,b:WorkFootprint):FarmArea[]{
  if(![from.x,from.z,from.yaw,to.x,to.z,to.yaw,b.minX,b.maxX,b.minZ,b.maxZ].every(Number.isFinite)||b.minX>=b.maxX||b.minZ>=b.maxZ)return [];
  const distance=Math.hypot(to.x-from.x,to.z-from.z),turn=normalizeYaw(to.yaw-from.yaw);
  if(distance<1e-9&&Math.abs(turn)<1e-9)return [];
  const steps=Math.max(1,Math.ceil(distance/.2),Math.ceil(Math.abs(turn)/(.035)));
  if(steps>2048)return [];
  const radius=Math.hypot(Math.max(Math.abs(b.minX),Math.abs(b.maxX)),Math.max(Math.abs(b.minZ),Math.abs(b.maxZ)));
  // The sagitta bounds the outward arc missed by endpoint chords. At the normal
  // 120Hz driving step this is sub-millimetre and does not widen the working lane.
  const padding=radius*(1-Math.cos(turn/steps/2))+1e-9,areas:FarmArea[]=[];
  const pose=(t:number):MotionPose=>({x:from.x+(to.x-from.x)*t,z:from.z+(to.z-from.z)*t,yaw:from.yaw+turn*t});
  for(let i=0;i<steps;i++)areas.push({kind:'polygon',points:hull([...corners(pose(i/steps),b,padding),...corners(pose((i+1)/steps),b,padding)])});
  return areas;
}
