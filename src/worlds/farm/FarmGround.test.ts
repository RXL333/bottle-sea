import { expect,it } from 'vitest';
import { farmGroundPatches,farmHeight } from './FarmTerrain';
import { rectBounds } from './FarmMap';
it('renders each painted top surface once across plaza and road intersections',()=>{
  const patches=farmGroundPatches();
  for(let i=0;i<patches.length;i++){
    const a=rectBounds(patches[i].rect);expect(patches[i].top).toBeCloseTo(farmHeight(patches[i].rect.x,patches[i].rect.z));
    for(let j=i+1;j<patches.length;j++){const b=rectBounds(patches[j].rect);expect(Math.min(a.maxX,b.maxX)>Math.max(a.minX,b.minX)+1e-6&&Math.min(a.maxZ,b.maxZ)>Math.max(a.minZ,b.minZ)+1e-6).toBe(false);}
  }
});
