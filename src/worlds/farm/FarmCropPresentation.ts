import { DynamicDrawUsage,Group,InstancedMesh,Matrix4,Mesh } from 'three';
import type { Material } from 'three';
import type { GameplayServices } from '../../gameplay/GameplayFoundation';
import type { CropStageDefinition } from '../../gameplay/farm/CropRegistry';
import type { FarmCellRef } from '../../gameplay/farm/FarmDefinition';
import { box,material } from '../../utils/voxel';
import { FARM_FIELD_DEFINITIONS } from '../../gameplay/farm/FarmDefinition';
import { FARM_GROUND,FARM_SEED_SUPPLY } from './FarmMap';
import { farmHeight } from './FarmTerrain';

interface ResourceBatch {meshes:InstancedMesh[];parts:Matrix4[];count:number}
type Appearance={shape:'grain'|'cob'|'tuber';ripe:string};
// Render styles indexed by logical resource family; no growth or yield rules here.
const APPEARANCES:Readonly<Record<string,Appearance>>={
  'crop.wheat':{shape:'grain',ripe:'#dbb653'},'crop.corn':{shape:'cob',ripe:'#edc24c'},'crop.potato':{shape:'tuber',ripe:'#bb956a'},
};
const MAX_CELLS=FARM_FIELD_DEFINITIONS.reduce((total,f)=>total+f.grid.columns*f.grid.rows,0);

