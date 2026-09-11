import { expect,it } from 'vitest';
import { PerspectiveCamera,Vector3 } from 'three';
import { OverviewController } from './OverviewController';
class Surface extends EventTarget{style={touchAction:''};ownerDocument=new EventTarget();getRootNode(){return this.ownerDocument;}}
it('keeps the home shot independent of focused target when resizing',()=>{
  const camera=new PerspectiveCamera(34,16/9),controls=new OverviewController(camera,new Surface() as unknown as HTMLElement);
  controls.target.set(-1.6,2.2,.3);camera.position.set(-1.6,2.6,6.4);const focused=camera.position.clone();camera.aspect=390/844;controls.fit(false);
  expect(camera.position.equals(focused)).toBe(true);expect(controls.target0.equals(new Vector3(.5,3.05,0))).toBe(true);expect(controls.position0.z).toBeGreaterThan(50);
  controls.suspend();expect(camera.position.distanceTo(focused)).toBe(0);expect(controls.enabled).toBe(false);controls.dispose();
});
