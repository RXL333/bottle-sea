import type { ItemRegistry } from './ItemRegistry';

export const PLAYER_INVENTORY_CAPACITY = 24;
export const MAX_INVENTORY_CAPACITY = 200;
export interface ItemStack { itemId: string; quantity: number }
export type InventorySlot=ItemStack|null;
export interface InventorySnapshot { capacity: number; slots: InventorySlot[]; selectedSlot?:number|null }
export type InventoryResult = { ok: true } | {
  ok: false;
  reason: 'unknown-item' | 'invalid-quantity' | 'full' | 'insufficient-items' | 'same-inventory' | 'invalid-slot' | 'empty-slot' | 'occupied-slot';
};
export interface InventoryOptions {quantityCapacity?:number;beforeNotify?:()=>void}
export type InventoryTransferResult=Extract<InventoryResult,{ok:false}>|{ok:true;quantity:number;moved:ItemStack[];remaining:ItemStack[]};

/** Restore is bounded by the runtime capacity; save data cannot enlarge a bag. */
export function normalizeInventory(value: unknown, items: ItemRegistry, capacity = PLAYER_INVENTORY_CAPACITY,quantityCapacity=Infinity): InventorySnapshot {
  if (!Number.isSafeInteger(capacity) || capacity < 1 || capacity > MAX_INVENTORY_CAPACITY) {
    throw new Error('Invalid inventory capacity');
  }
  if(quantityCapacity!==Infinity&&(!Number.isSafeInteger(quantityCapacity)||quantityCapacity<1))throw new Error('Invalid quantity capacity');
  let room=quantityCapacity;
  const raw = value && typeof value === 'object' ? value as Partial<InventorySnapshot> : {};
  const source = Array.isArray(raw.slots) ? raw.slots : [];
  const slots = Array.from({ length: capacity }, (_, i): ItemStack | null => {
    const stack: unknown = source[i];
    if (!stack || typeof stack !== 'object') return null;
    const candidate = stack as Partial<ItemStack>;
    const item = typeof candidate.itemId === 'string' ? items.get(candidate.itemId) : undefined;
    if (!item || !Number.isSafeInteger(candidate.quantity) || candidate.quantity! <= 0) return null;
    const quantity=Math.min(candidate.quantity!,item.maxStack,room);room-=quantity;return quantity?{itemId:item.id,quantity}:null;
  });
  const selectedSlot=typeof raw.selectedSlot==='number'&&Number.isInteger(raw.selectedSlot)&&raw.selectedSlot>=0&&raw.selectedSlot<capacity?raw.selectedSlot:null;
  return { capacity, slots, selectedSlot };
}

export class Inventory {
  private slots: (ItemStack | null)[];
  private selection:number|null;
  revision=0;

  constructor(readonly items: ItemRegistry, readonly capacity = PLAYER_INVENTORY_CAPACITY,
    saved?: unknown, private onChange: () => void = () => {},private options:InventoryOptions={}) {
    const state=normalizeInventory(saved,items,capacity,this.quantityCapacity);this.slots=state.slots;this.selection=state.selectedSlot??null;
  }
  get quantityCapacity(){return this.options.quantityCapacity??Infinity;}
  get usedQuantity(){return this.slots.reduce((n,s)=>n+(s?.quantity??0),0);}
  get remainingQuantity(){return this.quantityCapacity-this.usedQuantity;}

  snapshot(): InventorySnapshot {
    return { capacity: this.capacity, slots: this.slots.map(stack => stack ? { ...stack } : null),selectedSlot:this.selection };
  }

  restore(value: unknown): void {
    const next = normalizeInventory(value, this.items, this.capacity,this.quantityCapacity);
    if (JSON.stringify(next) === JSON.stringify(this.snapshot())) return;
    this.slots = next.slots;this.selection=next.selectedSlot??null;
    this.changed();
  }

