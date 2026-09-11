import { expect,it } from 'vitest';
import { InstancedMesh,Matrix4 } from 'three';
import { MicroAnimationSystem } from './MicroAnimationSystem';
it('keeps decorative particles sparse, suppresses smoke in storms, and expires rare meteors',()=>{
  const system=new MicroAnimationSystem(),mesh=system.children[0] as InstancedMesh;
  system.update(0,0,0);expect(mesh.count).toBe(0);system.update(10,1,0);expect(mesh.count).toBe(8);
  system.update(11,1,1);expect(mesh.count).toBe(0);system.update(60,1,0);system.update(60.5,1,0);expect(mesh.count).toBe(16);
  const first=new Matrix4(),second=new Matrix4();mesh.getMatrixAt(8,first);system.update(60.5,1,0);mesh.getMatrixAt(8,second);expect(second.equals(first)).toBe(true);
  system.update(62,1,0);expect(mesh.count).toBe(8);system.setDensity(.25);system.update(63,1,0);expect(mesh.count).toBe(4);
});
