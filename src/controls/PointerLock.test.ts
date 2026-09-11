import { afterEach,expect,it,vi } from 'vitest';
import { PerspectiveCamera } from 'three';
import { ExploreController } from './ExploreController';

class FakeDocument extends EventTarget {
  pointerLockElement:EventTarget|null=null;
  exitPointerLock(){this.pointerLockElement=null;this.dispatchEvent(new Event('pointerlockchange'));}
}
class FakeElement extends EventTarget {
  style={touchAction:''};
  constructor(readonly ownerDocument:FakeDocument,private allowed:boolean){super();}
  requestPointerLock(){if(!this.allowed)return Promise.reject(new Error('Denied'));this.ownerDocument.pointerLockElement=this;return Promise.resolve();}
  setPointerCapture(){}
}
function setup(allowed:boolean){const doc=new FakeDocument();vi.stubGlobal('document',doc);vi.stubGlobal('window',new EventTarget());const element=new FakeElement(doc,allowed),camera=new PerspectiveCamera(),controller=new ExploreController(camera,element as unknown as HTMLElement);return {doc,element,camera,controller};}
function movement(type:string,x:number,y:number,clientX=x,clientY=y){const event=new Event(type);Object.defineProperties(event,{movementX:{value:x},movementY:{value:y},clientX:{value:clientX},clientY:{value:clientY},button:{value:0},pointerId:{value:1}});return event;}
afterEach(()=>vi.unstubAllGlobals());
it('suspends pointer input during camera transitions',async()=>{
  const {doc,camera,controller}=setup(true);controller.enter();await Promise.resolve();controller.suspend();const before=camera.quaternion.clone();doc.dispatchEvent(movement('mousemove',40,20));controller.update(1);expect(camera.quaternion.equals(before)).toBe(true);expect(controller.active).toBe(false);expect(doc.pointerLockElement).toBe(null);
});
it('connects the real PointerLockControls after acceptance and releases on exit',async()=>{
  const {doc,camera,controller}=setup(true);controller.enter();await Promise.resolve();
  expect(controller.pointer.isLocked).toBe(true);const before=camera.quaternion.clone();doc.dispatchEvent(movement('mousemove',40,20));controller.update(1/60);expect(camera.quaternion.equals(before)).toBe(false);
  controller.exit();expect(doc.pointerLockElement).toBe(null);expect(controller.pointer.isLocked).toBe(false);
  const after=camera.quaternion.clone();doc.dispatchEvent(movement('mousemove',40,20));expect(camera.quaternion.equals(after)).toBe(true);
});
it('falls back to drag-look on rejection without reporting a console error',async()=>{
  const {element,camera,controller}=setup(false),error=vi.spyOn(console,'error');controller.enter();await Promise.resolve();await Promise.resolve();
  expect(controller.pointer.isLocked).toBe(false);const before=camera.quaternion.clone();element.dispatchEvent(movement('pointerdown',0,0));element.dispatchEvent(movement('pointermove',40,20));element.dispatchEvent(new Event('pointerup'));
  controller.update(1/60);expect(camera.quaternion.equals(before)).toBe(false);expect(error).not.toHaveBeenCalled();error.mockRestore();
});
it('preserves large locked input while drag mode uses cursor coordinates',async()=>{
  const locked=setup(true);locked.controller.enter();await Promise.resolve();const lockedBefore=locked.camera.quaternion.clone();
  locked.doc.dispatchEvent(movement('mousemove',200,0));locked.controller.update(1/60);expect(locked.camera.quaternion.equals(lockedBefore)).toBe(false);
  locked.controller.exit();
  const drag=setup(false);drag.controller.enter();await Promise.resolve();await Promise.resolve();const dragBefore=drag.camera.quaternion.clone();
  drag.element.dispatchEvent(movement('pointerdown',0,0));drag.element.dispatchEvent(movement('pointermove',10000,0,0,0));drag.controller.update(1/60);
  expect(drag.camera.quaternion.equals(dragBefore)).toBe(true);
  drag.element.dispatchEvent(movement('pointermove',NaN,0));expect(drag.camera.quaternion.equals(dragBefore)).toBe(true);
  drag.element.dispatchEvent(movement('pointermove',10,0));drag.controller.update(1/60);expect(drag.camera.quaternion.equals(dragBefore)).toBe(false);
  drag.element.dispatchEvent(new Event('lostpointercapture'));const released=drag.camera.quaternion.clone();
  drag.element.dispatchEvent(movement('pointermove',20,0));expect(drag.camera.quaternion.equals(released)).toBe(true);
});
it.each([61,100,200])('keeps a locked horizontal delta of %i pixels',async delta=>{const {doc,camera,controller}=setup(true);controller.enter();await Promise.resolve();const before=camera.quaternion.clone();doc.dispatchEvent(movement('mousemove',delta,0));controller.update(1/60);expect(before.angleTo(camera.quaternion)).toBeCloseTo(delta*.0013,6);});
it('preserves fast drag displacement and stops immediately without trailing motion',async()=>{
  const {element,camera,controller}=setup(false);controller.enter();await Promise.resolve();await Promise.resolve();
  element.dispatchEvent(movement('pointerdown',0,0));const before=camera.quaternion.clone();element.dispatchEvent(movement('pointermove',120,0));
  expect(camera.quaternion.equals(before)).toBe(true);controller.update(1/60);
  expect(before.angleTo(camera.quaternion)).toBeCloseTo(120*.0013,6);
  const settled=camera.quaternion.clone();controller.update(1/60);expect(camera.quaternion.equals(settled)).toBe(true);
  element.dispatchEvent(movement('pointermove',-120,0,0,0));controller.update(1/60);expect(before.angleTo(camera.quaternion)).toBeLessThan(.000001);
});
it('applies equal locked movement regardless of event batching or frame rate',async()=>{
  const first=setup(true);first.controller.enter();await Promise.resolve();
  first.doc.dispatchEvent(movement('mousemove',180,0));first.controller.update(1/30);const target=first.camera.quaternion.clone();first.controller.exit();
  const second=setup(true);second.controller.enter();await Promise.resolve();
  for(let i=0;i<18;i++){second.doc.dispatchEvent(movement('mousemove',10,0));second.controller.update(1/144);}
  expect(target.angleTo(second.camera.quaternion)).toBeLessThan(.000001);
});
it('clears queued look on blur and suspension',async()=>{
  const {doc,camera,controller}=setup(true);controller.enter();await Promise.resolve();const before=camera.quaternion.clone();
  doc.dispatchEvent(movement('mousemove',100,0));window.dispatchEvent(new Event('blur'));controller.update(1/60);
  expect(camera.quaternion.equals(before)).toBe(true);
  doc.dispatchEvent(movement('mousemove',100,0));controller.suspend();controller.active=true;controller.update(1/60);
  expect(camera.quaternion.equals(before)).toBe(true);
});
