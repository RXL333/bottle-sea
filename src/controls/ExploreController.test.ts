import { beforeEach,afterEach,describe,it,expect,vi } from 'vitest';
import { PerspectiveCamera } from 'three';
import { ExploreController } from './ExploreController';
import { InteractionSystem } from '../systems/InteractionSystem';
import { LANDMARKS } from '../world/underwater/Landmarks';
import { insideBottle } from '../world/bottle/Bounds';
import { WaterCrossing } from '../systems/WaterEntrySystem';
import { islandBottomHeight } from '../world/island/Island';
class FakeButton extends EventTarget {}
class FakeElement extends EventTarget { requestPointerLock(){return Promise.reject(new Error('embedded browser'));} }
let events:EventTarget;
beforeEach(()=>{events=new EventTarget();vi.stubGlobal('window',events);vi.stubGlobal('HTMLButtonElement',FakeButton);});
afterEach(()=>vi.unstubAllGlobals());
function setup(){const camera=new PerspectiveCamera(),element=new FakeElement(),controls=new ExploreController(camera,element as unknown as HTMLElement);controls.active=true;camera.position.set(.65,4.12,1.8);camera.lookAt(.65,4.12,0);return {camera,controls};}
function key(code:string,down=true){const event=new Event(down?'keydown':'keyup');Object.defineProperties(event,{code:{value:code},repeat:{value:false}});events.dispatchEvent(event);}
function advance(controls:ExploreController,seconds:number){for(let t=0;t<seconds;t+=1/60)controls.update(1/60);}
describe('exploration integration',()=>{
  it('swims through the open passage beneath the island',()=>{
    const {camera,controls}=setup();camera.position.set(-3.15,2.1,0);camera.lookAt(1.2,2.1,0);controls.syncLook();key('KeyW');advance(controls,4.5);key('KeyW',false);
    expect(camera.position.x).toBeGreaterThan(.9);expect(camera.position.y).toBeCloseTo(2.1,1);expect(controls.swimming).toBe(true);
  });
  it('stops at the island underside when swimming upward',()=>{
    const {camera,controls}=setup();camera.position.set(-.85,2.1,0);key('Space');advance(controls,1);key('Space',false);
    expect(camera.position.y).toBeCloseTo(islandBottomHeight(-.85,0)-.14,4);expect(controls.swimming).toBe(true);
  });
  it('cannot swim upward through the ruins lintel or dive through the chest',()=>{
    const {camera,controls}=setup();camera.position.set(3.22,2.5,.4);key('Space');advance(controls,1);key('Space',false);
    expect(camera.position.y).toBeCloseTo(2.7);
    camera.position.set(-1.8,2.8,1.1);key('KeyC');advance(controls,1);key('KeyC',false);
    expect(camera.position.y).toBeCloseTo(2.5);
  });
  it('does not tunnel through props during a stalled frame',()=>{
    const {camera,controls}=setup();camera.position.set(-1.8,2.1,1.7);camera.lookAt(-1.8,2.1,1.1);key('KeyW');key('ShiftLeft');controls.update(2);
    expect(camera.position.z).toBeGreaterThanOrEqual(1.5);
  });
  it('carries a jump through the water surface and triggers entry once',()=>{
    const {camera,controls}=setup();camera.position.set(2,4.5,1);const crossing=new WaterCrossing();crossing.update(camera.position.y);let entries=0;
    for(let i=0;i<180;i++){const before=camera.position.y;controls.update(1/60);expect(Math.abs(camera.position.y-before)).toBeLessThan(.08);if(crossing.update(camera.position.y)==='enter')entries++;}
    expect(entries).toBe(1);expect(controls.underwater).toBe(true);expect(camera.position.y).toBeGreaterThan(1.88);
  });
  it('stops before the camera enters a solid underwater landmark',()=>{
    const {camera,controls}=setup();camera.position.set(-1.8,2.1,1.7);camera.lookAt(-1.8,2.1,1.1);key('KeyW');advance(controls,1);key('KeyW',false);
    expect(camera.position.z).toBeGreaterThanOrEqual(1.49);expect(controls.swimming).toBe(true);
  });
  it('swims beneath the dock without teleporting onto its deck',()=>{
    const {camera,controls}=setup();camera.position.set(1.3,2.6,1.4);camera.lookAt(0,2.6,1.4);key('KeyW');
    for(let frame=0;frame<45;frame++){
      const previous=camera.position.clone();controls.update(1/60);
      expect(camera.position.distanceTo(previous)).toBeLessThan(.05);
    }
    key('KeyW',false);expect(camera.position.x).toBeLessThan(1.1);expect(camera.position.y).toBeCloseTo(2.6);expect(controls.swimming).toBe(true);
  });
  it('uses a stable depth range while exploring and restores the overview camera',()=>{const {camera,controls}=setup();controls.active=false;controls.enter(false);expect(camera.near).toBe(.08);expect(camera.far).toBe(40);controls.exit();expect(camera.near).toBe(.12);expect(camera.far).toBe(200);});
  it('walks along the dock, steps onto the island and discovers the lighthouse',()=>{const {camera,controls}=setup();key('KeyW');advance(controls,1.35);key('KeyW',false);expect(camera.position.z).toBeLessThan(.65);expect(camera.position.y).toBeGreaterThan(4.05);const interaction=new InteractionSystem();interaction.update(camera.position);expect(interaction.nearest?.id).toBe('lighthouse');expect(interaction.interact()).toContain('发现');});
  it('dives, swims, rises, and stays within the bottle',()=>{const {camera,controls}=setup();camera.position.set(2,3.4,1);key('KeyC');advance(controls,1);key('KeyC',false);expect(controls.underwater).toBe(true);expect(camera.position.y).toBeLessThan(2.5);key('Space');advance(controls,1.5);key('Space',false);expect(camera.position.y).toBeGreaterThan(3.3);key('KeyD');advance(controls,20);expect(insideBottle(camera.position.x,camera.position.y,camera.position.z,0)).toBe(true);});
  it('blocks walls and jumps under gravity',()=>{const {camera,controls}=setup();camera.position.set(-1.5,4.27,.6);camera.lookAt(-1.5,4.27,-1);key('KeyW');advance(controls,2);key('KeyW',false);expect(camera.position.z).toBeGreaterThan(.3);key('Space');advance(controls,.15);key('Space',false);expect(camera.position.y).toBeGreaterThan(4.4);advance(controls,1);expect(camera.position.y).toBeCloseTo(4.27,1);});
  it('discovers all four targets only within range and without duplicates',()=>{const {camera}=setup(),interaction=new InteractionSystem();camera.position.set(10,10,10);interaction.update(camera.position);interaction.interact();expect(interaction.discovered.size).toBe(0);for(const target of LANDMARKS){camera.position.set(target.x,target.y,target.z);interaction.update(camera.position);interaction.interact();interaction.interact();}expect(interaction.discovered.size).toBe(4);});
});

