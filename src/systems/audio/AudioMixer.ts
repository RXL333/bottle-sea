export type AudioMode='OVERVIEW'|'ISLAND'|'UNDERWATER'|'INDOOR';
export type AudioMix={ocean:number;wind:number;stormWind:number;rain:number;underwater:number;cutoff:number};
export function mixAudio(mode:AudioMode,storm:number,out:AudioMix){
  const wet=mode==='UNDERWATER',close=mode==='ISLAND'?1.15:1;
  out.ocean=wet?.025:.15*close;out.wind=wet?.008:.055*(1-storm*.5);
  out.stormWind=storm*(wet?.035:.19);out.rain=storm*(wet?.022:.075);out.underwater=wet?.2:0;out.cutoff=wet?260:6500;
  if(mode==='INDOOR'){out.ocean*=.12;out.wind=0;out.stormWind*=.08;out.rain*=.2;out.cutoff=1400;}
  return out;
}
