import { readFile } from 'node:fs/promises';
import { expect,it,vi } from 'vitest';
import { Box3,Mesh,InstancedMesh,Matrix4,PerspectiveCamera,Vector3 } from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { HomeWorld } from './HomeWorld';
import { HOME_FILES,HomeModels } from './HomeModels';
import { hitsDynamicObstacle } from '../../world/Collision';
import { ExploreController } from '../../controls/ExploreController';
import { obbIntersectsAabb } from '../../world/ship/ShipPath';
import { TERRAIN_CELLS } from '../../world/island/TerrainData';

const load=async(url:string)=>{const bytes=await readFile(new URL('../../../public'+url,import.meta.url));return (await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'' )).scene;};
it('loads every Home asset once, keeps entry and berth clear, and retains discovery targets',async()=>{
  const loader=vi.fn(load),world=new HomeWorld(loader);await Promise.all([world.load(),world.load()]);
  expect(loader).toHaveBeenCalledTimes(Object.keys(HOME_FILES).length);
  expect(world.root.getObjectByName('BlenderHomeModels')!.userData.ready).toBe(true);
  for(const id of ['house','dock','fishing','chest','anchor','ruins','bed','stove','storage'])expect(world.root.getObjectByName('Home_'+id)).toBeDefined();
  expect(world.navigation.hitsObstacle(-1.564,.75,4.446)).toBe(false);
  expect(world.navigation.hitsObstacle(-1.564,.4,4.446)).toBe(true);
  expect(world.navigation.groundHeight(-1.564,0,3.97)).toBeCloseTo(3.97);
  expect(world.navigation.hitsObstacle(-2.18,0,4.44)).toBe(true);
  // Front yard is walkable; the berth must be surrounded by actual water tiles.
  for(const z of [1.0,1.2,1.35])expect(world.navigation.hitsObstacle(-1.564,z,4.36)).toBe(false);
  const ocean=world.root.getObjectByName('Ocean')!,tiles=ocean.children.find(o=>o instanceof InstancedMesh) as InstancedMesh;
  const matrix=new Matrix4();let berthWater=false;
  for(let i=0;i<tiles.count;i++){tiles.getMatrixAt(i,matrix);if(Math.abs(matrix.elements[12]-.65)<.2&&matrix.elements[14]>2.6)berthWater=true;}
  expect(berthWater).toBe(true);
  const spawn=world.getSpawnPoint();
  for(let t=0;t<30;t+=.5){world.prepare({time:t,storm:1,delta:1/60,dayTime:.5,night:0,flash:0,gameTime:0});expect(hitsDynamicObstacle(spawn.position[0],spawn.position[2],spawn.position[1],world.navigation.dynamicObstacles())).toBe(false);}
  for(let t=0;t<200;t+=.5){world.prepare({time:t,storm:1,delta:1/60,dayTime:.5,night:0,flash:0,gameTime:0});const ship=world.navigation.dynamicObstacles()[0];expect(TERRAIN_CELLS.some(c=>obbIntersectsAabb(ship.x,ship.z,ship.halfX,ship.halfZ,ship.yaw,c.minX,c.maxX,c.minZ,c.maxZ,.02))).toBe(false);}
  expect(world.navigation.hitsObstacle(.65,1.5,4.12)).toBe(false);
  expect(world.navigation.resolveVertical(.65,1.24,3.2,4)).toBeLessThan(3.68);
  const house=new Box3().setFromObject(world.root.getObjectByName('Home_house')!);
  expect(house.getSize(new Vector3()).y).toBeLessThan(2);
  for(const id of ['chest','anchor','ruins','lighthouse']){world.interaction.restore([id]);expect(world.leave({gameTime:1}).discoveries).toContain(id);world.triggerDiscovery(id);}
  const geometry=(world.root.getObjectByName('Home_bed')!.getObjectByProperty('type','Mesh') as Mesh).geometry,disposed=vi.spyOn(geometry,'dispose');world.dispose();expect(disposed).toHaveBeenCalledOnce();
});
it('stops at the closed cottage door using the actual player controller',async()=>{
  const events=new EventTarget();vi.stubGlobal('window',events);vi.stubGlobal('HTMLButtonElement',class extends EventTarget{});
  const world=new HomeWorld(load);await world.load();
  try{
    const camera=new PerspectiveCamera(),controls=new ExploreController(camera,new EventTarget() as HTMLElement,undefined,world.navigation);
    controls.enter(false,{id:'door',position:[-1.564,4.446,.75],lookAt:[-1.564,4.446,-1]});
    const event=new Event('keydown');Object.defineProperties(event,{code:{value:'KeyW'},repeat:{value:false}});events.dispatchEvent(event);
    for(let i=0;i<100;i++)controls.update(1/60,3.3);
    expect(camera.position.z).toBeGreaterThan(.58);expect(camera.position.z).toBeLessThan(.75);
  }finally{world.dispose();vi.unstubAllGlobals();}
});
it('cleans partially loaded Home resources when a model fails or the load is cancelled',async()=>{
  let count=0;const released=new Set<object>(),resources=new Set<object>();
  const models=new HomeModels(async url=>{if(++count===2)throw new Error('missing');const model=await load(url);model.traverse(o=>{if(o instanceof Mesh){resources.add(o.geometry);o.geometry.addEventListener('dispose',()=>released.add(o.geometry));}});return model;});
  await expect(models.load()).rejects.toThrow('Home models');expect(models.children[0]).toBeUndefined();expect(released.size).toBe(resources.size);
  const cancelled=new HomeModels(load);const pending=cancelled.load();cancelled.cancel();await expect(pending).rejects.toThrow('Home models');expect(cancelled.children[0]).toBeUndefined();
});
