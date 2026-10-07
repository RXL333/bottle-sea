import { readFile } from 'node:fs/promises';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { expect,it,vi } from 'vitest';
import { Box3,BoxGeometry,Group,Mesh,MeshBasicMaterial } from 'three';
import { NpcPresentation } from './NpcPresentation';
import { NPCS } from '../../gameplay/npc/NpcRegistry';
import { InteractionActions,InteractionSystem } from '../../systems/InteractionSystem';
import { GameClock } from '../../core/GameClock';
import { GameplayFoundation } from '../../gameplay/GameplayFoundation';
import { HomeWorld } from '../home/HomeWorld';
import { FarmWorld } from '../farm/FarmWorld';
import { disposeWorld } from '../disposeWorld';
const loader=async()=>{const model=new Group(),mesh=new Mesh(new BoxGeometry(.3,1.6,.3),new MeshBasicMaterial());mesh.position.y=.8;model.add(mesh);return model;};
it('loads world-owned models with grounded authored axes, quality and only small body collisions',async()=>{
  for(const worldId of ['HOME','FARM'] as const){const presentation=new NpcPresentation(worldId,loader);await presentation.load();expect(presentation.children).toHaveLength(NPCS.list(worldId).length);for(const n of NPCS.list(worldId)){const model=presentation.getObjectByName(`NPC_${n.id}`)!;expect(new Box3().setFromObject(model).min.y).toBeCloseTo(n.position[1]);}
    presentation.applyQuality('LOW');presentation.traverse(o=>{if(o instanceof Mesh)expect(o.castShadow).toBe(false);});presentation.setMerchantAvailable(false);expect(presentation.activeCollisions).toHaveLength(worldId==='HOME'?2:1);disposeWorld(presentation);
  }
});
it('uses the shared interaction API and blocks a merchant while offshore',async()=>{
  const game=new GameplayFoundation(new GameClock()),presentation=new NpcPresentation('HOME',loader),actions=new InteractionActions().register('NPC_DIALOGUE',(_c,t)=>({status:game.dialogue.begin(t.id.slice(4),{season:'spring',seasonName:'春',weather:'CLEAR',coins:0,fishCount:0,matureCells:0,growingCells:0,pendingProducts:0,completed:[],met:false,plantableCrops:'小麦',fishNames:'沙丁鱼'})?'success':'unavailable'}));
  const interaction=new InteractionSystem(presentation.targets());for(const target of presentation.targets()){const context={worldId:'HOME' as const,gameplay:game,position:{x:target.x,y:target.y,z:target.z}};interaction.update(context.position);expect((await interaction.interact(context,actions)).status).toBe('success');game.dialogue.close();}
  presentation.setMerchantAvailable(false);const t=presentation.targets().find(t=>t.id==='npc:merchant_captain')!,context={worldId:'HOME' as const,gameplay:game,position:{x:t.x,y:t.y,z:t.z}};interaction.update(context.position);expect((await interaction.interact(context,actions)).status).toBe('unavailable');
});
it('registers all four real world interactions and leaves their approach positions walkable',async()=>{
  const clock=new GameClock(),gameplay=new GameplayFoundation(clock);for(const world of [new HomeWorld(loader),new FarmWorld(async path=>{const file=await readFile(new URL('../../../public/'+path.replace(/^\//,''),import.meta.url));return (await new GLTFLoader().parseAsync(file.buffer.slice(file.byteOffset,file.byteOffset+file.byteLength),'')).scene;})]){await world.load();world.enter({gameplay,gameTime:clock.simulationTime,state:{lastSimulatedGameTime:0,discoveries:[]},spawn:world.getSpawnPoint()});
    for(const n of NPCS.list(world.id)){const distance=world.id==='HOME'?.34:.65,x=n.position[0]+Math.sin(n.yaw)*distance,z=n.position[2]+Math.cos(n.yaw)*distance,y=n.position[1]+.44;expect(world.navigation!.hitsObstacle(x,z,y),n.id).toBe(false);world.interaction!.update({x,y,z});expect(world.interaction!.nearest?.id,n.id).toBe(`npc:${n.id}`);}
    world.dispose();
  }
});
it('disposes a model that finishes loading after its world was cancelled',async()=>{
  const model=await loader(),dispose=vi.spyOn((model.children[0] as Mesh).geometry,'dispose');let resolve!:(m:Group)=>void;const presentation=new NpcPresentation('FARM',()=>new Promise<Group>(r=>{resolve=r;})),pending=presentation.load();presentation.cancel();resolve(model);await pending;expect(presentation.children).toHaveLength(0);expect(dispose).toHaveBeenCalledOnce();
});
