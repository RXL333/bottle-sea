import { beforeEach,afterEach,describe,it,expect,vi } from 'vitest';
import { PerspectiveCamera } from 'three';
import { ExploreController } from './ExploreController';
import { InteractionSystem } from '../systems/InteractionSystem';
import { LANDMARKS } from '../world/underwater/Landmarks';
import { insideBottle } from '../world/bottle/Bounds';
class FakeButton extends EventTarget {}
class FakeElement extends EventTarget { requestPointerLock(){return Promise.reject(new Error('embedded browser'));} }
let events:EventTarget;
beforeEach(()=>{events=new EventTarget();vi.stubGlobal('window',events);vi.stubGlobal('HTMLButtonElement',FakeButton);});
afterEach(()=>vi.unstubAllGlobals());
function setup(){const camera=new PerspectiveCamera(),element=new FakeElement(),controls=new ExploreController(camera,element as unknown as HTMLElement);controls.active=true;camera.position.set(.65,4.12,1.8);camera.lookAt(.65,4.12,0);return {camera,controls};}
function key(code:string,down=true){const event=new Event(down?'keydown':'keyup');Object.defineProperties(event,{code:{value:code},repeat:{value:false}});events.dispatchEvent(event);}
function advance(controls:ExploreController,seconds:number){for(let t=0;t<seconds;t+=1/60)controls.update(1/60);}
describe('exploration integration',()=>{
  it('walks along the dock, steps onto the island and discovers the lighthouse',()=>{const {camera,controls}=setup();key('KeyW');advance(controls,1.35);key('KeyW',false);expect(camera.position.z).toBeLessThan(.65);expect(camera.position.y).toBeGreaterThan(4.05);const interaction=new InteractionSystem();interaction.update(camera.position);expect(interaction.nearest?.id).toBe('lighthouse');expect(interaction.interact()).toContain('发现');});
  it('dives, swims, rises, and stays within the bottle',()=>{const {camera,controls}=setup();camera.position.set(2,3.4,1);key('KeyC');advance(controls,1);key('KeyC',false);expect(controls.underwater).toBe(true);expect(camera.position.y).toBeLessThan(2.5);key('Space');advance(controls,1.5);key('Space',false);expect(camera.position.y).toBeGreaterThan(3.3);key('KeyD');advance(controls,20);expect(insideBottle(camera.position.x,camera.position.y,camera.position.z,0)).toBe(true);});
  it('blocks walls and jumps under gravity',()=>{const {camera,controls}=setup();camera.position.set(-1.5,4.27,.6);camera.lookAt(-1.5,4.27,-1);key('KeyW');advance(controls,2);key('KeyW',false);expect(camera.position.z).toBeGreaterThan(.3);key('Space');advance(controls,.15);key('Space',false);expect(camera.position.y).toBeGreaterThan(4.4);advance(controls,1);expect(camera.position.y).toBeCloseTo(4.27,1);});
  it('discovers all four targets only within range and without duplicates',()=>{const {camera}=setup(),interaction=new InteractionSystem();camera.position.set(10,10,10);interaction.update(camera.position);interaction.interact();expect(interaction.discovered.size).toBe(0);for(const target of LANDMARKS){camera.position.set(target.x,target.y,target.z);interaction.update(camera.position);interaction.interact();interaction.interact();}expect(interaction.discovered.size).toBe(4);});
});

