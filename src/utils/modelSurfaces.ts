import { Matrix4,Mesh,SkinnedMesh,Vector2,Vector3 } from 'three';
import type { BufferGeometry,Object3D } from 'three';

interface Face {mesh:Mesh;indices:Set<number>;slots:Set<number>;triangles:Vector2[][];normal:Vector3;distance:number;offset:number}
const EPSILON=1e-5,CLEARANCE=.002;
function intersectionArea(a:Vector2[],b:Vector2[]){
  let polygon=a;
  const cross=(a:Vector2,b:Vector2,c:Vector2)=>(b.x-a.x)*(c.y-a.y)-(b.y-a.y)*(c.x-a.x);
  const sign=Math.sign(cross(b[0],b[1],b[2]));
  for(let i=0;i<3&&polygon.length;i++){
    const p=b[i],q=b[(i+1)%3],input=polygon;polygon=[];
    for(let j=0;j<input.length;j++){
      const u=input[j],v=input[(j+1)%input.length],du=sign*cross(p,q,u),dv=sign*cross(p,q,v);
      if(du>=0)polygon.push(u);
      if((du>=0)!==(dv>=0))polygon.push(u.clone().lerp(v,du/(du-dv)));
    }
  }
  let area=0;for(let i=0;i<polygon.length;i++){const a=polygon[i],b=polygon[(i+1)%polygon.length];area+=a.x*b.y-a.y*b.x;}return Math.abs(area)/2;
}

/** Separate coplanar decorative layers once at load time, before batching.
 * Work within each parent pivot only: doors/wheels/limbs must remain independent.
 * Authored nodes, materials, UVs, inventory and collision rules stay untouched. */
export function separateModelSurfaces(model:Object3D){
  let separated=0;const replaced=new Set<BufferGeometry>();
  model.traverse(parent=>{
    const planes=new Map<string,Face[]>();
    for(const mesh of parent.children){
      if(!(mesh instanceof Mesh)||mesh instanceof SkinnedMesh||Object.keys(mesh.geometry.morphAttributes).length)continue;
      mesh.updateMatrix();const p=mesh.geometry.attributes.position,index=mesh.geometry.index;if(!p)continue;
      const groups=new Map<string,{normal:Vector3;triangles:{ids:number[];slots:number[];v:Vector3[]}[]}>();
      for(let i=0,count=index?.count??p.count;i<count;i+=3){
        const ids=[0,1,2].map(j=>index?index.getX(i+j):i+j),v=ids.map(id=>new Vector3().fromBufferAttribute(p,id).applyMatrix4(mesh.matrix));
        const normal=new Vector3().subVectors(v[1],v[0]).cross(new Vector3().subVectors(v[2],v[0]));if(normal.lengthSq()<1e-16)continue;normal.normalize();
        const plane=[...normal.toArray(),normal.dot(v[0])].map(n=>Math.round(n/EPSILON)).join(':');
        const group=groups.get(plane)??{normal,triangles:[]};group.triangles.push({ids,slots:[i,i+1,i+2],v});groups.set(plane,group);
      }
      for(const [plane,group] of groups){
        const normal=group.normal,axis=Math.abs(normal.y)<.9?new Vector3(0,1,0):new Vector3(1,0,0),u=new Vector3().crossVectors(axis,normal).normalize(),v=new Vector3().crossVectors(normal,u);
        const faces:Face[]=[];
        for(const triangle of group.triangles){
          const projected=triangle.v.map(p=>new Vector2(p.dot(u),p.dot(v))),last=faces[faces.length-1];
          // Pair the two triangles of a quad, but never merge an entire connected
          // plane: exported trims can share corner indices with overlapping quads.
          const paired=last?.triangles.length===1&&triangle.ids.filter(id=>last.indices.has(id)).length===2&&intersectionArea(last.triangles[0],projected)<=EPSILON*EPSILON;
          const face:Face=paired?last:{mesh,indices:new Set<number>(),slots:new Set<number>(),triangles:[],normal,distance:normal.dot(triangle.v[0]),offset:0};
          if(!paired)faces.push(face);
          for(const id of triangle.ids)face.indices.add(id);
          for(const slot of triangle.slots)face.slots.add(slot);
          face.triangles.push(projected);
        }
        for(const face of faces){
          const previous=planes.get(plane)??[];
          for(const other of previous)if(face.triangles.some(a=>other.triangles.some(b=>intersectionArea(a,b)>EPSILON*EPSILON)))face.offset=Math.max(face.offset,other.offset+CLEARANCE);
          previous.push(face);planes.set(plane,previous);
        }
      }
    }
    const modified=new Map<Mesh,Face[]>(),lifted=new Map<string,Face[]>();
    for(const faces of planes.values())for(const face of faces)if(face.offset){
      let key:string;
      // A clearance must not put a trim onto another existing decorative layer.
      do{key=[...face.normal.toArray(),face.distance+face.offset].map(n=>Math.round(n/EPSILON)).join(':');if(!planes.has(key)&&!(lifted.get(key)??[]).some(other=>face.triangles.some(a=>other.triangles.some(b=>intersectionArea(a,b)>EPSILON*EPSILON))))break;face.offset+=EPSILON*4;}while(true);
      const layers=lifted.get(key)??[];layers.push(face);lifted.set(key,layers);
      const list=modified.get(face.mesh)??[];list.push(face);modified.set(face.mesh,list);separated++;
    }
    for(const [mesh,faces] of modified){
      // Isolate face vertices so lifting a trim cannot distort adjacent faces
      // that share its authored vertex indices (common in exported GLBs).
      const geometry=mesh.geometry.index?mesh.geometry.toNonIndexed():mesh.geometry.clone(),p=geometry.attributes.position,inverse=new Matrix4().copy(mesh.matrix).invert();
      for(const face of faces)for(const slot of face.slots){const v=new Vector3().fromBufferAttribute(p,slot).applyMatrix4(mesh.matrix).addScaledVector(face.normal,face.offset).applyMatrix4(inverse);p.setXYZ(slot,v.x,v.y,v.z);}
      p.needsUpdate=true;geometry.computeBoundingBox();geometry.computeBoundingSphere();replaced.add(mesh.geometry);mesh.geometry=geometry;
    }
  });
  model.traverse(o=>{if(o instanceof Mesh)replaced.delete(o.geometry);});for(const geometry of replaced)geometry.dispose();
  model.userData.separatedSurfaces=separated;return separated;
}
