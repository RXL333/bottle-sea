import { expect,it,vi } from 'vitest';
import { GameClock } from '../../core/GameClock';
import { GameplayFoundation } from '../GameplayFoundation';
import { normalizeEconomy } from './EconomyState';
import { SELL_PRICES,TRADE_OFFERS } from './TradeCatalog';
import type { TradeAccess } from './EconomySystem';
import { PURCHASED_COMBINE_ID } from '../vehicles/VehicleIds';
import { migrateSave,defaultSave } from '../../state/SaveSystem';
const game=()=>new GameplayFoundation(new GameClock());
function funded(){const g=game();g.inventory.add('fish.tuna',40);g.economy.trade('sell','fish.tuna',40,g.economy.nextRequest);return g;}
it('centrally prices every produced fish, crop, food and livestock product',()=>{
  const g=game();for(const item of g.items.list())if(['fish','crop','food'].includes(item.category)||item.id==='livestock.wool')expect(SELL_PRICES[item.id]).toBeGreaterThan(0);
  expect(new Set(TRADE_OFFERS.map(p=>p.id)).size).toBe(TRADE_OFFERS.length);expect(g.economy.coins).toBe(100);
});
it('sells resources, buys seeds and feed, and rejects persisted request replay',()=>{
  const g=game();g.inventory.add('fish.sardine',2);const request=g.economy.nextRequest;
  expect(g.economy.trade('sell','fish.sardine',2,request)).toEqual({ok:true,total:24,quantity:2});expect(g.inventory.count('fish.sardine')).toBe(0);expect(g.economy.coins).toBe(124);
  expect(g.economy.trade('sell','fish.sardine',2,request)).toEqual({ok:false,reason:'stale-request'});
  expect(g.economy.trade('buy','buy.seed.wheat',10,g.economy.nextRequest).ok).toBe(true);expect(g.inventory.count('seed.wheat')).toBe(10);expect(g.economy.coins).toBe(64);
  expect(g.economy.trade('buy','buy.feed',5,g.economy.nextRequest).ok).toBe(true);expect(g.economy.coins).toBe(44);expect(g.livestock.feed('chicken').ok).toBe(true);expect(g.inventory.count('feed.basic')).toBe(0);
  const restored=new GameplayFoundation(new GameClock(),g.snapshot());expect(restored.economy.trade('buy','buy.seed.wheat',10,request).ok).toBe(false);expect(restored.snapshot()).toEqual(g.snapshot());
});
it.each([0,-1,1.5,NaN,Infinity,1000])('rejects invalid quantity %s without mutations',quantity=>{
  const g=game(),before=g.snapshot();expect(g.economy.trade('buy','buy.feed',quantity,1)).toEqual({ok:false,reason:'invalid-quantity'});expect(g.snapshot()).toEqual(before);
});
it('retains gold and goods on insufficient money, stock or receiving capacity',()=>{
  const g=game();expect(g.economy.trade('buy','buy.seed.corn',99,1)).toEqual({ok:false,reason:'insufficient-coins'});
  expect(g.economy.trade('sell','crop.wheat',1,1)).toEqual({ok:false,reason:'insufficient-items'});g.inventory.add('wood',24*99);const before=g.snapshot();
  expect(g.economy.trade('buy','buy.feed',1,1)).toEqual({ok:false,reason:'full'});expect(g.snapshot()).toEqual(before);expect(g.economy.trade('sell','wood',1,1)).toEqual({ok:false,reason:'unknown-product'});
});
it('publishes money and purchases before Inventory save callbacks; failed exchange rolls back',()=>{
  let g!:GameplayFoundation;const observations:ReturnType<GameplayFoundation['snapshot']>[]=[];g=new GameplayFoundation(new GameClock(),undefined,undefined,()=>{if(g)observations.push(g.snapshot());});
  g.inventory.add('fish.tuna',1);observations.length=0;g.economy.trade('sell','fish.tuna',1,1);expect(observations[0].economy.coins).toBe(220);expect(observations[0].inventory.slots.every(s=>s?.itemId!=='fish.tuna')).toBe(true);
  observations.length=0;g.economy.trade('buy','buy.feed',1,2);expect(observations[0].economy.coins).toBe(216);expect(observations[0].economy.purchases['buy.feed']).toBe(1);expect(observations[0].inventory.slots[0]?.itemId).toBe('feed.basic');
  const before=g.snapshot(),fail=vi.spyOn(g.inventory,'exchange').mockReturnValue({ok:false,reason:'full'});expect(g.economy.trade('buy','buy.feed',1,3).ok).toBe(false);expect(g.snapshot()).toEqual(before);fail.mockRestore();
});
it('upgrades storage without discarding stacks and restores upgraded slots and grain before normalization',()=>{
  const g=funded();g.barn.add('wood',24*99);expect(g.economy.trade('buy','upgrade.barn.2',1,g.economy.nextRequest)).toEqual({ok:false,reason:'upgrade-order'});
  g.economy.trade('buy','upgrade.barn.1',1,g.economy.nextRequest);expect(g.barn.capacity).toBe(36);expect(g.barn.count('wood')).toBe(24*99);g.barn.add('crop.wheat',99*4);g.economy.trade('buy','upgrade.barn.2',1,g.economy.nextRequest);expect(g.barn.capacity).toBe(48);
  g.economy.trade('buy','upgrade.grain.1',1,g.economy.nextRequest);g.economy.trade('buy','upgrade.grain.2',1,g.economy.nextRequest);g.vehicles.record({id:'farm.combine',worldId:'FARM',x:-25,z:0,yaw:0,grainTank:{capacity:2,slots:[{itemId:'crop.wheat',quantity:99},{itemId:'crop.corn',quantity:21}]}});
  const data=migrateSave({...defaultSave(),...g.snapshot()}),restored=new GameplayFoundation(new GameClock(),data);expect(restored.barn.count('crop.wheat')).toBe(396);expect(restored.barn.capacity).toBe(48);expect(restored.economy.grainCapacity).toBe(120);expect(restored.vehicles.get('farm.combine')?.grainTank?.slots.reduce((n,s)=>n+(s?.quantity??0),0)).toBe(120);
  const before=restored.snapshot();expect(restored.economy.trade('buy','upgrade.grain.2',1,restored.economy.nextRequest).ok).toBe(false);expect(restored.snapshot()).toEqual(before);
});
it('checks and commits one purchased machine; blocked delivery and exceptions never charge or erase legacy vehicles',()=>{
  const g=funded();g.vehicles.record({id:'farm.tractor',worldId:'FARM',x:-20,z:2,yaw:0});const original=g.vehicles.snapshot(),before=g.snapshot();
  expect(g.economy.trade('buy','machine.combine',1,g.economy.nextRequest)).toEqual({ok:false,reason:'farm-only'});
  const blocked:TradeAccess={farm:true,delivery:{available:()=>false,prepare:()=>undefined}};expect(g.economy.trade('buy','machine.combine',1,g.economy.nextRequest,blocked)).toEqual({ok:false,reason:'delivery-blocked'});expect(g.snapshot()).toEqual(before);
  const rollback=vi.fn(),access:TradeAccess={farm:true,delivery:{available:()=>true,prepare:()=>({pose:{id:PURCHASED_COMBINE_ID,worldId:'FARM',x:-29,z:-1.8,yaw:0},apply:()=>{throw new Error('fixture install failure');},rollback})}};
  expect(g.economy.trade('buy','machine.combine',1,g.economy.nextRequest,access)).toEqual({ok:false,reason:'transaction-failed'});expect(rollback).toHaveBeenCalledOnce();expect(g.snapshot()).toEqual(before);
  access.delivery!.prepare=()=>({pose:{id:PURCHASED_COMBINE_ID,worldId:'FARM',x:-29,z:-1.8,yaw:0},apply:()=>{},rollback});const request=g.economy.nextRequest;expect(g.economy.trade('buy','machine.combine',1,request,access).ok).toBe(true);expect(g.vehicles.get('farm.tractor')).toEqual(original.vehicles[0]);expect(g.vehicles.get(PURCHASED_COMBINE_ID)).toBeDefined();expect(g.economy.trade('buy','machine.combine',1,g.economy.nextRequest,access)).toEqual({ok:false,reason:'already-owned'});
});
it('initializes an old save without reclaiming inventory, vehicles, barn or livestock',()=>{
  const g=game();g.inventory.add('crop.potato',12);g.barn.add('livestock.wool',2);g.vehicles.record({id:'farm.tractor',worldId:'FARM',x:3,z:-5,yaw:0});const old={...defaultSave(),...g.snapshot(),economy:undefined};const loaded=migrateSave(old);expect(loaded.inventory).toEqual(old.inventory);expect(loaded.barn).toEqual(old.barn);expect(loaded.vehicles).toEqual(old.vehicles);expect(loaded.livestock).toEqual(old.livestock);expect(loaded.economy).toEqual(normalizeEconomy(undefined));
  expect(normalizeEconomy({coins:NaN,sequence:-5,upgrades:{barn:999,grain:1},purchases:{'machine.combine':999}})).toMatchObject({coins:100,sequence:0,upgrades:{barn:0,grain:1},purchases:{'machine.combine':1}});
});
it('rolls back both coins and mutated resources if an inventory or upgrade callback fails',()=>{
  let fail=false;const g=new GameplayFoundation(new GameClock(),undefined,undefined,()=>{if(fail){fail=false;throw new Error('fixture callback failure');}});
  g.inventory.add('fish.tuna',10);g.economy.trade('sell','fish.tuna',10,1);const before=g.snapshot();fail=true;
  expect(g.economy.trade('buy','buy.feed',1,2)).toEqual({ok:false,reason:'transaction-failed'});expect(g.snapshot()).toEqual(before);
  expect(g.economy.trade('buy','upgrade.barn.1',1,2,{farm:false,upgraded:()=>{throw new Error('fixture upgrade failure');}})).toEqual({ok:false,reason:'transaction-failed'});expect(g.snapshot()).toEqual(before);expect(g.barn.capacity).toBe(24);
});
