import type { GameplayServices } from '../gameplay/GameplayFoundation';
import { COLLECTION_LABELS } from '../gameplay/collections/CollectionRegistry';
import type { CollectionCategory } from '../gameplay/collections/CollectionRegistry';
import type { CollectionView } from '../gameplay/collections/CollectionSystem';
import { calendarAt,dateLabel } from '../gameplay/calendar/CalendarSystem';
import { DAY_DURATION } from '../core/GameClock';
import { panelHeader,progressMeter } from './UIChrome';
import { itemIcon } from './ItemIcon';
import { icons } from './icons';
const sourceLabels={obtained:'获得',caught:'钓获',crafted:'亲手制作',harvested:'收获',collected:'领取畜产品',observed:'观察动物',arrived:'到达',discovered:'发现地标',legacy:'旧航程补录'};
/** A masked, read-only view. Opening or selecting a page can never unlock it. */
export class CollectionPanel {
  readonly element=document.createElement('dialog');private game?:GameplayServices;private category:CollectionCategory='fish';private selected?:string;
  private revision=-1;private onClose=()=>{};
  constructor(root:HTMLElement){this.element.className='collection-panel ui-panel';this.element.tabIndex=-1;this.element.setAttribute('aria-label','航海手记');root.append(this.element);this.element.addEventListener('cancel',e=>{e.preventDefault();this.close();});this.element.addEventListener('keydown',e=>{e.stopPropagation();if(e.code==='KeyN'&&!e.repeat){e.preventDefault();this.close();}});}
  get open(){return this.element.open;}
  show(game:GameplayServices,close:()=>void){this.game=game;this.onClose=close;this.render();this.element.showModal();this.element.querySelector<HTMLButtonElement>('.ui-close')!.focus();}
  refresh(){if(this.open&&this.game&&this.revision!==this.game.collections.revision)this.render();}
  private button(label:string,action:()=>void){const b=document.createElement('button');b.type='button';b.textContent=label;b.addEventListener('click',action);return b;}
  private picture(view:CollectionView){
    if(view.discovered&&view.iconItemId){const item=this.game!.items.get(view.iconItemId);if(item)return itemIcon(item);}
    const icon=document.createElement('span');icon.className=`collection-symbol${view.discovered?'':' unknown'}`;icon.setAttribute('aria-hidden','true');icon.innerHTML=view.discovered?icons.explore:'?';return icon;
  }
  private render(){
    const g=this.game!,system=g.collections,stats=system.stats();this.revision=system.revision;
    const scroll=this.element.querySelector<HTMLElement>('.collection-grid')?.scrollTop??0;
    this.element.replaceChildren(panelHeader('航海手记','BOTTLE SEA · 把收获与见闻留在纸页上',()=>this.close()));
    const intro=document.createElement('div');intro.className='collection-overview';const text=document.createElement('p');text.textContent=`已记录 ${stats.discovered} / ${stats.total} · 第一次真正获得、制作、观察或到达时自动登记`;intro.append(text,progressMeter(stats.discovered,stats.total,'航海手记总收集进度'));this.element.append(intro);
    const body=document.createElement('div');body.className='collection-body';const nav=document.createElement('nav');nav.className='collection-nav';nav.setAttribute('aria-label','图鉴分类');
    for(const count of system.categories()){const b=this.button(COLLECTION_LABELS[count.category],()=>{this.category=count.category;this.selected=undefined;this.render();});b.className='ui-button secondary';b.setAttribute('aria-pressed',String(this.category===count.category));const number=document.createElement('small');number.textContent=`${count.discovered} / ${count.total}`;b.append(number);nav.append(b);}body.append(nav);
    const list=system.list(this.category);if(!list.some(v=>v.id===this.selected))this.selected=list.find(v=>v.discovered)?.id??list[0]?.id;
    const grid=document.createElement('section');grid.className='collection-grid';grid.setAttribute('aria-label',`${COLLECTION_LABELS[this.category]}条目`);
    list.forEach((view,index)=>{const b=this.button('',()=>{this.selected=view.id;this.render();});b.className='collection-entry ui-card';b.setAttribute('aria-pressed',String(view.id===this.selected));b.setAttribute('aria-label',view.discovered?view.name:`未发现条目 ${index+1} · ${COLLECTION_LABELS[this.category]}`);b.append(this.picture(view));const name=document.createElement('strong');name.textContent=view.name;const status=document.createElement('small');status.textContent=view.discovered?'已发现':'等待相遇';b.append(name,status);grid.append(b);});
    if(!list.length){const empty=document.createElement('p');empty.textContent='新的航程正在准备中。';grid.append(empty);}body.append(grid);
    const view=list.find(v=>v.id===this.selected);if(view)body.append(this.detail(view));this.element.append(body);grid.scrollTop=scroll;
    const footer=document.createElement('p');footer.className='collection-footer';footer.textContent='N / Esc 收起手记 · 记录会随存档保留 · 不必赶时间，按自己的节奏去相遇。';this.element.append(footer);if(this.open)this.element.focus();
  }
  private detail(view:CollectionView){
    const pane=document.createElement('section');pane.className='collection-detail ui-card';pane.setAttribute('aria-label','图鉴详情');pane.append(this.picture(view));const tag=document.createElement('small');tag.className='collection-tag';tag.textContent=COLLECTION_LABELS[view.category];const name=document.createElement('h3');name.textContent=view.name;const description=document.createElement('p');description.textContent=view.description;pane.append(tag,name,description);
    for(const info of view.information){const line=document.createElement('p');line.className='collection-info';line.textContent=info;pane.append(line);}
    const record=document.createElement('div');record.className='collection-record';
    if(view.discovered){const at=view.record.firstGameTime,minute=at===null?0:Math.floor((at%DAY_DURATION)/DAY_DURATION*1440+1e-9)%1440;const heading=document.createElement('strong');heading.textContent='第一次写下这一页';const date=document.createElement('p');date.textContent=at===null?'旧航程记录 · 历史日期未保留':`${dateLabel(calendarAt(at))} · ${String(Math.floor(minute/60)).padStart(2,'0')}:${String(minute%60).padStart(2,'0')}`;const sources=document.createElement('p');sources.textContent=`见闻来源：${view.record.sources.map(s=>sourceLabels[s]).join('、')}`;record.append(heading,date,sources);}else record.textContent='未知的名字、图标与细节暂时藏在下一次航程里。';pane.append(record);return pane;
  }
  close(){if(!this.open)return;this.element.close();this.game=undefined;this.onClose();}
}
