import { describe,expect,it,vi } from 'vitest';
import { DialogueSystem,normalizeDialogue } from './DialogueSystem';
import { DialogueRegistry } from './DialogueRegistry';
import type { DialogueFacts } from './DialogueRegistry';
import { NPCS,NpcRegistry } from './NpcRegistry';
import { DIALOGUES } from './DialogueCatalog';
import { dialogueFacts } from './DialogueFacts';
import { GameplayFoundation } from '../GameplayFoundation';
import { GameClock } from '../../core/GameClock';
import { defaultSave,migrateSave,SaveSystem } from '../../state/SaveSystem';
const facts=(overrides:Partial<DialogueFacts>={}):DialogueFacts=>({season:'spring',seasonName:'春',weather:'CLEAR',coins:0,fishCount:0,matureCells:0,growingCells:0,pendingProducts:0,completed:[],met:false,plantableCrops:'小麦、玉米、土豆',fishNames:'沙丁鱼',...overrides});
describe('generic NPC conversation and persistence',()=>{
  it('validates identities and immutable configuration, with an injectable character catalog',()=>{
    const registry=new NpcRegistry(),definition={...NPCS.list()[0],id:'visitor'};registry.register(definition);
    expect(()=>registry.register(definition)).toThrow();expect(()=>registry.register({...definition,id:'bad',scale:NaN})).toThrow();
    expect(Object.isFrozen(registry.get('visitor')!.position)).toBe(true);
    const dialogues=new DialogueRegistry(registry).register({npcId:'visitor',greeting:{id:'hello',label:'问候',lines:['你好']},topics:[]});
    expect(()=>dialogues.register({npcId:'absent',greeting:{id:'hello',label:'问候',lines:['你好']},topics:[]})).toThrow();
    const system=new DialogueSystem(()=>0,undefined,()=>{},dialogues);expect(system.begin('visitor',facts())).toBe(true);expect(system.current?.npc.id).toBe('visitor');
  });
  it.each(NPCS.list())('supports multi-page greetings and persistent unique heard topics for $name',npc=>{
    let time=10;const save=vi.fn(),system=new DialogueSystem(()=>time,undefined,save);
    expect(system.begin(npc.id,facts())).toBe(true);expect(system.begin(npc.id,facts())).toBe(false);
    expect(system.current?.npc.name).toBe(npc.name);expect(system.choose('progression')).toBe(false);
    while(!system.current?.menu)system.advance();expect(system.heard(npc.id,'hello')).toBe(true);
    expect(system.choose('progression')).toBe(true);expect(system.advance()).toBe('progression');expect(system.advance()).toBeUndefined();
    expect(system.snapshot().characters[npc.id].heard.filter(t=>t==='progression')).toHaveLength(1);
    system.close();time=15;system.begin(npc.id,facts());system.close();const snapshot=system.snapshot();
    expect(snapshot.characters[npc.id]).toMatchObject({firstMet:10,lastMet:15,conversations:2});
    const restored=new DialogueSystem(()=>time,JSON.parse(JSON.stringify(snapshot)));expect(restored.hasMet(npc.id)).toBe(true);expect(restored.current).toBeUndefined();expect(restored.snapshot()).toEqual(snapshot);
    snapshot.characters[npc.id].heard.push('invalid');expect(restored.heard(npc.id,'invalid')).toBe(false);expect(save).toHaveBeenCalledTimes(4);
  });
  it('does not mark an interrupted topic heard or allow unavailable choices',()=>{
    const registry=new DialogueRegistry(NPCS).register({npcId:'fisherman',greeting:{id:'hello',label:'问候',lines:['一','二']},topics:[{id:'future',label:'未来',lines:['未来'],available:f=>f.coins>5}]});
    const system=new DialogueSystem(()=>0,undefined,()=>{},registry);expect(system.begin('unknown',facts())).toBe(false);system.begin('fisherman',facts());system.advance();system.close();expect(system.heard('fisherman','hello')).toBe(false);
    system.begin('fisherman',facts());system.menu();expect(system.choose('future')).toBe(false);expect(system.choose('future',facts({coins:10}))).toBe(true);
  });
  it('does not confuse inherited object keys with a met character',()=>{
    const npcs=new NpcRegistry().register({...NPCS.list()[0],id:'constructor'}),registry=new DialogueRegistry(npcs).register({npcId:'constructor',greeting:{id:'hello',label:'问候',lines:['你好']},topics:[]});
    const system=new DialogueSystem(()=>20,undefined,()=>{},registry);expect(system.heard('constructor','hello')).toBe(false);expect(system.begin('constructor',facts())).toBe(true);system.advance();
    expect(system.snapshot().characters.constructor).toMatchObject({conversations:1,heard:['hello']});expect(new DialogueSystem(()=>20,system.snapshot(),()=>{},registry).hasMet('constructor')).toBe(true);
  });
  it('selects actual weather, progress, inventory and farm conditions with deterministic priority',()=>{
    const system=new DialogueSystem(()=>50);
    for(const [id,state,text] of [
      ['lighthouse_keeper',facts({weather:'STORM'}),'风暴'],['merchant_captain',facts({completed:['first_sale']}),'金币'],
      ['fisherman',facts({fishCount:1}),'背包'],['fisherman',facts({completed:['first_fish']}),'钓到'],
      ['farm_steward',facts({matureCells:1,pendingProducts:1}),'成熟'],['farm_steward',facts({pendingProducts:1}),'待领取'],['farm_steward',facts({growingCells:1}),'生长'],
    ] as const){system.begin(id,state);expect(system.current?.line).toContain(text);system.close();}
    const topic=DIALOGUES.get('farm_steward')!.topics.find(t=>t.id==='season')!;expect(DIALOGUES.lines(topic,facts({seasonName:'冬',plantableCrops:'没有适合当前季节的作物'}))[0]).toContain('没有适合');
  });
  it('sanitizes corrupt, old and future histories and clamps time',()=>{
    for(const raw of [null,[],{}, {version:99,characters:{}}])expect(normalizeDialogue(raw,100)).toEqual({version:1,characters:{}});
    expect(normalizeDialogue({version:1,characters:{unknown:{},fisherman:{firstMet:Infinity,lastMet:999,conversations:-5,heard:['hello','hello','bad',3]}}},100)).toEqual({version:1,characters:{fisherman:{firstMet:0,lastMet:100,conversations:0,heard:['hello']}}});
  });
  it('samples canonical services without altering production or economic state',()=>{
    const clock=new GameClock(),game=new GameplayFoundation(clock);game.inventory.add('fish.sardine',2);game.progression.record('fish.catch');const before=game.snapshot();const f=dialogueFacts(game,'RAIN');
    expect(f.fishCount).toBe(2);expect(f.weather).toBe('RAIN');expect(f.completed).toContain('first_fish');expect(f.plantableCrops).toContain('小麦');expect(game.snapshot()).toEqual(before);
  });
  it('round trips dialogue with all existing state and safely migrates saves without it',()=>{
    const clock=new GameClock(),game=new GameplayFoundation(clock);game.inventory.add('wood',8);game.dialogue.begin('fisherman',facts());game.dialogue.advance();game.dialogue.close();
    const data={...defaultSave(),...game.snapshot(),gameTime:clock.snapshot()},values=new Map<string,string>(),save=new SaveSystem({getItem:k=>values.get(k)??null,setItem:(k,v)=>{values.set(k,v);}});
    expect(save.save(data)).toBe(true);expect(save.load()).toEqual(data);const restored=new GameplayFoundation(clock,save.load());expect(restored.dialogue.heard('fisherman','hello')).toBe(true);expect(restored.inventory.count('wood')).toBe(8);
    const {dialogue:_dialogue,...legacy}=data;expect(migrateSave(legacy).dialogue.characters).toEqual({});expect(migrateSave(legacy).inventory).toEqual(data.inventory);
  });
});
