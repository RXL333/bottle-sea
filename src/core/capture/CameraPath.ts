import { CatmullRomCurve3,PerspectiveCamera,Quaternion,Vector3 } from 'three';
export interface CapturePose {position:[number,number,number];rotation:[number,number,number,number];fov:number}
export interface CapturePath {poses:readonly CapturePose[];duration:number}
const smooth=(t:number)=>t*t*(3-2*t);
export function lookPose(position:[number,number,number],target:[number,number,number],fov=48):CapturePose {
  const camera=new PerspectiveCamera();camera.position.fromArray(position);camera.lookAt(...target);
  return {position:[...position],rotation:camera.quaternion.toArray(),fov};
}
export function cameraPose(camera:PerspectiveCamera):CapturePose{return {position:camera.position.toArray(),rotation:camera.quaternion.toArray(),fov:camera.fov};}
export function orbitPath(pose:CapturePose,center:[number,number,number],degrees:number,duration:number):CapturePath {
  const origin=new Vector3().fromArray(pose.position).sub(new Vector3().fromArray(center));
  return {duration,poses:Array.from({length:9},(_,i)=>{const position=origin.clone().applyAxisAngle(new Vector3(0,1,0),degrees*Math.PI/180*i/8).add(new Vector3().fromArray(center));return lookPose(position.toArray(),center,pose.fov);})};
}
export function validCapturePath(path:CapturePath){return path.poses.length>=2&&path.poses.length<=16&&Number.isFinite(path.duration)&&path.duration>=1&&path.duration<=180&&path.poses.every(p=>p.position.length===3&&p.rotation.length===4&&[...p.position,...p.rotation,p.fov].every(Number.isFinite)&&p.fov>=15&&p.fov<=100&&Math.hypot(...p.rotation)>.001);}
/** Quaternion interpolation avoids Euler wrap; multi-point flyovers use a continuous curve. */
export class CameraPath {
  elapsed=0;playing=false;private path?:CapturePath;private curve?:CatmullRomCurve3;
  private a=new Quaternion();private b=new Quaternion();private point=new Vector3();
  constructor(private camera:PerspectiveCamera){}
  configure(path:CapturePath){if(!validCapturePath(path))throw new Error('Invalid capture camera path');this.path=structuredClone(path);this.curve=path.poses.length>2?new CatmullRomCurve3(path.poses.map(p=>new Vector3().fromArray(p.position)),false,'centripetal'):undefined;this.reset();}
  get progress(){return this.path?Math.min(1,this.elapsed/this.path.duration):0;}
  get duration(){return this.path?.duration??0;}
  get snapshot(){return this.path?structuredClone(this.path):undefined;}
  reset(){this.elapsed=0;this.playing=false;this.sample(0);}
  play(){if(!this.path)return;if(this.progress===1)this.reset();this.playing=true;}
  stop(){this.playing=false;}
  update(delta:number){if(!this.playing||!this.path)return;this.elapsed=Math.min(this.path.duration,this.elapsed+Math.max(0,delta));this.sample(this.progress);if(this.progress>=1)this.playing=false;}
  sample(progress:number){
    if(!this.path)return;const poses=this.path.poses,p=smooth(Math.max(0,Math.min(1,progress))),value=p*(poses.length-1),index=Math.min(poses.length-2,Math.floor(value)),t=value-index,from=poses[index],to=poses[index+1];
    if(this.curve)this.camera.position.copy(this.curve.getPoint(p,this.point));else this.camera.position.fromArray(from.position).lerp(new Vector3().fromArray(to.position),t);
    this.a.fromArray(from.rotation).normalize();this.b.fromArray(to.rotation).normalize();this.camera.quaternion.copy(this.a).slerp(this.b,t);
    this.camera.fov=from.fov+(to.fov-from.fov)*t;this.camera.updateProjectionMatrix();
  }
}
