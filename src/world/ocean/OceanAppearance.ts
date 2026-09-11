import { Color } from 'three';
import { bottleRadiusAt } from '../bottle/Bounds';
import { daylightAt } from '../../systems/DayTimeMath';
import { WATER_LEVEL } from './WaveMath';

const deep=new Color('#07535f'),middle=new Color('#13888d'),shallow=new Color('#53bfb2');
const night=new Color('#073649'),weather=new Color('#476b70'),warm=new Color('#c39d70');
const clamp=(v:number)=>Math.max(0,Math.min(1,v));

// Elliptical shore distance is an inexpensive, continuous approximation to the voxel coast.
export function shoreProximity(x:number,z:number){
  const distance=Math.sqrt(((x+.85)/1.9)**2+((z+.12)/1.04)**2);
  return clamp(1-(distance-Math.sqrt(1.08))/.48);
}
export function waterDepth(x:number,z:number){
  const radius=bottleRadiusAt(x)-.16;
  const bottom=Math.max(1.62,3.72-Math.sqrt(Math.max(0,radius*radius-z*z)));
  return Math.max(.05,WATER_LEVEL-bottom)*(1-shoreProximity(x,z)*.8);
}
// Caller owns the output Color. No allocation or random noise in the animation path.
export function waterColor(depth:number,shore:number,height:number,crest:number,dayTime:number,storm:number,out:Color){
  const light=daylightAt(dayTime),sunset=Math.exp(-(((dayTime-.735)/.055)**2));
  out.copy(deep).lerp(middle,clamp(1-depth/2)).lerp(shallow,clamp(shore*.5+(1-depth/1.7)*.4));
  out.lerp(night,(1-light)*.7).lerp(weather,storm*.55);
  out.lerp(warm,sunset*.12*(1-storm));
  return out.multiplyScalar(1+crest*.22+Math.max(-.08,Math.min(.1,(height-WATER_LEVEL)*.2)));
}
