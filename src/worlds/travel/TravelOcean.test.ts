import { expect,it } from 'vitest';
import { Mesh,PlaneGeometry,MeshStandardMaterial } from 'three';
import { TravelOcean } from './TravelOcean';
import { waveHeight } from '../../world/ocean/WaveMath';
import { disposeWorld } from '../disposeWorld';
it('keeps departure and farm approach water connected beyond the camera range',()=>{
  const sea=new TravelOcean();sea.applyQuality('LOW');sea.update(13,1,.5);
  const mesh=sea.children[0] as Mesh<PlaneGeometry,MeshStandardMaterial>;
  const p=mesh.geometry.attributes.position;
  mesh.geometry.computeBoundingBox();
  expect(mesh.geometry.boundingBox!.min.x).toBe(-180);
  expect(mesh.geometry.boundingBox!.max.z).toBe(180);
  expect(mesh.geometry.index).not.toBeNull();
  // Every surface vertex uses the same wave clock as boat buoyancy, even outside HOME bounds.
  for(let i=0;i<p.count;i+=17)expect(p.getY(i)).toBeCloseTo(waveHeight(p.getX(i),p.getZ(i),13,1),5);
  const count=sea.children.length;sea.applyQuality('HIGH');expect(sea.children).toHaveLength(count);
  disposeWorld(sea);
});