  get selectedSlot(){return this.selection;}
  get occupiedSlots(){return this.slots.filter(Boolean).length;}
  get emptySlots(){return this.capacity-this.occupiedSlots;}
  firstEmptySlot(){return this.slots.findIndex(stack=>stack===null);}
  getSlot(index:number):ItemStack|null {const stack=this.slots[index];return stack?{...stack}:null;}
  selectSlot(index:number|null):InventoryResult {
    if(index!==null&&!this.validSlot(index))return {ok:false,reason:'invalid-slot'};
    if(this.selection!==index){this.selection=index;this.changed();}return {ok:true};
  }
  removeFromSlot(index:number,quantity=1):InventoryResult {
    if(!this.validSlot(index))return {ok:false,reason:'invalid-slot'};
    const stack=this.slots[index];if(!stack)return {ok:false,reason:'empty-slot'};
    const valid=this.validate(stack.itemId,quantity);if(!valid.ok)return valid;
    if(stack.quantity<quantity)return {ok:false,reason:'insufficient-items'};
    this.slots[index]=stack.quantity===quantity?null:{...stack,quantity:stack.quantity-quantity};this.changed();return {ok:true};
  }
  /** Dragging a whole stack swaps different items; matching items merge up to the cap. */
  moveSlotTo(target:Inventory,from:number,to:number,quantity?:number):InventoryResult {
    if(!this.validSlot(from)||!target.validSlot(to))return {ok:false,reason:'invalid-slot'};
    const stack=this.slots[from];if(!stack)return {ok:false,reason:'empty-slot'};
    const amount=quantity??stack.quantity,valid=target.validate(stack.itemId,amount);if(!valid.ok)return valid;
    if(amount>stack.quantity)return {ok:false,reason:'insufficient-items'};
    if(target===this&&from===to)return {ok:true};
    const other=target.slots[to],source=this.snapshot().slots,dest=target===this?source:target.snapshot().slots;
    if(other&&other.itemId!==stack.itemId){
      if(amount!==stack.quantity)return {ok:false,reason:'occupied-slot'};
      if(!this.items.has(other.itemId))return {ok:false,reason:'unknown-item'};
      if(other.quantity>this.items.get(other.itemId)!.maxStack||amount>target.items.get(stack.itemId)!.maxStack)return {ok:false,reason:'full'};
      if(target!==this&&(target.usedQuantity-other.quantity+amount>target.quantityCapacity||this.usedQuantity-amount+other.quantity>this.quantityCapacity))return {ok:false,reason:'full'};
      source[from]={...other};dest[to]={...stack};
    }else{
      const room=Math.min(target.items.get(stack.itemId)!.maxStack-(other?.quantity??0),target===this?Infinity:target.remainingQuantity),moved=Math.min(amount,room);
      if(moved<=0)return {ok:false,reason:'full'};
      dest[to]={itemId:stack.itemId,quantity:(other?.quantity??0)+moved};source[from]=stack.quantity===moved?null:{...stack,quantity:stack.quantity-moved};
    }
    this.slots=source;if(target!==this)target.slots=dest;
    this.notifyWith(target);return {ok:true};
  }
  moveStack(from:number,to:number,quantity?:number){return this.moveSlotTo(this,from,to,quantity);}
  splitStack(from:number,to:number,quantity:number):InventoryResult {
    if(!this.validSlot(from)||!this.validSlot(to))return {ok:false,reason:'invalid-slot'};
    const stack=this.slots[from];if(!stack)return {ok:false,reason:'empty-slot'};
    if(this.slots[to])return {ok:false,reason:'occupied-slot'};
    if(quantity>=stack.quantity)return {ok:false,reason:'invalid-quantity'};
    return this.moveStack(from,to,quantity);
  }
  /** Transfer from the selected stack, rather than removing matching items elsewhere. */
  transferSlotTo(target:Inventory,from:number,quantity?:number):InventoryResult {
    if(target===this)return {ok:false,reason:'same-inventory'};
    if(!this.validSlot(from))return {ok:false,reason:'invalid-slot'};
    const stack=this.slots[from];if(!stack)return {ok:false,reason:'empty-slot'};
    const amount=quantity??stack.quantity,valid=this.validate(stack.itemId,amount);if(!valid.ok)return valid;
    if(amount>stack.quantity)return {ok:false,reason:'insufficient-items'};
    const planned=target.planAdd(stack.itemId,amount);if(!planned.ok)return planned;
    this.slots[from]=stack.quantity===amount?null:{...stack,quantity:stack.quantity-amount};target.slots=planned.slots;
    this.notifyWith(target);return {ok:true};
  }
  /** All-or-nothing bulk storage; both inventories commit before save callbacks. */
  transferAllTo(target:Inventory):InventoryResult {
    if(target===this)return {ok:false,reason:'same-inventory'};
    if(!this.occupiedSlots)return {ok:true};
    const trial=new Inventory(target.items,target.capacity,target.snapshot(),undefined,{quantityCapacity:target.quantityCapacity});
    for(const stack of this.slots)if(stack){const result=trial.add(stack.itemId,stack.quantity);if(!result.ok)return result;}
    this.slots=this.slots.map(()=>null);target.slots=trial.snapshot().slots;this.notifyWith(target);return {ok:true};
  }
  /** Plan all feasible stacks, then commit both owners before any save notification. */
  transferAvailableTo(target:Inventory,request:{quantity?:number;slot?:number}={}):InventoryTransferResult {
    if(target===this)return {ok:false,reason:'same-inventory'};
    let budget=request.quantity??Infinity;
    if(budget!==Infinity&&(!Number.isSafeInteger(budget)||budget<1))return {ok:false,reason:'invalid-quantity'};
    if(request.slot!==undefined&&!this.validSlot(request.slot))return {ok:false,reason:'invalid-slot'};
    const source=this.snapshot().slots,trial=new Inventory(target.items,target.capacity,target.snapshot(),undefined,{quantityCapacity:target.quantityCapacity}),moved=new Map<string,number>();let quantity=0;
    for(let i=0;i<source.length;i++){
      if(request.slot!==undefined&&request.slot!==i)continue;
      const stack=source[i];if(!stack)continue;
      const amount=Math.min(stack.quantity,budget,trial.roomFor(stack.itemId));if(amount<=0)continue;
      const added=trial.add(stack.itemId,amount);if(!added.ok)return added;
      source[i]=amount===stack.quantity?null:{...stack,quantity:stack.quantity-amount};budget-=amount;quantity+=amount;moved.set(stack.itemId,(moved.get(stack.itemId)??0)+amount);
    }
    const remaining=source.filter((s):s is ItemStack=>!!s).map(s=>({...s}));
    if(!quantity&&this.occupiedSlots)return {ok:false,reason:'full'};
    if(quantity){this.slots=source;target.slots=trial.snapshot().slots;this.notifyWith(target);}
    return {ok:true,quantity,moved:[...moved].map(([itemId,quantity])=>({itemId,quantity})),remaining};
  }
  private roomFor(itemId:string){const item=this.items.get(itemId);return item?Math.min(this.remainingQuantity,this.emptySlots*item.maxStack+this.slots.reduce((n,s)=>n+(s?.itemId===itemId?item.maxStack-s.quantity:0),0)):0;}
  private validSlot(index:number){return Number.isInteger(index)&&index>=0&&index<this.capacity;}
  private changed(){this.options.beforeNotify?.();this.revision++;this.onChange();}
  private notifyWith(target:Inventory){
    this.options.beforeNotify?.();if(target!==this)target.options.beforeNotify?.();
    this.revision++;if(target!==this)target.revision++;this.onChange();if(target!==this)target.onChange();
  }

