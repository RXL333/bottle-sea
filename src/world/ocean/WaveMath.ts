export const WATER_LEVEL=3.3;
export function waveHeight(x:number,z:number,time:number,weatherIntensity:number) {
  // Blend wave energy, never multiply accumulated time by a changing weather value.
  // This prevents a late storm toggle from suddenly advancing the entire wave phase.
  return WATER_LEVEL+(Math.sin(x*2.4+time*1.5)*.045+Math.sin(z*3.7-x*.8+time*1.15)*.038+Math.sin(x*5.2+z*2.3-time*2.1)*.018)*(1+weatherIntensity*4.8)
    +Math.sin(x*6.1-z*4.2+time*3.1)*.012*weatherIntensity;
}

/** Local curvature plus normalized height distinguish crests from rising slopes. */
export function crestIntensity(x:number,z:number,time:number,storm:number,height=waveHeight(x,z,time,storm)) {
  const radius=.22;
  const neighbors=(waveHeight(x-radius,z,time,storm)+waveHeight(x+radius,z,time,storm)
    +waveHeight(x,z-radius,time,storm)+waveHeight(x,z+radius,time,storm))*.25;
  const amplitude=1+storm*4.8;
  const elevation=Math.max(0,(height-WATER_LEVEL)/(.075*amplitude));
  const curvature=Math.max(0,(height-neighbors)/(.009*amplitude));
  return Math.min(1,elevation*curvature);
}
