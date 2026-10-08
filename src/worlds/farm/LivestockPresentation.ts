import { Box3,Group,Mesh,Vector3 } from 'three';
import type { Object3D } from 'three';
import type { Quality } from '../../core/Renderer';
import type { GameplayServices } from '../../gameplay/GameplayFoundation';
import { LIVESTOCK_PENS,penDefinition } from '../../gameplay/livestock/LivestockDefinition';
import type { AnimalBehavior } from '../../gameplay/livestock/LivestockDefinition';
import type { AnimalSnapshot } from '../../gameplay/livestock/LivestockState';
import type { DynamicObstacle } from '../../world/Collision';
import { box } from '../../utils/voxel';
import { farmHeight } from './FarmTerrain';
interface AnimalVisual {model:Group;scale:number;parts:{pivot:Group;kind:'head'|'leg'|'wing';phase:number}[];collision:DynamicObstacle;ready:Group;feed:Group}
/** Only eight shared-model actors. State, feeding and production stay in gameplay. */
export class LivestockPresentation extends Group {
  /** Optional isolated presentation override; never changes livestock ownership/production. */
  captureBehavior?:AnimalBehavior;
  private animals=new Map<string,AnimalVisual>();private feedLevels=new Map<string,Group>();private quality:Quality='MEDIUM';
  constructor(models:ReadonlyMap<string,Group>){
    super();this.name='LivestockPresentation';
    for(const p of LIVESTOCK_PENS){
      const trough=new Group();trough.name=`LivestockFeeder:${p.id}`;trough.position.set(p.feeder.x,farmHeight(p.feeder.x,p.feeder.z),p.feeder.z);this.add(trough);
      box(trough,'#6f5037',0,.08,0,1.2,.16,.44);for(const x of [-.55,.55])box(trough,'#9b7750',x,.21,0,.1,.26,.44);for(const z of [-.18,.18])box(trough,'#9b7750',0,.21,z,1.2,.26,.08);
      const food=new Group();box(food,'#cfb977',0,.20,0,.98,.08,.28);food.visible=false;trough.add(food);this.feedLevels.set(p.id,food);
      const shelter=new Group();shelter.name=`LivestockShelter:${p.id}`;shelter.position.set(p.shelter.x,farmHeight(p.shelter.x,p.shelter.z),p.shelter.z);this.add(shelter);
      for(const x of [-.6,.6])for(const z of [-.35,.35])box(shelter,'#87613e',x,.45,z,.10,.9,.10);
      box(shelter,'#75846a',0,.95,0,1.5,.14,1);box(shelter,'#ab9567',0,.014,0,1.3,.028,.8);
    }
    for(const [id,model] of models){
      if(!/^(chicken|cow|sheep)-\d+$/.test(id))continue;
      const parts:AnimalVisual['parts']=[],nodes:Object3D[]=[];model.traverse(o=>{const part=String(o.userData.part_id??'');if(part==='head'||part.startsWith('leg_')||part.startsWith('wing_'))nodes.push(o);});
      for(const node of nodes){
        if(!node.parent)continue;node.updateWorldMatrix(true,true);const centre=new Box3().setFromObject(node).getCenter(new Vector3()),parent=node.parent;parent.worldToLocal(centre);const pivot=new Group();pivot.name=`AnimalPivot:${node.userData.part_id}`;pivot.position.copy(centre);parent.add(pivot);pivot.attach(node);
        parts.push({pivot,kind:node.userData.part_id==='head'?'head':String(node.userData.part_id).startsWith('leg_')?'leg':'wing',phase:parts.length%2?Math.PI:0});
      }
      const size=id.startsWith('chicken')?.17:id.startsWith('cow')?.43:.36;
      const ready=new Group(),feed=new Group();ready.name=`AnimalProduct:${id}`;feed.name=`AnimalFeeding:${id}`;this.add(ready,feed);ready.visible=feed.visible=false;
      box(ready,'#ecd379',0,.05,0,.12,.1,.12);box(ready,'#fff0b0',0,.13,0,.06,.06,.06);box(feed,'#c8b574',0,.014,0,.2,.028,.2);
      const collision:DynamicObstacle={x:model.position.x,z:model.position.z,previousX:model.position.x,previousZ:model.position.z,yaw:model.rotation.y,previousYaw:model.rotation.y,halfX:size,halfZ:size,minY:model.position.y,maxY:model.position.y+(id.startsWith('chicken')?.23:id.startsWith('cow')?.61:.37)};
      this.animals.set(id,{model,parts,collision,ready,feed,scale:model.scale.x});
    }
  }
  get collisions(){return [...this.animals.values()].map(a=>a.collision);}
  applyQuality(quality:Quality){this.quality=quality;for(const visual of this.animals.values())visual.model.traverse(o=>{if(o instanceof Mesh)o.castShadow=quality!=='LOW';});}
  update(game:GameplayServices,time:number){
    for(const [index,animal] of game.livestock.getAnimals().entries()){
      if(this.captureBehavior){animal.behavior=this.captureBehavior;if(animal.behavior==='WALKING'){const b=penDefinition(animal.penId)!.bounds,phase=time*.13+index*1.7;animal.x=Math.max(b.minX,Math.min(b.maxX,animal.x+Math.sin(phase)*.35));animal.z=Math.max(b.minZ,Math.min(b.maxZ,animal.z+Math.cos(phase)*.35));animal.yaw=phase+Math.PI/2;}}
      this.updateAnimal(animal,time);
    }
    for(const p of LIVESTOCK_PENS)this.feedLevels.get(p.id)!.visible=(game.livestock.getPen(p.id)?.feed??0)>0;
  }
  private updateAnimal(animal:AnimalSnapshot,time:number){
    const visual=this.animals.get(animal.id);if(!visual)return;const {model,collision,parts,ready,feed,scale}=visual,ground=farmHeight(animal.x,animal.z),walking=animal.behavior==='WALKING',eating=animal.behavior==='EATING',sleeping=animal.behavior==='SLEEPING';
    collision.previousX=collision.x;collision.previousZ=collision.z;collision.previousYaw=animal.yaw-Math.atan2(Math.sin(animal.yaw-collision.yaw),Math.cos(animal.yaw-collision.yaw));collision.x=animal.x;collision.z=animal.z;collision.yaw=animal.yaw;
    model.position.set(animal.x,ground+(walking&&this.quality!=='LOW'?Math.abs(Math.sin(time*5))*.008:0),animal.z);model.rotation.y=animal.yaw;model.scale.set(scale,scale*(sleeping?.72:1),scale);
    const phase=time*5+Number(animal.id.split('-')[1])*1.7;
    for(const part of parts){part.pivot.rotation.x=part.kind==='leg'?(walking&&this.quality!=='LOW'?Math.sin(phase+part.phase)*.18:0):part.kind==='head'?(eating?-.24+Math.sin(phase)*.08:sleeping?-.14:Math.sin(phase*.35)*.018):walking&&this.quality==='HIGH'?Math.sin(phase)*.08:0;}
    ready.position.set(animal.x,ground+(animal.kind==='chicken'?.35:animal.kind==='cow'?.75:.52),animal.z);ready.visible=animal.pending>0;
    feed.position.set(animal.x+Math.sin(animal.yaw)*.3,ground+.02,animal.z+Math.cos(animal.yaw)*.3);feed.visible=eating;
    model.userData.livestockState=animal.behavior;model.userData.pendingProduct=animal.pending;
  }
}
