import { DynamicDrawUsage,Group,InstancedMesh,MeshStandardMaterial,Object3D,Vector3 } from 'three';
import { cubeGeometry } from '../utils/voxel';
import { WATER_LEVEL } from '../world/ocean/WaveMath';

export class WaterCrossing {
  underwater=false;private initialized=false;
  reset(){this.initialized=false;this.underwater=false;}
  update(y:number):'enter'|'leave'|undefined{
    if(!this.initialized){this.initialized=true;this.underwater=y<WATER_LEVEL;return;}
    if(!this.underwater&&y<WATER_LEVEL-.025){this.underwater=true;return 'enter';}
    if(this.underwater&&y>WATER_LEVEL+.025){this.underwater=false;return 'leave';}
  }
}
export class WaterEntrySystem extends Group {
  readonly crossing=new WaterCrossing();onEnter=()=>{};onLeave=()=>{};
  entries=0;leaves=0;
  private mesh=new InstancedMesh(cubeGeometry,new MeshStandardMaterial({color:'#b9efdf',transparent:true,opacity:.7,depthWrite:false,roughness:1}),80);
  private data=new Float32Array(80*7);private cursor=0;private time=0;private bubbleTimer=0;private density=20;
  private previous=new Vector3();private dummy=new Object3D();
  constructor(){super();this.name='WaterEntry';for(let i=0;i<80;i++)this.data[i*7+3]=-100;this.mesh.count=0;this.mesh.frustumCulled=false;this.mesh.renderOrder=4;this.mesh.instanceMatrix.setUsage(DynamicDrawUsage);this.add(this.mesh);}
  setDensity(step:number){this.density=step>.2?12:step<.15?28:20;}
  update(delta:number,position:Vector3,active:boolean,swimming:boolean,sprint:boolean){
    this.time+=delta;
    if(active){
      const edge=this.crossing.update(position.y);
      if(edge==='enter'){this.entries++;this.onEnter();for(let i=0;i<this.density;i++)this.emit(position.x,WATER_LEVEL,position.z,i/this.density*Math.PI*2,0);}
      if(edge==='leave'){this.leaves++;this.onLeave();}
      this.bubbleTimer+=delta;
      if(swimming&&position.distanceToSquared(this.previous)>.000001&&this.bubbleTimer>(sprint?.16:.35)){
        this.bubbleTimer=0;this.emit(position.x+.14,position.y-.2,position.z+.12,this.time*2,1);
      }
    }else this.crossing.reset();
    this.previous.copy(position);let count=0;
    for(let i=0;i<80;i++){
      const j=i*7,age=this.time-this.data[j+3],bubble=this.data[j+6]===1,life=bubble?1.2:.8;
      if(age<0||age>=life)continue;
      const y=this.data[j+1]+(bubble?age*.28:age*.75-age*age*.95);
      if(bubble&&y>WATER_LEVEL)continue;
      this.dummy.position.set(this.data[j]+this.data[j+4]*age,y,this.data[j+2]+this.data[j+5]*age);
      this.dummy.scale.setScalar((bubble?.022:.044)*(1-age/life));this.dummy.updateMatrix();this.mesh.setMatrixAt(count++,this.dummy.matrix);
    }
    this.mesh.count=count;this.mesh.instanceMatrix.needsUpdate=true;
  }
  private emit(x:number,y:number,z:number,angle:number,kind:number){const j=(this.cursor++%80)*7;this.data[j]=x;this.data[j+1]=y;this.data[j+2]=z;this.data[j+3]=this.time;this.data[j+4]=Math.cos(angle)*(kind?.025:.3);this.data[j+5]=Math.sin(angle)*(kind?.025:.3);this.data[j+6]=kind;}
}
