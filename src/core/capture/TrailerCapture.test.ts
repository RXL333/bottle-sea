import { readFile } from 'node:fs/promises';
import { afterEach,expect,it,vi } from 'vitest';
import { Group,PerspectiveCamera } from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { CameraPath,cameraPose,lookPose,orbitPath,validCapturePath } from './CameraPath';
import { TrailerFreeCamera } from './TrailerFreeCamera';
import { sessionStorageForTrailer,trailerEnabled } from './TrailerIsolation';
import { captureFarm,TrailerScene } from './TrailerScene';
import { TRAILER_SHOTS,trailerShot } from './TrailerShots';
import { SaveSystem,SAVE_KEY,defaultSave } from '../../state/SaveSystem';
import { DAY_DURATION,GameClock } from '../GameClock';
import { GameplayFoundation } from '../../gameplay/GameplayFoundation';
import { FarmWorld } from '../../worlds/farm/FarmWorld';
import { LivestockPresentation } from '../../worlds/farm/LivestockPresentation';
import { LIVESTOCK_PENS } from '../../gameplay/livestock/LivestockDefinition';
import type { Game } from '../Game';

afterEach(()=>vi.unstubAllGlobals());
it('enables only the explicit DEV trailer switch, regardless of persist',()=>{
  expect(trailerEnabled(true,new URLSearchParams('trailer=1&persist=1'))).toBe(true);
  expect(trailerEnabled(false,new URLSearchParams('trailer=1'))).toBe(false);
  expect(trailerEnabled(true,new URLSearchParams('trailer=0'))).toBe(false);
});
it('never opens or alters normal storage through capture loads, mutations, saves, or exit-style flushes',()=>{
  const original=defaultSave();original.economy.coins=327;original.inventory.slots[0]={itemId:'seed.wheat',quantity:17};
  const bytes=JSON.stringify(original),disk=new Map([[SAVE_KEY,bytes]]),read=vi.fn((k:string)=>disk.get(k)??null),write=vi.fn((k:string,v:string)=>disk.set(k,v)),provider=vi.fn(()=>({getItem:read,setItem:write}));
  const store=sessionStorageForTrailer(true,provider),save=new SaveSystem(store),copy=save.load();copy.economy.coins=9999;copy.gameTime.simulationTime=DAY_DURATION*100;copy.inventory.slots[0]={itemId:'seed.wheat',quantity:99};save.save(copy);save.flush(()=>copy);
  expect(provider).not.toHaveBeenCalled();expect(read).not.toHaveBeenCalled();expect(write).not.toHaveBeenCalled();expect(disk.get(SAVE_KEY)).toBe(bytes);
  const restored=new SaveSystem(sessionStorageForTrailer(false,provider)).load();expect(restored.economy.coins).toBe(327);expect(restored.inventory.slots[0]).toEqual(original.inventory.slots[0]);
});
it('interpolates endpoints and quaternion rotations without a long Euler turn and resets exactly',()=>{
  const camera=new PerspectiveCamera(),path=new CameraPath(camera),a=lookPose([0,5,8],[0,5,0]),b=lookPose([8,6,0],[0,5,0]);
  path.configure({duration:8,poses:[a,b]});expect(cameraPose(camera)).toEqual(a);path.play();path.update(4);expect(camera.position.toArray()).toEqual([4,5.5,4]);expect(camera.quaternion.length()).toBeCloseTo(1);
  path.update(4);expect(camera.position.toArray()).toEqual(b.position);expect(path.playing).toBe(false);expect(path.progress).toBe(1);path.reset();expect(cameraPose(camera)).toEqual(a);expect(path.elapsed).toBe(0);
  expect(validCapturePath({duration:0,poses:[a,b]})).toBe(false);expect(validCapturePath({duration:8,poses:[a]})).toBe(false);
});
it('keeps every preset valid and the four-season camera completely identical',()=>{
  expect(new Set(TRAILER_SHOTS.map(s=>s.id)).size).toBe(10);for(const shot of TRAILER_SHOTS)expect(validCapturePath(shot.path),shot.id).toBe(true);
  const shot=trailerShot('four-seasons'),camera=new PerspectiveCamera(),path=new CameraPath(camera);path.configure(shot.path);const pose=cameraPose(camera);for(const t of [0,.25,.5,.75,1]){path.sample(t);expect(cameraPose(camera)).toEqual(pose);}
});
it('builds a reusable orbit that faces the center without changing radius or height',()=>{
  const orbit=orbitPath(lookPose([4,7,8],[0,5,0]),[0,5,0],120,12),camera=new PerspectiveCamera();expect(validCapturePath(orbit)).toBe(true);
  for(const pose of orbit.poses){expect(pose.position[1]).toBe(7);expect(Math.hypot(pose.position[0],pose.position[2])).toBeCloseTo(Math.hypot(4,8));camera.position.fromArray(pose.position);camera.quaternion.fromArray(pose.rotation);expect(camera.getWorldDirection(camera.position.clone()).dot(camera.position.clone().set(0,5,0).sub(camera.position).normalize())).toBeCloseTo(1);}
});
function event(type:string,data:Record<string,unknown>){const e=new Event(type,{cancelable:true});for(const [key,value] of Object.entries(data))Object.defineProperty(e,key,{value});return e;}
function freeCamera(){const win=new EventTarget(),doc=Object.assign(new EventTarget(),{hidden:false});vi.stubGlobal('window',win);vi.stubGlobal('document',doc);const canvas=Object.assign(new EventTarget(),{focus(){},setPointerCapture(){},releasePointerCapture(){},hasPointerCapture:()=>false}),camera=new PerspectiveCamera(),free=new TrailerFreeCamera(camera,canvas as unknown as HTMLElement);return {win,doc,canvas,camera,free};}
it('accelerates and brakes free camera smoothly, ignores form input, and clears held keys on blur',()=>{
  const s=freeCamera();s.win.dispatchEvent(event('keydown',{code:'KeyW'}));s.free.update(.016);const start=s.camera.position.z;s.free.update(.016);expect(s.camera.position.z-start).toBeLessThan(start);
  for(let i=0;i<60;i++)s.free.update(1/60);s.win.dispatchEvent(event('keyup',{code:'KeyW'}));const p=s.camera.position.clone();s.free.update(1/60);expect(s.camera.position.distanceTo(p)).toBeGreaterThan(0);expect(s.camera.position.distanceTo(p)).toBeLessThan(.04);
  s.win.dispatchEvent(new Event('blur'));const stopped=s.camera.position.clone();s.free.update(.1);expect(s.camera.position).toEqual(stopped);s.free.dispose();
  const form=freeCamera();form.win.dispatchEvent(event('keydown',{code:'KeyW',target:{tagName:'INPUT'}}));form.free.update(.1);expect(form.camera.position.length()).toBe(0);form.free.dispose();
});
it('prepares registered crop stages without mutating the source or consuming real inventory',()=>{
  const clock=new GameClock(),game=new GameplayFoundation(clock),before=game.farm.snapshot(),inventory=game.inventory.snapshot(),prepared=captureFarm(before,game.crops.registry,clock.simulationTime);
  expect(game.farm.snapshot()).toEqual(before);expect(game.inventory.snapshot()).toEqual(inventory);game.farm.restore(prepared);
  for(const field of game.farm.definitions){const view=game.farm.getField(field.id)!;expect(view.stateCounts.MATURE).toBe(view.cells.length);expect(view.cells.every(c=>game.crops.registry.has(c.crop!.cropId))).toBe(true);}
});
it('prepares a camera-visible tractor lane without awarding crops or clearing other fields',()=>{
  const clock=new GameClock(),game=new GameplayFoundation(clock),before=game.farm.snapshot(),inventory=game.inventory.snapshot(),prepared=captureFarm(before,game.crops.registry,clock.simulationTime,'mature',{kind:'bounds',minX:-2,maxX:6,minZ:-28,maxZ:-10});
  const central=prepared.fields.find(f=>f.id==='field-central')!;expect(central.cells.some(c=>c.landState==='HARVESTED'&&c.crop===null)).toBe(true);expect(central.cells.some(c=>c.landState==='MATURE')).toBe(true);expect(prepared.fields.filter(f=>f.id!=='field-central').every(f=>f.cells.every(c=>c.landState==='MATURE'))).toBe(true);expect(game.farm.snapshot()).toEqual(before);expect(game.inventory.snapshot()).toEqual(inventory);
});
const loader=async(url:string)=>{const data=await readFile(new URL('../../../public'+url,import.meta.url));return (await new GLTFLoader().parseAsync(data.buffer.slice(data.byteOffset,data.byteOffset+data.byteLength),'')).scene;};
it('runs actual isolated combine harvest and restores crops, vehicle and empty grain tank on reset',async()=>{
  const world=new FarmWorld(loader);await world.load();const clock=new GameClock(),gameplay=new GameplayFoundation(clock);world.enter({gameplay,gameTime:clock.simulationTime,state:{lastSimulatedGameTime:0,discoveries:[]},spawn:world.getSpawnPoint()});
  const game={gameplay,clock,worldManager:{currentWorld:world},character:{visible:false}} as unknown as Game,scene=new TrailerScene(game),shot=trailerShot('combine-harvest');scene.prepare(shot);const original=world.combine!.pose,inventory=gameplay.inventory.snapshot(),before=gameplay.farm.getField('field-central')!.stateCounts.MATURE;
  for(let i=0;i<360;i++)scene.update(1/60,true);
  expect(world.combine!.root.position.z).toBeLessThan(original.z-2);expect(world.combine!.grainTank.used).toBeGreaterThan(0);expect(gameplay.farm.getField('field-central')!.stateCounts.MATURE).toBeLessThan(before);expect(gameplay.inventory.snapshot()).toEqual(inventory);
  scene.prepare(shot);expect(world.combine!.pose).toEqual(original);expect(world.combine!.grainTank.used).toBe(0);expect(gameplay.farm.getField('field-central')!.stateCounts.MATURE).toBe(before);
  scene.prepare(trailerShot('farm-life'));expect(world.root.getObjectByName('CapturePastoralMill')?.visible).toBe(true);scene.prepare(shot);expect(world.root.getObjectByName('CapturePastoralMill')?.visible).toBe(false);scene.stop();world.dispose();
});
it('changes only bounded animal visuals under a capture behavior override',()=>{
  const clock=new GameClock(),game=new GameplayFoundation(clock),before=game.livestock.snapshot(),models=new Map(before.animals.map(a=>{const group=new Group();group.position.set(a.x,4,a.z);return [a.id,group] as const;})),visual=new LivestockPresentation(models);visual.captureBehavior='WALKING';visual.update(game,30);
  expect(game.livestock.snapshot()).toEqual(before);for(const animal of before.animals){const model=models.get(animal.id)!,bounds=LIVESTOCK_PENS.find(p=>p.id===animal.penId)!.bounds;expect(model.position.x).toBeGreaterThanOrEqual(bounds.minX);expect(model.position.x).toBeLessThanOrEqual(bounds.maxX);expect(model.position.z).toBeGreaterThanOrEqual(bounds.minZ);expect(model.position.z).toBeLessThanOrEqual(bounds.maxZ);}
});
