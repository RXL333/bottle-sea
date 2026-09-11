import { expect,it } from 'vitest';
import { PerspectiveCamera,Vector3 } from 'three';
import { FOCUS_LABELS,SceneFocusSystem } from './SceneFocusSystem';
it('smoothly reaches all five viewpoints and can retarget mid-flight',()=>{
  const camera=new PerspectiveCamera(),target=new Vector3(),focus=new SceneFocusSystem(camera,target),ship=new Vector3(3,3.3,.5),home=new Vector3(.5,6.2,24),origin=new Vector3(.5,3.05,0);
  camera.position.copy(home);
  for(const id of Object.keys(FOCUS_LABELS) as (keyof typeof FOCUS_LABELS)[]){focus.start(id,ship,home,origin);focus.update(.4);expect(focus.active).toBe(true);focus.update(.7);expect(focus.active).toBe(false);expect(Number.isFinite(camera.position.length())).toBe(true);}
  focus.start('lighthouse',ship,home,origin);focus.update(.2);const before=camera.position.clone();focus.start('overview',ship,home,origin);expect(camera.position.equals(before)).toBe(true);focus.update(1);expect(camera.position.equals(home)).toBe(true);expect(target.equals(origin)).toBe(true);
});
