import type { FarmSystem } from './FarmSystem';
import type { FarmCellRef } from './FarmDefinition';
import type { MotionPose } from '../vehicles/VehicleMotion';
import { sweptWorkAreas } from './ImplementSweep';
import type { WorkFootprint } from './ImplementSweep';

export interface PlowReport { changedCells:number;coveredCells:number;protectedCells:number;alreadyTilledCells:number;inField:boolean }
/** No models, inventory rewards, timers or second land state. */
export class PlowingSystem {
  constructor(private farm:FarmSystem){}
  sweep(from:MotionPose,to:MotionPose,footprint:WorkFootprint,beforeCommit:()=>void=()=>{}):PlowReport {
    const seen=new Map<string,FarmCellRef>();
    for(const area of sweptWorkAreas(from,to,footprint))for(const ref of this.farm.cellsInArea(area))seen.set(`${ref.fieldId}:${ref.column}:${ref.row}`,ref);
    const x=(footprint.minX+footprint.maxX)/2,z=(footprint.minZ+footprint.maxZ)/2;
    const inField=!!this.farm.cellAt(to.x+Math.cos(to.yaw)*x+Math.sin(to.yaw)*z,to.z-Math.sin(to.yaw)*x+Math.cos(to.yaw)*z);
    const eligible:FarmCellRef[]=[],report:PlowReport={changedCells:0,coveredCells:seen.size,protectedCells:0,alreadyTilledCells:0,inField};
    for(const ref of seen.values()){
      const cell=this.farm.getCell(ref)!;
      if(cell.crop){report.protectedCells++;continue;}
      if(cell.landState==='UNTILLED'||cell.landState==='HARVESTED')eligible.push(ref);
      else if(cell.landState==='TILLED')report.alreadyTilledCells++;
    }
    if(eligible.length){
      // Publish the moved fleet before FarmSystem's existing immediate save.
      beforeCommit();const result=this.farm.till(eligible);if(result.ok)report.changedCells=result.changedCells;
    }
    return report;
  }
}
