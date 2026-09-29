import { Group } from 'three';
import type { Quality } from '../../core/Renderer';
import { PLAYER_FOOT_OFFSET,PLAYER_HEAD_OFFSET,PLAYER_RADIUS } from '../../world/Collision';
import { waveHeight } from '../../world/ocean/WaveMath';
import type { GameWorld,SpawnPoint,WorldLeaveContext,WorldUpdateContext } from '../types';
import type { NavigationSurface } from '../NavigationSurface';
import { disposeWorld } from '../disposeWorld';
import { TravelOcean } from '../travel/TravelOcean';
import { PlayerTravelBoat } from '../travel/PlayerTravelBoat';
import { FarmTerrain,farmHeight } from './FarmTerrain';
import { FARM_OBSTACLES } from './FarmBuildings';
import { FARM_SURFACES } from './FarmLayout';
import { FarmAssets } from './FarmAssets';
import type { ModelLoader } from './FarmAssets';
import { FarmModels } from './FarmModels';
import { InteractionSystem } from '../../systems/InteractionSystem';
export class FarmWorld implements GameWorld {
  readonly id='FARM' as const;readonly root=new Group();readonly boat=new PlayerTravelBoat();
  private ocean=new TravelOcean(24);readonly interaction=new InteractionSystem([]);
  private assets:FarmAssets;private models:FarmModels;private disposed=false;private loading:Promise<void>|undefined;
  readonly navigation:NavigationSurface={
    groundHeight:(x,z)=>farmHeight(x,z),
    hitsObstacle:(x,z,y)=>FARM_OBSTACLES.some(b=>y+PLAYER_HEAD_OFFSET>b.minY&&y-PLAYER_FOOT_OFFSET<b.maxY&&Math.hypot(Math.max(b.minX-x,0,x-b.maxX),Math.max(b.minZ-z,0,z-b.maxZ))<PLAYER_RADIUS),
    resolveVertical:(x,z,from,to)=>this.resolveVertical(x,z,from,to),isInside:(x,_y,z)=>Math.abs(x)<=20&&z>=-17&&z<=22,
    constrain:p=>{p.x=Math.max(-20,Math.min(20,p.x));p.z=Math.max(-17,Math.min(22,p.z));p.y=Math.max(.94,p.y);},
    waterLevel:waveHeight,dynamicObstacles:()=>this.boat.collisionBoxes,
  };
  constructor(loader?:ModelLoader){this.assets=new FarmAssets(loader);this.models=new FarmModels(this.assets);this.root.name='FarmWorld';this.boat.anchor(-2.55,14.5);this.root.add(this.ocean,new FarmTerrain(),this.models,this.assets.sources,this.boat);this.interaction.setTargets([{id:'farm_boat',name:'登船',action:'TRAVEL',x:-3.25,y:4.44,z:14.5,range:1.4}]);}
  load(){return this.loading??=this.loadModels();}
  private async loadModels(){await this.assets.load();if(this.disposed)return;this.models.build();this.boat.setModel(this.assets.instance('transport_boat'));this.root.userData.modelsReady=true;}
  enter(){}
  prepare(c:WorldUpdateContext){this.boat.update(c.time,c.storm);}
  update(c:WorldUpdateContext){this.ocean.update(c.time,c.storm,c.dayTime);this.boat.update(c.time,c.storm);this.models.update(c.time);}
  leave({gameTime}:WorldLeaveContext){return {lastSimulatedGameTime:gameTime,discoveries:[]};}
  dispose(){this.disposed=true;this.assets.cancel();disposeWorld(this.root);}
  getSpawnPoint(id='farm_dock_arrival'):SpawnPoint{return {id,position:[-4,4.44,14.5],lookAt:[-4,4.5,5]};}
  applyQuality(quality:Quality){this.ocean.applyQuality(quality);}
  private resolveVertical(x:number,z:number,from:number,to:number){
    let result=to;
    const clip=(min:number,max:number)=>{if(to>from&&from+PLAYER_HEAD_OFFSET<=min&&to+PLAYER_HEAD_OFFSET>min)result=Math.min(result,min-PLAYER_HEAD_OFFSET);if(to<from&&from-PLAYER_FOOT_OFFSET>=max&&to-PLAYER_FOOT_OFFSET<max)result=Math.max(result,max+PLAYER_FOOT_OFFSET);};
    for(const s of FARM_SURFACES)if(x>=s.minX&&x<=s.maxX&&z>=s.minZ&&z<=s.maxZ)clip(s.top-.12,s.top);
    for(const b of FARM_OBSTACLES)if(x>b.minX-PLAYER_RADIUS&&x<b.maxX+PLAYER_RADIUS&&z>b.minZ-PLAYER_RADIUS&&z<b.maxZ+PLAYER_RADIUS)clip(b.minY,b.maxY);
    return result;
  }
}
