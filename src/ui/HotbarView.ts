import { HOTBAR_SIZE } from '../gameplay/Hotbar';
import type { Hotbar } from '../gameplay/Hotbar';
import { itemIcon } from './ItemIcon';
/** Same reference view in the HUD and inside the modal inventory. */
export class HotbarView {
  readonly element=document.createElement('nav');private stamp='';
  onSelect=()=>{};onDrop:(index:number,event:DragEvent)=>void=()=>{};
  constructor(private hotbar:Hotbar){
    this.element.className='hotbar';this.element.setAttribute('aria-label','物品快捷栏');
    for(let index=0;index<HOTBAR_SIZE;index++){
      const button=document.createElement('button');button.type='button';button.className='hotbar-slot';button.dataset.hotbar=String(index);button.dataset.focusKey=`hotbar-${index}`;
      button.addEventListener('click',()=>{hotbar.select(index);this.update();this.onSelect();});
      button.addEventListener('contextmenu',event=>{event.preventDefault();hotbar.bind(index,null);this.update();this.onSelect();});
      button.addEventListener('dragover',event=>{if(event.dataTransfer?.types.includes('application/x-bottle-item')){event.preventDefault();button.classList.add('drop-target');}});
      button.addEventListener('dragleave',()=>button.classList.remove('drop-target'));
      button.addEventListener('drop',event=>{event.preventDefault();button.classList.remove('drop-target');this.onDrop(index,event);this.update();});
      this.element.append(button);
    }
    this.update();
  }
  update(){
    const stamp=`${this.hotbar.inventory.revision}/${this.hotbar.revision}`;if(stamp===this.stamp)return;this.stamp=stamp;
    this.element.querySelectorAll<HTMLButtonElement>('button').forEach((button,index)=>{
      const item=this.hotbar.itemAt(index),count=this.hotbar.countAt(index),selected=index===this.hotbar.selectedIndex;
      button.replaceChildren();button.classList.toggle('selected',selected);button.classList.toggle('depleted',Boolean(item&&!count));button.setAttribute('aria-pressed',String(selected));
      const key=document.createElement('kbd');key.textContent=String(index+1);button.append(key);
      if(item){button.append(itemIcon(item));const quantity=document.createElement('span');quantity.className='stack-count';quantity.textContent=String(count);button.append(quantity);}
      button.title=item?`${item.name} × ${count} · 右键清除快捷引用`:`快捷栏 ${index+1} · 在背包中绑定物品`;
      button.setAttribute('aria-label',button.title);
    });
  }
}
