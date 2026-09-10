import { Group, MeshStandardMaterial } from 'three';
import { VoxelBatch, box } from '../../utils/voxel';

export class House extends Group {
  readonly windows:MeshStandardMaterial[]=[];
  constructor() {
    super();this.position.set(-1.5,3.83,-.2);
    const b=new VoxelBatch();
    b.add('#dfc797',0,.48,0,1.15,.95,.82);
    for(const x of [-.52,.52]) b.add('#97724a',x,.48,.43,.08,1,.08);
    b.add('#62462b',0,.29,.44,.28,.58,.06);
    for(let i=0;i<4;i++) b.add('#85603c',-.105+i*.07,.29,.48,.014,.54,.012);
    b.add('#dab15d',.07,.3,.49,.04,.045,.025);
    for(let row=0;row<5;row++) {
      const w=1.48-row*.25;
      b.add(row%2?'#934a2b':'#a95831',0,1+row*.13,0,w,.128,1.07);
      for(let j=0;j<7;j++) b.add('#783b25',-w/2+.02,1.04+row*.13,-.46+j*.15,.04,.055,.025);
    }
    b.add('#7a553a',.36,1.4,-.25,.19,.59,.21);
    for(const x of [-.36,.36]) {
      b.add('#704827',x,.6,.445,.24,.36,.06);
      const window=box(this,'#ffcb72',x,.6,.483,.16,.27,.02,1.2); this.windows.push(window.material);
      b.add('#795632',x,.6,.499,.022,.29,.02);b.add('#795632',x,.6,.499,.19,.022,.02);
    }
    b.add('#6e4a2d',0,1.12,.55,.18,.24,.025);
    this.windows.push(box(this,'#ffca67',0,1.12,.57,.09,.17,.02,1).material);
    b.add('#baa477',0,.025,.66,.5,.08,.35);
    b.build(this);
  }
  setNight(value:number) { for(const m of this.windows) m.emissiveIntensity=.35+value*2.1; }
}
