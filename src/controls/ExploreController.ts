import { Euler, PerspectiveCamera, Quaternion, Vector3 } from 'three';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';
import { groundHeight,islandBottomHeight,islandHeight } from '../world/island/Island';
import { WATER_LEVEL } from '../world/ocean/WaveMath';
import { bottleRadiusAt } from '../world/bottle/Bounds';
import { DOCK } from '../world/island/Dock';
import { hitsWorldObstacle, resolveVerticalCollision } from '../world/Collision';

const MAX_LOOK_DELTA=60;

export class ExploreController {
  readonly pointer:PointerLockControls;active=false;swimming=false;underwater=false;
  private keys=new Set<string>();private velocityY=0;private forward=new Vector3();private right=new Vector3();private move=new Vector3();private up=new Vector3(0,1,0);
  private dragging=false;private euler=new Euler(0,0,0,'YXZ');private lookRotation=new Quaternion();private lookPending=false;private eyeHeight=.44;
  onInteract=()=>{};onLockChange=(locked:boolean)=>{void locked;};
  grounded=false;
  get sprinting(){return this.keys.has('ShiftLeft')||this.keys.has('ShiftRight');}
  constructor(private camera:PerspectiveCamera,private element:HTMLElement) {
    this.pointer=new PointerLockControls(camera);this.pointer.pointerSpeed=.65;
    this.pointer.addEventListener('lock',()=>this.onLockChange(true));
    this.pointer.addEventListener('unlock',()=>{this.keys.clear();this.onLockChange(false);});
    window.addEventListener('keydown',event=>{
      if(!this.active||event.target instanceof HTMLButtonElement)return;
      if(['Space','KeyW','KeyA','KeyS','KeyD','KeyC','ShiftLeft','ShiftRight','KeyE'].includes(event.code))event.preventDefault();
      this.keys.add(event.code);if(event.code==='KeyE'&&!event.repeat)this.onInteract();
    });
    window.addEventListener('keyup',event=>this.keys.delete(event.code));
    window.addEventListener('blur',()=>{this.keys.clear();this.dragging=false;});
    element.addEventListener('pointerdown',event=>{if(!this.active)return;this.syncLook();this.dragging=true;element.setPointerCapture(event.pointerId);});
    element.addEventListener('pointerup',()=>this.dragging=false);
    element.addEventListener('pointercancel',()=>this.dragging=false);
    element.addEventListener('lostpointercapture',()=>this.dragging=false);
    element.addEventListener('pointermove',event=>{
      if(!this.active||this.pointer.isLocked||!this.dragging)return;
      this.rotateView(event.movementX,event.movementY,.003);
    });
    element.ownerDocument?.addEventListener('mousemove',event=>{
      if(!this.active||!this.pointer.isLocked)return;
      event.stopImmediatePropagation();this.rotateView(event.movementX,event.movementY,.002*this.pointer.pointerSpeed);
    },true);
    element.addEventListener('dblclick',()=>{if(this.active)this.lock();});
  }
  enter(requestLock=true){this.active=true;this.camera.near=.08;this.camera.far=40;this.camera.fov=68;this.camera.updateProjectionMatrix();this.camera.position.set(.65,3.68+this.eyeHeight,1.87);this.camera.lookAt(-.65,4.8,-.4);this.velocityY=0;this.syncLook();if(requestLock)this.lock();}
  exit(){this.active=false;if(this.pointer.domElement)this.pointer.unlock();this.keys.clear();this.camera.near=.12;this.camera.far=200;this.camera.fov=34;this.camera.updateProjectionMatrix();this.swimming=false;this.underwater=false;}
  suspend(){this.active=false;this.keys.clear();this.dragging=false;if(this.pointer.domElement)this.pointer.unlock();}
  private lock(){
    // Some embedded browsers deny Pointer Lock. Drag-look remains fully usable.
    if(this.pointer.domElement)this.pointer.disconnect();
    try {void Promise.resolve(this.element.requestPointerLock()).then(()=>{
      if(!this.active){document.exitPointerLock();return;}
      if(document.pointerLockElement===this.element){this.syncLook();this.pointer.connect(this.element);this.pointer.isLocked=true;this.onLockChange(true);}
    }).catch(()=>this.onLockChange(false));}catch{this.onLockChange(false);}
  }
  update(delta:number){
    if(!this.active)return;
    // Bound both gravity integration and horizontal travel after a slow frame.
    const elapsed=Math.min(.1,Math.max(0,delta));this.smoothLook(elapsed);
    const steps=Math.max(1,Math.ceil(elapsed/(1/120)));
    for(let step=0;step<steps;step++)this.updateStep(elapsed/steps);
  }
  private updateStep(delta:number){
    const p=this.camera.position,ground=this.supportHeight(p.x,p.z,p.y);
    this.swimming=ground<WATER_LEVEL-.2&&p.y<WATER_LEVEL+.42;
    this.camera.getWorldDirection(this.forward);if(!this.swimming)this.forward.y=0;this.forward.normalize();
    this.right.crossVectors(this.forward,this.up).normalize();this.move.set(0,0,0);
    if(this.keys.has('KeyW'))this.move.add(this.forward);if(this.keys.has('KeyS'))this.move.sub(this.forward);
    if(this.keys.has('KeyD'))this.move.add(this.right);if(this.keys.has('KeyA'))this.move.sub(this.right);
    const speed=(this.keys.has('ShiftLeft')||this.keys.has('ShiftRight')?1.9:1.05)*delta;
    if(this.move.lengthSq()>0)this.move.normalize().multiplyScalar(speed);
    const nextX=p.x+this.move.x,nextZ=p.z+this.move.z;
    if(!this.blocked(nextX,p.z,p.y))p.x=nextX;
    if(!this.blocked(p.x,nextZ,p.y))p.z=nextZ;
    const floor=this.supportHeight(p.x,p.z,p.y)+this.eyeHeight,previousY=p.y;
    if(this.swimming){
      // Carry a falling player's momentum through the surface, then damp it in water.
      // Clearing velocity here used to stop jumps above the underwater threshold.
      p.y+=this.move.y+this.velocityY*delta;this.velocityY*=Math.exp(-delta*4);
      if(Math.abs(this.velocityY)<.005)this.velocityY=0;
      if(this.keys.has('Space'))p.y+=speed;if(this.keys.has('KeyC'))p.y-=speed;
      if(!this.keys.has('KeyC')&&!this.keys.has('Space')&&p.y>WATER_LEVEL+.1)p.y+=(WATER_LEVEL+.1-p.y)*delta*4;
      // Preserve a continuous descent when switching from falling to swimming.
      p.y=Math.max(1.88,Math.min(Math.max(previousY,WATER_LEVEL+.35),p.y));
    }else{
      if(p.y<=floor+.03&&this.keys.has('Space')){this.velocityY=2.2;this.keys.delete('Space');}
      this.velocityY-=5*delta;p.y+=this.velocityY*delta;
      if(p.y<floor){p.y=floor;this.velocityY=0;}
    }
    let resolvedY=resolveVerticalCollision(p.x,p.z,previousY,p.y);
    const islandBottom=islandBottomHeight(p.x,p.z)-.14;
    if(islandBottom>0&&previousY<=islandBottom&&resolvedY>islandBottom)resolvedY=islandBottom;
    if(resolvedY!==p.y)this.velocityY=0;
    p.y=resolvedY;
    p.x=Math.max(-5.55,Math.min(5.2,p.x));
    const radius=bottleRadiusAt(p.x)-.18;
    p.y=Math.max(3.72-radius+.1,Math.min(3.72+radius-.1,p.y));
    const zLimit=Math.sqrt(Math.max(.12,radius*radius-(p.y-3.72)**2))-.1;
    p.z=Math.max(-zLimit,Math.min(zLimit,p.z));
    this.underwater=p.y<WATER_LEVEL-.07;
    this.grounded=!this.swimming&&Math.abs(p.y-floor)<.035&&this.velocityY===0;
  }
  private supportHeight(x:number,z:number,y:number){
    const ground=groundHeight(x,z);
    // The deck is overhead when swimming underneath it, not a landing surface.
    if(ground===DOCK.height&&y<DOCK.height)return 1.65;
    const bottom=islandBottomHeight(x,z);
    return bottom>0&&y<=bottom-.139?1.65:ground;
  }
  private rotateView(movementX:number,movementY:number,sensitivity:number){
    // Pointer capture/lock changes can report cursor-warp deltas. Clamping those
    // still produced a visible turn; discard the anomalous event entirely.
    if(!Number.isFinite(movementX)||!Number.isFinite(movementY)||Math.abs(movementX)>MAX_LOOK_DELTA||Math.abs(movementY)>MAX_LOOK_DELTA)return;
    const dx=movementX,dy=movementY;
    if(!this.lookPending)this.euler.setFromQuaternion(this.camera.quaternion);
    this.euler.y-=dx*sensitivity;this.euler.x=Math.max(-1.5,Math.min(1.5,this.euler.x-dy*sensitivity));
    this.lookRotation.setFromEuler(this.euler);this.lookPending=true;
  }
  syncLook(){this.euler.setFromQuaternion(this.camera.quaternion);this.lookRotation.copy(this.camera.quaternion);this.lookPending=false;}
  private smoothLook(delta:number){
    if(!this.lookPending)return;
    this.camera.quaternion.slerp(this.lookRotation,1-Math.exp(-delta*24));
    if(this.camera.quaternion.angleTo(this.lookRotation)<.0001){this.camera.quaternion.copy(this.lookRotation);this.lookPending=false;}
  }
  private blocked(x:number,z:number,y:number){
    if(hitsWorldObstacle(x,z,y))return true;
    const terrain=islandHeight(x,z);
    if(!terrain)return false;
    return y>islandBottomHeight(x,z)-.139&&terrain>y-this.eyeHeight+.25;
  }
}

