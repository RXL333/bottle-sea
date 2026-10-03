import { readFile,stat } from 'node:fs/promises';
import { expect,it } from 'vitest';
import { Box3,Mesh,Vector3 } from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { FARM_TREES,FARM_TREE_PLACEMENTS } from './FarmTrees';
import { FARM_PLACEMENTS,placedBox } from './FarmLayout';
import { FARM_FIELDS,FARM_ROADS,FARM_TURNING_AREAS,containsRect } from './FarmMap';
import { farmLand } from './FarmTopography';
import { FarmWorld } from './FarmWorld';
import { disposeWorld } from '../disposeWorld';

it('exports eight finite game-ready trees with true ground pivots, semantic foliage and bounded geometry',async()=>{
  expect(Object.keys(FARM_TREES)).toHaveLength(8);
  let bytes=0;
  for(const [id,tree] of Object.entries(FARM_TREES)){
    const file=await readFile(new URL('../../../public/models/farm/'+tree.file,import.meta.url));bytes+=file.byteLength;
    const data=JSON.parse(file.subarray(20,20+file.readUInt32LE(12)).toString());
    expect(data.images??[]).toHaveLength(0);expect(data.cameras??[]).toHaveLength(0);expect(data.buffers.every((b:{uri?:string})=>!b.uri)).toBe(true);
    const gltf=await new GLTFLoader().parseAsync(file.buffer.slice(file.byteOffset,file.byteOffset+file.byteLength),'');
    const bounds=new Box3().setFromObject(gltf.scene),size=bounds.getSize(new Vector3());expect(bounds.min.y).toBeCloseTo(0,5);expect(size.y).toBeGreaterThan(1.8);expect(size.y).toBeLessThan(4.5);
    let triangles=0,canopy=false;
    gltf.scene.traverse(o=>{if(o.userData.part_id==='canopy')canopy=true;if(o instanceof Mesh){const positions=o.geometry.attributes.position;expect([...positions.array].every(Number.isFinite)).toBe(true);triangles+=(o.geometry.index?.count??positions.count)/3;}});
    expect(canopy,id).toBe(true);expect(triangles,id).toBe(tree.triangles);expect(triangles).toBeLessThan(6000);
    expect((await stat(new URL('../../../assets/blender/farm/trees/'+id+'.blend',import.meta.url))).size).toBeGreaterThan(10000);
    disposeWorld(gltf.scene);
  }
  expect(bytes).toBeLessThan(1_650_000);
});

it('places every species on land while keeping work parcels, roads and turning areas clear',()=>{
  expect(new Set(FARM_TREE_PLACEMENTS.map(p=>p.asset)).size).toBe(8);
  const world=new FarmWorld();
  for(const p of FARM_TREE_PLACEMENTS){
    expect(farmLand(p.x,p.z),p.id).toBe(true);
    for(const area of [...FARM_FIELDS,...FARM_ROADS,...FARM_TURNING_AREAS])expect(containsRect(area,p.x,p.z,.6),`${p.id}: lane/work clearance`).toBe(false);
    const actual=FARM_PLACEMENTS.find(t=>t.id===p.id)!;
    expect(world.navigation.hitsObstacle(p.x,p.z,actual.y!+.44),`${p.id}: solid trunk`).toBe(true);
    const r=FARM_TREES[p.asset].trunkRadius,box=placedBox(actual,[-r,0,-r],[r,4,r]);
    expect(box.maxX-box.minX).toBeLessThan(.65);expect(box.maxZ-box.minZ).toBeLessThan(.65);
  }
  for(let z=14.5;z>=-4;z-=.25)expect(world.navigation.hitsObstacle(-4,z,4.44)).toBe(false);
  world.dispose();
});
