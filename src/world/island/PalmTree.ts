import { VoxelBatch } from '../../utils/voxel';

export function palmTree(b:VoxelBatch,x:number,y:number,z:number,height:number,rotation=0) {
  const step=.17;
  for(let i=0;i<height/step;i++) b.add(i%3===0?'#72502b':'#886033',x+i*.018,y+i*step,z,.18,.18,.18);
  x+=height/step*.018;
  b.add('#67502c',x,y+height,z,.32,.25,.3);
  for(let arm=0;arm<5;arm++) {
    const angle=arm*Math.PI*2/5+rotation;
    for(let j=0;j<5;j++) {
      const d=j*.17;
      b.add(['#4c8b35','#3b772a','#66963b'][j%3],x+Math.cos(angle)*d,y+height+.13-Math.max(0,j-1)*.09,z+Math.sin(angle)*d,.28,.14,.24,angle);
    }
  }
}
