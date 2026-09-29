import { BufferGeometry, Group, Mesh } from 'three';
import type { Material,Object3D } from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { FarmAssets } from './FarmAssets';
import { FARM_PLACEMENTS } from './FarmLayout';

export class FarmModels extends Group {
  private movers:{object:Object3D;axis:'x'|'z';phase:number;spin:boolean}[]=[];
  readonly placements=new Map<string,Group>();
  constructor(private assets:FarmAssets){super();this.name='BlenderFarmModels';}
  build(){
    const statics=new Group();this.add(statics);
    for(const p of FARM_PLACEMENTS){
      const model=this.assets.instance(p.asset);model.name=p.id;model.userData.farmAsset=p.asset;
      model.position.set(p.x,p.y??4,p.z);model.scale.setScalar(p.scale);model.rotation.y=p.yaw??0;
      statics.add(model);this.placements.set(p.id,model);
      if(p.asset==='farmhouse')model.traverse(o=>{if(o.userData.part_id==='front_door')o.rotation.y=-Math.PI*.55;});
      model.updateMatrixWorld(true);
      if(p.animated){
        const targets:Object3D[]=[];
        model.traverse(o=>{if(o.userData.part_id==='windmill_rotor'||o.userData.part_id==='head')targets.push(o);});
        for(const object of targets){
          this.attach(object);const spin=object.userData.part_id==='windmill_rotor';
          this.movers.push({object,axis:spin?'z':'x',phase:this.movers.length*.9,spin});
        }
      }
    }
    for(let ix=0;ix<15;ix++)for(let iz=0;iz<21;iz++){
      const x=-10.15+ix*.31,z=-2.15+iz*.30;
      if(Math.abs(x+8)<.85&&z>.7&&z<3.1)continue;
      const crop=this.assets.instance('wheat_cluster');crop.position.set(x,4.078,z);crop.scale.setScalar(.40+((ix+iz)%3)*.035);crop.rotation.y=(ix%3)*.8;statics.add(crop);
    }
    this.updateMatrixWorld(true);
    const batches=new Map<string,{material:Material;geometry:BufferGeometry[]}>();
    statics.traverse(o=>{
      if(!(o instanceof Mesh))return;
      if(Array.isArray(o.material))throw new Error('Farm exports must have one material per primitive');
      const key=o.material.name,entry:{material:Material;geometry:BufferGeometry[]}=batches.get(key)??{material:o.material,geometry:[]};
      entry.geometry.push(o.geometry.clone().applyMatrix4(o.matrixWorld));batches.set(key,entry);
    });
    for(const [key,{material,geometry}] of batches){
      const merged=mergeGeometries(geometry,false);for(const g of geometry)g.dispose();
      if(!merged)throw new Error(`Farm geometry could not be batched: ${key}`);
      const mesh=new Mesh(merged,material);mesh.name=`FarmStatic_${key}`;mesh.castShadow=true;mesh.receiveShadow=true;this.add(mesh);
    }
    statics.clear();this.remove(statics);
    this.traverse(o=>{if(o instanceof Mesh){o.castShadow=true;o.receiveShadow=true;}});
    this.userData.assetsPlaced=FARM_PLACEMENTS.length;this.userData.staticBatches=batches.size;
  }
  update(time:number){for(const m of this.movers)m.object.rotation[m.axis]=m.spin?time*.32:Math.sin(time*.8+m.phase)*.055;}
}
