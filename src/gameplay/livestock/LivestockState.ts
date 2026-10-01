import { DAY_DURATION } from '../../core/GameClock';
import { LIVESTOCK_ANIMALS,LIVESTOCK_PENS,LIVESTOCK_SPECIES,PENDING_CAPACITY,PEN_FEED_CAPACITY,penDefinition } from './LivestockDefinition';
import type { AnimalBehavior,LivestockKind } from './LivestockDefinition';
export interface AnimalSnapshot {id:string;kind:LivestockKind;penId:LivestockKind;x:number;z:number;yaw:number;behavior:AnimalBehavior;pending:number;fedAtGameTime:number|null;nextProductAtGameTime:number|null}
export interface LivestockSnapshot {version:1;lastSimulatedGameTime:number;pens:{id:LivestockKind;feed:number}[];animals:AnimalSnapshot[]}
const record=(v:unknown):Record<string,unknown>=>v&&typeof v==='object'&&!Array.isArray(v)?v as Record<string,unknown>:{};
const validTime=(v:unknown):v is number=>typeof v==='number'&&Number.isFinite(v)&&v>=0&&v*1440/DAY_DURATION<=Number.MAX_SAFE_INTEGER;
const count=(v:unknown,max:number)=>typeof v==='number'&&Number.isSafeInteger(v)?Math.max(0,Math.min(max,v)):0;
export const productionDuration=(kind:LivestockKind)=>LIVESTOCK_SPECIES[kind].periodGameMinutes*DAY_DURATION/1440;
/** Advances bounded, feed-backed production events; no wall clock or recurring timer. */
export function projectLivestock(state:LivestockSnapshot,now:number):boolean {
  if(!validTime(now)||now<state.lastSimulatedGameTime)return false;let changed=false;
  const start=(at:number)=>{
    for(const pen of state.pens){
      const idle=state.animals.filter(a=>a.penId===pen.id&&a.nextProductAtGameTime===null&&a.pending<PENDING_CAPACITY).sort((a,b)=>(a.fedAtGameTime??-1)-(b.fedAtGameTime??-1)||a.id.localeCompare(b.id));
      for(const animal of idle){if(!pen.feed)break;pen.feed--;animal.fedAtGameTime=at;animal.nextProductAtGameTime=at+productionDuration(animal.kind);changed=true;}
    }
  };
  start(state.lastSimulatedGameTime);
  // Each event consumes a finite stored ration; at most 72 rations + 8 active cycles.
  for(let events=0;events<100;events++){
    const due=state.animals.filter(a=>a.nextProductAtGameTime!==null&&a.nextProductAtGameTime<=now);if(!due.length)break;
    const at=Math.min(...due.map(a=>a.nextProductAtGameTime!));
    for(const animal of due)if(animal.nextProductAtGameTime===at){animal.pending++;animal.nextProductAtGameTime=null;changed=true;}
    start(at);
  }
  state.lastSimulatedGameTime=now;return changed;
}
export function normalizeLivestock(value:unknown,now:number):LivestockSnapshot {
  const raw=record(value),time=validTime(now)?now:0,last=validTime(raw.lastSimulatedGameTime)?Math.min(time,raw.lastSimulatedGameTime):time;
  const pens=Array.isArray(raw.pens)?raw.pens:[],animals=Array.isArray(raw.animals)?raw.animals:[];
  const state:LivestockSnapshot={version:1,lastSimulatedGameTime:last,pens:LIVESTOCK_PENS.map(p=>({id:p.id,feed:count(record(pens.find(v=>record(v).id===p.id)).feed,PEN_FEED_CAPACITY)})),animals:LIVESTOCK_ANIMALS.map(def=>{
    const saved=record(animals.find(v=>record(v).id===def.id)),bounds=penDefinition(def.kind)!.bounds;
    const fedAt=validTime(saved.fedAtGameTime)&&saved.fedAtGameTime<=last?saved.fedAtGameTime:null;
    const next=fedAt!==null&&validTime(saved.nextProductAtGameTime)?fedAt+productionDuration(def.kind):null;
    const pending=count(saved.pending,PENDING_CAPACITY);
    const coordinate=(v:unknown,fallback:number,min:number,max:number)=>typeof v==='number'&&Number.isFinite(v)?Math.max(min,Math.min(max,v)):fallback;
    return {...def,penId:def.kind,pending,fedAtGameTime:fedAt,nextProductAtGameTime:pending>=PENDING_CAPACITY?null:next,
      x:coordinate(saved.x,def.x,bounds.minX,bounds.maxX),z:coordinate(saved.z,def.z,bounds.minZ,bounds.maxZ),yaw:typeof saved.yaw==='number'&&Number.isFinite(saved.yaw)?saved.yaw%(Math.PI*2):def.yaw,
      behavior:['IDLE','WALKING','EATING','SLEEPING'].includes(String(saved.behavior))?saved.behavior as AnimalBehavior:'IDLE'};
  })};if(state.pens.some(p=>p.feed>0)||state.animals.some(a=>a.nextProductAtGameTime!==null))projectLivestock(state,time);return state;
}
