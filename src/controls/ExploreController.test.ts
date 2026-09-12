import { FarmWorld } from '../worlds/farm/FarmWorld';
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
    expect(camera.position.x).toBeGreaterThan(.9);expect(camera.position.y).toBeGreaterThanOrEqual(2.1);expect(camera.position.y).toBeLessThan(2.25);expect(controls.swimming).toBe(true);
  });
  it('stops at the island underside when swimming upward',()=>{
    const {camera,controls}=setup();camera.position.set(-.85,2.1,0);key('Space');advance(controls,1);key('Space',false);
    expect(camera.position.y).toBeLessThanOrEqual(islandBottomHeight(-.85,0)-.075);expect(camera.position.y).toBeGreaterThan(2.35);expect(controls.swimming).toBe(true);
  });
  it('cannot swim upward through the ruins lintel or dive through the chest',()=>{
    const {camera,controls}=setup();camera.position.set(3.22,2.5,.4);key('Space');advance(controls,1);key('Space',false);
    expect(camera.position.y).toBeCloseTo(2.76);
    camera.position.set(-1.8,2.8,1.1);key('KeyC');advance(controls,1);key('KeyC',false);
    expect(camera.position.y).toBeCloseTo(2.8);
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
  it('walks along the dock, steps onto the island and discovers the lighthouse',()=>{const {camera,controls}=setup();key('KeyW');advance(controls,1.35);key('KeyW',false);expect(camera.position.z).toBeLessThan(.65);expect(camera.position.y).toBeGreaterThan(4.05);const interaction=new InteractionSystem();interaction.update(camera.position);expect(interaction.nearest?.id,camera.position.toArray().join(',')).toBe('lighthouse');expect(interaction.interact()).toContain('发现');});
  it('smooths only the rendered step offset while physical support changes immediately',()=>{const {camera,controls}=setup();key('KeyW');let previous=camera.position.y+controls.renderOffsetY,maxVisualDelta=0,sawOffset=false;for(let i=0;i<100;i++){controls.update(1/60);const visual=camera.position.y+controls.renderOffsetY;maxVisualDelta=Math.max(maxVisualDelta,Math.abs(visual-previous));previous=visual;sawOffset||=controls.renderOffsetY<-.01;}key('KeyW',false);expect(sawOffset).toBe(true);expect(maxVisualDelta).toBeLessThan(.035);expect(Math.abs(controls.renderOffsetY)).toBeLessThan(.01);});
  it.each(['KeyA','KeyD'])('never jumps during shore strafing with %s',code=>{const {camera,controls}=setup();camera.position.set(-.8,4.36,0);camera.lookAt(-.8,4.36,-1);controls.syncLook();key(code);let maxStep=0;for(let i=0;i<240;i++){const before=camera.position.clone();controls.update(1/60);maxStep=Math.max(maxStep,Math.hypot(camera.position.x-before.x,camera.position.z-before.z));}key(code,false);expect(maxStep).toBeLessThanOrEqual(1.05/60+.0001);});
  it('dives, swims, rises, and stays within the bottle',()=>{const {camera,controls}=setup();camera.position.set(2,3.4,1);key('KeyC');advance(controls,1);key('KeyC',false);expect(controls.underwater).toBe(true);expect(camera.position.y).toBeLessThan(2.5);key('Space');advance(controls,1.5);key('Space',false);expect(camera.position.y).toBeGreaterThan(3.3);key('KeyD');advance(controls,20);expect(insideBottle(camera.position.x,camera.position.y,camera.position.z,0)).toBe(true);});
  it('blocks walls and jumps under gravity',()=>{const {camera,controls}=setup();camera.position.set(-1.5,4.36,.6);camera.lookAt(-1.5,4.36,-1);key('KeyW');advance(controls,2);key('KeyW',false);expect(camera.position.z).toBeGreaterThan(.3);key('Space');advance(controls,.15);key('Space',false);expect(camera.position.y).toBeGreaterThan(4.45);advance(controls,1);expect(camera.position.y).toBeCloseTo(4.36,1);});
  it('discovers all four targets only within range and without duplicates',()=>{const {camera}=setup(),interaction=new InteractionSystem();camera.position.set(10,10,10);interaction.update(camera.position);interaction.interact();expect(interaction.discovered.size).toBe(0);for(const target of LANDMARKS){camera.position.set(target.x,target.y,target.z);interaction.update(camera.position);interaction.interact();interaction.interact();}expect(interaction.discovered.size).toBe(4);});
});


it('uses supplied navigation beyond Home bottle bounds and supplied arrival pose',()=>{
  const {camera,controls}=setup();controls.setNavigation({groundHeight:()=>0,hitsObstacle:()=>false,resolveVertical:(_x,_z,_from,to)=>to,isInside:()=>true,constrain:()=>{},waterLevel:()=>-100,dynamicObstacles:()=>[]});
  controls.enter(false,{id:'test',position:[50,.44,50],lookAt:[50,.44,49]});key('KeyW');for(let i=0;i<60;i++)controls.update(1/60,-100);key('KeyW',false);expect(camera.position.x).toBe(50);expect(camera.position.z).toBeCloseTo(48.95);expect(camera.position.y).toBeCloseTo(.44);expect(controls.swimming).toBe(false);
});

it('walks the farm dock and wide road, and stops at the closed barn',()=>{const farm=new FarmWorld(),{camera,controls}=setup();controls.setNavigation(farm.navigation);controls.enter(false,farm.getSpawnPoint());key('KeyW');advance(controls,16);key('KeyW',false);expect(camera.position.x).toBeCloseTo(-4);expect(camera.position.z).toBeLessThan(-2);expect(camera.position.y).toBeCloseTo(4.44);camera.position.set(7,4.44,-4);camera.lookAt(7,4.44,-6);controls.syncLook();key('KeyW');advance(controls,3);key('KeyW',false);expect(camera.position.z).toBeGreaterThan(-4.87);expect(camera.position.z).toBeLessThan(-4.7);farm.dispose();});
