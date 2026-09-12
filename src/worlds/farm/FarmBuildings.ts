import { Group } from 'three';
import { VoxelBatch } from '../../utils/voxel';
export interface FarmObstacle {minX:number;maxX:number;minZ:number;maxZ:number;minY:number;maxY:number}
export const FARM_OBSTACLES:FarmObstacle[]=[{minX:3.5,maxX:10.5,minZ:-8.5,maxZ:-5,minY:4,maxY:8},{minX:-10,maxX:-6,minZ:-8.5,maxZ:-5,minY:4,maxY:7}];
export class FarmBuildings extends Group {
  constructor(){super();this.name='FarmBuildings';const b=new VoxelBatch();
    // Closed barn shell: no production or interior gameplay in this phase.
    b.add('#994a37',7,5.25,-6.75,7,2.5,3.5);b.add('#d4bd87',7,4.15,-4.98,7.2,.3,.08);
    for(let x=3.7;x<10.5;x+=.35)b.add('#ad5840',x,5.35,-4.98,.08,2.3,.08);
    b.add('#644d34',7,5.08,-4.9,2.6,2.15,.1);for(const x of [5.65,8.35])b.add('#e3d4a6',x,5.1,-4.81,.14,2.4,.12);b.add('#e3d4a6',7,6.26,-4.81,2.84,.14,.12);
    for(let i=0;i<6;i++)b.add(i%2?'#424e4c':'#4e5a56',7,6.52+i*.2,-6.75,7.5,.23,4-i*.55);
    b.add('#dbd0a5',-8,5,-6.75,4,2,3.5);for(let i=0;i<5;i++)b.add(i%2?'#a45b36':'#b16a3b',-8,6.1+i*.18,-6.75,4.5,.2,3.9-i*.7);
    b.add('#644b30',-8,4.8,-4.96,.7,1.6,.08);for(const x of [-9.2,-6.8])b.add('#e5c878',x,5.15,-4.96,.6,.65,.08);
    for(const [x,z] of [[-11,7],[11,7],[-11,-2],[11,-2],[-1,-8],[2,-8]]){b.add('#705135',x,4.8,z,.35,1.6,.35);b.add('#426c3b',x,5.8,z,1.8,1.1,1.7);b.add('#628448',x-.25,6.5,z,1.3,.45,1.3);}
    // Fence segments stop at lane openings.
    for(const side of [-1,1])for(let z=-3;z<=6;z+=1.5){const x=side*12;b.add('#987749',x,4.4,z,.12,.8,.12);if(z<6)b.add('#b69a65',x,4.5,z+.7,.08,.1,1.4);}
    b.build(this);
  }
}
// Tree collision is declared statically so repeated loads never append global obstacles.
for(const [x,z] of [[-11,7],[11,7],[-11,-2],[11,-2],[-1,-8],[2,-8]])FARM_OBSTACLES.push({minX:x-.2,maxX:x+.2,minZ:z-.2,maxZ:z+.2,minY:4,maxY:6.8});
for(const side of [-1,1])FARM_OBSTACLES.push({minX:side*12-.1,maxX:side*12+.1,minZ:-3,maxZ:6,minY:4,maxY:4.8});

for(const x of [-4.9,-3.1])for(const z of [10,12.5,15.5])FARM_OBSTACLES.push({minX:x-.12,maxX:x+.12,minZ:z-.12,maxZ:z+.12,minY:2,maxY:4.23});
