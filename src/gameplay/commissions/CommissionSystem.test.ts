import { expect,it,vi } from 'vitest';
import { Group,Scene } from 'three';
import { GameClock } from '../../core/GameClock';
import { GameplayFoundation } from '../GameplayFoundation';
import { SaveSystem,defaultSave,migrateSave,SAVE_KEY } from '../../state/SaveSystem';
import { CommissionRegistry,COMMISSIONS } from './CommissionRegistry';
import { normalizeCommissions } from './CommissionState';
import { GrainTank } from '../vehicles/GrainTank';
import { MAX_COINS } from '../economy/TradeCatalog';
import { WorldManager } from '../../worlds/WorldManager';
import { WorldRegistry } from '../../worlds/WorldRegistry';
import { WorldStateRegistry } from '../../state/WorldStateRegistry';
import type { GameWorld } from '../../worlds/types';
const cell=(column=0)=>({fieldId:'field-central',column,row:0});
function fixture(){const clock=new GameClock(),g=new GameplayFoundation(clock);return {clock,g};}
function catchFish(g:GameplayFoundation){
  expect(g.fishing.interact().status).toBe('success');
  for(let i=0;i<4000&&g.fishing.state!=='IDLE';i++){
    if(g.fishing.state==='BITE')g.fishing.interact();
    if(g.fishing.state==='FIGHTING'){if(g.fishing.tension<g.fishing.zoneStart+g.fishing.zoneWidth/2)g.fishing.press();else g.fishing.release();}
    g.fishing.update(.05);
  }
  expect(g.fishing.state).toBe('IDLE');
}

