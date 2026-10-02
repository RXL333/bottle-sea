import { readFile } from 'node:fs/promises';
import { afterEach,describe,expect,it,vi } from 'vitest';
import { Box3,Group,Mesh,Quaternion,Vector3 } from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { PlayerCharacter,CHARACTER_SCALE } from './PlayerCharacter';
import { FarmWorld } from '../worlds/farm/FarmWorld';
import { GameplayFoundation } from '../gameplay/GameplayFoundation';
import { GameClock } from '../core/GameClock';
import { disposeWorld } from '../worlds/disposeWorld';

const resources:{dispose():void}[]=[];
afterEach(()=>{for(const resource of resources.splice(0))resource.dispose();});
const loader=async(url:string)=>{const bytes=await readFile(new URL('../../public'+url,import.meta.url));return (await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'')).scene;};
async function character(){const result=new PlayerCharacter(loader);resources.push(result);await result.load();return result;}
function part(character:Group,id:string){let found:import('three').Object3D|undefined;character.traverse(o=>{if(o.userData.part_id===id)found=o;});return found!;}
const frame=(eye=new Vector3(2,4.44,3))=>({delta:1/60,time:0,visible:true,firstPerson:true,eye,orientation:new Quaternion(),grounded:true});

describe('authored player GLB and existing controls integration',()=>{
  it('uses reference proportions, feet origin and one shared palette draw per articulated part',async()=>{
    const c=await character();c.showAt(new Vector3(),0);const bounds=c.bounds(),height=bounds.getSize(new Vector3()).y;
    expect(bounds.min.y).toBeCloseTo(0,6);expect(height).toBeGreaterThan(.52);expect(height).toBeLessThan(.53);
    const hips=part(c,'Hips').getWorldPosition(new Vector3());expect(hips.y/height).toBeGreaterThan(.35);expect(hips.y/height).toBeLessThan(.40);
    const headHeight=new Box3().setFromObject(part(c,'Head')).getSize(new Vector3()).y;expect(headHeight/height).toBeGreaterThan(.35);expect(headHeight/height).toBeLessThan(.40);
    const meshes:Mesh[]=[];c.traverse(o=>{if(o instanceof Mesh)meshes.push(o);});
    expect(meshes.length).toBeLessThanOrEqual(17);expect(new Set(meshes.map(m=>m.material)).size).toBe(1);expect(c.userData.triangles).toBeGreaterThan(2000);expect(c.userData.triangles).toBeLessThanOrEqual(4000);
    expect(meshes.every(m=>m.geometry.getAttribute('color').count===m.geometry.getAttribute('position').count)).toBe(true);
    c.applyQuality('LOW');expect(meshes.every(m=>!m.castShadow)).toBe(true);c.applyQuality('HIGH');expect(meshes.every(m=>m.castShadow)).toBe(true);
  });
  it('shows first-person body at outdoor and indoor feet while hiding head, hat and backpack',async()=>{
    const c=await character();c.update(frame());expect(c.position.toArray()).toEqual([2,4,3]);expect(c.pose).toBe('IDLE');expect(part(c,'Head').visible).toBe(false);expect(part(c,'Backpack').visible).toBe(false);expect(part(c,'Hat').parent).toBe(part(c,'Head'));
    expect(part(c,'Thigh_L').visible).toBe(true);c.update({...frame(new Vector3(2,1.55,3)),eyeHeight:1.55});expect(c.position.y).toBeCloseTo(0);expect(c.scale.x).toBeCloseTo(CHARACTER_SCALE*1.55/.44);
    c.update({...frame(),visible:false});expect(c.visible).toBe(false);c.update({...frame(),eye:new Vector3(20,4.44,20)});expect(c.pose).toBe('IDLE');
  });
  it('animates distance-driven gait, resets on teleport and hides during transitions',async()=>{
    const c=await character();c.update(frame());for(let n=1;n<=12;n++)c.update({...frame(new Vector3(2+n*.01,4.44,3)),time:n/60});expect(c.pose).toBe('WALK');expect(part(c,'Thigh_L').quaternion.equals(part(c,'Thigh_R').quaternion)).toBe(false);
    c.update({...frame(new Vector3(2.13,4.44,3)),sprinting:true});expect(c.pose).toBe('RUN');c.update({...frame(),paused:true});expect(c.pose).toBe('IDLE');
    c.update({...frame(),visible:false});expect(c.visible).toBe(false);c.update(frame(new Vector3(50,4.44,20)));expect(c.pose).toBe('IDLE');
  });
  it('anchors revised hips to real tractor and combine seats across turning without changing saved gameplay',async()=>{
    const world=new FarmWorld(loader);resources.push(world);await world.load();const game=new GameplayFoundation(new GameClock());world.enter({gameplay:game,gameTime:0,state:{lastSimulatedGameTime:0,discoveries:[]},spawn:world.getSpawnPoint()});
    const c=await character();
    for(const vehicle of world.vehicles){
      let glass:Mesh|undefined;vehicle.root.traverse(o=>{if(o instanceof Mesh&&!Array.isArray(o.material)&&o.material.name.toLowerCase().includes('glass'))glass=o;});const original=glass!.material as import('three').MeshStandardMaterial;
      for(const yaw of [0,Math.PI/2,Math.PI]){
      vehicle.stop();game.vehicles.record({...vehicle.snapshot(),x:vehicle===world.vehicles[0]?-6:0,z:-7,yaw});vehicle.bind(game.vehicles);expect(vehicle.yaw,vehicle.name+' parked yaw').toBeCloseTo(yaw);const saved=game.snapshot();c.update({...frame(),firstPerson:false,vehicle});
      expect(part(c,'Hips').getWorldPosition(new Vector3()).distanceTo(vehicle.seatPosition())).toBeLessThan(1e-6);expect(c.pose).toBe('SEATED');expect(part(c,'Head').visible).toBe(true);expect(part(c,'Backpack').visible).toBe(true);
      const knee=part(c,'Shin_L').getWorldPosition(new Vector3()),foot=part(c,'Foot_L').getWorldPosition(new Vector3());expect(foot.y).toBeLessThan(knee.y-.04);
      expect(c.rotation.y).toBeCloseTo(yaw);expect(game.snapshot()).toEqual(saved);
      }
      expect(glass!.material).not.toBe(original);expect(original.opacity).toBe(1);expect((glass!.material as import('three').MeshStandardMaterial).opacity).toBe(.18);
      const start=vehicle.seatPosition();vehicle.occupy(true);
      for(let n=0;n<120;n++){vehicle.advance(1/120,{throttle:1,steer:.3,brake:false});const saved=game.snapshot();c.update({...frame(),firstPerson:false,vehicle});expect(part(c,'Hips').getWorldPosition(new Vector3()).distanceTo(vehicle.seatPosition())).toBeLessThan(1e-6);expect(c.rotation.y).toBeCloseTo(vehicle.yaw);expect(game.snapshot()).toEqual(saved);}
      expect(vehicle.seatPosition().distanceTo(start)).toBeGreaterThan(.01);vehicle.occupy(false);
    }
    c.update(frame());expect(c.pose).toBe('IDLE');expect(c.position.y).toBeCloseTo(4);expect(part(c,'Head').visible).toBe(false);
  });
  it('loads once, rejects incomplete assets and releases late-loaded geometry after disposal',async()=>{
    const source=await loader('/models/character/player_character.glb'),load=vi.fn(async()=>source),c=new PlayerCharacter(load);resources.push(c);await Promise.all([c.load(),c.load()]);expect(load).toHaveBeenCalledOnce();
    const incomplete=new Group(),bad=new PlayerCharacter(async()=>incomplete);resources.push(bad);await expect(bad.load()).rejects.toThrow('missing required pose joints');expect(bad.loaded).toBe(false);
    const late=await loader('/models/character/player_character.glb'),mesh=late.getObjectByProperty('isMesh',true) as Mesh,release=vi.spyOn(mesh.geometry,'dispose');let resolve!:(model:Group)=>void;
    const cancelled=new PlayerCharacter(()=>new Promise<Group>(r=>resolve=r)),pending=cancelled.load();cancelled.dispose();resolve(late);await pending;expect(cancelled.loaded).toBe(false);expect(release).toHaveBeenCalledOnce();
    // Empty failed loads are safe to release repeatedly, just like shared world teardown.
    disposeWorld(incomplete);bad.dispose();bad.dispose();
  });
});
