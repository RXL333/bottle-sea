import type { NavigationSurface } from './NavigationSurface';
import type { InteractionSystem } from '../systems/InteractionSystem';
import type { PlayerTravelBoat } from './travel/PlayerTravelBoat';
import type { Group, Vector3 } from 'three';
import type { Quality } from '../core/Renderer';
import type { WorldState } from '../state/WorldStateRegistry';
export type WorldId = 'HOME' | 'TRAVEL' | 'FARM';
export interface SpawnPoint { id: string; position: [number,number,number]; lookAt: [number,number,number] }
export interface WorldLoadContext { gameTime: number }
export interface WorldEnterContext extends WorldLoadContext { state: WorldState; spawn: SpawnPoint }
export interface WorldLeaveContext extends WorldLoadContext {}
export interface WorldUpdateContext { delta: number; time: number; gameTime: number; storm: number; dayTime: number; night: number; flash: number; player?: Vector3 }
export interface GameWorld {
  readonly id: WorldId;
  readonly root: Group;
  readonly navigation?: NavigationSurface;
  readonly interaction?: InteractionSystem;
  readonly boat?: PlayerTravelBoat;
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
