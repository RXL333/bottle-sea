import { SEASON_IDS } from './calendar/SeasonRegistry';
import type { SeasonId } from './calendar/SeasonRegistry';
export const ITEM_CATEGORIES=['food','fish','crop','seed','material','tool','special'] as const;
export type ItemCategory=typeof ITEM_CATEGORIES[number];
export const CATEGORY_LABELS:Readonly<Record<ItemCategory,string>>={food:'食物',fish:'鱼类',crop:'作物',seed:'种子',material:'材料',tool:'工具',special:'特殊'};
export interface FishProperties {readonly weight:number;readonly color:string;readonly rarity:'常见'|'少见'|'稀有';readonly seasonWeights?:Readonly<Partial<Record<SeasonId,number>>>}
export interface ItemDefinition {
  readonly id:string;readonly name:string;readonly category:ItemCategory;readonly description:string;
  readonly icon:string;readonly maxStack:number;
  readonly sellPrice?:number;readonly energyRestore?:number;readonly cropId?:string;
  readonly fishing?:FishProperties;
}
export interface FishDefinition extends ItemDefinition {readonly category:'fish';readonly fishing:FishProperties}
export interface FoodDefinition extends ItemDefinition {readonly category:'food';readonly energyRestore:number}
export const MAX_STACK_SIZE=9999;

/** The single source for metadata. Gameplay catalogs contain rules or registry views. */
export class ItemRegistry {
  private definitions=new Map<string,Readonly<ItemDefinition>>();
  register(item:ItemDefinition):this {
    if(!/^[a-z][a-z0-9_.-]*$/.test(item.id)||!item.name.trim()||!ITEM_CATEGORIES.includes(item.category)
      ||!item.description.trim()||!item.icon.trim()||!Number.isSafeInteger(item.maxStack)||item.maxStack<1||item.maxStack>MAX_STACK_SIZE
      ||(item.energyRestore!==undefined&&(!Number.isFinite(item.energyRestore)||item.energyRestore<0))
      ||(item.sellPrice!==undefined&&(!Number.isSafeInteger(item.sellPrice)||item.sellPrice<0))
      ||(item.cropId!==undefined&&!/^[a-z][a-z0-9_.-]*$/.test(item.cropId))
      ||(item.fishing&&(!Number.isFinite(item.fishing.weight)||item.fishing.weight<=0||!item.fishing.color.trim()||(item.fishing.seasonWeights!==undefined&&Object.entries(item.fishing.seasonWeights).some(([id,weight])=>!SEASON_IDS.includes(id as SeasonId)||typeof weight!=='number'||!Number.isFinite(weight)||weight<0)))))throw new Error(`Invalid item definition: ${item.id}`);
    if(this.definitions.has(item.id))throw new Error(`Item already registered: ${item.id}`);
    this.definitions.set(item.id,Object.freeze({...item,...(item.fishing?{fishing:Object.freeze({...item.fishing,...(item.fishing.seasonWeights?{seasonWeights:Object.freeze({...item.fishing.seasonWeights})}:{})})}:{})}));return this;
  }
  get(id:string):Readonly<ItemDefinition>|undefined{return this.definitions.get(id);}
  has(id:string){return this.definitions.has(id);}
  list():readonly Readonly<ItemDefinition>[]{return [...this.definitions.values()];}
  fish():readonly FishDefinition[]{return this.list().filter((item):item is FishDefinition=>item.category==='fish'&&item.fishing!==undefined);}
  food():readonly FoodDefinition[]{return this.list().filter((item):item is FoodDefinition=>item.category==='food'&&item.energyRestore!==undefined);}
}

