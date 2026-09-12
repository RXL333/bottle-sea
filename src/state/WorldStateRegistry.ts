import { discoveryIds } from './PlayerState';
import type { PlayableWorldId } from './PlayerState';
export interface WorldState { lastSimulatedGameTime: number; discoveries: string[] }
export type WorldStates = Record<PlayableWorldId, WorldState>;
export const defaultWorldState = (): WorldState => ({lastSimulatedGameTime:0, discoveries:[]});
export function normalizeWorldState(value: unknown): WorldState {
  const input = value && typeof value==='object' ? value as Partial<WorldState> : {};
  return {lastSimulatedGameTime: typeof input.lastSimulatedGameTime==='number' && Number.isFinite(input.lastSimulatedGameTime) && input.lastSimulatedGameTime>=0 ? input.lastSimulatedGameTime : 0, discoveries:discoveryIds(input.discoveries)};
}
export class WorldStateRegistry {
  private states: WorldStates = {HOME:defaultWorldState(), FARM:defaultWorldState()};
  get(id: PlayableWorldId): WorldState { return structuredClone(this.states[id]); }
  set(id: PlayableWorldId, state: WorldState) { this.states[id]=normalizeWorldState(state); }
  snapshot(): WorldStates { return structuredClone(this.states); }
  restore(value: Partial<WorldStates>) { this.states={HOME:normalizeWorldState(value.HOME), FARM:normalizeWorldState(value.FARM)}; }
}
