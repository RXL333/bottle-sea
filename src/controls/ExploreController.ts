import { Euler, PerspectiveCamera, Vector3 } from 'three';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';
import { WATER_LEVEL } from '../world/ocean/WaveMath';
import { bottleRadiusAt,insideBottle } from '../world/bottle/Bounds';
import { hitsDynamicObstacle, hitsWorldObstacle, PLAYER_FOOT_OFFSET, resolveDynamicOverlap, resolveVerticalCollision, STEP_HEIGHT, supportHeightAt } from '../world/Collision';
import type { DynamicObstacle } from '../world/Collision';

export class ExploreController {
  readonly pointer:PointerLockControls;active=false;swimming=false;underwater=false;renderOffsetY=0;
  private keys=new Set<string>();private velocityY=0;private forward=new Vector3();private right=new Vector3();private move=new Vector3();private up=new Vector3(0,1,0);
  private safePosition=new Vector3();
  private dragging=false;private euler=new Euler(0,0,0,'YXZ');private lookX=0;private lookY=0;private dragX=0;private dragY=0;private dragId:number|null=null;private eyeHeight=PLAYER_FOOT_OFFSET;private headInitialized=false;
  onInteract=()=>{};onLockChange=(locked:boolean)=>{void locked;};
  grounded=false;
  get sprinting(){return this.keys.has('ShiftLeft')||this.keys.has('ShiftRight');}
  constructor(private camera:PerspectiveCamera,private element:HTMLElement,private dynamicObstacles:()=>readonly DynamicObstacle[]=()=>[]) {
    this.pointer=new PointerLockControls(camera);this.pointer.domElement=element;this.pointer.pointerSpeed=.65;
    element.ownerDocument?.addEventListener('pointerlockchange',()=>{
      const locked=element.ownerDocument.pointerLockElement===element;this.pointer.isLocked=locked;
      this.cancelLook();if(!locked)this.keys.clear();this.onLockChange(locked);
    });
    window.addEventListener('keydown',event=>{
      if(!this.active||event.target instanceof HTMLButtonElement)return;
      if(['Space','KeyW','KeyA','KeyS','KeyD','KeyC','ShiftLeft','ShiftRight','KeyE'].includes(event.code))event.preventDefault();
      this.keys.add(event.code);if(event.code==='KeyE'&&!event.repeat)this.onInteract();
    });
    window.addEventListener('keyup',event=>this.keys.delete(event.code));
    window.addEventListener('blur',()=>{this.keys.clear();this.cancelLook();});
    element.addEventListener('pointerdown',event=>{
      if(!this.active||this.pointer.isLocked||this.dragging||event.button!==0)return;
      this.dragX=event.clientX;this.dragY=event.clientY;this.dragId=event.pointerId;this.dragging=true;element.setPointerCapture(event.pointerId);
    });
    element.addEventListener('pointerup',event=>{if(event.pointerId===this.dragId){this.dragging=false;this.dragId=null;}});
    element.addEventListener('pointercancel',()=>this.cancelLook());
    element.addEventListener('lostpointercapture',()=>{this.dragging=false;this.dragId=null;});
    element.addEventListener('pointermove',event=>{
      if(!this.active||this.pointer.isLocked||!this.dragging||event.pointerId!==this.dragId)return;
      if(!Number.isFinite(event.clientX)||!Number.isFinite(event.clientY))return;
      this.rotateView(event.clientX-this.dragX,event.clientY-this.dragY,.002*this.pointer.pointerSpeed);
      this.dragX=event.clientX;this.dragY=event.clientY;
    });
    element.ownerDocument?.addEventListener('mousemove',event=>{
      if(!this.active||!this.pointer.isLocked)return;
      this.rotateView(event.movementX,event.movementY,.002*this.pointer.pointerSpeed);
    });
    element.addEventListener('dblclick',()=>{if(this.active)this.lock();});
  }
  enter(requestLock=true){this.active=true;this.camera.near=.08;this.camera.far=40;this.camera.fov=68;this.camera.updateProjectionMatrix();this.camera.position.set(.65,3.68+this.eyeHeight,1.87);this.camera.lookAt(-.65,4.8,-.4);this.velocityY=0;this.renderOffsetY=0;this.headInitialized=false;this.syncLook();if(requestLock)this.lock();}
  exit(){this.active=false;this.releaseLock();this.keys.clear();this.camera.near=.12;this.camera.far=200;this.camera.fov=34;this.camera.updateProjectionMatrix();this.swimming=false;this.underwater=false;this.renderOffsetY=0;this.headInitialized=false;}
  suspend(){this.active=false;this.keys.clear();this.cancelLook();this.releaseLock();}
  private releaseLock(){const doc=this.element.ownerDocument;if(doc?.pointerLockElement===this.element)doc.exitPointerLock();else this.pointer.isLocked=false;}
  private lock(){
    // Some embedded browsers deny Pointer Lock. Drag-look remains fully usable.
    try {void Promise.resolve(this.element.requestPointerLock()).then(()=>{
      if(!this.active){document.exitPointerLock();return;}
      if(document.pointerLockElement===this.element){this.pointer.isLocked=true;this.syncLook();this.onLockChange(true);}
    }).catch(()=>this.onLockChange(false));}catch{this.onLockChange(false);}
  }
  update(delta:number,waterSurface=WATER_LEVEL){
    if(!this.active)return;
    // Bound both gravity integration and horizontal travel after a slow frame.
    const elapsed=Math.min(.1,Math.max(0,delta));this.applyLook();this.renderOffsetY=Math.min(0,this.renderOffsetY+elapsed*1.5);
    const steps=Math.max(1,Math.ceil(elapsed/(1/120)));
    for(let step=0;step<steps;step++)this.updateStep(elapsed/steps,waterSurface);
    this.safePosition.copy(this.camera.position);resolveDynamicOverlap(this.camera.position,this.dynamicObstacles());if(hitsWorldObstacle(this.camera.position.x,this.camera.position.z,this.camera.position.y)||!insideBottle(this.camera.position.x,this.camera.position.y,this.camera.position.z,.1))this.camera.position.copy(this.safePosition);
    if(!this.headInitialized){this.underwater=this.camera.position.y<waterSurface;this.headInitialized=true;}
    else if(!this.underwater&&this.camera.position.y<waterSurface-.025)this.underwater=true;
    else if(this.underwater&&this.camera.position.y>waterSurface+.025)this.underwater=false;
  }
  private updateStep(delta:number,waterSurface:number){
    const p=this.camera.position,feet=p.y-this.eyeHeight,ground=supportHeightAt(p.x,p.z,feet);
    this.swimming=ground<waterSurface-.2&&p.y<waterSurface+.42;
    this.camera.getWorldDirection(this.forward);if(!this.swimming)this.forward.y=0;this.forward.normalize();
    this.right.crossVectors(this.forward,this.up).normalize();this.move.set(0,0,0);
    if(this.keys.has('KeyW'))this.move.add(this.forward);if(this.keys.has('KeyS'))this.move.sub(this.forward);
    if(this.keys.has('KeyD'))this.move.add(this.right);if(this.keys.has('KeyA'))this.move.sub(this.right);
    const speed=(this.keys.has('ShiftLeft')||this.keys.has('ShiftRight')?1.9:1.05)*delta;
    if(this.move.lengthSq()>0)this.move.normalize().multiplyScalar(speed);
    this.tryMove(p.x+this.move.x,p.z);this.tryMove(p.x,p.z+this.move.z);
    const floor=supportHeightAt(p.x,p.z,p.y-this.eyeHeight)+this.eyeHeight,previousY=p.y;
    if(this.swimming){
      // Carry a falling player's momentum through the surface, then damp it in water.
      // Clearing velocity here used to stop jumps above the underwater threshold.
      p.y+=this.move.y+this.velocityY*delta;this.velocityY*=Math.exp(-delta*4);
      if(Math.abs(this.velocityY)<.005)this.velocityY=0;
      if(this.keys.has('Space'))p.y+=speed;if(this.keys.has('KeyC'))p.y-=speed;
      if(!this.keys.has('KeyC')&&!this.keys.has('Space')&&p.y>waterSurface+.1)p.y+=(waterSurface+.1-p.y)*delta*4;
      p.y=Math.max(floor,p.y);
    }else{
      if(p.y<=floor+.03&&this.keys.has('Space')){this.velocityY=2.2;this.keys.delete('Space');}
      this.velocityY-=5*delta;p.y+=this.velocityY*delta;
      if(p.y<floor){p.y=floor;this.velocityY=0;}
    }
    let resolvedY=resolveVerticalCollision(p.x,p.z,previousY,p.y);
    if(resolvedY!==p.y)this.velocityY=0;
    p.y=resolvedY;
    p.x=Math.max(-5.55,Math.min(5.2,p.x));
    const radius=bottleRadiusAt(p.x)-.18;
    p.y=Math.max(3.72-radius+.1,Math.min(3.72+radius-.1,p.y));
    const zLimit=Math.sqrt(Math.max(.12,radius*radius-(p.y-3.72)**2))-.1;
    p.z=Math.max(-zLimit,Math.min(zLimit,p.z));
    this.grounded=!this.swimming&&Math.abs(p.y-floor)<.035&&this.velocityY===0;
  }
  private rotateView(movementX:number,movementY:number,sensitivity:number){
    if(!Number.isFinite(movementX)||!Number.isFinite(movementY))return;
    this.lookX+=movementX*sensitivity;this.lookY+=movementY*sensitivity;
  }
  syncLook(){this.lookX=0;this.lookY=0;}
  private cancelLook(){this.dragging=false;this.dragId=null;this.syncLook();}
  private applyLook(){
    if(this.lookX===0&&this.lookY===0)return;
    this.euler.setFromQuaternion(this.camera.quaternion);
    this.euler.y-=this.lookX;this.euler.x=Math.max(-1.5,Math.min(1.5,this.euler.x-this.lookY));
    this.camera.quaternion.setFromEuler(this.euler);this.syncLook();
  }
  private tryMove(x:number,z:number){
    const p=this.camera.position,currentFeet=p.y-this.eyeHeight,targetFloor=supportHeightAt(x,z,currentFeet);
    const rise=targetFloor-currentFeet,candidateY=rise>0&&rise<=STEP_HEIGHT+.001?p.y+rise:p.y;
    if(hitsWorldObstacle(x,z,candidateY)||hitsDynamicObstacle(x,z,candidateY,this.dynamicObstacles()))return false;
    if(rise>STEP_HEIGHT+.001)return false;
    p.x=x;p.z=z;if(candidateY>p.y){p.y=candidateY;this.renderOffsetY-=rise;this.velocityY=0;}return true;
  }
}

