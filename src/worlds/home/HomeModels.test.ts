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
import { terrainCellAt } from '../../world/island/TerrainData';
import { NPCS } from '../../gameplay/npc/NpcRegistry';
import { HOME_MERCHANT_DECK_TOP } from '../trade/MerchantRoute';

const load=async(url:string)=>{const bytes=await readFile(new URL('../../../public'+url,import.meta.url));const model=(await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'' )).scene;separateModelSurfaces(model);return model;};
it('keeps the fishing deck above recessed terrain and the approach free of NPCs',async()=>{
  const world=new HomeWorld(load);await world.load();
  for(const deck of [{minX:-3.525,maxX:-2.775,minZ:.325,maxZ:.975,bottom:3.55}]){
    const cells=TERRAIN_CELLS.filter(c=>c.maxX>deck.minX&&c.minX<deck.maxX&&c.maxZ>deck.minZ&&c.minZ<deck.maxZ);expect(cells.length).toBeGreaterThan(0);
    for(const cell of cells)expect(cell.top).toBeLessThan(deck.bottom);
  }
  for(let x=-2.4;x>=-3.16;x-=.025){const y=world.navigation.groundHeight(x,.65,3.92)+.44;expect(world.navigation.hitsObstacle(x,.65,y)).toBe(false);expect(hitsDynamicObstacle(x,.65,y,world.navigation.dynamicObstacles())).toBe(false);}
  world.interaction.update({x:-3.15,y:4.12,z:.65});expect(world.interaction.nearest?.id).toBe('home_fishing');world.dispose();
});
it('hides merchant support tops beneath boards and keeps the grass approach intact',async()=>{
  const world=new HomeWorld(load);await world.load();
  try{
    const mesh=world.root.getObjectByName('MerchantBerth')!.children[0] as InstancedMesh,matrix=new Matrix4();let supports=0,boards=0;
    for(let i=0;i<mesh.count;i++){
      mesh.getMatrixAt(i,matrix);const y=matrix.elements[13],height=matrix.elements[5];
      if(height>.3){supports++;expect(y+height/2).toBeLessThan(HOME_MERCHANT_DECK_TOP-.05);expect(y+height/2).toBeGreaterThan(HOME_MERCHANT_DECK_TOP-.12);}
      else {boards++;expect(y+height/2).toBeCloseTo(HOME_MERCHANT_DECK_TOP);}
    }
    expect(supports).toBe(4);expect(boards).toBe(8);
    for(let z=1.25;z<=1.66;z+=.035){
      const grass=terrainCellAt(-1.15,z);expect(grass?.top).toBeGreaterThanOrEqual(3.73);
      if(z<1.4)expect(grass?.top).toBeCloseTo(3.92);
      const y=world.navigation.groundHeight(-1.15,z,3.92)+.44;expect(world.navigation.hitsObstacle(-1.15,z,y)).toBe(false);
    }
    for(let z=1.3;z<=1.9;z+=.05)expect(world.navigation.groundHeight(-1.6,z,3.92)).toBeCloseTo(HOME_MERCHANT_DECK_TOP);
    const fisherman=NPCS.get('fisherman')!;expect(terrainCellAt(fisherman.position[0],fisherman.position[2])?.top).toBeCloseTo(fisherman.position[1]);
    expect(world.navigation.hitsObstacle(fisherman.position[0],fisherman.position[2],fisherman.position[1]+.44)).toBe(false);
  }finally{world.dispose();}
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
  for(const z of [1.0,1.2,1.35])expect(world.navigation.hitsObstacle(-1.564,z,world.navigation.groundHeight(-1.564,z,3.92)+.44)).toBe(false);
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
it('walks from the restored grass onto the merchant berth without falling or hitting its raised edge',async()=>{
  const events=new EventTarget();vi.stubGlobal('window',events);vi.stubGlobal('HTMLButtonElement',class extends EventTarget{});
  const world=new HomeWorld(load);await world.load();
  try{
    const camera=new PerspectiveCamera(),controls=new ExploreController(camera,new EventTarget() as HTMLElement,undefined,world.navigation);
    controls.enter(false,{id:'merchant-approach',position:[-1.34,4.36,1.05],lookAt:[-1.34,4.36,2]});
    const event=new Event('keydown');Object.defineProperties(event,{code:{value:'KeyW'},repeat:{value:false}});events.dispatchEvent(event);
    for(let i=0;i<27;i++)controls.update(1/60,3.3);
    expect(camera.position.z).toBeGreaterThan(1.70);expect(camera.position.y).toBeCloseTo(HOME_MERCHANT_DECK_TOP+.44);
  }finally{world.dispose();vi.unstubAllGlobals();}
});
