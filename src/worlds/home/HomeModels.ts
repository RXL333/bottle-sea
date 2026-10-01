import { Box3,Group,Matrix4,Mesh,MeshStandardMaterial,Object3D } from 'three';
import type { BoxObstacle } from '../../world/Collision';
import type { World } from '../../world/World';
import { seededRandom } from '../../utils/voxel';
import { seabedCellAt } from '../../world/underwater/SeabedData';
import { loadModel } from '../farm/FarmAssets';
import type { ModelLoader } from '../farm/FarmAssets';
import { disposeWorld } from '../disposeWorld';

export const HOME_FILES={
  boat:'main/main_sailboat.glb',house:'main/main_cottage.glb',lighthouse:'main/main_lighthouse.glb',dock:'main/main_dock_kit.glb',fishing:'main/main_fishing_deck.glb',
  chest:'main/treasure_chest.glb',anchor:'main/ancient_anchor.glb',ruins:'main/underwater_ruins.glb',palm:'main/island_palm.glb',
  ...Object.fromEntries(Array.from({length:4},(_,i)=>[`coral${i}`,`main/modules/coral_kit__coral_${i}.glb`])),
  ...Object.fromEntries(Array.from({length:4},(_,i)=>[`grass${i}`,`main/modules/seagrass_kit__seagrass_${i}.glb`])),
  ...Object.fromEntries(Array.from({length:5},(_,i)=>[`fish${i}`,`main/modules/tropical_fish__fish_${i}.glb`])),
  bed:'farm/modules/bed__bed_frame.glb',stove:'farm/kitchen_stove.glb',storage:'farm/storage_set.glb',launch:'farm/transport_boat.glb',
} as Record<string,string>;

