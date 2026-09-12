import { GameClock } from '../core/GameClock';
import type { ClockSnapshot } from '../core/GameClock';
import type { Quality } from '../core/Renderer';
import { defaultPlayerState, discoveryIds } from './PlayerState';
import type { PlayerState, PlayableWorldId } from './PlayerState';
import { WorldStateRegistry } from './WorldStateRegistry';
import type { WorldStates } from './WorldStateRegistry';
export const SAVE_KEY='bottle-sea.save.v1';
export interface SaveData {
  version: 1; gameTime: ClockSnapshot; player: PlayerState; worlds: WorldStates;
  lastSuccessfulWorld: PlayableWorldId;
  global: {storm: boolean; intensity: number; quality: Quality};
}
export interface SaveStorage { getItem(key: string): string | null; setItem(key: string, value: string): void }
export function defaultSave(): SaveData {
  return {version:1,gameTime:new GameClock().snapshot(),player:defaultPlayerState(),worlds:new WorldStateRegistry().snapshot(),lastSuccessfulWorld:'HOME',global:{storm:false,intensity:0,quality:'MEDIUM'}};
}
const record=(value: unknown): Record<string,unknown> => value!==null && typeof value==='object' && !Array.isArray(value) ? value as Record<string,unknown> : {};
// Version routing is intentionally small; unknown future schemas are not guessed.
export function migrateSave(value: unknown): SaveData {
  const raw=record(value);
  if(raw.version!==1)throw new Error('Unsupported save version');
  const result=defaultSave(),clock=new GameClock();clock.restore(record(raw.gameTime));result.gameTime=clock.snapshot();
  const player=record(raw.player),worlds=new WorldStateRegistry();worlds.restore(record(raw.worlds));result.worlds=worlds.snapshot();
  const last=raw.lastSuccessfulWorld??player.currentWorldId;
  result.lastSuccessfulWorld=last==='FARM'?'FARM':'HOME';
  result.player.currentWorldId=result.lastSuccessfulWorld;
  // A saved travel phase never becomes a runtime spawn. Only stable named docks are accepted.
  result.player.currentSpawnId=result.lastSuccessfulWorld==='FARM'?'farm_dock_arrival':'home_dock_arrival';
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
  constructor(private storage: SaveStorage, private warn: (message:string,error:unknown)=>void = console.warn) {}
  load(): SaveData {
    try {const raw=this.storage.getItem(SAVE_KEY);return raw===null?defaultSave():migrateSave(JSON.parse(raw));}
    catch(error){this.warn('存档无法读取，使用默认状态。',error);return defaultSave();}
  }
  save(data: SaveData): boolean {
    this.cancel();
    try {this.storage.setItem(SAVE_KEY,JSON.stringify(migrateSave(data)));return true;}
    catch(error){this.warn('无法保存游戏进度。',error);return false;}
  }
  schedule(snapshot: ()=>SaveData) {this.cancel();this.timer=setTimeout(()=>{this.timer=undefined;this.save(snapshot());},250);}
  flush(snapshot: ()=>SaveData){this.cancel();return this.save(snapshot());}
  cancel(){if(this.timer!==undefined){clearTimeout(this.timer);this.timer=undefined;}}
}
