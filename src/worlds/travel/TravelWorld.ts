import { Group } from 'three';
import { VoxelBatch } from '../../utils/voxel';
import type { Quality } from '../../core/Renderer';
import type { GameWorld,SpawnPoint,WorldLeaveContext,WorldUpdateContext } from '../types';
import { disposeWorld } from '../disposeWorld';
import { PlayerTravelBoat } from './PlayerTravelBoat';
import { TravelOcean } from './TravelOcean';
export class TravelWorld implements GameWorld {
  readonly id='TRAVEL' as const;readonly root=new Group();readonly boat=new PlayerTravelBoat();private ocean=new TravelOcean();
  constructor(){this.root.name='TravelWorld';this.root.add(this.ocean,this.boat);const b=new VoxelBatch();for(const [x,y,z] of [[-11,10,-18],[12,11,-23],[-7,8,24],[4,7.5,20]]){b.add('#c8d1c7',x,y,z,5,.45,1.5);b.add('#dce0d0',x+.4,y+.4,z,2.4,.4,1.3);}for(const x of [-6,5,12]){b.add('#cdd4c7',x,7,-10,.3,.045,.08,0,.2);b.add('#cdd4c7',x+.28,7,-10,.3,.045,.08,0,-.2);}b.build(this.root);}
  load(){} enter(){}
  update(c:WorldUpdateContext){this.ocean.update(c.time,c.storm,c.dayTime);this.boat.update(c.time,c.storm);}
  leave({gameTime}:WorldLeaveContext){return {lastSimulatedGameTime:gameTime,discoveries:[]};}
  dispose(){disposeWorld(this.root);}
  getSpawnPoint(id='travel'):SpawnPoint{return {id,position:[0,5,-3],lookAt:[0,3.6,1]};}
  applyQuality(quality:Quality){this.ocean.applyQuality(quality);}
}
