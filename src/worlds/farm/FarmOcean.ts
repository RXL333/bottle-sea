import { Group, Mesh, MeshStandardMaterial, PlaneGeometry } from 'three';
import type { Quality } from '../../core/Renderer';
import { waveHeight } from '../../world/ocean/WaveMath';
import { FARM_LAND_BOUNDS } from './FarmMap';

/** Rectangular fine-water patch covers every farm shore, with a coarse horizon.
 * Uses world coordinates so rendered waves and the navigation water API agree. */
export class FarmOcean extends Group {
  private mesh:Mesh<PlaneGeometry,MeshStandardMaterial>|null=null;
  constructor(){super();this.name='FarmOcean';this.applyQuality('MEDIUM');}
  applyQuality(quality:Quality){
    if(this.mesh){this.remove(this.mesh);this.mesh.geometry.dispose();this.mesh.material.dispose();}
    const b=FARM_LAND_BOUNDS,minX=b.minX-8,maxX=b.maxX+8,minZ=b.minZ-8,maxZ=b.maxZ+16;
    const width=maxX-minX,depth=maxZ-minZ,step=quality==='LOW'?.95:quality==='HIGH'?.48:.7;
    const geometry=new PlaneGeometry(width,depth,Math.ceil(width/step),Math.ceil(depth/step));
    geometry.rotateX(-Math.PI/2);geometry.translate((minX+maxX)/2,0,(minZ+maxZ)/2);
    const positions=geometry.attributes.position;
    for(let i=0;i<positions.count;i++){
      const x=positions.getX(i),z=positions.getZ(i);
      if(x<minX+.001)positions.setX(i,-180);if(x>maxX-.001)positions.setX(i,180);
      if(z<minZ+.001)positions.setZ(i,-180);if(z>maxZ-.001)positions.setZ(i,180);
    }
    this.mesh=new Mesh(geometry,new MeshStandardMaterial({color:'#238b89',roughness:.88,flatShading:true}));
    this.mesh.frustumCulled=false;this.mesh.receiveShadow=true;this.add(this.mesh);this.update(0,0);
  }
  update(time:number,storm:number){
    const positions=this.mesh!.geometry.attributes.position;
    for(let i=0;i<positions.count;i++)positions.setY(i,waveHeight(positions.getX(i),positions.getZ(i),time,storm));
    positions.needsUpdate=true;
  }
}
