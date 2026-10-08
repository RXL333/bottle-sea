import { readFile,readdir } from 'node:fs/promises';
import { expect,it } from 'vitest';
import { BoxGeometry,Group,Mesh,MeshBasicMaterial,PlaneGeometry } from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { separateModelSurfaces } from './modelSurfaces';
import { disposeWorld } from '../worlds/disposeWorld';

it('separates overlapping layers without changing pivots, topology, normals or UVs',()=>{
  const root=new Group(),base=new Mesh(new PlaneGeometry(2,2),new MeshBasicMaterial()),trim=new Mesh(new PlaneGeometry(1,1),new MeshBasicMaterial());root.add(base,trim);
  const old=trim.geometry,expanded=old.toNonIndexed(),uv=expanded.attributes.uv.array.slice(),normal=expanded.attributes.normal.array.slice(),count=old.index!.count;
  expect(separateModelSurfaces(root)).toBe(1);expect(trim.position.toArray()).toEqual([0,0,0]);expect(trim.geometry.boundingBox!.min.z).toBeCloseTo(.002);
  expect(trim.geometry.attributes.uv.array).toEqual(uv);expect(trim.geometry.attributes.normal.array).toEqual(normal);expect(trim.geometry.attributes.position.count).toBe(count);expanded.dispose();
  expect(separateModelSurfaces(root)).toBe(0);disposeWorld(root);
});
it('leaves touching edges, separated surfaces and independent animated pivots intact',()=>{
  const root=new Group(),a=new Mesh(new PlaneGeometry(1,1),new MeshBasicMaterial()),b=a.clone();b.position.x=1;root.add(a,b);
  const pivot=new Group(),door=a.clone();pivot.add(door);root.add(pivot);const old=a.geometry;
  expect(separateModelSurfaces(root)).toBe(0);expect(a.geometry).toBe(old);expect(door.geometry).toBe(old);disposeWorld(root);
});
it('corrects sloped overlapping surfaces in parent coordinates and preserves shared geometry users',()=>{
  const root=new Group(),geometry=new BoxGeometry(1,1,1),a=new Mesh(geometry,new MeshBasicMaterial()),b=a.clone(),c=a.clone();
  a.rotation.z=b.rotation.z=.4;c.position.z=4;root.add(a,b,c);
  expect(separateModelSurfaces(root)).toBe(6);expect(c.geometry).toBe(geometry);expect(b.geometry).not.toBe(geometry);
  expect(separateModelSurfaces(root)).toBe(0);disposeWorld(root);
});
it('prepares all shipped main/farm/NPC/interior/character GLBs once, retaining semantic parts and finite geometry',async()=>{
  const roots=['main','farm','npcs','interior','character'];let changed=0;
  for(const root of roots){const dir=new URL(`../../public/models/${root}/`,import.meta.url);let files:string[];try{files=await readdir(dir,{recursive:true});}catch{continue;}
    for(const file of files.filter(f=>f.endsWith('.glb'))){
      const bytes=await readFile(new URL(file,dir)),model=(await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'')).scene;
      const names:string[]=[];model.traverse(o=>names.push(o.name));changed+=separateModelSurfaces(model);
      const restored:string[]=[];model.traverse(o=>{restored.push(o.name);if(o instanceof Mesh)expect([...o.geometry.attributes.position.array].every(Number.isFinite),`${root}/${file}`).toBe(true);});expect(restored).toEqual(names);
      expect(separateModelSurfaces(model),`${root}/${file}: preparation must be idempotent`).toBe(0);disposeWorld(model);
    }
  }
  expect(changed).toBeGreaterThan(0);
},30000);
