import type { GameWorld, WorldId } from './types';
export type WorldFactory = () => GameWorld | Promise<GameWorld>;
export class WorldRegistry {
  private factories = new Map<WorldId, WorldFactory>();
  register(id: WorldId, factory: WorldFactory) {
    if(this.factories.has(id))throw new Error(`World already registered: ${id}`);
    this.factories.set(id,factory);return this;
  }
  async create(id: WorldId): Promise<GameWorld> {
    const factory=this.factories.get(id);
    if(!factory)throw new Error(`World unavailable: ${id}`);
    const world=await factory();
    if(world.id!==id){world.dispose();throw new Error(`World factory mismatch: ${id}`);}
    return world;
  }
}
