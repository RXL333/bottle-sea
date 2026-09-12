import type { Scene } from 'three';
import type { Quality } from '../core/Renderer';
import { WorldStateRegistry, defaultWorldState } from '../state/WorldStateRegistry';
import { WorldRegistry } from './WorldRegistry';
import type { GameWorld, SpawnPoint, WorldId, WorldUpdateContext } from './types';
export type WorldManagerState = 'IDLE' | 'LOADING' | 'SWITCHING' | 'READY' | 'ERROR';
export class WorldManager {
  state: WorldManagerState='IDLE';
  currentWorld: GameWorld | null=null;
  private quality: Quality='MEDIUM';
  private pending=false;
  constructor(private scene: Scene, private registry: WorldRegistry, readonly states: WorldStateRegistry, private placePlayer: (spawn: SpawnPoint)=>void) {}
  get currentWorldId(){return this.currentWorld?.id??null;}
  async switchTo(id: WorldId, gameTime: number, spawnId?: string): Promise<GameWorld> {
    if(this.pending)throw new Error('World switch already in progress');
    if(this.currentWorldId===id&&this.state==='READY')return this.currentWorld!;
    this.pending=true;
    const old=this.currentWorld;
    let target: GameWorld | null=null;
    try {
      this.state=old?'SWITCHING':'LOADING';
      if(old){const snapshot=old.leave({gameTime});if(old.id!=='TRAVEL')this.states.set(old.id,snapshot);this.scene.remove(old.root);}
      this.state='LOADING';target=await this.registry.create(id);await target.load({gameTime});
      const spawn=target.getSpawnPoint(spawnId),state=id==='TRAVEL'?defaultWorldState():this.states.get(id);
      this.scene.add(target.root);target.enter({gameTime,state,spawn});target.applyQuality(this.quality);this.placePlayer(spawn);
      this.currentWorld=target;this.state='READY';old?.dispose();return target;
    } catch(error) {
      if(target){this.scene.remove(target.root);target.dispose();}
      // Keep a valid visible world while the caller presents an error and attempts HOME.
      this.currentWorld=old;this.state='ERROR';
      if(old){this.scene.add(old.root);old.enter({gameTime,state:old.id==='TRAVEL'?defaultWorldState():this.states.get(old.id),spawn:old.getSpawnPoint()});}
      throw error;
    } finally {this.pending=false;}
  }
  applyQuality(quality: Quality){this.quality=quality;this.currentWorld?.applyQuality(quality);}
  update(context: WorldUpdateContext){if(this.state==='READY')this.currentWorld?.update(context);}
}
