import { describe,it,expect } from 'vitest';
import { waveHeight,WATER_LEVEL } from './WaveMath';
describe('continuous ocean',()=>{
  it('does not shift accumulated wave phase when weather changes late in a session',()=>{expect(Math.abs(waveHeight(1,2,100000,.5001)-waveHeight(1,2,100000,.5))).toBeLessThan(.001);});
  it('is deterministic and spatially continuous',()=>{expect(waveHeight(1,2,3,0)).toBe(waveHeight(1,2,3,0));expect(Math.abs(waveHeight(1.0001,2,3,0)-waveHeight(1,2,3,0))).toBeLessThan(.001);});
  it('stays bounded even in a storm',()=>{for(let t=0;t<30;t+=.2)expect(Math.abs(waveHeight(t,t/2,t,1)-WATER_LEVEL)).toBeLessThan(.6);});
  it('increases RMS wave energy in storm conditions',()=>{let calm=0,storm=0;for(let t=0;t<100;t++){calm+=(waveHeight(t,2,t,0)-WATER_LEVEL)**2;storm+=(waveHeight(t,2,t,1)-WATER_LEVEL)**2;}expect(storm).toBeGreaterThan(calm*10);});
});
