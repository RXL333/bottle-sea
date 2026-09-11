import { afterEach,expect,it,vi } from 'vitest';
import { AudioAssets } from './AudioAssets';
afterEach(()=>vi.unstubAllGlobals());
it('loads existing assets and safely ignores missing or undecodable files',async()=>{
  const buffer={} as AudioBuffer,context={decodeAudioData:vi.fn(async(bytes:ArrayBuffer)=>{if(bytes.byteLength===2)throw new Error('bad audio');return buffer;})} as unknown as AudioContext;
  vi.stubGlobal('fetch',vi.fn(async(url:string)=>({ok:url!=='missing',arrayBuffer:async()=>new ArrayBuffer(url==='bad'?2:1)})));
  const assets=new AudioAssets({'ocean-calm.ogg':'good','wind.wav':'bad','rain.mp3':'missing'});await assets.load(context);
  expect(assets.get('ocean-calm')).toBe(buffer);expect(assets.get('wind')).toBeUndefined();expect(assets.get('rain')).toBeUndefined();expect(assets.get('underwater')).toBeUndefined();
});
