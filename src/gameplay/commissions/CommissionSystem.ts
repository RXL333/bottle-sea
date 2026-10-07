import type { Inventory,ItemStack } from '../Inventory';
import type { EconomySystem } from '../economy/EconomySystem';
import type { ProgressionSystem } from '../progression/ProgressionSystem';
import type { ProgressionActivity } from '../progression/ProgressionRegistry';
import { COMMISSIONS } from './CommissionRegistry';
import type { CommissionDefinition,CommissionObjective,CommissionRegistry } from './CommissionRegistry';
import { normalizeCommissions } from './CommissionState';
import type { CommissionSnapshot } from './CommissionState';
export type CommissionStatus='AVAILABLE'|'ACTIVE'|'READY'|'COMPLETED';
export type CommissionFailure='unknown'|'wrong-npc'|'locked'|'already-accepted'|'not-accepted'|'completed'|'not-ready'|'insufficient-items'|'full'|'balance-limit'|'busy'|'failed';
export type CommissionResult={ok:true;message:string}|{ok:false;reason:CommissionFailure;message:string};
export interface CommissionView {definition:Readonly<CommissionDefinition>;status:CommissionStatus;locked?:string;progress:{objective:CommissionObjective;current:number;total:number}[]}
const failures:Record<CommissionFailure,string>={unknown:'这份委托尚未登记。','wrong-npc':'请回到发布这份委托的岛民身边。',locked:'先完成成长手记里的生活循环，再来接取这份进阶委托。','already-accepted':'这份委托已经接取。','not-accepted':'请先接取委托。',completed:'这份委托已经完成，奖励不会重复发放。','not-ready':'生产或探索目标尚未完成，按自己的节奏继续即可。','insufficient-items':'背包中所需物品数量不足，仓库和车载粮仓中的物品请先取出。',full:'提交后的背包仍放不下全部奖励，请腾出空间再来；物品与奖励已保留。','balance-limit':'金币达到上限，请先使用部分金币；本次没有扣除物品。',busy:'正在处理委托，请稍后。',failed:'委托未能提交，物品和奖励已保留。'};
/** No inventory/money copies. Only accepted/completed markers and committed production evidence persist. */
export class CommissionSystem {
  private state:CommissionSnapshot;private busy=false;revision=0;
  constructor(private now:()=>number,private inventory:Inventory,private economy:EconomySystem,private progression:ProgressionSystem,
    saved?:unknown,private onChange:()=>void=()=>{},private batch:<T>(action:()=>T)=>T=action=>action(),readonly registry:CommissionRegistry=COMMISSIONS){this.state=normalizeCommissions(saved,now(),registry);}
  snapshot(){return structuredClone(this.state);}
  private fail(reason:CommissionFailure):CommissionResult {return {ok:false,reason,message:failures[reason]};}
  view(id:string,discoveries:readonly string[]=[]):CommissionView|undefined {
    const d=this.registry.get(id);if(!d)return;
    const record=Object.hasOwn(this.state.records,id)?this.state.records[id]:undefined;
    const progress=d.objectives.map((o,i)=>{const total='quantity'in o?o.quantity:1;const current=o.kind==='delivery'?this.inventory.count(o.itemId):o.kind==='production'?record?.production[i]??0:o.kind==='discovery'?(discoveries.includes(o.discoveryId)?1:0):(this.progression.completed(o.milestoneId)?1:0);return {objective:o,current:Math.min(total,current),total};});
    const status:CommissionStatus=record?.completedAt!==null&&record?.completedAt!==undefined?'COMPLETED':!record?'AVAILABLE':progress.every(p=>p.current>=p.total)?'READY':'ACTIVE';
    return {definition:d,status,progress:status==='COMPLETED'?progress.map(p=>({...p,current:p.total})):progress,locked:d.requiresUnlock&&!this.progression.canAccess(d.requiresUnlock)?this.progression.lockReason(d.requiresUnlock):undefined};
  }
  list(npcId?:string,discoveries:readonly string[]=[]){return this.registry.list(npcId).map(d=>this.view(d.id,discoveries)!);}
  accept(id:string,npcId:string):CommissionResult {
    if(this.busy)return this.fail('busy');const view=this.view(id);if(!view)return this.fail('unknown');
    if(view.definition.npcId!==npcId)return this.fail('wrong-npc');
    if(view.status==='COMPLETED')return this.fail('completed');if(view.status!=='AVAILABLE')return this.fail('already-accepted');if(view.locked)return this.fail('locked');
    this.state.records[id]={acceptedAt:this.now(),completedAt:null,production:view.progress.map(()=>0)};this.revision++;this.onChange();return {ok:true,message:`已接取「${view.definition.name}」· J 查看委托手记，没有期限。`};
  }
  /** Called only after existing gameplay owners successfully commit a catch/cook/harvest/collection. */
  record(activity:ProgressionActivity,produced:readonly ItemStack[]=[]){
    let changed=false;
    for(const d of this.registry.list()){
      const record=Object.hasOwn(this.state.records,d.id)?this.state.records[d.id]:undefined;if(!record||record.completedAt!==null)continue;
      d.objectives.forEach((o,i)=>{if(o.kind!=='production'||o.activity!==activity)return;const amount=produced.filter(s=>(!o.itemId||s.itemId===o.itemId)&&this.inventory.items.has(s.itemId)&&Number.isSafeInteger(s.quantity)&&s.quantity>0).reduce((n,s)=>n+s.quantity,0);const next=Math.min(o.quantity,record.production[i]+amount);if(next!==record.production[i]){record.production[i]=next;changed=true;}});
    }
    if(changed){this.revision++;this.onChange();}
  }
  submit(id:string,npcId:string,discoveries:readonly string[]=[]):CommissionResult {
    if(this.busy)return this.fail('busy');const v=this.view(id,discoveries);if(!v)return this.fail('unknown');
    if(v.definition.npcId!==npcId)return this.fail('wrong-npc');if(v.status==='COMPLETED')return this.fail('completed');if(v.status==='AVAILABLE')return this.fail('not-accepted');
    const d=v.definition,consumed=this.deliveries(d);
    if(consumed.some(s=>!this.inventory.has(s.itemId,s.quantity)))return this.fail('insufficient-items');
    if(v.status!=='READY')return this.fail('not-ready');
    const check=this.inventory.canExchange(consumed,d.rewards.items);if(!check.ok)return this.fail(check.reason==='full'?'full':'insufficient-items');
    if(!this.economy.canCredit(d.rewards.coins))return this.fail('balance-limit');
    const bag=this.inventory.snapshot(),coins=this.economy.snapshot(),growth=this.progression.snapshot(),state=this.snapshot();this.busy=true;
    try{return this.batch(()=>{
      try{
        this.state.records[id].completedAt=this.now();
        const exchanged=this.inventory.exchange(consumed,d.rewards.items);if(!exchanged.ok){this.state=state;return this.fail(exchanged.reason==='full'?'full':'insufficient-items');}
        if(!this.economy.credit(d.rewards.coins))throw Error('Reward balance changed');
        for(const unlock of d.rewards.unlocks)if(!this.progression.grant(unlock))throw Error('Unknown reward unlock');
        this.revision++;this.onChange();return {ok:true,message:`委托完成 · ${d.name} · 奖励已领取`};
      }catch{this.inventory.rollback(bag);this.economy.rollback(coins);this.progression.rollback(growth);this.state=state;this.revision++;this.onChange();return this.fail('failed');}
    });}finally{this.busy=false;}
  }
  private deliveries(d:CommissionDefinition):ItemStack[]{const totals=new Map<string,number>();for(const o of d.objectives)if(o.kind==='delivery')totals.set(o.itemId,(totals.get(o.itemId)??0)+o.quantity);return [...totals].map(([itemId,quantity])=>({itemId,quantity}));}
}
