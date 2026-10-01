import { Group } from 'three';
import { box } from '../../utils/voxel';
import type { InteractionTarget } from '../../systems/InteractionSystem';
import type { DynamicObstacle } from '../../world/Collision';
export const HOME_TRADE_POINT={x:.5,y:4.12,z:.72};
export const FARM_TRADE_POINT={x:-4,y:4.44,z:11.2};
export const merchantTarget=(farm:boolean):InteractionTarget=>({id:farm?'farm_merchant':'home_merchant',name:'商船交易',action:'TRADE',...(farm?FARM_TRADE_POINT:HOME_TRADE_POINT),range:farm?1:.45,prompt:'商船交易 · 出售产品 / 购买补给 / 扩容'});
/** A separate moored merchant, leaving the travel boat and its boarding point intact. */
export class MerchantShip extends Group {
  readonly collision:DynamicObstacle;
  constructor(farm:boolean){
    super();this.name='MerchantShip';const scale=farm?1.2:.45,x=farm?-6.25:-.38,z=farm?11.2:1.1,y=farm?3.36:3.45;this.position.set(x,y,z);this.scale.setScalar(scale);
    box(this,'#58412d',0,.13,0,.75,.26,1.7);box(this,'#987451',0,.28,0,.95,.10,1.95);box(this,'#d7bd8b',0,.34,0,.78,.06,1.75);
    for(const side of [-1,1])box(this,'#785b3b',side*.43,.43,0,.08,.2,1.85);
    box(this,'#8f6847',0,.90,.15,.08,1.2,.08);box(this,'#75866b',.22,1.30,.15,.36,.25,.025);box(this,'#efd18b',.22,1.30,.17,.10,.10,.03);
    for(const offset of [-.22,.22]){box(this,'#a0794d',offset,.51,-.50,.34,.32,.34);box(this,'#d0bb86',offset,.70,-.50,.34,.06,.34);}
    this.collision={x,z,previousX:x,previousZ:z,yaw:0,previousYaw:0,halfX:.48*scale,halfZ:.98*scale,minY:y,maxY:y+1.5*scale};
  }
}
