import { normalizeInventory } from '../Inventory';
import { ITEMS } from '../ItemRegistry';
import type { ItemRegistry } from '../ItemRegistry';
export const TRAILER_CARGO_CAPACITY=120;
export const TRAILER_CARGO_SLOTS=4;
export const normalizeTrailerCargo=(saved:unknown,items:ItemRegistry=ITEMS)=>normalizeInventory(saved,items,TRAILER_CARGO_SLOTS,TRAILER_CARGO_CAPACITY);
