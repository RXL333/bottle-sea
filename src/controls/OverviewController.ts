import { PerspectiveCamera } from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

export class OverviewController extends OrbitControls {
  private viewCamera:PerspectiveCamera;
  constructor(camera: PerspectiveCamera, element: HTMLElement) {
    super(camera,element); this.target.set(.5,3.05,0); this.enableDamping=true;this.dampingFactor=.07;
    this.viewCamera=camera;
    this.minDistance=13;this.maxDistance=36;this.minPolarAngle=.65;this.maxPolarAngle=1.65;
    this.minAzimuthAngle=-.75;this.maxAzimuthAngle=.75;this.enablePan=false;
    camera.position.set(.5,6.2,24);this.fit();this.update();this.saveState();
  }
  fit(){const distance=24*Math.max(1,1.65/this.viewCamera.aspect);this.minDistance=distance*.5;this.maxDistance=distance*1.5;this.viewCamera.position.sub(this.target).normalize().multiplyScalar(distance).add(this.target);this.update();this.saveState();}
}
