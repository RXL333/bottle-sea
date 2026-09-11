import { Group,Vector3 } from 'three';
import { Island } from './island/Island';
import { Ocean } from './ocean/Ocean';
import { Ship } from './ship/Ship';
import { UnderwaterWorld } from './underwater/UnderwaterWorld';
import { FishSystem } from '../systems/FishSystem';
import { BubbleSystem } from '../systems/BubbleSystem';
import { Details } from './Details';
import { ShipWake } from './ocean/ShipWake';
export class World extends Group {
  readonly island=new Island();readonly ocean=new Ocean();
  readonly ship=new Ship();
  readonly fish=new FishSystem(44);readonly bubbles=new BubbleSystem();
  readonly details=new Details();
  readonly wake=new ShipWake();
  constructor(){super();this.name='World';this.add(this.island,this.ocean,this.ship,new UnderwaterWorld(),this.fish,this.bubbles,this.details,this.wake);}
  prepareShip(time:number,storm:number){this.ship.update(time,storm);}
  update(time:number,storm:number,dayTime=.58,player?:Vector3){this.ocean.update(time,storm,dayTime);this.wake.update(time,storm,this.ship.position.x,this.ship.position.z,this.ship.rotation.y);this.fish.update(time,player);this.bubbles.update(time);this.details.update(time,storm);this.island.update(time,storm);}
}
