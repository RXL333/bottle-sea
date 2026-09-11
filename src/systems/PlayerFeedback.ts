import { Vector3 } from 'three';
import { DOCK } from '../world/island/Dock';
import { islandHeight } from '../world/island/Island';
import { terrainCellAt } from '../world/island/TerrainData';
export type GroundSurface='wood'|'sand'|'grass';
export function groundSurface(x:number,z:number):GroundSurface{
  if(x>=DOCK.minX&&x<=DOCK.maxX&&z>=DOCK.minZ&&z<=DOCK.maxZ)return 'wood';
  return terrainCellAt(x,z)?.surface??(islandHeight(x,z)>3.6?'grass':'sand');
}
/** Visual offsets never feed back into terrain height or collision queries. */
export class PlayerFeedback {
  offsetY=0;fov=68;onStep=(surface:GroundSurface)=>{void surface;};
  private previous=new Vector3();private initialized=false;private phase=0;private stride=0;private impact=0;private wasGrounded=true;
  reset(){this.initialized=false;this.offsetY=0;this.fov=68;this.phase=0;this.stride=0;this.impact=0;this.wasGrounded=true;}
  splash(){this.impact=-.023;}
  update(delta:number,position:Vector3,grounded:boolean,swimming:boolean,sprint:boolean){
    if(!this.initialized){this.previous.copy(position);this.initialized=true;}
    const distance=Math.hypot(position.x-this.previous.x,position.z-this.previous.z),moving=distance>.0001;
    if(grounded&&!this.wasGrounded&&!swimming&&position.y<=this.previous.y)this.impact=-.018;
    const walking=grounded&&!swimming&&moving;
    if(walking){this.phase+=delta*(sprint?13:10);this.stride+=distance;if(this.stride>(sprint?.48:.4)){this.stride=0;this.onStep(groundSurface(position.x,position.z));}}
    else this.stride=0;
    this.impact*=Math.exp(-delta*13);
    const target=(walking?Math.sin(this.phase)*.009:0)+this.impact;
    this.offsetY+=(target-this.offsetY)*(1-Math.exp(-delta*16));
    this.fov+=((68+(moving&&sprint?4:0))-this.fov)*(1-Math.exp(-delta*6));
    this.previous.copy(position);this.wasGrounded=grounded;
  }
}
