import type { DynamicObstacle } from '../../world/Collision';
import { Group,Vector3 } from 'three';
import { VoxelBatch } from '../../utils/voxel';
import { sampleBuoyancy } from '../../world/ship/Buoyancy';
/** Small working launch, independent of the environmental sailboat. Forward is +Z. */
export class PlayerTravelBoat extends Group {
  private buoyancy={height:0,pitch:0,roll:0};
  readonly collisionBoxes:DynamicObstacle[]=[{x:0,z:0,yaw:0,previousX:0,previousZ:0,previousYaw:0,halfX:.29,halfZ:.53,minY:3.1,maxY:4.1}];
  yaw=0;berthYaw=0;readonly berth=new Vector3();departureDistance=5;
  anchor(x:number,z:number,yaw=0){this.berth.set(x,3.3,z);this.berthYaw=yaw;this.reset();}
  reset(){this.position.copy(this.berth);this.yaw=this.berthYaw;const b=this.collisionBoxes[0];b.x=b.previousX=this.position.x;b.z=b.previousZ=this.position.z;b.yaw=b.previousYaw=this.yaw;}
  constructor(){super();this.name='PlayerTravelBoat';this.scale.x=.75;const b=new VoxelBatch();
    b.add('#503b28',0,-.07,0,.43,.16,.88);b.add('#89603b',0,.03,0,.55,.14,1.04);
    b.add('#bb9358',0,.12,0,.43,.07,.86);
    for(const side of [-1,1]){b.add('#e0d2a7',side*.25,.19,0,.07,.22,.88);b.add('#b74d36',side*.255,.12,0,.075,.07,.92);}
    for(const z of [-.49,.49])b.add('#836039',0,.17,z,.44,.2,.09);
    b.add('#c8c9ac',0,.36,-.14,.34,.4,.34);b.add('#eff0d3',0,.58,-.14,.42,.065,.44);
    b.add('#204e57',0,.4,.037,.25,.15,.013);b.add('#23515b',-.176,.4,-.14,.014,.15,.23);b.add('#23515b',.176,.4,-.14,.014,.15,.23);
    b.add('#8c3b2f',.08,.68,-.23,.075,.16,.075);b.add('#252f2e',.08,.77,-.23,.1,.045,.1);
    b.add('#d69b44',-.1,.23,.27,.18,.16,.17);b.add('#665237',.13,.24,.3,.08,.15,.24);
    for(const side of [-1,1])b.add('#253b3b',side*.3,.19,-.31,.075,.13,.13);
    b.build(this);
  }
  update(time:number,storm:number){sampleBuoyancy(this.position.x,this.position.z,this.yaw,time,storm,this.buoyancy);this.position.y=this.buoyancy.height;this.rotation.set(this.buoyancy.pitch,this.yaw,this.buoyancy.roll,'YXZ');const b=this.collisionBoxes[0];b.previousX=b.x;b.previousZ=b.z;b.previousYaw=b.yaw;b.x=this.position.x;b.z=this.position.z;b.yaw=this.yaw;b.halfX=.29*this.scale.x;b.halfZ=.53*this.scale.z;b.minY=this.position.y-.18;b.maxY=this.position.y+.82;}
}