  count(itemId: string): number {
    return this.slots.reduce((total, stack) => total + (stack?.itemId === itemId ? stack.quantity : 0), 0);
  }

  has(itemId: string, quantity = 1): boolean {
    return this.validate(itemId, quantity).ok && this.count(itemId) >= quantity;
  }

  canAdd(itemId: string, quantity = 1): boolean { return this.planAdd(itemId, quantity).ok; }

  canExchange(consumed:readonly ItemStack[],produced:readonly ItemStack[]):InventoryResult {
    const plan=this.planExchange(consumed,produced);return plan.ok?{ok:true}:plan;
  }
  /** Crafting frees ingredient slots before placing outputs, then commits once. */
  exchange(consumed:readonly ItemStack[],produced:readonly ItemStack[]):InventoryResult {
    const plan=this.planExchange(consumed,produced);if(!plan.ok)return plan;
    this.slots=plan.slots;this.changed();return {ok:true};
  }
  private planExchange(consumed:readonly ItemStack[],produced:readonly ItemStack[]):{ok:true;slots:(ItemStack|null)[]}|Extract<InventoryResult,{ok:false}> {
    const trial=new Inventory(this.items,this.capacity,this.snapshot(),undefined,{quantityCapacity:this.quantityCapacity});
    for(const stack of consumed){const result=trial.remove(stack.itemId,stack.quantity);if(!result.ok)return result;}
    for(const stack of produced){const result=trial.add(stack.itemId,stack.quantity);if(!result.ok)return result;}
    return {ok:true,slots:trial.snapshot().slots};
  }

