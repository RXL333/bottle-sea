import { expect,it,vi } from 'vitest';
import { GameClock } from '../../core/GameClock';
import { GameplayFoundation } from '../GameplayFoundation';
import { SaveSystem,defaultSave,migrateSave } from '../../state/SaveSystem';
import { ProgressionSystem } from './ProgressionSystem';
import { ProgressionRegistry } from './ProgressionRegistry';
import { normalizeProgression } from './ProgressionState';
const cell={fieldId:'field-central',column:0,row:0};

it('records out-of-order actions once, derives cycles, and never gives items or coins',()=>{
  const clock=new GameClock(),changed=vi.fn(),p=new ProgressionSystem(clock,undefined,changed),notify=vi.fn();p.onComplete=notify;
  p.record('home.sleep');clock.advanceGameMinutes(60);p.record('cook.complete');
  expect(p.canAccess('recipe.soup')).toBe(true);expect(p.completed('home_cycle')).toBe(false);
  clock.advanceGameMinutes(60);const result=p.record('fish.catch');
  expect(result.milestones.map(m=>m.id)).toEqual(['first_fish','home_cycle']);
  expect(p.completedAt('home_cycle')).toBe(clock.simulationTime);expect(p.currentObjective?.id).toBe('first_home');
  const state=p.snapshot();p.record('fish.catch');p.record('home.sleep');expect(p.snapshot()).toEqual(state);expect(changed).toHaveBeenCalledTimes(3);expect(notify).toHaveBeenCalledTimes(3);
  expect(p.isUnlocked('foundation.requests')).toBe(true);expect(p.canAccess('foundation.requests')).toBe(true);expect(p.isUnlocked('missing')).toBe(false);
  const restored=new ProgressionSystem(clock,state,changed);restored.onComplete=notify;restored.record('cook.complete');expect(changed).toHaveBeenCalledTimes(3);expect(restored.snapshot()).toEqual(state);
});

it('does not infer achievements from inventory grants, purchases or energy changes',()=>{
  const g=new GameplayFoundation(new GameClock());g.inventory.add('fish.sardine',2);g.inventory.add('livestock.egg',3);g.inventory.add('crop.wheat',4);g.progress.spendEnergy(10);
  expect(g.progression.completedCount).toBe(0);expect(g.cooking.check('soup').ok).toBe(false);expect(g.cooking.check('soup').reason).toContain('解锁');
  expect(g.economy.check('buy','upgrade.barn.1',1)).toEqual({ok:false,reason:'locked'});
  const before=g.snapshot();expect(g.cooking.start('soup').ok).toBe(false);g.cooking.update(4);expect(g.snapshot()).toEqual(before);
  expect(g.cooking.start('grill').ok).toBe(true);g.cooking.update(3);
  expect(g.progression.completed('first_cook')).toBe(true);expect(g.progression.completed('first_fish')).toBe(false);expect(g.progression.canAccess('recipe.smoke')).toBe(true);
  expect(g.inventory.count('fish.sardine')).toBe(1);expect(g.inventory.count('food.grilled_fish')).toBe(1);
});

it('fishing completion survives pending storage and UI callbacks cannot replace activity recording',()=>{
  const g=new GameplayFoundation(new GameClock()),notify=vi.fn();g.fishing.onEvent=notify;
  expect(g.fishing.interact().status).toBe('success');
  for(let i=0;i<10000&&g.fishing.state!=='IDLE';i++){
    if(g.fishing.state==='BITE')g.fishing.interact();
    if(g.fishing.state==='FIGHTING'){if(g.fishing.tension<g.fishing.zoneStart+g.fishing.zoneWidth/2)g.fishing.press();else g.fishing.release();}
    if(g.fishing.state==='REELING'&&g.inventory.emptySlots)g.inventory.add('wood',24*99);
    g.fishing.update(.05);
  }
  expect(notify.mock.calls.some(([e])=>e.kind==='stored')).toBe(true);expect(g.fishing.pendingCatch).not.toBeNull();expect(g.progression.completed('first_fish')).toBe(true);
  const revision=g.progression.revision;g.inventory.removeFromSlot(23,99);g.fishing.interact();expect(g.fishing.pendingCatch).toBeNull();expect(g.progression.revision).toBe(revision);
});

