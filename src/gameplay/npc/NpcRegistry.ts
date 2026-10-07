import type { WorldId } from '../../worlds/types';

export interface NpcDefinition {
  readonly id:string;readonly name:string;readonly role:string;readonly model:string;readonly portrait:string;
  readonly worldId:WorldId;readonly position:readonly [number,number,number];readonly scale:number;readonly yaw:number;readonly range:number;
}
/** Static identities and placements; player-specific history belongs to DialogueSystem. */
export class NpcRegistry {
  private definitions=new Map<string,Readonly<NpcDefinition>>();
  register(d:NpcDefinition):this {
    if(!/^[a-z][a-z0-9_]*$/.test(d.id)||this.definitions.has(d.id)||!d.name.trim()||!d.role.trim()||!d.model||!d.portrait||d.position.length!==3||!d.position.every(Number.isFinite)||!Number.isFinite(d.yaw)||!Number.isFinite(d.scale)||d.scale<=0||!Number.isFinite(d.range)||d.range<=0)throw Error(`Invalid NPC: ${d.id}`);
    this.definitions.set(d.id,Object.freeze({...d,position:Object.freeze([...d.position]) as readonly [number,number,number]}));return this;
  }
  get(id:string){return this.definitions.get(id);}
  list(worldId?:WorldId){return [...this.definitions.values()].filter(d=>!worldId||d.worldId===worldId);}
}
const resource=(id:string)=>({model:`models/npcs/${id}.glb`,portrait:`images/npcs/${id}.png`});
export const NPCS=new NpcRegistry()
  .register({id:'lighthouse_keeper',name:'灯塔老人',role:'守望灯火 · 航海往事',...resource('lighthouse_keeper'),worldId:'HOME',position:[0,3.92,-.90],scale:.27,yaw:0,range:.65})
  .register({id:'merchant_captain',name:'商船老板',role:'远海贸易 · 补给与金币',...resource('merchant_captain'),worldId:'HOME',position:[-1.60,3.92,1.94],scale:.28,yaw:Math.PI,range:.58})
  .register({id:'fisherman',name:'渔夫',role:'钓鱼台的邻居 · 海洋生活',...resource('fisherman'),worldId:'HOME',position:[-2.40,3.92,1.05],scale:.27,yaw:Math.PI/2,range:.65})
  .register({id:'farm_steward',name:'农场管理员',role:'田野与牧场 · 农场生活',...resource('farm_steward'),worldId:'FARM',position:[-8.5,4,5.4],scale:.33,yaw:Math.PI/3,range:1.2});
