export type PlayableWorldId = 'HOME' | 'FARM';
export type DestinationId = PlayableWorldId | 'DEEP_SEA' | 'RUINS';
export interface PlayerState {
  currentWorldId: PlayableWorldId;
  currentSpawnId: string;
  unlockedDestinations: DestinationId[];
  lastTravelDestination: PlayableWorldId | null;
  discoveries: string[];
}
export const DISCOVERY_IDS = ['lighthouse', 'chest', 'anchor', 'ruins'] as const;
export function defaultPlayerState(): PlayerState {
  return {currentWorldId:'HOME', currentSpawnId:'home_dock_arrival', unlockedDestinations:['HOME','FARM'], lastTravelDestination:null, discoveries:[]};
}
export function discoveryIds(value: unknown): string[] {
  return Array.isArray(value) ? [...new Set(value.filter((id): id is string => typeof id==='string' && (DISCOVERY_IDS as readonly string[]).includes(id)))] : [];
}
