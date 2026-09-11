export type ShipPose={x:number;z:number;yaw:number};

/** Compact open-water circuit, kept east of the island and dock. */
export function sampleShipPath(time:number):ShipPose{
  const angle=time*.065+.3,rx=.68,rz=.68;
  return {x:2.42+Math.cos(angle)*rx,z:Math.sin(angle)*rz,yaw:Math.atan2(-rx*Math.sin(angle),rz*Math.cos(angle))};
}

/** 2D SAT for an oriented ship footprint against an axis-aligned solid. */
export function obbIntersectsAabb(cx:number,cz:number,halfX:number,halfZ:number,yaw:number,minX:number,maxX:number,minZ:number,maxZ:number,clearance=0){
  const ax=(minX+maxX)/2,az=(minZ+maxZ)/2,ahx=(maxX-minX)/2+clearance,ahz=(maxZ-minZ)/2+clearance,dx=ax-cx,dz=az-cz,c=Math.cos(yaw),s=Math.sin(yaw);
  if(Math.abs(dx)>ahx+Math.abs(c)*halfX+Math.abs(s)*halfZ)return false;
  if(Math.abs(dz)>ahz+Math.abs(s)*halfX+Math.abs(c)*halfZ)return false;
  if(Math.abs(dx*c-dz*s)>halfX+ahx*Math.abs(c)+ahz*Math.abs(s))return false;
  if(Math.abs(dx*s+dz*c)>halfZ+ahx*Math.abs(s)+ahz*Math.abs(c))return false;
  return true;
}
