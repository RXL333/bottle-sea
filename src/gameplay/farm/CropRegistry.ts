import { SEASON_IDS } from '../calendar/SeasonRegistry';
import type { SeasonId } from '../calendar/SeasonRegistry';
import { ITEMS } from '../ItemRegistry';
import type { ItemRegistry } from '../ItemRegistry';

export const CROP_STAGE_IDS=Object.freeze(['seed','sprout','growing','mature'] as const);
export type CropStageId=typeof CROP_STAGE_IDS[number];
export type CropSeason=SeasonId;
export type CropWeather='clear'|'rain'|'storm';
export interface CropStageDefinition {
  readonly id:CropStageId;readonly name:string;readonly startsAtGameMinute:number;
  /** Stable logical resource key, not a GLB path or a promise that a model exists. */
  readonly resourceId:string;
  /** Optional FarmAssets model ID; stage instances remain in CropSystem. */
  readonly modelAssetId?:string;
}
export interface CropDefinition {
  readonly id:string;readonly name:string;readonly seedItemId:string;readonly harvestItemId:string;
  readonly growthGameMinutes:number;readonly stageCount:4;readonly stages:readonly CropStageDefinition[];readonly baseYield:number;
  readonly machineHarvestable?:boolean;
  // Static extension points only; the first growth system does not apply them.
  readonly allowedSeasons?:readonly CropSeason[];
  readonly growthSpeedMultiplier?:number;
  readonly weatherGrowthMultipliers?:Readonly<Partial<Record<CropWeather,number>>>;
}

const validId=(id:string)=>/^[a-z][a-z0-9_.-]*$/.test(id);
const positive=(value:number)=>Number.isFinite(value)&&value>0;
const SEASONS=SEASON_IDS;
const WEATHER:readonly CropWeather[]=['clear','rain','storm'];

/** Contains agronomy rules; item display/stack metadata stays in ItemRegistry. */
export class CropRegistry {
  private definitions=new Map<string,Readonly<CropDefinition>>();
  private seedCrops=new Map<string,string>();
  constructor(readonly items:ItemRegistry=ITEMS){}
  register(crop:CropDefinition):this {
    const seed=this.items.get(crop.seedItemId),harvest=this.items.get(crop.harvestItemId),stages=crop.stages;
    if(!validId(crop.id)||!crop.name.trim()||(crop.machineHarvestable!==undefined&&typeof crop.machineHarvestable!=='boolean')
      ||seed?.category!=='seed'||seed.cropId!==crop.id||harvest?.category!=='crop'||harvest.cropId!==crop.id
      ||!Number.isSafeInteger(crop.growthGameMinutes)||crop.growthGameMinutes<1
      ||!Number.isSafeInteger(crop.baseYield)||crop.baseYield<1
      ||crop.stageCount!==4||stages.length!==crop.stageCount
      ||stages.some((s,i)=>s.id!==CROP_STAGE_IDS[i]||!s.name.trim()||!validId(s.resourceId)
        ||(s.modelAssetId!==undefined&&!validId(s.modelAssetId))||!Number.isSafeInteger(s.startsAtGameMinute)||s.startsAtGameMinute<0
        ||(i>0&&s.startsAtGameMinute<=stages[i-1].startsAtGameMinute))
      ||stages[0].startsAtGameMinute!==0||stages[stages.length-1].startsAtGameMinute!==crop.growthGameMinutes
      ||(crop.allowedSeasons!==undefined&&(!crop.allowedSeasons.length||crop.allowedSeasons.some(s=>!SEASONS.includes(s))||new Set(crop.allowedSeasons).size!==crop.allowedSeasons.length))
      ||(crop.growthSpeedMultiplier!==undefined&&!positive(crop.growthSpeedMultiplier))
      ||(crop.weatherGrowthMultipliers!==undefined&&Object.entries(crop.weatherGrowthMultipliers).some(([weather,speed])=>!WEATHER.includes(weather as CropWeather)||typeof speed!=='number'||!positive(speed))))throw new Error(`Invalid crop definition: ${crop.id}`);
    if(this.definitions.has(crop.id))throw new Error(`Crop already registered: ${crop.id}`);
    if(this.seedCrops.has(crop.seedItemId))throw new Error(`Seed already assigned to a crop: ${crop.seedItemId}`);
    this.definitions.set(crop.id,Object.freeze({...crop,stages:Object.freeze(stages.map(s=>Object.freeze({...s}))),
      ...(crop.allowedSeasons?{allowedSeasons:Object.freeze([...crop.allowedSeasons])}:{}),
      ...(crop.weatherGrowthMultipliers?{weatherGrowthMultipliers:Object.freeze({...crop.weatherGrowthMultipliers})}:{})}));
    this.seedCrops.set(crop.seedItemId,crop.id);return this;
  }
  get(id:string):Readonly<CropDefinition>|undefined{return this.definitions.get(id);}
  has(id:string){return this.definitions.has(id);}
  list():readonly Readonly<CropDefinition>[]{return [...this.definitions.values()];}
  getBySeedItemId(itemId:string):Readonly<CropDefinition>|undefined {const id=this.seedCrops.get(itemId);return id?this.get(id):undefined;}
  getStage(cropId:string,stageId:CropStageId):Readonly<CropStageDefinition>|undefined {return this.get(cropId)?.stages.find(s=>s.id===stageId);}
  getStageAt(cropId:string,index:number):Readonly<CropStageDefinition>|undefined {return Number.isInteger(index)&&index>=0?this.get(cropId)?.stages[index]:undefined;}
}

