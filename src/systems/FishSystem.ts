import { Color, DynamicDrawUsage, Group, InstancedMesh, Object3D, Vector3 } from 'three';
import { cubeGeometry,voxelMaterial,seededRandom } from '../utils/voxel';

export class FishSystem extends Group {
  private mesh:InstancedMesh;private dummy=new Object3D();private randoms:number[]=[];
  private parts=[[0,0,0,.19,.095,.065],[-.125,0,0,.08,.13,.027],[.08,.025,.037,.022,.022,.01],[0,0,0,.035,.1,.07]];
  constructor(private fishCount=32) {
    super();const random=seededRandom(708);this.mesh=new InstancedMesh(cubeGeometry,voxelMaterial,fishCount*4);this.mesh.instanceMatrix.setUsage(DynamicDrawUsage);this.mesh.frustumCulled=false;
    const color=new Color();
    for(let i=0;i<fishCount;i++) {
      this.randoms.push(random()*Math.PI*2,random(),random());
      for(let p=0;p<4;p++)this.mesh.setColorAt(i*4+p,color.set(p===2?'#203f3c':p===3?'#e4d8aa':['#cf8044','#d5b74a','#4295b7'][i%3]));
    }
    this.add(this.mesh);this.update(0);
  }
  update(time:number,player?:Vector3) {
    for(let i=0;i<this.fishCount;i++) {
      const phase=this.randoms[i*3],angle=time*.18+phase;
      const scatter=Math.max(0,Math.sin(time*.16))**8;
      let x=Math.sin(angle)*(3.1+this.randoms[i*3+1]*1.5),z=.25+Math.cos(angle)*(.5+this.randoms[i*3+2]*.65)+Math.sin(phase*3)*scatter*.22;
      const y=2.15+this.randoms[i*3+1]*.72+Math.sin(time*.6+phase)*.05;
      if(player){const dx=x-player.x,dz=z-player.z,d=Math.hypot(dx,dz,y-player.y);if(d<.8&&d>.001){const push=(.8-d)*.45;x+=dx/d*push;z+=dz/d*push;}}
      const yaw=Math.cos(angle)>0?0:Math.PI;
      for(let p=0;p<4;p++) {
        const part=this.parts[p];this.dummy.position.set(x+part[0]*Math.cos(yaw),y+part[1],z+part[2]);this.dummy.scale.set(part[3],part[4],part[5]);this.dummy.rotation.set(0,yaw+(p===1?Math.sin(time*7+phase)*.28:0),0);this.dummy.updateMatrix();this.mesh.setMatrixAt(i*4+p,this.dummy.matrix);
      }
    }
    this.mesh.instanceMatrix.needsUpdate=true;
  }
  setCount(count:number) {this.fishCount=Math.min(count,this.randoms.length/3);this.mesh.count=this.fishCount*4;}
}

