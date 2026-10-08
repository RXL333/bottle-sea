import { ShaderChunk } from 'three';

/** r186 PCF rotates its kernel using gl_FragCoord. A fixed rotation keeps the
 * soft hardware-PCF taps without screen-space noise crawling across voxel faces.
 * Install before any material compiles, for all worlds and material types. */
export function installStableShadowSampling(){
  ShaderChunk.shadowmap_pars_fragment=ShaderChunk.shadowmap_pars_fragment.replace(/float phi = interleavedGradientNoise\( gl_FragCoord\.xy \) \* PI2;/g,'float phi = 0.0; // Bottle Sea: deterministic PCF kernel');
}
