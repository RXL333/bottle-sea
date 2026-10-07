import type { ActivitySink } from '../progression/ProgressionRegistry';
import type { Inventory,InventoryResult,ItemStack } from '../Inventory';
import { CropSystem } from './CropSystem';
import type { CropGrowth,LandState } from './CropSystem';
import { FARM_SAVE_VERSION,normalizeFarm } from './FarmState';
import type { FarmCellSnapshot,FarmFieldSnapshot,FarmSnapshot } from './FarmState';
import { FARM_FIELD_DEFINITIONS,farmAreaContains,fieldCellAt,fieldCellCenter,isFarmCell,validFarmArea } from './FarmDefinition';
import type { FarmArea,FarmCellRef,FarmFieldDefinition } from './FarmDefinition';

// Retain the original public imports while storage owns the plain-data schema.
export { normalizeFarm } from './FarmState';
export type { FarmCellSnapshot,FarmFieldSnapshot,FarmSnapshot } from './FarmState';
export const STARTER_SEEDS_PER_CROP=8;
export interface FarmCellView extends FarmCellSnapshot {growth:CropGrowth|null}
export interface FarmFieldView {
  id:string;name:string;grid:FarmFieldDefinition['grid'];cells:FarmCellView[];stateCounts:Record<LandState,number>;
  nextGrowthAtGameTime:number|null;
}
export type FarmFailureReason=Extract<InventoryResult,{ok:false}>['reason']
  |'invalid-cell'|'duplicate-cell'|'invalid-land-state'|'unknown-crop'|'invalid-game-time'|'already-claimed'|'wrong-season';
export type FarmResult={ok:true;changedCells:number;consumed:ItemStack[];produced:ItemStack[]}|{ok:false;reason:FarmFailureReason};
export type HarvestReceiver=Pick<Inventory,'canExchange'|'exchange'>;