/** Each Home owns its source models and instances, including cancelled loads. */
export class HomeModels extends Group {
  readonly colliders:BoxObstacle[]=[];
  private sources=new Group();private templates=new Map<string,Group>();private pending?:Promise<void>;private cancelled=false;
  private windows:MeshStandardMaterial[]=[];
  constructor(private loader:ModelLoader=loadModel){super();this.name='BlenderHomeModels';this.sources.visible=false;this.add(this.sources);}
  load(){return this.pending??=this.loadAll();}
  private async loadAll(){
    const results=await Promise.allSettled(Object.entries(HOME_FILES).map(async([id,file])=>({id,model:await this.loader(`${import.meta.env.BASE_URL}models/${file}`)})));
    for(const r of results)if(r.status==='fulfilled'){this.templates.set(r.value.id,r.value.model);this.sources.add(r.value.model);}
    const failure=results.find(r=>r.status==='rejected');
    if(this.cancelled||failure){disposeWorld(this.sources);this.templates.clear();throw new Error('Home models could not be loaded',{cause:failure?.status==='rejected'?failure.reason:undefined});}
  }
  instance(id:string){const source=this.templates.get(id);if(!source)throw new Error(`Missing home model ${id}`);return source.clone(true);}
  private solid(object:Object3D){object.updateWorldMatrix(true,true);const b=new Box3().setFromObject(object);this.colliders.push({minX:b.min.x,maxX:b.max.x,minY:b.min.y,maxY:b.max.y,minZ:b.min.z,maxZ:b.max.z});}
  private slab(minX:number,maxX:number,minY:number,maxY:number,minZ:number,maxZ:number){this.colliders.push({minX,maxX,minY,maxY,minZ,maxZ});}
  private closeCottageDoor(door:Object3D){
    door.rotation.y=0;door.updateWorldMatrix(true,true);
    const inverse=new Matrix4().copy(door.matrixWorld).invert(),panel=new Box3();
    door.traverse(o=>{
      if(!(o instanceof Mesh)||!(o.material instanceof MeshStandardMaterial)||o.material.name!=='Main_wood')return;
      o.geometry.computeBoundingBox();
      if(o.geometry.boundingBox)panel.union(o.geometry.boundingBox.clone().applyMatrix4(new Matrix4().multiplyMatrices(inverse,o.matrixWorld)));
    });
    if(panel.isEmpty())return;
    // The authored opening spans [-.66,.34]. Overlap each jamb by .02 so the
    // closed door also seals the old, narrower GLB without showing its interior.
    const left=-.68,right=.36,width=panel.max.x-panel.min.x;
    if(width<=0)return;
    door.scale.x=(right-left)/width;door.position.x=left-panel.min.x*door.scale.x;door.updateMatrix();
  }
  private place(id:string,x:number,y:number,z:number,scale:number,yaw=0,parent:Group=this){const model=this.instance(id);model.name=`Home_${id}`;model.position.set(x,y,z);model.scale.setScalar(scale);model.rotation.y=yaw;model.traverse(o=>{o.castShadow=true;o.receiveShadow=true;});parent.add(model);return model;}
  build(world:World){
    const island=world.island;
    island.getObjectByName('LegacyIslandProps')!.visible=false;island.crowns.forEach(g=>g.visible=false);
    for(const child of island.house.children)child.visible=false;
    const house=this.place('house',0,0,0,.4,0,island.house);
    house.traverse(o=>{if(o.userData.part_id==='front_door')this.closeCottageDoor(o);if(o instanceof Mesh&&o.material instanceof MeshStandardMaterial&&o.material.name==='Main_glass'){o.material=o.material.clone();o.material.emissive.set('#ffc26c');this.windows.push(o.material);}});
    house.traverse(o=>{if(['palm_left','palm_right'].includes(o.userData.part_id))o.visible=false;});
    for(const [x,z] of [[-2.7,-.5],[-1.4,-1.35]]){this.place('palm',x,3.44,z,.28);this.slab(x-.05,x+.09,3.44,4.40,z-.05,z+.05);}
    this.solid(this.place('bed',-1.94,3.97,-.40,.23));
    this.solid(this.place('stove',-1.09,3.97,-.59,.14));
    this.solid(this.place('storage',-1.02,3.97,.02,.13,Math.PI/2));
    // Exterior remains solid; E transfers to the full-scale interior scene.
    this.slab(-2.212,-.788,3.97,5.03,-.832,.452);
    // Foundation and porch surfaces.
    this.slab(-2.26,-.74,3.83,3.97,-.89,.49);
    this.slab(-2.26,-.74,3.97,4.006,.40,.84);
    for(const [x0,x1,z0,z1] of [[-1.78,-1.62,-1.58,1.58],[1.62,1.78,-1.58,1.58],[-1.7,1.7,-1.58,-1.42],[-1.7,-.66,1.42,1.58],[.34,1.7,1.42,1.58]])this.slab(-1.5+x0*.4,-1.5+x1*.4,3.97,4.98,-.2+z0*.4,-.2+z1*.4);
    this.slab(-1.764,-1.364,4.75,4.98,.368,.432);
    this.slab(-2.18,-.82,4.96,5.03,-.80,.40);
    for(const x of [-2.18,-.82])this.slab(x-.03,x+.03,3.97,4.73,.738,.798);
    for(const child of island.lighthouse.children)if(child!==island.lighthouse.light&&child!==island.lighthouse.beam)child.visible=false;
    island.lighthouse.position.x+=.65;
    this.place('lighthouse',0,0,0,.32,0,island.lighthouse);
    island.lighthouse.light.position.y=1.85;island.lighthouse.beam.position.y=1.85;
    this.slab(.37,1.63,3.83,4.40,-.91,.35);this.slab(.78,1.22,4.40,6.08,-.50,-.06);
    const dock=this.place('dock',.65,3.68,1.24,.30);dock.scale.z=.50;
    // The berth needs a level end; the authored stairs are a separate module.
    dock.traverse(o=>{if(o.userData.part_id==='stairs')o.visible=false;});
    for(const deck of [dock,this.place('fishing',-3.15,3.68,.65,.25)])deck.traverse(o=>{
      const pile=String(o.userData.part_id??'').startsWith('pile_');
      if(pile)o.traverse(child=>{if(child instanceof Mesh){child.geometry=child.geometry.clone();const p=child.geometry.attributes.position;for(let i=0;i<p.count;i++)if(p.getY(i)<0)p.setY(i,p.getY(i)*6);p.needsUpdate=true;child.geometry.computeBoundingBox();child.geometry.computeBoundingSphere();}});
      if(o.userData.part_id==='platform'||pile)this.solid(o);
    });
    world.ship.setModel(this.instance('boat'));
    const underwater=world.getObjectByName('UnderwaterWorld')!;
    underwater.getObjectByName('LegacyReef')!.visible=false;
    for(const [id,x,y,z,scale] of [['chest',-1.8,1.77,1.1,.43],['anchor',-3.65,1.82,.65,.43],['ruins',2.97,1.77,.4,.43]] as const){
      const target=underwater.getObjectByName(id)! as Group;for(const child of target.children)child.visible=false;const model=this.place(id,x,y,z,scale,0,target);
      if(id!=='ruins')this.solid(model);
      else{
        model.traverse(o=>{if(['short_column','tall_column'].includes(o.userData.part_id))this.solid(o);});
        for(const dx of [-.83,.83])this.slab(x+(dx-.38)*scale,x+(dx+.38)*scale,y,y+2*scale,z-.38*scale,z+.38*scale);
        this.slab(x-.84*scale,x+.84*scale,y+1.915*scale,y+2.285*scale,z-.29*scale,z+.29*scale);
      }
    }
    const random=seededRandom(914);
    for(let i=0;i<60;i++){
      const x=-4.9+random()*9.1,z=-1.1+random()*2.3;
      if((Math.abs(x+1.8)<.6&&z>.6)||(x>2.4&&z>0)||(Math.abs(x+3.65)<.7&&Math.abs(z-.65)<.3))continue;
      const y=seabedCellAt(x,z)?.top??1.77;
      this.place(`${i%3===0?'coral':'grass'}${i%4}`,x,y,z,.22+random()*.17,random()*Math.PI*2);
    }
    world.fish.setModels(Array.from({length:5},(_,i)=>this.instance(`fish${i}`)));
    this.userData.ready=true;
  }
  update(night:number){for(const material of this.windows)material.emissiveIntensity=.08+night*.9;}
  cancel(){this.cancelled=true;}
}
