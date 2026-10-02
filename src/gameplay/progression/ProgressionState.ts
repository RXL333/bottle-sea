import { PROGRESSION } from './ProgressionRegistry';
import type { ProgressionRegistry } from './ProgressionRegistry';
export interface ProgressionSnapshot {version:1;completed:Record<string,number>;grants:string[]}
export const defaultProgression=():ProgressionSnapshot=>({version:1,completed:{},grants:[]});
export function normalizeProgression(value:unknown,now:number,legacy=false,registry:ProgressionRegistry=PROGRESSION):ProgressionSnapshot {
  const state=defaultProgression(),raw=value&&typeof value==='object'&&!Array.isArray(value)?value as Partial<ProgressionSnapshot>:{};
  if(raw.completed&&typeof raw.completed==='object'&&!Array.isArray(raw.completed))for(const definition of registry.listMilestones()){
    if(!definition.activity)continue;
    const time=raw.completed[definition.id];if(typeof time==='number'&&Number.isFinite(time)&&time>=0&&time<=now)state.completed[definition.id]=time;
  }
  for(const definition of registry.listMilestones())if(!definition.activity&&definition.requires?.length&&definition.requires.every(id=>Object.hasOwn(state.completed,id)))state.completed[definition.id]=Math.max(...definition.requires.map(id=>state.completed[id]));
  // A missing field in a previous save retains precisely the previously playable content,
  // without pretending that purchased or stored fish prove a fishing milestone.
  state.grants=registry.listUnlocks().filter(d=>d.legacyAccess&&(legacy||Array.isArray(raw.grants)&&raw.grants.includes(d.id))).map(d=>d.id);
  return state;
}
