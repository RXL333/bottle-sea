import type { Inventory } from '../Inventory';
import { normalizeVehicles } from '../vehicles/VehicleState';
import type { VehiclePose,VehicleProgress } from '../vehicles/VehicleState';
import { normalizeEconomy } from './EconomyState';
import type { EconomySnapshot } from './EconomyState';
import { BARN_CAPACITIES,GRAIN_CAPACITIES,MAX_COINS,MAX_TRADE_QUANTITY,SELL_PRICES,tradeOffer,validateTradeCatalog } from './TradeCatalog';
export type TradeFailure='unknown-product'|'invalid-quantity'|'insufficient-coins'|'insufficient-items'|'full'|'already-owned'|'upgrade-order'|'delivery-blocked'|'farm-only'|'stale-request'|'balance-limit'|'transaction-failed';
export type TradeResult={ok:true;total:number;quantity:number}|{ok:false;reason:TradeFailure};
export interface MachineDeliveryPlan {pose:VehiclePose;apply():void;rollback():void}
export interface TradeAccess {farm:boolean;upgraded?():void;delivery?:{available():boolean;prepare():MachineDeliveryPlan|undefined}}
export const TRADE_FAILURES:Readonly<Record<TradeFailure,string>>={
  'unknown-product':'商船不经营此商品。','invalid-quantity':'数量必须是 1～999 的整数；农机和升级每次一份。','insufficient-coins':'金币不足，交易未扣款。','insufficient-items':'背包中物品数量不足。','full':'背包空间不足，交易未扣款。','already-owned':'此农机已购买，原有农机也会保留。','upgrade-order':'已升级或需先购买前一级升级。','delivery-blocked':'交付停放位被占用，请移开车辆或离开停放区后重试。','farm-only':'请到农场码头购买并接收农机。','stale-request':'该交易请求已处理或已过期，没有重复扣款或发放。','balance-limit':'金币或交易记录达到上限。','transaction-failed':'交易未完成，资源已保留，请重试。',
};
/** Synchronous resource transactions. A persisted sequence rejects replayed purchase/sell requests. */
export class EconomySystem {
  private state:EconomySnapshot;revision=0;
  constructor(private inventory:Inventory,private barn:Inventory,private vehicles:VehicleProgress,saved?:unknown,private onChange:()=>void=()=>{}){validateTradeCatalog(inventory.items);this.state=normalizeEconomy(saved);}
  get coins(){return this.state.coins;}get nextRequest(){return this.state.sequence+1;}
  get barnCapacity(){return BARN_CAPACITIES[this.state.upgrades.barn];}get grainCapacity(){return GRAIN_CAPACITIES[this.state.upgrades.grain];}
  snapshot(){return structuredClone(this.state);}
  check(mode:'buy'|'sell',id:string,quantity:number,access:TradeAccess={farm:false},request=this.nextRequest):TradeResult {
    if(request!==this.nextRequest)return {ok:false,reason:'stale-request'};
    if(!Number.isSafeInteger(quantity)||quantity<1||quantity>MAX_TRADE_QUANTITY)return {ok:false,reason:'invalid-quantity'};
    const offer=tradeOffer(id),price=mode==='sell'?SELL_PRICES[id]:offer?.price;
    if(!price)return {ok:false,reason:'unknown-product'};
    if(mode==='buy'&&offer!.kind!=='item'&&quantity!==1)return {ok:false,reason:'invalid-quantity'};
    const total=price*quantity;
    if(this.state.sequence>=MAX_COINS||mode==='sell'&&this.coins+total>MAX_COINS)return {ok:false,reason:'balance-limit'};
    if(mode==='sell'){if(!this.inventory.has(id,quantity))return {ok:false,reason:'insufficient-items'};}
    else {
      if(offer!.kind==='upgrade'&&offer!.level!==this.state.upgrades[offer!.target]+1)return {ok:false,reason:'upgrade-order'};
      if(offer!.kind==='machine'){
        if(this.state.purchases[id]||this.vehicles.get(offer!.vehicleId))return {ok:false,reason:'already-owned'};
        if(!access.farm)return {ok:false,reason:'farm-only'};
        if(!access.delivery?.available())return {ok:false,reason:'delivery-blocked'};
      }
      if(this.coins<total)return {ok:false,reason:'insufficient-coins'};
      if(offer!.kind==='item'&&!this.inventory.canAdd(offer!.itemId,quantity))return {ok:false,reason:'full'};
    }
    return {ok:true,total,quantity};
  }
  trade(mode:'buy'|'sell',id:string,quantity:number,request:number,access:TradeAccess={farm:false}):TradeResult {
    const checked=this.check(mode,id,quantity,access,request);if(!checked.ok)return checked;
    const offer=tradeOffer(id);let plan:MachineDeliveryPlan|undefined;
    if(mode==='buy'&&offer?.kind==='machine'){try{plan=access.delivery?.prepare();}catch{return {ok:false,reason:'transaction-failed'};}if(!plan||!normalizeVehicles({vehicles:[plan.pose]},this.grainCapacity).vehicles.some(v=>v.id===offer.vehicleId)){plan?.rollback();return {ok:false,reason:'delivery-blocked'};}}
    const before=this.snapshot(),fleet=this.vehicles.snapshot(),bag=this.inventory.snapshot(),barn=this.barn.snapshot(),grainCapacity=this.grainCapacity;
    this.state.coins+=mode==='sell'?checked.total:-checked.total;this.state.sequence++;
    if(mode==='buy')this.state.purchases[id]=(this.state.purchases[id]??0)+quantity;
    try{
      if(mode==='sell'||offer?.kind==='item'){
        const result=mode==='sell'?this.inventory.exchange([{itemId:id,quantity}],[]):offer?.kind==='item'?this.inventory.exchange([],[{itemId:offer.itemId,quantity}]):{ok:false as const,reason:'unknown-item' as const};
        if(!result.ok){this.state=before;return {ok:false,reason:result.reason==='full'?'full':'insufficient-items'};}
      }else if(offer?.kind==='upgrade'){
        this.state.upgrades[offer.target]=offer.level;
        if(offer.target==='barn')this.barn.expandCapacity(this.barnCapacity);else this.vehicles.setGrainCapacity(this.grainCapacity);access.upgraded?.();
      }else if(plan){this.vehicles.record(plan.pose);plan.apply();}
    }catch{this.state=before;this.inventory.rollback(bag);this.barn.rollback(barn);this.vehicles.restore(fleet,grainCapacity);plan?.rollback();try{this.onChange();}catch{/* The next explicit save can retry a failing storage channel. */}return {ok:false,reason:'transaction-failed'};}
    this.revision++;this.onChange();return checked;
  }
}
