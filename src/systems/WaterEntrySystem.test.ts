import { expect,it } from 'vitest';
import { WaterCrossing } from './WaterEntrySystem';
it('emits one enter/leave edge and ignores small surface jitter and underwater initialization',()=>{
  const water=new WaterCrossing();expect(water.update(4)).toBeUndefined();expect(water.update(3.2)).toBe('enter');
  for(const y of [3.1,3.29,3.31,3.3])expect(water.update(y)).toBeUndefined();
  expect(water.update(3.4)).toBe('leave');expect(water.update(3.4)).toBeUndefined();water.reset();expect(water.update(2)).toBeUndefined();expect(water.underwater).toBe(true);
});
