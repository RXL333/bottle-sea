import type { SeasonId } from './calendar/SeasonRegistry';
import { ITEMS } from './ItemRegistry';
import type { ItemRegistry } from './ItemRegistry';
export type { FishDefinition } from './ItemRegistry';
// Compatibility views; all item data lives in ItemRegistry.
export const FISH=ITEMS.fish();
export const fishDefinition=(id:string,items:ItemRegistry=ITEMS)=>items.fish().find(fish=>fish.id===id);
export const FISHING_SPOT={x:-3.15,y:4.12,z:.65,range:.80} as const;
export const FISHING_WATER={x:-4.18,z:.55} as const;

export function fishSeasonWeight(fish:import('./ItemRegistry').FishDefinition,season:SeasonId){return fish.fishing.weight*(fish.fishing.seasonWeights?.[season]??1);}
export function seasonalFish(items:ItemRegistry,season:SeasonId){return items.fish().filter(fish=>fishSeasonWeight(fish,season)>0);}
