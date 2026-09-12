import { bottleRadiusAt,insideBottle } from '../../world/bottle/Bounds';
import { hitsWorldObstacle, resolveVerticalCollision, supportHeightAt } from '../../world/Collision';
import type { DynamicObstacle } from '../../world/Collision';
import { waveHeight } from '../../world/ocean/WaveMath';
import type { NavigationSurface } from '../NavigationSurface';
/** The stable Home collision rules, moved without changing thresholds or order. */
export function homeNavigation(dynamicObstacles:()=>readonly DynamicObstacle[]=()=>[]):NavigationSurface {
  return {
    groundHeight:supportHeightAt,hitsObstacle:hitsWorldObstacle,resolveVertical:resolveVerticalCollision,
    isInside:(x,y,z)=>insideBottle(x,y,z,.1),waterLevel:waveHeight,dynamicObstacles,
    constrain(p){
      p.x=Math.max(-5.55,Math.min(5.2,p.x));
      const radius=bottleRadiusAt(p.x)-.18;
      p.y=Math.max(3.72-radius+.1,Math.min(3.72+radius-.1,p.y));
      const zLimit=Math.sqrt(Math.max(.12,radius*radius-(p.y-3.72)**2))-.1;
      p.z=Math.max(-zLimit,Math.min(zLimit,p.z));
    },
  };
}
