import type { NavigationSurface } from './NavigationSurface';
import type { InteractionSystem } from '../systems/InteractionSystem';
import type { PlayerTravelBoat } from './travel/PlayerTravelBoat';
import type { Group, Vector3 } from 'three';
import type { Quality } from '../core/Renderer';
import type { WorldState } from '../state/WorldStateRegistry';
import type { GameplayServices } from '../gameplay/GameplayFoundation';
import type { DriveableVehicle } from '../systems/vehicles/Vehicle';
import type { Inventory } from '../gameplay/Inventory';
import type { FarmSoundFrame } from './farm/FarmPresentation';
import type { FarmCellRef } from '../gameplay/farm/FarmDefinition';
import type { TradeAccess } from '../gameplay/economy/EconomySystem';
import type { WeatherFrame } from '../systems/WeatherState';
export interface WorldStorageContainer {id:string;name:string;inventory:Inventory;partialTransfers?:boolean}
export type WorldId = 'HOME' | 'TRAVEL' | 'FARM' | 'COTTAGE';
export interface SpawnPoint { id: string; position: [number,number,number]; lookAt: [number,number,number] }
export interface WorldLoadContext { gameTime: number }
export interface WorldEnterContext extends WorldLoadContext { state: WorldState; spawn: SpawnPoint; gameplay: GameplayServices }
export interface WorldLeaveContext extends WorldLoadContext {}
export interface WorldUpdateContext { delta: number; time: number; gameTime: number; storm: number; dayTime: number; night: number; flash: number;weather?:WeatherFrame; player?: Vector3;listener?:Vector3;presentationPaused?:boolean }
export interface GameWorld {
  readonly id: WorldId;
  readonly root: Group;
  readonly navigation?: NavigationSurface;
  readonly interaction?: InteractionSystem;
  readonly boat?: PlayerTravelBoat;
  readonly vehicles?:readonly DriveableVehicle[];
  readonly storageContainers?:readonly WorldStorageContainer[];
  readonly tradeAccess?:TradeAccess;
  readonly farmSound?:FarmSoundFrame;
  readonly farmFocus?:FarmCellRef|null;
  readonly livestockFocus?:string;
  readonly farmPresentationDiagnostics?:object;
  sheltered?(position:Vector3):boolean;
  prepare?(context: WorldUpdateContext):void;
  triggerDiscovery?(id:string):void;
  getFocusPosition?():Vector3;
  setTravelPresentation?(active:boolean):void;
  load(context: WorldLoadContext): void | Promise<void>;
  enter(context: WorldEnterContext): void;
  update(context: WorldUpdateContext): void;
  leave(context: WorldLeaveContext): WorldState;
  dispose(): void;
  getSpawnPoint(id?: string): SpawnPoint;
  applyQuality(quality: Quality): void;
}
