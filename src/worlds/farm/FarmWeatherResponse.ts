import { BoxGeometry,Color,Float32BufferAttribute,Group,Mesh,MeshDepthMaterial,MeshStandardMaterial,PointLight,RGBADepthPacking } from 'three';
import type { Material,Object3D } from 'three';
import type { Quality } from '../../core/Renderer';
import type { WeatherFrame } from '../../systems/WeatherState';
import { daylightAt } from '../../systems/DayTimeMath';
import { FARM_PLACEMENTS } from './FarmLayout';
import { FARM_ASSET_BOUNDS,FARM_GROUND } from './FarmMap';

/** Roof footprints only; visual shelter never changes navigation or crop rules. */
export function farmSheltered(position:{x:number;y:number;z:number}){
  return FARM_PLACEMENTS.some(p=>{
    if(!['farmhouse','barn','tool_shed'].includes(p.asset))return false;
    const b=FARM_ASSET_BOUNDS.get(p.asset)!,dx=position.x-p.x,dz=position.z-p.z,c=Math.cos(p.yaw??0),s=Math.sin(p.yaw??0),x=c*dx-s*dz,z=s*dx+c*dz;
    return x>b.min[0]*p.scale+.18&&x<b.max[0]*p.scale-.18&&z>-b.max[1]*p.scale+.18&&z<-b.min[1]*p.scale-.18&&position.y>FARM_GROUND&&position.y<FARM_GROUND+b.max[2]*p.scale*.68;
  });
}

export class FarmWind {
  private time={value:0};private amount={value:.025};private quality:Quality='MEDIUM';
  update(frame:WeatherFrame){this.time.value=frame.windPhase;this.amount.value=(this.quality==='LOW'?0:this.quality==='HIGH'?.045:.028)*(.4+frame.wind*2.2);}
  applyQuality(quality:Quality){this.quality=quality;}
  prepare<T extends Material>(material:T):T{
    material.onBeforeCompile=shader=>{
      shader.uniforms.farmFoliageTime=this.time;shader.uniforms.farmFoliageAmount=this.amount;
      shader.vertexShader='uniform float farmFoliageTime;uniform float farmFoliageAmount;attribute float farmSwayWeight;\n'+shader.vertexShader;
      shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>
        float plantPhase=position.x*.7+position.z*.43;
        float windScale=1.0;
        #ifdef USE_INSTANCING
          plantPhase=instanceMatrix[3].x*.7+instanceMatrix[3].z*.43;
          windScale=1.0/max(length(instanceMatrix[0].xyz),.01);
        #endif
        transformed.x+=sin(farmFoliageTime*1.4+plantPhase)*farmFoliageAmount*farmSwayWeight*windScale;
        transformed.z+=sin(farmFoliageTime*.9+plantPhase)*farmFoliageAmount*farmSwayWeight*windScale*.45;`);
    };material.customProgramCacheKey=()=>`farm-foliage-v1:${material.type}`;return material;
  }
  install(mesh:Mesh,instanced=false){
    const source=mesh.geometry;mesh.geometry=source.clone();if(!instanced)source.dispose();const positions=mesh.geometry.attributes.position,weights=new Float32Array(positions.count);
    for(let i=0;i<weights.length;i++)weights[i]=instanced?Math.max(0,positions.getY(i)+.5):Math.min(2,Math.max(0,positions.getY(i)-FARM_GROUND-.4));
    mesh.geometry.setAttribute('farmSwayWeight',new Float32BufferAttribute(weights,1));
    mesh.material=this.prepare((mesh.material as Material).clone());mesh.customDepthMaterial=this.prepare(new MeshDepthMaterial({depthPacking:RGBADepthPacking}));
  }
}

/** A finite set of material references; never traverse every crop each frame. */
export class FarmWetness {
  private surfaces=new Map<MeshStandardMaterial,{color:Color;roughness:number}>();
  private wetness=0;
  register(root:Object3D){root.traverse(o=>{if(o instanceof Mesh)for(const material of Array.isArray(o.material)?o.material:[o.material])if(material instanceof MeshStandardMaterial&&!this.surfaces.has(material))this.surfaces.set(material,{color:material.color.clone(),roughness:material.roughness});});}
  update(wetness:number){this.wetness=Math.max(0,Math.min(1,wetness));for(const [material,dry] of this.surfaces){material.color.copy(dry.color).multiplyScalar(1-this.wetness*.14);material.roughness=dry.roughness+(Math.max(.38,dry.roughness*.58)-dry.roughness)*this.wetness;}}
  get value(){return this.wetness;}
}

export class FarmWarmLights extends Group {
  private lights:PointLight[]=[];private panes:MeshStandardMaterial[]=[];private quality:Quality='MEDIUM';private night=0;
  constructor(){
    super();this.name='FarmWarmLights';
    for(const id of ['cottage','barn','shed']){
      const p=FARM_PLACEMENTS.find(p=>p.id===id)!,b=FARM_ASSET_BOUNDS.get(p.asset)!,localZ=-b.min[1]*p.scale+.07,c=Math.cos(p.yaw??0),s=Math.sin(p.yaw??0),x=p.x+s*localZ,z=p.z+c*localZ,y=FARM_GROUND+2.3;
      const material=new MeshStandardMaterial({color:'#ffe0a0',emissive:'#ffb967',emissiveIntensity:0,roughness:1}),lamp=new Mesh(new BoxGeometry(.18,.25,.12),material);lamp.position.set(x,y,z);lamp.rotation.y=p.yaw??0;this.panes.push(material);this.add(lamp);
      const light=new PointLight('#ffc781',0,14,2);light.position.set(x,y-.15,z);light.castShadow=false;this.lights.push(light);this.add(light);
    }
  }
  applyQuality(quality:Quality){this.quality=quality;}
  update(dayTime:number,delta=1/60){this.night+=((1-daylightAt(dayTime))-this.night)*(1-Math.exp(-Math.max(0,delta)*.8));const count=this.quality==='LOW'?1:this.quality==='HIGH'?3:2;
    this.lights.forEach((light,i)=>light.intensity=i<count?this.night*11:0);for(const material of this.panes)material.emissiveIntensity=this.night*1.4;
  }
}
