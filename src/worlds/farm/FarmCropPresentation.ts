import { DynamicDrawUsage,Group,InstancedMesh,Matrix4,Mesh,MeshDepthMaterial,RGBADepthPacking } from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import type { BufferGeometry } from 'three';
import type { Material } from 'three';
import type { Quality } from '../../core/Renderer';
import type { GameplayServices } from '../../gameplay/GameplayFoundation';
import type { CropStageDefinition } from '../../gameplay/farm/CropRegistry';
import type { FarmCellRef } from '../../gameplay/farm/FarmDefinition';
import { box,material } from '../../utils/voxel';
import { FARM_FIELD_DEFINITIONS } from '../../gameplay/farm/FarmDefinition';
import { FARM_GROUND,FARM_SEED_SUPPLY } from './FarmMap';
import { farmHeight } from './FarmTerrain';
import { FARM_EFFECT_QUALITY,LAND_APPEARANCE } from './FarmPresentation';
import type { FarmVisualEvent } from './FarmPresentation';
import type { FarmCellView } from '../../gameplay/farm/FarmSystem';

interface ResourceBatch {meshes:InstancedMesh[];parts:Matrix4[];count:number;crop:boolean}
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
  private previous=new Map<string,{state:FarmCellView['landState'];crop:string|null}>();private changes:FarmVisualEvent[]=[];
  private quality:Quality='MEDIUM';private windTime={value:0};private windAmount={value:FARM_EFFECT_QUALITY.MEDIUM.wind as number};
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
  drainChanges(){const changes=this.changes;this.changes=[];return changes;}
  applyQuality(quality:Quality){this.quality=quality;this.windAmount.value=FARM_EFFECT_QUALITY[quality].wind;for(const batch of this.batches.values())for(const mesh of batch.meshes)mesh.castShadow=batch.crop&&FARM_EFFECT_QUALITY[quality].cropShadows;}
  animate(time:number){this.windTime.value=time;}
  focus(game:GameplayServices,ref:FarmCellRef|null){
    const center=ref?game.farm.cellCenter(ref):null;this.highlight.visible=!!center;
    if(!center)return;
    this.highlight.position.set(center.x,farmHeight(center.x,center.z),center.z);
    const cell=game.farm.getCell(ref!)!,color=LAND_APPEARANCE[cell.landState].color;
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
    if(force){this.previous.clear();this.changes=[];}
    for(const cell of cells){
      const old=this.previous.get(cell.id),crop=cell.crop?.cropId??null;
      if(old){const kind=cell.landState==='TILLED'&&(old.state==='UNTILLED'||old.state==='HARVESTED')?'till':crop&&!old.crop?'seed':cell.landState==='HARVESTED'&&old.crop?'harvest':undefined;
        if(kind){const center=game.farm.cellCenter(cell)!;this.changes.push({kind,...center,y:farmHeight(center.x,center.z),cropId:crop??old.crop??undefined});}}
      this.previous.set(cell.id,{state:cell.landState,crop});
    }
    const stamp=cells.map(c=>`${c.landState}/${c.growth?.stage.resourceId??''}/${c.growth?.stage.modelAssetId??''}`).join('|');
    if(!force&&this.stamp===stamp)return;this.stamp=stamp;
    for(const batch of this.batches.values())batch.count=0;
    for(const cell of cells){
      const center=game.farm.cellCenter(cell)!,height=farmHeight(center.x,center.z)+.012;
      if(cell.landState!=='UNTILLED')this.place(this.resource('soil'),center.x,height,center.z);
      this.place(this.resource(`soil-${cell.landState}`),center.x,height,center.z);
      if(cell.growth)this.place(this.resource(cell.growth.stage.resourceId,cell.growth.stage),center.x,height,center.z);
    }
    for(const batch of this.batches.values())for(const mesh of batch.meshes){
      mesh.count=batch.count;mesh.visible=batch.count>0;mesh.instanceMatrix.needsUpdate=true;
      if(batch.count){mesh.computeBoundingBox();mesh.computeBoundingSphere();}
    }
    this.userData.visibleCropCells=cells.filter(c=>c.crop).length;
    this.userData.stateCounts=Object.fromEntries(Object.keys(LAND_APPEARANCE).map(state=>[state,cells.filter(c=>c.landState===state).length]));
    this.userData.drawBatches=[...this.batches.values()].reduce((n,b)=>n+b.meshes.filter(m=>m.visible).length,0);
  }
  private place(batch:ResourceBatch,x:number,y:number,z:number){
    this.translation.makeTranslation(x,y,z);
    batch.meshes.forEach((mesh,i)=>mesh.setMatrixAt(batch.count,this.instanceTransform.multiplyMatrices(this.translation,batch.parts[i])));batch.count++;
  }
  private resource(id:string,stage?:CropStageDefinition):ResourceBatch {
    const existing=this.batches.get(id);if(existing)return existing;
    const source=new Group();source.name=id;
    if(!stage){
      this.soil(source,id);
    }else{
      const model=stage.modelAssetId?this.model(stage.modelAssetId):undefined;
      if(model)source.add(model);else this.placeholder(source,stage);
    }
    this.sources.add(source);source.updateWorldMatrix(true,true);
    const inverse=new Matrix4().copy(source.matrixWorld).invert(),meshes:InstancedMesh[]=[],parts:Matrix4[]=[];
    const groups=new Map<string,{material:Material;geometries:BufferGeometry[]}>();
    source.traverse(o=>{
      if(!(o instanceof Mesh))return;
      const transform=new Matrix4().multiplyMatrices(inverse,o.matrixWorld),original=o.geometry as BufferGeometry,materials:Material[]=Array.isArray(o.material)?o.material:[o.material];
      for(let i=0;i<materials.length;i++){
        const indexed=original.clone(),geometry=indexed.index?indexed.toNonIndexed():indexed;if(indexed!==geometry)indexed.dispose();
        // Preserve multi-material submeshes if an asset introduces them later.
        if(materials.length>1){const group=original.groups.find(g=>g.materialIndex===i);if(!group){geometry.dispose();continue;}for(const key of Object.keys(geometry.attributes)){const attr=geometry.getAttribute(key),array=attr.array.slice(group.start*attr.itemSize,(group.start+group.count)*attr.itemSize);geometry.setAttribute(key,new (attr.constructor as typeof import('three').BufferAttribute)(array,attr.itemSize,attr.normalized));}geometry.clearGroups();}
        geometry.applyMatrix4(transform);if(!geometry.hasAttribute('normal'))geometry.computeVertexNormals();
        const key=`${materials[i].uuid}/${Object.keys(geometry.attributes).sort().join('/')}`,group:{material:Material;geometries:BufferGeometry[]}=groups.get(key)??{material:materials[i],geometries:[]};group.geometries.push(geometry);groups.set(key,group);
      }
    });
    const crop=!!stage&&stage.id!=='seed';
    for(const group of groups.values()){
      const geometry=mergeGeometries(group.geometries,false);for(const part of group.geometries)part.dispose();if(!geometry)throw new Error(`Cannot merge farm resource ${id}`);
      const surface=crop?this.windy(group.material.clone()):group.material,mesh=new InstancedMesh(geometry,surface,MAX_CELLS);mesh.name=`CropInstances:${id}`;
      mesh.instanceMatrix.setUsage(DynamicDrawUsage);mesh.count=0;mesh.visible=false;mesh.castShadow=crop&&FARM_EFFECT_QUALITY[this.quality].cropShadows;mesh.receiveShadow=true;
      if(crop)mesh.customDepthMaterial=this.windy(new MeshDepthMaterial({depthPacking:RGBADepthPacking}));
      this.add(mesh);meshes.push(mesh);parts.push(new Matrix4());
    }
    const batch={meshes,parts,count:0,crop};this.batches.set(id,batch);return batch;
  }
  private windy<T extends Material>(surface:T):T {
    surface.onBeforeCompile=shader=>{
      shader.uniforms.farmWindTime=this.windTime;shader.uniforms.farmWindAmount=this.windAmount;
      shader.vertexShader='uniform float farmWindTime;\nuniform float farmWindAmount;\n'+shader.vertexShader;
      shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>
        #ifdef USE_INSTANCING
          float farmPhase = instanceMatrix[3].x * .7 + instanceMatrix[3].z * .43;
          float farmBend = max(position.y - .06, 0.0) * farmWindAmount;
          transformed.x += sin(farmWindTime * 1.7 + farmPhase) * farmBend;
          transformed.z += sin(farmWindTime * 1.2 + farmPhase * .8) * farmBend * .45;
        #endif`);
    };surface.customProgramCacheKey=()=>`farm-wind-v1:${surface.type}`;return surface;
  }
  private soil(root:Group,id:string){
    if(id==='soil'){box(root,'#63462f',0,.007,0,.95,.014,.95);return;}
    const state=id.slice(5) as FarmCellView['landState'];
    if(state==='UNTILLED'){
      box(root,'#8b7654',0,.003,0,.96,.006,.96);for(const [x,z] of [[-.28,-.22],[.18,.28],[.32,-.26]])box(root,'#a18d65',x,.018,z,.15,.03,.13);return;
    }
    if(state==='HARVESTED'){
      box(root,'#9c8966',0,.012,0,.94,.012,.94);for(const x of [-.3,0,.3])for(const z of [-.25,.25])box(root,'#bdad7c',x,.043,z,.035,.065,.025);return;
    }
    const colors=state==='TILLED'?['#856040','#775437']:state==='SEEDED'?['#9a7149','#ae8554']:['#785539','#684b33'];
    for(const x of [-.32,0,.32]){box(root,colors[0],x,.024,0,.16,.03,.89);box(root,colors[1],x+.08,.024,0,.035,.025,.86);}
    if(state==='SEEDED')for(const x of [-.32,0,.32])for(const z of [-.28,.05,.33])box(root,'#c4a36f',x,.047,z,.085,.024,.075);
    if(state==='GROWING'||state==='MATURE')for(const x of [-.43,.43])box(root,LAND_APPEARANCE[state].color,x,.024,-.43,.06,.02,.06);
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
