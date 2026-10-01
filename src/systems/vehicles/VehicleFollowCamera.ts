import { Matrix4,PerspectiveCamera,Quaternion,Vector3 } from 'three';
import type { DriveableVehicle } from './Vehicle';

/** Heading and position are smoothed separately; obstruction retracts immediately. */
export class VehicleFollowCamera {
  private yaw=0;private target=new Vector3();private desired=new Vector3();
  private orientation=new Quaternion();private matrix=new Matrix4();
  constructor(private camera:PerspectiveCamera){}
  reset(vehicle:DriveableVehicle){this.yaw=vehicle.yaw;this.target.copy(vehicle.seatPosition()).add(new Vector3(0,.9,0));}
  destination(vehicle:DriveableVehicle){
    const target=vehicle.seatPosition().add(new Vector3(0,.9,0));
    const distance=vehicle.cameraDistance??3.4,position=target.clone().add(new Vector3(-Math.sin(vehicle.yaw)*distance,1.55,-Math.cos(vehicle.yaw)*distance));
    return {target,position:vehicle.clipCamera(target,position)};
  }
  update(delta:number,vehicle:DriveableVehicle){
    const dt=Math.min(.1,Math.max(0,delta)),blend=1-Math.exp(-dt*7);
    this.yaw+=Math.atan2(Math.sin(vehicle.yaw-this.yaw),Math.cos(vehicle.yaw-this.yaw))*blend;
    this.target.lerp(vehicle.seatPosition().add(new Vector3(0,.9,0)),blend);
    const distance=vehicle.cameraDistance??3.4;this.desired.copy(this.target).add(new Vector3(-Math.sin(this.yaw)*distance,1.55,-Math.cos(this.yaw)*distance));
    this.desired.copy(vehicle.clipCamera(this.target,this.desired));
    this.camera.position.lerp(this.desired,1-Math.exp(-dt*9));
    this.camera.position.copy(vehicle.clipCamera(this.target,this.camera.position));
    this.look(this.target,1-Math.exp(-dt*12));
  }
  look(target:Vector3,blend:number){this.matrix.lookAt(this.camera.position,target,this.camera.up);this.orientation.setFromRotationMatrix(this.matrix);this.camera.quaternion.slerp(this.orientation,blend);}
}