export const ITEM_DEFINITIONS:readonly ItemDefinition[]=[
  {id:'wood',name:'木材',category:'material',description:'干燥的木料，可用于烟熏料理和后续建造。',icon:'wood',maxStack:99},
  {id:'stone',name:'石料',category:'material',description:'结实的岛屿石料，留作后续建造材料。',icon:'stone',maxStack:99},
  {id:'fish.sardine',name:'沙丁鱼',category:'fish',description:'常见的小型海鱼，适合烤制或煮汤。',icon:'sardine',maxStack:20,fishing:{seasonWeights:{spring:1.4,summer:1,autumn:1.1,winter:1.5},weight:35,color:'#b4d5dc',rarity:'常见'}},
  {id:'fish.horse_mackerel',name:'竹荚鱼',category:'fish',description:'银绿相间的鲜鱼，鱼肉细嫩。',icon:'horse-mackerel',maxStack:20,fishing:{seasonWeights:{spring:1.4,summer:1.1,autumn:1,winter:.7},weight:24,color:'#92beaf',rarity:'常见'}},
  {id:'fish.mackerel',name:'鲭鱼',category:'fish',description:'背部带有深色条纹，适合烟熏。',icon:'mackerel',maxStack:20,fishing:{seasonWeights:{spring:.8,summer:1,autumn:1.7,winter:1.2},weight:18,color:'#668faf',rarity:'常见'}},
  {id:'fish.sea_bass',name:'海鲈鱼',category:'fish',description:'少见的海鲈鱼，可以制作香煎鲈鱼。',icon:'sea-bass',maxStack:20,fishing:{seasonWeights:{spring:1.2,summer:1.2,autumn:1,winter:.6},weight:12,color:'#b1c4a1',rarity:'少见'}},
  {id:'fish.red_snapper',name:'红鲷鱼',category:'fish',description:'暖红色的海鱼，挣扎时格外有力。',icon:'red-snapper',maxStack:20,fishing:{seasonWeights:{spring:.8,summer:1.8,autumn:1,winter:0},weight:8,color:'#d7846e',rarity:'少见'}},
  {id:'fish.tuna',name:'金枪鱼',category:'fish',description:'罕见的海中游泳健将，需要稳住鱼线张力。',icon:'tuna',maxStack:20,fishing:{seasonWeights:{spring:.6,summer:1.8,autumn:1.2,winter:.4},weight:3,color:'#587889',rarity:'稀有'}},
  {id:'food.grilled_fish',name:'烤鱼',category:'food',description:'鱼皮焦香，适合作为探索途中的简单餐食。',icon:'grilled-fish',maxStack:10,energyRestore:20},
  {id:'food.seafood_soup',name:'海鲜汤',category:'food',description:'两条鲜鱼煮成的暖汤，能恢复更多体力。',icon:'seafood-soup',maxStack:10,energyRestore:45},
  {id:'food.pan_sea_bass',name:'香煎鲈鱼',category:'food',description:'用海鲈鱼煎制的料理，外酥里嫩。',icon:'pan-sea-bass',maxStack:10,energyRestore:35},
  {id:'food.smoked_fish',name:'烟熏鱼',category:'food',description:'木材慢熏的鱼肉，带着淡淡烟香。',icon:'smoked-fish',maxStack:10,energyRestore:30},
  {id:'seed.wheat',name:'小麦种子',category:'seed',description:'可播种在已耕土地上的小麦种子，每个单元消耗一份。',icon:'wheat-seed',maxStack:99,cropId:'wheat'},
  {id:'seed.corn',name:'玉米种子',category:'seed',description:'可播种在已耕土地上的玉米种子，每个单元消耗一份。',icon:'corn-seed',maxStack:99,cropId:'corn'},
  {id:'seed.potato',name:'土豆种薯',category:'seed',description:'留作播种的土豆种薯，每个已耕单元消耗一份。',icon:'potato-seed',maxStack:99,cropId:'potato'},
  {id:'crop.wheat',name:'小麦',category:'crop',description:'收获的金黄麦穗，可放入牧场饲槽喂养动物，也可留作加工。',icon:'wheat',maxStack:99,cropId:'wheat'},
  {id:'crop.corn',name:'玉米',category:'crop',description:'收获的饱满玉米，可放入牧场饲槽喂养动物，也可留作料理。',icon:'corn',maxStack:99,cropId:'corn'},
  {id:'crop.potato',name:'土豆',category:'crop',description:'从土中收获的土豆，可用于后续料理和交易。',icon:'potato',maxStack:99,cropId:'potato'},
  {id:'livestock.egg',name:'鸡蛋',category:'food',description:'喂养母鸡后收集的新鲜鸡蛋，可储存用于烹饪。',icon:'egg',maxStack:20},
  {id:'livestock.milk',name:'牛奶',category:'food',description:'喂养奶牛后取得的鲜牛奶，可储存用于料理。',icon:'milk',maxStack:20},
  {id:'livestock.wool',name:'羊毛',category:'material',description:'喂养绵羊后剪下的柔软羊毛，可储存用于加工。',icon:'wool',maxStack:20},
  {id:'feed.basic',name:'牧场饲料',category:'material',description:'商船出售的通用饲料，可在鸡舍、牛棚和羊圈的饲槽补充。每份支持一次产出。',icon:'feed',maxStack:99},
];
export function createItemRegistry(){const registry=new ItemRegistry();for(const item of ITEM_DEFINITIONS)registry.register(item);return registry;}
export const ITEMS=createItemRegistry();
