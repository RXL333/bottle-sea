import { readFile } from 'node:fs/promises';
import { afterEach,describe,expect,it } from 'vitest';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { Vector3 } from 'three';
import { FarmWorld } from './FarmWorld';
import { FARM_OBSTACLES } from './FarmLayout';
import { GameClock,DAY_DURATION } from '../../core/GameClock';
import { GameplayFoundation } from '../../gameplay/GameplayFoundation';
import { COMBINE_ID,TRACTOR_ID,normalizeVehicles } from '../../gameplay/vehicles/VehicleState';
import { defaultSave,SaveSystem } from '../../state/SaveSystem';
import { InteractionActions } from '../../systems/InteractionSystem';
import { hitsDynamicObstacle } from '../../world/Collision';

const worlds:FarmWorld[]=[];afterEach(()=>{for(const world of worlds.splice(0))world.dispose();});
const loader=async(url:string)=>{const b=await readFile(new URL('../../../public'+url,import.meta.url));return (await new GLTFLoader().parseAsync(b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength),'')).scene;};
async function setup(saved?:ReturnType<GameplayFoundation['snapshot']>,onSave:()=>void=()=>{}){
  const world=new FarmWorld(loader);worlds.push(world);await world.load();const clock=new GameClock(),game=new GameplayFoundation(clock,saved,undefined,onSave);
  const enter=()=>world.enter({gameplay:game,gameTime:clock.simulationTime,state:{lastSimulatedGameTime:0,discoveries:[]},spawn:world.getSpawnPoint()});enter();
  const combine=world.combine!,park=(x:number,z:number,yaw:number)=>{combine.stop();game.vehicles.record({...combine.snapshot(),x,z,yaw});combine.bindGameplay(game);};
  return {world,clock,game,combine,park,enter};
}
describe('real GLB combine driving, harvesting and save integration',()=>{
  it('restores a vehicle parked at the other machine’s old default location without a ghost collision',async()=>{
    const f=await setup();f.park(0,-9,Math.PI);f.game.vehicles.record({...f.world.vehicles[0].snapshot(),x:-25,z:0});
    const restored=await setup(f.game.snapshot());expect(restored.world.vehicles[0].pose).toMatchObject({x:-25,z:0});expect(restored.combine.pose).toEqual(f.combine.pose);
  });
  it('uses native wheels/header, drives and rear-steers, blocks obstacles and offers safe dismount clearance',async()=>{
    const f=await setup();f.park(0,-9,Math.PI);const start=f.combine.pose,parts=new Map<string,import('three').Object3D>();f.combine.root.traverse(o=>parts.set(o.userData.part_id,o));
    expect(parts.has('header')).toBe(true);expect(parts.get('header_reel')!.parent).toBe(parts.get('header'));expect(f.combine.root.position.y).toBeGreaterThanOrEqual(4);expect(f.combine.root.position.y).toBeLessThan(4.1);
    expect(f.combine.findExit()).toBeDefined();expect(hitsDynamicObstacle(...[f.combine.findExit()!.position[0],f.combine.findExit()!.position[2],f.combine.findExit()!.position[1]] as [number,number,number],[f.combine.collision],.18)).toBe(false);
    f.combine.occupy(true);for(let i=0;i<120;i++)f.combine.advance(1/120,{throttle:1,steer:.3,brake:false});
    expect(f.combine.pose).not.toEqual(start);expect(parts.get('steer_wheel_-1')!.rotation.y).toBeLessThan(0);expect(parts.get('drive_wheel_-1')!.getObjectByName('drive_wheel_-1_Roll')!.rotation.x).not.toBe(0);
    f.park(0,-9,Math.PI);const wall={minX:-3,maxX:3,minZ:-15,maxZ:-14,minY:4,maxY:7};FARM_OBSTACLES.push(wall);
    try{for(let i=0;i<600;i++)f.combine.advance(1/120,{throttle:1,steer:0,brake:false});expect(f.combine.speed).toBe(0);expect(f.combine.collision.z-f.combine.collision.halfZ).toBeGreaterThanOrEqual(wall.maxZ);}finally{FARM_OBSTACLES.splice(FARM_OBSTACLES.indexOf(wall),1);}
    f.combine.stop();for(let i=0;i<120;i++)f.combine.advance(1/120,{throttle:-1,steer:0,brake:false});expect(f.combine.speed).toBeLessThan(0);
    const point=f.combine.dischargePosition();expect([point.x,point.y,point.z].every(Number.isFinite)).toBe(true);expect(point.y).toBeGreaterThan(4);
    const eye=f.combine.seatPosition().add(new Vector3(0,2,0)),end=eye.clone().add(new Vector3(0,-5,0));expect(f.combine.clipCamera(eye,end).y).toBeGreaterThanOrEqual(4.3);
  });
  it('uses E/J/L/U interactions, gates work by header/switch and commits grain, land and fleet together',async()=>{
    const observed:ReturnType<GameplayFoundation['snapshot']>[]=[];let f:Awaited<ReturnType<typeof setup>>|undefined;
    f=await setup(undefined,()=>{if(f)observed.push(f.game.snapshot());});f.park(0,-9,Math.PI);const now=f.clock.simulationTime,crop=f.game.crops.registry.get('wheat')!;
    f.clock.simulationTime=now-crop.growthGameMinutes*DAY_DURATION/1440;const refs=Array.from({length:8},(_,n)=>({fieldId:'field-central',column:n%2+5,row:17-Math.floor(n/2)}));f.game.farm.till(refs);f.game.inventory.add(crop.seedItemId,8);f.game.farm.seed(refs,crop.id);f.clock.simulationTime=now;
    const actions=new InteractionActions().register('ENTER_VEHICLE',()=>({status:'success',message:'board'})),context=()=>({worldId:'FARM' as const,position:f!.combine.seatPosition(),gameplay:f!.game});
    expect((await f.world.interaction.interact(context(),actions,COMBINE_ID)).message).toBe('board');f.combine.occupy(true);expect(f.combine.toggleMachine().status).toBe('unavailable');
    expect((await f.world.interaction.interact(context(),actions,'vehicle_work')).status).toBe('success');for(let i=0;i<120;i++)f.combine.advance(1/120,{throttle:1,steer:0,brake:false});expect(f.combine.grainTank.used).toBe(0);
    f.park(0,-9,Math.PI);expect((await f.world.interaction.interact(context(),actions,'vehicle_machine')).status).toBe('success');expect((await f.world.interaction.interact(context(),actions,'vehicle_hitch')).status).toBe('no-target');observed.length=0;
    for(let i=0;i<340;i++)f.combine.advance(1/120,{throttle:1,steer:0,brake:false});f.combine.stop();expect(f.combine.grainTank.used).toBe(24);expect(f.game.inventory.count('crop.wheat')).toBe(0);
    for(const snapshot of observed){const grain=snapshot.vehicles.vehicles.find(v=>v.id===COMBINE_ID)!.grainTank!.slots.reduce((n,s)=>n+(s?.quantity??0),0),harvested=snapshot.farm.fields.flatMap(field=>field.cells).filter(c=>c.landState==='HARVESTED').length;expect(grain).toBe(harvested*3);}
    expect(f.combine.unload().status).toBe('unavailable');const saved=f.game.snapshot();f.game.vehicles.record({...f.world.vehicles[0].snapshot(),x:-12,z:-8});expect(f.game.vehicles.get(COMBINE_ID)!.grainTank).toEqual(saved.vehicles.vehicles.find(v=>v.id===COMBINE_ID)!.grainTank);
    f.park(20,-2.8,0);expect(f.combine.unload().status).toBe('unavailable');f.combine.toggleMachine();expect((await f.world.interaction.interact(context(),actions,'vehicle_unload')).status).toBe('success');expect(f.combine.grainTank.used).toBe(0);expect(f.game.barn.count('crop.wheat')).toBe(24);expect(f.combine.unload().status).toBe('unavailable');
    f.combine.occupy(false);expect(f.combine.workEnabled).toBe(false);const data={...defaultSave(),...f.game.snapshot(),gameTime:f.clock.snapshot()};let raw='';const save=new SaveSystem({getItem:()=>raw||null,setItem:(_key,value)=>{raw=value;}});save.save(data);const loaded=save.load();expect(loaded.barn).toEqual(data.barn);expect(loaded.vehicles).toEqual(data.vehicles);expect(loaded.farm).toEqual(data.farm);expect(raw).not.toMatch(/Object3D|MeshStandardMaterial/);
    const restored=await setup(loaded);expect(restored.combine.pose).toEqual(f.combine.pose);expect(restored.combine.grainTank.used).toBe(0);expect(restored.combine.headerState).toBe('LOWERED');expect(restored.game.barn.count('crop.wheat')).toBe(24);
  },20000);
  it('restores full tank and stopped work alongside tractor attachments and old saves safely',async()=>{
    const f=await setup();f.park(0,-9,Math.PI);f.combine.grainTank.exchange([],[{itemId:'crop.corn',quantity:60}]);f.combine.occupy(true);f.combine.toggleHeader();expect(f.combine.toggleMachine().status).toBe('unavailable');const snapshot=f.game.snapshot();
    const restored=await setup(snapshot);expect(restored.combine.grainTank.used).toBe(60);expect(restored.combine.workEnabled).toBe(false);expect(restored.combine.pose).toEqual(f.combine.pose);expect(restored.game.vehicles.get(TRACTOR_ID)).toEqual(f.game.vehicles.get(TRACTOR_ID));
    restored.game.vehicles.commitFleet(restored.world.vehicles[0].snapshot(),restored.world.implements.map(i=>i.snapshot()),[]);expect(restored.game.vehicles.get(COMBINE_ID)!.grainTank).toEqual(restored.combine.grainTank.snapshot());
    restored.park(20,-2.8,0);restored.combine.occupy(true);restored.game.barn.add('wood',restored.game.barn.capacity*restored.game.items.get('wood')!.maxStack);const before=restored.game.snapshot();expect(restored.combine.unload().status).toBe('unavailable');expect(restored.game.snapshot()).toEqual(before);
    const legacy=defaultSave();delete (legacy as Partial<typeof legacy>).barn;const defaults=new GameplayFoundation(new GameClock(),legacy);expect(defaults.barn.occupiedSlots).toBe(0);
    expect(normalizeVehicles({vehicles:[{id:COMBINE_ID,worldId:'FARM',x:0,z:-9,yaw:0,headerState:'RAISED',workEnabled:true,grainTank:{slots:[{itemId:'crop.potato',quantity:2}]}}]}).vehicles[0]).toMatchObject({workEnabled:false,grainTank:{slots:[null,null]}});
  });
});
