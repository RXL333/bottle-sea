import type { PerspectiveCamera, WebGLRenderer } from 'three';
export class PerformanceMonitor {
  private last=performance.now();private frames=0;private total=0;private worst=0;
  constructor(private renderer:WebGLRenderer,private output:HTMLElement,private camera:PerspectiveCamera){}
  update(cpuMs:number){
    const now=performance.now(),elapsed=now-this.last;this.last=now;
    if(elapsed>1000){this.frames=0;this.total=0;return;}
    this.frames++;this.total+=elapsed;this.worst=Math.max(this.worst,elapsed);
    if(this.total<1000)return;
    const memory=(performance as Performance & {memory?:{usedJSHeapSize:number}}).memory;
    const info=this.renderer.info,details=`${Math.round(this.frames*1000/this.total)} FPS · ${info.render.calls} calls · ${info.render.triangles.toLocaleString()} triangles · ${info.memory.geometries} geometries · CPU ${cpuMs.toFixed(1)} ms · max frame ${this.worst.toFixed(1)} ms · ${document.visibilityState}${memory?` · heap ${(memory.usedJSHeapSize/1048576).toFixed(1)} MB`:''}`;
    this.output.textContent=`· ${Math.round(this.frames*1000/this.total)} FPS`;this.output.title=details;
    this.renderer.domElement.dataset.performance=details;
    this.renderer.domElement.dataset.position=this.camera.position.toArray().map(n=>n.toFixed(3)).join(',');
    this.frames=0;this.total=0;this.worst=0;
  }
}
