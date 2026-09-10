export const WATER_LEVEL=3.3;
export function waveHeight(x:number,z:number,time:number,weatherIntensity:number) {
  const speed=1+weatherIntensity*.8, t=time*speed;
  return WATER_LEVEL+(Math.sin(x*2.4+t*1.5)*.045+Math.sin(z*3.7-x*.8+t*1.15)*.038+Math.sin(x*5.2+z*2.3-t*2.1)*.018)*(1+weatherIntensity*4.8);
}