it('only committed farming counts and full inventory preserves both harvest and milestone',()=>{
  const clock=new GameClock(),g=new GameplayFoundation(clock);
  expect(g.farm.till([]).ok).toBe(true);expect(g.progression.completedCount).toBe(0);
  expect(g.farm.seed([cell],'wheat').ok).toBe(false);expect(g.farm.till([cell]).ok).toBe(true);expect(g.progression.completed('first_till')).toBe(true);
  expect(g.farm.seed([cell],'wheat').ok).toBe(false);expect(g.progression.completed('first_seed')).toBe(false);
  g.inventory.add('seed.wheat',1);expect(g.farm.seed([cell],'wheat').ok).toBe(true);expect(g.inventory.count('seed.wheat')).toBe(0);
  expect(g.farm.harvest([cell]).ok).toBe(false);expect(g.progression.completed('first_harvest')).toBe(false);
  clock.advanceGameMinutes(g.crops.registry.get('wheat')!.growthGameMinutes);g.inventory.add('wood',24*99);
  expect(g.farm.harvest([cell]).ok).toBe(false);expect(g.farm.getCell(cell)?.landState).toBe('MATURE');expect(g.progression.completed('first_harvest')).toBe(false);
  g.inventory.removeFromSlot(23,99);expect(g.farm.harvest([cell]).ok).toBe(true);expect(g.inventory.count('crop.wheat')).toBe(g.crops.registry.get('wheat')!.baseYield);
  expect(g.progression.completed('first_harvest')).toBe(true);const state=g.snapshot();expect(g.farm.harvest([cell]).ok).toBe(false);expect(g.snapshot()).toEqual(state);
});

it('failed and replayed trades never unlock, while a successful sale opens paid upgrades',()=>{
  const g=new GameplayFoundation(new GameClock());const initial=g.snapshot();
  expect(g.economy.trade('buy','upgrade.barn.1',1,1)).toEqual({ok:false,reason:'locked'});expect(g.snapshot()).toEqual(initial);
  expect(g.economy.trade('sell','fish.tuna',1,1).ok).toBe(false);expect(g.progression.completedCount).toBe(0);
  g.inventory.add('fish.tuna',3);const request=g.economy.nextRequest;g.economy.trade('sell','fish.tuna',3,request);
  expect(g.progression.canAccess('capacity.upgrades')).toBe(true);expect(g.economy.coins).toBe(460);
  const state=g.snapshot();expect(g.economy.trade('sell','fish.tuna',3,request).ok).toBe(false);expect(g.snapshot()).toEqual(state);
  expect(g.economy.trade('buy','upgrade.barn.1',1,g.economy.nextRequest).ok).toBe(true);expect(g.barn.capacity).toBe(36);expect(g.economy.coins).toBe(280);expect(g.progression.completed('first_purchase')).toBe(true);
});

it('full inventory never claims a livestock achievement; collecting after sleep works exactly once',()=>{
  const g=new GameplayFoundation(new GameClock());expect(g.livestock.feed('chicken').ok).toBe(false);expect(g.progression.completed('first_feed')).toBe(false);
  g.inventory.add('feed.basic',3);expect(g.livestock.feed('chicken').ok).toBe(true);expect(g.progression.completed('first_feed')).toBe(true);
  g.home.sleep();g.time.advanceMinutes(1440);g.inventory.add('wood',24*99);
  const pending=g.livestock.getAnimal('chicken-0')!.pending;expect(pending).toBeGreaterThan(0);expect(g.livestock.collect('chicken-0').ok).toBe(false);expect(g.livestock.getAnimal('chicken-0')!.pending).toBe(pending);expect(g.progression.completed('first_product')).toBe(false);
  g.inventory.removeFromSlot(23,99);expect(g.livestock.collect('chicken-0').ok).toBe(true);expect(g.progression.completed('first_product')).toBe(true);
  const count=g.inventory.count('livestock.egg');expect(g.livestock.collect('chicken-0').ok).toBe(false);expect(g.inventory.count('livestock.egg')).toBe(count);
});