/** Persistent, model-free state; every read projects crops at the global clock. */
export class FarmSystem {
  readonly definitions=FARM_FIELD_DEFINITIONS;
  private fields:Map<string,FarmFieldSnapshot>;
  private claimed=false;
  revision=0;
  constructor(readonly crops:CropSystem,private inventory:Inventory,saved?:unknown,private onChange:()=>void=()=>{},private onActivity:ActivitySink=()=>{}){
    this.fields=this.restoreFields(saved);
  }
  private restoreFields(value:unknown){const state=normalizeFarm(value,this.crops.registry,this.crops.gameTime);this.claimed=state.starterSeedsClaimed;return new Map(state.fields.map(field=>[field.id,field]));}
  restore(value:unknown):void {
    const before=JSON.stringify(this.snapshot());
    this.fields=this.restoreFields(value);
    if(JSON.stringify(this.snapshot())!==before)this.changed();
  }
  private project(cell:FarmCellSnapshot,gameTime=this.crops.gameTime):FarmCellSnapshot {
    const view=this.view(cell,gameTime),crop=view.crop;
    return {id:cell.id,fieldId:cell.fieldId,column:cell.column,row:cell.row,landState:view.landState,
      crop:crop?{cropId:crop.cropId,plantedAtGameTime:crop.plantedAtGameTime,currentStage:crop.currentStage}:null};
  }
  private view(cell:FarmCellSnapshot,gameTime=this.crops.gameTime):FarmCellView {
    const growth=cell.crop?this.crops.growth(cell.crop,gameTime):null;
    return {...cell,landState:cell.crop?growth?.state??'TILLED':cell.landState,
      crop:cell.crop&&growth?{...cell.crop,currentStage:growth.stage.id}:null,growth};
  }
  private changed(){this.revision++;this.onChange();}
  snapshot():FarmSnapshot {
    const gameTime=this.crops.gameTime;
    return {version:FARM_SAVE_VERSION,fields:[...this.fields.values()].map(f=>({id:f.id,cells:f.cells.map(c=>this.project(c,gameTime))})),starterSeedsClaimed:this.claimed};
  }
  get starterSeedsClaimed(){return this.claimed;}
  starterSeeds():ItemStack[]{return this.crops.registry.list().map(c=>({itemId:c.seedItemId,quantity:STARTER_SEEDS_PER_CROP}));}
  claimStarterSeeds():FarmResult {
    if(this.claimed)return {ok:false,reason:'already-claimed'};
    const produced=this.starterSeeds();if(!produced.length)return {ok:false,reason:'unknown-crop'};
    const checked=this.inventory.canExchange([],produced);if(!checked.ok)return checked;
    this.claimed=true;const result=this.inventory.exchange([],produced);
    if(!result.ok){this.claimed=false;return result;}
    this.changed();return {ok:true,changedCells:0,consumed:[],produced};
  }
  getCell(ref:FarmCellRef):FarmCellView|null {const cell=this.cell(ref);return cell?this.view(cell):null;}
  getField(id:string):FarmFieldView|null {
    const definition=this.definitions.find(f=>f.id===id),field=this.fields.get(id);if(!definition||!field)return null;
    const gameTime=this.crops.gameTime,cells=field.cells.map(c=>this.view(c,gameTime));
    const stateCounts:Record<LandState,number>={UNTILLED:0,TILLED:0,SEEDED:0,GROWING:0,MATURE:0,HARVESTED:0};
    let nextGrowthAtGameTime:number|null=null;
    for(const cell of cells){
      stateCounts[cell.landState]++;
      const next=cell.growth?.nextStageAtGameTime;
      if(next!==undefined&&next!==null&&(nextGrowthAtGameTime===null||next<nextGrowthAtGameTime))nextGrowthAtGameTime=next;
    }
    return {id,name:definition.name,grid:{...definition.grid},cells,stateCounts,nextGrowthAtGameTime};
  }
  cellAt(x:number,z:number):FarmCellRef|null {
    for(const field of this.definitions){const ref=fieldCellAt(field,x,z);if(ref)return ref;}
    return null;
  }
  cellCenter(ref:FarmCellRef){const field=this.definitions.find(f=>f.id===ref.fieldId);return field?fieldCellCenter(field,ref.column,ref.row):null;}
  /** A vehicle can pass a swept polygon and filter eligible land before committing. */
  cellsInArea(area:FarmArea,states?:readonly LandState[]):FarmCellRef[] {
    if(!validFarmArea(area))return [];
    const refs:FarmCellRef[]=[],gameTime=this.crops.gameTime;
    const bounds=area.kind==='bounds'?area:{minX:Math.min(...area.points.map(p=>p.x)),maxX:Math.max(...area.points.map(p=>p.x)),minZ:Math.min(...area.points.map(p=>p.z)),maxZ:Math.max(...area.points.map(p=>p.z))};
    // Restrict small implement sweeps to nearby grid rows/columns; do not project
    // the entire crop calendar at every accepted 120Hz vehicle substep.
    for(const definition of this.definitions){
      const g=definition.grid,cells=this.fields.get(definition.id)!.cells;
      const minColumn=Math.max(0,Math.ceil((bounds.minX-g.originX)/g.cellSize-.5-1e-9)),maxColumn=Math.min(g.columns-1,Math.floor((bounds.maxX-g.originX)/g.cellSize-.5+1e-9));
      const minRow=Math.max(0,Math.ceil((bounds.minZ-g.originZ)/g.cellSize-.5-1e-9)),maxRow=Math.min(g.rows-1,Math.floor((bounds.maxZ-g.originZ)/g.cellSize-.5+1e-9));
      for(let row=minRow;row<=maxRow;row++)for(let column=minColumn;column<=maxColumn;column++){
        const cell=cells[row*g.columns+column];
        if(!farmAreaContains(area,fieldCellCenter(definition,column,row)!))continue;
        if(states&&!states.includes(this.project(cell,gameTime).landState))continue;
        refs.push({fieldId:cell.fieldId,column,row});
      }
    }
    return refs;
  }
  private cell(ref:FarmCellRef):FarmCellSnapshot|null {
    const definition=this.definitions.find(f=>f.id===ref.fieldId);
    return definition&&isFarmCell(definition,ref.column,ref.row)?this.fields.get(ref.fieldId)!.cells[ref.row*definition.grid.columns+ref.column]:null;
  }
  private resolve(refs:readonly FarmCellRef[]):FarmCellSnapshot[]|Extract<FarmResult,{ok:false}> {
    const cells:FarmCellSnapshot[]=[],seen=new Set<string>(),gameTime=this.crops.gameTime;
    for(const ref of refs){
      const cell=this.cell(ref);if(!cell)return {ok:false,reason:'invalid-cell'};
      if(seen.has(cell.id))return {ok:false,reason:'duplicate-cell'};
      seen.add(cell.id);cells.push(this.project(cell,gameTime));
    }
    return cells;
  }
  till(refs:readonly FarmCellRef[]):FarmResult {
    const cells=this.resolve(refs);if(!Array.isArray(cells))return cells;
    if(cells.some(c=>c.landState!=='UNTILLED'&&c.landState!=='HARVESTED'&&c.landState!=='TILLED'))return {ok:false,reason:'invalid-land-state'};
    return this.commit(cells.filter(c=>c.landState!=='TILLED').map(c=>({...c,landState:'TILLED',crop:null})),[],[]);
  }
  seed(refs:readonly FarmCellRef[],cropId:string):FarmResult {
    const definition=this.crops.registry.get(cropId);if(!definition)return {ok:false,reason:'unknown-crop'};
    if(this.crops.plantingReason(cropId))return {ok:false,reason:'wrong-season'};
    const crop=this.crops.plant(cropId);if(!crop)return {ok:false,reason:'invalid-game-time'};
    const cells=this.resolve(refs);if(!Array.isArray(cells))return cells;
    if(cells.some(c=>c.landState!=='TILLED'))return {ok:false,reason:'invalid-land-state'};
    return this.commit(cells.map(c=>({...c,landState:'SEEDED',crop:{...crop}})),cells.length?[{itemId:definition.seedItemId,quantity:cells.length}]:[],[]);
  }
  harvest(refs:readonly FarmCellRef[],destination:HarvestReceiver=this.inventory):FarmResult {
    const cells=this.resolve(refs);if(!Array.isArray(cells))return cells;
    if(cells.some(c=>c.landState!=='MATURE'||!c.crop))return {ok:false,reason:'invalid-land-state'};
    const yields=new Map<string,number>();
    for(const cell of cells){
      const crop=this.crops.registry.get(cell.crop!.cropId);if(!crop)return {ok:false,reason:'unknown-crop'};
      yields.set(crop.harvestItemId,(yields.get(crop.harvestItemId)??0)+crop.baseYield);
    }
    const produced=[...yields].map(([itemId,quantity])=>({itemId,quantity}));
    return this.commit(cells.map(c=>({...c,landState:'HARVESTED',crop:null})),[],produced,destination);
  }
  /** Validate first, then commit both resources before Inventory's save callback. */
  private commit(cells:FarmCellSnapshot[],consumed:ItemStack[],produced:ItemStack[],destination:HarvestReceiver=this.inventory):FarmResult {
    if(!cells.length)return {ok:true,changedCells:0,consumed:[],produced:[]};
    const checked=destination.canExchange(consumed,produced);if(!checked.ok)return checked;
    const previous=cells.map(c=>this.cell(c)!);
    const put=(cell:FarmCellSnapshot)=>{
      const field=this.definitions.find(f=>f.id===cell.fieldId)!;
      this.fields.get(cell.fieldId)!.cells[cell.row*field.grid.columns+cell.column]=cell;
    };
    cells.forEach(put);
    if(consumed.length||produced.length){
      const result=destination.exchange(consumed,produced);
      if(!result.ok){previous.forEach(put);return result;}
    }
    this.onActivity(cells[0].landState==='TILLED'?'farm.till':cells[0].landState==='SEEDED'?'farm.seed':'farm.harvest',produced);
    this.changed();return {ok:true,changedCells:cells.length,consumed:consumed.map(s=>({...s})),produced:produced.map(s=>({...s}))};
  }
}
