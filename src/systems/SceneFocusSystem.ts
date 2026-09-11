import { PerspectiveCamera,Vector3 } from 'three';
import { easeInOutCubic } from './CameraTransitionSystem';

export const FOCUS_LABELS={overview:'全景',lighthouse:'灯塔',ship:'帆船',island:'岛屿',underwater:'海底'} as const;
export type FocusId=keyof typeof FOCUS_LABELS;
export class SceneFocusSystem {
  active=false;selected:FocusId='overview';private elapsed=0;
  private from=new Vector3();private to=new Vector3();private targetFrom=new Vector3();private targetTo=new Vector3();
  constructor(private camera:PerspectiveCamera,private target:Vector3){}
  start(id:FocusId,ship:Vector3,defaultPosition:Vector3,defaultTarget:Vector3){
    this.selected=id;this.active=true;this.elapsed=0;this.from.copy(this.camera.position);this.targetFrom.copy(this.target);
    switch(id){
      case 'overview':this.to.copy(defaultPosition);this.targetTo.copy(defaultTarget);break;
      case 'lighthouse':this.targetTo.set(.35,5,-.28);this.to.set(1.4,6.1,6);break;
      case 'island':this.targetTo.set(-.8,4.4,0);this.to.set(-.8,6.6,8);break;
      case 'ship':this.targetTo.copy(ship).addScaledVector(SceneFocusSystem.up,.65);this.to.copy(this.targetTo);this.to.y+=1.3;this.to.z+=5.5;break;
      case 'underwater':this.targetTo.set(-1.6,2.2,.3);this.to.set(-1.6,2.6,6.4);break;
    }
  }
  private static up=new Vector3(0,1,0);
  cancel(){this.active=false;}
  update(delta:number){
    if(!this.active)return false;this.elapsed+=Math.max(0,delta);const t=Math.min(1,this.elapsed),e=easeInOutCubic(t);
    this.camera.position.lerpVectors(this.from,this.to,e);this.target.lerpVectors(this.targetFrom,this.targetTo,e);this.camera.lookAt(this.target);
    if(t<1)return false;this.camera.position.copy(this.to);this.target.copy(this.targetTo);this.camera.lookAt(this.target);this.active=false;return true;
  }
}
