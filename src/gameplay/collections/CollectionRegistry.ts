import { ITEMS } from '../ItemRegistry';
import type { ItemRegistry } from '../ItemRegistry';
import { getCropRegistry } from '../farm/CropRegistry';
import { RECIPES } from '../CookingCatalog';
import { LIVESTOCK_SPECIES } from '../livestock/LivestockDefinition';
import { DESTINATIONS } from '../../travel/DestinationRegistry';
import { LANDMARKS,JOURNAL_TEXT } from '../../world/underwater/Landmarks';
export const COLLECTION_CATEGORIES=['fish','crops','cooking','livestock','places','navigation'] as const;
export type CollectionCategory=typeof COLLECTION_CATEGORIES[number];
export const COLLECTION_LABELS:Readonly<Record<CollectionCategory,string>>={fish:'鱼类',crops:'作物',cooking:'料理',livestock:'动物与畜产品',places:'岛屿与地点',navigation:'特殊发现与航海记录'};
export type CollectionReference={kind:'item'|'animal'|'world'|'discovery'|'place';id:string};
export interface CollectionDefinition {
  readonly id:string;readonly category:CollectionCategory;readonly name:string;readonly description:string;
  readonly reference:CollectionReference;readonly iconItemId?:string;readonly information:readonly string[];
}
/** Presentation adapters only: production rules and item metadata keep their existing owners. */
export class CollectionRegistry {
  private entries=new Map<string,Readonly<CollectionDefinition>>();
  private references=new Map<string,string[]>();
  register(entry:CollectionDefinition):this {
    if(!/^[a-z][a-z0-9_.:-]*$/.test(entry.id)||this.entries.has(entry.id)||!COLLECTION_CATEGORIES.includes(entry.category)||!entry.name.trim()||!entry.description.trim()||!entry.reference.id.trim()||!['item','animal','world','discovery','place'].includes(entry.reference.kind))throw new Error(`Invalid collection entry: ${entry.id}`);
    const definition=Object.freeze({...entry,reference:Object.freeze({...entry.reference}),information:Object.freeze([...entry.information])});this.entries.set(entry.id,definition);
    const key=`${entry.reference.kind}:${entry.reference.id}`;this.references.set(key,[...(this.references.get(key)??[]),entry.id]);return this;
  }
  get(id:string){return this.entries.get(id);}
  list(category?:CollectionCategory){return [...this.entries.values()].filter(e=>!category||e.category===category);}
  matching(reference:CollectionReference){return (this.references.get(`${reference.kind}:${reference.id}`)??[]).map(id=>this.entries.get(id)!);}
}
export function createCollectionRegistry(items:ItemRegistry=ITEMS){
  const registry=new CollectionRegistry();
  const itemEntry=(id:string,category:CollectionCategory,itemId:string,information:readonly string[])=>{const item=items.get(itemId);if(item)registry.register({id,category,name:item.name,description:item.description,iconItemId:item.id,reference:{kind:'item',id:item.id},information});};
  for(const fish of items.fish())itemEntry(fish.id,'fish',fish.id,[`出现频度：${fish.fishing.rarity}`,'季节会影响遇见它的机会。']);
  for(const crop of getCropRegistry(items).list())itemEntry(`crop:${crop.id}`,'crops',crop.harvestItemId,[`种子：${items.get(crop.seedItemId)!.name}`,`生长时间：${crop.growthGameMinutes/1440} 天 · ${crop.stageCount} 个阶段`,`基础收获：${crop.baseYield} 份`]);
  for(const recipe of RECIPES)itemEntry(`recipe:${recipe.id}`,'cooking',recipe.outputId,[`恢复体力：${items.get(recipe.outputId)?.energyRestore??0}`,`鱼类材料：${recipe.fishQuantity} 条${recipe.specificFish?` ${items.get(recipe.specificFish)?.name??''}`:''}`,...recipe.materials.map(s=>`${items.get(s.itemId)?.name??s.itemId} × ${s.quantity}`)]);
  for(const [kind,species] of Object.entries(LIVESTOCK_SPECIES)){
    const product=items.get(species.productItemId);if(!product)continue;
    registry.register({id:`animal:${kind}`,category:'livestock',name:species.name,description:`在农场圈舍生活，喂养后可以${species.collectVerb}。`,reference:{kind:'animal',id:kind},iconItemId:product.id,information:[`产物：${product.name}`,`喂养后的产出周期：${species.periodGameMinutes/1440} 天`]});
    itemEntry(product.id,'livestock',product.id,[`来自：${species.name}`,`领取方式：${species.collectVerb}`]);
  }
  for(const d of DESTINATIONS.filter(d=>d.id==='HOME'||d.id==='FARM'))registry.register({id:`world:${d.id.toLowerCase()}`,category:'places',name:d.name,description:d.description,reference:{kind:'world',id:d.id},information:[`单程航行：${d.travelGameMinutes} 游戏分钟`]});
  registry.register({id:'place:cottage',category:'places',name:'海边小屋',description:'炉火、床铺与储物箱，给归航的日子留一处温暖。',reference:{kind:'place',id:'COTTAGE'},information:['家园岛的小屋 · 可以休息、料理与储物']});
  for(const landmark of LANDMARKS)registry.register({id:`discovery:${landmark.id}`,category:landmark.id==='lighthouse'?'places':'navigation',name:landmark.name,description:JOURNAL_TEXT[landmark.id],reference:{kind:'discovery',id:landmark.id},information:['家园岛 · 亲近地标后按 E 记录发现']});
  return registry;
}
