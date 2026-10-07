import { Group,Mesh,Sprite,SpriteMaterial,CanvasTexture,Box3 } from 'three';
import type { Quality } from '../../core/Renderer';
import type { WorldId } from '../types';
import type { DynamicObstacle } from '../../world/Collision';
import type { InteractionTarget } from '../../systems/InteractionSystem';
import { NPCS } from '../../gameplay/npc/NpcRegistry';
import { loadModel } from '../farm/FarmAssets';
import type { ModelLoader } from '../farm/FarmAssets';
import { disposeWorld } from '../disposeWorld';
/** Disposable world-owned models. Semantic nodes and authored materials remain intact. */
export class NpcPresentation extends Group {
  private cancelled=false;private models=new Map<string,Group>();private labels:Sprite[]=[];private merchantAvailable=true;
  readonly collisions:DynamicObstacle[]=[];
  constructor(readonly worldId:WorldId,private loader:ModelLoader=loadModel){super();this.name='IslandNPCs';}
  targets():InteractionTarget[]{return NPCS.list(this.worldId).map(n=>({id:`npc:${n.id}`,name:n.name,action:'NPC_DIALOGUE',x:n.position[0],y:n.position[1]+.44,z:n.position[2],range:n.range,prompt:`与${n.name}交谈`,unavailable:()=>n.id==='merchant_captain'&&!this.merchantAvailable?'商船远航中 · 每日 08:00–20:00 靠岸':undefined}));}
  async load(){
    const results=await Promise.allSettled(NPCS.list(this.worldId).map(async d=>({d,model:await this.loader(import.meta.env.BASE_URL+d.model)})));
    for(const r of results)if(r.status==='fulfilled'){
      const {d,model}=r.value;if(this.cancelled){disposeWorld(model);continue;}
      model.name=`NPC_${d.id}`;model.position.fromArray(d.position);model.rotation.y=d.yaw;model.scale.setScalar(d.scale);model.traverse(o=>{if(o instanceof Mesh){o.castShadow=true;o.receiveShadow=true;}});this.add(model);this.models.set(d.id,model);
      const bounds=new Box3().setFromObject(model),radius=.16*d.scale;
      this.collisions.push({x:d.position[0],z:d.position[2],previousX:d.position[0],previousZ:d.position[2],yaw:0,previousYaw:0,halfX:radius,halfZ:radius,minY:d.position[1],maxY:bounds.isEmpty()?d.position[1]+1.6*d.scale:bounds.max.y});
      if(typeof document!=='undefined'){
        const canvas=document.createElement('canvas');canvas.width=512;canvas.height=96;const ctx=canvas.getContext('2d');if(ctx){ctx.fillStyle='#183b52e6';ctx.fillRect(0,0,512,96);ctx.strokeStyle='#f4c15d';ctx.lineWidth=5;ctx.strokeRect(3,3,506,90);ctx.fillStyle='#fff3d6';ctx.font='bold 42px Microsoft YaHei';ctx.textAlign='center';ctx.fillText(d.name,256,62);const label=new Sprite(new SpriteMaterial({map:new CanvasTexture(canvas),depthWrite:false,toneMapped:false}));label.name=`NPCLabel_${d.id}`;label.position.set(0,(bounds.max.y-d.position[1])/d.scale+.23,0);label.scale.set(.85,.18,1);model.add(label);this.labels.push(label);}
      }
    }
    const failure=results.find(r=>r.status==='rejected');if(failure)throw Error('NPC models could not be loaded',{cause:failure.status==='rejected'?failure.reason:undefined});
  }
  setMerchantAvailable(available:boolean){this.merchantAvailable=available;const model=this.models.get('merchant_captain');if(model)model.visible=available;}
  setDialogueSpeaker(id?:string){for(const label of this.labels)label.visible=label.name!==`NPCLabel_${id}`;}
  get activeCollisions(){return this.collisions.filter((_c,i)=>NPCS.list(this.worldId)[i]?.id!=='merchant_captain'||this.merchantAvailable);}
  applyQuality(quality:Quality){for(const model of this.models.values())model.traverse(o=>{if(o instanceof Mesh)o.castShadow=quality!=='LOW';});}
  cancel(){this.cancelled=true;}
}
