import { describe,it,expect } from 'vitest';
import { buoyancyFromHeights,sampleBuoyancy } from './Buoyancy';
import { waveHeight } from '../ocean/WaveMath';
describe('four-point buoyancy',()=>{
  it('floats level on a flat plane',()=>{expect(buoyancyFromHeights(3,3,3,3,1,.4,{height:0,pitch:0,roll:0})).toEqual({height:3,pitch:0,roll:0});});
  it('uses front/back and left/right differences with correct sign',()=>{const out=buoyancyFromHeights(2,4,3,5,2,2,{height:0,pitch:0,roll:0});expect(out.height).toBe(3.5);expect(out.pitch).toBeCloseTo(Math.atan2(1,2));expect(out.roll).toBeCloseTo(Math.PI/4);});
  it('matches the ocean samples at zero yaw',()=>{const out=sampleBuoyancy(1,2,0,3,1,{height:0,pitch:0,roll:0});const avg=(waveHeight(.82,2.48,3,1)+waveHeight(1.18,2.48,3,1)+waveHeight(.82,1.52,3,1)+waveHeight(1.18,1.52,3,1))/4;expect(out.height).toBeCloseTo(avg);});
});
