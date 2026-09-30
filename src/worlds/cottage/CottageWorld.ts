import { AmbientLight,Box3,DirectionalLight,Group,HemisphereLight,Mesh,PointLight } from 'three';
import type { Object3D } from 'three';
import type { GameWorld,SpawnPoint,WorldUpdateContext,WorldEnterContext } from '../types';
import type { NavigationSurface } from '../NavigationSurface';
import type { Quality } from '../../core/Renderer';
import type { BoxObstacle } from '../../world/Collision';
import { InteractionSystem } from '../../systems/InteractionSystem';
import type { InteractionTarget } from '../../systems/InteractionSystem';
import { loadModel } from '../farm/FarmAssets';
import type { ModelLoader } from '../farm/FarmAssets';
import { disposeWorld } from '../disposeWorld';

export interface InteriorLayout {instances:Array<{module:string;position:number[];rotationZ:number;rotationY?:number;scale:number[];collection:string}>}
const base=()=>`${import.meta.env.BASE_URL}models/interior/`;
const solidIds=new Set(['reused_bed','sailor_wardrobe','reused_food_cupboard','ironbound_chest','navigation_table','blue_chair','nightstand','reused_stove_firebox','reused_firewood_rack','wooden_barrel','reused_grain_sack']);
export class CottageWorld implements GameWorld {
  readonly id='COTTAGE' as const;readonly root=new Group();
  readonly interaction=new InteractionSystem([]);readonly colliders:BoxObstacle[]=[];
  private sources=new Group();private pending?:Promise<void>;private disposed=false;
  private fire=new PointLight('#ff8b32',5,4,2);private lights:PointLight[]=[];
  private furniture=new Map<string,Object3D>();
  readonly navigation:NavigationSurface={
    eyeHeight:1.55,groundHeight:()=>.005,waterLevel:()=>-100,dynamicObstacles:()=>[],
    hitsObstacle:(x,z,y)=>!this.inside(x,z)||this.colliders.some(b=>this.intersects(b,x,z,y)),
    resolveVertical:(_x,_z,_from,to)=>Math.max(1.555,Math.min(3.30,to)),
    isInside:(x,y,z)=>this.inside(x,z)&&y>=1.55&&y<=3.31,
    constrain:p=>{p.x=Math.max(-3.70,Math.min(3.70,p.x));p.z=Math.max(-3.20,Math.min(3.20,p.z));p.y=Math.max(1.555,Math.min(3.30,p.y));},
  };
  private inside(x:number,z:number){return x> -3.72&&x<3.72&&z> -3.22&&z<3.22;}
  private intersects(b:BoxObstacle,x:number,z:number,y:number){return x>b.minX-.14&&x<b.maxX+.14&&z>b.minZ-.14&&z<b.maxZ+.14&&y+.10>b.minY&&y-1.55<b.maxY;}
  constructor(private loader:ModelLoader=loadModel,private suppliedLayout?:InteriorLayout){
    this.root.name='CottageWorld';this.sources.name='InteriorSources';this.sources.visible=false;this.root.add(this.sources);
  }
  load(){return this.pending??=this.loadAll();}
  private async loadAll(){
    const layout=this.suppliedLayout??await fetch(base()+'layout.json').then(r=>{if(!r.ok)throw new Error('Interior layout unavailable');return r.json() as Promise<InteriorLayout>;});
    if(!layout)throw new Error("Interior layout missing");
    const ids=[...new Set(layout.instances.map(i=>i.module))],models=new Map<string,Group>();
    const results=await Promise.allSettled(ids.map(async id=>{const model=await this.loader(base()+id+'.glb');return {id,model};}));
    for(const r of results)if(r.status==='fulfilled'){models.set(r.value.id,r.value.model);this.sources.add(r.value.model);}
    if(this.disposed||results.some(r=>r.status==='rejected')){disposeWorld(this.sources);throw new Error('Cottage assets could not be loaded');}
    for(const item of layout.instances){
      // Use the full room enclosure, not the render-only low cutaway wall.
      if(item.module==='wall_low'||item.module==='entry_steps'||item.module==='entry_mat')continue;
      const model=models.get(item.module)!.clone(true);model.name=item.module;
      model.position.set(item.position[0],item.position[2],-item.position[1]);model.rotation.set(0,item.rotationZ,-(item.rotationY??0),"YXZ");model.scale.set(item.scale[0],item.scale[2],item.scale[1]);
      model.traverse(o=>{if(o instanceof Mesh){o.castShadow=true;o.receiveShadow=true;}});this.root.add(model);
      if(['reused_bed','ironbound_chest','reused_stove_firebox','blue_door'].includes(item.module))this.furniture.set(item.module,model);
      if(item.module==='blue_door')model.traverse(o=>{if(o.userData.part_id==='door_hinge')o.rotation.y=0;});
      if(solidIds.has(item.module)){
        model.updateWorldMatrix(true,true);const b=new Box3().setFromObject(model);
        this.colliders.push({minX:b.min.x,maxX:b.max.x,minY:b.min.y,maxY:b.max.y,minZ:b.min.z,maxZ:b.max.z});
      }
      if(item.module==='warm_lantern'){
        const light=new PointLight('#ffbe70',2.4,3.6,2);light.position.copy(model.position);light.position.y+=.25;this.root.add(light);this.lights.push(light);
      }
    }
    this.root.add(new AmbientLight('#e8c89e',.85),new HemisphereLight('#b8d9ec','#795439',.65));
    const windowLight=new DirectionalLight('#ffe1b0',1.8);windowLight.position.set(-2,5,1);windowLight.target.position.set(0,0,-1);this.root.add(windowLight,windowLight.target);
    this.fire.position.set(2.91,.65,-2.5);this.root.add(this.fire);
    this.configureInteractions();
    this.root.userData.ready=true;
  }
  private configureInteractions(){
    const targets:InteractionTarget[]=[];
    const door=this.furniture.get('blue_door');
    if(door){
      targets.push({id:'cottage_exit',name:'走出小屋',action:'EXIT_COTTAGE',x:door.position.x,y:1.55,z:3.02,range:1.0});
    }
    for(const [module,id,name,action,range] of [
      ['reused_bed','cottage_bed','睡觉','HOME_SLEEP',1.75],
      ['ironbound_chest','cottage_chest','打开储物箱','HOME_STORAGE',1.35],
      ['reused_stove_firebox','cottage_stove','使用炉灶','HOME_STOVE',1.60],
    ] as const){const model=this.furniture.get(module);if(model)targets.push({id,name,action,x:model.position.x,y:1.55,z:model.position.z,range});}
    this.interaction.setTargets(targets);
  }
  enter(_context:WorldEnterContext){/* Furniture storage remains in persistent gameplay services. */}
  update(c:WorldUpdateContext){this.fire.intensity=4.5+Math.sin(c.time*9)*.35+Math.sin(c.time*13.7)*.25;}
  leave({gameTime}:{gameTime:number}){return {lastSimulatedGameTime:gameTime,discoveries:[]};}
  dispose(){this.disposed=true;disposeWorld(this.root);}
  getSpawnPoint(id='cottage_entry'):SpawnPoint{
    // Also used by development-only furniture checkpoints.
    const points:Record<string,SpawnPoint>={
      cottage_bed:{id,position:[-1.05,1.555,.24],lookAt:[-2.52,.85,.24]},
      cottage_chest:{id,position:[-.55,1.555,-1.30],lookAt:[-.55,.70,-2.2]},
      cottage_stove:{id,position:[2.30,1.555,-1.65],lookAt:[2.91,.80,-2.96]},
      cottage_door:{id,position:[-2.05,1.555,2.7],lookAt:[-2.4,1.3,3.49]},
      cottage_exit:{id,position:[-2.55,1.555,3.08],lookAt:[-2.55,1.55,4]},
    };
    return points[id]??{id:'cottage_entry',position:[-2.55,1.555,2.65],lookAt:[.25,1.45,-1.0]};
  }
  applyQuality(quality:Quality){this.fire.castShadow=quality==='HIGH';this.fire.shadow.mapSize.set(512,512);this.fire.shadow.bias=-.001;}
}
