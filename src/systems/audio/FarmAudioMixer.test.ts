import { expect,it } from 'vitest';
import { FarmAudioMixer } from './FarmAudioMixer';
import type { FarmMachineFeedback,FarmSoundFrame } from '../../worlds/farm/FarmPresentation';
const machine:FarmMachineFeedback={id:'tractor',x:0,y:4,z:0,yaw:0,speed:2,occupied:true,workKind:'till',workEnabled:true,operations:0};
const frame=(machines:FarmMachineFeedback[]=[machine]):FarmSoundFrame=>({machines,events:[],listener:{x:0,y:4,z:0},paused:false});
it('only sounds work after an actual successful operation; stops for lifts, stops, resets and expiry',()=>{
  const mixer=new FarmAudioMixer();expect(mixer.update(frame(),0)[0].work).toBe(0);
  const worked={...machine,operations:1};expect(mixer.update(frame([worked]),.1)[0].work).toBeGreaterThan(0);
  expect(mixer.update(frame([{...worked,workEnabled:false}]),.2)[0].work).toBe(0);
  expect(mixer.update(frame([{...worked,speed:0}]),.3)[0].work).toBe(0);
  expect(mixer.update(frame([worked]),.6)[0].work).toBe(0);
  expect(mixer.update(frame([{...worked,operations:2}]),.7)[0].work).toBeGreaterThan(0);
  expect(mixer.update(frame([machine]),.71)[0].work).toBe(0);
  expect(mixer.update({...frame(),paused:true},1)).toEqual([]);expect(mixer.update(frame([worked]),1.1)[0].work).toBe(0);
});
it('limits nearby voices, modulates pitch by absolute speed and silences inactive worlds',()=>{
  const mixer=new FarmAudioMixer(),many=Array.from({length:10},(_,i)=>({...machine,id:String(i),x:i*8}));expect(mixer.update(frame(many),0)).toHaveLength(2);
  const idle=mixer.update(frame([{...machine,speed:0}]),1)[0],reverse=mixer.update(frame([{...machine,speed:-4}]),2)[0];expect(reverse.frequency).toBeGreaterThan(idle.frequency);expect(reverse.engine).toBeGreaterThan(idle.engine);
  expect(mixer.update(frame([{...machine,x:40}]),3)).toEqual([]);expect(mixer.update(frame([{...machine,speed:0,occupied:false}]),3)).toEqual([]);expect(mixer.update(undefined,4)).toEqual([]);
});
