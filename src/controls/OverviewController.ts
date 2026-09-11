import { PerspectiveCamera,Quaternion,Vector3 } from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

export class OverviewController extends OrbitControls {
  private viewCamera:PerspectiveCamera;
  private savedPosition=new Vector3();private savedRotation=new Quaternion();
  constructor(camera: PerspectiveCamera, element: HTMLElement) {
    super(camera,element); this.target.set(.5,3.05,0); this.enableDamping=true;this.dampingFactor=.07;
    this.viewCamera=camera;
    this.minDistance=13;this.maxDistance=36;this.minPolarAngle=.65;this.maxPolarAngle=1.65;
    this.minAzimuthAngle=-.75;this.maxAzimuthAngle=.75;this.enablePan=false;
    camera.position.set(.5,6.2,24);this.fit();this.update();this.saveState();
  }
  fit(reframe=true){
    const distance=24*Math.max(1,1.65/this.viewCamera.aspect);this.maxDistance=distance*1.5;
    this.target0.set(.5,3.05,0);this.position0.set(0,3.15,24).normalize().multiplyScalar(distance).add(this.target0);
    if(reframe){this.minDistance=distance*.5;this.target.copy(this.target0);this.viewCamera.position.copy(this.position0);this.update();}
  }
  suspend(){
    // Drain OrbitControls damping without moving the externally owned camera pose.
    this.savedPosition.copy(this.viewCamera.position);this.savedRotation.copy(this.viewCamera.quaternion);
    this.enableDamping=false;this.update();this.enableDamping=true;
    this.viewCamera.position.copy(this.savedPosition);this.viewCamera.quaternion.copy(this.savedRotation);this.enabled=false;
  }
}
