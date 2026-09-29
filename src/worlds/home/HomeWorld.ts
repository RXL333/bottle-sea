import { Group } from 'three';
import { QUALITY } from '../../core/Renderer';
import type { Quality } from '../../core/Renderer';
import { World } from '../../world/World';
import { Bottle } from '../../world/bottle/Bottle';
import { Room } from '../../world/Room';
import { MicroAnimationSystem } from '../../systems/MicroAnimationSystem';
import { DiscoveryPulse } from '../../systems/DiscoveryPulse';
import { TravelOcean } from '../travel/TravelOcean';
import { PlayerTravelBoat } from '../travel/PlayerTravelBoat';
import { InteractionSystem,discoveryTargets } from '../../systems/InteractionSystem';
import type { GameWorld, SpawnPoint, WorldEnterContext, WorldLeaveContext, WorldUpdateContext } from '../types';
import { homeNavigation } from './HomeNavigation';
import { disposeWorld } from '../disposeWorld';
import { HomeModels } from './HomeModels';
import type { ModelLoader } from '../farm/FarmAssets';
export class HomeWorld implements GameWorld {
  readonly id='HOME' as const;
  readonly boat=new PlayerTravelBoat();
  readonly root=new Group();
  private readonly world=new World();
  private readonly departureSea=new TravelOcean();
  private readonly bottle=new Bottle();
  private readonly room=new Room();
  private readonly micro=new MicroAnimationSystem();
  private pulse=new DiscoveryPulse(this.world);
  private readonly models:HomeModels;private pending?:Promise<void>;private disposed=false;
  readonly interaction=new InteractionSystem();
  readonly navigation=homeNavigation(()=>[...this.world.ship.collisionBoxes,...this.boat.collisionBoxes],()=>this.models.colliders);
  constructor(loader?:ModelLoader){this.models=new HomeModels(loader);this.root.name='HomeWorld';this.departureSea.visible=false;this.root.add(this.departureSea);this.root.add(this.room,this.bottle,this.world,this.micro,this.boat,this.models);this.boat.anchor(.65,2.35,-Math.PI/2);this.boat.departureDistance=.8;this.interaction.setTargets([...discoveryTargets,{id:'home_boat',name:'登船',action:'TRAVEL',x:.65,y:4.12,z:1.82,range:.72}]);}
  load(){return this.pending??=this.loadModels();}
  private async loadModels(){await this.models.load();if(this.disposed)return;this.models.build(this.world);this.boat.setModel(this.models.instance('launch'));this.pulse=new DiscoveryPulse(this.world);}
  enter({state}:WorldEnterContext){this.interaction.restore(state.discoveries);}
  prepare(context:WorldUpdateContext){this.world.prepareShip(context.time,context.storm);this.boat.update(context.time,context.storm);}
  update(c:WorldUpdateContext){
    if(this.departureSea.visible)this.departureSea.update(c.time,c.storm,c.dayTime);this.boat.update(c.time,c.storm);this.world.update(c.time,c.storm,c.dayTime,c.player);this.bottle.update(c.time,c.storm,c.flash);
    this.world.island.house.setNight(c.night);this.world.island.lighthouse.update(c.time,c.night,c.storm);
    this.micro.update(c.time,c.night,c.storm);this.pulse.update(c.delta);
    this.models.update(c.night);
  }
  triggerDiscovery(id:string){this.pulse.trigger(id);}
  setTravelPresentation(active:boolean){this.departureSea.visible=active;this.world.ocean.visible=!active;this.room.visible=!active;this.bottle.visible=!active;this.micro.visible=!active;}
  getFocusPosition(){return this.world.ship.position;}
  leave({gameTime}:WorldLeaveContext){return {lastSimulatedGameTime:gameTime,discoveries:[...this.interaction.discovered]};}
  dispose(){this.disposed=true;this.models.cancel();disposeWorld(this.root);}
  getSpawnPoint(id='home_dock_arrival'):SpawnPoint{return {id,position:[.65,4.12,1.87],lookAt:[-.65,4.8,-.4]};}
  applyQuality(quality:Quality){const settings=QUALITY[quality];this.departureSea.applyQuality(quality);this.world.ocean.create(settings.waterStep);this.world.fish.setCount(settings.fish);this.world.wake.setDensity(settings.waterStep);this.micro.setDensity(settings.waterStep);}
}
