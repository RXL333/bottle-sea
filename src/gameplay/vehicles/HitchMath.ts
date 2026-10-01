import { normalizeYaw } from './VehicleState';
export interface HullRect { x:number;z:number;halfX:number;halfZ:number;yaw:number }
export const headingDifference=(a:number,b:number)=>normalizeYaw(a-b);
/** Separating axes for two oriented ground footprints. */
export function hullsOverlap(a:HullRect,b:HullRect){
  const ax=[Math.cos(a.yaw),-Math.sin(a.yaw)],az=[Math.sin(a.yaw),Math.cos(a.yaw)],bx=[Math.cos(b.yaw),-Math.sin(b.yaw)],bz=[Math.sin(b.yaw),Math.cos(b.yaw)];
  for(const axis of [ax,az,bx,bz]){
    const dot=(u:number[])=>Math.abs(u[0]*axis[0]+u[1]*axis[1]);
    if(Math.abs((a.x-b.x)*axis[0]+(a.z-b.z)*axis[1])>=a.halfX*dot(ax)+a.halfZ*dot(az)+b.halfX*dot(bx)+b.halfZ*dot(bz))return false;
  }
  return true;
}
/** A bounded drawbar yaw integrates joint displacement in either travel direction. */
export function drawbarYaw(yaw:number,parentYaw:number,dx:number,dz:number,length:number){
  const turn=Math.atan2(dx*Math.cos(yaw)-dz*Math.sin(yaw),Math.max(.2,length));
  return normalizeYaw(parentYaw+Math.max(-.7,Math.min(.7,headingDifference(yaw+turn,parentYaw))));
}
