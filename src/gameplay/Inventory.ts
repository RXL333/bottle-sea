import type { ItemRegistry } from './ItemRegistry';

export const PLAYER_INVENTORY_CAPACITY = 24;
export const MAX_INVENTORY_CAPACITY = 200;
export interface ItemStack { itemId: string; quantity: number }
export interface InventorySnapshot { capacity: number; slots: (ItemStack | null)[] }
export type InventoryResult = { ok: true } | {
  ok: false;
  reason: 'unknown-item' | 'invalid-quantity' | 'full' | 'insufficient-items' | 'same-inventory';
};

/** Restore is bounded by the runtime capacity; save data cannot enlarge a bag. */
export function normalizeInventory(value: unknown, items: ItemRegistry, capacity = PLAYER_INVENTORY_CAPACITY): InventorySnapshot {
  if (!Number.isSafeInteger(capacity) || capacity < 1 || capacity > MAX_INVENTORY_CAPACITY) {
    throw new Error('Invalid inventory capacity');
  }
  const raw = value && typeof value === 'object' ? value as Partial<InventorySnapshot> : {};
  const source = Array.isArray(raw.slots) ? raw.slots : [];
  const slots = Array.from({ length: capacity }, (_, i): ItemStack | null => {
    const stack: unknown = source[i];
    if (!stack || typeof stack !== 'object') return null;
    const candidate = stack as Partial<ItemStack>;
    const item = typeof candidate.itemId === 'string' ? items.get(candidate.itemId) : undefined;
    if (!item || !Number.isSafeInteger(candidate.quantity) || candidate.quantity! <= 0) return null;
    return { itemId: item.id, quantity: Math.min(candidate.quantity!, item.maxStack) };
  });
  return { capacity, slots };
}

export class Inventory {
  private slots: (ItemStack | null)[];

  constructor(readonly items: ItemRegistry, readonly capacity = PLAYER_INVENTORY_CAPACITY,
    saved?: unknown, private onChange: () => void = () => {}) {
    this.slots = normalizeInventory(saved, items, capacity).slots;
  }

  snapshot(): InventorySnapshot {
    return { capacity: this.capacity, slots: this.slots.map(stack => stack ? { ...stack } : null) };
  }

  restore(value: unknown): void {
    const next = normalizeInventory(value, this.items, this.capacity).slots;
    if (JSON.stringify(next) === JSON.stringify(this.slots)) return;
    this.slots = next;
    this.onChange();
  }

  count(itemId: string): number {
    return this.slots.reduce((total, stack) => total + (stack?.itemId === itemId ? stack.quantity : 0), 0);
  }

  has(itemId: string, quantity = 1): boolean {
    return this.validate(itemId, quantity).ok && this.count(itemId) >= quantity;
  }

  canAdd(itemId: string, quantity = 1): boolean { return this.planAdd(itemId, quantity).ok; }

  add(itemId: string, quantity = 1): InventoryResult {
    const planned = this.planAdd(itemId, quantity);
    if (!planned.ok) return planned;
    this.slots = planned.slots;
    this.onChange();
    return { ok: true };
  }

  remove(itemId: string, quantity = 1): InventoryResult {
    const planned = this.planRemove(itemId, quantity);
    if (!planned.ok) return planned;
    this.slots = planned.slots;
    this.onChange();
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
    this.onChange();
    target.onChange();
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
