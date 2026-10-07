import fs from 'node:fs';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {Box3,Vector3} from 'three';
const manifest=JSON.parse(fs.readFileSync('public/models/npcs/manifest.json','utf8'));
const report=[];
for(const a of manifest.characters){
 const raw=fs.readFileSync(a.glb),gltf=await new GLTFLoader().parseAsync(raw.buffer.slice(raw.byteOffset,raw.byteOffset+raw.byteLength),'');
 const ids=new Set();let triangles=0,meshes=0,bad=0;const u=new Vector3(),v=new Vector3(),w=new Vector3();
 gltf.scene.traverse(o=>{
  if(o.userData.part_id)ids.add(o.userData.part_id);
  if(!o.isMesh)return;meshes++;const g=o.geometry,p=g.attributes.position,n=g.attributes.normal,ix=g.index;
  if(!p||!n||![...p.array,...n.array].every(Number.isFinite))throw Error(a.id+' invalid vertices');
  const count=ix?ix.count:p.count;triangles+=count/3;
  for(let j=0;j<count;j+=3){const i=[0,1,2].map(k=>ix?ix.getX(j+k):j+k);u.fromBufferAttribute(p,i[0]);v.fromBufferAttribute(p,i[1]);w.fromBufferAttribute(p,i[2]);if(v.sub(u).cross(w.sub(u)).lengthSq()<1e-20)bad++;}
 });
 if(a.parts.some(p=>!ids.has(p)))throw Error(a.id+' missing parts');
 if(bad||triangles!==a.triangles||meshes!==a.meshCount)throw Error(a.id+JSON.stringify({bad,triangles,expected:a.triangles,meshes}));
 const box=new Box3().setFromObject(gltf.scene);
 if(Math.abs(box.min.y)>.005)throw Error(a.id+' feet origin');
 const json=JSON.parse(raw.subarray(20,20+raw.readUInt32LE(12)).toString());
 if(json.cameras?.length||json.images?.length||json.buffers.some(b=>b.uri))throw Error(a.id+' external resources or camera');
 if(!fs.existsSync(a.blend))throw Error('Missing source');
 report.push({id:a.id,meshes,triangles,parts:ids.size,degenerate:bad,bytes:raw.length,bounds:{min:box.min.toArray(),max:box.max.toArray()}});
}
fs.writeFileSync('assets/blender/npcs/export_validation.json',JSON.stringify({status:'passed',characters:report},null,2));
console.log(JSON.stringify(report));
