import { Matrix4,PerspectiveCamera,Quaternion,Vector3 } from 'three';
import type { DriveableVehicle } from './Vehicle';

/** Heading and position are smoothed separately; obstruction retracts immediately. */
export class VehicleFollowCamera {
  private yaw=0;private target=new Vector3();private desired=new Vector3();
  private orientation=new Quaternion();private matrix=new Matrix4();
  private orbit=false;private orbitYaw=0;private orbitPitch=0;private wantedYaw=0;private wantedPitch=0;
  private sensitivity=1;private distanceScale=1;
  configure(sensitivity:number,distance:number){this.sensitivity=sensitivity;this.distanceScale=distance;}
  constructor(private camera:PerspectiveCamera){}
  reset(vehicle:DriveableVehicle){this.yaw=vehicle.yaw;this.target.copy(vehicle.seatPosition());this.target.y+=.9;this.orbit=false;this.orbitYaw=this.orbitPitch=this.wantedYaw=this.wantedPitch=0;}
  beginOrbit(){this.orbit=true;this.wantedYaw=this.orbitYaw;this.wantedPitch=this.orbitPitch;}
  dragOrbit(dx:number,dy:number){if(this.orbit){this.wantedYaw-=dx*.006*this.sensitivity;this.wantedPitch=Math.max(-.28,Math.min(.8,this.wantedPitch+dy*.004*this.sensitivity));}}
  endOrbit(){this.orbit=false;this.wantedYaw=0;this.wantedPitch=0;this.orbitYaw=Math.atan2(Math.sin(this.orbitYaw),Math.cos(this.orbitYaw));}
  destination(vehicle:DriveableVehicle){
    const target=vehicle.seatPosition().add(new Vector3(0,.9,0));
    const distance=(vehicle.cameraDistance??3.4)*this.distanceScale,position=target.clone().add(new Vector3(-Math.sin(vehicle.yaw)*distance,1.55,-Math.cos(vehicle.yaw)*distance));
    return {target,position:vehicle.clipCamera(target,position)};
  }
  update(delta:number,vehicle:DriveableVehicle){
    const dt=Math.min(.1,Math.max(0,delta)),blend=1-Math.exp(-dt*7);
    this.yaw+=Math.atan2(Math.sin(vehicle.yaw-this.yaw),Math.cos(vehicle.yaw-this.yaw))*blend;
    this.desired.copy(vehicle.seatPosition());this.desired.y+=.9;this.target.lerp(this.desired,blend);
    this.orbitYaw+=(this.wantedYaw-this.orbitYaw)*blend;this.orbitPitch+=(this.wantedPitch-this.orbitPitch)*blend;
    const distance=(vehicle.cameraDistance??3.4)*this.distanceScale,angle=this.yaw+this.orbitYaw,pitch=Math.atan2(1.55,distance)+this.orbitPitch,radius=Math.hypot(distance,1.55),horizontal=Math.cos(pitch)*radius;
    this.desired.set(-Math.sin(angle)*horizontal,Math.sin(pitch)*radius,-Math.cos(angle)*horizontal).add(this.target);
    // Clip the final interpolated eye once; it also protects turns across corners.
    this.camera.position.lerp(this.desired,1-Math.exp(-dt*9));
    this.camera.position.copy(vehicle.clipCamera(this.target,this.camera.position));
    this.look(this.target,1-Math.exp(-dt*12));
  }
  look(target:Vector3,blend:number){this.matrix.lookAt(this.camera.position,target,this.camera.up);this.orientation.setFromRotationMatrix(this.matrix);this.camera.quaternion.slerp(this.orientation,blend);}
}
