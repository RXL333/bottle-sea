import { expect,it,vi } from 'vitest';
import { GameClock } from '../../core/GameClock';
import { Inventory } from '../Inventory';
import { ITEMS } from '../ItemRegistry';
import { LivestockSystem } from './LivestockSystem';
import { LIVESTOCK_PENS,LIVESTOCK_SPECIES,PENDING_CAPACITY,PEN_FEED_CAPACITY } from './LivestockDefinition';
import { normalizeLivestock } from './LivestockState';
function fixture(capacity=24){const clock=new GameClock(),inventory=new Inventory(ITEMS,capacity),system=new LivestockSystem(clock,inventory);return {clock,inventory,system};}
it('does not produce without feed and consumes grain, not seeds, for real timed cycles',()=>{
  const f=fixture();f.clock.advanceGameMinutes(1440*100);expect(f.system.getAnimals().every(a=>a.pending===0)).toBe(true);
  f.inventory.add('seed.wheat',8);expect(f.system.feed('chicken')).toEqual({ok:false,reason:'no-feed'});
  f.inventory.add('crop.wheat',3);expect(f.system.feed('chicken')).toEqual({ok:true,itemId:'crop.wheat',quantity:3});expect(f.inventory.count('crop.wheat')).toBe(0);expect(f.inventory.count('seed.wheat')).toBe(8);
  const hens=f.system.getAnimals().filter(a=>a.kind==='chicken');expect(hens.every(a=>a.nextProductAtGameTime!==null&&a.behavior==='EATING')).toBe(true);
  f.clock.advanceGameMinutes(1439);expect(f.system.getAnimals().every(a=>a.pending===0)).toBe(true);f.clock.advanceGameMinutes(1);expect(f.system.getAnimals().filter(a=>a.kind==='chicken').map(a=>a.pending)).toEqual([1,1,1]);
  for(let n=0;n<10;n++)f.system.synchronize();expect(f.system.getAnimals().filter(a=>a.kind==='chicken').map(a=>a.pending)).toEqual([1,1,1]);
});
it.each(['chicken','cow','sheep'] as const)('uses the registry product and duration for %s, collecting only once',kind=>{
  const f=fixture(),species=LIVESTOCK_SPECIES[kind];f.inventory.add('crop.corn',1);f.system.feed(kind);expect(f.system.collect(`${kind}-0`).ok).toBe(false);
  f.clock.advanceGameMinutes(species.periodGameMinutes);const result=f.system.collect(`${kind}-0`);expect(result).toEqual({ok:true,itemId:species.productItemId,quantity:1});expect(f.inventory.count(species.productItemId)).toBe(1);expect(f.system.collect(`${kind}-0`).ok).toBe(false);
  const restored=new LivestockSystem(f.clock,f.inventory,JSON.parse(JSON.stringify(f.system.snapshot())));expect(restored.collect(`${kind}-0`).ok).toBe(false);expect(f.inventory.count(species.productItemId)).toBe(1);
});
it('catches up an entire finite feed supply after leaving, sleeping and reloading without extra rewards',()=>{
  const f=fixture();f.inventory.add('crop.wheat',25);for(let n=0;n<5;n++)f.system.feed('chicken');const saved=f.system.snapshot();expect(saved.pens[0].feed).toBe(22);
  f.clock.advanceGameMinutes(1440*365);const restored=new LivestockSystem(f.clock,f.inventory,saved),hens=restored.getAnimals().filter(a=>a.kind==='chicken');expect(hens.reduce((n,a)=>n+a.pending,0)).toBe(25);expect(restored.getPen('chicken')!.feed).toBe(0);expect(hens.every(a=>a.nextProductAtGameTime===null)).toBe(true);
  const state=restored.snapshot();expect(normalizeLivestock(state,f.clock.simulationTime)).toEqual(state);for(let n=0;n<20;n++)expect(restored.snapshot()).toEqual(state);
});
it('retains products in a full bag and partially collects into available stack space',()=>{
  const f=fixture(1);f.inventory.add('crop.wheat',2);f.system.feed('chicken');f.inventory.add('wood',99);f.clock.advanceGameMinutes(1440);
  expect(f.system.collect('chicken-0')).toEqual({ok:false,reason:'full'});expect(f.system.getAnimal('chicken-0')!.pending).toBe(1);
  const saved=f.system.snapshot(),restored=new LivestockSystem(f.clock,f.inventory,saved);expect(restored.collect('chicken-0').ok).toBe(false);f.inventory.remove('wood',99);expect(restored.collect('chicken-0').ok).toBe(true);
  const state=restored.snapshot();state.animals[0].pending=5;f.inventory.add('livestock.egg',18);const partial=new LivestockSystem(f.clock,f.inventory,state);expect(partial.collect('chicken-0')).toEqual({ok:true,itemId:'livestock.egg',quantity:1});expect(partial.getAnimal('chicken-0')!.pending).toBe(4);expect(f.inventory.count('livestock.egg')).toBe(20);
});
it('caps reserves and pending products, preserving rations when the output buffer is full',()=>{
  const f=fixture(),saved=f.system.snapshot();saved.animals.filter(a=>a.kind==='chicken').forEach(a=>a.pending=PENDING_CAPACITY);saved.pens[0].feed=PEN_FEED_CAPACITY;
  const system=new LivestockSystem(f.clock,f.inventory,saved);f.clock.advanceGameMinutes(1440*1000);system.synchronize();expect(system.getPen('chicken')!.feed).toBe(PEN_FEED_CAPACITY);expect(system.feed('chicken')).toEqual({ok:false,reason:'feed-full'});
  expect(system.collect('chicken-0').ok).toBe(true);expect(system.getPen('chicken')!.feed).toBe(PEN_FEED_CAPACITY-1);expect(system.getAnimal('chicken-0')!.nextProductAtGameTime).not.toBeNull();
});
it('commits livestock and inventory before inventory save callbacks and rolls back a failed exchange',()=>{
  const clock=new GameClock();let system!:LivestockSystem;const observations:unknown[]=[];const inventory=new Inventory(ITEMS,24,undefined,()=>{if(system)observations.push({bag:inventory.snapshot(),animals:system.snapshot()});});system=new LivestockSystem(clock,inventory);
  inventory.add('crop.wheat',1);observations.length=0;system.feed('cow');const feed=observations[0] as {bag:ReturnType<Inventory['snapshot']>;animals:ReturnType<LivestockSystem['snapshot']>};expect(feed.bag.slots.every(s=>s?.itemId!=='crop.wheat')).toBe(true);expect(feed.animals.animals.find(a=>a.id==='cow-0')!.nextProductAtGameTime).not.toBeNull();
  clock.advanceGameMinutes(1440);system.synchronize();observations.length=0;system.collect('cow-0');const collect=observations[0] as typeof feed;expect(collect.bag.slots[0]?.itemId).toBe('livestock.milk');expect(collect.animals.animals.find(a=>a.id==='cow-0')!.pending).toBe(0);
  inventory.add('crop.wheat',1);const before=system.snapshot(),bag=inventory.snapshot(),fail=vi.spyOn(inventory,'exchange').mockReturnValue({ok:false,reason:'full'});expect(system.feed('sheep').ok).toBe(false);expect(system.snapshot()).toEqual(before);expect(inventory.snapshot()).toEqual(bag);fail.mockRestore();
  system.feed('cow');clock.advanceGameMinutes(1440);system.synchronize();const pending=system.snapshot(),productBag=inventory.snapshot(),collectFail=vi.spyOn(inventory,'exchange').mockReturnValue({ok:false,reason:'full'});expect(system.collect('cow-1').ok).toBe(false);expect(system.snapshot()).toEqual(pending);expect(inventory.snapshot()).toEqual(productBag);collectFail.mockRestore();
});
it('keeps bounded walking poses, sleeps at night, and restores serialized positions',()=>{
  const f=fixture();f.clock.simulationTime=Math.floor(f.clock.simulationTime/480)*480+12*480/24;let walked=false,idle=false;
  for(let n=0;n<1200;n++){f.clock.advanceGameMinutes(.5);const animals=f.system.getAnimals();for(const a of animals){const b=LIVESTOCK_PENS.find(p=>p.id===a.penId)!.bounds;expect(a.x).toBeGreaterThanOrEqual(b.minX);expect(a.x).toBeLessThanOrEqual(b.maxX);expect(a.z).toBeGreaterThanOrEqual(b.minZ);expect(a.z).toBeLessThanOrEqual(b.maxZ);walked||=a.behavior==='WALKING';idle||=a.behavior==='IDLE';}}
  expect(walked&&idle).toBe(true);f.clock.advanceToNextDay(23);expect(f.system.getAnimals().every(a=>a.behavior==='SLEEPING')).toBe(true);const saved=f.system.snapshot();expect(new LivestockSystem(f.clock,f.inventory,saved).snapshot()).toEqual(saved);
});
it('sanitizes malformed saves and clock rewinds without resurrecting collected cycles',()=>{
  const f=fixture(),saved=f.system.snapshot();saved.animals[0].pending=99999;saved.animals[0].x=9999;saved.pens[0].feed=-2;saved.animals[0].fedAtGameTime=Infinity;
  const safe=normalizeLivestock(saved,f.clock.simulationTime);expect(safe.animals).toHaveLength(8);expect(safe.animals[0].pending).toBe(PENDING_CAPACITY);expect(safe.animals[0].x).toBe(LIVESTOCK_PENS[0].bounds.maxX);expect(safe.pens[0].feed).toBe(0);expect(safe.animals[0].nextProductAtGameTime).toBeNull();
  f.inventory.add('crop.wheat',1);f.system.feed('chicken');const planted=f.clock.simulationTime;f.clock.advanceGameMinutes(1440);f.system.collect('chicken-0');f.clock.simulationTime=planted;f.system.synchronize();f.clock.advanceGameMinutes(1440);expect(f.system.collect('chicken-0').ok).toBe(false);expect(f.inventory.count('livestock.egg')).toBe(1);
});
