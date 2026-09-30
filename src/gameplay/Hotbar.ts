import type { Inventory } from './Inventory';
import type { ItemRegistry } from './ItemRegistry';
import type { InventoryResult } from './Inventory';
export const HOTBAR_SIZE=8;
export interface HotbarSnapshot {bindings:(string|null)[];selectedIndex:number}
export function normalizeHotbar(value:unknown,items:ItemRegistry):HotbarSnapshot {
  const raw=value&&typeof value==='object'?value as Partial<HotbarSnapshot>:{};
  const bindings=Array.from({length:HOTBAR_SIZE},(_,i)=>{const id=Array.isArray(raw.bindings)?raw.bindings[i]:null;return typeof id==='string'&&items.has(id)?id:null;});
  const selectedIndex=typeof raw.selectedIndex==='number'&&Number.isInteger(raw.selectedIndex)&&raw.selectedIndex>=0&&raw.selectedIndex<HOTBAR_SIZE?raw.selectedIndex:0;
  return {bindings,selectedIndex};
}
/** Bindings are item references. Counts are always derived from the player's bag. */
export class Hotbar {
  private state:HotbarSnapshot;revision=0;
  constructor(readonly inventory:Inventory,saved?:unknown,private onChange:()=>void=()=>{}){this.state=normalizeHotbar(saved,inventory.items);}
  get selectedIndex(){return this.state.selectedIndex;}
  get selectedItem(){return this.itemAt(this.selectedIndex);}
  itemAt(index:number){const id=this.state.bindings[index];return id?this.inventory.items.get(id):undefined;}
  countAt(index:number){const item=this.itemAt(index);return item?this.inventory.count(item.id):0;}
  bind(index:number,itemId:string|null):InventoryResult {
    if(!Number.isInteger(index)||index<0||index>=HOTBAR_SIZE)return {ok:false,reason:'invalid-slot'};
    if(itemId!==null&&!this.inventory.items.has(itemId))return {ok:false,reason:'unknown-item'};
    if(itemId!==null&&!this.inventory.has(itemId))return {ok:false,reason:'insufficient-items'};
    if(this.state.bindings[index]!==itemId){this.state.bindings[index]=itemId;this.changed();}return {ok:true};
  }
  select(index:number){if(!Number.isInteger(index)||index<0||index>=HOTBAR_SIZE)return;if(this.state.selectedIndex!==index){this.state.selectedIndex=index;this.changed();}}
  snapshot():HotbarSnapshot{return {bindings:[...this.state.bindings],selectedIndex:this.selectedIndex};}
  private changed(){this.revision++;this.onChange();}
}
