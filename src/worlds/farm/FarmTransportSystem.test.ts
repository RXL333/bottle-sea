import { readFile } from 'node:fs/promises';
import { afterEach,describe,expect,it } from 'vitest';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { Vector3 } from 'three';
import { FarmWorld } from './FarmWorld';
import { GameClock } from '../../core/GameClock';
import { GameplayFoundation } from '../../gameplay/GameplayFoundation';
import { COMBINE_ID,normalizeVehicles } from '../../gameplay/vehicles/VehicleState';
import { SaveSystem,defaultSave } from '../../state/SaveSystem';
import { InteractionActions } from '../../systems/InteractionSystem';
import { FARM_OBSTACLES } from './FarmLayout';

const worlds:FarmWorld[]=[];afterEach(()=>{for(const w of worlds.splice(0))w.dispose();});
const loader=async(url:string)=>{const b=await readFile(new URL('../../../public'+url,import.meta.url));return (await new GLTFLoader().parseAsync(b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength),'')).scene;};
async function setup(saved?:ReturnType<GameplayFoundation['snapshot']>,onSave:()=>void=()=>{}){
  const world=new FarmWorld(loader);worlds.push(world);await world.load();const clock=new GameClock(),game=new GameplayFoundation(clock,saved,undefined,onSave);
  const enter=()=>world.enter({gameplay:game,gameTime:clock.simulationTime,state:{lastSimulatedGameTime:0,discoveries:[]},spawn:world.getSpawnPoint()});enter();
  const combine=world.combine!,tractor=world.vehicles[0],trailer=world.trailer!,hitches=world.hitches!;
  const rig=(x=2.1,z=-9.59,yaw=0)=>{
    tractor.stop();combine.stop();const front=trailer.frontPosition({x,z,yaw}),offset=tractor.hitchPosition('Hitch_Back',{x:0,z:0,yaw});
    game.vehicles.record({...combine.snapshot(),x:0,z:-9,yaw:0,workEnabled:false});
    game.vehicles.commitFleet({...tractor.snapshot(),x:front.x-offset.x,z:front.z-offset.z,yaw},world.implements.map(i=>i===trailer?{...i.snapshot(),x,z,yaw}:i.snapshot()),[{vehicleId:tractor.id,implementId:trailer.id,port:'Hitch_Back'}]);enter();
  };
  return {world,game,clock,combine,tractor,trailer,hitches,enter,rig};
}
const units=(slots:({quantity:number}|null)[])=>slots.reduce((n,s)=>n+(s?.quantity??0),0);
describe('real-model trailer transport',()=>{
  it('loads partially under the native auger and publishes both cargo owners atomically',async()=>{
    const observed:ReturnType<GameplayFoundation['snapshot']>[]=[];let f:Awaited<ReturnType<typeof setup>>|undefined;f=await setup(undefined,()=>{if(f)observed.push(f.game.snapshot());});f.rig();
    expect(f.hitches.isAttached(f.trailer.id)).toBe(true);expect(f.trailer.pose).toMatchObject({x:2.1,z:-9.59});expect(f.world.transport!.combineHint).toContain('向拖车');
    f.trailer.cargo.add('crop.corn',100);f.combine.grainTank.exchange([],[{itemId:'crop.wheat',quantity:60}]);observed.length=0;f.combine.occupy(true);
    expect(f.combine.unload().status).toBe('success');expect(f.trailer.cargo.usedQuantity).toBe(120);expect(f.combine.grainTank.used).toBe(40);
    expect(observed.length).toBeGreaterThan(0);for(const s of observed)expect(units(s.vehicles.vehicles.find(v=>v.id===COMBINE_ID)!.grainTank!.slots)+units(s.vehicles.implements.find(i=>i.id===f!.trailer.id)!.cargo!.slots)).toBe(160);
    const before=f.game.snapshot();expect(f.combine.unload().status).toBe('unavailable');expect(f.game.snapshot()).toEqual(before);
    f.trailer.updateVisual(0);const load=f.trailer.root.getObjectByName('TrailerCargoLoad')!;expect(load.visible).toBe(true);expect(load.children[0].scale.y).toBeCloseTo(.78);
    const actions=new InteractionActions();expect((await f.world.interaction.interact({worldId:'FARM',position:f.combine.seatPosition(),gameplay:f.game},actions,'vehicle_unload')).status).toBe('unavailable');
    f.combine.occupy(false);const position=f.trailer.loadingPoint().add(new Vector3(.9,0,0));position.y=f.trailer.root.position.y+.44;
    let opened=false;actions.register('FARM_TRAILER_STORAGE',()=>{opened=true;return {status:'success'};});expect((await f.world.interaction.interact({worldId:'FARM',position,gameplay:f.game},actions,'trailer_cargo')).status).toBe('success');expect(opened).toBe(true);
  });
  it('gates both speeds, work state, loading range and trailer barn position',async()=>{
    const f=await setup();f.rig();f.combine.grainTank.exchange([],[{itemId:'crop.wheat',quantity:30}]);f.tractor.occupy(true);f.tractor.advance(.1,{throttle:1,steer:0,brake:false});
    expect(f.combine.unload().message).toContain('移动');expect(f.combine.grainTank.used).toBe(30);f.tractor.stop();f.combine.occupy(true);f.combine.advance(.1,{throttle:1,steer:0,brake:false});expect(f.combine.unload().status).toBe('unavailable');f.combine.stop();
    f.combine.toggleHeader();f.combine.toggleMachine();expect(f.combine.unload().status).toBe('unavailable');f.combine.toggleMachine();f.combine.occupy(false);
    f.rig(5,-9.59);expect(f.combine.unload().status).toBe('unavailable');expect(f.world.transport!.unloadTrailer().status).toBe('unavailable');
    f.rig();expect(f.combine.unload().status).toBe('success');expect(f.world.transport!.unloadTrailer().status).toBe('unavailable');f.rig(20,-2.8);expect(f.trailer.pose).toMatchObject({x:20,z:-2.8});
    f.tractor.occupy(true);f.tractor.advance(.1,{throttle:-1,steer:0,brake:false});expect(f.tractor.unload().status).toBe('unavailable');f.tractor.stop();expect(f.tractor.unload().status).toBe('success');expect(f.game.barn.count('crop.wheat')).toBe(30);
  });
  it('unloads only the warehouse stack room and retains unaccepted mixed cargo',async()=>{
    const f=await setup();f.rig(20,-2.8);f.trailer.cargo.add('crop.wheat',5);f.trailer.cargo.add('crop.corn',10);f.game.barn.add('wood',23*99);f.game.barn.add('crop.wheat',98);
    expect(f.world.transport!.unloadTrailer()).toMatchObject({status:'success',changed:true});expect(f.game.barn.count('crop.wheat')).toBe(99);expect(f.trailer.cargo.count('crop.wheat')).toBe(4);expect(f.trailer.cargo.count('crop.corn')).toBe(10);
    const before=f.game.snapshot();expect(f.world.transport!.unloadTrailer().status).toBe('unavailable');expect(f.game.snapshot()).toEqual(before);f.game.barn.remove('wood',198);
    expect(f.world.transport!.unloadTrailer().status).toBe('success');expect(f.trailer.cargo.usedQuantity).toBe(0);expect(f.game.barn.count('crop.wheat')).toBe(103);expect(f.game.barn.count('crop.corn')).toBe(10);
  });
  it('prioritizes boarding a tractor parked by the barn and saves partial barn unload atomically',async()=>{
    const observed:ReturnType<GameplayFoundation['snapshot']>[]=[];let f:Awaited<ReturnType<typeof setup>>|undefined;f=await setup(undefined,()=>{if(f)observed.push(f.game.snapshot());});f.rig(20,-2.8);
    const entry=f.tractor.entryPosition();entry.y=f.tractor.root.position.y+.44;const actions=new InteractionActions().register('ENTER_VEHICLE',()=>({status:'success',message:'board'})).register('FARM_STORAGE',()=>({status:'success',message:'barn'}));
    expect((await f.world.interaction.interact({worldId:'FARM',position:entry,gameplay:f.game},actions)).message).toBe('board');
    f.trailer.cargo.add('crop.wheat',5);f.game.barn.add('wood',23*99);f.game.barn.add('crop.wheat',98);observed.length=0;f.tractor.occupy(true);
    const result=await f.world.interaction.interact({worldId:'FARM',position:f.tractor.seatPosition(),gameplay:f.game},actions,'vehicle_unload');expect(result.status).toBe('success');
    for(const s of observed)expect(units(s.vehicles.implements.find(i=>i.id==='farm.trailer')!.cargo!.slots)+s.barn.slots.filter(i=>i?.itemId==='crop.wheat').reduce((n,s)=>n+s!.quantity,0)).toBe(103);
  });
  it('saves loaded articulation, restores safely, drives forward/turn/reverse and preserves detached cargo',async()=>{
    const f=await setup();f.rig(-4,-8);f.trailer.cargo.add('crop.corn',90);f.tractor.occupy(true);const before=f.game.farm.snapshot(),start=f.tractor.pose;
    for(const input of [{throttle:1,steer:0,brake:false},{throttle:1,steer:.35,brake:false},{throttle:-1,steer:-.35,brake:false}]){
      f.tractor.stop();for(let n=0;n<150;n++){f.tractor.advance(1/120,input);const a=f.tractor.hitchPosition('Hitch_Back'),b=f.trailer.frontPosition();expect(a.distanceTo(b)).toBeLessThan(.25);}
    }
    f.tractor.stop();expect(f.tractor.pose).not.toEqual(start);expect(f.trailer.cargo.usedQuantity).toBe(90);expect(f.game.farm.snapshot()).toEqual(before);
    let raw='';const save=new SaveSystem({getItem:()=>raw||null,setItem:(_k,v)=>{raw=v;}});expect(save.save({...defaultSave(),...f.game.snapshot(),gameTime:f.clock.snapshot()})).toBe(true);expect(raw).not.toMatch(/Object3D|MeshStandardMaterial/);
    const restored=await setup(save.load());expect(restored.trailer.cargo.snapshot()).toEqual(f.trailer.cargo.snapshot());expect(restored.trailer.pose).toEqual(f.trailer.pose);expect(restored.hitches.attachments).toEqual(f.hitches.attachments);expect(restored.tractor.pose).toEqual(f.tractor.pose);
    restored.tractor.occupy(true);expect(restored.hitches.interact('farm.trailer').status).toBe('success');expect(restored.trailer.cargo.usedQuantity).toBe(90);expect(restored.trailer.root.position.y).toBeGreaterThanOrEqual(4);
    save.save({...defaultSave(),...restored.game.snapshot()});const detached=await setup(save.load());expect(detached.hitches.attachments).toEqual([]);expect(detached.trailer.pose).toEqual(restored.trailer.pose);expect(detached.trailer.cargo.usedQuantity).toBe(90);
  },20000);
  it('blocks a reversing loaded trailer before the tractor reaches the obstacle without dropping cargo',async()=>{
    const f=await setup();f.rig(-4,-8);f.trailer.cargo.add('crop.wheat',50);f.tractor.occupy(true);const obstacle={minX:-4.3,maxX:-3.7,minZ:-10,maxZ:-9.5,minY:4,maxY:6};FARM_OBSTACLES.push(obstacle);
    try{for(let i=0;i<500;i++)f.tractor.advance(1/120,{throttle:-1,steer:0,brake:false});expect(f.tractor.speed).toBe(0);expect(f.trailer.collision.z-f.trailer.collision.halfZ).toBeGreaterThanOrEqual(obstacle.maxZ);expect(f.trailer.cargo.usedQuantity).toBe(50);}finally{FARM_OBSTACLES.splice(FARM_OBSTACLES.indexOf(obstacle),1);}
  });
  it('migrates missing or corrupt cargo without touching other implement inventories',()=>{
    const pose={id:'farm.trailer',worldId:'FARM',x:0,z:-9,yaw:0};expect(normalizeVehicles({implements:[pose]}).implements[0].cargo!.slots).toEqual([null,null,null,null]);
    const cargo={capacity:999,slots:[{itemId:'crop.wheat',quantity:99},{itemId:'crop.corn',quantity:99},{itemId:'wood',quantity:99},{itemId:'unknown',quantity:5}]};
    const normalized=normalizeVehicles({implements:[{...pose,cargo},{...pose,id:'farm.plow',cargo}]}).implements;expect(units(normalized[0].cargo!.slots)).toBe(120);expect(normalized[1].cargo).toBeUndefined();
  });
});
