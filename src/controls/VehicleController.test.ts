import { afterEach,expect,it,vi } from 'vitest';
import { Group,Matrix4,PerspectiveCamera,Vector3 } from 'three';
import { VehicleController } from './VehicleController';
import type { ExploreController } from './ExploreController';
import type { DriveableVehicle } from '../systems/vehicles/Vehicle';
import { VehicleFollowCamera } from '../systems/vehicles/VehicleFollowCamera';
function event(type:string,data:Record<string,unknown>){const e=new Event(type);for(const [key,value] of Object.entries(data))Object.defineProperty(e,key,{value});return e;}
function setup(locked=false){
  const doc=Object.assign(new EventTarget(),{hasFocus:()=>true,hidden:false,pointerLockElement:null as EventTarget|null,body:{classList:{add(){},remove(){}}}}),win=new EventTarget();vi.stubGlobal('document',doc);vi.stubGlobal('window',win);
  const element=Object.assign(new EventTarget(),{ownerDocument:doc,focus(){},setPointerCapture(){},hasPointerCapture:()=>false,releasePointerCapture(){}});if(locked)doc.pointerLockElement=element;
  const advance=vi.fn(),vehicle:DriveableVehicle={id:'fixture',name:'fixture',root:new Group(),speed:0,yaw:0,occupied:true,collision:{x:0,z:0,previousX:0,previousZ:0,yaw:0,previousYaw:0,halfX:1,halfZ:1,minY:0,maxY:2},seatPosition:()=>new Vector3(0,1,0),entryPosition:()=>new Vector3(2,0,0),occupy(){},advance,stop:vi.fn(),findExit:()=>({id:'exit',position:[2,.44,0],lookAt:[0,1,0]}),clipCamera:(_,to)=>to.clone(),hitchBackTransform:()=>new Matrix4(),hitchPosition:()=>new Vector3()};
  const camera=new PerspectiveCamera(),controller=new VehicleController(camera,element as unknown as HTMLElement,{active:true,suspend(){}} as unknown as ExploreController);controller.vehicle=vehicle;controller.phase='DRIVING';return {doc,win,element,vehicle,controller,advance,camera};
}
afterEach(()=>vi.unstubAllGlobals());
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
