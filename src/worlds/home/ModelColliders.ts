import { Box3,Mesh,Object3D,Vector3 } from 'three';
import type { BoxObstacle } from '../../world/Collision';
/** Palette meshes contain many disconnected blocks. Their combined bounds fill
 * empty walkways; split by connected vertex positions before making colliders. */
export function modelColliders(root:Object3D):BoxObstacle[]{
  root.updateWorldMatrix(true,true);const result:BoxObstacle[]=[];
  root.traverse(object=>{
    if(!(object instanceof Mesh))return;
    const position=object.geometry.attributes.position,index=object.geometry.index;if(!position)return;
    const parents:number[]=[],vertices:Vector3[]=[],ids:number[]=[],weld=new Map<string,number>();
    for(let i=0;i<position.count;i++){
      const v=new Vector3().fromBufferAttribute(position,i),key=[v.x,v.y,v.z].map(n=>Math.round(n*1e6)).join(':');let id=weld.get(key);
      if(id===undefined){id=vertices.length;weld.set(key,id);vertices.push(v.applyMatrix4(object.matrixWorld));parents.push(id);}ids.push(id);
    }
    const find=(id:number):number=>{while(parents[id]!==id){parents[id]=parents[parents[id]];id=parents[id];}return id;};
    const count=index?.count??position.count;
    for(let i=0;i<count;i+=3){const a=find(ids[index?index.getX(i):i]);for(let j=1;j<3;j++)parents[find(ids[index?index.getX(i+j):i+j])]=a;}
    const components=new Map<number,Box3>();
    for(let i=0;i<vertices.length;i++){const id=find(i);let bounds=components.get(id);if(!bounds){bounds=new Box3();components.set(id,bounds);}bounds.expandByPoint(vertices[i]);}
    for(const b of components.values())result.push({minX:b.min.x,maxX:b.max.x,minY:b.min.y,maxY:b.max.y,minZ:b.min.z,maxZ:b.max.z});
  });return result;
}
