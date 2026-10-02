import { Group, MeshStandardMaterial } from 'three';
import { RainSystem } from './RainSystem';
import { LightningSystem } from './LightningSystem';
import { VoxelBatch,seededRandom } from '../utils/voxel';
import { WEATHER_KINDS,WEATHER_PROFILES,normalizeWeather } from './WeatherState';
import type { WeatherFrame,WeatherKind,WeatherSnapshot } from './WeatherState';
export class WeatherSystem extends Group {
  kind:WeatherKind='CLEAR';readonly frame:WeatherFrame={...WEATHER_PROFILES.CLEAR,wetness:0,windPhase:0};readonly rain=new RainSystem();readonly lightning=new LightningSystem();
  get storm(){return this.kind==='STORM';}set storm(value:boolean){this.kind=value?'STORM':'CLEAR';}
  get intensity(){return this.frame.storm;}set intensity(value:number){this.frame.storm=Math.max(0,Math.min(1,value));}
  private farm=false;private sheltered=false;
  setWeather(kind:WeatherKind){this.kind=kind;}
  cycle(){this.kind=WEATHER_KINDS[(WEATHER_KINDS.indexOf(this.kind)+1)%WEATHER_KINDS.length];}
  snapshot():WeatherSnapshot{return {kind:this.kind,...this.frame};}
  restore(value:unknown,storm=false,intensity=0){const {kind,...frame}=normalizeWeather(value,storm,intensity);this.kind=kind;Object.assign(this.frame,frame);this.lastTime=undefined;}
  configure(farm:boolean,sheltered=false){this.farm=farm;this.sheltered=sheltered;this.rain.configure(farm);this.clouds.visible=!farm;this.lightning.scale.setScalar(farm?5:1);this.lightning.position.y=farm?8:0;this.lightning.position.z=farm?-40:0;}
  shelter(value:boolean){this.sheltered=value;this.rain.visible=!value&&this.frame.rain>.03;if(value)this.lightning.visible=false;}
  private cloudPhase=0;private lastTime:number|undefined;
  private clouds=new Group();private cloudMaterial=new MeshStandardMaterial({color:'#3b4c61',transparent:true,opacity:0,roughness:1,flatShading:true,depthWrite:false});
  constructor(){super();const b=new VoxelBatch(),random=seededRandom(441);for(let i=0;i<90;i++){const x=-4.9+random()*9.4,y=5.3+random()*.3,z=-.9+random()*1.2;if(x>-2.2&&x<1.2)continue;b.add('#778795',x,y,z,.25+random()*.4,.15+random()*.2,.3+random()*.3);}const clouds=b.build(this.clouds);clouds.material=this.cloudMaterial;clouds.castShadow=false;this.add(this.clouds,this.rain,this.lightning);}
  update(delta:number,time:number){const dt=Math.max(0,delta),profile=WEATHER_PROFILES[this.kind],blend=1-Math.exp(-dt*1.8);
    for(const key of ['cloud','rain','wind','storm'] as const)this.frame[key]+=(profile[key]-this.frame[key])*blend;
    this.frame.wetness+=(this.frame.rain-this.frame.wetness)*(1-Math.exp(-dt*(this.frame.rain>this.frame.wetness?.12:.012)));
    const elapsed=Math.max(0,time-(this.lastTime??time));this.frame.windPhase+=elapsed*(.35+this.frame.wind*1.1);
    this.clouds.visible=!this.farm&&this.frame.cloud>.3;this.cloudMaterial.opacity=Math.max(0,(this.frame.cloud-.24)/.76)*.92;
    this.cloudPhase+=elapsed*(.04+this.intensity*.08);this.lastTime=time;this.clouds.position.x=Math.sin(this.cloudPhase)*.22;this.clouds.position.y=-this.intensity*.18;
    this.rain.update(time,this.frame.rain,this.frame.wind);this.rain.visible=this.rain.visible&&!this.sheltered;
    this.lightning.update(time,this.intensity);this.lightning.visible=this.lightning.visible&&!this.sheltered;}
}
