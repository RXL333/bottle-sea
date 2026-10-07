import { expect,it,vi } from 'vitest';
import { CollectionSystem,normalizeCollections } from './CollectionSystem';
import { createCollectionRegistry,CollectionRegistry } from './CollectionRegistry';
import { GameClock } from '../../core/GameClock';
import { GameplayFoundation } from '../GameplayFoundation';
import { ITEMS,createItemRegistry } from '../ItemRegistry';
import { RECIPES } from '../CookingCatalog';
import { CROPS } from '../farm/CropRegistry';
import { LIVESTOCK_SPECIES } from '../livestock/LivestockDefinition';
import { LANDMARKS } from '../../world/underwater/Landmarks';
import { defaultSave,migrateSave,SaveSystem } from '../../state/SaveSystem';
import { GrainTank } from '../vehicles/GrainTank';
import { dialogueFacts } from '../npc/DialogueFacts';
import { DIALOGUES } from '../npc/DialogueCatalog';
const fixture=()=>{const clock=new GameClock(),g=new GameplayFoundation(clock);return {clock,g};};
const ref={fieldId:'field-central',column:0,row:0};
it('derives every supported collection from canonical gameplay definitions',()=>{
  const r=createCollectionRegistry();expect(r.list('fish')).toHaveLength(ITEMS.fish().length);expect(r.list('crops')).toHaveLength(CROPS.list().length);expect(r.list('cooking')).toHaveLength(RECIPES.length);expect(r.list('livestock')).toHaveLength(Object.keys(LIVESTOCK_SPECIES).length*2);
  for(const f of ITEMS.fish())expect(r.get(f.id)).toMatchObject({name:f.name,description:f.description});
  expect(r.matching({kind:'item',id:'livestock.egg'})[0].category).toBe('livestock');expect(r.list()).toHaveLength(26);expect(Object.isFrozen(r.get('fish.sardine')!.information)).toBe(true);
  for(const l of LANDMARKS)expect(r.matching({kind:'discovery',id:l.id})).toHaveLength(1);
});
it('new canonical fish and extension discoveries become pages without a second production catalog',()=>{
  const items=createItemRegistry().register({id:'fish.future',name:'新鱼',description:'新海域的鱼',icon:'sardine',category:'fish',maxStack:20,fishing:{weight:1,rarity:'稀有',color:'#ffffff'}}),r=createCollectionRegistry(items);
  expect(r.get('fish.future')?.name).toBe('新鱼');r.register({id:'discovery:future',category:'navigation',name:'远方',description:'远航的见闻',reference:{kind:'discovery',id:'future'},information:[]});const c=new CollectionSystem(()=>100,undefined,undefined,r);expect(c.record({kind:'discovery',id:'future'})).toBe(1);expect(()=>r.register(r.get('discovery:future')!)).toThrow();
  expect(()=>new CollectionRegistry().register({...r.get('discovery:future')!,category:'none' as never})).toThrow();
});
it('masked queries reveal no undiscovered name, item icon, description or rules and never unlock entries',()=>{
  const c=new CollectionSystem(()=>100),before=c.snapshot(),view=c.view('fish.tuna')!;
  expect(view).toEqual({id:'fish.tuna',category:'fish',discovered:false,name:'???',description:expect.any(String),information:[]});expect(JSON.stringify(view)).not.toContain('金枪鱼');expect('iconItemId' in view).toBe(false);
  c.list();c.stats();c.categories();expect(c.snapshot()).toEqual(before);expect(c.view('unknown')).toBeUndefined();
});
it('first discovery stores game time once, repeat acquisition and transfers cannot change counts or dates',()=>{
  const {clock,g}=fixture(),notify=vi.fn();g.collections.onDiscover=notify;const at=clock.simulationTime;g.inventory.add('fish.sardine');clock.advanceGameMinutes(1440);g.inventory.add('fish.sardine',3);g.inventory.transferTo(g.home.chest,'fish.sardine',4);g.home.chest.transferTo(g.inventory,'fish.sardine',4);
  expect(g.collections.stats('fish')).toEqual({discovered:1,total:6});expect(g.collections.view('fish.sardine')).toMatchObject({record:{firstGameTime:at,sources:['obtained']}});expect(notify).toHaveBeenCalledOnce();g.inventory.remove('fish.sardine',4);expect(g.collections.has('fish.sardine')).toBe(true);
});
it('failed inventory changes, abandoned fishing and unsuccessful cooking do not register pages',()=>{
  const {g}=fixture();g.inventory.add('wood',24*99);const before=g.collections.snapshot();expect(g.inventory.add('fish.tuna').ok).toBe(false);expect(g.cooking.start('grill').ok).toBe(false);g.cooking.update(3);expect(g.fishing.interact().status).toBe('unavailable');expect(g.collections.snapshot()).toEqual(before);
  g.inventory.remove('wood',99);g.fishing.interact();g.fishing.cancel();expect(g.collections.stats('fish').discovered).toBe(0);
});
it('real fish struggle records an actual catch, including a pending catch when the bag fills during reeling',()=>{
  const {g}=fixture();expect(g.fishing.interact().status).toBe('success');
  for(let i=0;i<4000&&g.fishing.state!=='IDLE';i++){if(g.fishing.state==='BITE')g.fishing.interact();if(g.fishing.state==='FIGHTING'){if(g.fishing.tension<g.fishing.zoneStart+g.fishing.zoneWidth/2)g.fishing.press();else g.fishing.release();}if(g.fishing.state==='REELING')while(g.inventory.emptySlots)g.inventory.add('wood',99);g.fishing.update(.05);}
  const id=g.fishing.pendingCatch!;expect(id).toBeTruthy();expect(g.collections.view(id)).toMatchObject({record:{sources:['caught']}});const record=g.collections.view(id);g.inventory.removeFromSlot(23,99);expect(g.fishing.interact().status).toBe('success');expect(g.collections.stats('fish').discovered).toBe(1);expect(g.collections.view(id)).toMatchObject({record:{firstGameTime:record?.discovered?record.record.firstGameTime:undefined}});
});
it('cooking distinguishes owning food from personally crafting it and registers only successful output',()=>{
  const {g}=fixture();g.inventory.add('food.grilled_fish');expect(g.collections.view('recipe:grill')).toMatchObject({record:{sources:['obtained']}});expect(g.collections.view('recipe:soup')?.discovered).toBe(false);
  g.inventory.add('fish.sardine');expect(g.cooking.start('grill').ok).toBe(true);g.cooking.update(3);expect(g.collections.view('recipe:grill')).toMatchObject({record:{sources:['obtained','crafted']}});expect(g.collections.stats('cooking').discovered).toBe(1);
});
it('harvesting into a vehicle tank records the crop without requiring backpack ownership',()=>{
  const {g,clock}=fixture();g.inventory.add('seed.wheat');g.farm.till([ref]);g.farm.seed([ref],'wheat');expect(g.collections.has('crop:wheat')).toBe(false);expect(g.farm.harvest([ref]).ok).toBe(false);clock.advanceGameMinutes(4*1440);const tank=new GrainTank();expect(g.farm.harvest([ref],tank).ok).toBe(true);
  expect(g.inventory.count('crop.wheat')).toBe(0);expect(g.collections.view('crop:wheat')).toMatchObject({record:{sources:['harvested']}});const count=g.collections.stats('crops');expect(g.farm.harvest([ref],tank).ok).toBe(false);tank.unloadTo(g.inventory);expect(g.collections.stats('crops')).toEqual(count);
});
it('livestock entries distinguish observing an animal, owning its product and collecting the real pending output',()=>{
  const {g,clock}=fixture();const a=g.livestock.getAnimal('cow-0')!;g.collections.observeAnimals([a],{x:a.x+1,y:4.44,z:a.z});expect(g.collections.has('animal:cow')).toBe(true);expect(g.collections.has('livestock.milk')).toBe(false);
  g.inventory.add('livestock.egg');expect(g.collections.has('animal:chicken')).toBe(false);g.inventory.add('feed.basic');g.livestock.feed('chicken');clock.advanceGameMinutes(1440);expect(g.livestock.collect('chicken-0').ok).toBe(true);expect(g.collections.has('animal:chicken')).toBe(true);expect(g.collections.view('livestock.egg')).toMatchObject({record:{sources:['obtained','collected']}});
});
it('remote animals and unclaimed livestock output do not become acquired products',()=>{
  const {g,clock}=fixture();g.collections.observeAnimals(g.livestock.getAnimals(),{x:0,y:4.44,z:0});g.inventory.add('feed.basic');g.livestock.feed('sheep');clock.advanceGameMinutes(2880);g.inventory.add('wood',24*99);expect(g.livestock.collect('sheep-0')).toMatchObject({ok:false,reason:'full'});expect(g.collections.stats('livestock').discovered).toBe(0);expect(g.livestock.getAnimal('sheep-0')!.pending).toBe(1);
});
it('arrivals ignore transient travel and repeated island visits, and integrate existing landmark discoveries',()=>{
  const {g}=fixture();g.collections.arrive('TRAVEL');expect(g.collections.stats('places').discovered).toBe(0);g.collections.arrive('HOME');g.collections.arrive('COTTAGE');g.collections.arrive('FARM');g.collections.arrive('HOME');g.collections.syncDiscoveries(['anchor','lighthouse','unknown','anchor']);expect(g.collections.stats('places')).toEqual({discovered:4,total:4});expect(g.collections.stats('navigation')).toEqual({discovered:1,total:3});expect(g.collections.snapshot().records).toHaveLength(5);
});
it('a failed commission reward rollback cannot create an unearned food page',()=>{
  const {g}=fixture();g.commissions.accept('keeper.old_anchor','lighthouse_keeper');const before=g.snapshot();vi.spyOn(g.economy,'credit').mockReturnValue(false);expect(g.commissions.submit('keeper.old_anchor','lighthouse_keeper',['anchor']).ok).toBe(false);expect(g.collections.has('recipe:grill')).toBe(false);expect(g.snapshot()).toEqual(before);
});
it('completion counts remain accurate and returned records cannot mutate persistent knowledge',()=>{
  const c=new CollectionSystem(()=>0);for(const f of ITEMS.fish())c.observeItems([{itemId:f.id,quantity:1}]);expect(c.stats('fish')).toEqual({discovered:6,total:6});const view=c.view('fish.tuna');if(view?.discovered)view.record.sources.length=0;const saved=c.snapshot();saved.records.length=0;expect(c.snapshot().records).toHaveLength(6);expect(c.categories().reduce((n,s)=>n+s.discovered,0)).toBe(c.stats().discovered);
});
it('normalizes corrupt, duplicate, unknown, future-time and unsupported-schema records safely',()=>{
  const result=normalizeCollections({version:1,records:[{id:'fish.sardine',firstGameTime:2,sources:['caught','bad','caught']},{id:'fish.sardine',firstGameTime:3,sources:['obtained']},{id:'fish.tuna',firstGameTime:11,sources:['caught']},{id:'recipe:grill',firstGameTime:NaN,sources:['crafted']},{id:'unknown',firstGameTime:0,sources:['legacy']},{id:'crop:wheat',firstGameTime:null,sources:['legacy']}]},10);
  expect(result.records).toEqual([{id:'fish.sardine',firstGameTime:2,sources:['caught']},{id:'crop:wheat',firstGameTime:null,sources:['legacy']}]);expect(normalizeCollections({version:999,records:result.records},10).records).toEqual([]);
});
it.each([1,2])('migrates v%i saves using preserved evidence without inferring unknown species from counters',version=>{
  const original=defaultSave(),old:Record<string,unknown>={...original,version};delete old.collections;original.player.discoveries=['anchor'];original.player.currentWorldId='FARM';old.lastSuccessfulWorld='FARM';original.fishing.pendingCatch='fish.tuna';original.inventory.slots[0]={itemId:'crop.potato',quantity:4};original.home.chest.slots[0]={itemId:'food.grilled_fish',quantity:1};
  const loaded=migrateSave(old),clock=new GameClock();clock.restore(loaded.gameTime);const g=new GameplayFoundation(clock,loaded);expect(g.collections.has('discovery:anchor')).toBe(true);expect(g.collections.has('world:farm')).toBe(true);expect(g.collections.has('fish.sardine')).toBe(false);expect(g.collections.has('recipe:soup')).toBe(false);if(version===2){expect(g.collections.has('fish.tuna')).toBe(true);expect(g.collections.has('crop:potato')).toBe(true);expect(g.collections.has('recipe:grill')).toBe(true);expect(loaded.inventory).toEqual(original.inventory);expect(loaded.home).toEqual(original.home);}expect(g.collections.view('discovery:anchor')).toMatchObject({record:{firstGameTime:null,sources:['legacy']}});expect(old.collections).toBeUndefined();
});
it('save, sleep, island return and full restoration preserve the original date and production state',()=>{
  const {g,clock}=fixture(),values=new Map<string,string>(),save=new SaveSystem({getItem:k=>values.get(k)??null,setItem:(k,v)=>values.set(k,v)});g.inventory.add('fish.sardine',2);g.cooking.start('grill');g.cooking.update(3);g.collections.arrive('FARM');g.collections.syncDiscoveries(['anchor']);const first=g.collections.snapshot();g.home.sleep();g.collections.arrive('HOME');
  const data={...defaultSave(),...g.snapshot(),gameTime:clock.snapshot()};data.player.discoveries=['anchor'];expect(save.save(data)).toBe(true);const loaded=save.load(),nextClock=new GameClock();nextClock.restore(loaded.gameTime);const restored=new GameplayFoundation(nextClock,loaded);expect(restored.snapshot()).toEqual(g.snapshot());expect(restored.collections.view('fish.sardine')).toMatchObject({record:first.records.find(r=>r.id==='fish.sardine')});restored.inventory.add('fish.sardine');expect(restored.collections.stats('fish').discovered).toBe(1);
});
it('NPC facts and all four dialogue menus can reference the same collection state',()=>{
  const {g}=fixture();g.inventory.add('fish.sardine');const facts=dialogueFacts(g,'CLEAR');expect(facts.collectionCount).toBe(1);expect(facts.collectionTotal).toBe(26);for(const id of ['lighthouse_keeper','merchant_captain','fisherman','farm_steward'])expect(DIALOGUES.topics(id,facts).find(t=>t.id==='collections')?.action).toBe('collections');expect(g.progression.canAccess('foundation.collections')).toBe(true);
});
it('old precise arrival milestones retain visited places after returning home, without revealing fish or recipes',()=>{
  const old:Record<string,unknown>={...defaultSave(),progression:{version:1,completed:{first_farm:3000,first_home:2900,first_fish:2800,first_cook:3100},grants:[]}};delete old.collections;
  const save=migrateSave(old),c=new CollectionSystem(()=>save.gameTime.simulationTime,save.collections);expect(c.view('world:farm')).toMatchObject({record:{firstGameTime:3000,sources:['legacy']}});expect(c.view('place:cottage')).toMatchObject({record:{firstGameTime:2900}});expect(c.stats('fish').discovered).toBe(0);expect(c.stats('cooking').discovered).toBe(0);
});
it('reconciles persisted landmark evidence with the existing PlayerState and WorldState discovery owner',()=>{
  const save=defaultSave();save.collections.records=[{id:'discovery:anchor',firstGameTime:3000,sources:['discovered']}];const restored=migrateSave(save);expect(restored.player.discoveries).toEqual(['anchor']);expect(restored.worlds.HOME.discoveries).toEqual(['anchor']);expect(restored.collections).toEqual(save.collections);
});
