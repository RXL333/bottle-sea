import type { CollectionCategory,CollectionDefinition,CollectionReference } from './CollectionRegistry';
import { COLLECTION_CATEGORIES,CollectionRegistry,createCollectionRegistry } from './CollectionRegistry';
import type { InventorySnapshot,ItemStack } from '../Inventory';
import type { ProgressionActivity } from '../progression/ProgressionRegistry';
import type { LivestockSnapshot } from '../livestock/LivestockState';
import type { VehicleSnapshot } from '../vehicles/VehicleState';
import { LIVESTOCK_SPECIES } from '../livestock/LivestockDefinition';
export const COLLECTION_SOURCES=['obtained','caught','crafted','harvested','collected','observed','arrived','discovered','legacy'] as const;
export type CollectionSource=typeof COLLECTION_SOURCES[number];
export interface CollectionRecord {id:string;firstGameTime:number|null;sources:CollectionSource[]}
export interface CollectionSnapshot {version:1;records:CollectionRecord[]}
export type CollectionView={id:string;category:CollectionCategory;discovered:false;name:'???';description:string;information:readonly string[]}|{id:string;category:CollectionCategory;discovered:true;name:string;description:string;information:readonly string[];iconItemId?:string;record:CollectionRecord};
export interface CollectionEvidence {inventory?:InventorySnapshot;barn?:InventorySnapshot;home?:{chest:InventorySnapshot};fishing?:{pendingCatch:string|null};progression?:{completed:Readonly<Record<string,number>>};livestock?:LivestockSnapshot;vehicles?:VehicleSnapshot;player?:{currentWorldId:string;currentSpawnId:string;lastTravelDestination:string|null;discoveries:readonly string[]}}
const object=(v:unknown):Record<string,unknown>=>v!==null&&typeof v==='object'&&!Array.isArray(v)?v as Record<string,unknown>:{};
export function normalizeCollections(value:unknown,now:number,registry:CollectionRegistry=createCollectionRegistry()):CollectionSnapshot {
  const raw=object(value),records:CollectionRecord[]=[],seen=new Set<string>();
  for(const v of raw.version===1&&Array.isArray(raw.records)?raw.records:[]){const r=object(v);if(typeof r.id!=='string'||!registry.get(r.id)||seen.has(r.id))continue;
    if(r.firstGameTime!==null&&(typeof r.firstGameTime!=='number'||!Number.isFinite(r.firstGameTime)||r.firstGameTime<0||r.firstGameTime>now))continue;
    const sources=Array.isArray(r.sources)?[...new Set(r.sources.filter((s):s is CollectionSource=>COLLECTION_SOURCES.includes(s as CollectionSource)))]:[];if(!sources.length)continue;
    records.push({id:r.id,firstGameTime:r.firstGameTime as number|null,sources});seen.add(r.id);
  }return {version:1,records};
}
/** Persistent knowledge, never a second stock ledger. All inputs are committed real gameplay evidence. */
export class CollectionSystem {
  private records=new Map<string,CollectionRecord>();revision=0;
  onDiscover?:(entry:Readonly<CollectionDefinition>)=>void;
  constructor(private now:()=>number,saved?:unknown,private onChange:()=>void=()=>{},readonly registry:CollectionRegistry=createCollectionRegistry()){
    for(const r of normalizeCollections(saved,now(),registry).records)this.records.set(r.id,r);
  }
  has(id:string){return this.records.has(id);}
  record(reference:CollectionReference,source:CollectionSource='discovered',imported=false){
    let changed=false;const discoveries:Readonly<CollectionDefinition>[]=[];
    for(const entry of this.registry.matching(reference)){
      const previous=this.records.get(entry.id);if(previous?.sources.includes(source))continue;
      if(previous)previous.sources.push(source);else {this.records.set(entry.id,{id:entry.id,firstGameTime:imported?null:this.now(),sources:[source]});discoveries.push(entry);}
      changed=true;
    }
    if(changed){this.revision++;if(!imported){this.onChange();for(const entry of discoveries)this.onDiscover?.(entry);}}return discoveries.length;
  }
  observeItems(stacks:readonly (ItemStack|null)[],source:CollectionSource='obtained',imported=false){for(const s of stacks)if(s&&s.quantity>0)this.record({kind:'item',id:s.itemId},source,imported);}
  production(activity:ProgressionActivity,produced:readonly ItemStack[]=[]){
    const source=activity==='fish.catch'?'caught':activity==='cook.complete'?'crafted':activity==='farm.harvest'?'harvested':activity==='livestock.collect'?'collected':undefined;
    if(!source)return;this.observeItems(produced,source);
    if(source==='collected')for(const [kind,s] of Object.entries(LIVESTOCK_SPECIES))if(produced.some(p=>p.itemId===s.productItemId&&p.quantity>0))this.record({kind:'animal',id:kind},'observed');
  }
  arrive(worldId:string){if(worldId==='COTTAGE'){this.record({kind:'world',id:'HOME'},'arrived');this.record({kind:'place',id:worldId},'arrived');}else if(worldId!=='TRAVEL')this.record({kind:'world',id:worldId},'arrived');}
  observeAnimals(animals:readonly {kind:string;x:number;z:number}[],position:{x:number;y:number;z:number}){if(Math.abs(position.y-4)>=1.5)return;for(const animal of animals)if(Math.hypot(animal.x-position.x,animal.z-position.z)<3.2)this.record({kind:'animal',id:animal.kind},'observed');}
  syncDiscoveries(ids:readonly string[],imported=false){for(const id of ids)if(!this.has(`discovery:${id}`))this.record({kind:'discovery',id},imported?'legacy':'discovered',imported);}
  /** Missing historical details stay unknown: generic counters never reveal individual entries. */
  importEvidence(e:CollectionEvidence){
    for(const stock of [e.inventory,e.barn,e.home?.chest,...(e.vehicles?.vehicles.map(v=>v.grainTank)??[]),...(e.vehicles?.implements.map(v=>v.cargo)??[])])if(stock)this.observeItems(stock.slots,'legacy',true);
    if(e.fishing?.pendingCatch)this.observeItems([{itemId:e.fishing.pendingCatch,quantity:1}],'legacy',true);
    for(const a of e.livestock?.animals??[])if(a.fedAtGameTime!==null||a.pending>0)this.record({kind:'animal',id:a.kind},'legacy',true);
    if(e.player){this.record({kind:'world',id:e.player.currentWorldId},'legacy',true);if(e.player.lastTravelDestination)this.record({kind:'world',id:e.player.lastTravelDestination},'legacy',true);if(e.player.currentSpawnId==='cottage_entry')this.record({kind:'place',id:'COTTAGE'},'legacy',true);this.syncDiscoveries(e.player.discoveries,true);}
    for(const [milestone,reference] of [['first_farm',{kind:'world',id:'FARM'}],['first_home',{kind:'place',id:'COTTAGE'}]] as const){
      const at=e.progression?.completed[milestone];if(typeof at!=='number'||!Number.isFinite(at)||at<0||at>this.now())continue;
      this.record(reference,'legacy',true);for(const entry of this.registry.matching(reference)){const r=this.records.get(entry.id)!;if(r.firstGameTime===null)r.firstGameTime=at;}
    }

  }
  view(id:string):CollectionView|undefined {
    const entry=this.registry.get(id);if(!entry)return;const record=this.records.get(id);
    if(!record)return {id,category:entry.category,discovered:false,name:'???',description:'还没有写下这一页。真正获得、制作、观察或到达后，会自动留下记录。',information:[]};
    return {...entry,discovered:true,record:structuredClone(record)};
  }
  list(category?:CollectionCategory){return this.registry.list(category).map(e=>this.view(e.id)!);}
  stats(category?:CollectionCategory){const entries=this.registry.list(category);return {discovered:entries.filter(e=>this.has(e.id)).length,total:entries.length};}
  categories(){return COLLECTION_CATEGORIES.map(category=>({category,...this.stats(category)}));}
  snapshot():CollectionSnapshot{return {version:1,records:[...this.records.values()].map(r=>structuredClone(r))};}
}
