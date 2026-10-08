import type { GameplayServices } from '../gameplay/GameplayFoundation';
import type { FarmCellRef } from '../gameplay/farm/FarmDefinition';
import { LAND_APPEARANCE } from '../worlds/farm/FarmPresentation';
import { BEHAVIOR_NAMES,LIVESTOCK_PENS,LIVESTOCK_SPECIES,PEN_FEED_CAPACITY } from '../gameplay/livestock/LivestockDefinition';

/** Reads current land and registry stages; never guesses success from input keys. */
export class FarmHUD {
  readonly element=document.createElement('section');private plot=document.createElement('p');private stamp='';private title=document.createElement('strong');private legend=document.createElement('div');
  constructor(){
    this.element.className='farm-feedback';this.element.hidden=true;this.element.setAttribute('aria-label','农田状态');
    const title=this.title,legend=this.legend;title.textContent='农田手记';legend.className='farm-land-legend';
    for(const state of Object.values(LAND_APPEARANCE)){const item=document.createElement('span'),color=document.createElement('i');color.style.background=state.color;item.append(color,document.createTextNode(state.name));legend.append(item);}
    this.plot.className='farm-plot-info';this.plot.setAttribute('role','status');this.element.append(title,legend,this.plot);
  }
  update(game:GameplayServices,ref:FarmCellRef|null|undefined,visible:boolean,penId?:string){
    this.element.hidden=!visible||(!ref&&!penId);if(this.element.hidden)return;const cell=ref?game.farm.getCell(ref):null,crop=cell?.crop?game.crops.registry.get(cell.crop.cropId):undefined;
    const pen=LIVESTOCK_PENS.find(p=>p.id===penId);this.legend.hidden=true;this.title.textContent=pen?`牧场 · ${pen.name}`:'农田';
    const animals=pen?game.livestock.getAnimals().filter(a=>a.penId===pen.id):[];
    const description=pen?`饲料储备 ${game.livestock.getPen(pen.id)!.feed} / ${PEN_FEED_CAPACITY}\n待领${game.items.get(LIVESTOCK_SPECIES[pen.id].productItemId)?.name} ${animals.reduce((n,a)=>n+a.pending,0)} 份 · 喂养中 ${animals.filter(a=>a.nextProductAtGameTime!==null).length} 只\n${animals.map((a,i)=>`${LIVESTOCK_SPECIES[a.kind].name}${i+1} ${BEHAVIOR_NAMES[a.behavior]}`).join(' · ')}\n饲槽 E 补粮 · 动物 E 领取`:
      cell?`${game.farm.definitions.find(f=>f.id===cell.fieldId)?.name} · ${cell.column+1}, ${cell.row+1}\n${LAND_APPEARANCE[cell.landState].name}${crop?` · ${crop.name} · ${cell.growth?.stage.name}`:''}`:'步入主田查看地块 · E 手工作业';
    if(this.stamp!==description){this.stamp=description;this.plot.textContent=description;}
  }
}
