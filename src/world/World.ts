import { Group } from 'three';
import { Island } from './island/Island';
import { Ocean } from './ocean/Ocean';
import { Ship } from './ship/Ship';
import { UnderwaterWorld } from './underwater/UnderwaterWorld';
import { FishSystem } from '../systems/FishSystem';
import { BubbleSystem } from '../systems/BubbleSystem';
import { Details } from './Details';
export class World extends Group {
  readonly island=new Island();readonly ocean=new Ocean();
  readonly ship=new Ship();
  readonly fish=new FishSystem(44);readonly bubbles=new BubbleSystem();
  readonly details=new Details();
  constructor(){super();this.name='World';this.add(this.island,this.ocean,this.ship,new UnderwaterWorld(),this.fish,this.bubbles,this.details);}
  update(time:number,storm:number){this.ocean.update(time,storm);this.ship.update(time,storm);this.fish.update(time);this.bubbles.update(time);this.details.update(time,storm);}
}
