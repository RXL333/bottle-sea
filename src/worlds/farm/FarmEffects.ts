import { BoxGeometry,Color,DynamicDrawUsage,Group,InstancedMesh,Matrix4,MeshBasicMaterial,Vector3 } from 'three';
import type { Quality } from '../../core/Renderer';
import { FARM_EFFECT_QUALITY } from './FarmPresentation';
import type { FarmMachineFeedback,FarmVisualEvent } from './FarmPresentation';
import { FARM_ROADS,FARM_ZONES,containsRect } from './FarmMap';
import { farmHeight } from './FarmTerrain';
import type { FarmSystem } from '../../gameplay/farm/FarmSystem';

interface Particle {x:number;y:number;z:number;vx:number;vy:number;vz:number;life:number;size:number;color:Color}
const DIRT_AREAS=[...FARM_ROADS,...FARM_ZONES.filter(z=>z.id==='center'||z.id==='machinery-yard')];
/** One fixed pool and one draw call, irrespective of cells or machine count. */
export class FarmEffects extends Group {
  private pool:Particle[]=Array.from({length:256},()=>({x:0,y:0,z:0,vx:0,vy:0,vz:0,life:0,size:0,color:new Color()}));
  private cubes=new InstancedMesh(new BoxGeometry(1,1,1),new MeshBasicMaterial(),256);
  private quality:Quality='MEDIUM';private cursor=0;private dustCredit=new Map<string,number>();
  private transform=new Matrix4();private point=new Vector3();
  private heard:FarmVisualEvent[]=[];
  emitted=0;
  constructor(){super();this.name='FarmEffects';this.cubes.name='FarmEffectParticles';this.cubes.count=0;this.cubes.frustumCulled=false;this.cubes.instanceMatrix.setUsage(DynamicDrawUsage);this.add(this.cubes);}
  get activeParticles(){return this.cubes.count;}
  get capacity(){return FARM_EFFECT_QUALITY[this.quality].particles;}
  applyQuality(quality:Quality){this.quality=quality;this.reset();}
  reset(){for(const p of this.pool)p.life=0;this.cubes.count=0;this.dustCredit.clear();this.heard=[];}
  drainSounds(){const events=this.heard;this.heard=[];return events;}
  update(delta:number,events:readonly FarmVisualEvent[],machines:readonly FarmMachineFeedback[],listener:Vector3|undefined,farm:FarmSystem,storm:number){
    const settings=FARM_EFFECT_QUALITY[this.quality],dt=Math.max(0,Math.min(delta,.1));this.heard=[];
    const near=(x:number,z:number)=>!!listener&&Math.hypot(listener.x-x,listener.z-z)<settings.distance;
    // Audio remains available on LOW; only current, nearby successful changes play.
    const audible=new Set<string>();let budget=settings.eventBudget;
    for(const event of events){
      if(!near(event.x,event.z))continue;
      if(!audible.has(event.kind)){this.heard.push(event);audible.add(event.kind);}
      if(budget--<=0)continue;
      const color=event.kind==='till'?'#957047':event.kind==='seed'?'#d8c082':event.cropId==='potato'?'#b58a59':'#e2c361';
      for(let n=0;n<settings.burst;n++)this.spawn(event.x,event.y+.08,event.z,color,event.kind==='harvest'?.7:.45,event.kind==='seed'?.035:.07);
    }
    const activeIds=new Set<string>();
    for(const machine of machines.slice(0,4)){
      activeIds.add(machine.id);
      if(!settings.particles||!near(machine.x,machine.z)||Math.abs(machine.speed)<.35||storm>.65){this.dustCredit.set(machine.id,0);continue;}
      const dirt=!!farm.cellAt(machine.x,machine.z)||DIRT_AREAS.some(r=>containsRect(r,machine.x,machine.z));
      if(!dirt){this.dustCredit.set(machine.id,0);continue;}
      let credit=(this.dustCredit.get(machine.id)??0)+dt*settings.dustRate*Math.min(1,Math.abs(machine.speed)/2)*(1-storm);
      while(credit>=1){credit--;const side=this.cursor%2?-.55:.55,z=-.4*Math.sign(machine.speed),x=machine.x+Math.cos(machine.yaw)*side+Math.sin(machine.yaw)*z,wz=machine.z-Math.sin(machine.yaw)*side+Math.cos(machine.yaw)*z;this.spawn(x,farmHeight(x,wz)+.1,wz,'#b3a184',.8,.12);}
      this.dustCredit.set(machine.id,credit);
    }
    for(const id of this.dustCredit.keys())if(!activeIds.has(id))this.dustCredit.delete(id);
    let count=0;
    for(let i=0;i<settings.particles;i++){
      const p=this.pool[i];if(p.life<=0)continue;p.life-=dt;if(p.life<=0)continue;
      p.x+=p.vx*dt;p.z+=p.vz*dt;p.y+=p.vy*dt;p.vy-=1.4*dt;
      const floor=farmHeight(p.x,p.z)+.04;if(p.y<floor){p.y=floor;p.vy=0;p.vx*=.7;p.vz*=.7;}
      const size=p.size*Math.min(1,p.life*5);this.point.set(p.x,p.y,p.z);this.transform.makeScale(size,size,size);this.transform.setPosition(this.point);this.cubes.setMatrixAt(count,this.transform);this.cubes.setColorAt(count,p.color);count++;
    }
    this.cubes.count=count;this.cubes.instanceMatrix.needsUpdate=true;if(this.cubes.instanceColor)this.cubes.instanceColor.needsUpdate=true;
  }
  private spawn(x:number,y:number,z:number,color:string,duration:number,size:number){
    const capacity=this.capacity;if(!capacity)return;const p=this.pool[this.cursor++%capacity],phase=this.cursor*2.399963;
    p.x=x+Math.sin(phase)*.23;p.z=z+Math.cos(phase)*.23;p.y=y;p.vx=Math.sin(phase)*.6;p.vz=Math.cos(phase)*.6;p.vy=.4+(this.cursor%5)*.12;p.life=duration;p.size=size;p.color.set(color);this.emitted++;
  }
}
