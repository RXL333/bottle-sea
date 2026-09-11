import { describe,expect,it } from 'vitest';
import { obbIntersectsAabb,sampleShipPath } from './ShipPath';
import { sampleBuoyancy } from './Buoyancy';
import { insideBottle } from '../bottle/Bounds';
import { islandHeight } from '../island/Island';
import { DOCK } from '../island/Dock';
import { TERRAIN_CELLS } from '../island/TerrainData';

describe('ship path clearance',()=>{
  it.each([0,1])('keeps the complete calm/storm envelope clear for two circuits',storm=>{
    const period=Math.PI*2/.065,state={height:0,pitch:0,roll:0};let bottleClear=true,dockClear=true,islandClear=true;
    for(let time=0;time<period*2;time+=period/1440){const pose=sampleShipPath(time);sampleBuoyancy(pose.x,pose.z,pose.yaw,time,storm,state);const c=Math.cos(pose.yaw),s=Math.sin(pose.yaw);
      dockClear&&=!obbIntersectsAabb(pose.x,pose.z,.34,.6,pose.yaw,DOCK.minX,DOCK.maxX,DOCK.minZ,DOCK.maxZ,.05);for(const cell of TERRAIN_CELLS)islandClear&&=!obbIntersectsAabb(pose.x,pose.z,.34,.6,pose.yaw,cell.minX,cell.maxX,cell.minZ,cell.maxZ,.05);
      for(const [lx,ly,lz] of [[-.34,-.1,-.6],[.34,-.1,-.6],[-.34,.4,.6],[.34,.4,.6],[-.08,1.62,-.55],[.08,1.62,.78]] as const){const x=pose.x+c*lx+s*lz,z=pose.z-s*lx+c*lz,y=state.height+.015+ly;bottleClear&&=insideBottle(x,y,z,.04);if(y<4)islandClear&&=islandHeight(x,z)===0;dockClear&&=!(x<DOCK.maxX+.08&&z>DOCK.minZ-.08&&z<DOCK.maxZ+.08);}
    }
    expect({bottleClear,dockClear,islandClear}).toEqual({bottleClear:true,dockClear:true,islandClear:true});
  });
  it('has continuous speed and closes without a seam',()=>{const period=Math.PI*2/.065,a=sampleShipPath(0),b=sampleShipPath(period);expect(Math.hypot(a.x-b.x,a.z-b.z)).toBeLessThan(1e-9);let previous=a;for(let t=.1;t<period;t+=.1){const next=sampleShipPath(t),distance=Math.hypot(next.x-previous.x,next.z-previous.z);expect(distance).toBeGreaterThan(.003);expect(distance).toBeLessThan(.006);previous=next;}});
});
