import { expect,it } from 'vitest';
import { defaultPlayerState } from '../state/PlayerState';
import { canTravelTo, destination, DESTINATIONS } from './DestinationRegistry';
it('only exposes registered playable unlocked routes',()=>{const player=defaultPlayerState();expect(DESTINATIONS).toHaveLength(4);expect(canTravelTo('FARM',player)).toBe(true);expect(canTravelTo('HOME',player)).toBe(false);for(const id of ['DEEP_SEA','RUINS'] as const){expect(canTravelTo(id,player)).toBe(false);player.unlockedDestinations.push(id);expect(canTravelTo(id,player)).toBe(false);}player.currentWorldId='FARM';expect(canTravelTo('HOME',player)).toBe(true);expect(destination('HOME').travelGameMinutes).toBe(20);expect(destination('FARM').travelGameMinutes).toBe(20);});
