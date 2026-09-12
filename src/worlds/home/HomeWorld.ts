import { Group } from 'three';
import { QUALITY } from '../../core/Renderer';
import type { Quality } from '../../core/Renderer';
import { World } from '../../world/World';
import { Bottle } from '../../world/bottle/Bottle';
import { Room } from '../../world/Room';
import { MicroAnimationSystem } from '../../systems/MicroAnimationSystem';
import { DiscoveryPulse } from '../../systems/DiscoveryPulse';
import { InteractionSystem } from '../../systems/InteractionSystem';
import type { GameWorld, SpawnPoint, WorldEnterContext, WorldLeaveContext, WorldUpdateContext } from '../types';
import { homeNavigation } from './HomeNavigation';
import { disposeWorld } from '../disposeWorld';
export class HomeWorld implements GameWorld {
  readonly id='HOME' as const;
  readonly root=new Group();
  private readonly world=new World();
  private readonly bottle=new Bottle();
  private readonly micro=new MicroAnimationSystem();
  private readonly pulse=new DiscoveryPulse(this.world);
  readonly interaction=new InteractionSystem();
  readonly navigation=homeNavigation(()=>this.world.ship.collisionBoxes);
  constructor(){this.root.name='HomeWorld';this.root.add(new Room(),this.bottle,this.world,this.micro);}
  load(){}
  enter({state}:WorldEnterContext){this.interaction.restore(state.discoveries);}
  prepare(context:WorldUpdateContext){this.world.prepareShip(context.time,context.storm);}
  update(c:WorldUpdateContext){
    this.world.update(c.time,c.storm,c.dayTime,c.player);this.bottle.update(c.time,c.storm,c.flash);
    this.world.island.house.setNight(c.night);this.world.island.lighthouse.update(c.time,c.night,c.storm);
    this.micro.update(c.time,c.night,c.storm);this.pulse.update(c.delta);
  }
  triggerDiscovery(id:string){this.pulse.trigger(id);}
  getFocusPosition(){return this.world.ship.position;}
  leave({gameTime}:WorldLeaveContext){return {lastSimulatedGameTime:gameTime,discoveries:[...this.interaction.discovered]};}
  dispose(){disposeWorld(this.root);}
  getSpawnPoint(id='home_dock_arrival'):SpawnPoint{return {id,position:[.65,4.12,1.87],lookAt:[-.65,4.8,-.4]};}
  applyQuality(quality:Quality){const settings=QUALITY[quality];this.world.ocean.create(settings.waterStep);this.world.fish.setCount(settings.fish);this.world.wake.setDensity(settings.waterStep);this.micro.setDensity(settings.waterStep);}
}
