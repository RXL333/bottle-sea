import type { GameplayServices } from '../gameplay/GameplayFoundation';
import type { CommissionView } from '../gameplay/commissions/CommissionSystem';
import type { CommissionObjective } from '../gameplay/commissions/CommissionRegistry';
import { NPCS } from '../gameplay/npc/NpcRegistry';
import { panelHeader,progressMeter } from './UIChrome';
import { itemIcon } from './ItemIcon';
const statuses={AVAILABLE:'可接取',ACTIVE:'进行中',READY:'可提交',COMPLETED:'已完成'};
const discoveries:Record<string,string>={anchor:'发现近岸旧锚',ruins:'发现沉没石柱',chest:'发现海底宝箱',lighthouse:'发现灯塔'};
const productionNames:Record<string,string>={'fish.catch':'实际钓获鱼类','farm.harvest':'实际收获作物','cook.complete':'亲手完成料理','livestock.collect':'实际领取畜产品'};
/** Read-only journal away from NPCs; transactions stay in the shared commission service. */
export class CommissionPanel {
  readonly element=document.createElement('dialog');private game?:GameplayServices;private owner?:string;
  private facts:()=>readonly string[]=()=>[];private access:()=>boolean=()=>true;private onClose=()=>{};private notify:(message:string)=>void=()=>{};
  private filter='active';private selected?:string;private signature='';private message='';
  constructor(root:HTMLElement){
    this.element.className='commission-panel ui-panel';this.element.setAttribute('aria-label','委托手记');root.append(this.element);
    this.element.addEventListener('cancel',e=>{e.preventDefault();this.close();});
    this.element.addEventListener('keydown',e=>{e.stopPropagation();if(e.code==='KeyJ'&&!e.repeat){e.preventDefault();this.close();}});
  }
  get open(){return this.element.open;}
  show(game:GameplayServices,owner:string|undefined,facts:()=>readonly string[],access:()=>boolean,close:()=>void,notify:(message:string)=>void){
    this.game=game;this.owner=owner;this.facts=facts;this.access=access;this.onClose=close;this.notify=notify;this.filter=owner?'all':'active';this.selected=undefined;this.message='';this.render();this.element.showModal();this.element.querySelector<HTMLButtonElement>('.ui-close')!.focus();
  }
  refresh(){if(!this.open||!this.game)return;const key=this.key();if(key!==this.signature)this.render();}
  private key(){const g=this.game!;return `${g.commissions.revision}/${g.inventory.revision}/${g.economy.revision}/${g.progression.revision}/${this.facts().join(',')}/${this.access()}`;}
  private button(label:string,action:()=>void){const b=document.createElement('button');b.type='button';b.textContent=label;b.addEventListener('click',action);return b;}
  private objective(o:CommissionObjective){
    if(o.kind==='delivery')return `交付 ${this.game!.items.get(o.itemId)!.name}`;
    if(o.kind==='production')return `${o.itemId?`亲手制作 ${this.game!.items.get(o.itemId)!.name}`:productionNames[o.activity]}（接取后）`;
    if(o.kind==='discovery')return discoveries[o.discoveryId];return this.game!.progression.registry.getMilestone(o.milestoneId)!.name;
  }
  private render(){
    const g=this.game!,all=g.commissions.list(this.owner,this.facts()),npc=this.owner?NPCS.get(this.owner):undefined;
    const scroll=this.element.querySelector<HTMLElement>('.commission-list')?.scrollTop??0;
    this.signature=this.key();this.element.replaceChildren(panelHeader('委托手记','ISLAND REQUESTS · 把日子过成小小的收获',()=>this.close()));
    const intro=document.createElement('p');intro.className='commission-intro';intro.textContent=npc?`${npc.name} · ${npc.role}。接取与交付都在这里进行，没有期限。`:'J 随时查看进度；接取或提交请回到发布委托的岛民身边。生产目标从接取后计数，已有探索记录有效。';this.element.append(intro);
    const tabs=document.createElement('nav');tabs.className='commission-tabs';tabs.setAttribute('aria-label','委托筛选');
    for(const [id,label] of [['active','正在进行'],['all','全部委托'],['completed','已完成']]){const b=this.button(label,()=>{this.filter=id;this.render();});b.className='ui-button secondary';b.setAttribute('aria-pressed',String(this.filter===id));tabs.append(b);}
    const counts=document.createElement('span');counts.textContent=`进行中 ${all.filter(v=>v.status==='ACTIVE'||v.status==='READY').length} · 已完成 ${all.filter(v=>v.status==='COMPLETED').length} / ${all.length} · 金币 ${g.economy.coins}`;tabs.append(counts);this.element.append(tabs);
    const visible=all.filter(v=>this.filter==='all'||this.filter==='completed'&&v.status==='COMPLETED'||this.filter==='active'&&(v.status==='ACTIVE'||v.status==='READY'));
    if(!visible.some(v=>v.definition.id===this.selected))this.selected=visible[0]?.definition.id;
    const body=document.createElement('div');body.className='commission-body';
    const list=document.createElement('section');list.className='commission-list';list.setAttribute('aria-label','委托列表');
    if(!visible.length){const empty=document.createElement('p');empty.textContent=this.filter==='active'?'还没有进行中的委托。看看全部委托，找岛民聊聊吧。':'这一页还没有委托记录。';list.append(empty);}
    for(const v of visible){const d=v.definition,b=this.button(d.name,()=>{this.selected=d.id;this.message='';this.render();});b.className='commission-card ui-card';b.setAttribute('aria-pressed',String(this.selected===d.id));b.setAttribute('aria-label',`${d.name} · ${statuses[v.status]}`);const subtitle=document.createElement('small');subtitle.textContent=`${NPCS.get(d.npcId)!.name} · ${v.locked&&v.status==='AVAILABLE'?'待解锁':statuses[v.status]}`;b.append(subtitle);b.dataset.state=v.status;list.append(b);}
    body.append(list);const view=all.find(v=>v.definition.id===this.selected);if(view)body.append(this.detail(view));this.element.append(body);list.scrollTop=scroll;
    const message=document.createElement('p');message.className='commission-message';message.setAttribute('role','status');message.textContent=this.message||'交付只使用随身背包；数量或奖励容量不足时，物品和奖励都会保留。';this.element.append(message);
  }
  private detail(v:CommissionView){
    const g=this.game!,d=v.definition,pane=document.createElement('section');pane.className='commission-detail ui-card';pane.setAttribute('aria-label','委托详情');
    const heading=document.createElement('h3');heading.textContent=d.name;const description=document.createElement('p');description.textContent=d.description;const state=document.createElement('strong');state.className='commission-state';state.textContent=`${NPCS.get(d.npcId)!.name} · ${statuses[v.status]}`;pane.append(state,heading,description);
    for(const p of v.progress){const row=document.createElement('div');row.className='commission-goal';const label=document.createElement('span');label.textContent=`${this.objective(p.objective)} · ${p.current} / ${p.total}`;if(p.objective.kind==='delivery')row.append(itemIcon(g.items.get(p.objective.itemId)!));row.append(label,progressMeter(p.current,p.total,this.objective(p.objective)));pane.append(row);}
    const reward=document.createElement('div');reward.className='commission-rewards';const title=document.createElement('strong');title.textContent='完成奖励';reward.append(title);
    const coins=document.createElement('span');coins.textContent=`金币 +${d.rewards.coins}`;reward.append(coins);
    for(const s of d.rewards.items){const row=document.createElement('span');row.append(itemIcon(g.items.get(s.itemId)!));row.append(`${g.items.get(s.itemId)!.name} × ${s.quantity}`);reward.append(row);}
    for(const unlock of d.rewards.unlocks){const label=document.createElement('span');label.textContent=`解锁 · ${g.progression.registry.getUnlock(unlock)!.name}`;reward.append(label);}pane.append(reward);
    if(v.status==='COMPLETED'){const done=document.createElement('p');done.className='commission-complete';done.textContent='✓ 已完成 · 奖励已领取';pane.append(done);}
    else if(!this.owner){const note=document.createElement('p');note.textContent=`到${NPCS.get(d.npcId)!.name}身边，按 E 对话后接取或提交。`;pane.append(note);}
    else {
      const accepting=v.status==='AVAILABLE',b=this.button(accepting?'接取委托':'提交委托并领取奖励',()=>{
        if(!this.access()){this.message='请在发布者身边操作；商船每日 08:00–20:00 靠岸。';this.render();return;}
        const result=accepting?g.commissions.accept(d.id,this.owner!):g.commissions.submit(d.id,this.owner!,this.facts());this.message=result.message;this.notify(result.message);this.render();
      });b.disabled=!this.access()||accepting&&!!v.locked;pane.append(b);
      const hint=document.createElement('p');hint.className='commission-hint';hint.textContent=v.locked&&accepting?v.locked:v.status==='ACTIVE'?'尚未齐备也可检查提交；失败不会消耗物品。':'提交前会再次检查物品、金币上限和奖励容量。';pane.append(hint);
    }
    return pane;
  }
  close(){if(!this.open)return;this.element.close();this.game=undefined;this.onClose();}
}
