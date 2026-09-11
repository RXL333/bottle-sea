import { DynamicDrawUsage,Group,InstancedMesh,MeshBasicMaterial,Object3D } from 'three';
import { cubeGeometry } from '../utils/voxel';
import { seededRandom } from '../utils/voxel';

/** Optional sparse chimney puffs and rare pixel meteors share one bounded draw call. */
export class MicroAnimationSystem extends Group {
  private mesh=new InstancedMesh(cubeGeometry,new MeshBasicMaterial({color:'#c3d6cc',transparent:true,opacity:.45,depthWrite:false}),24);
  private dummy=new Object3D();private nextMeteor=60;private meteorStart=-10;private random=seededRandom(860);private density=8;
  constructor(){super();this.name='WorldMicroParticles';this.mesh.frustumCulled=false;this.mesh.renderOrder=4;this.mesh.instanceMatrix.setUsage(DynamicDrawUsage);this.mesh.count=0;this.add(this.mesh);}
  setDensity(step:number){this.density=step>.2?4:step<.15?12:8;}
  update(time:number,night:number,storm:number){
    let count=0;
    if(night>.2&&storm<.45){for(let i=0;i<this.density;i++){
      const age=(time*.24+i/this.density*2.5)%2.5;
      const size=.06*Math.sin(age/2.5*Math.PI)*Math.min(1,night*2)*(1-storm/.45);
      this.dummy.position.set(-1.14+age*.065,5.53+age*.14,-.45);this.dummy.scale.setScalar(size);this.dummy.updateMatrix();this.mesh.setMatrixAt(count++,this.dummy.matrix);
    }}
    if(time>=this.nextMeteor){this.nextMeteor=time+75+this.random()*90;if(night>.7&&storm<.25)this.meteorStart=time;}
    const age=time-this.meteorStart;
    if(age>=0&&age<1.4){for(let i=0;i<8;i++){const progress=age-i*.025;if(progress<0)continue;this.dummy.position.set(2.5-progress*2,5.7-progress*.45,-.9);this.dummy.scale.setScalar(.036*(1-i/9)*Math.sin(age/1.4*Math.PI));this.dummy.updateMatrix();this.mesh.setMatrixAt(count++,this.dummy.matrix);}}
    this.mesh.count=count;this.mesh.instanceMatrix.needsUpdate=true;
  }
}
