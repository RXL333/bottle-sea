import type { GameplayServices } from '../GameplayFoundation';
import type { WeatherKind } from '../../systems/WeatherState';
import type { DialogueFacts } from './DialogueRegistry';
import { seasonalFish } from '../FishingCatalog';
import { SEASONS } from '../calendar/SeasonRegistry';
/** Queries canonical systems; these facts are transient and never written to SaveSystem. */
export function dialogueFacts(game:GameplayServices,weather:WeatherKind):DialogueFacts {
  const season=game.calendar.date.season;
  let matureCells=0,growingCells=0;
  for(const d of game.farm.definitions){const field=game.farm.getField(d.id);if(field){matureCells+=field.stateCounts.MATURE;growingCells+=field.stateCounts.SEEDED+field.stateCounts.GROWING;}}
  return {collectionCount:game.collections.stats().discovered,collectionTotal:game.collections.stats().total,season,seasonName:SEASONS.find(s=>s.id===season)!.name,weather,coins:game.economy.coins,
    fishCount:game.items.fish().reduce((sum,f)=>sum+game.inventory.count(f.id),0),matureCells,growingCells,
    pendingProducts:game.livestock.getAnimals().reduce((sum,a)=>sum+a.pending,0),completed:Object.keys(game.progression.snapshot().completed),met:false,
    plantableCrops:game.crops.registry.list().filter(c=>!c.allowedSeasons||c.allowedSeasons.includes(season)).map(c=>c.name).join('、')||'没有适合当前季节的作物',
    fishNames:seasonalFish(game.items,season).map(f=>f.name).join('、')};
}
