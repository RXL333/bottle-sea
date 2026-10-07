import { afterEach, describe, expect, it, vi } from 'vitest';
import { defaultSave, migrateSave, SaveSystem, SAVE_KEY, LEGACY_SAVE_KEY } from './SaveSystem';
import { WorldStateRegistry } from './WorldStateRegistry';
import { GameplayFoundation } from '../gameplay/GameplayFoundation';
import { GameClock } from '../core/GameClock';
import { createItemRegistry } from '../gameplay/ItemRegistry';
const fixture=()=>{const values=new Map<string,string>();const storage={getItem:(key:string)=>values.get(key)??null,setItem:vi.fn((key:string,data:string)=>{values.set(key,data);})};return {storage,set:(data:string,key=SAVE_KEY)=>{values.set(key,data);},read:(key:string)=>values.get(key)};};
afterEach(()=>vi.useRealTimers());
describe('versioned local save',()=>{
  it('defaults without writing or sharing mutable state',()=>{const f=fixture(),save=new SaveSystem(f.storage);expect(save.load()).toEqual(defaultSave());expect(f.storage.setItem).not.toHaveBeenCalled();const a=save.load();a.player.discoveries.push('anchor');expect(save.load().player.discoveries).toEqual([]);});
  it.each(['{oops','null','[]','{"version":99}'])('warns and recovers from %s',raw=>{const f=fixture(),warn=vi.fn();f.set(raw);expect(new SaveSystem(f.storage,warn).load()).toEqual(defaultSave());expect(warn).toHaveBeenCalledOnce();});
  it('merges missing fields and sanitizes invalid values',()=>{const data=migrateSave({version:1,gameTime:{simulationTime:-3,elapsed:null},global:{intensity:9,quality:'ULTRA'},player:{discoveries:['anchor','unknown','anchor']}});expect(data.gameTime).toEqual(defaultSave().gameTime);expect(data.player.discoveries).toEqual(['anchor']);expect(data.global.intensity).toBe(1);expect(data.global.quality).toBe('MEDIUM');});
  it('round trips player, worlds, time, weather and quality',()=>{const f=fixture(),save=new SaveSystem(f.storage),data=defaultSave();data.player.currentWorldId='FARM';data.lastSuccessfulWorld='FARM';data.player.currentSpawnId='farm_dock_arrival';data.player.lastTravelDestination='FARM';data.player.discoveries=['lighthouse','anchor'];data.collections.records=data.player.discoveries.map(id=>({id:`discovery:${id}`,firstGameTime:4200,sources:['discovered']}));data.worlds.HOME.discoveries=['lighthouse','anchor'];data.worlds.FARM.lastSimulatedGameTime=1234;data.gameTime.simulationTime=5432;data.global={storm:true,intensity:.8,quality:'HIGH'};expect(save.save(data)).toBe(true);expect(save.load()).toEqual(data);});
  it('restores last successful dock rather than a travel phase',()=>{const data=migrateSave({version:1,lastSuccessfulWorld:'FARM',player:{currentWorldId:'TRAVEL',currentSpawnId:'sailing_out'}});expect(data.player.currentWorldId).toBe('FARM');expect(data.player.currentSpawnId).toBe('farm_dock_arrival');});
  it('coalesces saves and reads the latest snapshot at flush time',()=>{vi.useFakeTimers();const f=fixture(),save=new SaveSystem(f.storage),data=defaultSave();for(let i=0;i<20;i++)save.schedule(()=>data);data.global.storm=true;vi.advanceTimersByTime(250);expect(f.storage.setItem).toHaveBeenCalledOnce();expect(save.load().global.storm).toBe(true);save.schedule(()=>data);save.flush(()=>data);vi.runAllTimers();expect(f.storage.setItem).toHaveBeenCalledTimes(2);});
  it('handles denied storage without crashing gameplay',()=>{const warn=vi.fn(),save=new SaveSystem({getItem(){throw Error('denied');},setItem(){throw Error('quota');}},warn);expect(save.load()).toEqual(defaultSave());expect(save.save(defaultSave())).toBe(false);expect(warn).toHaveBeenCalledTimes(3);});
  it('isolates world snapshots from live mutable state',()=>{const registry=new WorldStateRegistry(),state=registry.get('HOME');state.discoveries.push('anchor');registry.set('HOME',state);state.discoveries.push('chest');expect(registry.get('HOME').discoveries).toEqual(['anchor']);const next=new WorldStateRegistry();next.restore(JSON.parse(JSON.stringify(registry.snapshot())));expect(next.snapshot()).toEqual(registry.snapshot());});
});

