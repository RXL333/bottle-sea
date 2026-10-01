import { FarmAudioMixer } from './FarmAudioMixer';
import type { FarmSoundFrame,FarmEffectKind } from '../../worlds/farm/FarmPresentation';

interface Voice {engine:OscillatorNode;filter:BiquadFilterNode;gain:GainNode;work:AudioBufferSourceNode;workFilter:BiquadFilterNode;workGain:GainNode}
/** Reuses SoundSystem's context/master. Six permanent nodes per voice; bounded cues. */
export class FarmAudio {
  private mixer=new FarmAudioMixer();private voices:Voice[]=[];private cues=0;private lastCue=new Map<FarmEffectKind,number>();
  private active=0;private working=0;private successfulCues=0;
  get diagnostics(){return {voices:this.active,working:this.working,nodes:this.voices.length*6+this.cues*3,cues:this.successfulCues};}
  constructor(private ctx:AudioContext,private destination:AudioNode,private noise:AudioBuffer){
    for(let i=0;i<2;i++){
      const engine=ctx.createOscillator(),filter=ctx.createBiquadFilter(),gain=ctx.createGain(),work=ctx.createBufferSource(),workFilter=ctx.createBiquadFilter(),workGain=ctx.createGain();
      engine.type='triangle';engine.frequency.value=42;filter.type='lowpass';filter.frequency.value=240;gain.gain.value=0;engine.connect(filter);filter.connect(gain);gain.connect(destination);engine.start();
      work.buffer=noise;work.loop=true;workFilter.type='bandpass';workFilter.Q.value=.7;workGain.gain.value=0;work.connect(workFilter);workFilter.connect(workGain);workGain.connect(destination);work.start();this.voices.push({engine,filter,gain,work,workFilter,workGain});
    }
  }
  update(frame:FarmSoundFrame|undefined,enabled:boolean){
    const now=this.ctx.currentTime,mixes=this.mixer.update(enabled?frame:undefined,now);this.active=mixes.length;this.working=mixes.filter(m=>m.work>0).length;
    for(let i=0;i<this.voices.length;i++){
      const voice=this.voices[i],mix=mixes[i];voice.gain.gain.setTargetAtTime(mix?.engine??0,now,.05);voice.engine.frequency.setTargetAtTime(mix?.frequency??42,now,.09);
      voice.workGain.gain.setTargetAtTime(mix?.work??0,now,.025);voice.workFilter.frequency.setTargetAtTime(mix?.kind==='harvest'?900:mix?.kind==='seed'?1800:380,now,.05);
    }
    if(!enabled||!frame||frame.paused)return;
    for(const event of frame.events){const distance=Math.hypot(event.x-frame.listener.x,event.z-frame.listener.z);if(distance<24)this.cue(event.kind,Math.pow(1-distance/24,2));}
  }
  private cue(kind:FarmEffectKind,attenuation:number){
    const now=this.ctx.currentTime;if(this.cues>=6||now-(this.lastCue.get(kind)??-Infinity)<.1)return;this.lastCue.set(kind,now);
    const source=this.ctx.createBufferSource(),filter=this.ctx.createBiquadFilter(),gain=this.ctx.createGain(),duration=kind==='harvest'?.24:kind==='seed'?.11:.2;
    source.buffer=this.noise;source.playbackRate.value=kind==='till'?.7:kind==='seed'?1.8:1.2;filter.type='bandpass';filter.frequency.value=kind==='till'?440:kind==='seed'?2500:1400;
    gain.gain.setValueAtTime(.0001,now);gain.gain.linearRampToValueAtTime(attenuation*(kind==='seed'?.07:.13),now+.015);gain.gain.exponentialRampToValueAtTime(.0001,now+duration);
    source.connect(filter);filter.connect(gain);gain.connect(this.destination);source.start();source.stop(now+duration+.015);this.cues++;this.successfulCues++;
    source.onended=()=>{source.disconnect();filter.disconnect();gain.disconnect();this.cues--;};
  }
  dispose(){for(const voice of this.voices){voice.engine.stop();voice.work.stop();for(const node of Object.values(voice))node.disconnect();}this.voices=[];}
}
