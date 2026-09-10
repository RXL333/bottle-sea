import { Group } from 'three';
import { VoxelBatch } from '../utils/voxel';
import { waveHeight } from './ocean/WaveMath';
export class Details extends Group {
  private buoys:Group[]=[];private birds:Group[]=[];
  constructor(){super();for(const x of [-3.6,2.6]){const g=new Group(),b=new VoxelBatch();b.add('#755137',0,0,0,.17,.12,.17);b.add('#e1d7b7',0,.11,0,.075,.19,.075);b.add('#bd5140',0,.22,0,.1,.07,.1);b.build(g);g.position.set(x,3.3,-1.7);this.buoys.push(g);this.add(g);}
    for(let i=0;i<4;i++){const g=new Group(),b=new VoxelBatch();b.add('#d2d7c7',0,0,0,.09,.035,.05);b.add('#d2d7c7',-.075,.025,0,.09,.025,.035,0,-.3);b.add('#d2d7c7',.075,.025,0,.09,.025,.035,0,.3);b.build(g);this.birds.push(g);this.add(g);}
  }
  update(time:number,storm:number){for(const buoy of this.buoys)buoy.position.y=waveHeight(buoy.position.x,buoy.position.z,time,storm);for(let i=0;i<this.birds.length;i++){const bird=this.birds[i],a=time*.18+i*1.5;bird.visible=storm<.5;bird.position.set(Math.cos(a)*3.6,5.15+Math.sin(a*2)*.1,Math.sin(a)*.7);bird.rotation.y=-a;}}
}
