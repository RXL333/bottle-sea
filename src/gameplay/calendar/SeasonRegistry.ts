import { WEATHER_LABELS } from '../../systems/WeatherState';
import type { WeatherKind } from '../../systems/WeatherState';
export const SEASON_IDS=['spring','summer','autumn','winter'] as const;
export type SeasonId=typeof SEASON_IDS[number];
export const DAYS_PER_SEASON=28,DAYS_PER_YEAR=DAYS_PER_SEASON*4;
export const WEEKDAYS=['星期一','星期二','星期三','星期四','星期五','星期六','星期日'] as const;
export interface SeasonDefinition {
  readonly id:SeasonId;readonly name:string;readonly description:string;
  readonly weatherWeights:Readonly<Record<WeatherKind,number>>;
  readonly foliage:string;readonly sky:string;readonly horizon:string;readonly light:string;
  readonly sunrise:number;readonly sunset:number;readonly rainStrength:number;readonly windStrength:number;readonly morningMist:number;
}
const definitions:readonly SeasonDefinition[]=[
  {id:'spring',rainStrength:.7,windStrength:.9,morningMist:.8,name:'春',description:'嫩绿与晨雾，春雨常来。',weatherWeights:{CLEAR:35,OVERCAST:20,RAIN:40,STORM:5},foliage:'#8eae5b',sky:'#79b4dc',horizon:'#d0e6df',light:'#ffe4b5',sunrise:6,sunset:18},
  {id:'summer',rainStrength:1,windStrength:.85,morningMist:.12,name:'夏',description:'海风与浓绿，晴天更多、白昼更长。',weatherWeights:{CLEAR:65,OVERCAST:12,RAIN:15,STORM:8},foliage:'#508e46',sky:'#489ade',horizon:'#b8e4ed',light:'#ffe2a1',sunrise:5,sunset:19},
  {id:'autumn',rainStrength:.8,windStrength:1.35,morningMist:.35,name:'秋',description:'金色田野，凉爽的蓝天与柔和云层。',weatherWeights:{CLEAR:45,OVERCAST:35,RAIN:17,STORM:3},foliage:'#c49a50',sky:'#82a7cc',horizon:'#e8d9be',light:'#ffd59f',sunrise:6.5,sunset:17.5},
  {id:'winter',rainStrength:.65,windStrength:1.1,morningMist:.55,name:'冬',description:'霜色草木与冷蓝海天，短日里灯火更暖，雨日化作轻雪。',weatherWeights:{CLEAR:25,OVERCAST:48,RAIN:24,STORM:3},foliage:'#c5d5ca',sky:'#91b3cd',horizon:'#dbe4e4',light:'#d5e4f1',sunrise:7,sunset:17},
];
export const SEASONS:readonly Readonly<SeasonDefinition>[]=Object.freeze(definitions.map(d=>Object.freeze({...d,weatherWeights:Object.freeze({...d.weatherWeights})})));
export function seasonDefinition(id:SeasonId){return SEASONS[SEASON_IDS.indexOf(id)];}
export function seasonNames(ids:readonly SeasonId[]){return ids.map(id=>seasonDefinition(id).name).join(' / ');}

export function seasonWeatherLabel(kind:WeatherKind,season:SeasonId){return season==='winter'&&kind==='RAIN'?'轻雪':season==='winter'&&kind==='STORM'?'风雪':WEATHER_LABELS[kind];}
