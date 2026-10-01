import type { GameplayServices } from '../../gameplay/GameplayFoundation';
import { BEHAVIOR_NAMES,FEED_BATCH,LIVESTOCK_PENS,LIVESTOCK_SPECIES,PEN_FEED_CAPACITY } from '../../gameplay/livestock/LivestockDefinition';
import type { LivestockKind } from '../../gameplay/livestock/LivestockDefinition';
import type { InteractionContext,InteractionOutcome,InteractionTarget } from '../../systems/InteractionSystem';
import type { LivestockResult } from '../../gameplay/livestock/LivestockSystem';
import { DAY_DURATION } from '../../core/GameClock';
import { farmHeight } from './FarmTerrain';

const failure=(result:Exclude<LivestockResult,{ok:true}>)=>result.reason==='full'?'背包已满 · 待领取产物仍保留，腾出空间再来。':result.reason==='no-feed'?'需要背包中的饲料、小麦或玉米 · 种子不能作为饲料。':result.reason==='feed-full'?'饲槽储备已满，暂时不需要补充。':'尚无可领取产物 · 补充饲料后等待生产。';
const outcome=(result:LivestockResult,game:GameplayServices,message:string):InteractionOutcome=>result.ok?{status:'success',changed:true,message:`${message}${game.items.get(result.itemId)?.name??result.itemId} × ${result.quantity}`}:{status:'unavailable',message:failure(result)};
export class LivestockInteractions {
  constructor(private game:GameplayServices){}
  animalHint(id:string):{prompt:string;reason?:string}{
    const game=this.game,animal=game.livestock.getAnimal(id);if(!animal)return {prompt:'动物暂时不可用',reason:'动物暂时不可用'};
    const species=LIVESTOCK_SPECIES[animal.kind],number=Number(animal.id.split('-')[1])+1,name=`${species.name} ${number}`;
    if(animal.pending){const prompt=`${species.collectVerb} · ${name} · 待领 ${animal.pending} 份`;return {prompt,...(!game.inventory.canAdd(species.productItemId,1)?{reason:`背包已满 · ${prompt}仍保留`}:{})};}
    const remaining=animal.nextProductAtGameTime===null?null:Math.max(1,Math.ceil((animal.nextProductAtGameTime-game.time.gameTime)*1440/DAY_DURATION/60));
    const prompt=`${name} · ${BEHAVIOR_NAMES[animal.behavior]} · ${remaining===null?'尚未喂养，向饲槽补充饲料、小麦或玉米':`约 ${remaining} 小时后可${species.collectVerb}`}`;return {prompt,reason:prompt};
  }
  feedHint(id:LivestockKind):{prompt:string;reason?:string}{
    const game=this.game,pen=game.livestock.getPen(id)!,itemId=game.livestock.feedChoice(game.hotbar.selectedItem?.id),def=LIVESTOCK_PENS.find(p=>p.id===id)!;
    const available=itemId?game.inventory.count(itemId):0,quantity=Math.min(FEED_BATCH,PEN_FEED_CAPACITY-pen.feed,available),stored=`储备 ${pen.feed}/${PEN_FEED_CAPACITY}`;
    return {prompt:`${def.name}饲槽 · 补充${game.items.get(itemId??'')?.name??'饲料 / 小麦 / 玉米'} × ${quantity} · ${stored}`,
      ...(pen.feed>=PEN_FEED_CAPACITY?{reason:`${def.name}饲槽已满 · ${stored}`}:!itemId?{reason:`${def.name}饲槽 · 需要背包中的饲料、小麦或玉米 · ${stored}`}:{})};
  }
  targets():InteractionTarget[]{
    const game=this.game;
    return [
      ...LIVESTOCK_PENS.map(p=>({id:`livestock_feed:${p.id}`,name:`${p.name}饲槽`,action:'LIVESTOCK_FEED',x:p.feeder.x,y:farmHeight(p.feeder.x,p.feeder.z)+.44,z:p.feeder.z,range:1.5,
        prompt:this.feedHint(p.id).prompt,unavailable:(context:InteractionContext)=>context.worldId==='FARM'?this.feedHint(p.id).reason:'请在农场圈舍喂养动物。',onInteract:()=>outcome(game.livestock.feed(p.id,game.hotbar.selectedItem?.id),game,'已补充饲料 · ')})),
      ...game.livestock.getAnimals().map(a=>({id:`livestock_collect:${a.id}`,name:LIVESTOCK_SPECIES[a.kind].collectVerb,action:'LIVESTOCK_COLLECT',x:a.x,y:farmHeight(a.x,a.z)+.44,z:a.z,range:1.25,
        prompt:this.animalHint(a.id).prompt,unavailable:(context:InteractionContext)=>context.worldId==='FARM'?this.animalHint(a.id).reason:'请在农场圈舍领取产物。',onInteract:()=>outcome(game.livestock.collect(a.id),game,'已放入背包 · ')})),
    ];
  }
}
