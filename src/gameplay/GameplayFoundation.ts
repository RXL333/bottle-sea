import type { GameClock } from '../core/GameClock';
import { Inventory } from './Inventory';
import { BARN_CAPACITY } from './vehicles/GrainTank';
import type { InventorySnapshot } from './Inventory';
import { ITEMS } from './ItemRegistry';
import type { ItemRegistry } from './ItemRegistry';
import { PlayerProgress } from './PlayerProgressState';
import type { PlayerProgressState } from './PlayerProgressState';
import { GameplayTime } from './GameplayTime';
import { HomeSystem } from './HomeSystem';
import type { HomeSnapshot } from './HomeSystem';
import { FishingSystem } from './FishingSystem';
import type { FishingSnapshot } from './FishingSystem';
import { CookingSystem } from './CookingSystem';
import { Hotbar } from './Hotbar';
import type { HotbarSnapshot } from './Hotbar';
import { getCropRegistry } from './farm/CropRegistry';
import { CropSystem } from './farm/CropSystem';
import { FarmSystem } from './farm/FarmSystem';
import type { FarmSnapshot } from './farm/FarmState';
import { VehicleProgress } from './vehicles/VehicleState';
import type { VehicleSnapshot } from './vehicles/VehicleState';

export interface GameplaySnapshot { inventory: InventorySnapshot; barn:InventorySnapshot;progress: PlayerProgressState; home: HomeSnapshot; fishing:FishingSnapshot;hotbar:HotbarSnapshot;farm:FarmSnapshot;vehicles:VehicleSnapshot }
export interface GameplayServices {
  readonly items: ItemRegistry;
  readonly inventory: Inventory;
  readonly barn:Inventory;
  readonly progress: PlayerProgress;
  readonly time: GameplayTime;
  readonly home: HomeSystem;
  readonly fishing:FishingSystem;
  readonly cooking:CookingSystem;
  readonly hotbar:Hotbar;
  readonly crops:CropSystem;
  readonly farm:FarmSystem;
  readonly vehicles:VehicleProgress;
  requestSave(immediate?:boolean): void;
}

/** Owned by Game for its whole lifetime, never by a disposable world. */
export class GameplayFoundation implements GameplayServices {
  readonly inventory: Inventory;
  readonly barn:Inventory;
  readonly progress: PlayerProgress;
  readonly time: GameplayTime;
  readonly home: HomeSystem;
  readonly fishing:FishingSystem;
  readonly cooking:CookingSystem;
  readonly hotbar:Hotbar;
  readonly crops:CropSystem;
  readonly farm:FarmSystem;
  readonly vehicles:VehicleProgress;

  constructor(clock: GameClock, saved?: Partial<GameplaySnapshot>,
    readonly items: ItemRegistry = ITEMS, private onChange: (immediate?:boolean) => void = () => {}) {
    this.inventory = new Inventory(items, undefined, saved?.inventory, () => this.requestSave());
    this.barn=new Inventory(items,BARN_CAPACITY,saved?.barn,()=>this.requestSave(true));
    this.progress = new PlayerProgress(saved?.progress, () => this.requestSave());
    this.time = new GameplayTime(clock, () => this.requestSave());
    this.home = new HomeSystem(items, this.progress, this.time, saved?.home, () => this.requestSave());
    this.fishing=new FishingSystem(this.inventory,this.progress,saved?.fishing,()=>this.requestSave());
    this.cooking=new CookingSystem(this.inventory,this.progress);
    this.hotbar=new Hotbar(this.inventory,saved?.hotbar,()=>this.requestSave());
    this.crops=new CropSystem(clock,getCropRegistry(items));
    // Farm commits land and Inventory before this callback; flush both together.
    this.farm=new FarmSystem(this.crops,this.inventory,saved?.farm,()=>this.requestSave(true));
    this.vehicles=new VehicleProgress(saved?.vehicles);
  }

  requestSave(immediate=false): void { if(immediate)this.onChange(true);else this.onChange(); }
  snapshot(): GameplaySnapshot { return { inventory: this.inventory.snapshot(),barn:this.barn.snapshot(), progress: this.progress.snapshot(), home: this.home.snapshot(),fishing:this.fishing.snapshot(),hotbar:this.hotbar.snapshot(),farm:this.farm.snapshot(),vehicles:this.vehicles.snapshot() }; }
}
