import { GameClock } from '../core/GameClock';
import type { ClockSnapshot } from '../core/GameClock';
import type { Quality } from '../core/Renderer';
import { defaultPlayerState, discoveryIds } from './PlayerState';
import type { PlayerState, PlayableWorldId } from './PlayerState';
import { WorldStateRegistry } from './WorldStateRegistry';
import type { WorldStates } from './WorldStateRegistry';
import { Inventory,normalizeInventory } from '../gameplay/Inventory';
import { ITEMS } from '../gameplay/ItemRegistry';
import type { ItemRegistry } from '../gameplay/ItemRegistry';
import { defaultPlayerProgressState,normalizePlayerProgress } from '../gameplay/PlayerProgressState';
import type { GameplaySnapshot } from '../gameplay/GameplayFoundation';
import { normalizeHome } from '../gameplay/HomeSystem';
import { normalizeFishing } from '../gameplay/FishingSystem';
import { normalizeHotbar } from '../gameplay/Hotbar';
import { getCropRegistry } from '../gameplay/farm/CropRegistry';
import { normalizeFarm } from '../gameplay/farm/FarmState';
import { normalizeVehicles } from '../gameplay/vehicles/VehicleState';
import { BARN_CAPACITY } from '../gameplay/vehicles/GrainTank';
import { normalizeLivestock } from '../gameplay/livestock/LivestockState';
import { normalizeEconomy } from '../gameplay/economy/EconomyState';
import { BARN_CAPACITIES,GRAIN_CAPACITIES } from '../gameplay/economy/TradeCatalog';
export const SAVE_KEY='bottle-sea.save.v2';
export const LEGACY_SAVE_KEY='bottle-sea.save.v1';
export interface SaveData extends GameplaySnapshot {
  version: 2; gameTime: ClockSnapshot; player: PlayerState; worlds: WorldStates;
  lastSuccessfulWorld: PlayableWorldId;
  global: {storm: boolean; intensity: number; quality: Quality};
}
export interface SaveStorage { getItem(key: string): string | null; setItem(key: string, value: string): void }
export function defaultSave(items:ItemRegistry=ITEMS): SaveData {
  const gameTime=new GameClock().snapshot();
  return {version:2,gameTime,player:defaultPlayerState(),worlds:new WorldStateRegistry().snapshot(),lastSuccessfulWorld:'HOME',global:{storm:false,intensity:0,quality:'MEDIUM'},inventory:new Inventory(items).snapshot(),barn:new Inventory(items,BARN_CAPACITY).snapshot(),progress:defaultPlayerProgressState(),home:normalizeHome(undefined,items),fishing:normalizeFishing(undefined,items),hotbar:normalizeHotbar(undefined,items),farm:normalizeFarm(undefined,getCropRegistry(items),gameTime.simulationTime),vehicles:normalizeVehicles(undefined),livestock:normalizeLivestock(undefined,gameTime.simulationTime),economy:normalizeEconomy(undefined)};
}
const record=(value: unknown): Record<string,unknown> => value!==null && typeof value==='object' && !Array.isArray(value) ? value as Record<string,unknown> : {};
// Version routing is intentionally small; unknown future schemas are not guessed.
export function migrateSave(value: unknown,items:ItemRegistry=ITEMS): SaveData {
  const raw=record(value);
  if(raw.version!==1&&raw.version!==2)throw new Error('Unsupported save version');
  const result=defaultSave(items),clock=new GameClock();clock.restore(record(raw.gameTime));result.gameTime=clock.snapshot();
  result.economy=normalizeEconomy(raw.version===2?raw.economy:undefined);
  if(raw.version===2){result.inventory=normalizeInventory(raw.inventory,items);result.progress=normalizePlayerProgress(raw.progress);}
  result.home=normalizeHome(raw.version===2?raw.home:undefined,items);
  result.fishing=normalizeFishing(raw.version===2?raw.fishing:undefined,items);
  result.hotbar=normalizeHotbar(raw.version===2?raw.hotbar:undefined,items);
  // Restore the calendar first; serialized agricultural stages are only caches.
  result.farm=normalizeFarm(raw.version===2?raw.farm:undefined,getCropRegistry(items),result.gameTime.simulationTime);
  result.vehicles=normalizeVehicles(raw.version===2?raw.vehicles:undefined,GRAIN_CAPACITIES[result.economy.upgrades.grain]);
  result.livestock=normalizeLivestock(raw.version===2?raw.livestock:undefined,result.gameTime.simulationTime);
  result.barn=normalizeInventory(raw.version===2?raw.barn:undefined,items,BARN_CAPACITIES[result.economy.upgrades.barn]);
  const player=record(raw.player),worlds=new WorldStateRegistry();worlds.restore(record(raw.worlds));result.worlds=worlds.snapshot();
  const last=raw.lastSuccessfulWorld??player.currentWorldId;
  result.lastSuccessfulWorld=last==='FARM'?'FARM':'HOME';
  result.player.currentWorldId=result.lastSuccessfulWorld;
  // Interior resumes at its clear entrance, never a saved furniture-overlapping position.
  result.player.currentSpawnId=result.lastSuccessfulWorld==='FARM'?'farm_dock_arrival':raw.version===2&&player.currentSpawnId==='cottage_entry'?'cottage_entry':player.currentSpawnId==='home_cottage_exit'?'home_cottage_exit':'home_dock_arrival';
  result.player.lastTravelDestination=player.lastTravelDestination==='HOME'||player.lastTravelDestination==='FARM'?player.lastTravelDestination:null;
  result.player.discoveries=discoveryIds([...(Array.isArray(player.discoveries)?player.discoveries:[]),...result.worlds.HOME.discoveries]);
  result.worlds.HOME.discoveries=[...result.player.discoveries];
  if(Array.isArray(player.unlockedDestinations))result.player.unlockedDestinations=[...new Set(['HOME','FARM',...player.unlockedDestinations.filter(id=>id==='DEEP_SEA'||id==='RUINS')])] as PlayerState['unlockedDestinations'];
  const global=record(raw.global);
  result.global.storm=global.storm===true;
  result.global.intensity=typeof global.intensity==='number'&&Number.isFinite(global.intensity)?Math.max(0,Math.min(1,global.intensity)):0;
  if(global.quality==='LOW'||global.quality==='MEDIUM'||global.quality==='HIGH')result.global.quality=global.quality;
  return result;
}
export class SaveSystem {
  private timer: ReturnType<typeof setTimeout> | undefined;
  constructor(private storage: SaveStorage, private warn: (message:string,error:unknown)=>void = console.warn,private items:ItemRegistry=ITEMS) {}
  load(): SaveData {
    for(const key of [SAVE_KEY,LEGACY_SAVE_KEY]){
      try {const raw=this.storage.getItem(key);if(raw!==null)return migrateSave(JSON.parse(raw),this.items);}
      catch(error){this.warn('存档无法读取，尝试备用存档。',error);}
    }
    return defaultSave(this.items);
  }
  save(data: SaveData): boolean {
    this.cancel();
    try {this.storage.setItem(SAVE_KEY,JSON.stringify(migrateSave(data,this.items)));return true;}
    catch(error){this.warn('无法保存游戏进度。',error);return false;}
  }
  schedule(snapshot: ()=>SaveData) {this.cancel();this.timer=setTimeout(()=>{this.timer=undefined;this.save(snapshot());},250);}
  flush(snapshot: ()=>SaveData){this.cancel();return this.save(snapshot());}
  cancel(){if(this.timer!==undefined){clearTimeout(this.timer);this.timer=undefined;}}
}