it('loads v1, preserves the original key and writes v2 with default gameplay state',()=>{
  const f=fixture(),legacy={...defaultSave(),version:1};legacy.player.discoveries=['anchor'];legacy.worlds.HOME.discoveries=['anchor'];legacy.global.quality='HIGH';legacy.gameTime.simulationTime=4200;
  const original=JSON.stringify(legacy);f.set(original,LEGACY_SAVE_KEY);const save=new SaveSystem(f.storage),loaded=save.load();
  expect(loaded.version).toBe(2);expect(loaded.player.discoveries).toEqual(['anchor']);expect(loaded.global.quality).toBe('HIGH');expect(loaded.gameTime.simulationTime).toBe(4200);
  expect(loaded.progress).toEqual({energy:100,maxEnergy:100,money:0});expect(loaded.inventory.slots.every(slot=>slot===null)).toBe(true);
  expect(f.storage.setItem).not.toHaveBeenCalled();expect(save.save(loaded)).toBe(true);
  expect(JSON.parse(f.read(SAVE_KEY)!).version).toBe(2);expect(f.read(LEGACY_SAVE_KEY)).toBe(original);
});

it('round trips gameplay mutations using the same registered item definitions',()=>{
  const f=fixture(),registry=createItemRegistry().register({id:'fish.test',name:'测试鱼',maxStack:5,category:'fish',description:'测试鱼',icon:'sardine'});
  const save=new SaveSystem(f.storage,vi.fn(),registry),clock=new GameClock(),runtime=new GameplayFoundation(clock,undefined,registry);
  runtime.inventory.add('wood',8);runtime.inventory.add('fish.test',7);runtime.progress.spendEnergy(35);runtime.progress.earnMoney(50);runtime.time.advanceMinutes(30);
  const data={...defaultSave(registry),...runtime.snapshot(),gameTime:clock.snapshot()};
  expect(save.save(data)).toBe(true);const loaded=save.load();expect(loaded).toEqual(data);
  const restoredClock=new GameClock();restoredClock.restore(loaded.gameTime);const restored=new GameplayFoundation(restoredClock,loaded,registry);
  expect(restored.snapshot()).toEqual(runtime.snapshot());expect(restored.inventory.count('fish.test')).toBe(7);expect(restored.time.gameTime).toBe(clock.simulationTime);
});

it('prefers v2 and falls back to untouched v1 when the newest save is corrupt',()=>{
  const f=fixture(),old={...defaultSave(),version:1},next=defaultSave();old.player.discoveries=['anchor'];next.progress.money=40;
  f.set(JSON.stringify(old),LEGACY_SAVE_KEY);f.set(JSON.stringify(next));const warn=vi.fn(),save=new SaveSystem(f.storage,warn);
  expect(save.load().progress.money).toBe(40);f.set('{broken');expect(save.load().player.discoveries).toEqual(['anchor']);expect(warn).toHaveBeenCalledOnce();
});

it('sanitizes gameplay state without trusting saved capacity or invalid stacks',()=>{
  const data=migrateSave({version:2,inventory:{capacity:999999,slots:[{itemId:'wood',quantity:999},{itemId:'unknown',quantity:3},{itemId:'stone',quantity:-1},{itemId:'stone',quantity:1.5}]},progress:{energy:-2,maxEnergy:100,money:NaN}});
  expect(data.inventory.capacity).toBe(24);expect(data.inventory.slots).toHaveLength(24);expect(data.inventory.slots[0]).toEqual({itemId:'wood',quantity:99});
  expect(data.inventory.slots.slice(1).every(slot=>slot===null)).toBe(true);expect(data.progress).toEqual({energy:0,maxEnergy:100,money:0});
});

it.each([1,2])('retains the safe cottage exterior when migrating schema v%i',version=>{
  const data=migrateSave({version,lastSuccessfulWorld:'HOME',player:{currentSpawnId:'home_cottage_exit'}});
  expect(data.player.currentSpawnId).toBe('home_cottage_exit');expect(data.lastSuccessfulWorld).toBe('HOME');
});
