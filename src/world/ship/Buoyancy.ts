import { waveHeight } from '../ocean/WaveMath';
export interface BuoyancyState { height:number; pitch:number; roll:number }
export function buoyancyFromHeights(fl:number,fr:number,bl:number,br:number,length:number,width:number,out:BuoyancyState) {
  out.height=(fl+fr+bl+br)/4;
  out.pitch=Math.atan2((bl+br-fl-fr)/2,length);
  out.roll=Math.atan2((fr+br-fl-bl)/2,width);
  return out;
}
export function sampleBuoyancy(x:number,z:number,yaw:number,time:number,storm:number,out:BuoyancyState) {
  const halfLength=.48,halfWidth=.18,c=Math.cos(yaw),s=Math.sin(yaw);
  const fl=waveHeight(x+halfLength*s-halfWidth*c,z+halfLength*c+halfWidth*s,time,storm);
  const fr=waveHeight(x+halfLength*s+halfWidth*c,z+halfLength*c-halfWidth*s,time,storm);
  const bl=waveHeight(x-halfLength*s-halfWidth*c,z-halfLength*c+halfWidth*s,time,storm);
  const br=waveHeight(x-halfLength*s+halfWidth*c,z-halfLength*c-halfWidth*s,time,storm);
  return buoyancyFromHeights(fl,fr,bl,br,halfLength*2,halfWidth*2,out);
}
