import type { GameClock } from '../core/GameClock';
import { Inventory } from './Inventory';
import type { InventorySnapshot } from './Inventory';
import { ITEMS } from './ItemRegistry';
import type { ItemRegistry } from './ItemRegistry';
import { PlayerProgress } from './PlayerProgressState';
import type { PlayerProgressState } from './PlayerProgressState';
import { GameplayTime } from './GameplayTime';
import { HomeSystem } from './HomeSystem';
import type { HomeSnapshot } from './HomeSystem';

export interface GameplaySnapshot { inventory: InventorySnapshot; progress: PlayerProgressState; home: HomeSnapshot }
export interface GameplayServices {
  readonly items: ItemRegistry;
  readonly inventory: Inventory;
  readonly progress: PlayerProgress;
  readonly time: GameplayTime;
  readonly home: HomeSystem;
  requestSave(): void;
}

/** Owned by Game for its whole lifetime, never by a disposable world. */
export class GameplayFoundation implements GameplayServices {
  readonly inventory: Inventory;
  readonly progress: PlayerProgress;
  readonly time: GameplayTime;
  readonly home: HomeSystem;

  constructor(clock: GameClock, saved?: Partial<GameplaySnapshot>,
    readonly items: ItemRegistry = ITEMS, private onChange: () => void = () => {}) {
    this.inventory = new Inventory(items, undefined, saved?.inventory, () => this.requestSave());
    this.progress = new PlayerProgress(saved?.progress, () => this.requestSave());
    this.time = new GameplayTime(clock, () => this.requestSave());
    this.home = new HomeSystem(items, this.progress, this.time, saved?.home, () => this.requestSave());
  }

  requestSave(): void { this.onChange(); }
  snapshot(): GameplaySnapshot { return { inventory: this.inventory.snapshot(), progress: this.progress.snapshot(), home: this.home.snapshot() }; }
}
