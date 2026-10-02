import type { GameplayServices } from '../gameplay/GameplayFoundation';
import type { Inventory,InventoryResult } from '../gameplay/Inventory';
import { CATEGORY_LABELS,ITEM_CATEGORIES } from '../gameplay/ItemRegistry';
import type { ItemCategory } from '../gameplay/ItemRegistry';
import { itemIcon } from './ItemIcon';
import { HotbarView } from './HotbarView';

type Side='bag'|'chest';
interface DragStack {side:Side;index:number;itemId:string;quantity:number;originalQuantity:number}
export class InventoryPanel {
  readonly element=document.createElement('dialog');
  private game?:GameplayServices;private onClose=()=>{};private storage=false;private side:Side='bag';
  private filter:'all'|ItemCategory='all';private quantity=1;private message='';private drag?:DragStack;
  private discard?:DragStack;private hotbar?:HotbarView;private details?:HTMLElement;private status?:HTMLElement;
  private stamp='';
  private warehouse?:Inventory;private warehouseName='小屋储物箱';
  private partialTransfers=false;
  constructor(root:HTMLElement){
    this.element.className='home-panel inventory-panel ui-panel';root.append(this.element);
    this.element.addEventListener('cancel',event=>{event.preventDefault();this.close();});
    this.element.addEventListener('dragend',()=>{this.drag=undefined;this.element.querySelectorAll('.drop-target').forEach(cell=>cell.classList.remove('drop-target'));});
    window.addEventListener('keydown',event=>{
      if(!this.open||event.defaultPrevented||event.repeat)return;
      const target=event.target as HTMLElement|null;if(target?.isContentEditable||['INPUT','SELECT','TEXTAREA'].includes(target?.tagName??''))return;
      if(event.code==='KeyB'){event.preventDefault();this.close();}
      const index=Number(event.code.replace(/^Digit/,''))-1;
      if(/^Digit[1-8]$/.test(event.code)){event.preventDefault();this.game!.hotbar.select(index);this.render();}
    });
  }
  get open(){return this.element.open;}
  show(game:GameplayServices,storage:boolean,close:()=>void,warehouse?:Inventory,warehouseName='小屋储物箱',partialTransfers=false){
    this.warehouse=warehouse;this.warehouseName=warehouseName;this.partialTransfers=partialTransfers;
    this.game=game;this.storage=storage;this.onClose=close;this.side='bag';this.filter='all';this.quantity=1;this.message='';this.discard=undefined;this.drag=undefined;
    this.element.classList.toggle('with-storage',storage);this.element.setAttribute('aria-label',storage?`背包与${this.warehouseName}`:'背包');
    if(game.inventory.selectedSlot===null)game.inventory.selectSlot(0);
    this.render();this.element.showModal();
  }
  close(){if(!this.open)return;this.drag=undefined;this.element.close();this.onClose();}
  update(){if(this.open&&this.stamp!==this.revision())this.render();}
  private revision(){const g=this.game!;return `${g.inventory.revision}/${this.inventory('chest').revision}/${g.hotbar.revision}/${g.progress.energy}`;}
  private inventory(side:Side):Inventory{return side==='bag'?this.game!.inventory:this.warehouse??this.game!.home.chest;}
  private node<K extends keyof HTMLElementTagNameMap>(tag:K,className='',text?:string){const node=document.createElement(tag);node.className=className;if(text!==undefined)node.textContent=text;return node;}
  private button(label:string,action:()=>void,className=''){const b=this.node('button',className,label);b.type='button';b.addEventListener('click',action);return b;}
  private feedback(result:InventoryResult,success:string){
    this.message=result.ok?success:result.reason==='full'?'空间或堆叠已满，请腾出空位再试。':result.reason==='occupied-slot'?'该槽位已有其他物品，请选择空槽。':result.reason==='invalid-quantity'?'请输入正确的数量。':'物品或数量已变化，请重新选择。';
    this.discard=undefined;this.render();
  }
  private transfer(source:Inventory,target:Inventory,slot?:number,quantity?:number){
    if(!this.partialTransfers){this.feedback(slot===undefined?source.transferAllTo(target):source.transferSlotTo(target,slot,quantity),'物品已转移。');return;}
    const result=source.transferAvailableTo(target,{slot,quantity});
    this.feedback(result,result.ok?`已转移 ${result.quantity} 份${result.remaining.length?' · 剩余物品保留在原处。':'。'}`:'');
  }
  private render(){
    const g=this.game!,focusKey=(document.activeElement as HTMLElement|null)?.dataset.focusKey;
    this.element.replaceChildren();this.stamp=this.revision();
    const header=this.node('header','inventory-header ui-panel-header'),heading=this.node('div');
    heading.append(this.node('small','inventory-eyebrow',this.storage?'STORAGE':'THE MARINER’S PACK'),this.node('h2','',this.storage?`背包与${this.warehouseName}`:'背包'));
    const close=this.button('关闭 ×',()=>this.close(),'inventory-close ui-close');close.dataset.focusKey='close';header.append(heading,close);
    const tips=this.node('p','inventory-help',this.storage?'拖拽存取或换位 · Shift 点击快速转移整堆 · Esc / B 关闭':'拖拽换位或合并 · Shift 拖拽拆出半堆 · Esc / B 关闭');
    const tabs=this.node('nav','inventory-filters ui-tabs');tabs.setAttribute('aria-label','物品分类');
    for(const category of ['all',...ITEM_CATEGORIES] as const){const tab=this.button(category==='all'?'全部':CATEGORY_LABELS[category],()=>{
      this.filter=category;this.discard=undefined;this.quantity=1;
      const inventory=this.inventory(this.side),selected=inventory.selectedSlot,stack=selected===null?null:inventory.getSlot(selected);
      if(category!=='all'&&stack&&g.items.get(stack.itemId)?.category!==category){const next=inventory.snapshot().slots.findIndex(s=>s&&g.items.get(s.itemId)?.category===category);inventory.selectSlot(next<0?null:next);}
      this.render();
    });tab.classList.toggle('selected',this.filter===category);tab.setAttribute('aria-pressed',String(this.filter===category));tab.dataset.focusKey=`filter-${category}`;tabs.append(tab);}
    const layout=this.node('div','inventory-layout'),containers=this.node('div','inventory-containers');
    containers.append(this.grid('bag'));if(this.storage)containers.append(this.grid('chest'));
    const detailPane=this.node('aside','inventory-inspector');this.details=this.node('div','inventory-details');detailPane.append(this.details,this.actions());layout.append(containers,detailPane);
    this.status=this.node('p','inventory-status',this.message);this.status.setAttribute('role','status');this.status.setAttribute('aria-live','polite');
    this.hotbar=new HotbarView(g.hotbar);this.hotbar.onDrop=index=>this.bindDrag(index);this.hotbar.onSelect=()=>this.render();
    const footer=this.node('footer','inventory-footer');footer.append(this.node('p','',`快捷栏 · 1～8 选择 · 探索时 Q 使用食物 · 右键清除引用`),this.hotbar.element);
    this.element.append(header,tips,tabs,layout,this.status,footer);this.showDetails(this.side,this.inventory(this.side).selectedSlot??-1);
    if(focusKey)Array.from(this.element.querySelectorAll<HTMLElement>('[data-focus-key]')).find(node=>node.dataset.focusKey===focusKey)?.focus();
  }
  private grid(side:Side){
    const inventory=this.inventory(side),section=this.node('section','inventory-container'),header=this.node('header','inventory-container-header');
    const limit=Number.isFinite(inventory.quantityCapacity)?` · 装载 ${inventory.usedQuantity} / ${inventory.quantityCapacity} 份`:'';
    header.append(this.node('h3','',side==='bag'?'随身背包':this.warehouseName),this.node('span','inventory-capacity',`${inventory.occupiedSlots} / ${inventory.capacity} 格 · 空位 ${inventory.emptySlots}${limit}`));section.append(header);
    if(this.storage&&side==='bag'){const all=this.button('全部存入',()=>this.transfer(inventory,this.inventory('chest')),'inventory-store-all');all.disabled=!inventory.occupiedSlots;all.dataset.focusKey='store-all';header.append(all);}
    const grid=this.node('div','inventory-grid');grid.setAttribute('role','grid');grid.setAttribute('aria-label',side==='bag'?'背包槽位':`${this.warehouseName}槽位`);
    inventory.snapshot().slots.forEach((stack,index)=>{
      const item=stack?this.game!.items.get(stack.itemId):undefined;if(item&&this.filter!=='all'&&item.category!==this.filter)return;
      const cell=this.button('',()=>{},'inventory-slot ui-item-slot');cell.dataset.focusKey=`${side}-${index}`;cell.setAttribute('role','gridcell');cell.setAttribute('aria-selected',String(this.side===side&&inventory.selectedSlot===index));cell.classList.toggle('selected',this.side===side&&inventory.selectedSlot===index);cell.classList.toggle('empty',!stack);
      const number=this.node('small','slot-number',String(index+1));cell.append(number);
      if(item&&stack){cell.append(itemIcon(item),this.node('span','stack-count',String(stack.quantity)),this.node('span','slot-name',item.name));cell.title=`${item.name} × ${stack.quantity}\n${CATEGORY_LABELS[item.category]} · ${item.description}`;cell.draggable=true;}
      else {cell.append(this.node('span','empty-mark','·'));cell.title=`空槽 ${index+1}`;}
      cell.setAttribute('aria-label',cell.title);
      cell.addEventListener('click',event=>{
        this.side=side;inventory.selectSlot(index);this.quantity=1;this.discard=undefined;
        if(event.shiftKey&&this.storage&&stack)this.transfer(inventory,this.inventory(side==='bag'?'chest':'bag'),index);else this.render();
      });
      cell.addEventListener('mouseenter',()=>this.showDetails(side,index));cell.addEventListener('mouseleave',()=>this.showDetails(this.side,this.inventory(this.side).selectedSlot??-1));
      cell.addEventListener('focus',()=>this.showDetails(side,index));
      cell.addEventListener('keydown',event=>{
        const step=({ArrowLeft:-1,ArrowRight:1,ArrowUp:-6,ArrowDown:6} as Record<string,number>)[event.code];if(!step)return;event.preventDefault();
        const next=index+step;this.element.querySelector<HTMLElement>(`[data-focus-key="${side}-${next}"]`)?.focus();
      });
      cell.addEventListener('dragstart',event=>{
        const current=inventory.getSlot(index);if(!current||!event.dataTransfer){event.preventDefault();return;}
        this.drag={side,index,itemId:current.itemId,originalQuantity:current.quantity,quantity:event.shiftKey&&current.quantity>1?Math.floor(current.quantity/2):current.quantity};
        event.dataTransfer.setData('application/x-bottle-item',`${side}:${index}`);event.dataTransfer.effectAllowed='move';
      });
      cell.addEventListener('dragover',event=>{if(this.drag){event.preventDefault();cell.classList.add('drop-target');if(event.dataTransfer)event.dataTransfer.dropEffect='move';}});
      cell.addEventListener('dragleave',()=>cell.classList.remove('drop-target'));
      cell.addEventListener('drop',event=>{event.preventDefault();this.drop(side,index);});grid.append(cell);
    });
    if(!grid.children.length)grid.append(this.node('p','inventory-empty',`没有${this.filter==='all'?'物品':CATEGORY_LABELS[this.filter]}。`));
    section.append(grid);return section;
  }
  private showDetails(side:Side,index:number){
    if(!this.details)return;this.details.replaceChildren();const inventory=this.inventory(side),stack=inventory.getSlot(index),item=stack?this.game!.items.get(stack.itemId):undefined;
    if(!item||!stack){this.details.append(this.node('h3','','空槽位'),this.node('p','','选择一个物品，查看详情或进行操作。'));return;}
    this.details.append(itemIcon(item),this.node('small','item-category',CATEGORY_LABELS[item.category]),this.node('h3','',item.name),this.node('p','item-description',item.description),this.node('p','item-quantity',`数量：${stack.quantity} / ${item.maxStack}`));
    if(item.energyRestore!==undefined)this.details.append(this.node('p','item-effect',`恢复体力：${item.energyRestore}`));
    if(item.fishing)this.details.append(this.node('p','item-effect',`捕获：${item.fishing.rarity}`));
    this.details.append(this.node('small','item-location',`${side==='bag'?'背包':this.warehouseName} · 槽位 ${index+1}`));
  }
  private actions(){
    const g=this.game!,inventory=this.inventory(this.side),index=inventory.selectedSlot,section=this.node('div','inventory-actions');
    if(index===null)return section;const stack=inventory.getSlot(index);if(!stack)return section;const item=g.items.get(stack.itemId)!;
    if(this.storage){const verb=this.side==='bag'?'存入':'取出',target=this.inventory(this.side==='bag'?'chest':'bag');
      section.append(this.button(`${verb} 1 个`,()=>this.transfer(inventory,target,index,1)),this.button(`${verb}整堆`,()=>this.transfer(inventory,target,index)));
    }
    if(this.side==='bag'){
      const select=this.node('select','hotbar-binding');select.setAttribute('aria-label','绑定到快捷栏');for(let i=0;i<8;i++){const option=this.node('option','',`快捷栏 ${i+1}`);option.value=String(i);select.append(option);}select.value=String(g.hotbar.selectedIndex);
      section.append(select,this.button('绑定快捷栏',()=>this.feedback(g.hotbar.bind(Number(select.value),item.id),`已将 ${item.name}绑定到快捷栏 ${Number(select.value)+1}`)));
      if(item.category==='seed'&&g.crops.registry.getBySeedItemId(item.id))section.append(this.button('拿起种子',()=>this.feedback(g.hotbar.bind(g.hotbar.selectedIndex,item.id),`已拿起 ${item.name} · 关闭背包后，在已耕农田按 E 播种。`)));
      if(item.category==='food'&&item.energyRestore!==undefined){const eat=this.button('吃一份',()=>{const result=g.cooking.eat(item.id,index);this.message=result.message;this.render();});eat.disabled=g.progress.energy>=g.progress.maxEnergy;section.append(eat);}
    }
    const label=this.node('label','inventory-quantity-label','操作数量'),quantity=this.node('input');quantity.type='number';quantity.min='1';quantity.max=String(stack.quantity);quantity.step='1';quantity.value=String(Math.min(this.quantity,stack.quantity));quantity.setAttribute('aria-label','拆分或丢弃数量');quantity.dataset.focusKey='quantity';quantity.addEventListener('input',()=>{this.quantity=quantity.valueAsNumber;});label.append(quantity);section.append(label);
    const split=this.button('拆分到空槽',()=>{const empty=inventory.firstEmptySlot();this.feedback(empty<0?{ok:false,reason:'full'}:inventory.splitStack(index,empty,quantity.valueAsNumber),'已拆分堆叠。');});split.disabled=stack.quantity<2||!inventory.emptySlots;section.append(split);
    section.append(this.button('丢弃所选数量',()=>{
      const amount=quantity.valueAsNumber;if(!Number.isSafeInteger(amount)||amount<1||amount>stack.quantity){this.feedback({ok:false,reason:'invalid-quantity'},'');return;}
      this.discard={side:this.side,index,itemId:stack.itemId,quantity:amount,originalQuantity:stack.quantity};this.render();
    },'inventory-discard'));
    if(this.discard){const request=this.discard,confirm=this.node('div','inventory-confirm');confirm.append(this.node('p','',`丢弃 ${item.name} × ${request.quantity}？`),this.button('确认丢弃',()=>{
      const current=inventory.getSlot(request.index);const result=current?.itemId===request.itemId&&current.quantity===request.originalQuantity?inventory.removeFromSlot(request.index,request.quantity):{ok:false as const,reason:'insufficient-items' as const};this.feedback(result,`已丢弃 ${item.name} × ${request.quantity}`);
    }),this.button('保留',()=>{this.discard=undefined;this.render();}));section.append(confirm);}
    return section;
  }
  private validDrag(){const drag=this.drag;if(!drag)return;const stack=this.inventory(drag.side).getSlot(drag.index);return stack?.itemId===drag.itemId&&stack.quantity===drag.originalQuantity?drag:undefined;}
  private drop(side:Side,index:number){
    const drag=this.validDrag();this.drag=undefined;if(!drag){this.message='物品已变化，请重新拖拽。';this.render();return;}
    const result=this.inventory(drag.side).moveSlotTo(this.inventory(side),drag.index,index,drag.quantity);
    if(result.ok){this.side=side;this.inventory(side).selectSlot(index);}this.feedback(result,'已移动物品。');
  }
  private bindDrag(index:number){
    const drag=this.validDrag();this.drag=undefined;if(!drag)return;
    if(drag.side==='chest'){this.message='先把物品取到背包，再绑定快捷栏。';this.render();return;}
    this.feedback(this.game!.hotbar.bind(index,drag.itemId),`已绑定快捷栏 ${index+1}，物品仍在背包中。`);
  }
}
