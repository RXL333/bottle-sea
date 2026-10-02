import { BufferGeometry, Float32BufferAttribute, Group, LineBasicMaterial, LineSegments } from 'three';
import { seededRandom } from '../utils/voxel';
export class RainSystem extends Group {
  private farm=false;private rainCount=500;
  get diagnostics(){return {drops:this.rainCount,farm:this.farm,visible:this.visible};}
  configure(farm:boolean){this.farm=farm;}
  private geometry=new BufferGeometry();private seeds=new Float32Array(850*3);
  private rainMaterial=new LineBasicMaterial({color:'#a3ceda',transparent:true,opacity:.45,depthWrite:false});
  constructor(){super();const random=seededRandom(918);for(let i=0;i<this.seeds.length;i+=3){this.seeds[i]=random()*10.3-5.2;this.seeds[i+1]=random();this.seeds[i+2]=random()*2.6-1.3;}
    this.geometry.setAttribute('position',new Float32BufferAttribute(new Float32Array(850*6),3));const rain=new LineSegments(this.geometry,this.rainMaterial);rain.frustumCulled=false;rain.renderOrder=4;this.add(rain);this.setCount(this.rainCount);
  }
  setCount(count:number){this.rainCount=Math.max(0,Math.min(850,Math.floor(count)));this.geometry.setDrawRange(0,this.rainCount*2);}
  update(time:number,intensity:number,wind=.16){this.visible=intensity>.03;if(!this.visible)return;this.rainMaterial.opacity=intensity*(this.farm?.5:.4);const a=this.geometry.attributes.position;
    for(let n=0;n<this.rainCount;n++){const i=n*3,y=(this.farm?4:3.4)+(1-((this.seeds[i+1]+time*(this.farm?.9:1.3))%1))*(this.farm?12:2.1),length=this.farm?.52:.16;
      const x=this.seeds[i]*(this.farm?2.4:1)+(y-(this.farm?9:4.4))*(.03+wind*.33),z=this.seeds[i+2]*(this.farm?9:1);
      a.setXYZ(n*2,x,y,z);a.setXYZ(n*2+1,x-length*(.08+wind*.5),y-length,z-length*wind*.12);
    }a.needsUpdate=true;
  }
}
