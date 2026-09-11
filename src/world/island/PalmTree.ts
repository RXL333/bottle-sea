import { VoxelBatch } from '../../utils/voxel';
import { Group } from 'three';

export function palmTree(b:VoxelBatch,x:number,y:number,z:number,height:number,rotation=0,crown?:Group) {
  const count=Math.ceil(height/.17),step=height/count;
  for(let i=0;i<count;i++) b.add(i%3===0?'#72502b':'#886033',x+i*.018,y+(i+.5)*step,z,.18,step-.002,.18);
  x+=(count-1)*.018;
  const leaves=crown?new VoxelBatch():b;
  if(crown){crown.position.set(x,y+height,z);x=0;y=-height;z=0;}
  leaves.add('#67502c',x,y+height,z,.32,.25,.3);
  for(let arm=0;arm<5;arm++) {
    const angle=arm*Math.PI*2/5+rotation;
    for(let j=1;j<5;j++) {
      const d=j*.17;
      leaves.add(['#4c8b35','#3b772a','#66963b'][j%3],x+Math.cos(angle)*d,y+height+.13-(j-1)*.09,z+Math.sin(angle)*d,.168,.14,.24,angle);
    }
  }
  if(crown)leaves.build(crown);
}
