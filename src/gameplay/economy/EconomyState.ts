import { INITIAL_COINS,MAX_COINS,TRADE_OFFERS } from './TradeCatalog';
export interface EconomySnapshot {version:1;coins:number;sequence:number;purchases:Record<string,number>;upgrades:{barn:0|1|2;grain:0|1|2}}
export function normalizeEconomy(value:unknown):EconomySnapshot {
  const raw=value&&typeof value==='object'?value as Partial<EconomySnapshot>:{},purchases:Record<string,number>={};
  for(const offer of TRADE_OFFERS){const n=raw.purchases?.[offer.id];if(typeof n==='number'&&Number.isSafeInteger(n)&&n>0)purchases[offer.id]=Math.min(n,offer.kind==='item'?MAX_COINS:1);}
  const level=(v:unknown):0|1|2=>v===1||v===2?v:0;
  return {version:1,coins:typeof raw.coins==='number'&&Number.isSafeInteger(raw.coins)&&raw.coins>=0?Math.min(raw.coins,MAX_COINS):INITIAL_COINS,
    sequence:typeof raw.sequence==='number'&&Number.isSafeInteger(raw.sequence)&&raw.sequence>=0?Math.min(raw.sequence,MAX_COINS):0,purchases,upgrades:{barn:level(raw.upgrades?.barn),grain:level(raw.upgrades?.grain)}};
}
