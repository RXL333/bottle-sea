import type { DestinationId, PlayerState, PlayableWorldId } from '../state/PlayerState';
export interface DestinationDefinition {
  id: DestinationId; name: string; description: string; travelGameMinutes: number;
  departureSpawnId: string; arrivalSpawnId: string; unlockKey: DestinationId;
}
export const DESTINATIONS: readonly DestinationDefinition[] = [
  {id:'HOME',name:'家园岛',description:'灯塔亮着，熟悉的码头在等你。',travelGameMinutes:20,departureSpawnId:'home_dock_departure',arrivalSpawnId:'home_dock_arrival',unlockKey:'HOME'},
  {id:'FARM',name:'农场岛',description:'一片尚未开垦的土地。',travelGameMinutes:20,departureSpawnId:'farm_dock_departure',arrivalSpawnId:'farm_dock_arrival',unlockKey:'FARM'},
  {id:'DEEP_SEA',name:'深海',description:'尚未解锁',travelGameMinutes:0,departureSpawnId:'',arrivalSpawnId:'',unlockKey:'DEEP_SEA'},
  {id:'RUINS',name:'失落遗迹',description:'尚未解锁 · ？？？',travelGameMinutes:0,departureSpawnId:'',arrivalSpawnId:'',unlockKey:'RUINS'},
];
export function canTravelTo(id: DestinationId, player: PlayerState): id is PlayableWorldId {
  return (id==='HOME'||id==='FARM')&&id!==player.currentWorldId&&player.unlockedDestinations.includes(id);
}
export function destination(id: DestinationId){const result=DESTINATIONS.find(item=>item.id===id);if(!result)throw new Error(`Unknown destination: ${id}`);return result;}
