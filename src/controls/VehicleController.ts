import { Quaternion,Vector3 } from 'three';
import type { PerspectiveCamera } from 'three';
import type { ExploreController } from './ExploreController';
import type { DriveableVehicle } from '../systems/vehicles/Vehicle';
import { VehicleFollowCamera } from '../systems/vehicles/VehicleFollowCamera';
import type { SpawnPoint } from '../worlds/types';
import type { InteractionOutcome } from '../systems/InteractionSystem';

export class VehicleController {
  vehicle:DriveableVehicle|undefined;
  phase:'BOARDING'|'DRIVING'|'EXITING'='BOARDING';
  private keys=new Set<string>();private elapsed=0;private start=new Vector3();
  private startRotation=new Quaternion();private exitRotation=new Quaternion();
  private exitSpawn?:SpawnPoint;private follow:VehicleFollowCamera;
  onInteract=()=>{};onHitch=()=>{};onWork=()=>{};onDismount=(spawn:SpawnPoint)=>{void spawn;};onPark=()=>{};
  onSeed=(cropId?:string)=>{void cropId;};onMachine=()=>{};onUnload=()=>{};
  selectSeed(cropId?:string){if(this.phase==='DRIVING'&&this.active){this.element.focus();this.onSeed(cropId);}}
  get active(){return !!this.vehicle;}
  get braking(){return this.keys.has('Space');}
  get position(){return this.vehicle?.seatPosition();}
  constructor(private camera:PerspectiveCamera,private element:HTMLElement,private explorer:ExploreController){
    this.follow=new VehicleFollowCamera(camera);
    window.addEventListener('keydown',event=>{
      const target=event.target as HTMLElement|null;
      if(!this.active||target?.isContentEditable||['BUTTON','INPUT','TEXTAREA','SELECT'].includes(target?.tagName??''))return;
      if(!['KeyW','KeyS','KeyA','KeyD','Space','KeyE','KeyH','KeyJ','KeyK','KeyL','KeyU'].includes(event.code))return;
      event.preventDefault();const pressed=!this.keys.has(event.code);this.keys.add(event.code);
      if(event.code==='KeyE'&&pressed&&!event.repeat)this.onInteract();
      if(event.code==='KeyH'&&pressed&&!event.repeat&&this.phase==='DRIVING')this.onHitch();
      if(event.code==='KeyJ'&&pressed&&!event.repeat&&this.phase==='DRIVING')this.onWork();
      if(event.code==='KeyK'&&pressed&&!event.repeat)this.selectSeed();
      if(event.code==='KeyL'&&pressed&&!event.repeat&&this.phase==='DRIVING')this.onMachine();
      if(event.code==='KeyU'&&pressed&&!event.repeat&&this.phase==='DRIVING')this.onUnload();
    });
    window.addEventListener('keyup',event=>this.keys.delete(event.code));
    const pause=()=>{this.keys.clear();this.vehicle?.stop();if(this.active)this.onPark();};
    window.addEventListener('blur',pause);document.addEventListener('visibilitychange',()=>{if(document.hidden)pause();});
    element.ownerDocument.addEventListener('pointerlockchange',()=>{if(element.ownerDocument.pointerLockElement!==element)pause();});
    element.addEventListener('dblclick',()=>{if(this.active)try{void Promise.resolve(element.requestPointerLock()).catch(()=>{});}catch{/* Keyboard driving works without lock. */}});
  }
  board(vehicle:DriveableVehicle):InteractionOutcome {
    if(this.active||!this.explorer.active||vehicle.occupied)return {status:'unavailable',message:'当前无法上车。'};
    if(!vehicle.findExit())return {status:'unavailable',message:'车旁没有安全落脚点，请从另一侧靠近。'};
    this.explorer.suspend(true);this.vehicle=vehicle;vehicle.occupy(true);this.keys.clear();this.keys.add('KeyE');
    this.phase='BOARDING';this.capture();this.follow.reset(vehicle);this.camera.near=.08;this.camera.far=150;this.camera.fov=68;this.camera.updateProjectionMatrix();
    document.body.classList.add('driving');this.element.focus();
    return {status:'success',message:'已上车 · W/S 前进后退 · A/D 转向 · Space 刹车 · 停稳后 E 下车'};
  }
  dismount():InteractionOutcome {
    if(!this.vehicle||this.phase!=='DRIVING')return {status:'unavailable',message:'请等待上下车完成。'};
    if(Math.abs(this.vehicle.speed)>.12)return {status:'unavailable',message:'请先按 Space 刹车，停稳后再下车。'};
    const spawn=this.vehicle.findExit(this.camera.position);if(!spawn)return {status:'unavailable',message:'车旁被障碍物挡住，请开到空旷处再下车。'};
    this.vehicle.stop();this.keys.clear();this.exitSpawn=spawn;this.phase='EXITING';this.capture();this.onPark();
    this.exitRotation.setFromAxisAngle(new Vector3(0,1,0),this.vehicle.yaw+Math.PI);
    return {status:'success'};
  }
  private capture(){this.elapsed=0;this.start.copy(this.camera.position);this.startRotation.copy(this.camera.quaternion);}
  update(delta:number){
    const vehicle=this.vehicle;if(!vehicle)return;const dt=Math.min(.1,Math.max(0,delta));
    if(this.phase==='DRIVING'){
      vehicle.advance(dt,{throttle:Number(this.keys.has('KeyW'))-Number(this.keys.has('KeyS')),steer:Number(this.keys.has('KeyA'))-Number(this.keys.has('KeyD')),brake:this.braking||document.hidden||!document.hasFocus()});
      this.follow.update(dt,vehicle);return;
    }
    this.elapsed+=dt;const p=Math.min(1,this.elapsed/.8),ease=(t:number)=>t*t*(3-2*t);
    if(this.phase==='BOARDING'){
      const end=this.follow.destination(vehicle),lift=this.start.clone();lift.y=Math.max(lift.y+1.5,end.position.y);
      if(p<.4)this.camera.position.lerpVectors(this.start,lift,ease(p/.4));else this.camera.position.lerpVectors(lift,end.position,ease((p-.4)/.6));
      this.camera.position.copy(vehicle.clipCamera(p<.4?this.start:end.target,this.camera.position));
      this.follow.look(end.target,1-Math.exp(-dt*8));
      if(p===1)this.phase='DRIVING';
    }else if(this.exitSpawn){
      const end=new Vector3().fromArray(this.exitSpawn.position),lift=end.clone();lift.y=Math.max(this.start.y,end.y+1.6);
      if(p<.6)this.camera.position.lerpVectors(this.start,lift,ease(p/.6));else this.camera.position.lerpVectors(lift,end,ease((p-.6)/.4));
      this.camera.position.copy(vehicle.clipCamera(p<.6?this.start:lift,this.camera.position));
      this.camera.quaternion.slerpQuaternions(this.startRotation,this.exitRotation,ease(p));
      if(p===1){const spawn=this.exitSpawn;vehicle.occupy(false);this.vehicle=undefined;this.exitSpawn=undefined;this.keys.clear();document.body.classList.remove('driving');this.onDismount(spawn);this.onPark();}
    }
  }
}
