import { CylinderGeometry, Group, LatheGeometry, Mesh, MeshStandardMaterial, TorusGeometry, Vector2 } from 'three';
import { VoxelBatch, material } from '../../utils/voxel';
import { bottleMaterial } from './BottleMaterial';

export class Bottle extends Group {
  readonly shell = new Group();
  private glass=bottleMaterial();private innerGlass=bottleMaterial(true);
  constructor() {
    super(); this.name='Bottle'; this.add(this.shell);
    const profile = [[0,-6.3],[1.3,-6.3],[1.9,-6.2],[2.3,-5.95],[2.5,-5.6],[2.55,-5.2],[2.55,3.85],[2.48,4.35],[2.25,4.8],[1.7,5.2],[1.1,5.6],[.83,6],[.83,7.05]];
    const geometry = new LatheGeometry(profile.map(([r,x])=>new Vector2(r,x)),48);
    const glass = this.glass;
    const body = new Mesh(geometry,glass); body.rotation.z=-Math.PI/2; body.position.y=3.72; body.renderOrder=5; this.shell.add(body);
    const back = new Mesh(geometry,this.innerGlass);
    back.rotation.z=-Math.PI/2; back.position.y=3.72; back.renderOrder=1; this.shell.add(back);
    const rimMat = new MeshStandardMaterial({color:'#b9e6db',transparent:true,opacity:.24,roughness:.25,depthWrite:false});
    for(const [x,r] of [[-6.08,2.15],[-5.86,2.38],[6.95,.89],[6.65,.86]]) {
      const ring=new Mesh(new TorusGeometry(r,.035,4,48),rimMat); ring.rotation.y=Math.PI/2; ring.position.set(x,3.72,0); ring.renderOrder=6; this.shell.add(ring);
    }
    // Long, narrow reflected highlights preserve an unmistakable glass silhouette.
    for(const angle of [.15,.37,2.75,3.03]) {
      const highlight = new Mesh(new CylinderGeometry(.019,.019,9,4),rimMat);
      highlight.rotation.z=Math.PI/2; highlight.position.set(-.65,3.72+Math.cos(angle)*2.54,Math.sin(angle)*2.54); highlight.renderOrder=6; this.shell.add(highlight);
    }
    for(const [x,r,len,color] of [[7.2,.78,.85,'#99703e'],[7.02,.82,.25,'#74502d'],[7.45,.8,.19,'#ad8045']] as const) {
      const cork=new Mesh(new CylinderGeometry(r,r,len,12),material(color)); cork.rotation.z=-Math.PI/2;cork.position.set(x,3.72,0);cork.castShadow=true;this.shell.add(cork);
    }
    const seal=new Mesh(new CylinderGeometry(.835,.835,.2,12),material('#8c3530'));seal.rotation.z=Math.PI/2;seal.position.set(7.36,3.72,0);this.shell.add(seal);
    const stands=new VoxelBatch();
    for(const x of [-4.25,3.5]) {
      stands.add('#362b24',x,.2,0,1.15,.4,3.7);
      for(const z of [-1.28,1.28]) {stands.add('#443126',x,.84,z,.72,1.28,.66);stands.add('#5b4030',x,1.5,z,.74,.15,.7);}
      stands.add('#513b29',x,.52,0,.8,.3,2.7);
    }
    stands.add('#65472c',-.4,.25,0,7.9,.25,.38); stands.build(this);
  }
  update(time:number,intensity:number,flash=0) { this.shell.rotation.z=Math.sin(time*2.1)*.0025*intensity;this.glass.uniforms.flash.value=flash;this.innerGlass.uniforms.flash.value=flash; }
}
