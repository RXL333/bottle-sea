import { Group } from 'three';
import { seededRandom,VoxelBatch } from '../../utils/voxel';
import { FARM_SURFACES } from './FarmLayout';
export const FARM_FIELDS=[{x:-8,z:1,width:5,depth:7},{x:0,z:1,width:5,depth:7},{x:8,z:1,width:5,depth:7}] as const;
export const FARM_DOCK={x:-4,z:13,minX:-4.954,maxX:-3.046,minZ:8.56,maxZ:15.49,top:4};
export function farmLand(x:number,z:number){return Math.abs(x)<13&&Math.abs(z)<10&&Math.hypot(Math.max(0,Math.abs(x)-10),Math.max(0,Math.abs(z)-7))<3;}
export function farmHeight(x:number,z:number){let top=farmLand(x,z)?4:.5;for(const s of FARM_SURFACES)if(x>=s.minX&&x<=s.maxX&&z>=s.minZ&&z<=s.maxZ)top=Math.max(top,s.top);return top;}
export class FarmTerrain extends Group {
  constructor(){super();this.name='FarmTerrain';const b=new VoxelBatch(),random=seededRandom(813);
    for(let x=-12.5;x<13;x++)for(let z=-9.5;z<10;z++)if(farmLand(x,z)){const top=4;b.add(random()>.5?'#778477':'#899083',x,3.15,z,1,1.3,1);b.add(random()>.5?'#668b42':'#719545',x,(3.8+top)/2,z,1,top-3.8,1);b.add('#a69a73',x,3.73,z,1,.14,1);}
    // Wide central lane and cross-lane: future vehicle turning space, not garden paths.
    b.add('#b5a075',-4,4.015,1,2.5,.03,17);b.add('#b5a075',0,4.016,6.3,24,.032,2.5);b.add('#b5a075',0,4.016,-4,24,.032,2.5);
    for(const field of FARM_FIELDS){b.add(field.x===8?'#73974b':'#73553a',field.x,4.028,field.z,field.width,.055,field.depth);if(field.x!==8)for(let i=0;i<12;i++)b.add(i%2?'#886446':'#916e4c',field.x-field.width/2+.2+i*.4,4.06,field.z,.16,.035,field.depth-.3);}
    b.build(this);
  }
}
