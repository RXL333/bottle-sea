import { readFile } from 'node:fs/promises';
import { afterEach,describe,expect,it,vi } from 'vitest';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { FarmWorld } from './FarmWorld';
import { GameClock } from '../../core/GameClock';
import { GameplayFoundation } from '../../gameplay/GameplayFoundation';
import { TRACTOR_ID,VehicleProgress,normalizeVehicles } from '../../gameplay/vehicles/VehicleState';
import type { ImplementId,HitchPort } from '../../gameplay/vehicles/ImplementRegistry';
import { headingDifference } from '../../gameplay/vehicles/HitchMath';
import { hitsDynamicObstacle } from '../../world/Collision';
import { defaultSave,SaveSystem } from '../../state/SaveSystem';
import { InteractionActions } from '../../systems/InteractionSystem';
import { FARM_OBSTACLES } from './FarmLayout';

const worlds:FarmWorld[]=[];
afterEach(()=>{for(const w of worlds.splice(0))w.dispose();});
const loader=async(url:string)=>{const b=await readFile(new URL('../../../public'+url,import.meta.url));return (await new GLTFLoader().parseAsync(b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength),'')).scene;};
async function setup(saved?:ReturnType<GameplayFoundation['snapshot']>){
  const world=new FarmWorld(loader);worlds.push(world);await world.load();const save=vi.fn(),game=new GameplayFoundation(new GameClock(),saved,undefined,save);
  const enter=()=>world.enter({gameplay:game,gameTime:0,state:{lastSimulatedGameTime:0,discoveries:[]},spawn:world.getSpawnPoint()});enter();
  return {world,game,save,enter,tractor:world.vehicles[0],hitch:world.hitches!};
}
function park(f:Awaited<ReturnType<typeof setup>>,id:ImplementId,port:HitchPort='Hitch_Back',angle=0,side=0){
  const tool=f.world.implements.find(i=>i.id===id)!,yaw=tool.pose.yaw+(port==='Hitch_Front'?Math.PI:0)+angle,front=tool.frontPosition(),offset=f.tractor.hitchPosition(port,{x:0,z:0,yaw});
  const gap=port==='Hitch_Front'?-.3:.3;
  f.game.vehicles.commitFleet({id:TRACTOR_ID,worldId:'FARM',x:front.x+Math.sin(yaw)*gap-offset.x+Math.cos(yaw)*side,z:front.z+Math.cos(yaw)*gap-offset.z-Math.sin(yaw)*side,yaw},f.world.implements.map(i=>i.snapshot()),[]);f.enter();
  return tool;
}
function joined(f:Awaited<ReturnType<typeof setup>>,id:ImplementId,port:HitchPort='Hitch_Back'){
  const tool=f.world.implements.find(i=>i.id===id)!,a=f.tractor.hitchPosition(port),b=tool.frontPosition();
  expect(Math.hypot(a.x-b.x,a.z-b.z)).toBeLessThan(1e-7);expect(Math.abs(a.y-b.y)).toBeLessThan(.25);
  expect(tool.root.position.y).toBeGreaterThanOrEqual(4);expect(Math.abs(headingDifference(tool.pose.yaw,f.tractor.yaw+(port==='Hitch_Front'?Math.PI:0)))).toBeLessThanOrEqual(.70001);
}
describe('real-model farm hitching',()=>{
  it.each(['farm.plow','farm.seeder','farm.trailer'] as const)('attaches %s, follows forward, turning and reverse, then safely detaches',async id=>{
    const f=await setup(),tool=park(f,id);f.tractor.occupy(true);const initial={...f.tractor.pose},inventory=f.game.inventory.snapshot(),farm=f.game.farm.snapshot();
    expect(f.hitch.inspect(id)?.reason).toBeUndefined();expect(f.hitch.interact(id,f.tractor.seatPosition()).status).toBe('success');expect(f.save).toHaveBeenCalledWith(true);joined(f,id);
    for(const input of [{throttle:1,steer:0,brake:false},{throttle:1,steer:.35,brake:false},{throttle:-1,steer:-.35,brake:false}]){
      f.tractor.stop();for(let step=0;step<150;step++){f.tractor.advance(1/120,input);joined(f,id);}
    }
    expect(Math.hypot(f.tractor.pose.x-initial.x,f.tractor.pose.z-initial.z)).toBeGreaterThan(.5);f.tractor.stop();
    const attachedPose=tool.pose;expect(f.hitch.interact(id).status).toBe('success');expect(f.hitch.attachments).toEqual([]);expect(tool.pose).not.toEqual(attachedPose);
    expect(hitsDynamicObstacle(tool.collision.x,tool.collision.z,tool.root.position.y+.44,[f.tractor.collision],.05)).toBe(false);
    expect(f.game.inventory.snapshot()).toEqual(inventory);expect(f.game.farm.snapshot()).toEqual(farm);
    expect(f.game.vehicles.snapshot().implements).toHaveLength(3);
  },20000);
  it('supports the front plow and preserves safe dismount clearance',async()=>{
    const f=await setup();park(f,'farm.plow','Hitch_Front');f.tractor.occupy(true);
    expect(f.hitch.inspect('farm.plow')?.relation.port).toBe('Hitch_Front');expect(f.hitch.interact('farm.plow').status).toBe('success');joined(f,'farm.plow','Hitch_Front');
    const exit=f.tractor.findExit();expect(exit).toBeDefined();const [x,y,z]=exit!.position;
    expect(hitsDynamicObstacle(x,z,y,f.world.implements.map(t=>t.collision),.18)).toBe(false);
  });
  it('stops the entire rig when a wide implement strikes an obstacle outside the tractor path',async()=>{
    const f=await setup(),tool=park(f,'farm.seeder');f.tractor.occupy(true);expect(f.hitch.interact(tool.id).status).toBe('success');
    const obstacle={minX:-13.80,maxX:-13.60,minZ:-2,maxZ:-1.6,minY:4,maxY:5.5};FARM_OBSTACLES.push(obstacle);
    try{
      for(let i=0;i<600;i++)f.tractor.advance(1/120,{throttle:1,steer:0,brake:false});
      expect(f.tractor.speed).toBe(0);expect(f.tractor.pose.z).toBeLessThan(-2);expect(f.tractor.collision.x+f.tractor.collision.halfX).toBeLessThan(obstacle.minX);
      expect(tool.collision.z-tool.collision.halfZ).toBeGreaterThanOrEqual(obstacle.maxZ);joined(f,tool.id);
    }finally{FARM_OBSTACLES.splice(FARM_OBSTACLES.indexOf(obstacle),1);}
    const z=f.tractor.pose.z;f.tractor.advance(.1,{throttle:1,steer:0,brake:false});expect(f.tractor.pose.z).toBeLessThan(z);joined(f,tool.id);
  });
  it('rechecks alignment, speed and blocked separation without mutating the fleet',async()=>{
    const f=await setup();park(f,'farm.seeder','Hitch_Back',.6);const before=f.game.vehicles.snapshot();
    expect(f.hitch.interact('farm.seeder').status).toBe('unavailable');expect(f.game.vehicles.snapshot()).toEqual(before);
    park(f,'farm.seeder');f.tractor.occupy(true);expect(f.hitch.interact('farm.seeder').status).toBe('success');
    f.tractor.advance(.1,{throttle:1,steer:0,brake:false});expect(f.hitch.interact('farm.seeder').message).toContain('停稳');f.tractor.stop();
    const attached=f.game.vehicles.snapshot(),tool=f.world.implements.find(t=>t.id==='farm.seeder')!;
    // Place another actual tool directly behind the mounted seeder, blocking
    // every permitted separation gap. Rejected detach must preserve ownership.
    const blocker=f.world.implements.find(t=>t.id==='farm.trailer')!;blocker.setPose({...tool.pose,z:tool.pose.z+.35});
    expect(f.hitch.interact('farm.seeder').status).toBe('unavailable');expect(f.hitch.attachments).toEqual(attached.attachments);expect(tool.snapshot()).toEqual(attached.implements.find(t=>t.id===tool.id));
    expect(f.save).toHaveBeenCalledTimes(1);
  });
  it('uses the shared E/H dispatch and saves/restores attachments with existing gameplay data',async()=>{
    const f=await setup();park(f,'farm.trailer');f.game.inventory.add('wood',8);f.tractor.occupy(true);
    const actions=new InteractionActions().register('EXIT_VEHICLE',()=>({status:'success',message:'exit'})),context={worldId:'FARM' as const,position:f.tractor.seatPosition(),gameplay:f.game};
    expect((await f.world.interaction.interact(context,actions)).message).toBe('exit');
    expect((await f.world.interaction.interact(context,actions,'vehicle_hitch')).status).toBe('success');
    expect(f.hitch.attachments).toHaveLength(1);
    expect((await f.world.interaction.interact({...context,position:{x:100,y:4,z:100}},actions,'vehicle_hitch')).status).toBe('no-target');
    for(let i=0;i<80;i++)f.tractor.advance(1/60,{throttle:1,steer:.2,brake:false});f.tractor.stop();
    let raw='';const save=new SaveSystem({getItem:()=>raw||null,setItem:(_key,value)=>{raw=value;}}),data={...defaultSave(),...f.game.snapshot()};
    expect(save.save(data)).toBe(true);const loaded=save.load();expect(loaded.vehicles).toEqual(data.vehicles);expect(raw).not.toMatch(/Object3D|MeshStandardMaterial/);
    const restored=await setup(loaded);expect(restored.hitch.attachments).toEqual(f.hitch.attachments);expect(restored.tractor.pose).toEqual(f.tractor.pose);joined(restored,'farm.trailer');
    expect(restored.game.inventory.count('wood')).toBe(8);expect(restored.game.home.chest.count('stone')).toBe(4);
    restored.tractor.occupy(true);expect(restored.hitch.interact('farm.trailer').status).toBe('success');
    expect(save.save({...data,...restored.game.snapshot()})).toBe(true);const detached=await setup(save.load());expect(detached.hitch.attachments).toEqual([]);expect(detached.game.vehicles.snapshot()).toEqual(restored.game.vehicles.snapshot());
  },20000);
});
describe('mounted real-model plowing',()=>{
  function positionRig(f:Awaited<ReturnType<typeof setup>>,port:HitchPort='Hitch_Back'){
    const parent={x:0,z:-11.5,yaw:Math.PI},tool=f.world.implements.find(t=>t.id==='farm.plow')!,joint=f.tractor.hitchPosition(port,parent),yaw=parent.yaw+(port==='Hitch_Front'?Math.PI:0),b=tool.frontLocal;
    const pose={x:joint.x-Math.cos(yaw)*b.x-Math.sin(yaw)*b.z,z:joint.z+Math.sin(yaw)*b.x-Math.cos(yaw)*b.z,yaw};
    f.game.vehicles.commitFleet({id:TRACTOR_ID,worldId:'FARM',...parent},f.world.implements.map(t=>t.id===tool.id?{...t.snapshot(),...pose,workState:'RAISED' as const}:t.snapshot()),[{vehicleId:TRACTOR_ID,implementId:tool.id,port}]);f.enter();f.tractor.occupy(true);return tool;
  }
  it.each(['Hitch_Back','Hitch_Front'] as const)('works through %s only when lowered, with immediate shared soil rendering and atomic saves',async port=>{
    const f=await setup(),tool=positionRig(f,port),ref={fieldId:'field-central',column:5,row:9};
    f.game.inventory.add('seed.wheat',1);f.game.farm.till([ref]);f.game.farm.seed([ref],'wheat');const crop=f.game.farm.getCell(ref),inventory=f.game.inventory.snapshot();f.save.mockClear();
    const before=f.game.farm.snapshot();for(let i=0;i<60;i++)f.tractor.advance(1/120,{throttle:1,steer:0,brake:false});expect(f.game.farm.snapshot()).toEqual(before);
    f.tractor.stop();expect(f.hitch.toggleWork().status).toBe('success');expect(tool.workState).toBe('LOWERED');const stationary=f.game.farm.snapshot();f.tractor.advance(.1,{throttle:0,steer:0,brake:false});expect(f.game.farm.snapshot()).toEqual(stationary);
    const captured:ReturnType<GameplayFoundation['snapshot']>[]=[];
    f.save.mockImplementation(immediate=>{if(immediate){const snapshot=f.game.snapshot();expect(snapshot.vehicles.vehicles[0]).toMatchObject(f.tractor.pose);captured.push(snapshot);}});
    for(let i=0;i<480;i++)f.tractor.advance(1/120,{throttle:1,steer:0,brake:false});f.tractor.stop();
    const tilled=f.game.farm.getField('field-central')!.stateCounts.TILLED;expect(tilled).toBeGreaterThan(8);expect(captured.length).toBeGreaterThan(2);expect(f.game.farm.getCell(ref)).toEqual(crop);expect(f.game.inventory.snapshot()).toEqual(inventory);joined(f,tool.id,port);
    f.world.update({delta:.5,time:0,gameTime:f.game.time.gameTime,storm:0,dayTime:.5,night:0,flash:0});
    expect(tool.root.getObjectByName('ImplementLift')!.rotation.x).toBeLessThan(.01);
    const soils=f.world.root.getObjectsByProperty('name','CropInstances:soil');expect(soils.length).toBeGreaterThan(0);expect((soils[0] as {count?:number}).count).toBe(tilled+1);
    let raw='';const save=new SaveSystem({getItem:()=>raw||null,setItem:(_key,value)=>{raw=value;}});save.save({...defaultSave(),...f.game.snapshot()});const restored=await setup(save.load());
    expect(restored.world.implements.find(t=>t.id===tool.id)!.workState).toBe('LOWERED');expect(restored.game.farm.snapshot()).toEqual(f.game.farm.snapshot());expect(restored.game.inventory.snapshot()).toEqual(inventory);joined(restored,tool.id,port);
    const entry=restored.tractor.entryPosition();entry.y=restored.tractor.root.position.y+.44;
    const boarding=new InteractionActions().register('ENTER_VEHICLE',()=>({status:'success',message:'board'}));
    expect((await restored.world.interaction.interact({worldId:'FARM',position:entry,gameplay:restored.game},boarding)).message).toBe('board');
    const unchanged=restored.game.farm.snapshot();restored.world.update({delta:.016,time:0,gameTime:0,storm:0,dayTime:.5,night:0,flash:0});expect(restored.game.farm.snapshot()).toEqual(unchanged);
    expect(f.hitch.toggleWork().status).toBe('success');expect(tool.workState).toBe('RAISED');const raised=f.game.farm.snapshot();for(let i=0;i<120;i++)f.tractor.advance(1/120,{throttle:1,steer:0,brake:false});expect(f.game.farm.snapshot()).toEqual(raised);
  },20000);
  it('requires a mounted plow and keeps detached or restored tools from working',async()=>{
    const f=await setup();expect(f.hitch.toggleWork().status).toBe('unavailable');const tool=positionRig(f);f.hitch.toggleWork();f.tractor.stop();
    expect(f.hitch.interact(tool.id).status).toBe('success');expect(tool.workState).toBe('RAISED');expect(f.hitch.toggleWork().status).toBe('unavailable');
    const before=f.game.farm.snapshot();for(let i=0;i<240;i++)f.tractor.advance(1/120,{throttle:1,steer:0,brake:false});expect(f.game.farm.snapshot()).toEqual(before);
    const actions=new InteractionActions().register('EXIT_VEHICLE',()=>({status:'success',message:'exit'}));
    expect((await f.world.interaction.interact({worldId:'FARM',position:f.tractor.seatPosition(),gameplay:f.game},actions,'vehicle_work')).status).toBe('unavailable');
  });
});
it('migrates old vehicle saves and removes duplicate, incompatible or dangling relations',()=>{
  const vehicle={id:TRACTOR_ID,worldId:'FARM',x:0,z:0,yaw:0};expect(normalizeVehicles({version:1,vehicles:[vehicle]})).toEqual({version:2,vehicles:[vehicle],implements:[],attachments:[]});
  const plow={...vehicle,id:'farm.plow'},trailer={...vehicle,id:'farm.trailer'},a={vehicleId:TRACTOR_ID,implementId:'farm.plow',port:'Hitch_Back'};
  const progress=new VehicleProgress({vehicles:[vehicle,vehicle],implements:[plow,plow,trailer],attachments:[a,a,{...a,implementId:'farm.trailer'},{...a,implementId:'farm.trailer',port:'Hitch_Front'},{...a,implementId:'farm.seeder'}]});
  expect(progress.snapshot().attachments).toEqual([a]);expect(progress.snapshot().implements).toHaveLength(2);progress.record({...vehicle,worldId:'FARM',x:2});expect(progress.snapshot().attachments).toEqual([a]);
  const clone=progress.snapshot();clone.implements[0].x=99;expect(progress.snapshot().implements[0].x).toBe(0);expect(normalizeVehicles({implements:[{...plow,x:NaN}]}).implements).toEqual([]);
});
it('defaults old plows to raised and persists only supported work modes',()=>{
  const pose={id:'farm.plow',worldId:'FARM',x:0,z:-12,yaw:0};
  expect(normalizeVehicles({implements:[pose]}).implements[0].workState).toBe('RAISED');
  expect(normalizeVehicles({implements:[{...pose,workState:'LOWERED'}]}).implements[0].workState).toBe('LOWERED');
  expect(normalizeVehicles({implements:[{...pose,workState:'broken'}]}).implements[0].workState).toBe('RAISED');
  expect(normalizeVehicles({implements:[{...pose,id:'farm.trailer',workState:'LOWERED'}]}).implements[0].workState).toBeUndefined();
});

