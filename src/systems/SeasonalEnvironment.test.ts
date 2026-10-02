import { expect,it,vi } from 'vitest';
import { BoxGeometry,Group,Mesh,MeshStandardMaterial } from 'three';
import type { WebGLProgramParametersWithUniforms,WebGLRenderer } from 'three';
import { SeasonalEnvironment } from './SeasonalEnvironment';
import { disposeWorld } from '../worlds/disposeWorld';
it('composes existing wind/wetness shader hooks without touching geometry or shared material color',()=>{
  const root=new Group(),material=new MeshStandardMaterial({color:'#568446'}),mesh=new Mesh(new BoxGeometry(),material),original=material.color.clone(),wind=vi.fn(shader=>{shader.uniforms.wind={value:2};});material.onBeforeCompile=wind;root.add(mesh);
  const view=new SeasonalEnvironment();view.register(root);const owned=mesh.material as MeshStandardMaterial;expect(owned).not.toBe(material);expect(material.color.equals(original)).toBe(true);const geometry=mesh.geometry;
  const shader={uniforms:{},fragmentShader:'#include <color_fragment>',vertexShader:''} as unknown as WebGLProgramParametersWithUniforms;owned.onBeforeCompile(shader,{} as WebGLRenderer);
  expect(wind).toHaveBeenCalledOnce();expect(shader.uniforms.wind).toBeDefined();expect(shader.fragmentShader).toContain('seasonMask');const foliage=shader.uniforms.seasonFoliage.value.clone();view.update({weights:[0,0,0,1],sunrise:7,sunset:17});expect(shader.uniforms.seasonFoliage.value.equals(foliage)).toBe(false);expect(mesh.geometry).toBe(geometry);
  view.register(root);expect(mesh.material).toBe(owned);disposeWorld(root);material.dispose();
});
