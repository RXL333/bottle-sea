import type { GameplayServices } from '../gameplay/GameplayFoundation';
import { CATEGORY_LABELS } from '../gameplay/ItemRegistry';
import { SELL_PRICES,TRADE_OFFERS,tradeOffer } from '../gameplay/economy/TradeCatalog';
import { TRADE_FAILURES } from '../gameplay/economy/EconomySystem';
import type { TradeAccess } from '../gameplay/economy/EconomySystem';
import { itemIcon } from './ItemIcon';
export class TradePanel {
  readonly element=document.createElement('dialog');readonly wallet=document.createElement('p');
  private game?:GameplayServices;private access:()=>TradeAccess=()=>({farm:false});private onClose=()=>{};
  private tab:'buy'|'sell'|'upgrade'='buy';private selected='buy.seed.wheat';private quantity=1;private message='';private stamp='';
  constructor(root:HTMLElement){this.element.className='trade-panel ui-panel';this.element.setAttribute('aria-label','商船交易');root.append(this.element);this.wallet.className='wallet-hud';this.wallet.setAttribute('aria-label','金币余额');root.append(this.wallet);this.element.addEventListener('cancel',e=>{e.preventDefault();this.close();});}
  get open(){return this.element.open;}
  show(game:GameplayServices,access:()=>TradeAccess,close:()=>void){this.game=game;this.access=access;this.onClose=close;this.message='';this.tab='buy';this.selected='buy.seed.wheat';this.quantity=1;this.render();this.element.showModal();}
  close(){if(!this.open)return;this.element.close();this.onClose();}
  update(game:GameplayServices){this.wallet.textContent=`◈ ${game.economy.coins} 金币`;if(!this.open)return;const stamp=`${game.economy.revision}:${game.inventory.revision}:${this.access().available?.()??true}:${game.calendar.date.season}`;if(stamp!==this.stamp)this.render();}
  private button(text:string,action:()=>void){const b=document.createElement('button');b.type='button';b.textContent=text;b.addEventListener('click',action);return b;}
  private render(){
    const game=this.game!;this.stamp=`${game.economy.revision}:${game.inventory.revision}:${this.access().available?.()??true}:${game.calendar.date.season}`;this.element.replaceChildren();
    const header=document.createElement('header'),caption=document.createElement('small'),title=document.createElement('h2'),balance=document.createElement('strong');header.className='ui-panel-header';caption.textContent='THE HARBOUR EXCHANGE';title.textContent='商船贸易';balance.textContent=`余额 ${game.economy.coins} 金币`;const close=this.button('关闭交易 ×',()=>this.close());close.className='ui-close';header.append(caption,title,balance,close);
    const note=document.createElement('p');note.className='trade-note';note.textContent=`${this.access().label??'农场补给商船'} · 固定价格 · 交易使用随身背包 · 背包 ${game.inventory.occupiedSlots}/${game.inventory.capacity} 格 · 谷仓 ${game.barn.capacity} 格 · 粮仓 ${game.economy.grainCapacity} 份`;
    const tabs=document.createElement('nav');tabs.className='ui-tabs';for(const [id,label] of [['buy','购买'],['sell','出售'],['upgrade','容量升级']] as const){const b=this.button(label,()=>{this.tab=id;this.selected=id==='sell'?Object.keys(SELL_PRICES).find(id=>game.inventory.count(id)>0)??Object.keys(SELL_PRICES)[0]:id==='upgrade'?'upgrade.barn.1':'buy.seed.wheat';this.quantity=1;this.message='';this.render();});b.setAttribute('aria-pressed',String(this.tab===id));tabs.append(b);}
    const body=document.createElement('div');body.className='trade-body';const list=document.createElement('div');list.className='trade-list';list.setAttribute('aria-label','商品列表');
    const ids=this.tab==='sell'?Object.keys(SELL_PRICES):TRADE_OFFERS.filter(p=>this.tab==='upgrade'?p.kind==='upgrade':p.kind!=='upgrade').map(p=>p.id);let selectedRow:HTMLButtonElement|undefined;
    for(const id of ids){const offer=tradeOffer(id),item=game.items.get(this.tab==='sell'?id:offer?.kind==='item'?offer.itemId:'');
      const row=this.button('',()=>{this.selected=id;this.quantity=1;this.message='';this.render();});row.className='trade-product';row.setAttribute('aria-pressed',String(this.selected===id));row.setAttribute('aria-label',item?.name??(offer&&offer.kind!=='item'?offer.name:id));
      if(id===this.selected)selectedRow=row;
      const text=document.createElement('span'),name=document.createElement('b'),price=document.createElement('small');name.textContent=item?.name??(offer&&offer.kind!=='item'?offer.name:id);price.textContent=`${this.tab==='sell'?SELL_PRICES[id]:offer?.price} 金币 / ${this.tab==='upgrade'?'级':offer?.kind==='machine'?'台':'份'}${this.tab==='sell'?` · 持有 ${game.inventory.count(id)}`:''}`;text.append(name,price);
      if(item)row.append(itemIcon(item));else{const icon=document.createElement('span');icon.className='trade-symbol';icon.textContent=offer?.kind==='machine'?'▰':'▥';row.append(icon);}row.append(text);if(this.tab==='buy'&&game.economy.seasonReason(id))price.textContent+=' · 当季不供应';list.append(row);
    }
    const detail=document.createElement('section');detail.className='trade-detail';detail.setAttribute('aria-label','交易明细');const offer=tradeOffer(this.selected),item=game.items.get(this.tab==='sell'?this.selected:offer?.kind==='item'?offer.itemId:''),mode=this.tab==='sell'?'sell':'buy';
    const name=document.createElement('h3');name.textContent=item?.name??(offer&&offer.kind!=='item'?offer.name:'商品');const description=document.createElement('p');description.textContent=item?`${CATEGORY_LABELS[item.category]} · ${item.description}`:offer&&offer.kind!=='item'?offer.description:'';
    const unit=document.createElement('p');unit.textContent=`单价 ${mode==='sell'?SELL_PRICES[this.selected]:offer?.price} 金币`;
    const label=document.createElement('label');label.textContent='交易数量';const input=document.createElement('input');input.type='number';input.min='1';input.max='999';input.step='1';input.value=String(this.quantity);input.setAttribute('aria-label','交易数量');input.disabled=mode==='buy'&&offer?.kind!=='item';label.append(input);
    const quote=document.createElement('div');quote.className='trade-quote';const total=document.createElement('strong'),after=document.createElement('p'),reason=document.createElement('p');reason.className='trade-reason';quote.append(total,after,reason);
    const request=game.economy.nextRequest,submit=this.button(mode==='sell'?'确认出售':'确认购买',()=>{submit.disabled=true;const result=game.economy.trade(mode,this.selected,this.quantity,request,this.access());this.message=result.ok?`交易完成 · ${mode==='sell'?'获得':'支付'} ${result.total} 金币 · 数量 ${result.quantity}`:TRADE_FAILURES[result.reason];this.render();});submit.className='trade-submit';
    const updateQuote=()=>{const price=mode==='sell'?SELL_PRICES[this.selected]:offer?.price??0,valid=Number.isSafeInteger(this.quantity)&&this.quantity>0&&this.quantity<=999,amount=valid?price*this.quantity:null;const checked=game.economy.check(mode,this.selected,this.quantity,this.access(),request);total.textContent=`总价 ${amount??'—'} 金币`;after.textContent=`当前余额 ${game.economy.coins} → 交易后 ${checked.ok?game.economy.coins+(mode==='sell'?checked.total:-checked.total):game.economy.coins} 金币`;reason.textContent=checked.ok?(mode==='sell'?`背包持有 ${game.inventory.count(this.selected)} 份，出售后 ${game.inventory.count(this.selected)-this.quantity} 份`:'预检通过，可以交易。'):(checked.reason==='out-of-season'?game.economy.seasonReason(this.selected)!:TRADE_FAILURES[checked.reason]);submit.disabled=!checked.ok;};
    input.addEventListener('input',()=>{this.quantity=input.value===''?NaN:Number(input.value);updateQuote();});updateQuote();
    const status=document.createElement('p');status.className='trade-status';status.setAttribute('role','status');status.textContent=this.message;
    detail.append(name,description,unit,label,quote,submit,status);body.append(list,detail);this.element.append(header,note,tabs,body);this.element.scrollTop=0;if(selectedRow)list.scrollTop=Math.max(0,selectedRow.offsetTop-(list.clientHeight-selectedRow.clientHeight)/2);
  }
}
