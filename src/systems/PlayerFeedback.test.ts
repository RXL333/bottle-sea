import { expect,it } from 'vitest';
import { Vector3 } from 'three';
import { groundSurface,PlayerFeedback } from './PlayerFeedback';
import { TERRAIN_CELLS } from '../world/island/TerrainData';
it('distinguishes wood, grass and sand',()=>{const sand=TERRAIN_CELLS.find(cell=>cell.surface==='sand')!;expect(groundSurface(.65,1.4)).toBe('wood');expect(groundSurface(-.8,0)).toBe('grass');expect(groundSurface(sand.x,sand.z)).toBe('sand');});
it('keeps bob small, interpolates sprint FOV, and settles after stopping',()=>{
  const feedback=new PlayerFeedback(),position=new Vector3(.65,4.12,1.4);let steps=0;feedback.onStep=()=>steps++;
  for(let i=0;i<120;i++){position.x+=.015;feedback.update(1/60,position,true,false,true);expect(Math.abs(feedback.offsetY)).toBeLessThan(.02);}expect(steps).toBeGreaterThan(0);expect(feedback.fov).toBeGreaterThan(71);expect(position.y).toBe(4.12);
  for(let i=0;i<120;i++)feedback.update(1/60,position,true,false,false);expect(Math.abs(feedback.offsetY)).toBeLessThan(.001);expect(feedback.fov).toBeCloseTo(68,2);
});
