import { Group } from 'three';
import { seededRandom,VoxelBatch } from '../../utils/voxel';
import { FARM_SURFACES } from './FarmLayout';
import { FARM_FIELDS,FARM_GROUND,FARM_LAND_BOUNDS,FARM_ROADS,FARM_TURNING_AREAS,FARM_ZONES,containsRect,farmZone,rectBounds } from './FarmMap';
import type { FarmRect } from './FarmMap';
import { farmGroundHeight,farmLand } from './FarmTopography';
export { FARM_FIELDS,FARM_DOCK } from './FarmMap';
export { farmLand } from './FarmTopography';

const fieldTop=FARM_GROUND+.032,roadTop=FARM_GROUND+.024,headlandTop=FARM_GROUND+.012;
export function farmHeight(x:number,z:number){
  let top=farmGroundHeight(x,z);
  if(FARM_FIELDS.some(f=>containsRect(f,x,z)))top=Math.max(top,fieldTop);
  if(FARM_FIELDS.some(f=>containsRect(f.headlands.north,x,z)||containsRect(f.headlands.south,x,z)))top=Math.max(top,headlandTop);
  if(FARM_ROADS.some(r=>containsRect(r,x,z))||containsRect(farmZone('center'),x,z)||containsRect(farmZone('machinery-yard'),x,z))top=Math.max(top,roadTop);
  for(const s of FARM_SURFACES)if(x>=s.minX&&x<=s.maxX&&z>=s.minZ&&z<=s.maxZ)top=Math.max(top,s.top);
  return top;
}
function paint(b:VoxelBatch,color:string,rect:FarmRect,top:number){b.add(color,rect.x,(FARM_GROUND+top)/2,rect.z,rect.width,top-FARM_GROUND,rect.depth);}
interface GroundPaint {color:string;rect:FarmRect;top:number}
/** One top face per region, even where a road overlaps the plaza or headland. */
export function farmGroundPatches(){
  const paints:GroundPaint[]=[];
  for(const f of FARM_FIELDS){for(const rect of [f.headlands.north,f.headlands.south])paints.push({color:'#8d8e56',rect,top:headlandTop});paints.push({color:'#76583e',rect:f,top:fieldTop});}
  paints.push({color:'#ad9874',rect:farmZone('center'),top:roadTop},{color:'#a1957e',rect:farmZone('machinery-yard'),top:roadTop},...FARM_ROADS.map(rect=>({color:'#b5a075',rect,top:roadTop})));
  const xs=[...new Set(paints.flatMap(p=>[rectBounds(p.rect).minX,rectBounds(p.rect).maxX]))].sort((a,b)=>a-b),zs=[...new Set(paints.flatMap(p=>[rectBounds(p.rect).minZ,rectBounds(p.rect).maxZ]))].sort((a,b)=>a-b),patches:GroundPaint[]=[];
  for(let i=1;i<xs.length;i++)for(let j=1;j<zs.length;j++){
    const x=(xs[i-1]+xs[i])/2,z=(zs[j-1]+zs[j])/2;let selected:GroundPaint|undefined;
    for(const p of paints)if(containsRect(p.rect,x,z)&&(!selected||p.top>=selected.top))selected=p;
    if(selected)patches.push({color:selected.color,top:selected.top,rect:{x,z,width:xs[i]-xs[i-1],depth:zs[j]-zs[j-1]}});
  }return patches;
}
function outline(b:VoxelBatch,rect:FarmRect,color:string,top:number,width=.12){
  const bounds=rectBounds(rect);
  b.add(color,rect.x,top-.008,bounds.minZ,rect.width,.016,width);b.add(color,rect.x,top-.008,bounds.maxZ,rect.width,.016,width);
  b.add(color,bounds.minX,top-.008,rect.z,width,.016,rect.depth);b.add(color,bounds.maxX,top-.008,rect.z,width,.016,rect.depth);
}
export class FarmTerrain extends Group {
  constructor(){
    super();this.name='FarmTerrain';const b=new VoxelBatch(),random=seededRandom(813),bounds=FARM_LAND_BOUNDS;
    for(let x=bounds.minX+.5;x<bounds.maxX;x++)for(let z=bounds.minZ+.5;z<bounds.maxZ;z++)if(farmLand(x,z)){
      const top=farmGroundHeight(x,z);
      b.add(random()>.5?'#778477':'#899083',x,(1.1+top-.3)/2,z,1,top-1.4,1);
      b.add('#a69a73',x,top-.25,z,1,.14,1);
      b.add(random()>.5?'#668b42':'#719545',x,top-.09,z,1,.18,1);
    }
    // Unplanted parcels and obstacle-free headlands are the productive footprint.
    for(const p of farmGroundPatches())paint(b,p.color,p.rect,p.top);
    for(const f of FARM_FIELDS){
      outline(b,f,'#bea57a',fieldTop+.008,.14);
      // Shallow survey marks at grid intervals, without fencing off machinery access.
      for(let i=1;i<f.grid.columns;i++)for(const z of [f.z-f.depth/2,f.z+f.depth/2])b.add('#cbb48b',f.grid.originX+i*f.grid.cellSize,fieldTop+.002,z,.055,.008,.22);
    }
    for(const area of FARM_TURNING_AREAS){
      // Four small ground-painted corners identify the clear turning envelope.
      for(const x of [area.x-area.width/2,area.x+area.width/2])for(const z of [area.z-area.depth/2,area.z+area.depth/2]){
        b.add('#c8b88c',x,roadTop+.002,z,.32,.008,.055);b.add('#c8b88c',x,roadTop+.002,z,.055,.008,.32);
      }
    }
    for(const zone of FARM_ZONES.filter(z=>z.reserved)){
      // Reservations remain grass. No field data or agricultural simulation is created.
      outline(b,zone,zone.kind==='expansion'?'#9ca86a':'#879754',FARM_GROUND+.012,.1);
    }
    // Parking stripes sit outside all work parcels, headlands and travel lanes.
    for(const x of [-22,-19,-16,-13])b.add('#c9baa0',x,roadTop+.002,2.2,.055,.008,3);
    // Low-density wild grasses and stones only around the perimeter.
    for(let i=0;i<240;i++){
      const x=bounds.minX+random()*(bounds.maxX-bounds.minX),z=bounds.minZ+random()*(bounds.maxZ-bounds.minZ);
      if(!farmLand(x,z)||(Math.abs(x)<31&&z>-61)||FARM_ROADS.some(r=>containsRect(r,x,z,1)))continue;
      const y=farmGroundHeight(x,z),size=.06+random()*.12;
      if(i%5===0)b.add('#8e9485',x,y+.04,z,size*1.6,.08,size*1.2);
      else {b.add('#52783a',x,y+.08,z,.04,.16,.04);b.add('#7fa34d',x+.055,y+.055,z+.035,.035,.11,.035);}
    }
    const ground=b.build(this);ground.castShadow=false;this.userData.fields=FARM_FIELDS.map(f=>f.id);this.userData.layoutVersion=1;
  }
}
