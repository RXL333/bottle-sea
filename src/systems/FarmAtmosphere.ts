import { SEASONS } from '../gameplay/calendar/SeasonRegistry';
import type { SeasonVisual } from '../gameplay/calendar/CalendarSystem';
import { BackSide,BufferGeometry,Color,DirectionalLight,Float32BufferAttribute,Fog,Group,Mesh,MeshBasicMaterial,Points,PointsMaterial,ShaderMaterial,SphereGeometry,Vector3 } from 'three';
import type { Quality } from '../core/Renderer';
import type { WeatherFrame } from './WeatherState';
import { daylightAt,dawnWeight,sunsetWeight } from './DayTimeMath';
import { seededRandom,VoxelBatch } from '../utils/voxel';

export const ATMOSPHERE_QUALITY={LOW:{clouds:12,stars:0},MEDIUM:{clouds:24,stars:90},HIGH:{clouds:36,stars:160}};
/** Linear distant fog leaves the nearby roads and work parcels clear. */
export function farmFogRange(dayTime:number,weather:WeatherFrame){return {near:46-weather.rain*8-dawnWeight(dayTime)*10,far:180-weather.cloud*22-weather.rain*25-dawnWeight(dayTime)*15};}

/** A single gradient dome and bounded, merged voxel cloud clusters; no weather clock. */
export class FarmAtmosphere extends Group {
  readonly fog=new Fog('#b4d4df',46,180);
  readonly rim=new DirectionalLight('#ffdba4',0);
  private top={value:new Color('#468dd3')};private horizon={value:new Color('#c6e6ed')};
  private cloudColor=new Color('#fff6e4');private direction={value:new Vector3(-1,1,.25).normalize()};
  private daylight={value:1};private flash={value:0};private night={value:0};
  private clouds:{group:Group;material:MeshBasicMaterial;x:number;z:number;high:boolean}[]=[];
  private stars:Points<BufferGeometry,PointsMaterial>;private quality:Quality='MEDIUM';private initialized=false;
  private dome:Mesh<SphereGeometry,ShaderMaterial>;
  get diagnostics(){return {clouds:ATMOSPHERE_QUALITY[this.quality].clouds,stars:ATMOSPHERE_QUALITY[this.quality].stars,fogNear:this.fog.near,fogFar:this.fog.far,skyTop:this.top.value.getHexString(),horizon:this.horizon.value.getHexString()};}
  constructor(){
    super();this.name='FarmAtmosphere';
    this.dome=new Mesh(new SphereGeometry(115,32,16),new ShaderMaterial({side:BackSide,depthWrite:false,fog:false,toneMapped:false,uniforms:{skyTop:this.top,skyHorizon:this.horizon,sunDirection:this.direction,daylight:this.daylight,skyFlash:this.flash,night:this.night},vertexShader:`varying vec3 skyDirection;void main(){skyDirection=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`,fragmentShader:`
      uniform vec3 skyTop,skyHorizon,sunDirection;uniform float daylight,skyFlash,night;varying vec3 skyDirection;
      void main(){vec3 d=normalize(skyDirection);float height=pow(clamp(d.y,0.0,1.0),.65);vec3 color=mix(skyHorizon,skyTop,height);
        float glow=pow(max(dot(d,sunDirection),0.0),20.0)*daylight;
        color+=vec3(.24,.12,.035)*glow;
        float sun=smoothstep(.9992,.9997,dot(d,sunDirection))*daylight;
        float moon=smoothstep(.9993,.9998,dot(d,-sunDirection))*night;
        color=mix(color,vec3(1.0,.86,.57),sun*.9);color=mix(color,vec3(.77,.85,.93),moon*.85);
        gl_FragColor=vec4(color+skyFlash*.065,1.0);
        #include <colorspace_fragment>
      }`}));this.dome.frustumCulled=false;this.dome.renderOrder=-10;this.add(this.dome);
    const random=seededRandom(7214);
    for(let i=0;i<36;i++){
      const group=new Group(),b=new VoxelBatch(),high=i%3===0,width=high?13:7,height=high?1.5:2.2;
      for(let n=0;n<6;n++)b.add(n<2?'#c9d4dd':'#ffffff',(n-2.5)*width*.3,(n<2?0:.35+random()*.65)*height,(random()-.5)*width*.6,width*(.5+random()*.3),height*(.7+random()*.5),width*(.5+random()*.25));
      const mesh:Mesh=b.build(group),material=new MeshBasicMaterial({color:'#ffffff',transparent:true,opacity:.88,depthWrite:false,fog:false});
      material.onBeforeCompile=shader=>{shader.vertexShader='varying float cloudShade;\n'+shader.vertexShader;shader.fragmentShader='varying float cloudShade;\n'+shader.fragmentShader;shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\ncloudShade=.78+max(normal.y,0.0)*.22;');shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>','#include <color_fragment>\ndiffuseColor.rgb*=cloudShade;');};material.customProgramCacheKey=()=> 'farm-cloud-v1';
      mesh.material=material;mesh.castShadow=false;mesh.receiveShadow=false;
      const x=random()*170-85,z=random()*170-85;group.position.set(x,(high?53:24)+random()*7,z);this.clouds.push({group,material,x,z,high});this.add(group);
    }
    const points:number[]=[];for(let i=0;i<160;i++){const azimuth=random()*Math.PI*2,y=.15+random()*.85,r=Math.sqrt(1-y*y)*104;points.push(Math.cos(azimuth)*r,y*104,Math.sin(azimuth)*r);}
    const geometry=new BufferGeometry();geometry.setAttribute('position',new Float32BufferAttribute(points,3));
    this.stars=new Points(geometry,new PointsMaterial({color:'#cbdcf5',size:.21,transparent:true,opacity:0,depthWrite:false,fog:false,toneMapped:false}));this.add(this.stars,this.rim,this.rim.target);
    this.rim.target.position.set(0,4,-28);this.rim.castShadow=false;this.applyQuality('MEDIUM');
  }
  applyQuality(quality:Quality){this.quality=quality;this.clouds.forEach((cloud,i)=>cloud.group.visible=i<ATMOSPHERE_QUALITY[quality].clouds);this.stars.geometry.setDrawRange(0,ATMOSPHERE_QUALITY[quality].stars);}
  update(dayTime:number,weather:WeatherFrame,camera:Vector3,delta:number,season?:SeasonVisual){
    this.position.copy(camera);const day=daylightAt(dayTime),dawn=dawnWeight(dayTime),sunset=sunsetWeight(dayTime),shade=Math.max(0,(weather.cloud-.24)/.76),blend=this.initialized?1-Math.exp(-Math.max(0,delta)*.7):1;this.initialized=true;
    const top=new Color('#101d3c').lerp(new Color('#4e9bdc'),day).lerp(new Color('#dfad91'),dawn*.45).lerp(new Color('#8d729e'),sunset*.78).lerp(new Color('#596c82'),shade*.78);
    const horizon=new Color('#364b6c').lerp(new Color('#c6e5ec'),day).lerp(new Color('#ffe0ae'),dawn*.72).lerp(new Color('#f6ac75'),sunset*.86).lerp(new Color('#9daeb9'),shade*.65);
    if(season){const seasonalTop=new Color().setRGB(0,0,0),seasonalHorizon=new Color().setRGB(0,0,0);SEASONS.forEach((s,i)=>{seasonalTop.add(new Color(s.sky).multiplyScalar(season.weights[i]));seasonalHorizon.add(new Color(s.horizon).multiplyScalar(season.weights[i]));});top.lerp(seasonalTop,day*.55*(1-shade*.65));horizon.lerp(seasonalHorizon,day*.5*(1-shade*.65));}
    // Cloud cover still respects night luminance instead of bright gray at midnight.
    top.multiplyScalar(.72+day*.28);horizon.multiplyScalar(.64+day*.36);
    this.top.value.lerp(top,blend);this.horizon.value.lerp(horizon,blend);this.fog.color.copy(this.horizon.value);
    const range=farmFogRange(dayTime,weather);if(season){const mist=SEASONS.reduce((n,s,i)=>n+s.morningMist*season.weights[i],0)*dawn;range.near=Math.max(28,range.near-mist*6);range.far-=mist*12;}this.fog.near+=(range.near-this.fog.near)*blend;this.fog.far+=(range.far-this.fog.far)*blend;
    const angle=(dayTime-.25)*Math.PI*2;this.direction.value.lerp(new Vector3(-Math.cos(angle),Math.sin(angle),.25).normalize(),blend).normalize();
    this.daylight.value+=(day*(1-shade*.94)-this.daylight.value)*blend;this.night.value+=((1-day)*(1-shade*.8)-this.night.value)*blend;this.flash.value=weather.storm;
    this.cloudColor.set('#8a9bb8').lerp(new Color('#fffbed'),day).lerp(new Color('#ffc79c'),Math.max(dawn*.25,sunset*.55)).lerp(new Color('#63758b'),shade*.7).lerp(new Color('#29374b'),weather.storm*.65).multiplyScalar(.42+day*.58);
    for(const cloud of this.clouds){
      const drift=weather.windPhase*(cloud.high?.095:.19),span=190;cloud.group.position.x=((cloud.x+drift+span/2)%span+span)%span-span/2;
      cloud.group.position.z=cloud.z+Math.sin(weather.windPhase*.007+cloud.x)*2;cloud.group.scale.setScalar(1+shade*(cloud.high?.55:.7));
      cloud.material.color.lerp(this.cloudColor,blend);const edge=Math.max(0,Math.min(1,(span/2-Math.abs(cloud.group.position.x))/10));cloud.material.opacity=((cloud.high?.45:.82)+shade*.13)*edge;
    }
    this.stars.material.opacity+=(Math.pow(1-day,2)*(1-shade)*.75-this.stars.material.opacity)*blend;
    this.rim.position.lerp(new Vector3(-Math.cos(angle)*60,Math.max(4,Math.sin(angle)*35),-28-camera.z),blend);this.rim.target.position.set(-camera.x,4-camera.y,-28-camera.z);
    this.rim.intensity+=(Math.max(dawn,sunset)*.9*(1-shade*.85)-this.rim.intensity)*blend;this.rim.color.set(sunset>dawn?'#ffb96f':'#ffe0a3');
  }
  setFlash(value:number){this.flash.value=Math.max(0,Math.min(1,value));}
}
