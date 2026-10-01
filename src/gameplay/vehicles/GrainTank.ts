import { Inventory,normalizeInventory } from '../Inventory';
import type { InventoryResult,ItemStack } from '../Inventory';
import { ITEMS } from '../ItemRegistry';
import type { ItemRegistry } from '../ItemRegistry';
import { getCropRegistry } from '../farm/CropRegistry';

export const GRAIN_TANK_CAPACITY=60;
export const BARN_CAPACITY=24;
const TANK_SLOTS=2;
export function normalizeGrainTank(value:unknown,items:ItemRegistry=ITEMS){
  const state=normalizeInventory(value,items,TANK_SLOTS),allowed=new Set(getCropRegistry(items).list().filter(c=>c.machineHarvestable).map(c=>c.harvestItemId));let room=GRAIN_TANK_CAPACITY;
  state.slots=state.slots.map(s=>{if(!s||!allowed.has(s.itemId)||!room)return null;const quantity=Math.min(s.quantity,room);room-=quantity;return {...s,quantity};});return state;
}
/** Bulk capacity around the shared slot inventory. No second item count. */
export class GrainTank {
  private inventory:Inventory;
  constructor(items:ItemRegistry=ITEMS,saved?:unknown,onChange:()=>void=()=>{},beforeNotify:()=>void=()=>{}){this.inventory=new Inventory(items,TANK_SLOTS,normalizeGrainTank(saved,items),onChange,{quantityCapacity:GRAIN_TANK_CAPACITY,beforeNotify});}
  get contents():ItemStack[]{return this.inventory.snapshot().slots.filter((s):s is ItemStack=>!!s);}
  get used(){return this.contents.reduce((total,s)=>total+s.quantity,0);}
  get remaining(){return GRAIN_TANK_CAPACITY-this.used;}
  snapshot(){return this.inventory.snapshot();}
  canExchange(consumed:readonly ItemStack[],produced:readonly ItemStack[]):InventoryResult {
    if(consumed.length)return {ok:false,reason:'invalid-quantity'};
    const allowed=new Set(getCropRegistry(this.inventory.items).list().filter(c=>c.machineHarvestable).map(c=>c.harvestItemId));
    if(produced.some(s=>!allowed.has(s.itemId)))return {ok:false,reason:'unknown-item'};
    const checked=this.inventory.canExchange([],produced);if(!checked.ok)return checked;
    return produced.reduce((total,s)=>total+s.quantity,0)>this.remaining?{ok:false,reason:'full'}:{ok:true};
  }
  exchange(consumed:readonly ItemStack[],produced:readonly ItemStack[]):InventoryResult {const check=this.canExchange(consumed,produced);return check.ok?this.inventory.exchange([],produced):check;}
  /** Both inventories commit before either callback. Future trailer inventory uses this interface too. */
  unloadTo(target:Inventory):InventoryResult{return this.inventory.transferAllTo(target);}
  unloadAvailableTo(target:Inventory){return this.inventory.transferAvailableTo(target);}
}
