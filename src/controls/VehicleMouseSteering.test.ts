import { expect,it } from 'vitest';
import { VehicleMouseSteering } from './VehicleMouseSteering';
it('maps left and right displacement, clamps steering and recenters after idle',()=>{
  const mouse=new VehicleMouseSteering();mouse.move(-60);expect(mouse.update(.01)).toBeCloseTo(.48);mouse.move(1000);expect(mouse.update(.01)).toBe(-1);
  for(let i=0;i<300;i++)mouse.update(1/60);expect(Math.abs(mouse.update(0))).toBeLessThan(.001);mouse.move(-1000);expect(mouse.update(0)).toBe(1);mouse.reset();expect(mouse.update(0)).toBe(0);mouse.move(NaN);expect(mouse.update(0)).toBe(0);
});