  add(itemId: string, quantity = 1): InventoryResult {
    const planned = this.planAdd(itemId, quantity);
    if (!planned.ok) return planned;
    this.slots = planned.slots;
    this.changed();
    return { ok: true };
  }

  remove(itemId: string, quantity = 1): InventoryResult {
    const planned = this.planRemove(itemId, quantity);
    if (!planned.ok) return planned;
    this.slots = planned.slots;
    this.changed();
    return { ok: true };
  }

  /** Both inventories commit before either save callback sees their state. */
  transferTo(target: Inventory, itemId: string, quantity = 1): InventoryResult {
    if (target === this) return { ok: false, reason: 'same-inventory' };
    const source = this.planRemove(itemId, quantity);
    if (!source.ok) return source;
    const destination = target.planAdd(itemId, quantity);
    if (!destination.ok) return destination;
    this.slots = source.slots;
    target.slots = destination.slots;
    this.notifyWith(target);
    return { ok: true };
  }

  private validate(itemId: string, quantity: number): InventoryResult {
    if (!this.items.has(itemId)) return { ok: false, reason: 'unknown-item' };
    if (!Number.isSafeInteger(quantity) || quantity <= 0) return { ok: false, reason: 'invalid-quantity' };
    return { ok: true };
  }

  private planAdd(itemId: string, quantity: number): { ok: true; slots: (ItemStack | null)[] } | Extract<InventoryResult, { ok: false }> {
    const valid = this.validate(itemId, quantity);
    if (!valid.ok) return valid;
    if(quantity>this.remainingQuantity)return {ok:false,reason:'full'};
    const maxStack = this.items.get(itemId)!.maxStack;
    const slots = this.snapshot().slots;
    let remaining = quantity;
    for (const stack of slots) {
      if (stack?.itemId !== itemId) continue;
      const added = Math.min(remaining, maxStack - stack.quantity);
      stack.quantity += added;
      remaining -= added;
    }
    for (let i = 0; i < slots.length && remaining > 0; i++) {
      if (slots[i]) continue;
      const added = Math.min(remaining, maxStack);
      slots[i] = { itemId, quantity: added };
      remaining -= added;
    }
    return remaining > 0 ? { ok: false, reason: 'full' } : { ok: true, slots };
  }

  private planRemove(itemId: string, quantity: number): { ok: true; slots: (ItemStack | null)[] } | Extract<InventoryResult, { ok: false }> {
    const valid = this.validate(itemId, quantity);
    if (!valid.ok) return valid;
    if (this.count(itemId) < quantity) return { ok: false, reason: 'insufficient-items' };
    const slots = this.snapshot().slots;
    let remaining = quantity;
    for (let i = 0; i < slots.length && remaining > 0; i++) {
      const stack = slots[i];
      if (stack?.itemId !== itemId) continue;
      const removed = Math.min(stack.quantity, remaining);
      stack.quantity -= removed;
      remaining -= removed;
      if (stack.quantity === 0) slots[i] = null;
    }
    return { ok: true, slots };
  }
}
