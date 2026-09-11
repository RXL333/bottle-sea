import { Color,Mesh,MeshStandardMaterial,Object3D } from 'three';
import { LANDMARKS } from '../world/underwater/Landmarks';
type Glow={material:MeshStandardMaterial;base:number;color:Color};
export class DiscoveryPulse {
  private targets=new Map<string,Glow[]>();private current:Glow[]=[];private age=1;
  private highlight=new Color('#91c6a0');
  constructor(world:Object3D){
    for(const landmark of LANDMARKS){
      const target=world.getObjectByName(landmark.id);if(!target)continue;
      const glows:Glow[]=[],clones=new Map<MeshStandardMaterial,MeshStandardMaterial>();
      target.traverse(object=>{if(!(object instanceof Mesh)||!(object.material instanceof MeshStandardMaterial))return;
        let copy=clones.get(object.material);if(!copy){copy=object.material.clone();clones.set(object.material,copy);glows.push({material:copy,base:copy.emissiveIntensity,color:copy.emissive.clone()});}
        object.material=copy;
      });this.targets.set(landmark.id,glows);
    }
  }
  trigger(id:string){for(const glow of this.current){glow.material.emissiveIntensity=glow.base;glow.material.emissive.copy(glow.color);}this.current=this.targets.get(id)??[];this.age=0;}
  update(delta:number){if(this.age>=.35)return;this.age=Math.min(.35,this.age+delta);const pulse=this.age===.35?0:Math.sin(this.age/.35*Math.PI);
    for(const glow of this.current){glow.material.emissive.copy(glow.color).lerp(this.highlight,pulse*.18);glow.material.emissiveIntensity=glow.base+pulse*.15;}
  }
}
