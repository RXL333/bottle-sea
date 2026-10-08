import { readFile,readdir } from 'node:fs/promises';
import { Mesh,Vector3 } from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

// Reports exact duplicate triangles and overlapping axis-aligned rectangular
// faces. Intersections on curved/irregular surfaces need visual inspection.
const roots=['public/models/main','public/models/farm','public/models/npcs','public/models/interior','public/models/character'];
const report=[];
for(const root of roots){
  let files;try{files=await readdir(root,{recursive:true});}catch{continue;}
  for(const file of files.filter(f=>f.endsWith('.glb'))){
    const bytes=await readFile(`${root}/${file}`),model=(await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'')).scene;
    model.updateMatrixWorld(true);const triangles=new Set(),planes=new Map();let duplicateTriangles=0,overlappingFaces=0;const examples=[];
    model.traverse(o=>{
      if(!(o instanceof Mesh))return;
      const pos=o.geometry.attributes.position,index=o.geometry.index,count=index?.count??pos.count,faces=new Map();
      for(let i=0;i<count;i+=3){
        const v=[0,1,2].map(j=>new Vector3().fromBufferAttribute(pos,index?index.getX(i+j):i+j).applyMatrix4(o.matrixWorld));
        const key=v.map(p=>p.toArray().map(n=>Math.round(n*1e5)).join(',')).sort().join('|');if(triangles.has(key))duplicateTriangles++;triangles.add(key);
        const normal=new Vector3().subVectors(v[1],v[0]).cross(new Vector3().subVectors(v[2],v[0])).normalize();
        for(let axis=0;axis<3;axis++)if(Math.abs(normal.getComponent(axis))>1-1e-8){
          const plane=`${axis}:${Math.sign(normal.getComponent(axis))}:${Math.round(v[0].getComponent(axis)*1e5)}`,face=faces.get(plane)??{axis,vertices:[]};face.vertices.push(...v);faces.set(plane,face);break;
        }
      }
      for(const [plane,face] of faces){
        const vertices=[...new Map(face.vertices.map(p=>[p.toArray().map(n=>Math.round(n*1e5)).join(','),p])).values()];
        if(vertices.length!==4||face.vertices.length!==6)continue;
        const axes=[0,1,2].filter(a=>a!==face.axis),rect={name:o.name,min:axes.map(a=>Math.min(...vertices.map(v=>v.getComponent(a)))),max:axes.map(a=>Math.max(...vertices.map(v=>v.getComponent(a))))};
        if(!vertices.every(v=>axes.every((a,j)=>Math.min(Math.abs(v.getComponent(a)-rect.min[j]),Math.abs(v.getComponent(a)-rect.max[j]))<1e-6)))continue;
        const list=planes.get(plane)??[];
        for(const other of list){const area=[0,1].map(j=>Math.min(rect.max[j],other.max[j])-Math.max(rect.min[j],other.min[j]));if(area.every(n=>n>1e-5)){overlappingFaces++;if(examples.length<8)examples.push({a:other.name,b:rect.name,plane,area:area[0]*area[1]});}}
        list.push(rect);planes.set(plane,list);
      }
    });
    if(duplicateTriangles||overlappingFaces)report.push({file:`${root}/${file}`,duplicateTriangles,overlappingFaces,examples});
  }
}
console.log(JSON.stringify(report,null,2));
