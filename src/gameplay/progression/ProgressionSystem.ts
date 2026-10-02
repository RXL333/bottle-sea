import type { GameClock } from '../../core/GameClock';
import { PROGRESSION } from './ProgressionRegistry';
import type { ProgressionActivity,ProgressionRegistry,MilestoneDefinition } from './ProgressionRegistry';
import { normalizeProgression } from './ProgressionState';
import type { ProgressionSnapshot } from './ProgressionState';
export interface ProgressionCompletion {milestones:readonly Readonly<MilestoneDefinition>[];unlocked:readonly string[]}
/** Record committed actions, not inventory contents or repeated UI messages. */
export class ProgressionSystem {
  private state:ProgressionSnapshot;revision=0;
  onComplete:(completion:ProgressionCompletion)=>void=()=>{};
  constructor(private clock:GameClock,saved?:unknown,private onChange:()=>void=()=>{},legacy=false,readonly registry:ProgressionRegistry=PROGRESSION){
    this.state=normalizeProgression(saved,clock.simulationTime,legacy,registry);this.completeDerived();
  }
  snapshot():ProgressionSnapshot {return structuredClone(this.state);}
  completed(id:string){return Object.hasOwn(this.state.completed,id);}
  completedAt(id:string){return this.state.completed[id];}
  isUnlocked(id:string){const d=this.registry.getUnlock(id);return !!d&&(this.state.grants.includes(id)||d.requires.every(m=>this.completed(m)));}
  /** Unknown IDs fail closed; future systems must also respect implemented/availability. */
  canAccess(id:string){return this.registry.getUnlock(id)?.implemented===true&&this.isUnlocked(id);}
  lockReason(id:string){const d=this.registry.getUnlock(id);if(!d)return '内容尚未注册。';if(!d.implemented)return '后续内容预留，尚未开放。';if(this.isUnlocked(id))return;return `完成「${d.requires.filter(m=>!this.completed(m)).map(m=>this.registry.getMilestone(m)!.name).join('、')}」后解锁。`;}
  get currentObjective(){return this.registry.listMilestones().find(d=>!this.completed(d.id));}
  get completedCount(){return this.registry.listMilestones().filter(d=>this.completed(d.id)).length;}
  record(activity:ProgressionActivity):ProgressionCompletion {
    const pending=this.registry.listMilestones().filter(d=>d.activity===activity&&!this.completed(d.id));
    if(!pending.length)return {milestones:[],unlocked:[]};
    const before=new Set(this.registry.listUnlocks().filter(d=>this.isUnlocked(d.id)).map(d=>d.id)),milestones:Readonly<MilestoneDefinition>[]=[];
    for(const d of pending){
      this.state.completed[d.id]=this.clock.simulationTime;milestones.push(d);
    }
    milestones.push(...this.completeDerived());
    const completion={milestones,unlocked:this.registry.listUnlocks().filter(d=>!before.has(d.id)&&this.isUnlocked(d.id)).map(d=>d.id)};
    if(milestones.length){this.revision++;this.onChange();this.onComplete(completion);}return completion;
  }
  private completeDerived(){
    const completed:Readonly<MilestoneDefinition>[]=[];
    for(const d of this.registry.listMilestones())if(!d.activity&&d.requires?.length&&!this.completed(d.id)&&d.requires.every(id=>this.completed(id))){
      // Derived milestones are reconstructed silently on load, with their actual last dependency time.
      this.state.completed[d.id]=Math.max(...d.requires.map(id=>this.state.completed[id]));completed.push(d);
    }
    return completed;
  }
}
