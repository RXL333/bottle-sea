import { expect,it } from 'vitest';
import { PerspectiveCamera,Quaternion,Vector3 } from 'three';
import { CameraTransitionSystem } from './CameraTransitionSystem';

it('holds for HUD fade, interpolates, rejects duplicate requests, and reaches exact endpoints',()=>{
  const camera=new PerspectiveCamera(34);camera.position.set(0,6,24);
  const transition=new CameraTransitionSystem(camera),end=new Vector3(.65,4.12,1.87),q=new Quaternion();
  transition.start('EXPLORE',end,q,68);transition.update(.15);expect(camera.position.z).toBe(24);expect(transition.state).toBe('ENTERING');
  expect(transition.start('OVERVIEW',new Vector3(),q,34)).toBe(false);
  transition.update(.8);expect(camera.position.z).toBeGreaterThan(end.z);expect(camera.position.z).toBeLessThan(24);
  expect(transition.update(1)).toBe(true);expect(camera.position.distanceTo(end)).toBeLessThan(1e-9);expect(camera.fov).toBe(68);expect(transition.state).toBe('EXPLORE');
  transition.start('OVERVIEW',new Vector3(0,6,24),q,34);transition.update(2);expect(transition.state).toBe('OVERVIEW');expect(camera.far).toBe(200);
});
