import { expect,it } from 'vitest';
import { mixAudio } from './AudioMixer';
import type { AudioMix } from './AudioMixer';
it('attenuates external sound underwater and brings in storm layers continuously',()=>{
  const out:AudioMix={ocean:0,wind:0,stormWind:0,rain:0,underwater:0,cutoff:0};mixAudio('OVERVIEW',0,out);const ocean=out.ocean,cutoff=out.cutoff;
  mixAudio('UNDERWATER',0,out);expect(out.ocean).toBeLessThan(ocean);expect(out.cutoff).toBeLessThan(cutoff);expect(out.underwater).toBeGreaterThan(0);
  mixAudio('ISLAND',.5,out);const rain=out.rain;mixAudio('ISLAND',1,out);expect(out.rain).toBeCloseTo(rain*2);mixAudio('OVERVIEW',0,out);expect(out.rain).toBe(0);expect(out.underwater).toBe(0);
});
