import { DAY_DURATION } from '../../core/GameClock';
import type { GameClock } from '../../core/GameClock';
import { DAYS_PER_SEASON,DAYS_PER_YEAR,SEASONS,WEEKDAYS,seasonDefinition } from './SeasonRegistry';
import type { SeasonId } from './SeasonRegistry';
import type { WeatherKind } from '../../systems/WeatherState';
export interface CalendarDate {readonly dayIndex:number;readonly totalDay:number;readonly year:number;readonly season:SeasonId;readonly seasonIndex:number;readonly dayOfSeason:number;readonly weekday:number}
/** GameClock is the source of truth; this is a notification cursor, not a second clock. */
export interface CalendarSnapshot {version:1;lastAnnouncedSeasonIndex:number}
export interface SeasonVisual {weights:readonly number[];sunrise:number;sunset:number}
export function calendarAt(gameTime:number):CalendarDate {
  const dayIndex=Math.floor(Math.max(0,Number.isFinite(gameTime)?gameTime:0)/DAY_DURATION),seasonIndex=Math.floor(dayIndex/DAYS_PER_SEASON);
  return {dayIndex,totalDay:dayIndex+1,year:Math.floor(dayIndex/DAYS_PER_YEAR)+1,season:SEASONS[seasonIndex%4].id,seasonIndex,dayOfSeason:dayIndex%DAYS_PER_SEASON+1,weekday:dayIndex%7};
}
export function normalizeCalendar(value:unknown,gameTime:number):CalendarSnapshot {
  const raw=value&&typeof value==='object'?value as Partial<CalendarSnapshot>:{},current=calendarAt(gameTime).seasonIndex;
  return {version:1,lastAnnouncedSeasonIndex:raw.version===1&&Number.isSafeInteger(raw.lastAnnouncedSeasonIndex)&&raw.lastAnnouncedSeasonIndex!>=0&&raw.lastAnnouncedSeasonIndex!<=current?raw.lastAnnouncedSeasonIndex!:current};
}
/** Deterministic daily weather; jumping many days needs no catch-up loop or timer. */
export function seasonalWeather(date:CalendarDate):WeatherKind {
  const n=Math.sin((date.dayIndex+1)*127.1+91.7)*43758.5453,roll=n-Math.floor(n),weights=seasonDefinition(date.season).weatherWeights;
  let remaining=roll*Object.values(weights).reduce((sum,w)=>sum+w,0);
  for(const kind of ['CLEAR','OVERCAST','RAIN','STORM'] as const){remaining-=weights[kind];if(remaining<0)return kind;}
  return 'CLEAR';
}
export function seasonalDayTime(dayTime:number,visual:Pick<SeasonVisual,'sunrise'|'sunset'>){
  const hour=dayTime*24,{sunrise,sunset}=visual;
  if(hour>=sunrise&&hour<sunset)return .25+(hour-sunrise)/(sunset-sunrise)*.5;
  const after=(hour-sunset+24)%24;return (.75+after/(24-sunset+sunrise)*.5)%1;
}
export function dateLabel(date:CalendarDate){return `第 ${date.year} 年 · ${seasonDefinition(date.season).name} ${date.dayOfSeason} 日 · ${WEEKDAYS[date.weekday]}`;}
export class CalendarSystem {
  private state:CalendarSnapshot;private lastDay:number;private weights:number[];
  onSeasonChange:(date:CalendarDate)=>void=()=>{};
  constructor(private clock:GameClock,saved?:unknown,private onChange:()=>void=()=>{}){
    this.state=normalizeCalendar(saved,clock.simulationTime);this.lastDay=this.date.dayIndex;this.weights=SEASONS.map(s=>s.id===this.date.season?1:0);
  }
  get date(){return calendarAt(this.clock.simulationTime);}
  get definition(){return seasonDefinition(this.date.season);}
  get visual():SeasonVisual{return {weights:[...this.weights],sunrise:SEASONS.reduce((s,d,i)=>s+d.sunrise*this.weights[i],0),sunset:SEASONS.reduce((s,d,i)=>s+d.sunset*this.weights[i],0)};}
  get lightDayTime(){return seasonalDayTime(this.clock.normalizedDayTime,this.visual);}
  get nextSeasonInDays(){return DAYS_PER_SEASON-this.date.dayOfSeason+1;}
  upcoming(days=7){return Array.from({length:Math.min(28,Math.max(0,Math.floor(days)))},(_,i)=>calendarAt((this.date.dayIndex+i+1)*DAY_DURATION));}
  synchronize(){
    const date=this.date,seasonChanged=date.seasonIndex!==this.state.lastAnnouncedSeasonIndex,dayChanged=date.dayIndex!==this.lastDay;
    this.lastDay=date.dayIndex;
    if(seasonChanged){this.state.lastAnnouncedSeasonIndex=date.seasonIndex;this.onSeasonChange(date);}
    if(dayChanged||seasonChanged)this.onChange();
  }
  updatePresentation(delta:number){const blend=1-Math.exp(-Math.max(0,delta)/8),id=this.date.season;this.weights=this.weights.map((w,i)=>w+((SEASONS[i].id===id?1:0)-w)*blend);}
  snapshot():CalendarSnapshot{return {...this.state};}
}
