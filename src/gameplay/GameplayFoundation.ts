import { CollectionSystem } from './collections/CollectionSystem';
import { createCollectionRegistry } from './collections/CollectionRegistry';
import type { CollectionSnapshot } from './collections/CollectionSystem';
import { DialogueSystem } from './npc/DialogueSystem';
import { CommissionSystem } from './commissions/CommissionSystem';
import type { CommissionSnapshot } from './commissions/CommissionState';
import type { DialogueSnapshot } from './npc/DialogueSystem';
import { CalendarSystem } from './calendar/CalendarSystem';
import type { CalendarSnapshot } from './calendar/CalendarSystem';
import { ProgressionSystem } from './progression/ProgressionSystem';
import type { ProgressionSnapshot } from './progression/ProgressionState';
import type { ActivitySink } from './progression/ProgressionRegistry';
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
import { LivestockSystem } from './livestock/LivestockSystem';
import type { LivestockSnapshot } from './livestock/LivestockState';
import { EconomySystem } from './economy/EconomySystem';
import { normalizeEconomy } from './economy/EconomyState';
import type { EconomySnapshot } from './economy/EconomyState';
import { BARN_CAPACITIES,GRAIN_CAPACITIES } from './economy/TradeCatalog';

export interface GameplaySnapshot { collections:CollectionSnapshot;commissions:CommissionSnapshot;dialogue:DialogueSnapshot;calendar:CalendarSnapshot; inventory: InventorySnapshot; barn:InventorySnapshot;progress: PlayerProgressState; home: HomeSnapshot; fishing:FishingSnapshot;hotbar:HotbarSnapshot;farm:FarmSnapshot;vehicles:VehicleSnapshot;livestock:LivestockSnapshot;economy:EconomySnapshot;progression:ProgressionSnapshot }
export interface GameplayServices {
  readonly collections:CollectionSystem;
  readonly commissions:CommissionSystem;
  readonly dialogue:DialogueSystem;
  readonly calendar:CalendarSystem;
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
  readonly livestock:LivestockSystem;
  readonly economy:EconomySystem;
  readonly progression:ProgressionSystem;
  requestSave(immediate?:boolean): void;
}

/** Owned by Game for its whole lifetime, never by a disposable world. */
export class GameplayFoundation implements GameplayServices {
  readonly collections:CollectionSystem;
  readonly commissions:CommissionSystem;
  private collectionReady=false;private saveDepth=0;private savePending=false;private saveImmediate=false;
  readonly dialogue:DialogueSystem;
  readonly calendar:CalendarSystem;
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
  readonly livestock:LivestockSystem;
  readonly economy:EconomySystem;
  readonly progression:ProgressionSystem;

  constructor(clock: GameClock, saved?: Partial<GameplaySnapshot>,
    readonly items: ItemRegistry = ITEMS, private onChange: (immediate?:boolean) => void = () => {}) {
    this.collections=new CollectionSystem(()=>clock.simulationTime,saved?.collections,()=>this.requestSave(true),createCollectionRegistry(items));
    this.dialogue=new DialogueSystem(()=>clock.simulationTime,saved?.dialogue,()=>this.requestSave(true));
    this.calendar=new CalendarSystem(clock,saved?.calendar,()=>this.requestSave(true));
    const economy=normalizeEconomy(saved?.economy);
    this.progression=new ProgressionSystem(clock,saved?.progression,()=>this.requestSave(true),saved!==undefined&&saved.progression===undefined);
    const activity:ActivitySink=(event,produced)=>{this.batchSave(()=>{this.collections.production(event,produced);this.commissions.record(event,produced);this.progression.record(event);});};
    this.inventory = new Inventory(items, undefined, saved?.inventory, () => this.requestSave());
    this.barn=new Inventory(items,BARN_CAPACITIES[economy.upgrades.barn],saved?.barn,()=>this.requestSave(true));
    this.progress = new PlayerProgress(saved?.progress, () => this.requestSave());
    this.time = new GameplayTime(clock, () => this.requestSave());
    this.home = new HomeSystem(items, this.progress, this.time, saved?.home, () => this.requestSave(),activity);
    this.fishing=new FishingSystem(this.inventory,this.progress,saved?.fishing,()=>this.requestSave(),undefined,activity,()=>this.calendar.date.season);
    this.cooking=new CookingSystem(this.inventory,this.progress,activity,id=>this.progression.registry.getUnlock(`recipe.${id}`)?this.progression.lockReason(`recipe.${id}`):undefined);
    this.hotbar=new Hotbar(this.inventory,saved?.hotbar,()=>this.requestSave());
    this.crops=new CropSystem(clock,getCropRegistry(items),this.calendar);
    // Farm commits land and Inventory before this callback; flush both together.
    this.farm=new FarmSystem(this.crops,this.inventory,saved?.farm,()=>this.requestSave(true),activity);
    this.vehicles=new VehicleProgress(saved?.vehicles,GRAIN_CAPACITIES[economy.upgrades.grain]);
    this.livestock=new LivestockSystem(clock,this.inventory,saved?.livestock,()=>this.requestSave(true),activity);
    this.economy=new EconomySystem(this.inventory,this.barn,this.vehicles,economy,()=>this.requestSave(true),activity,()=>this.progression.canAccess('capacity.upgrades'),()=>this.calendar.date.season);
    this.commissions=new CommissionSystem(()=>clock.simulationTime,this.inventory,this.economy,this.progression,saved?.commissions,()=>this.requestSave(true),action=>this.batchSave(action));
    if(saved&&saved.collections===undefined)this.collections.importEvidence(saved);
    this.collectionReady=true;
  }

  requestSave(immediate=false): void {if(this.saveDepth){this.savePending=true;this.saveImmediate||=immediate;return;}if(this.collectionReady){
    // Read the final net inventories after any reward transaction has committed or rolled back.
    this.saveDepth++;try{for(const stock of [this.inventory,this.barn,this.home.chest])this.collections.observeItems(stock.snapshot().slots);}finally{this.saveDepth--;}
    immediate||=this.saveImmediate;this.savePending=false;this.saveImmediate=false;
  }if(immediate)this.onChange(true);else this.onChange();}
  /** Persist after all owners commit. Nested activity/reward notifications share one final snapshot. */
  private batchSave<T>(action:()=>T):T {this.saveDepth++;try{return action();}finally{this.saveDepth--;if(!this.saveDepth&&this.savePending){const immediate=this.saveImmediate;this.savePending=false;this.saveImmediate=false;this.requestSave(immediate);}}}
  snapshot(): GameplaySnapshot { return { collections:this.collections.snapshot(),commissions:this.commissions.snapshot(),dialogue:this.dialogue.snapshot(),calendar:this.calendar.snapshot(),inventory: this.inventory.snapshot(),barn:this.barn.snapshot(), progress: this.progress.snapshot(), home: this.home.snapshot(),fishing:this.fishing.snapshot(),hotbar:this.hotbar.snapshot(),farm:this.farm.snapshot(),vehicles:this.vehicles.snapshot(),livestock:this.livestock.snapshot(),economy:this.economy.snapshot(),progression:this.progression.snapshot() }; }
}
