import { expect,it } from 'vitest';
import { InstancedMesh } from 'three';
import { Ocean } from './Ocean';
import { QUALITY } from '../../core/Renderer';
it('uses 1500–3000 instanced water blocks at normal quality and preserves quality after rebuilding',()=>{
  const ocean=new Ocean();const count=()=>ocean.children.find(child=>child instanceof InstancedMesh&&child.renderOrder===3) as InstancedMesh;
  const initial=count().count;expect(initial).toBeGreaterThanOrEqual(1500);expect(initial).toBeLessThanOrEqual(3000);
  ocean.create(QUALITY.MEDIUM.waterStep);expect(count().count).toBe(initial);
  ocean.create(QUALITY.LOW.waterStep);expect(count().count).toBeLessThan(initial);
  ocean.create(QUALITY.HIGH.waterStep);expect(count().count).toBeGreaterThan(initial);
});
