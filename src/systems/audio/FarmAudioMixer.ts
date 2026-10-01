import type { FarmSoundFrame,FarmEffectKind } from '../../worlds/farm/FarmPresentation';

export interface FarmVoiceMix {id:string;engine:number;frequency:number;work:number;kind?:FarmEffectKind}
/** At most two nearby voices; operation leases start only after actual successes. */
export class FarmAudioMixer {
  private previous=new Map<string,{operations:number;lastWorked:number}>();
  update(frame:FarmSoundFrame|undefined,time:number):FarmVoiceMix[]{
    if(!frame||frame.paused){this.previous.clear();return [];}
    const selected=frame.machines.filter(m=>m.occupied||Math.abs(m.speed)>.02).map(m=>({machine:m,distance:Math.hypot(m.x-frame.listener.x,m.y-frame.listener.y,m.z-frame.listener.z)})).filter(m=>m.distance<26).sort((a,b)=>a.distance-b.distance).slice(0,2),live=new Set<string>();
    const result=selected.map(({machine:m,distance})=>{
      live.add(m.id);const old=this.previous.get(m.id),lastWorked=old&&m.operations>old.operations?time:old&&m.operations<old.operations?-Infinity:old?.lastWorked??-Infinity;
      this.previous.set(m.id,{operations:m.operations,lastWorked});const gain=Math.pow(1-distance/26,2),moving=Math.abs(m.speed)>.08;
      return {id:m.id,engine:gain*(moving?.07:.035),frequency:42+Math.min(5,Math.abs(m.speed))*13,work:m.workEnabled&&moving&&time-lastWorked<.4?gain*.09:0,kind:m.workKind};
    });
    for(const id of this.previous.keys())if(!live.has(id))this.previous.delete(id);return result;
  }
}
