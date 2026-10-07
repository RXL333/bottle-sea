export type VehicleSteeringMode='combined'|'keyboard'|'mouse';
export interface GameSettings {
  version:1;vehicleSteering:VehicleSteeringMode;vehicleSensitivity:number;lookSensitivity:number;invertLookY:boolean;
  orbitSensitivity:number;vehicleCameraDistance:number;renderScale:number;volume:number;soundEnabled:boolean;showFps:boolean;
}
export const DEFAULT_SETTINGS:Readonly<GameSettings>=Object.freeze({version:1,vehicleSteering:'combined',vehicleSensitivity:1,lookSensitivity:1,invertLookY:false,orbitSensitivity:1,vehicleCameraDistance:1,renderScale:1,volume:.65,soundEnabled:false,showFps:true});
export const STEERING_LABELS:Record<VehicleSteeringMode,string>={combined:'鼠标 + A / D',keyboard:'仅 A / D 转向',mouse:'仅鼠标转向'};
/** Preferences only. Quality and fishing input stay in their existing save owners. */
export function normalizeSettings(value:unknown):GameSettings {
  const raw=value&&typeof value==='object'?value as Record<string,unknown>:{};
  const result={...DEFAULT_SETTINGS};
  for(const [key,min,max] of [['vehicleSensitivity',.25,2],['lookSensitivity',.25,2],['orbitSensitivity',.25,2],['vehicleCameraDistance',.8,1.6],['renderScale',.5,1.25],['volume',0,1]] as const){const n=raw[key];if(typeof n==='number'&&Number.isFinite(n))result[key]=Math.max(min,Math.min(max,n));}
  for(const key of ['invertLookY','soundEnabled','showFps'] as const)if(typeof raw[key]==='boolean')result[key]=raw[key];
  if(raw.vehicleSteering==='combined'||raw.vehicleSteering==='keyboard'||raw.vehicleSteering==='mouse')result.vehicleSteering=raw.vehicleSteering;
  return result;
}
export class SettingsState {
  private state:GameSettings;
  constructor(saved:unknown,private changed:(settings:GameSettings)=>void=()=>{}){this.state=normalizeSettings(saved);}
  snapshot(){return {...this.state};}
  set(patch:Partial<GameSettings>){const next=normalizeSettings({...this.state,...patch});if(JSON.stringify(next)===JSON.stringify(this.state))return;this.state=next;this.changed(this.snapshot());}
  reset(){this.set({...DEFAULT_SETTINGS});}
}
