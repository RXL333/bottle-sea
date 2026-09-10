export function daylightAt(normalizedDayTime:number) {
  const sun=Math.sin((normalizedDayTime-.25)*Math.PI*2);
  const t=Math.max(0,Math.min(1,(sun+.23)/.34));
  return t*t*(3-2*t);
}
