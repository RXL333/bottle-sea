import { expect,it } from 'vitest';
import { Vector3 } from 'three';
import { FarmWorld } from './FarmWorld';
import { FARM_FIELDS } from './FarmTerrain';
import { FARM_OBSTACLES } from './FarmBuildings';
it('provides a safe dock and independent navigable terrain with three vehicle-scale fields',()=>{const world=new FarmWorld(),spawn=world.getSpawnPoint(),p=new Vector3().fromArray(spawn.position);expect(world.navigation.groundHeight(p.x,p.z,p.y-.44)).toBeCloseTo(p.y-.44);expect(world.navigation.hitsObstacle(p.x,p.z,p.y)).toBe(false);expect(world.navigation.isInside(...spawn.position)).toBe(true);expect(FARM_FIELDS).toHaveLength(3);for(const f of FARM_FIELDS){expect(f.width).toBeGreaterThanOrEqual(5);expect(f.depth).toBeGreaterThanOrEqual(7);}expect(world.navigation.hitsObstacle(7,-6,4.44)).toBe(true);p.set(100,4,-100);world.navigation.constrain(p);expect(world.navigation.isInside(p.x,p.y,p.z)).toBe(true);world.dispose();});
it('does not grow global collision or discovery state on repeated creation',()=>{const length=FARM_OBSTACLES.length;for(let i=0;i<10;i++){const world=new FarmWorld();world.interaction.update(new Vector3(-4,4.44,14.5));expect(world.interaction.nearest?.action).toBe('TRAVEL');world.interaction.interact();expect(world.interaction.discovered.size).toBe(0);world.dispose();}expect(FARM_OBSTACLES).toHaveLength(length);});
