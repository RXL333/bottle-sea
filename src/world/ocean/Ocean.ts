import { Color, DoubleSide, DynamicDrawUsage, ExtrudeGeometry, Group, InstancedMesh, Mesh, MeshStandardMaterial, Object3D, Shape } from 'three';
import { cubeGeometry, seededRandom } from '../../utils/voxel';
import { islandHeight } from '../island/Island';
import { waveHeight } from './WaveMath';
import { bottleRadiusAt } from '../bottle/Bounds';

export class Ocean extends Group {
  private mesh!:InstancedMesh;private positions:number[]=[];private dummy=new Object3D();
  private foam!:InstancedMesh;private foamPositions:number[]=[];
  constructor(step=.16) {super();this.name='Ocean';this.create(step);
    const shape=new Shape();const radius=2.37,top=3.24,center=3.72;
    const edge=Math.acos((center-top)/radius);shape.moveTo(-Math.sin(edge)*radius,top);
    for(let i=0;i<=24;i++){const angle=-edge+i*edge*2/24;shape.lineTo(Math.sin(angle)*radius,center-Math.cos(angle)*radius);}shape.closePath();
    const volume=new Mesh(new ExtrudeGeometry(shape,{depth:9.6,bevelEnabled:false,steps:1}),new MeshStandardMaterial({color:'#078a91',transparent:true,opacity:.18,depthWrite:false,side:DoubleSide,roughness:1}));
    volume.rotation.y=Math.PI/2;volume.position.x=-5.4;volume.renderOrder=2;this.add(volume);
  }
  create(step:number) {
    if(this.mesh){this.remove(this.mesh,this.foam);this.mesh.dispose();(this.mesh.material as MeshStandardMaterial).dispose();this.foam.dispose();(this.foam.material as MeshStandardMaterial).dispose();}
    this.positions=[];this.foamPositions=[];const random=seededRandom(60);
    for(let x=-5.78;x<5.62;x+=step)for(let z=-2.22;z<2.22;z+=step) {
      const radius=bottleRadiusAt(x)-.2;
      if(z*z+1.03**2>radius*radius||islandHeight(x,z)>3.45)continue;
      this.positions.push(x,z);
      if(random()<.16)this.foamPositions.push(x,z,random());
    }
    this.mesh=new InstancedMesh(cubeGeometry,new MeshStandardMaterial({color:'#16b6b4',transparent:true,opacity:.69,depthWrite:false,roughness:.6,flatShading:true}),this.positions.length/2);
    this.mesh.instanceMatrix.setUsage(DynamicDrawUsage);this.mesh.frustumCulled=false;this.mesh.renderOrder=3;
    const colors=['#0b6670','#078a91','#16b6b4','#31afa7','#66d4c5'];const color=new Color();
    for(let i=0;i<this.positions.length/2;i++) {this.mesh.setColorAt(i,color.set(colors[Math.floor(random()*colors.length)]));}
    this.foam=new InstancedMesh(cubeGeometry,new MeshStandardMaterial({color:'#9de5d6',transparent:true,opacity:.64,depthWrite:false}),this.foamPositions.length/3);
    this.foam.instanceMatrix.setUsage(DynamicDrawUsage);this.foam.frustumCulled=false;this.foam.renderOrder=4;
    this.dummy.scale.set(step*.99,.075,step*.99);this.add(this.mesh,this.foam);this.step=step;this.update(0,0);
  }
  private step=.18;
  update(time:number,storm:number) {
    this.dummy.scale.set(this.step*.995,.085+storm*.045,this.step*.995);
    for(let i=0;i<this.positions.length;i+=2) {
      const x=this.positions[i],z=this.positions[i+1];this.dummy.position.set(x,waveHeight(x,z,time,storm),z);this.dummy.updateMatrix();this.mesh.setMatrixAt(i/2,this.dummy.matrix);
    }
    this.mesh.instanceMatrix.needsUpdate=true;
    for(let i=0;i<this.foamPositions.length;i+=3) {
      const x=this.foamPositions[i],z=this.foamPositions[i+1],phase=this.foamPositions[i+2];
      const h=waveHeight(x,z,time,storm);const visible=Math.sin(x*2.4+time*(1+storm*.8)*1.5+phase)>.5-storm*.5;
      this.dummy.scale.set(visible?this.step*(.45+storm*.5):0,.014,this.step*.2);
      this.dummy.position.set(x,h+.054+storm*.02,z);this.dummy.updateMatrix();this.foam.setMatrixAt(i/3,this.dummy.matrix);
    }
    this.foam.instanceMatrix.needsUpdate=true;
  }
}

