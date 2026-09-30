import { BufferAttribute,BufferGeometry,CylinderGeometry,Group,Line,LineBasicMaterial,Mesh,MeshStandardMaterial,PerspectiveCamera,RingGeometry,SphereGeometry,Vector3,BoxGeometry,ConeGeometry,MeshBasicMaterial,DoubleSide } from 'three';
import type { FishingSystem } from '../gameplay/FishingSystem';
import { FISHING_WATER } from '../gameplay/FishingCatalog';
import { waveHeight } from '../world/ocean/WaveMath';

/** Procedural equipment follows the camera; the float and line stay in world space. */
export class FishingPresentation extends Group {
  private rod=new Group();private bobber=new Group();private fish=new Group();
  private tip=new Vector3();private landing=new Vector3();private grip=new Vector3();
  private lineGeometry=new BufferGeometry();private line:Line;
  private fishMaterial=new MeshStandardMaterial({color:'#a8c8c0',roughness:.75});
  private ripples:Mesh<RingGeometry,MeshBasicMaterial>[]=[];
  private animationTime=0;
  constructor(private camera:PerspectiveCamera,private fishing:FishingSystem){
    super();this.name='FishingPresentation';this.visible=false;
    const wood=new MeshStandardMaterial({color:'#99764a',roughness:.9}),dark=new MeshStandardMaterial({color:'#233c3a',roughness:.8});
    const pole=new Mesh(new CylinderGeometry(.004,.012,.88,6),wood);pole.position.y=.4;
    const handle=new Mesh(new CylinderGeometry(.018,.018,.16,6),dark);handle.position.y=-.08;
    const reel=new Mesh(new CylinderGeometry(.045,.045,.03,10),dark);reel.rotation.z=Math.PI/2;reel.position.set(.03,-.05,0);
    this.rod.add(pole,handle,reel);this.add(this.rod);
    const red=new MeshStandardMaterial({color:'#de765b'}),cream=new MeshStandardMaterial({color:'#f4e9b3'});
    const float=new Mesh(new SphereGeometry(.035,8,6),red),stem=new Mesh(new CylinderGeometry(.009,.009,.13,6),cream);stem.position.y=.045;
    this.bobber.add(float,stem);this.add(this.bobber);
    this.lineGeometry.setAttribute('position',new BufferAttribute(new Float32Array(9),3));
    this.line=new Line(this.lineGeometry,new LineBasicMaterial({color:'#d8e0c9',transparent:true,opacity:.85}));this.line.frustumCulled=false;this.add(this.line);
    const body=new Mesh(new BoxGeometry(.23,.08,.065),this.fishMaterial),tail=new Mesh(new ConeGeometry(.075,.1,3),this.fishMaterial);tail.rotation.z=-Math.PI/2;tail.position.x=-.15;
    const eye=new Mesh(new BoxGeometry(.015,.015,.07),dark);eye.position.x=.08;
    this.fish.add(body,tail,eye);this.add(this.fish);
    for(let i=0;i<3;i++){const ring=new Mesh(new RingGeometry(.11,.12,24),new MeshBasicMaterial({color:'#d2e9d1',transparent:true,opacity:.3,side:DoubleSide,depthWrite:false}));ring.rotation.x=-Math.PI/2;this.ripples.push(ring);this.add(ring);}
  }
  update(waterTime:number,storm:number,delta:number){
    this.visible=this.fishing.active;if(!this.visible)return;
    this.animationTime+=delta;const time=this.animationTime;
    const state=this.fishing.state,p=this.fishing.phaseProgress,fighting=state==='FIGHTING';
    this.grip.set(.19,-.22,-.26).applyQuaternion(this.camera.quaternion).add(this.camera.position);
    this.rod.position.copy(this.grip);this.rod.quaternion.copy(this.camera.quaternion);this.rod.rotateX(-.8+(state==='CASTING'?Math.sin(p*Math.PI)*.9:state==='REELING'?-.3:fighting?Math.sin(time*9)*.03:0));this.rod.rotateZ(-.2);
    this.rod.updateWorldMatrix(true,false);this.tip.set(0,.84,0).applyMatrix4(this.rod.matrixWorld);
    const x=FISHING_WATER.x+(fighting?Math.sin(time*4)*.12:0),z=FISHING_WATER.z+(fighting?Math.sin(time*5)*.12:0);
    this.landing.set(x,waveHeight(x,z,waterTime,storm)+.025,z);
    this.bobber.position.copy(this.landing);
    if(state==='CASTING')this.bobber.position.lerpVectors(this.tip,this.landing,p).y+=Math.sin(p*Math.PI)*.55;
    if(state==='BITE'||fighting)this.bobber.position.y-=.04+Math.abs(Math.sin(time*12))*.06;
    if(state==='REELING')this.bobber.position.lerp(this.grip,p).y+=Math.sin(p*Math.PI)*.3;
    this.bobber.rotation.z=fighting?Math.sin(time*11)*.5:Math.sin(time*3)*.08;
    const vertices=this.lineGeometry.getAttribute('position') as BufferAttribute;
    vertices.setXYZ(0,this.tip.x,this.tip.y,this.tip.z);
    vertices.setXYZ(1,(this.tip.x+this.bobber.position.x)/2,(this.tip.y+this.bobber.position.y)/2-(fighting?.015:.08),(this.tip.z+this.bobber.position.z)/2);
    vertices.setXYZ(2,this.bobber.position.x,this.bobber.position.y,this.bobber.position.z);vertices.needsUpdate=true;
    this.fish.visible=state==='REELING';if(this.fish.visible){this.fishMaterial.color.set(this.fishing.hookedFish?.fishing.color??'#a8c8c0');this.fish.position.copy(this.bobber.position);this.fish.position.y-=.12;this.fish.rotation.set(0,time*8,.3);}
    for(let i=0;i<this.ripples.length;i++){const ring=this.ripples[i],r=(time*(fighting||state==='BITE'?2:1)+i/3)%1;ring.visible=state!=='CASTING'&&state!=='REELING';ring.position.copy(this.landing);ring.position.y+=.01;ring.scale.setScalar(.5+r*(fighting?2.8:1.8));ring.material.opacity=(1-r)*(fighting?.65:.32);}
  }
}
