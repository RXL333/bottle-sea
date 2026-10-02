import { DESTINATIONS,canTravelTo } from '../travel/DestinationRegistry';
import type { DestinationId,PlayerState } from '../state/PlayerState';
import { panelHeader } from './UIChrome';
export class DestinationPanel {
  readonly element=document.createElement('dialog');
  private onClose=()=>{};
  constructor(root:HTMLElement){this.element.className='destination-panel ui-panel';this.element.setAttribute('aria-label','选择航行目的地');root.append(this.element);this.element.addEventListener('cancel',event=>{event.preventDefault();this.close();});}
  get open(){return this.element.open;}
  show(player:PlayerState,select:(id:DestinationId)=>void,close:()=>void){
    this.onClose=close;this.element.replaceChildren();this.element.append(panelHeader('今天要去哪里？','ISLAND PASSAGE · 航海图',()=>this.close()));
    for(const item of DESTINATIONS){if(item.id===player.currentWorldId)continue;const button=document.createElement('button');button.className='destination';button.disabled=!canTravelTo(item.id,player);const name=document.createElement('strong'),description=document.createElement('span');name.textContent=`${button.disabled?'○':'●'} ${item.name}`;description.textContent=item.description;button.append(name,description);button.addEventListener('click',()=>{this.element.close();select(item.id);});this.element.append(button);}
    const back=document.createElement('button');back.textContent='返回码头';back.className='destination-back';back.addEventListener('click',()=>this.close());this.element.append(back);this.element.showModal();
  }
  close(){if(!this.open)return;this.element.close();this.onClose();}
}
