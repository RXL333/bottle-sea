import { PerspectiveCamera, Quaternion, Vector3 } from 'three';

export type CameraMode='OVERVIEW'|'ENTERING'|'EXPLORE'|'EXITING';
export function easeInOutCubic(t:number){return t<.5?4*t*t*t:1-(-2*t+2)**3/2;}

/** Owns the camera only during a mode transition; input controllers are suspended by Game. */
export class CameraTransitionSystem {
  state:CameraMode='OVERVIEW';
  private elapsed=0;private duration=1.5;private from=new Vector3();private to=new Vector3();
  private fromRotation=new Quaternion();private toRotation=new Quaternion();private fromFov=34;private toFov=68;
  private near=.08;private far=40;
  constructor(private camera:PerspectiveCamera){}
  get active(){return this.state==='ENTERING'||this.state==='EXITING';}
  start(destination:'OVERVIEW'|'EXPLORE',position:Vector3,rotation:Quaternion,fov:number){
    if(this.active)return false;
    this.state=destination==='EXPLORE'?'ENTERING':'EXITING';this.elapsed=0;
    this.from.copy(this.camera.position);this.to.copy(position);this.fromRotation.copy(this.camera.quaternion);this.toRotation.copy(rotation);
    this.fromFov=this.camera.fov;this.toFov=fov;this.near=destination==='EXPLORE'?.08:.12;this.far=destination==='EXPLORE'?40:200;
    this.camera.far=200;this.camera.near=.08;this.camera.updateProjectionMatrix();return true;
  }
  update(delta:number){
    if(!this.active)return false;
    this.elapsed+=Math.max(0,delta);const t=Math.min(1,Math.max(0,(this.elapsed-.2)/this.duration)),e=easeInOutCubic(t);
    this.camera.position.lerpVectors(this.from,this.to,e);this.camera.quaternion.slerpQuaternions(this.fromRotation,this.toRotation,e);
    this.camera.fov=this.fromFov+(this.toFov-this.fromFov)*e;this.camera.updateProjectionMatrix();
    if(t<1)return false;
    this.state=this.state==='ENTERING'?'EXPLORE':'OVERVIEW';this.camera.near=this.near;this.camera.far=this.far;this.camera.updateProjectionMatrix();return true;
  }
}
