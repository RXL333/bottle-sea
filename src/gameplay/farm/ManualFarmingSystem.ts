import type { GameplayServices } from '../GameplayFoundation';
import type { InteractionOutcome } from '../../systems/InteractionSystem';
import type { FarmCellRef } from './FarmDefinition';
import type { FarmFailureReason,FarmResult } from './FarmSystem';

export interface ManualFarmAction {action:'TILL'|'SEED'|'HARVEST'|'WAIT';prompt:string;reason?:string;cropId?:string}
/** Stateless hand-work rules; field state, time and items stay in shared services. */
export class ManualFarmingSystem {
  constructor(private game:GameplayServices){}
  get selectedCrop(){const item=this.game.hotbar.selectedItem;return item?this.game.crops.registry.getBySeedItemId(item.id):undefined;}
  inspect(ref:FarmCellRef):ManualFarmAction {
    const cell=this.game.farm.getCell(ref);
    if(!cell)return {action:'WAIT',prompt:'不可耕作区域',reason:'这里只能行走，请站到主农田内作业。'};
    if(cell.landState==='UNTILLED'||cell.landState==='HARVESTED')return {action:'TILL',prompt:'手工耕地 · 当前高亮单元'};
    if(cell.landState==='TILLED'){
      const crop=this.selectedCrop;
      if(!crop)return {action:'SEED',prompt:'选择种子后播种',reason:'已耕地 · B 打开背包拿起种子，1～8 选择'};
      const seed=this.game.items.get(crop.seedItemId)!;
      if(!this.game.inventory.has(seed.id))return {action:'SEED',prompt:`播种${crop.name}`,reason:`${seed.name}已用完 · 换一种种子或补充库存`};
      return {action:'SEED',prompt:`播种${crop.name} · 消耗 ${seed.name} × 1`,cropId:crop.id};
    }
    const crop=cell.crop?this.game.crops.registry.get(cell.crop.cropId):undefined;
    if(!crop||!cell.growth)return {action:'WAIT',prompt:'作物状态不可用',reason:'作物暂时无法操作，请重新进入农场。'};
    if(cell.landState==='MATURE'){
      const output=this.game.items.get(crop.harvestItemId)!;
      return {action:'HARVEST',prompt:`收割${crop.name} · 获得 ${output.name} × ${crop.baseYield}`,
        ...(!this.game.inventory.canAdd(output.id,crop.baseYield)?{reason:`背包已满 · ${crop.name}仍保留，请腾出空间后收割`}:{})};
    }
    const remainingHours=Math.max(1,Math.ceil((crop.growthGameMinutes-cell.growth.elapsedGameMinutes)/60)),days=Math.floor(remainingHours/24),hours=remainingHours%24;
    const wait=days?`${days} 天${hours?` ${hours} 小时`:''}`:`${hours} 小时`;
    const progress=Math.floor(cell.growth.progress*100),prompt=`${crop.name} · ${cell.growth.stage.name} ${progress}% · 约 ${wait}后成熟`;
    return {action:'WAIT',prompt,reason:prompt};
  }
  work(ref:FarmCellRef):InteractionOutcome {
    const action=this.inspect(ref);if(action.reason)return {status:'unavailable',message:action.reason};
    if(action.action==='TILL')return this.outcome(this.game.farm.till([ref]),'已耕地 · 拿起种子后，按 E 播种。');
    if(action.action==='SEED'&&action.cropId){
      const crop=this.game.crops.registry.get(action.cropId)!;
      return this.outcome(this.game.farm.seed([ref],crop.id),`已播种${crop.name} · 可离岛、旅行或回家睡觉等待成长。`);
    }
    if(action.action==='HARVEST'){
      const result=this.game.farm.harvest([ref]);
      const description=result.ok?result.produced.map(s=>`${this.game.items.get(s.itemId)?.name??s.itemId} × ${s.quantity}`).join('、'):'';
      return this.outcome(result,`收获 ${description} · 已放入背包，土地可重新耕作。`);
    }
    return {status:'unavailable',message:'作物还未成熟，请等待。'};
  }
  claimSeeds():InteractionOutcome {
    const result=this.game.farm.claimStarterSeeds();
    const description=result.ok?result.produced.map(s=>`${this.game.items.get(s.itemId)?.name??s.itemId} × ${s.quantity}`).join('、'):'';
    return this.outcome(result,`领取 ${description} · B 打开背包，选择种子并拿起。`);
  }
  private outcome(result:FarmResult,message:string):InteractionOutcome {
    return result.ok?{status:'success',message}:{status:'unavailable',message:this.failure(result.reason)};
  }
  private failure(reason:FarmFailureReason):string {
    if(reason==='full')return '背包空间不足，本次没有领取或收割，物品仍保留。';
    if(reason==='insufficient-items')return '种子数量不足，本次没有播种。';
    if(reason==='already-claimed')return '初始种子已经领取过，可从背包或小屋箱子取用。';
    if(reason==='invalid-land-state')return '土地状态已变化，请重新确认当前单元。';
    return '当前无法作业，土地与物品已保留。';
  }
}
