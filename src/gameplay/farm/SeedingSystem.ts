import type { Inventory } from '../Inventory';
import type { FarmSystem } from './FarmSystem';
import type { FarmCellRef } from './FarmDefinition';
import type { MotionPose } from '../vehicles/VehicleMotion';
import { sweptWorkAreas } from './ImplementSweep';
import type { WorkFootprint } from './ImplementSweep';

export interface SeedChoice {id:string;name:string;count:number;selected:boolean}
export interface SeedReport {changedCells:number;coveredCells:number;protectedCells:number;eligibleCells:number;inField:boolean;exhausted:boolean;failed:boolean}
/** Uses the same seed transaction as hand work. No tank, timer or crop copy. */
export class SeedingSystem {
  constructor(private farm:FarmSystem,private inventory:Inventory){}
  get registry(){return this.farm.crops.registry;}
  count(cropId:string){const crop=this.registry.get(cropId);return crop?this.inventory.count(crop.seedItemId):0;}
  choices(selected?:string):SeedChoice[]{return this.registry.list().map(c=>({id:c.id,name:c.name,count:this.count(c.id),selected:c.id===selected}));}
  sweep(from:MotionPose,to:MotionPose,footprint:WorkFootprint,cropId:string,beforeCommit:(exhausted:boolean)=>void=()=>{}):SeedReport {
    const seen=new Map<string,FarmCellRef>();
    for(const area of sweptWorkAreas(from,to,footprint))for(const ref of this.farm.cellsInArea(area))seen.set(`${ref.fieldId}:${ref.column}:${ref.row}`,ref);
    const x=(footprint.minX+footprint.maxX)/2,z=(footprint.minZ+footprint.maxZ)/2;
    const report:SeedReport={changedCells:0,coveredCells:seen.size,protectedCells:0,eligibleCells:0,
      inField:!!this.farm.cellAt(to.x+Math.cos(to.yaw)*x+Math.sin(to.yaw)*z,to.z-Math.sin(to.yaw)*x+Math.cos(to.yaw)*z),exhausted:false,failed:false};
    if(!this.registry.has(cropId)){report.failed=true;return report;}
    const eligible:FarmCellRef[]=[];
    for(const ref of seen.values()){
      const cell=this.farm.getCell(ref)!;
      if(cell.crop){report.protectedCells++;continue;}
      if(cell.landState==='TILLED')eligible.push(ref);
    }
    report.eligibleCells=eligible.length;
    const count=this.count(cropId),plant=eligible.slice(0,count);report.exhausted=count===0||plant.length===count;
    if(plant.length){
      // Fleet/mode are published before Inventory and FarmSystem save callbacks.
      beforeCommit(report.exhausted);const result=this.farm.seed(plant,cropId);
      if(result.ok)report.changedCells=result.changedCells;else report.failed=true;
    }
    return report;
  }
}
