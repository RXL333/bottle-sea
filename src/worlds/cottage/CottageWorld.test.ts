import { readFile } from 'node:fs/promises';
import { expect,it } from 'vitest';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { Vector3 } from 'three';
import { CottageWorld } from './CottageWorld';
import type { InteriorLayout } from './CottageWorld';
it('loads actual modular room with full enclosure, clear entrance and furniture collisions',async()=>{
 const layout=JSON.parse(await readFile('public/models/interior/layout.json','utf8')) as InteriorLayout;
 const world=new CottageWorld(async url=>{const b=await readFile('public'+url);return (await new GLTFLoader().parseAsync(b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength),'' )).scene;},layout);
 await world.load();const p=world.getSpawnPoint().position;
 expect(world.navigation.isInside(...p)).toBe(true);expect(world.navigation.hitsObstacle(p[0],p[2],p[1])).toBe(false);
 expect(world.navigation.eyeHeight).toBe(1.55);expect(world.colliders.length).toBeGreaterThan(10);
 expect(world.navigation.hitsObstacle(4,0,1.555)).toBe(true);
 const box=world.colliders[0];expect(world.navigation.hitsObstacle((box.minX+box.maxX)/2,(box.minZ+box.maxZ)/2,1.555)).toBe(true);
 expect(world.root.children.length).toBeGreaterThan(250);
 world.interaction.update(new Vector3(...p));expect(world.interaction.nearest?.action).toBe('EXIT_COTTAGE');world.interaction.interact();expect(world.interaction.discovered.size).toBe(0);
 world.dispose();expect(world.root.children.length).toBe(0);
});
