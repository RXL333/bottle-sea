import { BufferGeometry, Float32BufferAttribute, Group, LineBasicMaterial, LineSegments } from 'three';
import { seededRandom } from '../utils/voxel';
export class RainSystem extends Group {
  private geometry=new BufferGeometry();private seeds=new Float32Array(850*3);
  private rainMaterial=new LineBasicMaterial({color:'#a3ceda',transparent:true,opacity:.45,depthWrite:false});
  constructor(){super();const random=seededRandom(918);for(let i=0;i<this.seeds.length;i+=3){this.seeds[i]=random()*10.3-5.2;this.seeds[i+1]=random();this.seeds[i+2]=random()*2.6-1.3;}
    this.geometry.setAttribute('position',new Float32BufferAttribute(new Float32Array(850*6),3));const rain=new LineSegments(this.geometry,this.rainMaterial);rain.frustumCulled=false;rain.renderOrder=4;this.add(rain);
  }
  setCount(count:number){this.geometry.setDrawRange(0,Math.min(850,count)*2);}
  update(time:number,intensity:number){this.visible=intensity>.03;if(!this.visible)return;this.rainMaterial.opacity=intensity*.4;const a=this.geometry.attributes.position;
    for(let i=0;i<this.seeds.length;i+=3){const y=3.4+(1-((this.seeds[i+1]+time*1.3)%1))*2.1;const x=this.seeds[i]+(y-4.4)*.16,z=this.seeds[i+2];a.setXYZ(i/3*2,x,y,z);a.setXYZ(i/3*2+1,x-.05,y-.16,z);}a.needsUpdate=true;
  }
}
