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
import { separateModelSurfaces } from '../../utils/modelSurfaces';

const load=async(url:string)=>{const bytes=await readFile(new URL('../../../public'+url,import.meta.url));const model=(await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'' )).scene;separateModelSurfaces(model);return model;};
it('keeps pier tops above every touching terrain tile and the fishing approach free of NPCs',async()=>{
  const world=new HomeWorld(load);await world.load();
  for(const deck of [{minX:-1.96,maxX:-1.24,minZ:1.25,maxZ:2.05,bottom:3.80},{minX:-3.525,maxX:-2.775,minZ:.325,maxZ:.975,bottom:3.55}]){
    const cells=TERRAIN_CELLS.filter(c=>c.maxX>deck.minX&&c.minX<deck.maxX&&c.maxZ>deck.minZ&&c.minZ<deck.maxZ);expect(cells.length).toBeGreaterThan(0);
    for(const cell of cells)expect(cell.top).toBeLessThan(deck.bottom);
  }
  for(let x=-2.4;x>=-3.16;x-=.025){const y=world.navigation.groundHeight(x,.65,3.92)+.44;expect(world.navigation.hitsObstacle(x,.65,y)).toBe(false);expect(hitsDynamicObstacle(x,.65,y,world.navigation.dynamicObstacles())).toBe(false);}
  world.interaction.update({x:-3.15,y:4.12,z:.65});expect(world.interaction.nearest?.id).toBe('home_fishing');world.dispose();
});
it('loads every Home asset once, keeps entry and berth clear, and retains discovery targets',async()=>{
  const loader=vi.fn(load),world=new HomeWorld(loader);await Promise.all([world.load(),world.load()]);
  expect(loader).toHaveBeenCalledTimes(Object.keys(HOME_FILES).length+3);
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
  // The former tiny merchant mast concealed a broad collider in the front-right yard.
  expect(world.root.getObjectByName('MerchantShip')).toBeUndefined();
  for(const z of [.75,1,1.25,1.5]){const x=-.38,y=world.navigation.groundHeight(x,z,3.92)+.44;expect(world.navigation.hitsObstacle(x,z,y)).toBe(false);expect(hitsDynamicObstacle(x,z,y,world.navigation.dynamicObstacles())).toBe(false);}
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
it('walks through the former merchant collider beside the cottage with the actual controller',async()=>{
  const events=new EventTarget();vi.stubGlobal('window',events);vi.stubGlobal('HTMLButtonElement',class extends EventTarget{});
  const world=new HomeWorld(load);await world.load();
  try{
    const camera=new PerspectiveCamera(),controls=new ExploreController(camera,new EventTarget() as HTMLElement,undefined,world.navigation);
    controls.enter(false,{id:'right-passage',position:[-.38,4.36,1.6],lookAt:[-.38,4.36,.5]});
    const event=new Event('keydown');Object.defineProperties(event,{code:{value:'KeyW'},repeat:{value:false}});events.dispatchEvent(event);
    for(let i=0;i<100;i++)controls.update(1/60,3.3);
    expect(camera.position.z).toBeLessThan(.7);expect(camera.position.x).toBeCloseTo(-.38);
  }finally{world.dispose();vi.unstubAllGlobals();}
});
