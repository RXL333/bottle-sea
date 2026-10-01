import { expect,it,vi } from 'vitest';
import { FarmAudio } from './FarmAudio';
import type { FarmSoundFrame } from '../../worlds/farm/FarmPresentation';
it('uses two permanent voices, bounds cue nodes, mutes outside farms and releases finished cues',()=>{
  const param=()=>({value:0,setTargetAtTime:vi.fn(),setValueAtTime:vi.fn(),linearRampToValueAtTime:vi.fn(),exponentialRampToValueAtTime:vi.fn()});
  const nodes:Array<ReturnType<typeof node>>=[];
  function node(){return {connect:vi.fn(),disconnect:vi.fn(),start:vi.fn(),stop:vi.fn(),onended:null as (()=>void)|null,frequency:param(),gain:param(),playbackRate:param(),Q:param()};}
  const create=()=>{const n=node();nodes.push(n);return n;},ctx={currentTime:0,createOscillator:create,createBiquadFilter:create,createGain:create,createBufferSource:create};
  const bank=new FarmAudio(ctx as unknown as AudioContext,{} as AudioNode,{} as AudioBuffer);
  expect(nodes).toHaveLength(12);const frame:FarmSoundFrame={machines:[{id:'tractor',x:0,y:4,z:0,yaw:0,speed:2,occupied:true,workEnabled:true,workKind:'seed',operations:0}],events:[],listener:{x:0,y:4,z:0},paused:false};
  bank.update(frame,true);expect(bank.diagnostics.voices).toBe(1);expect(bank.diagnostics.working).toBe(0);
  for(let t=0;t<10;t++){ctx.currentTime=t*.11;bank.update({...frame,events:['till','seed','harvest'].map(kind=>({kind:kind as 'till'|'seed'|'harvest',x:0,y:4,z:0}))},true);}
  expect(bank.diagnostics.nodes).toBe(30);expect(bank.diagnostics.cues).toBe(6);
  for(const n of nodes.slice(12))n.onended?.();expect(bank.diagnostics.nodes).toBe(12);
  ctx.currentTime=2;bank.update({...frame,machines:[{...frame.machines[0],operations:1}]},true);expect(bank.diagnostics.working).toBe(1);
  bank.update(undefined,true);expect(bank.diagnostics.voices).toBe(0);expect(bank.diagnostics.working).toBe(0);expect(nodes[2].gain.setTargetAtTime).toHaveBeenLastCalledWith(0,2,.05);
  bank.update(frame,false);expect(bank.diagnostics.voices).toBe(0);bank.dispose();expect(nodes.slice(0,12).every(n=>n.disconnect.mock.calls.length===1)).toBe(true);expect(bank.diagnostics.nodes).toBe(0);
});
