import { expect,it,vi } from 'vitest';
import { Inventory,normalizeInventory } from './Inventory';
import { ITEMS,ItemRegistry } from './ItemRegistry';

const bounded=(limit=120)=>new Inventory(ITEMS,4,undefined,undefined,{quantityCapacity:limit});
it('partially transfers up to the receiver unit capacity and leaves mixed stacks intact',()=>{
  const source=new Inventory(ITEMS),target=bounded();source.add('crop.wheat',60);source.add('crop.corn',20);target.add('wood',100);
  expect(source.transferAvailableTo(target)).toMatchObject({ok:true,quantity:20,moved:[{itemId:'crop.wheat',quantity:20}]});
  expect(source.count('crop.wheat')).toBe(40);expect(source.count('crop.corn')).toBe(20);expect(target.usedQuantity).toBe(120);
  const before=[source.snapshot(),target.snapshot()];expect(source.transferAvailableTo(target)).toEqual({ok:false,reason:'full'});expect([source.snapshot(),target.snapshot()]).toEqual(before);
  target.remove('wood',100);expect(source.transferAvailableTo(target)).toMatchObject({ok:true,quantity:60});expect(source.usedQuantity).toBe(0);expect(target.count('crop.wheat')).toBe(60);expect(target.count('crop.corn')).toBe(20);
});
it('uses stack space and skips blocked item types without losing the remainder',()=>{
  const source=new Inventory(ITEMS),target=new Inventory(ITEMS,2);source.add('crop.corn',10);source.add('crop.wheat',8);target.add('wood',99);target.add('crop.wheat',97);
  expect(source.transferAvailableTo(target)).toMatchObject({ok:true,quantity:2,moved:[{itemId:'crop.wheat',quantity:2}]});expect(source.count('crop.corn')).toBe(10);expect(source.count('crop.wheat')).toBe(6);
  const other=new ItemRegistry().register(ITEMS.get('wood')!);expect(source.transferAvailableTo(new Inventory(other,2))).toEqual({ok:false,reason:'full'});
});
it('honors a selected stack and requested quantity and keeps old bulk operations atomic',()=>{
  const source=new Inventory(ITEMS),target=bounded(7);source.add('wood',10);source.add('crop.wheat',10);
  expect(source.transferAvailableTo(target,{slot:1,quantity:3})).toMatchObject({ok:true,quantity:3});expect(source.count('wood')).toBe(10);expect(source.count('crop.wheat')).toBe(7);
  const before=[source.snapshot(),target.snapshot()];expect(source.transferAllTo(target)).toEqual({ok:false,reason:'full'});expect(source.transferSlotTo(target,0,5)).toEqual({ok:false,reason:'full'});expect([source.snapshot(),target.snapshot()]).toEqual(before);
  expect(source.transferAvailableTo(target,{slot:0})).toMatchObject({ok:true,quantity:4});expect(target.usedQuantity).toBe(7);
  expect(source.transferAvailableTo(source)).toEqual({ok:false,reason:'same-inventory'});expect(source.transferAvailableTo(target,{quantity:NaN})).toEqual({ok:false,reason:'invalid-quantity'});expect(source.transferAvailableTo(target,{slot:100})).toEqual({ok:false,reason:'invalid-slot'});
});
it('enforces total capacity for drag, swaps, crafting and restore while allowing internal splits',()=>{
  const bag=new Inventory(ITEMS),target=bounded(10);bag.add('wood',15);target.add('crop.wheat',8);
  expect(bag.moveSlotTo(target,0,1)).toEqual({ok:true});expect(target.usedQuantity).toBe(10);expect(bag.count('wood')).toBe(13);
  expect(target.splitStack(0,2,3)).toEqual({ok:true});expect(target.usedQuantity).toBe(10);
  expect(bag.moveSlotTo(target,0,0)).toEqual({ok:false,reason:'full'});expect(target.exchange([],[{itemId:'wood',quantity:1}])).toEqual({ok:false,reason:'full'});
  expect(target.exchange([{itemId:'crop.wheat',quantity:2}],[{itemId:'wood',quantity:2}])).toEqual({ok:true});expect(target.usedQuantity).toBe(10);
  target.restore({slots:[{itemId:'wood',quantity:99},{itemId:'crop.corn',quantity:99}]});expect(target.usedQuantity).toBe(10);
  expect(()=>normalizeInventory({},ITEMS,4,0)).toThrow();expect(target.add('wood',1)).toEqual({ok:false,reason:'full'});
});
it('prepares both persistent owners before either save callback runs',()=>{
  let left=0,right=0;const saved:number[][]=[],prepared:string[]=[],changed=vi.fn();
  const source=new Inventory(ITEMS,4,undefined,()=>{changed();saved.push([left,right]);},{beforeNotify:()=>{left=source.usedQuantity;prepared.push('source');}});
  const target=new Inventory(ITEMS,4,undefined,()=>{changed();saved.push([left,right]);},{quantityCapacity:12,beforeNotify:()=>{right=target.usedQuantity;prepared.push('target');}});
  source.add('crop.wheat',20);changed.mockClear();saved.length=0;prepared.length=0;
  source.transferAvailableTo(target);expect(prepared).toEqual(['source','target']);expect(saved).toEqual([[8,12],[8,12]]);expect(changed).toHaveBeenCalledTimes(2);
  source.transferAvailableTo(target);expect(changed).toHaveBeenCalledTimes(2);
  expect(new Inventory(ITEMS).transferAvailableTo(target)).toMatchObject({ok:true,quantity:0});
});
