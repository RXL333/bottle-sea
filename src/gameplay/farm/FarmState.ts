import { LAND_STATES,cropGrowthAt,validCropTime } from './CropSystem';
import type { CropInstance,LandState } from './CropSystem';
import { CROPS } from './CropRegistry';
import type { CropRegistry } from './CropRegistry';
import { FARM_FIELD_DEFINITIONS,farmCellId,isFarmCell } from './FarmDefinition';
import type { FarmCellRef,FarmFieldDefinition } from './FarmDefinition';

export const FARM_SAVE_VERSION=1;
/** JSON-only agricultural payload. Resource/model objects never enter this schema. */
export interface FarmCellSnapshot extends FarmCellRef {id:string;landState:LandState;crop:CropInstance|null}
export interface FarmFieldSnapshot {id:string;cells:FarmCellSnapshot[]}
export interface FarmSnapshot {version:typeof FARM_SAVE_VERSION;fields:FarmFieldSnapshot[];starterSeedsClaimed:boolean}

const record=(value:unknown):Record<string,unknown>=>value!==null&&typeof value==='object'&&!Array.isArray(value)?value as Record<string,unknown>:{};
function emptyCell(ref:FarmCellRef):FarmCellSnapshot{return {...ref,id:farmCellId(ref),landState:'UNTILLED',crop:null};}
function emptyField(field:FarmFieldDefinition):FarmFieldSnapshot {
  return {id:field.id,cells:Array.from({length:field.grid.columns*field.grid.rows},(_,index)=>emptyCell({fieldId:field.id,column:index%field.grid.columns,row:Math.floor(index/field.grid.columns)}))};
}

/** Read only known keys and current grids; saved geometry/cached stages are not trusted. */
export function normalizeFarm(value:unknown,crops:CropRegistry=CROPS,gameTime=0):FarmSnapshot {
  const raw=record(value),source=raw.version===FARM_SAVE_VERSION&&Array.isArray(raw.fields)?raw.fields:[];
  const fields=FARM_FIELD_DEFINITIONS.map(definition=>{
    const field=emptyField(definition),saved=record(source.find(value=>record(value).id===definition.id));
    const cells=Array.isArray(saved.cells)?saved.cells.slice(0,field.cells.length):[],seen=new Set<string>();
    for(const value of cells){
      const cell=record(value),column=cell.column,row=cell.row;
      if(typeof column!=='number'||typeof row!=='number'||!isFarmCell(definition,column,row))continue;
      const ref={fieldId:definition.id,column,row},id=farmCellId(ref);
      if(cell.fieldId!==ref.fieldId||cell.id!==id||seen.has(id))continue;
      seen.add(id);
      if(!LAND_STATES.includes(cell.landState as LandState))continue;
      let landState=cell.landState as LandState,crop:CropInstance|null=null;
      if(landState==='SEEDED'||landState==='GROWING'||landState==='MATURE'){
        const planted=record(cell.crop);
        if(typeof planted.cropId==='string'&&validCropTime(planted.plantedAtGameTime)){
          const candidate={cropId:planted.cropId,plantedAtGameTime:planted.plantedAtGameTime},growth=cropGrowthAt(candidate,crops,gameTime);
          if(growth){crop={...candidate,currentStage:growth.stage.id};landState=growth.state;}
        }
        if(!crop)landState='TILLED';
      }
      // Construct an independent plain object; discard growth, grids and render data.
      field.cells[row*definition.grid.columns+column]={...ref,id,landState,crop};
    }
    return field;
  });
  return {version:FARM_SAVE_VERSION,fields,starterSeedsClaimed:raw.version===FARM_SAVE_VERSION&&raw.starterSeedsClaimed===true};
}
