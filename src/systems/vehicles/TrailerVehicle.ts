import { BoxGeometry,Group,Mesh,MeshStandardMaterial,Vector3 } from 'three';
import { ImplementVehicle } from './ImplementVehicle';
import { Inventory } from '../../gameplay/Inventory';
import { ITEMS } from '../../gameplay/ItemRegistry';
import { TRAILER_CARGO_CAPACITY,TRAILER_CARGO_SLOTS,normalizeTrailerCargo } from '../../gameplay/vehicles/TrailerCargo';
import type { GameplayServices } from '../../gameplay/GameplayFoundation';

/** Cargo remains in the shared slot inventory; visible blocks are disposable. */
export class TrailerVehicle extends ImplementVehicle {
  cargo=new Inventory(ITEMS,TRAILER_CARGO_SLOTS,undefined,undefined,{quantityCapacity:TRAILER_CARGO_CAPACITY});
  private load=new Group();private blocks:Mesh<BoxGeometry,MeshStandardMaterial>[]=[];private stamp=-1;
  private speedSource=()=>0;
  constructor(...args:ConstructorParameters<typeof ImplementVehicle>){
    super(...args);this.load.name='TrailerCargoLoad';this.root.add(this.load);
    for(const x of [-.36,.36])for(const z of [-.59,.59]){const block=new Mesh(new BoxGeometry(.70,1,1.16),new MeshStandardMaterial({color:'#d9b95b',roughness:1}));block.position.set(x,.73,z);block.castShadow=true;block.receiveShadow=true;this.blocks.push(block);this.load.add(block);}
    this.updateVisual(0);
  }
  bindCargo(game:GameplayServices,record:()=>void,speed:()=>number){
    const saved=game.vehicles.snapshot().implements.find(i=>i.id===this.id)?.cargo;
    this.cargo=new Inventory(game.items,TRAILER_CARGO_SLOTS,normalizeTrailerCargo(saved,game.items),()=>game.requestSave(true),{quantityCapacity:TRAILER_CARGO_CAPACITY,beforeNotify:record});this.speedSource=speed;this.stamp=-1;this.updateVisual(0);
  }
  get speed(){return this.speedSource();}
  loadingPoint(){this.root.updateMatrixWorld(true);return this.root.localToWorld(new Vector3(0,1.3,0));}
  get cargoHint(){const counts=new Map<string,number>();for(const stack of this.cargo.snapshot().slots)if(stack)counts.set(stack.itemId,(counts.get(stack.itemId)??0)+stack.quantity);const contents=[...counts].map(([id,quantity])=>`${this.cargo.items.get(id)?.name} × ${quantity}`).join('、');return `拖车 ${this.cargo.usedQuantity} / ${TRAILER_CARGO_CAPACITY} 份 · ${contents||'空车'}`;}
  override snapshot(){return {...super.snapshot(),cargo:this.cargo.snapshot()};}
  override updateVisual(delta:number){
    super.updateVisual(delta);if(this.stamp===this.cargo.revision)return;this.stamp=this.cargo.revision;this.load.visible=this.cargo.usedQuantity>0;
    const height=.08+.70*this.cargo.usedQuantity/TRAILER_CARGO_CAPACITY,contents=this.cargo.snapshot().slots.filter(s=>!!s);
    const colors={crop:'#d9b95b',seed:'#b5cb73',material:'#b79064',food:'#d78964',fish:'#709faa',tool:'#879392',special:'#a195b7'};
    for(let i=0;i<this.blocks.length;i++){const block=this.blocks[i],stack=contents[i%Math.max(1,contents.length)],category=stack?this.cargo.items.get(stack.itemId)?.category:undefined;block.scale.y=height;block.position.y=.73+height/2;block.material.color.set(category?colors[category]:'#d9b95b');}
  }
}
