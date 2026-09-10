import { InstancedMesh, Matrix4, Quaternion, Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { Island } from './Island';

describe('island terrain',()=>{
  it('stacks terrain layers without overlapping coplanar sides',()=>{
    const island=new Island();
    const terrain=island.getObjectByName('IslandTerrain') as InstancedMesh;
    const matrix=new Matrix4(),position=new Vector3(),scale=new Vector3(),rotation=new Quaternion();
    const columns=new Map<string,{bottom:number;top:number}[]>();
    for(let i=0;i<terrain.count;i++){
      terrain.getMatrixAt(i,matrix);matrix.decompose(position,rotation,scale);
      const key=`${position.x.toFixed(3)}:${position.z.toFixed(3)}`;
      const layers=columns.get(key)??[];
      layers.push({bottom:position.y-scale.y/2,top:position.y+scale.y/2});columns.set(key,layers);
    }
    for(const layers of columns.values()){
      layers.sort((a,b)=>a.bottom-b.bottom);
      for(let i=1;i<layers.length;i++)expect(layers[i].bottom).toBeGreaterThanOrEqual(layers[i-1].top-1e-6);
    }
    expect(terrain.castShadow).toBe(false);expect(terrain.receiveShadow).toBe(true);
  });
});
