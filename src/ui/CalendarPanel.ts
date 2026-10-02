import type { GameplayServices } from '../gameplay/GameplayFoundation';
import { calendarAt,dateLabel,seasonalWeather } from '../gameplay/calendar/CalendarSystem';
import { DAYS_PER_SEASON,SEASONS,WEEKDAYS,seasonNames,seasonWeatherLabel } from '../gameplay/calendar/SeasonRegistry';
import { DAY_DURATION } from '../core/GameClock';
import { fishSeasonWeight } from '../gameplay/FishingCatalog';
import { panelHeader } from './UIChrome';
/** Read-only calendar. No calendar, agriculture or market state lives in this view. */
export class CalendarPanel {
  readonly element=document.createElement('dialog');private onClose=()=>{};
  constructor(root:HTMLElement){
    this.element.className='calendar-panel ui-panel';this.element.setAttribute('aria-label','海岛日历');root.append(this.element);
    this.element.addEventListener('cancel',e=>{e.preventDefault();this.close();});
    this.element.addEventListener('keydown',e=>{if(e.code==='KeyL'&&!e.repeat){e.preventDefault();e.stopPropagation();this.close();}});
  }
  get open(){return this.element.open;}
  private text(tag:string,className:string,text:string){const node=document.createElement(tag);node.className=className;node.textContent=text;return node;}
  show(game:GameplayServices,onClose:()=>void){
    this.onClose=onClose;this.element.replaceChildren();const calendar=game.calendar,date=calendar.date,season=calendar.definition;
    this.element.append(panelHeader('海岛日历','ISLAND ALMANAC · 四时与生活',()=>this.close()),this.text('p','calendar-date',`${dateLabel(date)} · 累计第 ${date.totalDay} 天`));
    const seasons=document.createElement('nav');seasons.className='calendar-seasons';seasons.setAttribute('aria-label','一年四季');
    for(const s of SEASONS){const label=this.text('span',`ui-chip${s.id===date.season?' current':''}`,`${s.name} · 28 天`);if(s.id===date.season)label.setAttribute('aria-current','date');seasons.append(label);}
    this.element.append(seasons,this.text('p','calendar-summary',`${season.description} 每季 ${DAYS_PER_SEASON} 天，每年 112 天；距下季 ${calendar.nextSeasonInDays} 天。`));
    const body=document.createElement('div');body.className='calendar-body';const month=document.createElement('section');month.className='ui-card calendar-month';month.setAttribute('aria-label',`${season.name}季日期`);
    month.append(this.text('h3','',`第 ${date.year} 年 · ${season.name}季`));const grid=document.createElement('div');grid.className='calendar-grid';grid.setAttribute('role','grid');grid.setAttribute('aria-label',`${season.name}季月历`);
    const start=date.seasonIndex*DAYS_PER_SEASON;const days=Array.from({length:DAYS_PER_SEASON},(_,i)=>calendarAt((start+i)*DAY_DURATION));
    const weekdays=document.createElement('div');weekdays.className='calendar-row';weekdays.setAttribute('role','row');for(const label of WEEKDAYS)weekdays.append(this.text('span','calendar-weekday',label.replace('星期','周')));grid.append(weekdays);
    for(let row=0;row<4;row++){const week=document.createElement('div');week.className='calendar-row';week.setAttribute('role','row');for(const day of days.slice(row*7,row*7+7)){const cell=this.text('span',`calendar-cell${day.dayIndex===date.dayIndex?' today':''}${day.dayIndex<date.dayIndex?' past':''}`,String(day.dayOfSeason));cell.setAttribute('role','gridcell');cell.setAttribute('aria-label',dateLabel(day));if(day.dayIndex===date.dayIndex)cell.setAttribute('aria-current','date');week.append(cell);}grid.append(week);}
    month.append(grid,this.text('p','calendar-note',`今日白昼约 ${String(Math.floor(season.sunrise)).padStart(2,'0')}:${season.sunrise%1?'30':'00'}–${String(Math.floor(season.sunset)).padStart(2,'0')}:${season.sunset%1?'30':'00'}（光照渐变）。`));
    const recent=document.createElement('section');recent.className='ui-card';recent.append(this.text('h3','','近期七天'));
    for(const d of calendar.upcoming())recent.append(this.text('p','calendar-upcoming',`${dateLabel(d)} · ${seasonWeatherLabel(seasonalWeather(d),d.season)}`));
    recent.append(this.text('small','','每日天气参考；手动切换天气会保留到次日。'));
    body.append(month,recent);this.element.append(body);
    const life=document.createElement('div');life.className='calendar-body';const crops=document.createElement('section');crops.className='ui-card';crops.append(this.text('h3','','田间节奏'));
    for(const crop of game.crops.registry.list())crops.append(this.text('p','calendar-crop',`${crop.name} · ${crop.allowedSeasons?seasonNames(crop.allowedSeasons):'全年'} · ${game.crops.plantingReason(crop.id)?'本季休耕':'本季可播种'} · 生长 ${crop.growthGameMinutes/1440} 天`));
    crops.append(this.text('small','','既有作物跨季继续生长。商船供应适种种子，已有种子可保留；饲料和出售不受季节限制。'));
    const fish=document.createElement('section');fish.className='ui-card';fish.append(this.text('h3','','当季鱼讯'));const total=game.fishing.seasonalPool.reduce((n,f)=>n+fishSeasonWeight(f,date.season),0);
    for(const f of game.items.fish()){const weight=fishSeasonWeight(f,date.season);fish.append(this.text('p','',`${f.name} · ${weight>0?`约 ${Math.round(weight/total*100)}%`:'本季暂不出现'}`));}
    fish.append(this.text('small','','鱼讯是空背包下的相对权重；有容量限制时使用可接收鱼种。已挂钩和暂存的鱼不会因换季消失。'));
    life.append(crops,fish);this.element.append(life);this.element.showModal();this.element.querySelector<HTMLButtonElement>('.ui-close')!.focus();
  }
  close(){if(!this.open)return;this.element.close();this.onClose();}
}
