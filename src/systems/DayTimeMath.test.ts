import { expect,it } from 'vitest';
import { dayPhase,dawnWeight,sunsetWeight } from './DayTimeMath';
it('names the four art phases with continuous dawn and sunset weights',()=>{
  expect(dayPhase(6/24)).toBe('DAWN');expect(dayPhase(12/24)).toBe('DAY');expect(dayPhase(18/24)).toBe('SUNSET');expect(dayPhase(23/24)).toBe('NIGHT');
  for(const t of [5/24,8/24,17/24,20/24]){expect(Math.abs(dawnWeight(t)-dawnWeight(t+.00001))).toBeLessThan(.001);expect(Math.abs(sunsetWeight(t)-sunsetWeight(t+.00001))).toBeLessThan(.001);}
});
