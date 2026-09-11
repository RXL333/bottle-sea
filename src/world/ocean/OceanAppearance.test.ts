import { expect,it } from 'vitest';
import { Color } from 'three';
import { crestIntensity,waveHeight } from './WaveMath';
import { shoreProximity,waterColor,waterDepth } from './OceanAppearance';
import { wakeVisibility } from './ShipWake';

it('identifies bounded crests and rejects troughs for calm and storm',()=>{
  for(const storm of [0,1]){let peaks=0;for(let t=0;t<20;t+=.1){const h=waveHeight(1,.8,t,storm),crest=crestIntensity(1,.8,t,storm,h);expect(crest).toBeGreaterThanOrEqual(0);expect(crest).toBeLessThanOrEqual(1);if(h<3.3)expect(crest).toBe(0);if(crest>.3)peaks++;}expect(peaks).toBeGreaterThan(0);}
});
it('makes near shore water shallower and keeps colors continuous and deterministic',()=>{
  expect(shoreProximity(-.85,1.03)).toBeGreaterThan(shoreProximity(-.85,2));
  expect(waterDepth(-.85,1.03)).toBeLessThan(waterDepth(2,0));
  const a=new Color(),b=new Color();waterColor(.5,.8,3.33,.5,.58,0,a);waterColor(.5,.8,3.33,.5,.580001,0,b);expect(Math.abs(a.r-b.r)+Math.abs(a.g-b.g)+Math.abs(a.b-b.b)).toBeLessThan(.001);
  waterColor(.5,.8,3.33,.5,0,0,b);expect(b.g).toBeLessThan(a.g);
});
it('fades wakes completely within 2.2 seconds without negative scales',()=>{
  expect(wakeVisibility(-1)).toBe(0);expect(wakeVisibility(0)).toBe(0);expect(wakeVisibility(.2)).toBeGreaterThan(wakeVisibility(2));expect(wakeVisibility(2.2)).toBe(0);expect(wakeVisibility(100)).toBe(0);
});
