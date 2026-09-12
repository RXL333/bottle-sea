import { Vector3 } from 'three';
import { discoveryIds } from '../state/PlayerState';
import { LANDMARKS } from '../world/underwater/Landmarks';
export interface InteractionTarget {id:string;name:string;x:number;y:number;z:number;action:'DISCOVER'|'TRAVEL';range?:number}
export const discoveryTargets:readonly InteractionTarget[]=LANDMARKS.map(target=>({...target,action:'DISCOVER'}));
export class InteractionSystem {
  readonly discovered=new Set<string>();nearest:InteractionTarget|undefined;
  constructor(private targets:readonly InteractionTarget[]=discoveryTargets){}
  setTargets(targets:readonly InteractionTarget[]){this.targets=targets;this.nearest=undefined;}
  restore(ids:unknown){this.discovered.clear();for(const id of discoveryIds(ids))this.discovered.add(id);this.nearest=undefined;}
  update(position:Vector3){this.nearest=undefined;let best=Infinity;for(const target of this.targets){const d=Math.hypot(position.x-target.x,position.y-target.y,position.z-target.z);if(d<(target.range??.85)&&d<best){best=d;this.nearest=target;}}}
  interact(){if(!this.nearest)return '靠近灯塔、宝箱、船锚或海底遗迹后，按 E 发现。';if(this.nearest.action==='TRAVEL')return '登船';const known=this.discovered.has(this.nearest.id);this.discovered.add(this.nearest.id);return `${known?'再次来到':'发现'}：${this.nearest.name}${this.discovered.size===4?' · 航海手记已完成':''}`;}
}
