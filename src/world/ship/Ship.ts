import { Group } from 'three';
import { VoxelBatch, box } from '../../utils/voxel';
import { sampleBuoyancy } from './Buoyancy';

export class Ship extends Group {
  private floatState={height:0,pitch:0,roll:0};
  private hull=new Group();
  constructor() {
    super();this.name='Ship';const b=new VoxelBatch();
    for(let row=0;row<3;row++) {
      b.add(['#493223','#6f482a','#98703e'][row],0,row*.09,0,.24+row*.13,.088,.72+row*.14);
    }
    for(const x of [-.25,.25]) b.add('#7c542e',x,.3,0,.06,.11,1.05);
    b.add('#c29a58',0,.24,0,.4,.045,.86);
    b.add('#62442b',0,.85,0,.045,1.3,.045);
    b.add('#785331',0,1.4,0,.055,.04,.65);
    for(let row=0;row<8;row++) {
      const width=.63-row*.066;
      b.add(row%3?'#e7e1cf':'#cfcdb8',0,.46+row*.112,.075+width/2,.033,.11,width);
    }
    for(let row=0;row<6;row++) b.add('#e3dbbb',0,.48+row*.115,-.05-(.4-row*.045)/2,.035,.112,.4-row*.045);
    b.add('#bc6142',0,1.49,.095,.03,.1,.21);
    b.build(this.hull);box(this.hull,'#ffca67',.12,.4,-.37,.08,.12,.08,1.6);
    this.add(this.hull);this.update(0,0);
  }
  update(time:number,storm:number) {
    const angle=time*.065+.3;
    const x=.2+Math.cos(angle)*3.9,z=Math.sin(angle)*1.55;
    const yaw=Math.atan2(-3.9*Math.sin(angle),1.55*Math.cos(angle));
    sampleBuoyancy(x,z,yaw,time,storm,this.floatState);
    this.position.set(x,this.floatState.height+.015,z);this.rotation.y=yaw;
    this.hull.rotation.set(this.floatState.pitch,0,this.floatState.roll);
  }
}
