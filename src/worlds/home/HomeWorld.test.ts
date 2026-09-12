import { hitsDynamicObstacle } from '../../world/Collision';
import { expect,it,vi } from 'vitest';
import { HomeWorld } from './HomeWorld';
import { cubeGeometry,material,voxelMaterial } from '../../utils/voxel';
import { BufferGeometry, Group, Mesh, MeshBasicMaterial, Texture } from 'three';
import { disposeWorld } from '../disposeWorld';
it('retains landmarks, restores discovery and releases only owned resources',()=>{
  const cube=vi.spyOn(cubeGeometry,'dispose'),voxel=vi.spyOn(voxelMaterial,'dispose'),cached=vi.spyOn(material('#513723'),'dispose');
  const world=new HomeWorld();world.load();world.enter({gameTime:100,state:{lastSimulatedGameTime:1,discoveries:['anchor','lighthouse']},spawn:world.getSpawnPoint()});
  for(const id of ['chest','anchor','ruins','lighthouse'])expect(world.root.getObjectByName(id)).toBeDefined();
  expect(world.leave({gameTime:200})).toEqual({lastSimulatedGameTime:200,discoveries:['anchor','lighthouse']});world.applyQuality('LOW');world.dispose();
  expect(world.root.children).toHaveLength(0);expect(cube).not.toHaveBeenCalled();expect(voxel).not.toHaveBeenCalled();expect(cached).not.toHaveBeenCalled();
  const next=new HomeWorld();expect(next.root.children.length).toBeGreaterThan(0);next.dispose();vi.restoreAllMocks();
});
it('deduplicates owned geometry, materials and textures and permits idempotent disposal',()=>{
  const root=new Group(),geo=new BufferGeometry(),texture=new Texture(),mat=new MeshBasicMaterial({map:texture});root.add(new Mesh(geo,mat),new Mesh(geo,mat));
  const g=vi.spyOn(geo,'dispose'),m=vi.spyOn(mat,'dispose'),t=vi.spyOn(texture,'dispose');disposeWorld(root);disposeWorld(root);expect(g).toHaveBeenCalledOnce();expect(m).toHaveBeenCalledOnce();expect(t).toHaveBeenCalledOnce();
});

it('keeps the original dock spawn clear of the new transport boat',()=>{const world=new HomeWorld(),spawn=world.getSpawnPoint();for(let time=0;time<30;time+=.5){world.prepare({delta:1/60,time,gameTime:0,storm:1,dayTime:.5,night:0,flash:0});expect(hitsDynamicObstacle(spawn.position[0],spawn.position[2],spawn.position[1],world.boat.collisionBoxes)).toBe(false);}world.dispose();});
