export type AudioId='ocean-calm'|'wind'|'storm-wind'|'rain'|'thunder'|'seagull'|'wood-step'|'sand-step'|'grass-step'|'water-enter'|'underwater'|'ui-discover';
const urls=import.meta.glob<string>('../../assets/audio/*.{ogg,mp3,wav}',{eager:true,query:'?url',import:'default'});
export class AudioAssets {
  private buffers=new Map<AudioId,AudioBuffer>();
  constructor(private sources:Record<string,string>=urls){}
  async load(context:AudioContext){
    await Promise.all(Object.entries(this.sources).map(async([path,url])=>{
      try{const response=await fetch(url);if(!response.ok)return;const buffer=await context.decodeAudioData(await response.arrayBuffer());this.buffers.set(path.split('/').pop()!.split('.')[0] as AudioId,buffer);}catch{/* Optional assets always fall back to synthesis. */}
    }));
  }
  get(id:AudioId){return this.buffers.get(id);}
}
