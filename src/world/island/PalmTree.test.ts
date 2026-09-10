import { Group,InstancedMesh,Matrix4,Quaternion,Vector3 } from 'three';
import { describe,expect,it } from 'vitest';
import { VoxelBatch } from '../../utils/voxel';
import { palmTree } from './PalmTree';

describe('palm tree voxel joints',()=>{
  it('does not duplicate the center leaf block or overlap stacked trunk faces',()=>{
    const batch=new VoxelBatch(),group=new Group();palmTree(batch,0,0,0,1.15);const mesh=batch.build(group) as InstancedMesh;
    const matrix=new Matrix4(),position=new Vector3(),rotation=new Quaternion(),scale=new Vector3(),centers=new Set<string>();
    const trunk:{bottom:number;top:number}[]=[];
    for(let i=0;i<mesh.count;i++){
      mesh.getMatrixAt(i,matrix);matrix.decompose(position,rotation,scale);centers.add(position.toArray().map(n=>n.toFixed(4)).join(':'));
      if(i<7)trunk.push({bottom:position.y-scale.y/2,top:position.y+scale.y/2});
    }
    expect(centers.size).toBe(mesh.count);
    for(let i=1;i<trunk.length;i++)expect(trunk[i].bottom).toBeGreaterThanOrEqual(trunk[i-1].top-1e-6);
  });
});
