import { Group } from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { disposeWorld } from '../disposeWorld';

// Kitchen and storage furniture deliberately do not belong to this island.
export const FARM_MODEL_FILES={
  transport_boat:'transport_boat.glb',tractor:'tractor.glb',seeder:'seeder.glb',combine_harvester:'combine_harvester.glb',farm_trailer:'farm_trailer.glb',plow:'plow.glb',
  barn:'barn.glb',tool_shed:'tool_shed.glb',farmhouse:'farmhouse.glb',windmill:'windmill.glb',water_tower:'water_tower.glb',
  fence_segment:'modules/fence_kit__fence_straight.glb',fence_gate:'modules/fence_kit__fence_gate.glb',
  dock_kit:'dock_kit.glb',dock_platform:'modules/dock_kit__dock_platform.glb',dock_pile:'modules/dock_kit__dock_pile_1.glb',
  fishing_deck:'fishing_deck.glb',bed:'bed.glb',chicken:'chicken.glb',cow:'cow.glb',sheep:'sheep.glb',
  orchard_tree:'orchard_tree.glb',hay_bale:'hay_bale.glb',
} as const;
export type FarmAssetId=keyof typeof FARM_MODEL_FILES;
export type ModelLoader=(url:string)=>Promise<Group>;
export const loadModel:ModelLoader=async url=>(await new GLTFLoader().loadAsync(url)).scene;
export const farmModelUrl=(file:string)=>`${import.meta.env.BASE_URL}models/farm/${file}`;

/** Sources remain hidden under their owning world, so shared instance resources
 * are released exactly once by disposeWorld, including partial-load failures. */
export class FarmAssets {
  readonly sources=new Group();
  private models=new Map<FarmAssetId,Group>();
  private pending:Promise<void>|undefined;
  private disposed=false;
  constructor(private loader:ModelLoader=loadModel){this.sources.name='FarmAssetSources';this.sources.visible=false;}
  load(){return this.pending??=this.loadAll();}
  private async loadAll(){
    const entries=Object.entries(FARM_MODEL_FILES) as [FarmAssetId,string][];
    const results=await Promise.allSettled(entries.map(async([id,file])=>({id,model:await this.loader(farmModelUrl(file))})));
    for(const result of results)if(result.status==='fulfilled'){
      const {id,model}=result.value;this.models.set(id,model);this.sources.add(model);
    }
    const failure=results.find(r=>r.status==='rejected');
    if(this.disposed||failure){disposeWorld(this.sources);this.models.clear();throw new Error(this.disposed?'Farm asset load cancelled':'Farm model could not be loaded',{cause:failure?.status==='rejected'?failure.reason:undefined});}
  }
  instance(id:FarmAssetId){
    const source=this.models.get(id);if(!source)throw new Error(`Farm model not loaded: ${id}`);
    const model=source.clone(true);model.name=id;return model;
  }
  cancel(){this.disposed=true;}
}
