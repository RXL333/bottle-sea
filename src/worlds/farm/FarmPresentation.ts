import type { Quality } from '../../core/Renderer';
import type { LandState } from '../../gameplay/farm/CropSystem';

export const LAND_APPEARANCE:Readonly<Record<LandState,{name:string;color:string}>>={
  UNTILLED:{name:'未耕地',color:'#8b7654'},TILLED:{name:'已耕地',color:'#725034'},
  SEEDED:{name:'已播种',color:'#ba9160'},GROWING:{name:'生长中',color:'#7fa05a'},
  MATURE:{name:'已成熟',color:'#e0bb5a'},HARVESTED:{name:'已收割',color:'#a09071'},
};
export const FARM_EFFECT_QUALITY={
  LOW:{particles:0,burst:0,eventBudget:0,dustRate:0,distance:18,wind:0,cropShadows:false},
  MEDIUM:{particles:128,burst:6,eventBudget:8,dustRate:7,distance:24,wind:.025,cropShadows:false},
  HIGH:{particles:256,burst:10,eventBudget:12,dustRate:12,distance:38,wind:.04,cropShadows:true},
} satisfies Record<Quality,object>;
export type FarmEffectKind='till'|'seed'|'harvest';
export interface FarmVisualEvent {kind:FarmEffectKind;x:number;y:number;z:number;cropId?:string}
export interface FarmMachineFeedback {id:string;x:number;y:number;z:number;yaw:number;speed:number;occupied:boolean;workKind?:FarmEffectKind;workEnabled:boolean;operations:number}
export interface FarmSoundFrame {machines:readonly FarmMachineFeedback[];events:readonly FarmVisualEvent[];listener:{x:number;y:number;z:number};paused:boolean}
