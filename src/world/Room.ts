import { Group } from 'three';
import { VoxelBatch, seededRandom } from '../utils/voxel';

export class Room extends Group {
  constructor() {
    super(); this.name = 'Room';
    const b = new VoxelBatch(); const random = seededRandom(41);
    b.add('#1d3037', 0, 7, -7, 80, 25, .3);
    b.add('#3a2b23', 0, -.45, 0, 36, .8, 22);
    for (let z = -10; z < 11; z += .62) {
      b.add(['#61452f','#634831','#5b402e','#57402f'][Math.floor(random()*4)], 0, -.025, z, 36, .13, .6);
      for(let j=0;j<28;j++) b.add(random()>.5?'#6b4e36':'#59412d', random()*36-18, .065, z+(random()-.5)*.5, .4+random()*2.5, .008, .012+random()*.015);
    }
    // A subdued window silhouette, no detailed room to distract from the bottle.
    b.add('#223b43', -10, 6.5, -6.78, 5, 5.4, .03);
    for(const x of [-12.5,-10,-7.5]) b.add('#182a31', x, 6.5, -6.72, .15, 5.8, .12);
    for(const y of [3.7,6.4,9.3]) b.add('#182a31', -10, y, -6.72, 5.3, .15, .12);
    // Book with layered paper, brass corners and a restrained embossed cover.
    b.add('#1e3b32', -8.8, .37, 3, 3.3, .65, 2.2, -.12);
    b.add('#b0a079', -8.8, .38, 3.06, 3.05, .42, 2.14, -.12);
    for(const y of [.08,.67]) b.add('#294737', -8.8, y, 3, 3.34, .12, 2.25, -.12);
    for(let i=0;i<7;i++) b.add('#847355', -8.8, .2+i*.05, 4.13, 2.7, .012, .02, -.12);
    b.add('#796d46', -8.8, .74, 3.05, .8, .02, .7, -.12);
    b.add('#86603b', -5.8, .2, 4.3, .55, .35, .48, .18);
    // Parchment and its two rolled ends.
    b.add('#b8a174', 8.5, .14, 3.3, 3.3, .09, 1.25, -.18);
    for(const x of [6.85,10.15]) b.add('#aa8d5a', x, .25, 3.3, .32, .36, 1.3, -.18);
    for(let i=0;i<22;i++) b.add('#826b46', 7.2+random()*2.5, .195, 2.85+random()*.8, random()*.4+.07, .01, .04);
    b.add('#615c49', -9.7, .6, -1.4, 1.1, 1.2, 1.1);
    b.add('#333727', -9.7, 1.22, -1.4, .9, .1, .9);
    for(let i=0;i<6;i++) {
      const x=-9.7+(random()-.5)*.8,z=-1.4+(random()-.5)*.6,h=.8+random()*1.5;
      b.add('#425833',x,1.2+h/2,z,.12,h,.12);
      for(let k=0;k<3;k++) b.add(['#3c632d','#557632','#344c2a'][k],x+(k-1)*.35,1.2+h-k*.14,z,.55,.22,.38);
    }
    b.build(this);
  }
}

