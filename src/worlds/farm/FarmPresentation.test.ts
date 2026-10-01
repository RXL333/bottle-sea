import { expect,it } from 'vitest';
import { InstancedMesh,Vector3 } from 'three';
import { GameClock } from '../../core/GameClock';
import { GameplayFoundation } from '../../gameplay/GameplayFoundation';
import { Inventory } from '../../gameplay/Inventory';
import { FarmCropPresentation } from './FarmCropPresentation';
import { FarmEffects } from './FarmEffects';
import { disposeWorld } from '../disposeWorld';
import type { FarmMachineFeedback } from './FarmPresentation';
import { readFile } from 'node:fs/promises';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { FarmAssets } from './FarmAssets';
import type { FarmAssetId } from './FarmAssets';
import { BoxGeometry,Group,Mesh,MeshStandardMaterial } from 'three';

const ref={fieldId:'field-central',column:5,row:17};
function fixture(){const clock=new GameClock(),game=new GameplayFoundation(clock),view=new FarmCropPresentation(()=>undefined);view.refresh(game,true);return {clock,game,view};}
it('emits feedback once for committed work, never for failures, growth or restoration',()=>{
  const {clock,game,view}=fixture();expect(view.drainChanges()).toEqual([]);
  game.farm.till([ref]);view.refresh(game);expect(view.drainChanges().map(e=>e.kind)).toEqual(['till']);
  game.farm.till([ref]);game.farm.seed([ref],'wheat');view.refresh(game);expect(view.drainChanges()).toEqual([]);
  game.inventory.add('seed.wheat',1);game.farm.seed([ref],'wheat');view.refresh(game);expect(view.drainChanges().map(e=>e.kind)).toEqual(['seed']);
  expect(game.farm.till([ref]).ok).toBe(false);expect(game.farm.harvest([ref]).ok).toBe(false);view.refresh(game);expect(view.drainChanges()).toEqual([]);
  clock.advanceGameMinutes(game.crops.registry.get('wheat')!.growthGameMinutes);view.refresh(game);expect(game.farm.getCell(ref)!.landState).toBe('MATURE');expect(view.drainChanges()).toEqual([]);
  const full=new Inventory(game.items,1);full.add('wood',game.items.get('wood')!.maxStack);
  expect(game.farm.harvest([ref],full).ok).toBe(false);view.refresh(game);expect(view.drainChanges()).toEqual([]);
  game.farm.harvest([ref]);view.refresh(game);expect(view.drainChanges().map(e=>e.kind)).toEqual(['harvest']);view.refresh(game);expect(view.drainChanges()).toEqual([]);
  const before=game.snapshot();view.refresh(game,true);expect(view.drainChanges()).toEqual([]);expect(game.snapshot()).toEqual(before);disposeWorld(view);
});
it('keeps all 648 essential cells and crop stages visible on LOW without per-frame matrix writes',()=>{
  const {clock,game,view}=fixture(),now=clock.simulationTime;
  for(const [index,crop] of game.crops.registry.list().entries())for(let stage=0;stage<4;stage++){
    const cell={fieldId:game.farm.definitions[index].id,column:stage,row:4};
    clock.simulationTime=now-crop.stages[stage].startsAtGameMinute*480/1440;game.farm.till([cell]);game.inventory.add(crop.seedItemId,1);game.farm.seed([cell],crop.id);
  }
  clock.simulationTime=now;view.refresh(game);const before=game.snapshot();view.applyQuality('HIGH');
  const meshes:InstancedMesh[]=[];view.traverse(o=>{if(o instanceof InstancedMesh)meshes.push(o);});
  expect(view.userData.visibleCropCells).toBe(12);expect(Object.values(view.userData.stateCounts).reduce((a,b)=>Number(a)+Number(b),0)).toBe(648);
  const cropMesh=meshes.find(m=>m.name==='CropInstances:crop.wheat.mature')!,matrices=cropMesh.instanceMatrix.array.slice(),version=cropMesh.instanceMatrix.version;
  expect(cropMesh.castShadow).toBe(true);view.animate(50);view.animate(70);expect(cropMesh.instanceMatrix.version).toBe(version);expect(cropMesh.instanceMatrix.array).toEqual(matrices);
  view.applyQuality('LOW');expect(cropMesh.castShadow).toBe(false);expect(cropMesh.count).toBe(1);expect(view.userData.visibleCropCells).toBe(12);expect(game.snapshot()).toEqual(before);disposeWorld(view);
});
it('bounds particles, keeps effect coordinates in world space and expires them, including LOW audio',()=>{
  const {game,view}=fixture(),fx=new FarmEffects(),listener=new Vector3(0,4,-10),event={kind:'harvest' as const,x:0,y:4,z:-10,cropId:'wheat'};
  fx.applyQuality('HIGH');fx.update(.016,Array.from({length:1000},()=>event),[],listener,game.farm,0);
  expect(fx.emitted).toBe(120);expect(fx.activeParticles).toBeLessThanOrEqual(256);expect(fx.scale.toArray()).toEqual([1,1,1]);expect(fx.drainSounds()).toHaveLength(1);
  for(let i=0;i<12;i++)fx.update(.1,[],[],listener,game.farm,0);expect(fx.activeParticles).toBe(0);
  fx.applyQuality('LOW');fx.update(.016,[event],[],listener,game.farm,0);expect(fx.activeParticles).toBe(0);expect(fx.drainSounds()).toHaveLength(1);
  fx.applyQuality('MEDIUM');fx.update(.016,[event],[],new Vector3(100,4,100),game.farm,0);expect(fx.activeParticles).toBe(0);expect(fx.drainSounds()).toEqual([]);disposeWorld(fx);disposeWorld(view);
});
it('emits bounded machine dust only while moving on dry dirt nearby',()=>{
  const {game,view}=fixture(),fx=new FarmEffects(),listener=new Vector3(0,4,-10);
  const machine:FarmMachineFeedback={id:'tractor',x:0,y:4,z:-10.5,yaw:0,speed:2,occupied:true,workEnabled:false,operations:0};
  for(const speed of [0,.1])fx.update(.1,[],[{...machine,speed}],listener,game.farm,0);expect(fx.emitted).toBe(0);
  fx.update(.1,[],[machine],listener,game.farm,1);expect(fx.emitted).toBe(0);
  fx.update(.1,[],[{...machine,x:35,z:8}],new Vector3(35,4,8),game.farm,0);expect(fx.emitted).toBe(0);
  for(let i=0;i<20;i++)fx.update(.1,[],Array.from({length:20},(_,n)=>({...machine,id:String(n)})),listener,game.farm,0);
  expect(fx.emitted).toBeGreaterThan(0);expect(fx.emitted).toBeLessThanOrEqual(56);expect(fx.activeParticles).toBeLessThanOrEqual(128);fx.reset();expect(fx.activeParticles).toBe(0);disposeWorld(fx);disposeWorld(view);
});
it('renders all real registered stage models with material batching and releases wind depth resources',async()=>{
  const assets=new FarmAssets(async url=>{const data=await readFile(new URL('../../../public'+url,import.meta.url));return (await new GLTFLoader().parseAsync(data.buffer.slice(data.byteOffset,data.byteOffset+data.byteLength),'')).scene;});await assets.load();
  const {clock,game,view:unused}=fixture();disposeWorld(unused);const view=new FarmCropPresentation(id=>assets.instance(id as FarmAssetId)),root=new Group();root.add(view,assets.sources);const now=clock.simulationTime;
  for(const [index,crop] of game.crops.registry.list().entries())for(const [column,stage] of crop.stages.entries()){
    const cell={fieldId:game.farm.definitions[index].id,column,row:5};clock.simulationTime=now-stage.startsAtGameMinute*480/1440;game.farm.till([cell]);game.inventory.add(crop.seedItemId,1);game.farm.seed([cell],crop.id);
  }
  clock.simulationTime=now;view.refresh(game,true);view.applyQuality('HIGH');let draws=0,depthReleased=0;
  view.traverse(o=>{if(o instanceof InstancedMesh&&o.visible&&o.name.startsWith('CropInstances:crop.')){draws++;expect(o.count).toBe(1);if(o.customDepthMaterial)o.customDepthMaterial.addEventListener('dispose',()=>depthReleased++);}});
  expect(draws).toBeGreaterThanOrEqual(12);expect(draws).toBeLessThan(80);expect(view.userData.visibleCropCells).toBe(12);
  const source=assets.instance('crop_corn_mature');let parts=0;source.traverse(o=>{if(o instanceof Mesh)parts++;});const batches=view.getObjectsByProperty('name','CropInstances:crop.corn.mature');expect(batches.length).toBeLessThanOrEqual(parts);
  disposeWorld(root);expect(depthReleased).toBeGreaterThan(0);
});
it('merges repeated model parts of the same material without modifying shared assets',()=>{
  const {clock,game,view:unused}=fixture();disposeWorld(unused);const material=new MeshStandardMaterial(),geometry=new BoxGeometry(.1,.2,.1),source=new Group();
  for(let i=0;i<20;i++){const mesh=new Mesh(geometry,material);mesh.position.x=i*.01;source.add(mesh);}
  const view=new FarmCropPresentation(()=>source.clone(true));game.farm.till([ref]);game.inventory.add('seed.wheat',1);game.farm.seed([ref],'wheat');clock.advanceGameMinutes(4320);view.refresh(game);
  const batches=view.getObjectsByProperty('name','CropInstances:crop.wheat.mature');expect(batches).toHaveLength(1);expect((batches[0] as InstancedMesh).geometry.getAttribute('position').count).toBe(20*36);expect(source.children).toHaveLength(20);disposeWorld(view);
});
