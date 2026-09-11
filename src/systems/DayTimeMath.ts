export function daylightAt(normalizedDayTime:number) {
  const sun=Math.sin((normalizedDayTime-.25)*Math.PI*2);
  const t=Math.max(0,Math.min(1,(sun+.23)/.34));
  return t*t*(3-2*t);
}
export type DayPhase='DAWN'|'DAY'|'SUNSET'|'NIGHT';
export function dayPhase(t:number):DayPhase{const hour=((t%1)+1)%1*24;return hour>=5&&hour<8?'DAWN':hour>=8&&hour<17?'DAY':hour>=17&&hour<20?'SUNSET':'NIGHT';}
export function dawnWeight(t:number){return Math.exp(-(((t-.255)/.055)**2));}
export function sunsetWeight(t:number){return Math.exp(-(((t-.745)/.065)**2));}
