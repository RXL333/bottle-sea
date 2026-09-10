import { BufferGeometry, Float32BufferAttribute, Group, Points, PointsMaterial } from 'three';
import { seededRandom } from '../utils/voxel';

export class BubbleSystem extends Group {
  private positions=new Float32Array(110*3);private seeds=new Float32Array(110*3);private geometry=new BufferGeometry();
  constructor() {
    super();const random=seededRandom(912);
    for(let i=0;i<this.seeds.length;i+=3){this.seeds[i]=random()*10-5;this.seeds[i+1]=random();this.seeds[i+2]=random()*2.7-1.35;}
    this.geometry.setAttribute('position',new Float32BufferAttribute(this.positions,3));
    const points=new Points(this.geometry,new PointsMaterial({color:'#b0e5d7',size:.035,transparent:true,opacity:.65,depthWrite:false}));points.frustumCulled=false;points.renderOrder=4;this.add(points);this.update(0);
  }
  update(time:number) {
    const a=this.geometry.attributes.position;
    for(let i=0;i<this.seeds.length;i+=3){a.setXYZ(i/3,this.seeds[i]+Math.sin(time+this.seeds[i])*.035,1.8+((time*.14+this.seeds[i+1]*1.4)%1.4),this.seeds[i+2]);}
    a.needsUpdate=true;
  }
}
