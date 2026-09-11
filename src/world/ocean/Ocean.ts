import { Color, DoubleSide, DynamicDrawUsage, ExtrudeGeometry, Group, InstancedMesh, Mesh, MeshStandardMaterial, Object3D, Shape } from 'three';
import { cubeGeometry, seededRandom } from '../../utils/voxel';
import { islandHeight } from '../island/Island';
import { crestIntensity, waveHeight } from './WaveMath';
import { shoreProximity, waterColor, waterDepth } from './OceanAppearance';
import { bottleRadiusAt } from '../bottle/Bounds';

export class Ocean extends Group {
  private mesh!:InstancedMesh;private positions:number[]=[];private dummy=new Object3D();
  private foam!:InstancedMesh;private foamPositions:number[]=[];
  private depths:number[]=[];private shores:number[]=[];private color=new Color();private lastColorTime=-1;
  constructor(step=.16) {super();this.name='Ocean';this.create(step);
    const shape=new Shape();const radius=2.37,top=3.24,center=3.72;
    const edge=Math.acos((center-top)/radius);shape.moveTo(-Math.sin(edge)*radius,top);
    for(let i=0;i<=24;i++){const angle=-edge+i*edge*2/24;shape.lineTo(Math.sin(angle)*radius,center-Math.cos(angle)*radius);}shape.closePath();
    const volume=new Mesh(new ExtrudeGeometry(shape,{depth:9.6,bevelEnabled:false,steps:1}),new MeshStandardMaterial({color:'#078a91',transparent:true,opacity:.18,depthWrite:false,side:DoubleSide,roughness:1}));
    volume.rotation.y=Math.PI/2;volume.position.x=-5.4;volume.renderOrder=2;this.add(volume);
  }
  create(step:number) {
    if(this.mesh){this.remove(this.mesh,this.foam);this.mesh.dispose();(this.mesh.material as MeshStandardMaterial).dispose();this.foam.dispose();(this.foam.material as MeshStandardMaterial).dispose();}
    this.positions=[];this.foamPositions=[];this.depths=[];this.shores=[];this.lastColorTime=-1;const random=seededRandom(60);
    for(let x=-5.78;x<5.62;x+=step)for(let z=-2.22;z<2.22;z+=step) {
      const radius=bottleRadiusAt(x)-.2;
      if(z*z+1.03**2>radius*radius||islandHeight(x,z)>3.45)continue;
      this.positions.push(x,z);
      const shore=shoreProximity(x,z);this.depths.push(waterDepth(x,z));this.shores.push(shore);
      const dock=Math.max(0,1-Math.hypot(x-.65,z-1.28)/.7);
      if(random()<.12+shore*.35+dock*.2)this.foamPositions.push(x,z,Math.max(shore,dock));
    }
    this.mesh=new InstancedMesh(cubeGeometry,new MeshStandardMaterial({color:'#ffffff',transparent:true,opacity:.69,depthWrite:false,roughness:.8,flatShading:true}),this.positions.length/2);
    this.mesh.instanceMatrix.setUsage(DynamicDrawUsage);this.mesh.frustumCulled=false;this.mesh.renderOrder=3;
    for(let i=0;i<this.positions.length/2;i++)this.mesh.setColorAt(i,this.color);
    this.mesh.instanceColor!.setUsage(DynamicDrawUsage);
    this.foam=new InstancedMesh(cubeGeometry,new MeshStandardMaterial({color:'#9de5d6',transparent:true,opacity:.64,depthWrite:false}),this.foamPositions.length/3);
    this.foam.instanceMatrix.setUsage(DynamicDrawUsage);this.foam.frustumCulled=false;this.foam.renderOrder=4;
    this.dummy.scale.set(step*.99,.075,step*.99);this.add(this.mesh,this.foam);this.step=step;this.update(0,0);
  }
  private step=.18;
  update(time:number,storm:number,dayTime=.58) {
    const recolor=Math.abs(time-this.lastColorTime)>.065||time===0;
    this.dummy.scale.set(this.step*.995,.085+storm*.045,this.step*.995);
    for(let i=0;i<this.positions.length;i+=2) {
      const x=this.positions[i],z=this.positions[i+1],height=waveHeight(x,z,time,storm);this.dummy.position.set(x,height,z);this.dummy.updateMatrix();this.mesh.setMatrixAt(i/2,this.dummy.matrix);
      if(recolor)this.mesh.setColorAt(i/2,waterColor(this.depths[i/2],this.shores[i/2],height,crestIntensity(x,z,time,storm,height),dayTime,storm,this.color));
    }
    this.mesh.instanceMatrix.needsUpdate=true;
    if(recolor){this.mesh.instanceColor!.needsUpdate=true;this.lastColorTime=time;}
    for(let i=0;i<this.foamPositions.length;i+=3) {
      const x=this.foamPositions[i],z=this.foamPositions[i+1],shore=this.foamPositions[i+2];
      const h=waveHeight(x,z,time,storm),crest=crestIntensity(x,z,time,storm,h);
      const surge=Math.max(0,Math.sin(time*1.3-x*.8+z*1.2));
      const strength=Math.min(1,Math.max(0,crest-(.55-storm*.28))*1.6+shore*surge**4*(.55+storm*.45));
      this.dummy.scale.set(this.step*(.45+storm*.5)*strength,.014,this.step*.28*strength);
      this.dummy.position.set(x,h+.054+storm*.02,z);this.dummy.updateMatrix();this.foam.setMatrixAt(i/3,this.dummy.matrix);
    }
    this.foam.instanceMatrix.needsUpdate=true;
  }
}

