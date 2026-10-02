import { Color,Mesh } from 'three';
import type { Material,Object3D } from 'three';
import { SEASONS } from '../gameplay/calendar/SeasonRegistry';
import type { SeasonVisual } from '../gameplay/calendar/CalendarSystem';

/** Uniform-only foliage response. No geometry changes, extra draws or crop-state tint. */
export class SeasonalEnvironment {
  private foliage={value:new Color(SEASONS[0].foliage)};
  private registered=new WeakSet<Material>();
  private colors=SEASONS.map(d=>new Color(d.foliage));
  update(visual:SeasonVisual){this.foliage.value.setRGB(0,0,0);this.colors.forEach((color,i)=>this.foliage.value.add(color.clone().multiplyScalar(visual.weights[i])));}
  register(root:Object3D){
    root.traverse(object=>{
      if(!(object instanceof Mesh))return;
      const prepare=(source:Material)=>{
        if(this.registered.has(source))return source;
        const material=source.clone(),compile=source.onBeforeCompile,cache=source.customProgramCacheKey.bind(source);
        material.onBeforeCompile=(shader,renderer)=>{
          compile.call(material,shader,renderer);shader.uniforms.seasonFoliage=this.foliage;
          shader.fragmentShader='uniform vec3 seasonFoliage;\n'+shader.fragmentShader;
          shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
            float seasonMask=step(.02,diffuseColor.g)*step(diffuseColor.r*1.04,diffuseColor.g)*step(diffuseColor.b*1.15,diffuseColor.g);
            float seasonShade=clamp(max(max(diffuseColor.r,diffuseColor.g),diffuseColor.b)*1.4,.38,1.1);
            diffuseColor.rgb=mix(diffuseColor.rgb,seasonFoliage*seasonShade,seasonMask*.8);`);
        };
        material.customProgramCacheKey=()=>`${cache()}:season-foliage-v1`;material.needsUpdate=true;this.registered.add(material);return material;
      };
      object.material=Array.isArray(object.material)?object.material.map(prepare):prepare(object.material);
    });
  }
}
