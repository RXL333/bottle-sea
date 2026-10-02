import { BufferGeometry, Group, Mesh } from 'three';
import type { Material,Object3D } from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { FarmAssets } from './FarmAssets';
import { FARM_GROUND } from './FarmMap';
import { FARM_PLACEMENTS } from './FarmLayout';
import { FarmWind } from './FarmWeatherResponse';
import type { Quality } from '../../core/Renderer';
import type { WeatherFrame } from '../../systems/WeatherState';

type Batch={material:Material;geometry:BufferGeometry[]};
function mergedMesh(name:string,batch:Batch){
  const merged=mergeGeometries(batch.geometry,false);for(const g of batch.geometry)g.dispose();
  if(!merged)throw new Error(`Farm geometry could not be batched: ${name}`);
  const mesh=new Mesh(merged,batch.material);mesh.name=name;mesh.castShadow=true;mesh.receiveShadow=true;return mesh;
}
/** Merge primitive siblings in each semantic part, keeping wheel/hitch/head pivots
 * and the entire independently positioned vehicle or animal hierarchy intact. */
export function compactInstance(model:Group){
  const parents:Object3D[]=[];model.traverse(o=>{if(o.children.some(c=>c instanceof Mesh))parents.push(o);});
  for(const parent of parents){
    const batches=new Map<Material,Mesh[]>();
    for(const child of parent.children)if(child instanceof Mesh&&!Array.isArray(child.material)&&!child.userData.part_id){
      const entry=batches.get(child.material)??[];entry.push(child);batches.set(child.material,entry);
    }
    for(const [material,meshes] of batches)if(meshes.length>1){
      const geometry=meshes.map(mesh=>{mesh.updateMatrix();return mesh.geometry.clone().applyMatrix4(mesh.matrix);});
      const merged=mergedMesh(`FarmPart_${material.name}`,{material,geometry});
      for(const mesh of meshes)parent.remove(mesh);parent.add(merged);
    }
  }
}
export class FarmModels extends Group {
  private wind=new FarmWind();
  private rotors:Object3D[]=[];
  readonly placements=new Map<string,Group>();
  constructor(private assets:FarmAssets){super();this.name='BlenderFarmModels';}
  build(){
    const statics=new Group();statics.name='FarmEnvironmentSources';this.add(statics);
    for(const p of FARM_PLACEMENTS){
      const model=this.assets.instance(p.asset);model.name=p.id;model.userData.farmAsset=p.asset;model.userData.zoneId=p.zoneId;
      model.position.set(p.x,p.y??FARM_GROUND,p.z);model.scale.setScalar(p.scale);model.rotation.y=p.yaw??0;model.userData.foliage=p.asset==='orchard_tree';
      (p.independent?this:statics).add(model);this.placements.set(p.id,model);
      if(p.asset==='farmhouse')model.traverse(o=>{if(o.userData.part_id==='front_door')o.rotation.y=-Math.PI*.55;});
      model.updateMatrixWorld(true);
      if(p.animated){
        const targets:Object3D[]=[];model.traverse(o=>{if(o.userData.part_id==='windmill_rotor')targets.push(o);});
        for(const object of targets){this.attach(object);this.rotors.push(object);}
      }
      if(p.independent)compactInstance(model);
    }
    this.updateMatrixWorld(true);
    const batches=new Map<string,Batch>();
    statics.traverse(o=>{
      if(!(o instanceof Mesh))return;
      if(Array.isArray(o.material))throw new Error('Farm exports must have one material per primitive');
      let parent:Object3D|null=o;while(parent&&!parent.userData.foliage)parent=parent.parent;
      const key=o.material.name+(parent?':foliage':''),entry:Batch=batches.get(key)??{material:o.material,geometry:[]};
      entry.geometry.push(o.geometry.clone().applyMatrix4(o.matrixWorld));batches.set(key,entry);
    });
    for(const [key,batch] of batches){const mesh=mergedMesh(`FarmStatic_${key}`,batch);mesh.material=mesh.material.clone();if(key.endsWith(':foliage'))this.wind.install(mesh);this.add(mesh);}
    statics.clear();this.remove(statics);
    this.traverse(o=>{if(o instanceof Mesh){o.castShadow=true;o.receiveShadow=true;}});
    this.userData.assetsPlaced=FARM_PLACEMENTS.length;this.userData.staticBatches=batches.size;
    this.userData.independentAssets=FARM_PLACEMENTS.filter(p=>p.independent).map(p=>p.id);
  }
  applyQuality(quality:Quality){this.wind.applyQuality(quality);}
  update(time:number,weather?:WeatherFrame){if(weather)this.wind.update(weather);for(const rotor of this.rotors)rotor.rotation.z=weather?weather.windPhase*.35:time*.32;}
}
