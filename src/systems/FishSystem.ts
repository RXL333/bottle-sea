import { Color, DynamicDrawUsage, Group, InstancedMesh, Object3D, Vector3 } from 'three';
import { cubeGeometry,voxelMaterial,seededRandom } from '../utils/voxel';
import { terrainCellsNear } from '../world/island/TerrainData';
import { seabedCellAt } from '../world/underwater/SeabedData';
import { bottleRadiusAt } from '../world/bottle/Bounds';

export class FishSystem extends Group {
  private mesh:InstancedMesh;private dummy=new Object3D();private randoms:number[]=[];
  private previous:Vector3[]=[];private yaws:number[]=[];private previousTime=0;
  private parts=[[0,0,0,.19,.095,.065],[-.125,0,0,.08,.13,.027],[.08,.025,.037,.022,.022,.01],[0,0,0,.035,.1,.07]];
  constructor(private fishCount=32) {
    super();const random=seededRandom(708);this.mesh=new InstancedMesh(cubeGeometry,voxelMaterial,fishCount*4);this.mesh.instanceMatrix.setUsage(DynamicDrawUsage);this.mesh.frustumCulled=false;
    const color=new Color();
    for(let i=0;i<fishCount;i++) {
      this.randoms.push(random()*Math.PI*2,random(),random());this.previous.push(new Vector3());this.yaws.push(0);
      for(let p=0;p<4;p++)this.mesh.setColorAt(i*4+p,color.set(p===2?'#203f3c':p===3?'#e4d8aa':['#cf8044','#d5b74a','#4295b7'][i%3]));
    }
    this.add(this.mesh);this.update(0);
  }
  update(time:number,player?:Vector3) {
    for(let i=0;i<this.fishCount;i++) {
      const phase=this.randoms[i*3],angle=time*.18+phase;
      const scatter=Math.max(0,Math.sin(time*.16))**8;
      let x=Math.sin(angle)*(3.1+this.randoms[i*3+1]*1.5),z=.25+Math.cos(angle)*(.5+this.randoms[i*3+2]*.65)+Math.sin(phase*3)*scatter*.22;
      let y=2.15+this.randoms[i*3+1]*.72+Math.sin(time*.6+phase)*.05;
      if(player){const dx=x-player.x,dz=z-player.z,d=Math.hypot(dx,dz,y-player.y);if(d<.8&&d>.001){const push=(.8-d)*.45;x+=dx/d*push;z+=dz/d*push;}}
      ({x,z,y}=this.keepInWater(x,z,y));const previous=this.previous[i],first=previous.lengthSq()===0;let target=this.yaws[i];if(!first){const dx=x-previous.x,dz=z-previous.z;if(dx*dx+dz*dz>.0000001)target=Math.atan2(-dz,dx);}else target=Math.atan2(-Math.cos(angle),Math.sin(angle));
      const dt=Math.max(0,Math.min(.1,time-this.previousTime)),turn=1-Math.exp(-dt*8),difference=Math.atan2(Math.sin(target-this.yaws[i]),Math.cos(target-this.yaws[i])),step=Math.max(-.22,Math.min(.22,difference*turn));const yaw=this.yaws[i]=first?target:this.yaws[i]+step;previous.set(x,y,z);
      for(let p=0;p<4;p++) {
        const part=this.parts[p],c=Math.cos(yaw),s=Math.sin(yaw),px=c*part[0]+s*part[2],pz=-s*part[0]+c*part[2];this.dummy.position.set(x+px,y+part[1],z+pz);this.dummy.scale.set(part[3],part[4],part[5]);this.dummy.rotation.set(0,yaw+(p===1?Math.sin(time*7+phase)*.28:0),0);this.dummy.updateMatrix();this.mesh.setMatrixAt(i*4+p,this.dummy.matrix);
      }
    }
    this.previousTime=time;
    this.mesh.instanceMatrix.needsUpdate=true;
  }
  private keepInWater(x:number,z:number,y:number){
    const radius=.16;for(let attempt=0;attempt<16;attempt++){const solid=terrainCellsNear(x,z,radius).find(cell=>y+radius>cell.solidMinY&&y-radius<cell.solidMaxY&&x>cell.minX-radius&&x<cell.maxX+radius&&z>cell.minZ-radius&&z<cell.maxZ+radius);if(!solid)break;const dx=x+.85,dz=z+.12,length=Math.hypot(dx/1.9,dz/1.04)||1;x+=dx/length*.08;z+=dz/length*.08;}
    const bed=seabedCellAt(x,z);if(bed)y=Math.max(y,bed.top+radius);const bottle=bottleRadiusAt(x)-.2,vertical=y-3.72,zLimit=Math.sqrt(Math.max(.04,bottle*bottle-vertical*vertical));z=Math.max(-zLimit,Math.min(zLimit,z));return {x,z,y};
  }
  setCount(count:number) {this.fishCount=Math.min(count,this.randoms.length/3);this.mesh.count=this.fishCount*4;}
}