describe('mounted real-model seeding',()=>{
  function positionSeeder(f:Awaited<ReturnType<typeof setup>>){
    const parent={x:0,z:-10,yaw:Math.PI},tool=f.world.implements.find(t=>t.id==='farm.seeder')!,joint=f.tractor.hitchPosition('Hitch_Back',parent),b=tool.frontLocal,yaw=parent.yaw;
    const pose={x:joint.x-Math.cos(yaw)*b.x-Math.sin(yaw)*b.z,z:joint.z+Math.sin(yaw)*b.x-Math.cos(yaw)*b.z,yaw};
    f.game.vehicles.commitFleet({id:TRACTOR_ID,worldId:'FARM',...parent},f.world.implements.map(t=>t.id===tool.id?{...t.snapshot(),...pose,workState:'RAISED' as const,seedCropId:'wheat'}:t.snapshot()),[{vehicleId:TRACTOR_ID,implementId:tool.id,port:'Hitch_Back'}]);f.enter();f.tractor.occupy(true);return tool;
  }
  it('stops on exhaustion, commits fleet + seed debit + crops together, and restores without planting',async()=>{
    const f=await setup(),tool=positionSeeder(f),region={kind:'bounds' as const,minX:-6,maxX:6,minZ:-30,maxZ:-12};f.game.farm.till(f.game.farm.cellsInArea(region));
    f.game.inventory.add('seed.corn',5);expect(f.hitch.selectSeed('corn').status).toBe('success');const before=f.game.snapshot();
    for(let n=0;n<60;n++)f.tractor.advance(1/120,{throttle:1,steer:0,brake:false});expect(f.game.farm.snapshot()).toEqual(before.farm);expect(f.game.inventory.count('seed.corn')).toBe(5);
    f.tractor.stop();expect(f.hitch.toggleWork().status).toBe('success');const stationary=f.game.snapshot();f.tractor.advance(.1,{throttle:0,steer:0,brake:false});expect(f.game.snapshot()).toEqual(stationary);
    const captures:ReturnType<GameplayFoundation['snapshot']>[]=[];f.save.mockImplementation(()=>{const snapshot=f.game.snapshot();if(snapshot.inventory.slots.filter(s=>s?.itemId==='seed.corn').reduce((sum,s)=>sum+s!.quantity,0)===0){expect(snapshot.vehicles.implements.find(t=>t.id===tool.id)!.workState).toBe('RAISED');}expect(snapshot.vehicles.vehicles[0]).toMatchObject(f.tractor.pose);captures.push(snapshot);});
    for(let n=0;n<480;n++)f.tractor.advance(1/120,{throttle:1,steer:0,brake:false});f.tractor.stop();joined(f,tool.id);
    expect(f.game.farm.getField('field-central')!.stateCounts.SEEDED).toBe(5);expect(f.game.inventory.count('seed.corn')).toBe(0);expect(tool.workState).toBe('RAISED');expect(f.hitch.workHint).toContain('种子不足');expect(captures.length).toBeGreaterThan(0);
    const stopped=f.game.snapshot();for(let n=0;n<120;n++)f.tractor.advance(1/120,{throttle:-1,steer:.3,brake:false});f.tractor.stop();expect(f.game.farm.snapshot()).toEqual(stopped.farm);expect(f.game.inventory.snapshot()).toEqual(stopped.inventory);
    let raw='';const save=new SaveSystem({getItem:()=>raw||null,setItem:(_key,value)=>{raw=value;}});save.save({...defaultSave(),...f.game.snapshot()});const restored=await setup(save.load()),restoredTool=restored.world.implements.find(t=>t.id===tool.id)!;
    expect(restoredTool.seedCropId).toBe('corn');expect(restoredTool.workState).toBe('RAISED');expect(restored.game.inventory.snapshot()).toEqual(f.game.inventory.snapshot());expect(restored.game.farm.snapshot()).toEqual(f.game.farm.snapshot());
    restored.tractor.occupy(true);expect(restored.hitch.toggleWork().status).toBe('unavailable');expect(restoredTool.workState).toBe('RAISED');
    restored.game.inventory.add('seed.potato',8);expect(restored.hitch.selectSeed('potato').status).toBe('success');expect(restored.hitch.toggleWork().status).toBe('success');
    const active=await setup(restored.game.snapshot());expect(active.world.implements.find(t=>t.id===tool.id)!.snapshot()).toMatchObject({seedCropId:'potato',workState:'LOWERED'});expect(active.game.farm.snapshot()).toEqual(restored.game.farm.snapshot());
  },20000);
  it('selects through shared interaction dispatch, supports K cycling, and detaches without debiting seeds',async()=>{
    const f=await setup(),tool=positionSeeder(f);for(const crop of f.game.crops.registry.list())f.game.inventory.add(crop.seedItemId,4);
    const actions=new InteractionActions(),context={worldId:'FARM' as const,position:f.tractor.seatPosition(),gameplay:f.game};
    expect((await f.world.interaction.interact(context,actions,'vehicle_seed:potato')).status).toBe('success');expect(tool.seedCropId).toBe('potato');
    expect((await f.world.interaction.interact(context,actions,'vehicle_seed:next')).status).toBe('success');expect(tool.seedCropId).toBe('wheat');expect(f.hitch.selectSeed('bad').status).toBe('unavailable');
    expect(f.hitch.seedChoices).toMatchObject([{id:'wheat',selected:true,count:4},{id:'corn',selected:false,count:4},{id:'potato',selected:false,count:4}]);
    f.hitch.toggleWork();const before=f.game.snapshot();expect(f.hitch.interact(tool.id).status).toBe('success');expect(tool.workState).toBe('RAISED');expect(f.hitch.seedChoices).toEqual([]);
    for(let n=0;n<240;n++)f.tractor.advance(1/120,{throttle:1,steer:0,brake:false});expect(f.game.farm.snapshot()).toEqual(before.farm);expect(f.game.inventory.snapshot()).toEqual(before.inventory);
  });
  it('defaults old seeder saves safely and validates crop selections centrally',()=>{
    const pose={id:'farm.seeder',worldId:'FARM',x:0,z:-12,yaw:0};
    expect(normalizeVehicles({implements:[pose]}).implements[0]).toMatchObject({workState:'RAISED',seedCropId:'wheat'});
    expect(normalizeVehicles({implements:[{...pose,workState:'LOWERED',seedCropId:'potato'}]}).implements[0]).toMatchObject({workState:'LOWERED',seedCropId:'potato'});
    expect(normalizeVehicles({implements:[{...pose,seedCropId:'fake'}]}).implements[0].seedCropId).toBe('wheat');
    expect(normalizeVehicles({implements:[{...pose,id:'farm.plow',seedCropId:'corn'}]}).implements[0].seedCropId).toBeUndefined();
  });
});

