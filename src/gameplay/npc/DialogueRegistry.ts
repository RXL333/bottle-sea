import type { SeasonId } from '../calendar/SeasonRegistry';
import type { WeatherKind } from '../../systems/WeatherState';
import type { NpcRegistry } from './NpcRegistry';

/** Read-only facts sampled from existing services when a conversation/topic starts. */
export interface DialogueFacts {
  collectionCount?:number;collectionTotal?:number;season:SeasonId;seasonName:string;weather:WeatherKind;coins:number;fishCount:number;
  matureCells:number;growingCells:number;pendingProducts:number;completed:readonly string[];met:boolean;plantableCrops:string;fishNames:string;
}
export type DialogueAction='trade'|'progression'|'calendar'|'commissions'|'collections';
export interface DialogueVariant {readonly when:(facts:DialogueFacts)=>boolean;readonly lines:readonly string[]}
export interface DialogueTopic {
  readonly id:string;readonly label:string;readonly lines:readonly string[];readonly variants?:readonly DialogueVariant[];
  readonly available?:(facts:DialogueFacts)=>boolean;readonly action?:DialogueAction;
}
export interface DialogueDefinition {readonly npcId:string;readonly greeting:DialogueTopic;readonly topics:readonly DialogueTopic[]}
export class DialogueRegistry {
  private definitions=new Map<string,Readonly<DialogueDefinition>>();
  constructor(private npcs:NpcRegistry){}
  register(d:DialogueDefinition):this {
    const topics=[d.greeting,...d.topics];
    if(!this.npcs.get(d.npcId)||this.definitions.has(d.npcId)||new Set(topics.map(t=>t.id)).size!==topics.length||topics.some(t=>!t.id.trim()||!t.label.trim()||!t.lines.length||t.lines.some(l=>!l.trim())||t.variants?.some(v=>!v.lines.length||v.lines.some(l=>!l.trim()))))throw Error(`Invalid dialogue: ${d.npcId}`);
    const freeze=(t:DialogueTopic):DialogueTopic=>Object.freeze({...t,lines:Object.freeze([...t.lines]),variants:t.variants?Object.freeze(t.variants.map(v=>Object.freeze({...v,lines:Object.freeze([...v.lines])}))):undefined});
    this.definitions.set(d.npcId,Object.freeze({...d,greeting:freeze(d.greeting),topics:Object.freeze(d.topics.map(freeze))}));return this;
  }
  npc(npcId:string){return this.npcs.get(npcId);}
  get(npcId:string){return this.definitions.get(npcId);}
  topics(npcId:string,facts:DialogueFacts){return this.get(npcId)?.topics.filter(t=>!t.available||t.available(facts))??[];}
  lines(topic:DialogueTopic,facts:DialogueFacts){return (topic.variants?.find(v=>v.when(facts))?.lines??topic.lines).map(line=>line.replace(/\{(seasonName|plantableCrops|fishNames|coins)\}/g,(_token,key:keyof DialogueFacts)=>String(facts[key])));}
}
