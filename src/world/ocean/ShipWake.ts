import { DynamicDrawUsage, Group, InstancedMesh, MeshStandardMaterial, Object3D } from 'three';
import { cubeGeometry } from '../../utils/voxel';
import { waveHeight } from './WaveMath';
import { islandHeight } from '../island/Island';

export function wakeVisibility(age:number,lifetime=2.2){return age<0||age>=lifetime?0:Math.sin(Math.min(1,age/.12)*Math.PI/2)*(1-age/lifetime);}

/** Fixed ring buffer: 48–120 cubes, no Mesh creation during sailing. */
export class ShipWake extends Group {
  private mesh=new InstancedMesh(cubeGeometry,new MeshStandardMaterial({color:'#b9e3ce',transparent:true,opacity:.72,depthWrite:false,roughness:1}),120);
  private born=new Float64Array(120).fill(-100);private x=new Float32Array(120);private z=new Float32Array(120);
  private yaw=new Float32Array(120);private kind=new Uint8Array(120);private cursor=0;private last=-1;
  private dummy=new Object3D();private capacity=84;
  constructor(){super();this.name='ShipWake';this.mesh.frustumCulled=false;this.mesh.renderOrder=4;this.mesh.instanceMatrix.setUsage(DynamicDrawUsage);this.add(this.mesh);this.mesh.count=0;}
  setDensity(step:number){this.capacity=step>.2?48:step<.15?120:84;this.born.fill(-100);this.cursor=0;this.mesh.count=0;}
  update(time:number,storm:number,x:number,z:number,yaw:number){
    if(time<this.last){this.born.fill(-100);this.last=time;}
    if(time-this.last>.065){
      this.last=time;const s=Math.sin(yaw),c=Math.cos(yaw);
      for(let side=-1;side<=1;side+=2){
        this.emit(time,x-s*.46+c*side*.13,z-c*.46-s*side*.13,yaw,0);
        this.emit(time,x+s*.48+c*side*.13,z+c*.48-s*side*.13,yaw,1);
      }
    }
    let count=0;
    for(let i=0;i<this.capacity;i++){
      const age=time-this.born[i],bow=this.kind[i]===1,life=bow?.55:2.2,fade=wakeVisibility(age,life);
      if(fade<=0)continue;
      const drift=age*(.035+storm*.05),x=this.x[i]+Math.cos(this.yaw[i])*Math.sin(i*2.4)*drift,z=this.z[i]-Math.sin(this.yaw[i])*Math.sin(i*2.4)*drift;
      if(islandHeight(x,z)>3.45)continue;
      this.dummy.position.set(x,waveHeight(x,z,time,storm)+.068+storm*.024,z);
      this.dummy.rotation.y=this.yaw[i];this.dummy.scale.set((.07+age*.035)*fade,.012,(bow?.09:.15)*fade);
      this.dummy.updateMatrix();this.mesh.setMatrixAt(count++,this.dummy.matrix);
    }
    this.mesh.count=count;this.mesh.instanceMatrix.needsUpdate=true;
  }
  private emit(time:number,x:number,z:number,yaw:number,kind:number){const i=this.cursor++%this.capacity;this.born[i]=time;this.x[i]=x;this.z[i]=z;this.yaw[i]=yaw;this.kind[i]=kind;}
}
