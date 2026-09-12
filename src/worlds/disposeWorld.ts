import { InstancedMesh, Line, Mesh, Points, Texture } from 'three';
import type { Material, Object3D } from 'three';
import { isSharedVoxelResource } from '../utils/voxel';
/** Only world-owned render objects are passed here. Persistent systems stay outside. */
export function disposeWorld(root:Object3D) {
  const disposed=new Set<object>();
  const release=(resource:{dispose():void})=>{if(!disposed.has(resource)&&!isSharedVoxelResource(resource)){disposed.add(resource);resource.dispose();}};
  const releaseMaterial=(material:Material)=>{
    if(isSharedVoxelResource(material))return;
    for(const value of Object.values(material))if(value instanceof Texture)release(value);
    if('uniforms' in material)for(const uniform of Object.values(material.uniforms as Record<string,{value:unknown}>))if(uniform.value instanceof Texture)release(uniform.value);
    release(material);
  };
  root.traverse(object=>{
    if(object instanceof Mesh||object instanceof Line||object instanceof Points){
      release(object.geometry);for(const mat of Array.isArray(object.material)?object.material:[object.material])releaseMaterial(mat);
      if(object instanceof InstancedMesh)release(object);
    }
    if('shadow' in object){const shadow=object.shadow as {dispose?:()=>void}|undefined;shadow?.dispose?.();}
  });
  root.removeFromParent();root.clear();
}