it('registers twelve immutable commissions with all four real NPC owners and validated references',()=>{
  expect(COMMISSIONS.list()).toHaveLength(12);for(const id of ['lighthouse_keeper','merchant_captain','fisherman','farm_steward'])expect(COMMISSIONS.list(id)).toHaveLength(3);
  const r=new CommissionRegistry(),d=COMMISSIONS.get('farm.wheat')!;r.register(d);expect(()=>r.register(d)).toThrow();expect(()=>r.register({...d,id:'unknown',npcId:'none'})).toThrow();expect(()=>r.register({...d,id:'bad',objectives:[{kind:'delivery',itemId:'none',quantity:1}]})).toThrow();
  expect(Object.isFrozen(d.rewards.items[0])).toBe(true);expect(Object.isFrozen(d.objectives)).toBe(true);
  expect(()=>r.register({...d,id:'duplicate.goal',objectives:[...d.objectives,...d.objectives]})).toThrow();
});
it('requires the publishing NPC and acceptance; accepted and completed requests are idempotent',()=>{
  const {g}=fixture(),c=g.commissions;expect(c.submit('fisher.sardines','fisherman')).toMatchObject({ok:false,reason:'not-accepted'});
  expect(c.accept('fisher.sardines','farm_steward')).toMatchObject({ok:false,reason:'wrong-npc'});expect(c.accept('missing','fisherman')).toMatchObject({ok:false,reason:'unknown'});
  expect(c.accept('fisher.sardines','fisherman').ok).toBe(true);const before=c.snapshot();expect(c.accept('fisher.sardines','fisherman')).toMatchObject({ok:false,reason:'already-accepted'});expect(c.snapshot()).toEqual(before);
  g.inventory.add('fish.sardine',2);expect(c.view('fisher.sardines')!.status).toBe('READY');const balance=g.economy.coins;
  expect(c.submit('fisher.sardines','fisherman').ok).toBe(true);expect(g.inventory.count('fish.sardine')).toBe(0);expect(g.inventory.count('seed.potato')).toBe(2);expect(g.economy.coins).toBe(balance+32);
  expect(c.view('fisher.sardines')!.status).toBe('COMPLETED');expect(c.view('fisher.sardines')!.progress[0].current).toBe(2);
  const done=g.snapshot();expect(c.submit('fisher.sardines','fisherman')).toMatchObject({ok:false,reason:'completed'});expect(c.accept('fisher.sardines','fisherman')).toMatchObject({ok:false,reason:'completed'});expect(g.snapshot()).toEqual(done);
});
it('delivery readiness reads current backpack, reverses after spending, and ignores warehouses',()=>{
  const {g}=fixture();g.commissions.accept('farm.wheat','farm_steward');g.barn.add('crop.wheat',30);g.home.chest.add('crop.wheat',3);
  expect(g.commissions.view('farm.wheat')!.status).toBe('ACTIVE');g.inventory.add('crop.wheat',3);expect(g.commissions.view('farm.wheat')!.status).toBe('READY');g.inventory.remove('crop.wheat');
  const state=g.snapshot();expect(g.commissions.submit('farm.wheat','farm_steward')).toMatchObject({ok:false,reason:'insufficient-items'});expect(g.snapshot()).toEqual(state);
});
it('rejects a full reward bag atomically but permits a full bag when delivery frees a slot',()=>{
  const {g}=fixture();g.commissions.accept('fisher.sardines','fisherman');g.inventory.add('fish.sardine',3);g.inventory.add('wood',23*99);
  const before=g.snapshot();expect(g.commissions.submit('fisher.sardines','fisherman')).toMatchObject({ok:false,reason:'full'});expect(g.snapshot()).toEqual(before);
  g.inventory.remove('fish.sardine');expect(g.inventory.emptySlots).toBe(0);expect(g.commissions.submit('fisher.sardines','fisherman').ok).toBe(true);expect(g.inventory.count('seed.potato')).toBe(2);expect(g.inventory.emptySlots).toBe(0);
});
it('checks all multi-item deliveries and all rewards without partial removal',()=>{
  const {g}=fixture();g.commissions.accept('farm.neighbours','farm_steward');g.inventory.add('livestock.egg');g.inventory.add('livestock.milk');const before=g.snapshot();
  expect(g.commissions.submit('farm.neighbours','farm_steward')).toMatchObject({ok:false,reason:'insufficient-items'});expect(g.snapshot()).toEqual(before);
  g.inventory.add('livestock.wool');expect(g.commissions.submit('farm.neighbours','farm_steward').ok).toBe(true);for(const id of ['livestock.egg','livestock.milk','livestock.wool'])expect(g.inventory.count(id)).toBe(0);
  expect(g.inventory.count('feed.basic')).toBe(6);expect(g.progression.canAccess('capacity.upgrades')).toBe(true);expect(g.progression.completed('first_sale')).toBe(false);
});
it('rejects currency overflow before any item removal or completion',()=>{
  const {g}=fixture();g.economy.credit(MAX_COINS-g.economy.coins);g.commissions.accept('fisher.sardines','fisherman');g.inventory.add('fish.sardine',2);const before=g.snapshot();
  expect(g.commissions.submit('fisher.sardines','fisherman')).toMatchObject({ok:false,reason:'balance-limit'});expect(g.snapshot()).toEqual(before);
});
it('production counters ignore purchased, transferred and rewarded items; real cooking counts after acceptance',()=>{
  const {g}=fixture();g.inventory.add('fish.sardine',4);g.cooking.start('grill');g.cooking.update(3);g.commissions.accept('merchant.supper','merchant_captain');
  g.inventory.add('food.grilled_fish',5);expect(g.commissions.view('merchant.supper')!.progress[0].current).toBe(0);expect(g.commissions.submit('merchant.supper','merchant_captain')).toMatchObject({ok:false,reason:'not-ready'});
  for(let i=0;i<2;i++){expect(g.cooking.start('grill').ok).toBe(true);g.cooking.update(3);}
  expect(g.commissions.view('merchant.supper')!.status).toBe('READY');expect(g.commissions.submit('merchant.supper','merchant_captain').ok).toBe(true);expect(g.inventory.count('food.grilled_fish')).toBe(6);expect(g.progression.snapshot().grants).toContain('recipe.soup');
});
it('actual hand and grain-tank harvests count produced quantities once, failed harvest and transfers count nothing',()=>{
  const {g,clock}=fixture();g.commissions.accept('farm.harvest','farm_steward');g.inventory.add('seed.wheat',2);g.farm.till([cell(0),cell(1)]);g.farm.seed([cell(0),cell(1)],'wheat');
  expect(g.farm.harvest([cell(0)]).ok).toBe(false);expect(g.commissions.view('farm.harvest')!.progress[0].current).toBe(0);clock.advanceGameMinutes(4*1440);
  expect(g.farm.harvest([cell(0)]).ok).toBe(true);expect(g.commissions.view('farm.harvest')!.progress[0].current).toBe(3);
  const tank=new GrainTank();expect(g.farm.harvest([cell(1)],tank).ok).toBe(true);expect(g.commissions.view('farm.harvest')!.status).toBe('READY');tank.unloadTo(g.inventory);expect(g.farm.harvest([cell(1)]).ok).toBe(false);expect(g.commissions.view('farm.harvest')!.progress[0].current).toBe(6);
});
it('actual catch state machine counts three catches, including one pending catch exactly once',()=>{
  const {g}=fixture();g.commissions.accept('fisher.practice','fisherman');g.inventory.add('fish.tuna',3);expect(g.commissions.view('fisher.practice')!.progress[0].current).toBe(0);
  catchFish(g);catchFish(g);expect(g.commissions.view('fisher.practice')!.progress[0].current).toBe(2);
  expect(g.fishing.interact().status).toBe('success');
  for(let i=0;i<4000&&g.fishing.state!=='IDLE';i++){
    if(g.fishing.state==='BITE')g.fishing.interact();if(g.fishing.state==='FIGHTING'){if(g.fishing.tension<g.fishing.zoneStart+g.fishing.zoneWidth/2)g.fishing.press();else g.fishing.release();}
    if(g.fishing.state==='REELING'){for(const s of g.inventory.snapshot().slots)if(s&&s.itemId.startsWith('fish.'))g.inventory.add(s.itemId,g.items.get(s.itemId)!.maxStack-s.quantity);while(g.inventory.emptySlots)g.inventory.add('wood',99);}g.fishing.update(.05);
  }
  expect(g.fishing.pendingCatch).not.toBeNull();expect(g.commissions.view('fisher.practice')!.progress[0].current).toBe(3);
  const pending=g.fishing.pendingCatch!;g.inventory.removeFromSlot(23,99);expect(g.fishing.interact().status).toBe('success');expect(g.inventory.count(pending)).toBeGreaterThan(0);expect(g.commissions.view('fisher.practice')!.progress[0].current).toBe(3);
});
it('failed fishing and cooking cannot advance production goals',()=>{
  const {g}=fixture();g.commissions.accept('fisher.practice','fisherman');g.commissions.accept('merchant.supper','merchant_captain');g.fishing.interact();g.fishing.cancel();expect(g.cooking.start('grill').ok).toBe(false);g.cooking.update(3);
  expect(g.commissions.view('fisher.practice')!.progress[0].current).toBe(0);expect(g.commissions.view('merchant.supper')!.progress[0].current).toBe(0);
});
it('exploration uses existing discoveries and actual travel milestones, including previous discoveries',()=>{
  const {g}=fixture();g.commissions.accept('keeper.old_anchor','lighthouse_keeper');expect(g.commissions.view('keeper.old_anchor',[])!.status).toBe('ACTIVE');expect(g.commissions.view('keeper.old_anchor',['anchor'])!.status).toBe('READY');
  expect(g.commissions.submit('keeper.old_anchor','lighthouse_keeper',[])).toMatchObject({ok:false,reason:'not-ready'});expect(g.commissions.submit('keeper.old_anchor','lighthouse_keeper',['anchor']).ok).toBe(true);
  g.progression.record('farm.visit');g.commissions.accept('keeper.farm_chart','lighthouse_keeper');expect(g.commissions.view('keeper.farm_chart')!.status).toBe('READY');expect(g.commissions.submit('keeper.farm_chart','lighthouse_keeper').ok).toBe(true);
});
it('advanced bulk orders unlock through existing home-cycle progression without blocking beginner requests',()=>{
  const {g}=fixture();expect(g.commissions.accept('merchant.wheat','merchant_captain')).toMatchObject({ok:false,reason:'locked'});expect(g.commissions.accept('merchant.supper','merchant_captain').ok).toBe(true);
  g.progression.record('fish.catch');g.progression.record('cook.complete');g.home.sleep();expect(g.commissions.accept('merchant.wheat','merchant_captain').ok).toBe(true);
});
it('saving a successful submission publishes exactly one complete resource snapshot',()=>{
  const clock=new GameClock(),snapshots:ReturnType<GameplayFoundation['snapshot']>[]=[],changed=vi.fn(()=>snapshots.push(g.snapshot())),g=new GameplayFoundation(clock,undefined,undefined,changed);
  g.commissions.accept('farm.neighbours','farm_steward');for(const id of ['livestock.egg','livestock.milk','livestock.wool'])g.inventory.add(id);snapshots.length=0;changed.mockClear();
  expect(g.commissions.submit('farm.neighbours','farm_steward').ok).toBe(true);expect(changed).toHaveBeenCalledOnce();expect(snapshots[0]).toEqual(g.snapshot());expect(snapshots[0].progression.grants).toContain('capacity.upgrades');expect(snapshots[0].commissions.records['farm.neighbours'].completedAt).not.toBeNull();
});
it('rolls all resource owners back if a reward owner rejects a prevalidated commit',()=>{
  const {g}=fixture();g.commissions.accept('fisher.sardines','fisherman');g.inventory.add('fish.sardine',2);const before=g.snapshot();vi.spyOn(g.economy,'credit').mockReturnValue(false);
  expect(g.commissions.submit('fisher.sardines','fisherman')).toMatchObject({ok:false,reason:'failed'});expect(g.snapshot()).toEqual(before);
});
it('rejects reentrant reward requests during commit as well as repeats afterwards',()=>{
  const {g}=fixture();g.commissions.accept('fisher.sardines','fisherman');g.inventory.add('fish.sardine',2);const credit=g.economy.credit.bind(g.economy);let nested:unknown;
  vi.spyOn(g.economy,'credit').mockImplementation(amount=>{nested=g.commissions.submit('fisher.sardines','fisherman');return credit(amount);});expect(g.commissions.submit('fisher.sardines','fisherman').ok).toBe(true);expect(nested).toMatchObject({ok:false,reason:'busy'});expect(g.economy.coins).toBe(132);
});
it('round trips partially produced, ready and completed commissions and granted content through real SaveSystem',()=>{
  const {clock,g}=fixture(),values=new Map<string,string>(),save=new SaveSystem({getItem:k=>values.get(k)??null,setItem:(k,v)=>values.set(k,v)});
  g.commissions.accept('merchant.supper','merchant_captain');g.inventory.add('fish.sardine',2);g.cooking.start('grill');g.cooking.update(3);g.commissions.accept('keeper.old_anchor','lighthouse_keeper');g.commissions.submit('keeper.old_anchor','lighthouse_keeper',['anchor']);g.commissions.accept('farm.neighbours','farm_steward');for(const id of ['livestock.egg','livestock.milk','livestock.wool'])g.inventory.add(id);g.commissions.submit('farm.neighbours','farm_steward');g.home.sleep();
  g.collections.syncDiscoveries(['anchor']);const data={...defaultSave(),...g.snapshot(),gameTime:clock.snapshot()};data.player.discoveries=['anchor'];expect(save.save(data)).toBe(true);const loaded=save.load(),restoredClock=new GameClock();restoredClock.restore(loaded.gameTime);const next=new GameplayFoundation(restoredClock,loaded);
  expect(next.snapshot()).toEqual(g.snapshot());expect(next.commissions.view('merchant.supper')!.progress[0].current).toBe(1);expect(next.commissions.submit('keeper.old_anchor','lighthouse_keeper',loaded.player.discoveries)).toMatchObject({ok:false,reason:'completed'});expect(next.progression.canAccess('capacity.upgrades')).toBe(true);
  expect(values.has(SAVE_KEY)).toBe(true);expect(next.cooking.start('grill').ok).toBe(true);next.cooking.update(3);expect(next.commissions.view('merchant.supper')!.status).toBe('READY');
});
it.each([1,2])('old version %s saves receive empty commissions and retain their original resources',version=>{
  const original=defaultSave(),old:Record<string,unknown>={...original,version};delete old.commissions;const restored=migrateSave(old);expect(restored.commissions).toEqual({version:1,records:{}});expect(restored.barn).toEqual(original.barn);expect(restored.vehicles).toEqual(original.vehicles);expect(restored.player).toEqual(original.player);expect(restored.economy).toEqual(original.economy);
});
it('sanitizes malformed records, progress, unknown ids and schema versions without trusting readiness',()=>{
  const snapshot=normalizeCommissions({version:1,records:{unknown:{acceptedAt:0,completedAt:0},'farm.harvest':{acceptedAt:0,completedAt:null,production:[999]},'fisher.practice':{acceptedAt:-1,completedAt:null},'merchant.supper':{acceptedAt:1,completedAt:null,production:[Infinity,100]},'keeper.old_anchor':{acceptedAt:0,completedAt:999,production:[]}}},10);
  expect(Object.keys(snapshot.records)).toHaveLength(3);expect(snapshot.records['farm.harvest'].production).toEqual([6]);expect(snapshot.records['merchant.supper'].production).toEqual([0,0]);expect(snapshot.records['keeper.old_anchor'].completedAt).toBe(10);
  expect(normalizeCommissions({version:99,records:snapshot.records},10).records).toEqual({});const {g}=fixture();const clone=g.commissions.snapshot();clone.records['keeper.ruins']={acceptedAt:0,completedAt:0,production:[]};expect(g.commissions.view('keeper.ruins')!.status).toBe('AVAILABLE');
});
it('shares commission state across HOME, COTTAGE, TRAVEL and FARM lifecycles',async()=>{
  const {clock,g}=fixture(),registry=new WorldRegistry();
  for(const id of ['HOME','COTTAGE','TRAVEL','FARM'] as const)registry.register(id,()=>({id,root:new Group(),load:async()=>{},enter:()=>{},leave:({gameTime})=>({lastSimulatedGameTime:gameTime,discoveries:[]}),update:()=>{},dispose:()=>{},applyQuality:()=>{},getSpawnPoint:()=>({id:'test',position:[0,1,0],lookAt:[0,1,-1]})} as GameWorld));
  const manager=new WorldManager(new Scene(),registry,new WorldStateRegistry(),()=>{},g);g.commissions.accept('fisher.sardines','fisherman');g.inventory.add('fish.sardine',2);const state=g.commissions.snapshot();
  for(const id of ['HOME','COTTAGE','HOME','TRAVEL','FARM','HOME'] as const){await manager.switchTo(id,clock.simulationTime);expect(g.commissions.snapshot()).toEqual(state);expect(g.commissions.view('fisher.sardines')!.status).toBe('READY');}
});
