import { AudioAssets } from './audio/AudioAssets';
import type { AudioId } from './audio/AudioAssets';
import { mixAudio } from './audio/AudioMixer';
import type { AudioMix,AudioMode } from './audio/AudioMixer';
import type { GroundSurface } from './PlayerFeedback';

type Layer={source:AudioBufferSourceNode;filter:BiquadFilterNode;gain:GainNode};
export class SoundSystem {
  private transientNodes=0;
  get diagnostics(){return {enabled:this.enabled,state:this.context?.state??'uninitialized',layers:this.layers.length,nodes:this.layers.length*3+(this.master?1:0)+(this.lowpass?1:0)+this.transientNodes};}
  enabled=false;private context:AudioContext|undefined;private master:GainNode|undefined;private lowpass:BiquadFilterNode|undefined;
  private assets=new AudioAssets();private noise:AudioBuffer|undefined;private layers:Layer[]=[];
  private mix:AudioMix={ocean:0,wind:0,stormWind:0,rain:0,underwater:0,cutoff:6500};
  private gains=new Float32Array(5);private previousFlash=0;private nextBird=18;
  async toggle(){
    if(!this.context){
      const ctx=this.context=new AudioContext();this.master=ctx.createGain();this.master.gain.value=0;
      this.lowpass=ctx.createBiquadFilter();this.lowpass.type='lowpass';this.lowpass.frequency.value=6500;this.lowpass.connect(this.master);this.master.connect(ctx.destination);
      const buffer=this.noise=ctx.createBuffer(1,ctx.sampleRate*3,ctx.sampleRate),data=buffer.getChannelData(0);let previous=0;
      for(let i=0;i<data.length;i++){previous=(previous+(Math.random()*2-1)*.2)/1.08;data[i]=previous;}
      try{await ctx.resume();await this.assets.load(ctx);}catch(error){void ctx.close();this.context=undefined;throw error;}
      const ids:AudioId[]=['ocean-calm','wind','storm-wind','rain','underwater'];const frequencies=[650,1200,850,3500,130];
      for(let i=0;i<ids.length;i++){
        const source=ctx.createBufferSource(),filter=ctx.createBiquadFilter(),gain=ctx.createGain();source.buffer=this.assets.get(ids[i])??buffer;source.loop=true;source.playbackRate.value=1+i*.137;
        if(this.assets.get(ids[i]))source.playbackRate.value=1;
        filter.type=i===1?'bandpass':'lowpass';filter.frequency.value=frequencies[i];gain.gain.value=0;source.connect(filter);filter.connect(gain);gain.connect(this.lowpass);source.start();this.layers.push({source,filter,gain});
      }
    }
    await this.context.resume();this.enabled=!this.enabled;this.master!.gain.setTargetAtTime(this.enabled?.65:0,this.context.currentTime,.12);return this.enabled;
  }
  update(time:number,storm:number,mode:AudioMode='OVERVIEW',flash=0){
    if(!this.context||!this.enabled)return;const now=this.context.currentTime;
    mixAudio(mode,storm,this.mix);this.gains[0]=this.mix.ocean*(1+Math.sin(time*.6)*.15);this.gains[1]=this.mix.wind;this.gains[2]=this.mix.stormWind;this.gains[3]=this.mix.rain;this.gains[4]=this.mix.underwater;
    for(let i=0;i<this.layers.length;i++)this.layers[i].gain.gain.setTargetAtTime(this.gains[i],now,.16);
    this.lowpass!.frequency.setTargetAtTime(this.mix.cutoff,now,.08);
    if(flash>0&&this.previousFlash===0)this.play('thunder');this.previousFlash=flash;
    if(time>this.nextBird){this.nextBird=time+25;if(storm<.3&&mode!=='UNDERWATER')this.play('seagull');}
  }
  footstep(surface:GroundSurface){this.play(`${surface}-step`);}
  play(id:AudioId){
    if(!this.context||!this.enabled||!this.lowpass)return;const ctx=this.context,now=ctx.currentTime,gain=ctx.createGain(),filter=ctx.createBiquadFilter();
    const buffer=this.assets.get(id);let source:AudioBufferSourceNode|OscillatorNode;
    const duration=buffer?Math.max(.04,Math.min(buffer.duration,8)):id==='thunder'?1.5:id==='water-enter'?.55:id==='seagull'?.35:id==='ui-discover'?.3:.12;
    const volume=id==='thunder'?.35:id==='ui-discover'?.055:.12;
    if(buffer){const sample=ctx.createBufferSource();sample.buffer=buffer;source=sample;}
    else if(id==='ui-discover'||id==='seagull'){
      const tone=ctx.createOscillator();tone.type='sine';tone.frequency.setValueAtTime(id==='ui-discover'?660:1050,now);tone.frequency.exponentialRampToValueAtTime(id==='ui-discover'?990:700,now+duration);source=tone;
    }else{const sample=ctx.createBufferSource();sample.buffer=this.noise!;sample.playbackRate.value=id==='thunder'?.4:1;source=sample;}
    filter.type='lowpass';filter.frequency.value=id==='wood-step'?420:id==='sand-step'?1700:id==='grass-step'?2800:id==='thunder'?220:1800;
    gain.gain.setValueAtTime(0,now);gain.gain.linearRampToValueAtTime(volume,now+.012);gain.gain.exponentialRampToValueAtTime(.0001,now+duration);
    source.connect(filter);filter.connect(gain);gain.connect(this.lowpass);source.start();source.stop(now+duration+.02);
    this.transientNodes+=3;source.onended=()=>{source.disconnect();filter.disconnect();gain.disconnect();this.transientNodes-=3;};
  }
  dispose(){for(const layer of this.layers){layer.source.stop();layer.source.disconnect();layer.filter.disconnect();layer.gain.disconnect();}void this.context?.close();}
}