/** World-owned rendering only. All growth is queried from the persistent CropSystem. */
export class FarmCropPresentation extends Group {
  private sources=new Group();private batches=new Map<string,ResourceBatch>();
  private highlight=new Group();private lid=new Group();private seedBags=new Group();
  private revision=-1;private checkedGameTime=-1;private nextGrowthAtGameTime:number|null=null;private stamp='';
  private instanceTransform=new Matrix4();private translation=new Matrix4();
  constructor(private model:(assetId:string)=>Group|undefined){
    super();this.name='FarmCropPresentation';this.sources.name='FarmCropResourceSources';this.sources.visible=false;this.add(this.sources,this.highlight);
    for(const x of [-.485,.485])box(this.highlight,'#f5d78b',x,.07,0,.025,.012,.97,.3);
    for(const z of [-.485,.485])box(this.highlight,'#f5d78b',0,.07,z,.97,.012,.025,.3);
    this.highlight.visible=false;
    const supply=FARM_SEED_SUPPLY,crate=new Group();crate.name='FarmStarterSeedBox';crate.position.set(supply.x,FARM_GROUND+.024,supply.z);this.add(crate);
    box(crate,'#795336',0,.06,0,supply.width,.12,supply.depth);
    for(const x of [-supply.width/2+.035,supply.width/2-.035])box(crate,'#795336',x,.34,0,.07,.48,supply.depth);
    for(const z of [-supply.depth/2+.035,supply.depth/2-.035])box(crate,'#795336',0,.34,z,supply.width,.48,.07);
    for(const x of [-.37,.37])box(crate,'#d2b27c',x,.29,.355,.08,.58,.02);
    for(const x of [-.2,0,.2])box(this.seedBags,'#c9b77b',x,.4,0,.17,.3,.25);crate.add(this.seedBags);
    this.lid.position.set(0,.61,-.35);box(this.lid,'#92613a',0,.03,.35,.94,.06,.74);crate.add(this.lid);
    box(crate,'#7ca452',0,.36,.362,.23,.23,.012,.1);
  }
  focus(game:GameplayServices,ref:FarmCellRef|null){
    const center=ref?game.farm.cellCenter(ref):null;this.highlight.visible=!!center;
    if(!center)return;
    this.highlight.position.set(center.x,farmHeight(center.x,center.z),center.z);
    const cell=game.farm.getCell(ref!)!,color=cell.landState==='MATURE'?'#adce81':cell.landState==='SEEDED'||cell.landState==='GROWING'?'#b5c6a5':'#f5d78b';
    this.highlight.traverse(o=>{if(o instanceof Mesh)o.material=material(color,.3);});
  }
  refresh(game:GameplayServices,force=false){
    this.lid.rotation.x=game.farm.starterSeedsClaimed?-1.6:0;
    this.seedBags.visible=!game.farm.starterSeedsClaimed;
    const gameTime=game.crops.gameTime;
    // Only the active world checks this shared-clock deadline. A jump can skip
    // several stages; reads immediately project the final stage at that time.
    if(!force&&this.revision===game.farm.revision&&gameTime>=this.checkedGameTime
      &&(this.nextGrowthAtGameTime===null||gameTime<this.nextGrowthAtGameTime))return;
    this.revision=game.farm.revision;this.checkedGameTime=gameTime;
    const fields=game.farm.definitions.map(f=>game.farm.getField(f.id)!);
    this.nextGrowthAtGameTime=null;
    for(const field of fields){
      const next=field.nextGrowthAtGameTime;
      if(next!==null&&(this.nextGrowthAtGameTime===null||next<this.nextGrowthAtGameTime))this.nextGrowthAtGameTime=next;
    }
    const cells=fields.flatMap(f=>f.cells);
    const stamp=cells.map(c=>`${c.landState}/${c.growth?.stage.resourceId??''}/${c.growth?.stage.modelAssetId??''}`).join('|');
    if(!force&&this.stamp===stamp)return;this.stamp=stamp;
    for(const batch of this.batches.values())batch.count=0;
    for(const cell of cells){
      if(cell.landState==='UNTILLED')continue;
      const center=game.farm.cellCenter(cell)!,height=farmHeight(center.x,center.z)+.012;
      this.place(this.resource('soil'),center.x,height,center.z);
      if(cell.growth)this.place(this.resource(cell.growth.stage.resourceId,cell.growth.stage),center.x,height,center.z);
    }
    for(const batch of this.batches.values())for(const mesh of batch.meshes){
      mesh.count=batch.count;mesh.visible=batch.count>0;mesh.instanceMatrix.needsUpdate=true;
      if(batch.count){mesh.computeBoundingBox();mesh.computeBoundingSphere();}
    }
    this.userData.visibleCropCells=cells.filter(c=>c.crop).length;
  }
  private place(batch:ResourceBatch,x:number,y:number,z:number){
    this.translation.makeTranslation(x,y,z);
    batch.meshes.forEach((mesh,i)=>mesh.setMatrixAt(batch.count,this.instanceTransform.multiplyMatrices(this.translation,batch.parts[i])));batch.count++;
  }
  private resource(id:string,stage?:CropStageDefinition):ResourceBatch {
    const existing=this.batches.get(id);if(existing)return existing;
    const source=new Group();source.name=id;
    if(!stage){
      box(source,'#67472f',0,.007,0,.93,.014,.93);
      for(const x of [-.34,-.17,0,.17,.34])box(source,'#8d653f',x,.018,0,.055,.012,.86);
    }else{
      const model=stage.modelAssetId?this.model(stage.modelAssetId):undefined;
      if(model)source.add(model);else this.placeholder(source,stage);
    }
    this.sources.add(source);source.updateWorldMatrix(true,true);
    const inverse=new Matrix4().copy(source.matrixWorld).invert(),meshes:InstancedMesh[]=[],parts:Matrix4[]=[];
    source.traverse(o=>{
      if(!(o instanceof Mesh))return;
      const mesh=new InstancedMesh(o.geometry,o.material as Material|Material[],MAX_CELLS);mesh.name=`CropInstances:${id}`;
      mesh.instanceMatrix.setUsage(DynamicDrawUsage);mesh.count=0;mesh.visible=false;mesh.castShadow=true;mesh.receiveShadow=true;
      this.add(mesh);meshes.push(mesh);parts.push(new Matrix4().multiplyMatrices(inverse,o.matrixWorld));
    });
    const batch={meshes,parts,count:0};this.batches.set(id,batch);return batch;
  }
  private placeholder(root:Group,stage:CropStageDefinition){
    const family=stage.resourceId.slice(0,stage.resourceId.lastIndexOf('.')),appearance=APPEARANCES[family]??{shape:'grain',ripe:'#d4bf79'};
    const mature=stage.id==='mature',sprout=stage.id==='sprout';
    if(stage.id==='seed'){
      for(const x of [-.24,0,.24])box(root,appearance.ripe,x,.045,0,.06,.035,.09);
      box(root,'#c8b587',.34,.1,-.32,.025,.16,.025);return;
    }
    const height=sprout?.14:appearance.shape==='cob'?(mature?.88:.62):appearance.shape==='tuber'?(mature?.32:.24):(mature?.68:.4);
    for(const x of [-.24,0,.24]){
      box(root,mature&&appearance.shape==='grain'?'#a9a152':'#719849',x,height/2+.025,0,.025,height,.025);
      box(root,'#7fa458',x-.07,height*.55,.012,.16,.035,.07);
      box(root,'#719548',x+.07,height*.75,-.012,.16,.035,.07);
      if(mature&&appearance.shape==='grain')box(root,appearance.ripe,x,height+.05,0,.075,.16,.075);
      if(mature&&appearance.shape==='cob')box(root,appearance.ripe,x+.05,height*.67,.02,.08,.22,.08);
      if(appearance.shape==='tuber'){
        box(root,'#6c9449',x,height,.02,.2,.035,.16);
        if(mature)box(root,appearance.ripe,x,.055,.14,.14,.08,.1);
      }
    }
  }
}
