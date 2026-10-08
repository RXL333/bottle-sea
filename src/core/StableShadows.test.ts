import { expect,it } from 'vitest';
import { ShaderChunk } from 'three';
import { installStableShadowSampling } from './StableShadows';

it('keeps PCF filtering while removing screen-space sampling jitter for every shadow type',()=>{
  const original=ShaderChunk.shadowmap_pars_fragment;
  try{
    expect(original).toContain('interleavedGradientNoise( gl_FragCoord.xy )');
    installStableShadowSampling();const stable=ShaderChunk.shadowmap_pars_fragment;
    expect(stable).not.toContain('interleavedGradientNoise( gl_FragCoord.xy )');
    expect(stable).toContain('vogelDiskSample( 4, 5, phi )');expect(stable).toContain('float phi = 0.0;');
    installStableShadowSampling();expect(ShaderChunk.shadowmap_pars_fragment).toBe(stable);
  }finally{ShaderChunk.shadowmap_pars_fragment=original;}
});
