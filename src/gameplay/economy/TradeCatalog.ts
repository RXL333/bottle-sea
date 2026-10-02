import { getCropRegistry } from '../farm/CropRegistry';
import { seasonNames } from '../calendar/SeasonRegistry';
import type { SeasonId } from '../calendar/SeasonRegistry';
import { PURCHASED_COMBINE_ID } from '../vehicles/VehicleIds';
import type { ItemRegistry } from '../ItemRegistry';
export const INITIAL_COINS=100;
export const MAX_COINS=1_000_000_000;
export const MAX_TRADE_QUANTITY=999;
export const BARN_CAPACITIES=[24,36,48] as const;
export const GRAIN_CAPACITIES=[60,90,120] as const;
export type Offer={id:string;price:number;allowedSeasons?:readonly SeasonId[]}&({kind:'item';itemId:string}|{kind:'machine';vehicleId:string;name:string;description:string}|{kind:'upgrade';target:'barn'|'grain';level:1|2;name:string;description:string});
/** All buy/sell prices live here; item names, icons and stack limits stay in ItemRegistry. */
export const SELL_PRICES:Readonly<Record<string,number>>=Object.freeze({
  'fish.sardine':12,'fish.horse_mackerel':18,'fish.mackerel':24,'fish.sea_bass':36,'fish.red_snapper':60,'fish.tuna':120,
  'crop.wheat':10,'crop.corn':14,'crop.potato':16,
  'food.grilled_fish':32,'food.seafood_soup':64,'food.pan_sea_bass':78,'food.smoked_fish':48,
  'livestock.egg':10,'livestock.milk':18,'livestock.wool':32,
});
export const TRADE_OFFERS:readonly Offer[]=[
  {id:'buy.seed.wheat',kind:'item',itemId:'seed.wheat',price:6},
  {id:'buy.seed.corn',kind:'item',itemId:'seed.corn',price:8},
  {id:'buy.seed.potato',kind:'item',itemId:'seed.potato',price:10},
  {id:'buy.feed',kind:'item',itemId:'feed.basic',price:4},
  {id:'machine.combine',kind:'machine',vehicleId:PURCHASED_COMBINE_ID,name:'增购联合收割机',description:'额外一台，可驾驶、收割和卸粮。交付农机棚外标记停放位；限购一台，原有农机保留。',price:800},
  {id:'upgrade.barn.1',kind:'upgrade',target:'barn',level:1,name:'谷仓扩容 I',description:'谷仓仓库 24 → 36 格，原有物品保留。',price:180},
  {id:'upgrade.barn.2',kind:'upgrade',target:'barn',level:2,name:'谷仓扩容 II',description:'谷仓仓库 36 → 48 格，需先完成 I 级。',price:360},
  {id:'upgrade.grain.1',kind:'upgrade',target:'grain',level:1,name:'车载粮仓扩容 I',description:'所有联合收割机粮仓 60 → 90 份，已有粮食保留。',price:220},
  {id:'upgrade.grain.2',kind:'upgrade',target:'grain',level:2,name:'车载粮仓扩容 II',description:'所有联合收割机粮仓 90 → 120 份，需先完成 I 级。',price:440},
];
export const tradeOffer=(id:string)=>TRADE_OFFERS.find(p=>p.id===id);
export function validateTradeCatalog(items:ItemRegistry){
  const ids=new Set<string>();for(const offer of TRADE_OFFERS){if(ids.has(offer.id)||!Number.isSafeInteger(offer.price)||offer.price<1||offer.kind==='item'&&!items.has(offer.itemId))throw new Error(`Invalid trade offer: ${offer.id}`);ids.add(offer.id);}
  for(const [id,price] of Object.entries(SELL_PRICES))if(!items.has(id)||!Number.isSafeInteger(price)||price<1)throw new Error(`Invalid selling price: ${id}`);
}

/** Seed supply follows the canonical crop seasons; other goods can opt in later. */
export function offerSeasons(offer:Offer,items:ItemRegistry){return offer.allowedSeasons??(offer.kind==='item'?getCropRegistry(items).getBySeedItemId(offer.itemId)?.allowedSeasons:undefined);}
export function offerSeasonReason(id:string,season:SeasonId,items:ItemRegistry){const offer=tradeOffer(id),seasons=offer?offerSeasons(offer,items):undefined;return seasons&&!seasons.includes(season)?`当季暂不供应 · 供应季节：${seasonNames(seasons)} · 金币与物品已保留。`:undefined;}
