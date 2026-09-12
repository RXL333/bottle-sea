import { Vector3 } from 'three';
import { discoveryIds } from '../state/PlayerState';
import { LANDMARKS } from '../world/underwater/Landmarks';
export class InteractionSystem {
  readonly discovered=new Set<string>();nearest:typeof LANDMARKS[number]|undefined;
  restore(ids:unknown){this.discovered.clear();for(const id of discoveryIds(ids))this.discovered.add(id);this.nearest=undefined;}
  update(position:Vector3){this.nearest=undefined;let best=.85;for(const target of LANDMARKS){const d=Math.hypot(position.x-target.x,position.y-target.y,position.z-target.z);if(d<best){best=d;this.nearest=target;}}}
  interact(){if(!this.nearest)return '靠近灯塔、宝箱、船锚或海底遗迹后，按 E 发现。';const known=this.discovered.has(this.nearest.id);this.discovered.add(this.nearest.id);return `${known?'再次来到':'发现'}：${this.nearest.name}${this.discovered.size===4?' · 航海手记已完成':''}`;}
}
