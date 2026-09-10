import { Group } from 'three';
import { VoxelBatch, seededRandom } from '../../utils/voxel';
import { palmTree } from './PalmTree';
import { House } from './House';
import { Lighthouse } from './Lighthouse';
import { dock, DOCK } from './Dock';

export function islandHeight(x:number,z:number) {
  const d=((x+.85)/1.9)**2+((z+.12)/1.04)**2;
  if(d<.58)return 3.83;
  if(d<.87)return 3.65;
  if(d<1.08)return 3.46;
  return 0;
}
export function groundHeight(x:number,z:number) {
  if(x>=DOCK.minX&&x<=DOCK.maxX&&z>=DOCK.minZ&&z<=DOCK.maxZ)return DOCK.height;
  return islandHeight(x,z)||1.65;
}
export class Island extends Group {
  readonly house=new House();readonly lighthouse=new Lighthouse();
  constructor() {
    super();this.name='Island';const terrain=new VoxelBatch(),props=new VoxelBatch();const random=seededRandom(127);
    for(let x=-2.85;x<1.18;x+=.21)for(let z=-1.28;z<1.1;z+=.21) {
      const h=islandHeight(x,z);if(!h)continue;
      const d=((x+.85)/1.9)**2+((z+.12)/1.04)**2; const bottom=2.5+Math.min(1,d)*.78+random()*.06;
      const sandBottom=h-.3;
      const rockColor=random()>.5?'#506f5e':'#587964';
      if(sandBottom>bottom)terrain.add(rockColor,x,(bottom+sandBottom)/2,z,.209,sandBottom-bottom,.209);
      terrain.add(['#d8c58a','#c6b783','#e1ce95'][Math.floor(random()*3)],x,h-.16,z,.209,.28,.209);
      if(h>3.6)terrain.add(['#4c8b35','#3a742f','#608e3d'][Math.floor(random()*3)],x,h+.035,z,.209,.11,.209);
      if(h>3.8&&random()<.15)props.add('#6e9c43',x,h+.15,z,.07,.12,.065);
    }
    const terrainMesh=terrain.build(this);terrainMesh.name='IslandTerrain';terrainMesh.castShadow=false;
    palmTree(props,-2.25,3.83,-.22,1.15,.4);palmTree(props,-1.93,3.83,-.64,1.62,1.3);palmTree(props,-.5,3.83,-.78,1.35);
    dock(props);props.build(this);this.add(this.house,this.lighthouse);
  }
}

