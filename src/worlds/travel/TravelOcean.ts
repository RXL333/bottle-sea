import { Group, Mesh, MeshStandardMaterial, PlaneGeometry } from 'three';
import { waveHeight } from '../../world/ocean/WaveMath';
import type { Quality } from '../../core/Renderer';
/** Connected faceted water: no holes between tiles or bottle-shaped clipping. */
export class TravelOcean extends Group {
  private mesh:Mesh<PlaneGeometry,MeshStandardMaterial>|null=null;
  constructor(private halfSize=32){super();this.name='TravelOcean';this.applyQuality('MEDIUM');}
  applyQuality(quality:Quality){
    if(this.mesh){this.remove(this.mesh);this.mesh.geometry.dispose();this.mesh.material.dispose();}
    const step=quality==='LOW'?.65:quality==='HIGH'?.3:.45;
    const segments=Math.ceil(this.halfSize*2/step);
    const geometry=new PlaneGeometry(this.halfSize*2,this.halfSize*2,segments,segments);
    geometry.rotateX(-Math.PI/2);
    const positions=geometry.attributes.position;
    // Stretch the outermost ring to the horizon while retaining fine waves by the boat.
    for(let i=0;i<positions.count;i++){
      const x=positions.getX(i),z=positions.getZ(i);
      if(Math.abs(x)>this.halfSize-.001)positions.setX(i,Math.sign(x)*180);
      if(Math.abs(z)>this.halfSize-.001)positions.setZ(i,Math.sign(z)*180);
    }
    this.mesh=new Mesh(geometry,new MeshStandardMaterial({color:'#238b89',roughness:.88,flatShading:true}));
    this.mesh.frustumCulled=false;this.mesh.receiveShadow=true;this.add(this.mesh);this.update(0,0,.6);
  }
  update(time:number,storm:number,_dayTime:number){
    const positions=this.mesh!.geometry.attributes.position;
    for(let i=0;i<positions.count;i++)positions.setY(i,waveHeight(positions.getX(i),positions.getZ(i),time,storm));
    positions.needsUpdate=true;
  }
}
