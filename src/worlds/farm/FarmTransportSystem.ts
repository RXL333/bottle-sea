import type { CombineVehicle } from '../../systems/vehicles/CombineVehicle';
import type { TrailerVehicle } from '../../systems/vehicles/TrailerVehicle';
import type { TractorVehicle } from '../../systems/vehicles/TractorVehicle';
import type { GameplayServices } from '../../gameplay/GameplayFoundation';
import type { InventoryTransferResult } from '../../gameplay/Inventory';
import type { InteractionOutcome } from '../../systems/InteractionSystem';
import { containsRect,FARM_GRAIN_UNLOAD } from './FarmMap';

/** Spatial permissions around native load/discharge points; Inventory owns transfers. */
export class FarmTransportSystem {
  constructor(private game:GameplayServices,private combine:CombineVehicle,readonly trailer:TrailerVehicle,private tractor:TractorVehicle,private attached:()=>boolean){}
  private get byTrailer(){
    this.trailer.root.updateMatrixWorld(true);
    const point=this.trailer.root.worldToLocal(this.combine.dischargePosition());
    const distance=Math.hypot(Math.max(0,Math.abs(point.x)-.74)*this.trailer.root.scale.x,Math.max(0,Math.abs(point.z)-1.20)*this.trailer.root.scale.z),height=(point.y-1.59)*this.trailer.root.scale.y;
    return distance<=.45&&height>=-.1&&height<=1.2;
  }
  private get trailerAtBarn(){const p=this.trailer.loadingPoint();return containsRect(FARM_GRAIN_UNLOAD,p.x,p.z);}
  get combineHint(){return this.byTrailer?`U 向拖车装粮 · ${this.trailer.cargoHint} · 双方停稳后操作`:'U 卸粮管对准拖车车厢 / 谷仓停车卸货 · 土豆手工收获';}
  get trailerHint(){return `${this.trailer.cargoHint} · ${this.trailerAtBarn?'已到谷仓 · 停稳 U 卸货':'谷仓门前停车 U 卸货'} · 下车靠近车厢 E 管理货物`;}
  unloadCombine():InteractionOutcome {
    if(Math.abs(this.combine.speed)>.12||this.combine.workEnabled)return {status:'unavailable',message:'请按 Space 停稳并关闭收割，再卸粮。'};
    if(!this.combine.grainTank.used)return {status:'unavailable',message:'粮仓为空，没有可卸的粮食。'};
    if(this.byTrailer){
      if(Math.abs(this.trailer.speed)>.12)return {status:'unavailable',message:'拖车仍在移动 · 收割机与拖拉机必须同时停稳。'};
      return this.feedback(this.combine.grainTank.unloadAvailableTo(this.trailer.cargo),'拖车','拖车容量不足，未转移的粮食仍在收割机上。');
    }
    if(!containsRect(FARM_GRAIN_UNLOAD,this.combine.pose.x,this.combine.pose.z))return {status:'unavailable',message:'请将卸粮管对准拖车车厢，或开到谷仓卸货区，停稳后按 U。'};
    return this.feedback(this.combine.grainTank.unloadAvailableTo(this.game.barn),'谷仓','谷仓空间不足，剩余粮食保留在收割机上。');
  }
  unloadTrailer():InteractionOutcome {
    if(!this.attached())return {status:'unavailable',message:'请先挂接拖车，再驾驶到谷仓卸货。'};
    if(Math.abs(this.tractor.speed)>.12||Math.abs(this.trailer.speed)>.12)return {status:'unavailable',message:'请按 Space 刹车，拖拉机和拖车停稳后再卸货。'};
    if(!this.trailerAtBarn)return {status:'unavailable',message:'请将拖车车厢停入谷仓门前的虚线卸货区，再按 U。'};
    if(!this.trailer.cargo.usedQuantity)return {status:'unavailable',message:'拖车为空，没有可卸的货物。'};
    return this.feedback(this.trailer.cargo.transferAvailableTo(this.game.barn),'谷仓','谷仓空间不足，未转移的货物仍在拖车上。');
  }
  private feedback(result:InventoryTransferResult,name:string,blocked:string):InteractionOutcome {
    if(!result.ok||!result.quantity)return {status:'unavailable',message:blocked};
    const description=result.moved.map(s=>`${this.game.items.get(s.itemId)?.name} × ${s.quantity}`).join('、'),remaining=result.remaining.reduce((n,s)=>n+s.quantity,0);
    return {status:'success',changed:true,message:`已转移至${name}：${description}${remaining?` · 剩余 ${remaining} 份保留在原处，接收方空间不足`:' · 转移完成'}`};
  }
}
