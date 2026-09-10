import { BufferGeometry, Float32BufferAttribute, Group, LineBasicMaterial, LineSegments } from 'three';
import { seededRandom } from '../utils/voxel';
export class LightningSystem extends Group {
  flash=0;private next=2.5;private end=0;private random=seededRandom(923);
  constructor(){super();const points:number[]=[];let x=0,y=5.5;for(let i=0;i<8;i++){const nx=x+(i%2?-.2:.28),ny=y-.23;points.push(x,y,-.1,nx,ny,-.1);x=nx;y=ny;}points.push(.28,4.81,-.1,.7,4.6,-.1,.7,4.6,-.1,.8,4.2,-.1);
    const geo=new BufferGeometry();geo.setAttribute('position',new Float32BufferAttribute(points,3));this.add(new LineSegments(geo,new LineBasicMaterial({color:'#d6e8ff',transparent:true,opacity:.95,depthWrite:false})));this.visible=false;
  }
  update(time:number,intensity:number){
    if(intensity<.4){this.visible=false;this.flash=0;this.next=time+2;return;}
    if(time>=this.next){this.end=time+.16;this.next=time+2+this.random()*4;this.position.x=this.random()>.5?-3.8:3.6;}
    const remaining=this.end-time;this.visible=remaining>0;this.flash=this.visible?(remaining>.09?1:.45):0;
  }
}
