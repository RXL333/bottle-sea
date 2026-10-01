import { readFile } from 'node:fs/promises';
import { expect,it } from 'vitest';
import { Group,Mesh,Vector3 } from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { GameClock } from '../../core/GameClock';
import { GameplayFoundation } from '../../gameplay/GameplayFoundation';
import { LIVESTOCK_PENS } from '../../gameplay/livestock/LivestockDefinition';
import { FarmWorld } from './FarmWorld';
import { FarmInteractions } from './FarmInteractions';
import { InteractionActions } from '../../systems/InteractionSystem';
import { farmHeight } from './FarmTerrain';
import { farmLand } from './FarmTopography';
import { hitsDynamicObstacle } from '../../world/Collision';
const loader=async(url:string)=>{const data=await readFile(new URL('../../../public'+url,import.meta.url));return (await new GLTFLoader().parseAsync(data.buffer.slice(data.byteOffset,data.byteOffset+data.byteLength),'')).scene;};
it('keeps original animal hierarchies, animates their states and owns current dynamic collision',async()=>{
  const world=new FarmWorld(loader);await world.load();const clock=new GameClock(),game=new GameplayFoundation(clock);world.enter({gameplay:game,gameTime:clock.simulationTime,state:{lastSimulatedGameTime:0,discoveries:[]},spawn:world.getSpawnPoint()});
  const actors=world.root.getObjectByName('BlenderFarmModels')!.children.filter(o=>/^(chicken|cow|sheep)-\d+$/.test(o.name));expect(actors).toHaveLength(8);
  const cow=game.livestock.getAnimal('cow-0')!;expect(hitsDynamicObstacle(cow.x,cow.z,4.44,world.navigation.dynamicObstacles())).toBe(true);
  let pivots=0;for(const actor of actors)actor.traverse(o=>{if(o.name.startsWith('AnimalPivot:'))pivots++;});expect(pivots).toBeGreaterThan(24);expect(pivots).toBeLessThan(80);
  for(const pen of LIVESTOCK_PENS){const f=pen.feeder,approachZ=f.z+(pen.id==='chicken'?.85:-.65);expect(world.navigation.hitsObstacle(f.x,approachZ,4.44)).toBe(false);expect(farmLand(f.x,f.z)).toBe(true);}
  game.inventory.add('crop.wheat',5);game.livestock.feed('cow');world.update({delta:.016,time:1,gameTime:clock.simulationTime,dayTime:.7,night:0,storm:0,flash:0});expect(world.root.getObjectByName('cow-0')!.userData.livestockState).toBe('EATING');
  game.time.advanceToNextDay(23);world.update({delta:.016,time:2,gameTime:clock.simulationTime,dayTime:.95,night:1,storm:0,flash:0});for(const actor of actors){expect(actor.userData.livestockState).toBe('SLEEPING');expect(actor.scale.y).toBeLessThan(actor.scale.x);}
  world.applyQuality('LOW');for(const actor of actors)actor.traverse(o=>{if(o instanceof Mesh)expect(o.castShadow).toBe(false);});expect(world.root.getObjectByName('LivestockPresentation')).toBeInstanceOf(Group);
  world.dispose();expect(world.root.children).toHaveLength(0);
});
it('uses the unified E range and live inventory rechecks for feeding and collecting',async()=>{
  const clock=new GameClock(),game=new GameplayFoundation(clock),interaction=new FarmInteractions();interaction.bind(game);game.inventory.add('crop.wheat',5);const f=LIVESTOCK_PENS[0].feeder,position=new Vector3(f.x,4.44,f.z+.85),context={position,gameplay:game,worldId:'FARM' as const},actions=new InteractionActions();
  expect(interaction.getPrompt(context,actions)?.text).toContain('补充小麦');expect((await interaction.interact(context,actions)).status).toBe('success');expect(game.inventory.count('crop.wheat')).toBe(0);expect(game.livestock.getPen('chicken')!.feed).toBe(2);
  expect((await interaction.interact({...context,worldId:'HOME'},actions)).status).toBe('unavailable');clock.advanceGameMinutes(1440);
  const a=game.livestock.getAnimal('chicken-0')!;position.set(a.x+.7,farmHeight(a.x,a.z)+.44,a.z);expect(interaction.getPrompt(context,actions)?.text).toContain('收蛋');expect((await interaction.interact(context,actions)).status).toBe('success');expect(game.inventory.count('livestock.egg')).toBe(1);
  expect((await interaction.interact(context,actions)).status).toBe('unavailable');position.set(0,4.44,0);expect((await interaction.interact(context,actions)).status).toBe('no-target');
});
it('recreates FarmWorld after Home sleep using the persistent fed cycles and original farm data',async()=>{
  const clock=new GameClock(),game=new GameplayFoundation(clock);clock.simulationTime=Math.floor(clock.simulationTime/480)*480+5*480/24;
  const originalFarm=game.farm.snapshot();game.inventory.add('crop.wheat',2);game.livestock.feed('cow');const first=new FarmWorld(loader);await first.load();first.enter({gameplay:game,gameTime:clock.simulationTime,state:{lastSimulatedGameTime:0,discoveries:[]},spawn:first.getSpawnPoint()});
  const state=first.leave({gameTime:clock.simulationTime});first.dispose();game.home.sleep();expect(clock.hour).toBe(6);
  const second=new FarmWorld(loader);await second.load();second.enter({gameplay:game,gameTime:clock.simulationTime,state,spawn:second.getSpawnPoint()});expect(game.livestock.getAnimals().filter(a=>a.kind==='cow').map(a=>a.pending)).toEqual([1,1]);expect(game.farm.snapshot()).toEqual(originalFarm);second.dispose();
});
