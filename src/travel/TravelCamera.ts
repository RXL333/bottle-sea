import { PerspectiveCamera,Quaternion,Vector3 } from 'three';
import type { PlayerTravelBoat } from '../worlds/travel/PlayerTravelBoat';
import type { SpawnPoint } from '../worlds/types';
export class TravelCamera {
  private target=new Vector3();private position=new Vector3();private startPosition=new Vector3();private startRotation=new Quaternion();private destination=new PerspectiveCamera();
  constructor(private camera:PerspectiveCamera){}
  capture(){this.startPosition.copy(this.camera.position);this.startRotation.copy(this.camera.quaternion);this.camera.near=.08;this.camera.far=180;this.camera.updateProjectionMatrix();}
  follow(boat:PlayerTravelBoat,delta:number,blend=1){
    const s=Math.sin(boat.yaw),c=Math.cos(boat.yaw);
    this.position.set(boat.position.x-s*3.4,Math.max(boat.position.y+2.7,6),boat.position.z-c*3.4);
    this.target.set(boat.position.x+s*1.5,boat.position.y+.3,boat.position.z+c*1.5);
    this.destination.position.copy(this.position);this.destination.lookAt(this.target);
    if(blend<1){const t=blend*blend*(3-2*blend);this.camera.position.lerpVectors(this.startPosition,this.position,t);this.camera.quaternion.slerpQuaternions(this.startRotation,this.destination.quaternion,t);}
    else {const alpha=1-Math.exp(-delta*9);this.camera.position.lerp(this.position,alpha);this.camera.quaternion.slerp(this.destination.quaternion,alpha);}
    this.camera.fov=62;this.camera.updateProjectionMatrix();
  }
  disembark(spawn:SpawnPoint,progress:number){this.destination.position.fromArray(spawn.position);this.destination.lookAt(...spawn.lookAt);const t=progress*progress*(3-2*progress);this.camera.position.lerpVectors(this.startPosition,this.destination.position,t);this.camera.quaternion.slerpQuaternions(this.startRotation,this.destination.quaternion,t);this.camera.fov=62+6*t;this.camera.updateProjectionMatrix();}
}
