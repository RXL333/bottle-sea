export const WEATHER_KINDS=['CLEAR','OVERCAST','RAIN','STORM'] as const;
export type WeatherKind=typeof WEATHER_KINDS[number];
export const WEATHER_LABELS:Record<WeatherKind,string>={CLEAR:'晴天',OVERCAST:'阴天',RAIN:'雨天',STORM:'风暴'};
export const WEATHER_PROFILES={
  CLEAR:{cloud:.24,rain:0,wind:.16,storm:0},OVERCAST:{cloud:.85,rain:0,wind:.3,storm:0},
  RAIN:{cloud:.96,rain:.74,wind:.48,storm:0},STORM:{cloud:1,rain:1,wind:1,storm:1},
} satisfies Record<WeatherKind,object>;
export interface WeatherFrame {cloud:number;rain:number;wind:number;storm:number;wetness:number;windPhase:number;snow?:number}
export interface WeatherSnapshot extends WeatherFrame {kind:WeatherKind;scheduledDay?:number}
export function isWeatherKind(value:unknown):value is WeatherKind{return WEATHER_KINDS.some(kind=>kind===value);}
const unit=(value:unknown,fallback:number)=>typeof value==='number'&&Number.isFinite(value)?Math.min(1,Math.max(0,value)):fallback;
export function normalizeWeather(value:unknown,legacyStorm=false,legacyIntensity=0):WeatherSnapshot{
  const raw=value&&typeof value==='object'?value as Partial<WeatherSnapshot>:{};
  const kind=isWeatherKind(raw.kind)?raw.kind:legacyStorm?'STORM':'CLEAR',profile=WEATHER_PROFILES[kind],storm=unit(raw.storm,unit(legacyIntensity,0));
  return {kind,snow:unit(raw.snow,0),...(Number.isSafeInteger(raw.scheduledDay)&&raw.scheduledDay!>=0?{scheduledDay:raw.scheduledDay}:{}),storm,cloud:unit(raw.cloud,legacyStorm?.24+storm*.76:profile.cloud),rain:unit(raw.rain,legacyStorm?storm:profile.rain),wind:unit(raw.wind,legacyStorm?.16+storm*.84:profile.wind),wetness:unit(raw.wetness,legacyStorm?storm:0),windPhase:typeof raw.windPhase==='number'&&Number.isFinite(raw.windPhase)&&raw.windPhase>=0?raw.windPhase:0};
}
