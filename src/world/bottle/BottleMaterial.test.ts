import { BackSide,FrontSide } from 'three';
import { expect,it } from 'vitest';
import { bottleMaterial } from './BottleMaterial';

it('renders distinct Fresnel glass from outside and inside the bottle',()=>{const outer=bottleMaterial(),inner=bottleMaterial(true);expect(outer.side).toBe(FrontSide);expect(inner.side).toBe(BackSide);expect(outer.uniforms.interior.value).toBe(0);expect(inner.uniforms.interior.value).toBe(1);expect(inner.fragmentShader).toContain('interior*0.16');});
