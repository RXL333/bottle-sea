import { describe,it,expect } from 'vitest';
import { DAY_DURATION,GameClock } from './GameClock';
import { daylightAt } from '../systems/DayTimeMath';
describe('simulation clock',()=>{
  it('starts on day 8 at 17:41',()=>{const c=new GameClock();expect(c.day).toBe(8);expect(c.formatted).toBe('17:41');});
  it('honors pause and all speed settings',()=>{const c=new GameClock();for(const speed of [1,4,12]){const before=c.simulationTime;c.timeScale=speed;c.update(2);expect(c.simulationTime-before).toBe(2*speed);}c.paused=true;const before=c.simulationTime;c.update(9);expect(c.simulationTime).toBe(before);});
  it('rolls over midnight',()=>{const c=new GameClock();c.simulationTime=DAY_DURATION*8-.01;c.update(.02);expect(c.day).toBe(9);expect(c.hour).toBe(0);expect(c.minute).toBe(0);});
  it('ignores negative deltas',()=>{const c=new GameClock();const before=c.simulationTime;c.update(-1);expect(c.simulationTime).toBe(before);});
});
describe('daylight',()=>{
  it('is light at noon and dark at midnight',()=>{expect(daylightAt(.5)).toBe(1);expect(daylightAt(0)).toBe(0);expect(daylightAt(1)).toBe(0);});
  it('is smooth at dawn and dusk',()=>{for(const t of [.24,.25,.26,.74,.75,.76])expect(Math.abs(daylightAt(t+.0001)-daylightAt(t))).toBeLessThan(.01);});
});
