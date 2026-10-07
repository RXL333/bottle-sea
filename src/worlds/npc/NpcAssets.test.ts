import { readFile,stat } from 'node:fs/promises';
import { expect,it } from 'vitest';
import { Box3,Mesh } from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { NPCS } from '../../gameplay/npc/NpcRegistry';
import { HomeWorld } from '../home/HomeWorld';
import { disposeWorld } from '../disposeWorld';
const loader=async(path:string)=>{const file=await readFile(new URL('../../../public/'+path.replace(/^\//,''),import.meta.url));return (await new GLTFLoader().parseAsync(file.buffer.slice(file.byteOffset,file.byteOffset+file.byteLength),'')).scene;};
it('retains all authored semantic parts, ground pivots and embedded palettes',async()=>{
  for(const n of NPCS.list()){const root=await loader(n.model),bounds=new Box3().setFromObject(root);expect(bounds.min.y,n.id).toBeCloseTo(0,5);for(const part of ['Hips','Spine','Head','Hat','Hand_L','Hand_R','Foot_L','Foot_R']){let found=false;root.traverse(o=>{if(o.userData.part_id===part)found=true;});expect(found,`${n.id}:${part}`).toBe(true);}let triangles=0;root.traverse(o=>{if(o instanceof Mesh)triangles+=(o.geometry.index?.count??o.geometry.attributes.position.count)/3;});expect(triangles).toBeLessThan(6500);expect((await stat(new URL('../../../public/'+n.portrait,import.meta.url))).size).toBeGreaterThan(1000);disposeWorld(root);}
});
it('keeps home NPC feet on actual terrain and their talking approaches outside authored obstacles',async()=>{
  const world=new HomeWorld(loader);await world.load();for(const n of NPCS.list('HOME')){const distance=.34,x=n.position[0]+Math.sin(n.yaw)*distance,z=n.position[2]+Math.cos(n.yaw)*distance;
    expect(world.navigation.groundHeight(n.position[0],n.position[2],n.position[1]+.1),n.id).toBeCloseTo(n.position[1]);
    expect(world.navigation.hitsObstacle(x,z,n.position[1]+.44),n.id).toBe(false);
    expect(world.navigation.groundHeight(x,z,n.position[1]+.1),n.id).toBeCloseTo(n.position[1]);
  }world.dispose();
});
