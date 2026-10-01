import { CanvasTexture, DoubleSide, Group, Mesh, MeshStandardMaterial, NearestFilter, PlaneGeometry, SRGBColorSpace } from 'three';
import { VoxelBatch } from '../../utils/voxel';
import { FARM_SIGNS,FARM_GRAIN_UNLOAD } from './FarmMap';
import { farmGroundHeight } from './FarmTopography';

/** Physical map signs, not an extra HUD or an agricultural gameplay panel. */
export class FarmWayfinding extends Group {
  constructor(){
    super();this.name='FarmWayfinding';const b=new VoxelBatch();
    const pad=FARM_GRAIN_UNLOAD;
    for(const side of [-1,1]){
      for(let x=pad.x-pad.width/2+.3;x<pad.x+pad.width/2;x+=.8){const z=pad.z+side*pad.depth/2;b.add('#e1c883',x,farmGroundHeight(x,z)+.014,z,.5,.016,.07);}
      for(let z=pad.z-pad.depth/2+.3;z<pad.z+pad.depth/2;z+=.8){const x=pad.x+side*pad.width/2;b.add('#e1c883',x,farmGroundHeight(x,z)+.014,z,.07,.016,.5);}
    }
    for(const sign of FARM_SIGNS){
      const y=farmGroundHeight(sign.x,sign.z);
      b.add('#665037',sign.x,y+.425,sign.z,.12,.85,.12);
      b.add('#665037',sign.x,y+.945,sign.z,2.4,.65,.12,sign.yaw);
      if(typeof document==='undefined')continue;
      const canvas=document.createElement('canvas');canvas.width=512;canvas.height=144;
      const context=canvas.getContext('2d');if(!context)continue;
      context.fillStyle='#eddfb8';context.fillRect(0,0,512,144);
      context.strokeStyle='#9a835b';context.lineWidth=5;context.strokeRect(7,7,498,130);
      context.fillStyle='#394538';context.textAlign='center';context.textBaseline='middle';
      context.font='bold 43px "Microsoft YaHei", sans-serif';context.fillText(sign.title,256,51);
      context.font='25px "Microsoft YaHei", sans-serif';context.fillText(sign.detail,256,104);
      const map=new CanvasTexture(canvas);map.colorSpace=SRGBColorSpace;map.magFilter=NearestFilter;
      const plate=new Mesh(new PlaneGeometry(2.32,.60),new MeshStandardMaterial({map,roughness:1,side:DoubleSide}));
      plate.name=sign.id;plate.position.set(sign.x+Math.sin(sign.yaw)*.065,y+.945,sign.z+Math.cos(sign.yaw)*.065);plate.rotation.y=sign.yaw;
      this.add(plate);
    }
    b.build(this);
  }
}
