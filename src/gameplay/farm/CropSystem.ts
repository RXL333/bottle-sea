import { DAY_DURATION } from '../../core/GameClock';
import type { GameClock } from '../../core/GameClock';
import { CROPS } from './CropRegistry';
import type { CropRegistry,CropStageDefinition,CropStageId } from './CropRegistry';

export const LAND_STATES=['UNTILLED','TILLED','SEEDED','GROWING','MATURE','HARVESTED'] as const;
export type LandState=typeof LAND_STATES[number];
export interface CropPlanting {readonly cropId:string;readonly plantedAtGameTime:number}
export interface CropInstance extends CropPlanting {
  /** Derived cache for display/save inspection; the calendar always determines it. */
  readonly currentStage:CropStageId;
}
export interface CropGrowth {
  readonly state:'SEEDED'|'GROWING'|'MATURE';readonly stageIndex:number;readonly stage:CropStageDefinition;
  readonly elapsedGameMinutes:number;readonly progress:number;
  /** Shared calendar timestamp of the next stage, null once mature. Not a timer. */
  readonly nextStageAtGameTime:number|null;
}

export function validCropTime(time:unknown):time is number {
  return typeof time==='number'&&Number.isFinite(time)&&time>=0&&time/DAY_DURATION*1440<=Number.MAX_SAFE_INTEGER;
}
/** Pure projection from the shared calendar: no delta accumulation or wall clock. */
export function cropGrowthAt(crop:CropPlanting,registry:CropRegistry,gameTime:number):CropGrowth|null {
  const definition=registry.get(crop.cropId);
  if(!definition||!validCropTime(gameTime)||!validCropTime(crop.plantedAtGameTime)||crop.plantedAtGameTime>gameTime)return null;
  const elapsedGameMinutes=(gameTime-crop.plantedAtGameTime)*1440/DAY_DURATION;
  let stageIndex=0;
  for(let i=1;i<definition.stages.length;i++)if(elapsedGameMinutes+1e-7>=definition.stages[i].startsAtGameMinute)stageIndex=i;else break;
  const stage=definition.stages[stageIndex],next=definition.stages[stageIndex+1];
  return {state:stage.id==='mature'?'MATURE':stage.id==='seed'?'SEEDED':'GROWING',stageIndex,
    stage:{...stage},elapsedGameMinutes,progress:stage.id==='mature'?1:Math.min(1,elapsedGameMinutes/definition.growthGameMinutes),
    nextStageAtGameTime:next?crop.plantedAtGameTime+next.startsAtGameMinute*DAY_DURATION/1440:null};
}
export class CropSystem {
  constructor(private clock:GameClock,readonly registry:CropRegistry=CROPS){}
  get gameTime(){return this.clock.simulationTime;}
  plant(cropId:string):CropInstance|null {
    return this.registry.has(cropId)&&validCropTime(this.gameTime)?{cropId,plantedAtGameTime:this.gameTime,currentStage:'seed'}:null;
  }
  growth(crop:CropPlanting,gameTime=this.gameTime){return cropGrowthAt(crop,this.registry,gameTime);}
}
