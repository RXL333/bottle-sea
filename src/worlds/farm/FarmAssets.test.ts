import { readFile } from 'node:fs/promises';
import { expect,it,vi } from 'vitest';
import { Box3,Group,Mesh,Vector3 } from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { FARM_MODEL_FILES,FarmAssets } from './FarmAssets';
import { FarmWorld } from './FarmWorld';
import { COTTAGE,FARM_OBSTACLES,FARM_PLACEMENTS } from './FarmLayout';
import { PLAYER_FOOT_OFFSET,PLAYER_RADIUS,hitsDynamicObstacle } from '../../world/Collision';

const fileLoader=async(url:string)=>{
  const bytes=await readFile(new URL('../../../public'+url,import.meta.url));
  return (await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'' )).scene;
};

it('loads the real farm GLBs, excludes main-island furniture, batches geometry, and releases owned resources',async()=>{
  const loader=vi.fn(fileLoader),world=new FarmWorld(loader);await Promise.all([world.load(),world.load()]);
  expect(loader).toHaveBeenCalledTimes(Object.keys(FARM_MODEL_FILES).length);
  expect(loader.mock.calls.every(([url])=>!url.includes('storage')&&!url.includes('kitchen'))).toBe(true);
  expect(world.root.userData.modelsReady).toBe(true);
  const models=world.root.getObjectByName('BlenderFarmModels')!;
  expect(models.userData.assetsPlaced).toBe(FARM_PLACEMENTS.length);
  expect(models.userData.staticBatches).toBeLessThan(50);
  const bounds=new Box3().setFromObject(models),size=bounds.getSize(new Vector3());
  expect(size.x).toBeLessThan(72);expect(size.z).toBeLessThan(85);expect(size.y).toBeLessThan(6.2);
  const owned=models.children.find((o):o is Mesh=>o instanceof Mesh)!;
  const released=vi.spyOn(owned.geometry,'dispose');
  const spawn=world.getSpawnPoint();for(let t=0;t<10;t+=.25){world.prepare({delta:.016,time:t,gameTime:0,storm:1,dayTime:.5,night:0,flash:0});expect(hitsDynamicObstacle(spawn.position[0],spawn.position[2],spawn.position[1],world.boat.collisionBoxes)).toBe(false);}
  world.dispose();expect(released).toHaveBeenCalledOnce();expect(world.root.children).toHaveLength(0);
});

it('keeps the approach, pasture entrance and cottage doorway clear, with the bed inside the room',()=>{
  const world=new FarmWorld();
  for(let z=14.5;z>=-4;z-=.1)expect(world.navigation.hitsObstacle(-4,z,4.44),`central lane at ${z}`).toBe(false);
  for(let x=11;x<=18;x+=.1)expect(world.navigation.hitsObstacle(x,-55,4.44),`pasture entrance at ${x}`).toBe(false);
  const doorX=COTTAGE.x+.15*COTTAGE.scale;
  for(let localZ=3.4;localZ>=.55;localZ-=.04){const z=COTTAGE.z-localZ*COTTAGE.scale,height=world.navigation.groundHeight(doorX,z,4);expect(world.navigation.hitsObstacle(doorX,z,height+PLAYER_FOOT_OFFSET),`cottage doorway at ${z}`).toBe(false);}
  expect(world.navigation.groundHeight(COTTAGE.x,COTTAGE.z,4)).toBeCloseTo(COTTAGE.floor);
  expect(world.navigation.hitsObstacle(COTTAGE.x-1.67*COTTAGE.scale,COTTAGE.z,4.7)).toBe(true);
  const bed=FARM_PLACEMENTS.find(p=>p.id==='bed')!;expect(world.navigation.hitsObstacle(bed.x,bed.z,4.8)).toBe(true);
  const barn=FARM_OBSTACLES[0];expect(world.navigation.hitsObstacle(20,barn.minZ-PLAYER_RADIUS+.01,4.44)).toBe(true);
  expect(world.navigation.resolveVertical(-4,14,3.7,4.5)).toBeLessThan(4);
  expect(world.navigation.groundHeight(-4,15.8,4)).toBeLessThan(1);
  world.dispose();
});

it('disposes successful partial loads when another asset fails, and late loads after cancellation',async()=>{
  const good=await fileLoader('/models/farm/tractor.glb'),mesh=good.getObjectByProperty('isMesh',true) as Mesh,spy=vi.spyOn(mesh.geometry,'dispose');
  const broken=new FarmAssets(async url=>{if(url.endsWith('tractor.glb'))return good;throw Error('offline');});
  await expect(broken.load()).rejects.toThrow('Farm model could not be loaded');expect(spy).toHaveBeenCalledOnce();
  let release!:()=>void;const gate=new Promise<void>(r=>release=r);const late=new FarmAssets(async()=>{await gate;return new Group();});const promise=late.load();late.cancel();release();await expect(promise).rejects.toThrow('cancelled');expect(late.sources.children).toHaveLength(0);
});
