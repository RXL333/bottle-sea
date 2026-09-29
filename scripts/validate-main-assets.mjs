import fs from 'node:fs';
import path from 'node:path';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { Box3, Vector3 } from 'three';

const root=path.resolve('public/models/main');
const manifest=JSON.parse(fs.readFileSync(path.join(root,'manifest.json'),'utf8'));
const results=[];
function assert(ok,message){if(!ok)throw new Error(message);}
assert(manifest.assets.length===12,'11 reference categories and extra palm required');
assert(new Set(manifest.assets.map(a=>a.id)).size===12,'Duplicate asset id');
assert(manifest.assets.every((a,i)=>a.number===i+2),'Reference numbering incomplete');
for(const asset of manifest.assets){
  const files=[{file:asset.file,asset},...asset.modules];
  for(const entry of files){
    const buffer=fs.readFileSync(path.join(root,entry.file));
    assert(buffer.readUInt32LE(0)===0x46546c67,`${entry.file}: GLB magic`);
    assert(buffer.readUInt32LE(4)===2,`${entry.file}: glTF 2.0`);
    assert(buffer.readUInt32LE(8)===buffer.length,`${entry.file}: truncated file`);
    const data=JSON.parse(buffer.subarray(20,20+buffer.readUInt32LE(12)).toString());
    assert(data.scenes.length===1,`${entry.file}: unexpected extra scenes`);
    assert(!data.images?.length,`${entry.file}: unexpected image dependency`);
    assert(data.buffers.every(b=>!b.uri),`${entry.file}: external buffer dependency`);
    assert(!data.cameras?.length,`${entry.file}: review camera included`);
    const ab=buffer.buffer.slice(buffer.byteOffset,buffer.byteOffset+buffer.byteLength);
    const gltf=await new GLTFLoader().parseAsync(ab,'');
    gltf.scene.updateMatrixWorld(true);
    let triangles=0,meshes=0;
    gltf.scene.traverse(object=>{
      if(!object.isMesh)return;
      meshes++;
      const g=object.geometry,positions=g.attributes.position;
      assert(positions?.count>0,`${entry.file}: empty geometry`);
      assert(Array.from(positions.array).every(Number.isFinite),`${entry.file}: non-finite vertex`);
      assert(Array.from(g.attributes.normal.array).every(Number.isFinite),`${entry.file}: invalid normal`);
      if(g.index)assert(Array.from(g.index.array).every(i=>i<positions.count),`${entry.file}: invalid index`);
      triangles+=(g.index?.count??positions.count)/3;
      const scale=new Vector3();object.getWorldScale(scale);
      assert(scale.x>0&&scale.y>0&&scale.z>0,`${entry.file}: reflected/collapsed scale`);
    });
    const bbox=new Box3().setFromObject(gltf.scene),size=bbox.getSize(new Vector3());
    assert(size.x>0&&size.y>0&&size.z>0,`${entry.file}: empty volume`);
    if(entry.asset){
      assert(triangles===asset.triangles,`${entry.file}: triangle manifest mismatch ${triangles}/${asset.triangles}`);
      assert(meshes===asset.meshCount,`${entry.file}: mesh manifest mismatch`);
      for(const [i,key] of ['width','height','depth'].entries())assert(Math.abs(size.getComponent(i)-asset.dimensions[key])<.001,`${entry.file}: wrong dimensions or axis ${key}`);
      if(asset.pivot==='ground')assert(Math.abs(bbox.min.y)<.0001,`${entry.file}: ground origin not zero`);
      const ids=new Set();gltf.scene.traverse(o=>{if(o.userData.part_id)ids.add(o.userData.part_id);});
      for(const key of asset.parts.filter(p=>p!=='body'))assert(ids.has(key),`${entry.file}: missing semantic part ${key}`);
      assert(fs.existsSync(path.join('assets/blender/main',asset.blend)),`${entry.file}: missing Blender source`);
      for(const suffix of ['', '_back'])assert(fs.statSync(path.join('assets/blender/main/previews',asset.id+suffix+'.png')).size>10000,`${entry.file}: missing preview`);
    }
    results.push({file:entry.file,bytes:buffer.length,triangles,meshes,bounds:{min:bbox.min.toArray(),max:bbox.max.toArray()},parsedBy:'Three.js GLTFLoader'});
  }
}
const report={assetCount:12,moduleCount:results.length-12,files:results,totalMainAssetBytes:manifest.assets.reduce((n,a)=>n+a.bytes,0),status:'passed'};
fs.writeFileSync('assets/blender/main/export_validation.json',JSON.stringify(report,null,2));
console.log(JSON.stringify({status:report.status,assets:12,modules:report.moduleCount,bytes:report.totalMainAssetBytes}));

