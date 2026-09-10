export class SoundSystem {
  enabled=false;private context:AudioContext|undefined;private gain:GainNode|undefined;private filter:BiquadFilterNode|undefined;private source:AudioBufferSourceNode|undefined;
  async toggle(){
    if(!this.context){
      this.context=new AudioContext();const ctx=this.context,buffer=ctx.createBuffer(1,ctx.sampleRate*4,ctx.sampleRate),data=buffer.getChannelData(0);let previous=0;
      for(let i=0;i<data.length;i++){previous=(previous+(Math.random()*2-1)*.035)/1.018;data[i]=previous;}
      this.source=ctx.createBufferSource();this.source.buffer=buffer;this.source.loop=true;
      this.filter=ctx.createBiquadFilter();this.filter.type='lowpass';this.filter.frequency.value=600;
      this.gain=ctx.createGain();this.gain.gain.value=0;this.source.connect(this.filter);this.filter.connect(this.gain);this.gain.connect(ctx.destination);this.source.start();
    }
    await this.context.resume();this.enabled=!this.enabled;
    if(!this.enabled)this.gain!.gain.setTargetAtTime(0,this.context.currentTime,.15);
    return this.enabled;
  }
  update(time:number,storm:number){if(!this.context||!this.enabled)return;this.gain!.gain.setTargetAtTime(.16+storm*.35+Math.sin(time*.6)*.035,this.context.currentTime,.25);this.filter!.frequency.setTargetAtTime(500+storm*1200,this.context.currentTime,.2);}
  dispose(){this.source?.stop();void this.context?.close();}
}
