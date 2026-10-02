import { expect,it } from 'vitest';
import { Color,Scene } from 'three';
import { DayNightSystem } from './DayNightSystem';
it('anchors the farm shadow projection while daylight, clouds and camera positions change',()=>{
  const scene=new Scene();scene.background=new Color();const sky=new DayNightSystem(scene);sky.configureShadows('FARM');
  const light=sky.sun.position.clone(),target=sky.sun.target.position.clone(),projection=sky.sun.shadow.camera.projectionMatrix.clone();
  for(const time of [.2,.4,.6,.8])sky.update(time,time*480,0);
  expect(sky.sun.position.equals(light)).toBe(true);expect(sky.sun.target.position.equals(target)).toBe(true);expect(sky.sun.shadow.camera.projectionMatrix.equals(projection)).toBe(true);expect(target.z).toBe(-28);
  sky.configureShadows('HOME');expect(sky.sun.position.toArray()).toEqual([-4,10,6]);expect(sky.sun.target.position.toArray()).toEqual([0,0,0]);
});
