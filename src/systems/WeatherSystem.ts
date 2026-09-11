import { Group, MeshStandardMaterial } from 'three';
import { RainSystem } from './RainSystem';
import { LightningSystem } from './LightningSystem';
import { VoxelBatch,seededRandom } from '../utils/voxel';
export class WeatherSystem extends Group {
  storm=false;intensity=0;readonly rain=new RainSystem();readonly lightning=new LightningSystem();
  private cloudPhase=0;private lastTime=0;
  private clouds=new Group();private cloudMaterial=new MeshStandardMaterial({color:'#3b4c61',transparent:true,opacity:0,roughness:1,flatShading:true,depthWrite:false});
  constructor(){super();const b=new VoxelBatch(),random=seededRandom(441);for(let i=0;i<90;i++){const x=-4.9+random()*9.4,y=5.3+random()*.3,z=-.9+random()*1.2;if(x>-2.2&&x<1.2)continue;b.add('#778795',x,y,z,.25+random()*.4,.15+random()*.2,.3+random()*.3);}const clouds=b.build(this.clouds);clouds.material=this.cloudMaterial;clouds.castShadow=false;this.add(this.clouds,this.rain,this.lightning);}
  update(delta:number,time:number){this.intensity+=(Number(this.storm)-this.intensity)*(1-Math.exp(-delta*1.8));this.clouds.visible=this.intensity>.01;this.cloudMaterial.opacity=this.intensity*.92;
    this.cloudPhase+=Math.max(0,time-this.lastTime)*(.04+this.intensity*.08);this.lastTime=time;this.clouds.position.x=Math.sin(this.cloudPhase)*.22;this.clouds.position.y=-this.intensity*.18;
    this.rain.update(time,this.intensity);this.lightning.update(time,this.intensity);}
}
