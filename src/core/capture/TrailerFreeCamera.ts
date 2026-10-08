import { Euler,Quaternion,Vector3 } from 'three';
import type { PerspectiveCamera } from 'three';

/** Independent camera input. No pointer lock, player collisions, or gameplay key bindings. */
export class TrailerFreeCamera {
  enabled=true;moveSpeed=2;lookSpeed=.7;motionSpeed=1;
  private keys=new Set<string>();private velocity=new Vector3();private direction=new Vector3();private orientation=new Euler(0,0,0,'YXZ');private target=new Quaternion();
  private dragging=false;private pointer?:number;private lastX=0;private lastY=0;private listeners=new AbortController();
  constructor(private camera:PerspectiveCamera,private canvas:HTMLElement){
    const signal=this.listeners.signal;
    window.addEventListener('keydown',e=>{if(!this.enabled||this.editing(e.target))return;if(['KeyW','KeyA','KeyS','KeyD','KeyQ','KeyE','ArrowLeft','ArrowRight','ArrowUp','ArrowDown','ShiftLeft','ShiftRight'].includes(e.code)){e.preventDefault();this.keys.add(e.code);}}, {signal});
    window.addEventListener('keyup',e=>this.keys.delete(e.code),{signal});window.addEventListener('blur',()=>this.clear(),{signal});document.addEventListener('visibilitychange',()=>{if(document.hidden)this.clear();},{signal});
    canvas.addEventListener('pointerdown',e=>{if(!this.enabled||e.button!==0)return;canvas.focus();this.dragging=true;this.pointer=e.pointerId;this.lastX=e.clientX;this.lastY=e.clientY;canvas.setPointerCapture(e.pointerId);},{signal});
    canvas.addEventListener('pointermove',e=>{if(!this.enabled||!this.dragging||this.pointer!==e.pointerId)return;this.orientation.y-=(e.clientX-this.lastX)*.0025*this.lookSpeed;this.orientation.x=Math.max(-1.5,Math.min(1.5,this.orientation.x-(e.clientY-this.lastY)*.0025*this.lookSpeed));this.lastX=e.clientX;this.lastY=e.clientY;this.target.setFromEuler(this.orientation);},{signal});
    canvas.addEventListener('pointerup',()=>this.release(),{signal});canvas.addEventListener('pointercancel',()=>this.release(),{signal});canvas.addEventListener('lostpointercapture',()=>{this.dragging=false;this.pointer=undefined;},{signal});this.sync();
  }
  private editing(target:EventTarget|null){const e=target as HTMLElement|null;return e?.isContentEditable||['INPUT','SELECT','TEXTAREA','BUTTON'].includes(e?.tagName??'');}
  private release(){if(this.pointer!==undefined&&this.canvas.hasPointerCapture(this.pointer))this.canvas.releasePointerCapture(this.pointer);this.dragging=false;this.pointer=undefined;}
  clear(){this.keys.clear();this.velocity.set(0,0,0);this.release();}
  sync(){this.clear();this.orientation.setFromQuaternion(this.camera.quaternion,'YXZ');this.target.copy(this.camera.quaternion);}
  update(delta:number){
    if(!this.enabled)return;const dt=Math.max(0,Math.min(.1,delta)),boost=this.keys.has('ShiftLeft')||this.keys.has('ShiftRight')?3:1;
    const yaw=Number(this.keys.has('ArrowLeft'))-Number(this.keys.has('ArrowRight')),pitch=Number(this.keys.has('ArrowUp'))-Number(this.keys.has('ArrowDown'));
    this.orientation.y+=yaw*dt*this.lookSpeed;this.orientation.x=Math.max(-1.5,Math.min(1.5,this.orientation.x+pitch*dt*this.lookSpeed));this.target.setFromEuler(this.orientation);
    this.camera.quaternion.slerp(this.target,1-Math.exp(-dt*5*this.motionSpeed));
    this.direction.set(Number(this.keys.has('KeyD'))-Number(this.keys.has('KeyA')),0,Number(this.keys.has('KeyS'))-Number(this.keys.has('KeyW'))).applyQuaternion(this.camera.quaternion);
    this.direction.y+=Number(this.keys.has('KeyE'))-Number(this.keys.has('KeyQ'));if(this.direction.lengthSq()>1)this.direction.normalize();this.direction.multiplyScalar(this.moveSpeed*boost);
    // Exact integrated exponential velocity gives smooth acceleration and stopping.
    const k=5*this.motionSpeed,blend=1-Math.exp(-k*dt),previous=this.velocity.clone();this.velocity.lerp(this.direction,blend);
    this.camera.position.addScaledVector(this.direction,dt).addScaledVector(previous.sub(this.direction),blend/k);
  }
  dispose(){this.clear();this.listeners.abort();}
}
