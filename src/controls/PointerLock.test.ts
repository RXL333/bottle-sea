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
function movement(type:string,x:number,y:number){const event=new Event(type);Object.defineProperties(event,{movementX:{value:x},movementY:{value:y},pointerId:{value:1}});return event;}
afterEach(()=>vi.unstubAllGlobals());
it('suspends pointer input during camera transitions',async()=>{
  const {doc,camera,controller}=setup(true);controller.enter();await Promise.resolve();controller.suspend();const before=camera.quaternion.clone();doc.dispatchEvent(movement('mousemove',40,20));controller.update(1);expect(camera.quaternion.equals(before)).toBe(true);expect(controller.active).toBe(false);expect(doc.pointerLockElement).toBe(null);
});
it('connects the real PointerLockControls after acceptance and releases on exit',async()=>{
  const {doc,camera,controller}=setup(true);controller.enter();await Promise.resolve();
  expect(controller.pointer.isLocked).toBe(true);const before=camera.quaternion.clone();doc.dispatchEvent(movement('mousemove',40,20));expect(camera.quaternion.equals(before)).toBe(false);
  controller.exit();expect(doc.pointerLockElement).toBe(null);expect(controller.pointer.isLocked).toBe(false);
  const after=camera.quaternion.clone();doc.dispatchEvent(movement('mousemove',40,20));expect(camera.quaternion.equals(after)).toBe(true);
});
it('falls back to drag-look on rejection without reporting a console error',async()=>{
  const {element,camera,controller}=setup(false),error=vi.spyOn(console,'error');controller.enter();await Promise.resolve();await Promise.resolve();
  expect(controller.pointer.isLocked).toBe(false);const before=camera.quaternion.clone();element.dispatchEvent(movement('pointerdown',0,0));element.dispatchEvent(movement('pointermove',40,20));element.dispatchEvent(new Event('pointerup'));
  expect(camera.quaternion.equals(before)).toBe(false);expect(error).not.toHaveBeenCalled();error.mockRestore();
});
it('ignores cursor-warp deltas in locked and drag-look modes',async()=>{
  const locked=setup(true);locked.controller.enter();await Promise.resolve();const lockedBefore=locked.camera.quaternion.clone();
  locked.doc.dispatchEvent(movement('mousemove',10000,0));expect(locked.camera.quaternion.equals(lockedBefore)).toBe(true);
  locked.controller.exit();
  const drag=setup(false);drag.controller.enter();await Promise.resolve();await Promise.resolve();const dragBefore=drag.camera.quaternion.clone();
  drag.element.dispatchEvent(movement('pointerdown',0,0));drag.element.dispatchEvent(movement('pointermove',10000,0));
  expect(drag.camera.quaternion.equals(dragBefore)).toBe(true);
  drag.element.dispatchEvent(movement('pointermove',NaN,0));expect(drag.camera.quaternion.equals(dragBefore)).toBe(true);
  drag.element.dispatchEvent(movement('pointermove',10,0));expect(drag.camera.quaternion.equals(dragBefore)).toBe(false);
  drag.element.dispatchEvent(new Event('lostpointercapture'));const released=drag.camera.quaternion.clone();
  drag.element.dispatchEvent(movement('pointermove',20,0));expect(drag.camera.quaternion.equals(released)).toBe(true);
});
