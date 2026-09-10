import { ConeGeometry, CylinderGeometry, Group, Mesh, MeshBasicMaterial, PointLight } from 'three';
import { box, material } from '../../utils/voxel';

export class Lighthouse extends Group {
  readonly light=new PointLight('#ffca67',2,4,1.5);
  readonly beam=new Group();
  private beamMaterial=new MeshBasicMaterial({color:'#ffcc70',transparent:true,opacity:.05,depthWrite:false});
  constructor() {
    super();this.position.set(.35,3.83,-.28);
    for(let i=0;i<7;i++) {
      const tower=new Mesh(new CylinderGeometry(.21-i*.009,.22-i*.009,.235,8),material(i%3===1?'#d85849':'#e7e1cf'));
      tower.position.y=.1175+i*.235;tower.castShadow=true;this.add(tower);
    }
    box(this,'#40382e',0,.18,.211,.12,.31,.04);
    box(this,'#806845',0,1.07,.166,.055,.09,.02);
    for(const y of [1.65,1.98]) {const ring=new Mesh(new CylinderGeometry(.29,.29,.08,8),material('#ab5036'));ring.position.y=y;this.add(ring);}
    box(this,'#ffda82',0,1.81,0,.28,.26,.28,2.5);
    for(const x of [-.17,.17]) for(const z of [-.17,.17]) box(this,'#70452a',x,1.81,z,.025,.32,.025);
    const roof=new Mesh(new ConeGeometry(.31,.3,8),material('#b44b32'));roof.position.y=2.12;this.add(roof);
    box(this,'#a64e31',0,2.31,0,.06,.16,.06);
    this.light.position.y=1.82;this.add(this.light);
    const cone=new Mesh(new ConeGeometry(.65,3,12,1,true),this.beamMaterial);cone.rotation.z=Math.PI/2;cone.position.x=1.5;cone.renderOrder=4;
    this.beam.position.y=1.82;this.beam.add(cone);this.add(this.beam);
  }
  update(time:number,night:number,storm:number) {
    this.beam.rotation.y=time*.35;this.light.intensity=1+night*4+storm*2;
    this.beamMaterial.opacity=.012+night*.07+storm*.035;
  }
}
