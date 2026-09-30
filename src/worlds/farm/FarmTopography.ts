import { FARM_GROUND,FARM_LAND_BOUNDS } from './FarmMap';

// The same 1-unit cells drive voxel tops, model foundations and navigation.
function cellLand(x:number,z:number){
  const b=FARM_LAND_BOUNDS,radius=5,centerZ=(b.minZ+b.maxZ)/2;
  const dx=Math.max(0,Math.abs(x)-(b.maxX-radius)),dz=Math.max(0,Math.abs(z-centerZ)-((b.maxZ-b.minZ)/2-radius));
  return x>=b.minX&&x<=b.maxX&&z>=b.minZ&&z<=b.maxZ&&dx*dx+dz*dz<=radius*radius;
}
export function farmLand(x:number,z:number){return cellLand(Math.floor(x)+.5,Math.floor(z)+.5);}
export function farmGroundHeight(x:number,z:number){
  const cx=Math.floor(x)+.5,cz=Math.floor(z)+.5;
  if(!cellLand(cx,cz))return .5;
  // Entire productive plateau is level. Hills are confined to the outer rim.
  const rim=Math.max(0,Math.abs(cx)-30,(-cz-60)*.8),variation=.85+.15*Math.sin(cx*.35+cz*.23);
  return FARM_GROUND+Math.round(Math.min(1.2,rim*.16*variation)/.1)*.1;
}
