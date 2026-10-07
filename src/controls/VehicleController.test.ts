import { afterEach,expect,it,vi } from 'vitest';
import { Group,Matrix4,PerspectiveCamera,Vector3 } from 'three';
import { VehicleController } from './VehicleController';
import type { ExploreController } from './ExploreController';
import type { DriveableVehicle } from '../systems/vehicles/Vehicle';
import { VehicleFollowCamera } from '../systems/vehicles/VehicleFollowCamera';
import { DEFAULT_SETTINGS } from '../state/GameSettings';
function event(type:string,data:Record<string,unknown>){const e=new Event(type);for(const [key,value] of Object.entries(data))Object.defineProperty(e,key,{value});return e;}
function setup(locked=false){
  const doc=Object.assign(new EventTarget(),{hasFocus:()=>true,hidden:false,pointerLockElement:null as EventTarget|null,body:{classList:{add(){},remove(){}}}}),win=new EventTarget();vi.stubGlobal('document',doc);vi.stubGlobal('window',win);
  const element=Object.assign(new EventTarget(),{ownerDocument:doc,focus(){},setPointerCapture(){},hasPointerCapture:()=>false,releasePointerCapture(){}});if(locked)doc.pointerLockElement=element;
  const advance=vi.fn(),vehicle:DriveableVehicle={id:'fixture',name:'fixture',root:new Group(),speed:0,yaw:0,occupied:true,collision:{x:0,z:0,previousX:0,previousZ:0,yaw:0,previousYaw:0,halfX:1,halfZ:1,minY:0,maxY:2},seatPosition:()=>new Vector3(0,1,0),entryPosition:()=>new Vector3(2,0,0),occupy(){},advance,stop:vi.fn(),findExit:()=>({id:'exit',position:[2,.44,0],lookAt:[0,1,0]}),clipCamera:(_,to)=>to.clone(),hitchBackTransform:()=>new Matrix4(),hitchPosition:()=>new Vector3()};
  const camera=new PerspectiveCamera(),controller=new VehicleController(camera,element as unknown as HTMLElement,{active:true,suspend(){}} as unknown as ExploreController);controller.vehicle=vehicle;controller.phase='DRIVING';return {doc,win,element,vehicle,controller,advance,camera};
}
afterEach(()=>vi.unstubAllGlobals());
it.each(['combined','keyboard','mouse'] as const)('respects the %s steering mode and retains throttle/brake',mode=>{
  const s=setup(true);s.controller.configure({...DEFAULT_SETTINGS,vehicleSteering:mode});
  s.doc.dispatchEvent(event('mousemove',{movementX:-100,movementY:0}));s.win.dispatchEvent(event('keydown',{code:'KeyW'}));s.controller.update(1/60);
  expect(s.advance.mock.lastCall![1].throttle).toBe(1);expect(s.advance.mock.lastCall![1].steer).toBeCloseTo(mode==='keyboard'?0:.25);
  s.win.dispatchEvent(event('keydown',{code:'KeyD'}));s.controller.update(1/60);expect(s.advance.mock.lastCall![1].steer).toBeCloseTo(mode==='mouse'?.25:-1);
  s.win.dispatchEvent(event('keydown',{code:'Space'}));s.controller.update(1/60);expect(s.advance.mock.lastCall![1].brake).toBe(true);
});
it('blocks all driving and implement actions during settings and clears held input on return',()=>{
  const s=setup(),work=vi.fn();s.controller.onWork=work;s.win.dispatchEvent(event('keydown',{code:'KeyW'}));s.controller.suspendForPanel();expect(s.vehicle.stop).toHaveBeenCalled();
  s.win.dispatchEvent(event('keydown',{code:'KeyJ'}));s.doc.dispatchEvent(event('mousemove',{movementX:300,movementY:0}));s.controller.update(1/60);expect(work).not.toHaveBeenCalled();expect(s.advance).not.toHaveBeenCalled();
  s.controller.resumeFromPanel();s.controller.update(1/60);expect(s.advance.mock.lastCall![1]).toMatchObject({steer:0,throttle:0});
});
it('restores an existing pointer lock after settings without requesting a new lock for unlocked players',()=>{
  const s=setup(true),exit=vi.fn(()=>{s.doc.pointerLockElement=null;});Object.assign(s.doc,{exitPointerLock:exit});const request=vi.fn(()=>{s.doc.pointerLockElement=s.element;return Promise.resolve();});Object.assign(s.element,{requestPointerLock:request});
  s.controller.suspendForPanel();expect(exit).toHaveBeenCalledOnce();s.controller.resumeFromPanel();expect(request).toHaveBeenCalledOnce();
  s.doc.pointerLockElement=null;s.controller.suspendForPanel();s.controller.resumeFromPanel();expect(request).toHaveBeenCalledOnce();
});
it('clips only the final eye per driving frame and supports adjustable follow distance',()=>{
  const s=setup(),clip=vi.spyOn(s.vehicle,'clipCamera'),follow=new VehicleFollowCamera(s.camera);follow.configure(.5,1.5);follow.reset(s.vehicle);s.camera.position.copy(follow.destination(s.vehicle).position);clip.mockClear();follow.update(1/60,s.vehicle);expect(clip).toHaveBeenCalledOnce();expect(s.camera.position.distanceTo(s.vehicle.seatPosition())).toBeGreaterThan(5);
});
it('reports driving only after actual travel, never while blocked or boarding',()=>{
  const s=setup(),reported=vi.fn();s.controller.onDrive=reported;
  for(let i=0;i<30;i++)s.controller.update(1/60);expect(reported).not.toHaveBeenCalled();
  s.advance.mockImplementation(()=>{s.vehicle.root.position.z+=.1;});
  for(let i=0;i<4;i++)s.controller.update(1/60);expect(reported).not.toHaveBeenCalled();
  s.controller.update(1/60);expect(reported).toHaveBeenCalledOnce();
  for(let i=0;i<30;i++)s.controller.update(1/60);expect(reported).toHaveBeenCalledOnce();
});
it.each([false,true])('steers with mouse, retains keyboard, and separates left-drag orbit (locked=%s)',locked=>{
  const s=setup(locked),move=(x:number,y=0)=>locked?s.doc.dispatchEvent(event('mousemove',{movementX:x,movementY:y})):s.element.dispatchEvent(event('pointermove',{clientX:x,clientY:y,pointerId:1}));
  if(!locked)move(0);move(-50);s.controller.update(1/60);expect(s.advance.mock.lastCall![1].steer).toBeGreaterThan(0);
  s.win.dispatchEvent(event('keydown',{code:'KeyD',repeat:false}));s.controller.update(1/60);expect(s.advance.mock.lastCall![1].steer).toBe(-1);s.win.dispatchEvent(event('keyup',{code:'KeyD'}));
  s.element.dispatchEvent(event('pointerdown',{button:0,pointerId:1,clientX:0,clientY:0}));move(100,25);s.controller.update(1/60);expect(s.advance.mock.lastCall![1].steer).toBe(0);
  s.win.dispatchEvent(event('pointerup',{button:0}));s.win.dispatchEvent(new Event('blur'));s.controller.update(1/60);expect(s.advance.mock.lastCall![1].steer).toBe(0);expect(s.vehicle.stop).toHaveBeenCalled();
});
it('returns the orbit camera smoothly and continues clipping every frame',()=>{
  const {camera,vehicle}=setup(),clip=vi.spyOn(vehicle,'clipCamera'),follow=new VehicleFollowCamera(camera);follow.reset(vehicle);camera.position.copy(follow.destination(vehicle).position);const start=camera.position.clone();
  follow.beginOrbit();follow.dragOrbit(230,100);for(let i=0;i<120;i++)follow.update(1/60,vehicle);expect(camera.position.distanceTo(start)).toBeGreaterThan(2);
  follow.endOrbit();const before=camera.position.clone();follow.update(1/60,vehicle);expect(camera.position.distanceTo(before)).toBeLessThan(.5);for(let i=0;i<240;i++)follow.update(1/60,vehicle);expect(camera.position.distanceTo(start)).toBeLessThan(.001);expect(clip).toHaveBeenCalled();
});