it('round trips progression together with gameplay, without toast replay or resetting clock and resources',()=>{
  const values=new Map<string,string>(),save=new SaveSystem({getItem:k=>values.get(k)??null,setItem:(k,v)=>{values.set(k,v);}}),clock=new GameClock(),g=new GameplayFoundation(clock);
  g.inventory.add('fish.sardine',2);g.cooking.start('grill');g.cooking.update(3);g.progression.record('farm.visit');g.progression.record('home.enter');g.home.sleep();
  expect(save.save({...defaultSave(),...g.snapshot(),gameTime:clock.snapshot()})).toBe(true);const loaded=save.load(),nextClock=new GameClock();nextClock.restore(loaded.gameTime);
  const restored=new GameplayFoundation(nextClock,loaded),notification=vi.fn();restored.progression.onComplete=notification;restored.progression.record('cook.complete');
  expect(restored.snapshot()).toEqual(g.snapshot());expect(notification).not.toHaveBeenCalled();expect(restored.progression.canAccess('recipe.soup')).toBe(true);
});

it.each([1,2])('keeps version %i legacy access without manufacturing milestones or unlocking future destinations',version=>{
  const data=defaultSave();const old:Record<string,unknown>={...data,version};delete old.progression;
  const loaded=migrateSave(old),g=new GameplayFoundation(new GameClock(),loaded);
  expect(g.progression.completedCount).toBe(0);expect(g.progression.canAccess('recipe.soup')).toBe(true);expect(g.progression.canAccess('capacity.upgrades')).toBe(true);expect(g.progression.isUnlocked('foundation.expeditions')).toBe(false);
  expect(loaded.player.unlockedDestinations).toEqual(data.player.unlockedDestinations);expect(loaded.inventory).toEqual(data.inventory);expect(loaded.economy).toEqual(data.economy);
  expect(migrateSave(loaded).progression).toEqual(loaded.progression);
});

it('sanitizes corrupt completion times and grants, and reconstructs derived milestones silently',()=>{
  const clock=new GameClock();const p=new ProgressionSystem(clock,{completed:{first_fish:0,first_cook:1,first_sleep:2,first_sale:Infinity,first_seed:-1,first_drive:clock.simulationTime+1,unknown:3},grants:['foundation.expeditions','recipe.soup','recipe.soup','unknown']});
  expect(p.completed('home_cycle')).toBe(true);expect(p.completedAt('home_cycle')).toBe(2);expect(p.completedCount).toBe(4);expect(p.snapshot().grants).toEqual(['recipe.soup']);
  expect(normalizeProgression([],clock.simulationTime).completed).toEqual({});expect(normalizeProgression({completed:{home_cycle:1,production_cycle:1}},clock.simulationTime).completed).toEqual({});const detached=p.snapshot();detached.completed.first_fish=999;expect(p.completedAt('first_fish')).toBe(0);
});

it('requires registered dependencies and freezes registry configuration for later integrations',()=>{
  const registry=new ProgressionRegistry();expect(()=>registry.registerMilestone({id:'bad',name:'bad',description:'',hint:'',requires:['unknown']})).toThrow();
  registry.registerMilestone({id:'first',name:'First',description:'',hint:'',activity:'fish.catch'});
  expect(()=>registry.registerMilestone({id:'first',name:'Duplicate',description:'',hint:'',activity:'fish.catch'})).toThrow();
  expect(()=>registry.registerUnlock({id:'future',name:'Future',description:'',requires:['first'],implemented:false,legacyAccess:true})).toThrow();
  registry.registerUnlock({id:'future',name:'Future',description:'',requires:['first'],implemented:false});
  const p=new ProgressionSystem(new GameClock(),undefined,()=>{},false,registry);p.record('fish.catch');expect(p.isUnlocked('future')).toBe(true);expect(p.canAccess('future')).toBe(false);expect(Object.isFrozen(registry.getUnlock('future')!.requires)).toBe(true);
});
