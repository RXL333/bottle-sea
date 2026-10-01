import { readFile } from 'node:fs/promises';
import { afterEach,expect,it } from 'vitest';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { BoxGeometry,Group,Mesh,MeshBasicMaterial,Vector3 } from 'three';
import { FarmVehicleNavigation } from './FarmVehicleNavigation';
import { GameClock } from '../../core/GameClock';
import { GameplayFoundation } from '../../gameplay/GameplayFoundation';
import { FarmWorld } from './FarmWorld';
import { FARM_DELIVERY_BAYS } from './FarmDelivery';
import { PURCHASED_COMBINE_ID } from '../../gameplay/vehicles/VehicleIds';
import { CombineVehicle } from '../../systems/vehicles/CombineVehicle';
import { InteractionActions } from '../../systems/InteractionSystem';
import { FARM_TRADE_POINT } from '../trade/MerchantShip';
import { FARM_OBSTACLES } from './FarmLayout';
import { SaveSystem,defaultSave } from '../../state/SaveSystem';
const worlds:FarmWorld[]=[];afterEach(()=>{for(const world of worlds.splice(0))world.dispose();});
const loader=async(url:string)=>{const data=await readFile(new URL('../../../public'+url,import.meta.url));return (await new GLTFLoader().parseAsync(data.buffer.slice(data.byteOffset,data.byteOffset+data.byteLength),'')).scene;};
async function setup(saved?:ReturnType<GameplayFoundation['snapshot']>){const world=new FarmWorld(loader);worlds.push(world);await world.load();const clock=new GameClock(),game=new GameplayFoundation(clock,saved);world.enter({gameplay:game,gameTime:clock.simulationTime,state:{lastSimulatedGameTime:0,discoveries:[]},spawn:world.getSpawnPoint()});return {world,clock,game};}
it('delivers one real independently driveable GLB at a clear bay, preserves originals, restores it and applies grain upgrades immediately',async()=>{
  const f=await setup();f.game.inventory.add('fish.tuna',40);f.game.economy.trade('sell','fish.tuna',40,1);const original=f.world.vehicles.map(v=>v.snapshot());expect(f.world.tradeAccess.delivery!.available()).toBe(true);
  expect(f.game.economy.trade('buy','machine.combine',1,2,f.world.tradeAccess).ok).toBe(true);expect(f.world.vehicles).toHaveLength(3);const purchased=f.world.vehicles.find(v=>v.id===PURCHASED_COMBINE_ID)! as CombineVehicle;
  expect(FARM_DELIVERY_BAYS.some(p=>p.x===purchased.pose.x&&p.z===purchased.pose.z)).toBe(true);expect(f.game.farm.cellAt(purchased.pose.x,purchased.pose.z)).toBeNull();expect(purchased.findExit()).toBeDefined();expect(f.world.vehicles.slice(0,2).map(v=>v.snapshot())).toEqual(original);
  const entry=purchased.entryPosition();entry.y=purchased.root.position.y+.44;expect(f.world.interaction.getPrompt({worldId:'FARM',gameplay:f.game,position:entry},new InteractionActions().register('ENTER_VEHICLE',()=>({status:'success'})))?.text).toContain('上车');
  expect(f.game.economy.trade('buy','upgrade.grain.1',1,3,f.world.tradeAccess).ok).toBe(true);expect(purchased.grainTank.capacity).toBe(90);expect(f.world.combine!.grainTank.capacity).toBe(90);
  purchased.grainTank.exchange([],[{itemId:'crop.wheat',quantity:85}]);const saved=f.game.snapshot();const restored=await setup(saved),again=restored.world.vehicles.find(v=>v.id===PURCHASED_COMBINE_ID)! as CombineVehicle;expect(again.pose).toEqual(purchased.pose);expect(again.grainTank.used).toBe(85);expect(again.grainTank.capacity).toBe(90);expect(restored.world.vehicles).toHaveLength(3);
  // Safe open test location uses the same persisted-pose binding as a reload.
  restored.game.vehicles.record({...again.snapshot(),x:0,z:-9,yaw:Math.PI});again.bindGameplay(restored.game);const before=again.pose;again.occupy(true);for(let i=0;i<120;i++)again.advance(1/120,{throttle:1,steer:.2,brake:false});expect(again.pose).not.toEqual(before);expect(again.speed).toBeGreaterThan(0);again.stop();again.occupy(false);
  expect(restored.game.economy.trade('buy','machine.combine',1,restored.game.economy.nextRequest,restored.world.tradeAccess)).toEqual({ok:false,reason:'already-owned'});
  const models=new Group(),own=new Group(),nav=new FarmVehicleNavigation(f.world.navigation,()=>[],models,own),from=new Vector3(0,10,-4),to=new Vector3(0,10,4),obstacle=new Mesh(new BoxGeometry(1,1,1),new MeshBasicMaterial());obstacle.position.y=10;
  expect(nav.clipCamera(from,to).distanceTo(to)).toBe(0);models.add(obstacle);models.updateMatrixWorld(true);nav.refreshCameraObstacles();expect(nav.clipCamera(from,to).z).toBeLessThan(-.5);
  models.remove(obstacle);nav.refreshCameraObstacles();expect(nav.clipCamera(from,to).distanceTo(to)).toBe(0);obstacle.geometry.dispose();obstacle.material.dispose();
});
it('rejects blocked delivery and keeps merchant and travel E entrances separate',async()=>{
  const f=await setup();f.game.inventory.add('fish.tuna',10);f.game.economy.trade('sell','fish.tuna',10,1);const blocks=FARM_DELIVERY_BAYS.map(p=>({minX:p.x-3,maxX:p.x+3,minZ:p.z-3,maxZ:p.z+3,minY:4,maxY:8}));FARM_OBSTACLES.push(...blocks);
  try{const before=f.game.snapshot();expect(f.game.economy.trade('buy','machine.combine',1,2,f.world.tradeAccess)).toEqual({ok:false,reason:'delivery-blocked'});expect(f.game.snapshot()).toEqual(before);expect(f.world.vehicles).toHaveLength(2);}finally{for(const b of blocks)FARM_OBSTACLES.splice(FARM_OBSTACLES.indexOf(b),1);}
  const actions=new InteractionActions().register('TRADE',()=>({status:'success'})).register('TRAVEL',()=>({status:'success'}));const context={worldId:'FARM' as const,gameplay:f.game,position:FARM_TRADE_POINT};expect(f.world.interaction.getPrompt(context,actions)?.text).toContain('商船交易');expect((await f.world.interaction.interact(context,actions)).target?.action).toBe('TRADE');expect((await f.world.interaction.interact({...context,position:{x:-3.25,y:4.44,z:14.5}},actions)).target?.action).toBe('TRAVEL');
});
it('a purchased combine harvests bought seeds and unloads through the existing barn pipeline with save recovery',async()=>{
  const f=await setup();f.game.inventory.add('fish.tuna',10);f.game.economy.trade('sell','fish.tuna',10,1);f.game.economy.trade('buy','machine.combine',1,2,f.world.tradeAccess);f.game.economy.trade('buy','buy.seed.wheat',12,3);
  const refs=Array.from({length:8},(_,i)=>({fieldId:'field-central',row:16-Math.floor(i/2),column:5+i%2}));f.game.farm.till(refs);f.game.farm.seed(refs,'wheat');f.clock.advanceGameMinutes(f.game.crops.registry.get('wheat')!.growthGameMinutes);
  const v=f.world.vehicles.find(v=>v.id===PURCHASED_COMBINE_ID)! as CombineVehicle;f.game.vehicles.record({...v.snapshot(),x:0,z:-9,yaw:Math.PI});v.bindGameplay(f.game);v.occupy(true);v.toggleHeader();v.toggleMachine();for(let i=0;i<360;i++)v.advance(1/120,{throttle:1,steer:0,brake:false});expect(v.grainTank.used).toBeGreaterThan(0);
  v.stop();v.toggleMachine();f.game.vehicles.record({...v.snapshot(),x:20,z:-2.8,yaw:0});v.bindGameplay(f.game);expect(v.unload().status).toBe('success');expect(v.grainTank.used).toBe(0);expect(f.game.barn.count('crop.wheat')).toBeGreaterThan(0);
  let raw='';const save=new SaveSystem({getItem:()=>raw||null,setItem:(_key,value)=>{raw=value;}});expect(save.save({...defaultSave(),...f.game.snapshot(),gameTime:f.clock.snapshot()})).toBe(true);const loaded=save.load();expect(loaded.vehicles.vehicles.find(p=>p.id===PURCHASED_COMBINE_ID)?.grainTank?.slots.every(s=>s===null)).toBe(true);expect(loaded.barn).toEqual(f.game.barn.snapshot());expect(loaded.economy).toEqual(f.game.economy.snapshot());
});
