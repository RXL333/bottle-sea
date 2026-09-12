import type { Vector3 } from 'three';
import type { DynamicObstacle } from '../world/Collision';
/** Terrain/collision queries supplied by the active world; no camera ownership. */
export interface NavigationSurface {
  groundHeight(x:number,z:number,currentFeet:number):number;
  hitsObstacle(x:number,z:number,eyeY:number):boolean;
  resolveVertical(x:number,z:number,from:number,to:number):number;
  isInside(x:number,y:number,z:number):boolean;
  constrain(position:Vector3):void;
  waterLevel(x:number,z:number,time:number,storm:number):number;
  dynamicObstacles():readonly DynamicObstacle[];
}
