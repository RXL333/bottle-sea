import fs from 'node:fs';
import path from 'node:path';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { Box3,Vector3 } from 'three';
const folder=path.resolve('public/models/interior');
const manifest=JSON.parse(fs.readFileSync(path.join(folder,'manifest.json'),'utf8'));
const layout=JSON.parse(fs.readFileSync(path.join(folder,'layout.json'),'utf8'));
const check=(ok,msg)=>{if(!ok)throw new Error(msg);};
check(manifest.wholeRoomMerged===false,'Room must remain modular');
check(manifest.assets.length===manifest.assetCount,'Manifest count');
const ids=new Set(manifest.assets.map(a=>a.id));
check(ids.size===manifest.assetCount,'Duplicate modules');
check(layout.instances.every(i=>ids.has(i.module)),'Unresolved instance');
const report=[];
for(const a of manifest.assets){
  const raw=fs.readFileSync(path.join(folder,a.file));
  check(raw.readUInt32LE(0)===0x46546c67&&raw.readUInt32LE(8)===raw.length,a.id+' GLB header');
  const json=JSON.parse(raw.subarray(20,20+raw.readUInt32LE(12)).toString());
  check(!json.images?.length&&!json.cameras?.length,a.id+' includes external texture or review camera');
  check(json.buffers.every(b=>!b.uri),a.id+' external buffer');
  const gltf=await new GLTFLoader().parseAsync(raw.buffer.slice(raw.byteOffset,raw.byteOffset+raw.byteLength),'');
  gltf.scene.updateMatrixWorld(true);let meshes=0,triangles=0,degenerate=0;
  const u=new Vector3(),v=new Vector3(),w=new Vector3();
  gltf.scene.traverse(o=>{
    if(!o.isMesh)return;
    meshes++;const g=o.geometry,p=g.attributes.position,n=g.attributes.normal,ix=g.index;
    check(p?.count>0&&n?.count===p.count,a.id+' invalid attributes');
    check([...p.array,...n.array].every(Number.isFinite),a.id+' invalid values');
    const count=ix?.count??p.count;
    check(count%3===0,a.id+' nontriangular export');
    for(let j=0;j<count;j+=3){
      const indices=[0,1,2].map(k=>ix?ix.getX(j+k):j+k);
      check(indices.every(i=>i>=0&&i<p.count),a.id+' invalid index');
      u.fromBufferAttribute(p,indices[0]);v.fromBufferAttribute(p,indices[1]);w.fromBufferAttribute(p,indices[2]);
      if(v.sub(u).cross(w.sub(u)).lengthSq()<1e-20)degenerate++;
    }
    triangles+=count/3;
  });
  const box=new Box3().setFromObject(gltf.scene),size=box.getSize(new Vector3());
  check(meshes===a.meshCount,a.id+' mesh count');check(size.toArray().every(x=>x>0),a.id+' collapsed bounds');
  check(degenerate===0,a.id+` ${degenerate} degenerate triangles`);
  check(fs.existsSync(path.join('assets/blender/interior',a.blend)),a.id+' missing editable source');
  report.push({id:a.id,source:a.source,meshes,triangles,degenerate,bytes:raw.length,dimensionsGLTF:size.toArray()});
}
const result={status:'passed',modules:report.length,instances:layout.instances.length,reused:report.filter(a=>a.source.startsWith('farm/')).length,totalBytes:report.reduce((n,a)=>n+a.bytes,0),assets:report};
fs.writeFileSync('assets/blender/interior/export_validation.json',JSON.stringify(result,null,2));
console.log(JSON.stringify({...result,assets:undefined}));
