import { Group } from 'three';
import { VoxelBatch,seededRandom } from '../../utils/voxel';
import { anchor,treasureChest,ruins } from './Landmarks';
import { bottleRadiusAt } from '../bottle/Bounds';

export class UnderwaterWorld extends Group {
  constructor() {
    super();this.name='UnderwaterWorld';const b=new VoxelBatch();const random=seededRandom(601);
    for(let x=-5.45;x<4.75;x+=.24)for(let z=-1.36;z<1.4;z+=.24) {
      if(Math.abs(x+.2)>5.1&&Math.abs(z)>1)continue;
      const y=Math.max(1.62,3.72-Math.sqrt((bottleRadiusAt(x)-.16)**2-z*z))+Math.floor(random()*3)*.035;
      b.add(['#a4ac77','#bdba84','#8f9f73','#c4be8b'][Math.floor(random()*4)],x,y,z,.239,.16,.239);
      if(random()<.05)b.add('#647b68',x,y+.12,z,.16,.14,.17);
    }
    for(let i=0;i<90;i++) {
      const x=-5.3+random()*9.4,z=-1.2+random()*2.5;
      if((Math.abs(x+1.8)<.5&&z>.8)||(x>2.5&&x<4&&z>0))continue;
      const h=.18+random()*.55;
      for(let j=0;j<h/.12;j++) b.add(['#366746','#428752','#6b944f'][i%3],x+Math.sin(j*.9+i)*.04,1.79+j*.12,z,.07,.13,.07);
      if(i%3===0)b.add('#4a8251',x+.1,1.87+h*.4,z,.19,.08,.08);
    }
    for(let i=0;i<19;i++) {
      const x=-5+random()*9.1,z=.35+random()*.95,color=['#aa6686','#9a789f','#c27a68','#6f8ea0'][i%4];
      for(let arm=0;arm<4;arm++) {
        const h=.12+random()*.35;
        b.add(color,x+(arm-1.5)*.095,1.79+h/2,z+(arm%2)*.08,.09,h,.09);
        if(arm%2===0)b.add(color,x+(arm-1.5)*.095+.045,1.84+h*.45,z,.18,.08,.08);
      }
    }
    anchor(b);treasureChest(b);ruins(b);b.build(this);
  }
}


