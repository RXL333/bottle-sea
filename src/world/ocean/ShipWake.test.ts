import { expect,it } from 'vitest';
import { InstancedMesh } from 'three';
import { ShipWake,wakeVisibility } from './ShipWake';

it('fades short bow foam and expires stern trails within three seconds',()=>{
  expect(wakeVisibility(-.1)).toBe(0);
  expect(wakeVisibility(.12)).toBeGreaterThan(wakeVisibility(1.8));
  expect(wakeVisibility(2.2)).toBe(0);
  expect(wakeVisibility(.55,.55)).toBe(0);
});

it('reuses a bounded batch at every quality and freezes with simulation time',()=>{
  const wake=new ShipWake(),mesh=wake.children[0] as InstancedMesh;
  for(const [step,capacity] of [[.25,48],[.16,84],[.14,120]]){
    wake.setDensity(step);
    for(let frame=0;frame<300;frame++){
      wake.update(frame/60,.5,3,1.2,0);
      expect(mesh.count).toBeLessThanOrEqual(capacity);
    }
    expect(mesh.count).toBeGreaterThan(0);
    const before=mesh.instanceMatrix.array.slice();
    wake.update(299/60,.5,3,1.2,0);
    expect(mesh.instanceMatrix.array).toEqual(before);
    expect(wake.children[0]).toBe(mesh);
  }
});
