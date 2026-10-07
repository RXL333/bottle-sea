import { DIALOGUES } from './DialogueCatalog';
import type { DialogueFacts,DialogueTopic } from './DialogueRegistry';
import type { DialogueRegistry } from './DialogueRegistry';
export interface NpcHistory {firstMet:number;lastMet:number;conversations:number;heard:string[]}
export interface DialogueSnapshot {version:1;characters:Record<string,NpcHistory>}
export function normalizeDialogue(raw:unknown,gameTime:number,registry:DialogueRegistry=DIALOGUES):DialogueSnapshot {
  const state:DialogueSnapshot={version:1,characters:{}};
  if(!raw||typeof raw!=='object'||Array.isArray(raw))return state;
  const value=raw as Partial<DialogueSnapshot>;if(value.version!==1||!value.characters||typeof value.characters!=='object'||Array.isArray(value.characters))return state;
  const now=Number.isFinite(gameTime)?Math.max(0,gameTime):0;
  for(const id of Object.keys(value.characters)){
    const d=registry.get(id),h=value.characters[id];if(!d||!h||typeof h!=='object'||Array.isArray(h))continue;
    const validTime=(t:unknown)=>typeof t==='number'&&Number.isFinite(t)?Math.max(0,Math.min(now,t)):0;
    const firstMet=validTime(h.firstMet),lastMet=Math.max(firstMet,validTime(h.lastMet));
    const allowed=new Set([d.greeting.id,...d.topics.map(t=>t.id)]);
    state.characters[id]={firstMet,lastMet,conversations:Number.isSafeInteger(h.conversations)?Math.max(0,Math.min(1_000_000,h.conversations)):0,heard:Array.isArray(h.heard)?[...new Set(h.heard.filter(t=>typeof t==='string'&&allowed.has(t)))]:[]};
  }return state;
}
interface Session {npcId:string;facts:DialogueFacts;topic:DialogueTopic;lines:readonly string[];index:number;menu:boolean}
/** No rewards or inventory ownership; transient UI session is never serialized. */
export class DialogueSystem {
  private state:DialogueSnapshot;private session?:Session;
  constructor(private now:()=>number,saved?:unknown,private onChange:()=>void=()=>{},readonly registry:DialogueRegistry=DIALOGUES){this.state=normalizeDialogue(saved,now(),registry);}
  get current(){const s=this.session;return s?{npc: this.registry.npc(s.npcId)!,topic:s.topic,line:s.lines[s.index],index:s.index,total:s.lines.length,menu:s.menu,choices:this.registry.topics(s.npcId,s.facts)}:undefined;}
  hasMet(id:string){return Object.hasOwn(this.state.characters,id);}
  heard(id:string,topicId:string){return this.hasMet(id)&&this.state.characters[id].heard.includes(topicId);}
  begin(npcId:string,facts:DialogueFacts):boolean {
    if(this.session)return false;const d=this.registry.get(npcId);if(!d)return false;
    const snapshot={...facts,completed:[...facts.completed],met:this.hasMet(npcId)};
    this.session={npcId,facts:snapshot,topic:d.greeting,lines:this.registry.lines(d.greeting,snapshot),index:0,menu:false};
    const time=this.now(),previous=this.hasMet(npcId)?this.state.characters[npcId]:undefined;this.state.characters[npcId]=previous?{...previous,lastMet:time,conversations:Math.min(1_000_000,previous.conversations+1)}:{firstMet:time,lastMet:time,conversations:1,heard:[]};this.onChange();return true;
  }
  choose(id:string,facts?:DialogueFacts):boolean {
    const s=this.session;if(!s?.menu)return false;if(facts)s.facts={...facts,completed:[...facts.completed],met:true};
    const t=this.registry.topics(s.npcId,s.facts).find(t=>t.id===id);if(!t)return false;
    s.topic=t;s.lines=this.registry.lines(t,s.facts);s.index=0;s.menu=false;return true;
  }
  advance(){const s=this.session;if(!s||s.menu)return undefined;
    if(s.index<s.lines.length-1){s.index++;return undefined;}
    const h=this.state.characters[s.npcId];if(!h.heard.includes(s.topic.id)){h.heard.push(s.topic.id);this.onChange();}
    s.menu=true;return s.topic.action;
  }
  menu(){if(this.session)this.session.menu=true;}
  close(){this.session=undefined;}
  snapshot():DialogueSnapshot{return structuredClone(this.state);}
}
