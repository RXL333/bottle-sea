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
export class HomeWorld implements GameWorld {
  readonly id='HOME' as const;
  readonly boat=new PlayerTravelBoat();
  readonly root=new Group();
  private readonly world=new World();
  private readonly departureSea=new TravelOcean();
  private readonly bottle=new Bottle();
  private readonly room=new Room();
  private readonly micro=new MicroAnimationSystem();
  private readonly pulse=new DiscoveryPulse(this.world);
  readonly interaction=new InteractionSystem();
  private readonly obstacles=[...this.world.ship.collisionBoxes,...this.boat.collisionBoxes];
  readonly navigation=homeNavigation(()=>this.obstacles);
  constructor(){this.root.name='HomeWorld';this.departureSea.visible=false;this.root.add(this.departureSea);this.root.add(this.room,this.bottle,this.world,this.micro,this.boat);this.boat.anchor(.65,2.25,-Math.PI/2);this.boat.departureDistance=.8;this.interaction.setTargets([...discoveryTargets,{id:'home_boat',name:'登船',action:'TRAVEL',x:.65,y:4.12,z:1.82,range:.72}]);}
  load(){}
  enter({state}:WorldEnterContext){this.interaction.restore(state.discoveries);}
  prepare(context:WorldUpdateContext){this.world.prepareShip(context.time,context.storm);this.boat.update(context.time,context.storm);}
  update(c:WorldUpdateContext){
    if(this.departureSea.visible)this.departureSea.update(c.time,c.storm,c.dayTime);this.boat.update(c.time,c.storm);this.world.update(c.time,c.storm,c.dayTime,c.player);this.bottle.update(c.time,c.storm,c.flash);
    this.world.island.house.setNight(c.night);this.world.island.lighthouse.update(c.time,c.night,c.storm);
    this.micro.update(c.time,c.night,c.storm);this.pulse.update(c.delta);
  }
  triggerDiscovery(id:string){this.pulse.trigger(id);}
  setTravelPresentation(active:boolean){this.departureSea.visible=active;this.world.ocean.visible=!active;this.room.visible=!active;this.bottle.visible=!active;this.micro.visible=!active;}
  getFocusPosition(){return this.world.ship.position;}
  leave({gameTime}:WorldLeaveContext){return {lastSimulatedGameTime:gameTime,discoveries:[...this.interaction.discovered]};}
  dispose(){disposeWorld(this.root);}
  getSpawnPoint(id='home_dock_arrival'):SpawnPoint{return {id,position:[.65,4.12,1.87],lookAt:[-.65,4.8,-.4]};}
  applyQuality(quality:Quality){const settings=QUALITY[quality];this.departureSea.applyQuality(quality);this.world.ocean.create(settings.waterStep);this.world.fish.setCount(settings.fish);this.world.wake.setDensity(settings.waterStep);this.micro.setDensity(settings.waterStep);}
}
