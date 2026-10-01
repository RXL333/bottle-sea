import type { FarmSystem } from './FarmSystem';
import type { FarmCellRef } from './FarmDefinition';
import type { GrainTank } from '../vehicles/GrainTank';
import type { MotionPose } from '../vehicles/VehicleMotion';
import { sweptWorkAreas } from './ImplementSweep';
import type { WorkFootprint } from './ImplementSweep';

export interface HarvestReport {changedCells:number;protectedCells:number;unsupportedCells:number;blocked:boolean}
/** Mature supported crops only; each whole yield must fit before committing land. */
export class HarvestingSystem {
  constructor(private farm:FarmSystem,private tank:GrainTank){}
  sweep(from:MotionPose,to:MotionPose,footprint:WorkFootprint,beforeCommit:(stopped:boolean)=>void=()=>{}):HarvestReport {
    const refs=new Map<string,FarmCellRef>();for(const area of sweptWorkAreas(from,to,footprint))for(const ref of this.farm.cellsInArea(area))refs.set(`${ref.fieldId}:${ref.column}:${ref.row}`,ref);
    const report:HarvestReport={changedCells:0,protectedCells:0,unsupportedCells:0,blocked:false};
    for(const ref of refs.values()){
      const cell=this.farm.getCell(ref)!;if(!cell.crop)continue;
      if(cell.landState!=='MATURE'){report.protectedCells++;continue;}
      const crop=this.farm.crops.registry.get(cell.crop.cropId)!;if(!crop.machineHarvestable){report.unsupportedCells++;continue;}
      const output={itemId:crop.harvestItemId,quantity:crop.baseYield};
      if(!this.tank.canExchange([],[output]).ok){report.blocked=true;break;}
      // A full tank is stopped before its inventory callback can save the fleet.
      const full=this.tank.remaining===crop.baseYield;beforeCommit(full);
      const result=this.farm.harvest([ref],this.tank);if(!result.ok){report.blocked=true;break;}
      report.changedCells+=result.changedCells;
      if(full){report.blocked=true;break;}
    }
    return report;
  }
}