function stages(cropId:string,sprout:number,growing:number,mature:number):readonly CropStageDefinition[]{
  const thresholds=[0,sprout,growing,mature];
  const names=['刚播种','幼苗','生长','成熟'];
  return CROP_STAGE_IDS.map((id,index)=>({id,name:names[index],startsAtGameMinute:thresholds[index],
    resourceId:`crop.${cropId}.${id}`,modelAssetId:`crop_${cropId}_${id}`}));
}
// Private authoring input: all consumers read validated definitions via Registry.
const CROP_DEFINITIONS:readonly CropDefinition[]=[
  {id:'wheat',allowedSeasons:['spring','autumn'],name:'小麦',seedItemId:'seed.wheat',harvestItemId:'crop.wheat',growthGameMinutes:4320,stageCount:4,stages:stages('wheat',720,2160,4320),baseYield:3,machineHarvestable:true},
  {id:'corn',allowedSeasons:['spring','summer'],name:'玉米',seedItemId:'seed.corn',harvestItemId:'crop.corn',growthGameMinutes:5760,stageCount:4,stages:stages('corn',1440,2880,5760),baseYield:2,machineHarvestable:true},
  {id:'potato',allowedSeasons:['spring','autumn'],name:'土豆',seedItemId:'seed.potato',harvestItemId:'crop.potato',growthGameMinutes:2880,stageCount:4,stages:stages('potato',720,1440,2880),baseYield:4},
];
export function createCropRegistry(items:ItemRegistry=ITEMS){
  const registry=new CropRegistry(items);
  // Isolated ItemRegistry fixtures may omit agriculture; never invent their items.
  for(const crop of CROP_DEFINITIONS)if(items.has(crop.seedItemId)&&items.has(crop.harvestItemId))registry.register(crop);
  return registry;
}
const registries=new WeakMap<ItemRegistry,CropRegistry>();
/** One canonical crop configuration for each injected item catalog, including saves. */
export function getCropRegistry(items:ItemRegistry=ITEMS):CropRegistry {
  let registry=registries.get(items);
  if(!registry){registry=createCropRegistry(items);registries.set(items,registry);}
  return registry;
}
export const CROPS=getCropRegistry();
