import { describe,expect,it } from 'vitest';
import { hitsWorldObstacle,resolveDynamicOverlap,resolveVerticalCollision,supportHeightAt } from './Collision';
import { terrainCellAt,terrainCellsNear } from './island/TerrainData';
import { seabedCellAt } from './underwater/SeabedData';

describe('world collision volumes',()=>{
  it('sweeps through thin solids in both vertical directions',()=>{
    expect(resolveVerticalCollision(3.22,.4,2.5,3.5)).toBeCloseTo(2.76);
    expect(resolveVerticalCollision(-1.8,1.1,2.8,1.9)).toBeCloseTo(2.8);
    expect(resolveVerticalCollision(.65,1.3,3.2,4)).toBeCloseTo(3.46);
    expect(resolveVerticalCollision(2,1,2.5,3)).toBe(3);
  });
  it('blocks the camera from entering major solid voxel props',()=>{
    for(const point of [
      [-1.8,1.1,2.1],[-3.65,.65,2.2],[2.8,.4,2.2],[1.25,-.8,2],
      [.24,.77,3.1],[-2.19,-.22,4.3],[-1.5,-.2,4.3],[.35,-.28,4.3],
    ] as const)expect(hitsWorldObstacle(point[0],point[1],point[2])).toBe(true);
  });
  it('keeps intended passages open',()=>{
    expect(hitsWorldObstacle(.65,1.3,2.6)).toBe(false);
    expect(hitsWorldObstacle(3.22,.4,2.4)).toBe(false);
    expect(hitsWorldObstacle(-1.8,.35,2.25)).toBe(false);
  });
  it('uses the rendered terrain and seabed cells as collision truth',()=>{
    expect(hitsWorldObstacle(-2.7236001,-.5236,3.3)).toBe(true);
    const terrain=terrainCellAt(-2.7236001,-.5236)!;const support=supportHeightAt(terrain.x,terrain.z,terrain.top);expect(support).toBeGreaterThanOrEqual(terrain.top);expect(terrainCellsNear(terrain.x,terrain.z,.14).some(cell=>Math.abs(cell.top-support)<1e-6)).toBe(true);
    const bed=seabedCellAt(-5.21,-1.36)!;expect(bed.top).toBeGreaterThan(1.8);expect(hitsWorldObstacle(-5.21,-1.36,1.88)).toBe(true);
  });
  it('separates a player from a moving oriented ship proxy',()=>{const position={x:1,y:3.5,z:0};resolveDynamicOverlap(position,[{x:1,z:0,previousX:-1,previousZ:0,halfX:.3,halfZ:.55,minY:3.2,maxY:3.7,yaw:0,previousYaw:0}]);expect(Math.hypot(position.x-1,position.z)).toBeGreaterThan(.3);});
});
