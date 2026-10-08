import { DAY_DURATION } from '../../core/GameClock';
import type { ShipPose } from '../../world/ship/ShipPath';
export const HOME_MERCHANT_BERTH={x:-1.6,z:2.38,yaw:Math.PI/2};
export const HOME_MERCHANT_DECK_TOP=3.94;
export const HOME_MERCHANT_TRADE={x:-1.6,y:HOME_MERCHANT_DECK_TOP+.44,z:1.80};
export const MERCHANT_SCHEDULE='每日 08:00–20:00 靠岸';
type Phase='ARRIVING'|'DOCKED'|'DEPARTING'|'SAILING';
const route:readonly ShipPose[]=[
  {x:3.7,z:0,yaw:0},{x:3.7,z:-2.15,yaw:Math.PI},
  {x:3.7,z:-2.15,yaw:-Math.PI/2},{x:-4.35,z:-2.15,yaw:-Math.PI/2},
  {x:-4.35,z:-2.15,yaw:0},{x:-4.35,z:1.3,yaw:0},
  {x:-4.15,z:2.38,yaw:Math.PI/2},HOME_MERCHANT_BERTH,
];
const lengths=route.slice(1).map((p,i)=>Math.max(.75,Math.hypot(p.x-route[i].x,p.z-route[i].z))),total=lengths.reduce((a,b)=>a+b,0);
const smooth=(p:number)=>p*p*(3-2*p);
function alongRoute(progress:number):ShipPose{
  let distance=Math.max(0,Math.min(1,progress))*total;
  for(let i=0;i<lengths.length;i++){
    if(distance<=lengths[i]||i===lengths.length-1){const a=route[i],b=route[i+1],p=smooth(Math.min(1,distance/lengths[i])),angle=Math.atan2(Math.sin(b.yaw-a.yaw),Math.cos(b.yaw-a.yaw));return {x:a.x+(b.x-a.x)*p,z:a.z+(b.z-a.z)*p,yaw:a.yaw+angle*p};}distance-=lengths[i];
  }return {...HOME_MERCHANT_BERTH};
}
/** Derived solely from saved GameClock time; loading or sleeping cannot desync the ship. */
export function sampleMerchantRoute(gameTime:number):{phase:Phase;pose:ShipPose;available:boolean;prompt:string}{
  const hour=((Math.max(0,gameTime)%DAY_DURATION)/DAY_DURATION)*24;let phase:Phase,pose:ShipPose;
  if(hour>=8&&hour<20){phase='DOCKED';pose={...HOME_MERCHANT_BERTH};}
  else if(hour>=7&&hour<8){phase='ARRIVING';pose=alongRoute(hour-7);}
  else if(hour>=20&&hour<21){phase='DEPARTING';pose=alongRoute(21-hour);}
  else {phase='SAILING';const elapsed=hour>=21?hour-21:hour+3,angle=elapsed/10*Math.PI*2;pose={x:3.02+.68*Math.cos(angle),z:.68*Math.sin(angle),yaw:Math.atan2(-Math.sin(angle),Math.cos(angle))};}
  return {phase,pose,available:phase==='DOCKED',prompt:phase==='DOCKED'?'远海帆船 · 出售产品 / 购买补给':`远海帆船${phase==='ARRIVING'?'正在靠岸':phase==='DEPARTING'?'正在离港':'远航中'} · ${MERCHANT_SCHEDULE}`};
}
