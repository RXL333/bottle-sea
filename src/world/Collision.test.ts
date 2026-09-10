import { describe,expect,it } from 'vitest';
import { hitsWorldObstacle } from './Collision';

describe('world collision volumes',()=>{
  it('blocks the camera from entering major solid voxel props',()=>{
    for(const point of [
      [-1.8,1.1,2.1],[-3.65,.65,2.2],[2.8,.4,2.2],[1.25,-.8,2],
      [.24,.77,3.1],[-2.19,-.22,4.3],[-1.5,-.2,4.3],[.35,-.28,4.3],
    ] as const)expect(hitsWorldObstacle(point[0],point[1],point[2])).toBe(true);
  });
  it('keeps intended passages open',()=>{
    expect(hitsWorldObstacle(.65,1.3,2.6)).toBe(false);
    expect(hitsWorldObstacle(3.22,.4,2.4)).toBe(false);
    expect(hitsWorldObstacle(-1.8,.35,2.1)).toBe(false);
  });
});
