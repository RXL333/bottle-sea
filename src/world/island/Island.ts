import { Group } from 'three';
import { VoxelBatch } from '../../utils/voxel';
import { palmTree } from './PalmTree';
import { House } from './House';
import { Lighthouse } from './Lighthouse';
import { dock, DOCK } from './Dock';
import { TERRAIN_CELLS,terrainCellAt } from './TerrainData';

export function islandHeight(x:number,z:number) {
  return terrainCellAt(x,z)?.nominalHeight??0;
}
export function islandBottomHeight(x:number,z:number) {
  return terrainCellAt(x,z)?.solidMinY??0;
}
export function groundHeight(x:number,z:number) {
  if(x>=DOCK.minX&&x<=DOCK.maxX&&z>=DOCK.minZ&&z<=DOCK.maxZ)return DOCK.height;
  return terrainCellAt(x,z)?.top??1.65;
}
export class Island extends Group {
  readonly house=new House();readonly lighthouse=new Lighthouse();
  readonly crowns=[new Group(),new Group(),new Group()];
  constructor() {
    super();this.name='Island';const terrain=new VoxelBatch(),props=new VoxelBatch();
    for(const cell of TERRAIN_CELLS){for(const layer of cell.layers)terrain.add(layer.color,cell.x,layer.y,cell.z,.209,layer.height,.209);if(cell.grass)props.add(cell.grass.color,cell.x,cell.grass.y,cell.z,.07,.12,.065);}
    const terrainMesh=terrain.build(this);terrainMesh.name='IslandTerrain';terrainMesh.castShadow=false;
    palmTree(props,-2.25,3.83,-.22,1.15,.4,this.crowns[0]);palmTree(props,-1.93,3.83,-.64,1.62,1.3,this.crowns[1]);palmTree(props,-.5,3.83,-.78,1.35,0,this.crowns[2]);this.add(...this.crowns);
    dock(props);props.build(this);this.add(this.house,this.lighthouse);
  }
  update(time:number,storm:number){for(let i=0;i<this.crowns.length;i++){this.crowns[i].rotation.z=Math.sin(time*.75+i*2)*(.025+storm*.08);this.crowns[i].rotation.x=Math.sin(time*.57+i)*(.015+storm*.04);}}
}

