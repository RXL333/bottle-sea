import { Inventory, normalizeInventory } from './Inventory';
import type { InventorySnapshot } from './Inventory';
import type { ItemRegistry } from './ItemRegistry';
import type { PlayerProgress } from './PlayerProgressState';
import type { GameplayTime } from './GameplayTime';

export const HOME_CHEST_CAPACITY = 24;
export interface HomeSnapshot { chest: InventorySnapshot }

/** Supplies are granted only when no Home state exists, including pre-Home saves. */
export function normalizeHome(value: unknown, items: ItemRegistry): HomeSnapshot {
  const raw = value && typeof value === 'object' && !Array.isArray(value)
    ? value as Partial<HomeSnapshot> : undefined;
  const chest = new Inventory(items, HOME_CHEST_CAPACITY, raw?.chest);
  if (!raw) {
    if (items.has('wood')) chest.add('wood', 8);
    if (items.has('stone')) chest.add('stone', 4);
  }
  return { chest: normalizeInventory(chest.snapshot(), items, HOME_CHEST_CAPACITY) };
}

/** Persistent furniture state survives disposable interior/exterior worlds. */
export class HomeSystem {
  readonly chest: Inventory;
  constructor(items: ItemRegistry, private progress: PlayerProgress, private time: GameplayTime,
    saved?: unknown, onChange: () => void = () => {}) {
    const state = normalizeHome(saved, items);
    this.chest = new Inventory(items, HOME_CHEST_CAPACITY, state.chest, onChange);
  }
  sleep(): { day: number; recoveredEnergy: number } {
    // Advance first: if the clock rejects overflow, energy is left untouched.
    this.time.advanceToNextDay(6, 0);
    const recoveredEnergy = this.progress.restoreEnergy(this.progress.maxEnergy);
    return { day: this.time.day, recoveredEnergy };
  }
  snapshot(): HomeSnapshot { return { chest: this.chest.snapshot() }; }
}
