export interface FarmGrid {
  readonly originX:number;readonly originZ:number;readonly cellSize:number;
  readonly columns:number;readonly rows:number;
}
export interface FarmFieldDefinition {readonly id:string;readonly name:string;readonly grid:FarmGrid}
export interface FarmPoint {readonly x:number;readonly z:number}
export interface FarmCellRef {readonly fieldId:string;readonly column:number;readonly row:number}
export type FarmArea =
  | {readonly kind:'bounds';readonly minX:number;readonly maxX:number;readonly minZ:number;readonly maxZ:number}
  | {readonly kind:'polygon';readonly points:readonly FarmPoint[]};

function field(id:string,name:string,x:number):FarmFieldDefinition {
  return Object.freeze({id,name,grid:Object.freeze({originX:x-6,originZ:-28,cellSize:1,columns:12,rows:18})});
}
/** Shared by gameplay and FarmMap; no model, renderer or world lifecycle dependency. */
export const FARM_FIELD_DEFINITIONS:readonly FarmFieldDefinition[]=Object.freeze([
  field('field-west','西侧农田',-22),field('field-central','中央农田',0),field('field-east','东侧农田',22),
]);
export function farmCellId(ref:FarmCellRef){return `${ref.fieldId}:${ref.column}:${ref.row}`;}
export function isFarmCell(field:FarmFieldDefinition,column:number,row:number){
  return Number.isInteger(column)&&Number.isInteger(row)&&column>=0&&row>=0&&column<field.grid.columns&&row<field.grid.rows;
}
export function fieldCellAt(field:FarmFieldDefinition,x:number,z:number):FarmCellRef|null {
  if(!Number.isFinite(x)||!Number.isFinite(z))return null;
  const g=field.grid,column=Math.floor((x-g.originX)/g.cellSize),row=Math.floor((z-g.originZ)/g.cellSize);
  return isFarmCell(field,column,row)?{fieldId:field.id,column,row}:null;
}
export function fieldCellCenter(field:FarmFieldDefinition,column:number,row:number):FarmPoint|null {
  if(!isFarmCell(field,column,row))return null;
  const g=field.grid;return {x:g.originX+(column+.5)*g.cellSize,z:g.originZ+(row+.5)*g.cellSize};
}
export function validFarmArea(area:FarmArea):boolean {
  if(area.kind==='bounds')return [area.minX,area.maxX,area.minZ,area.maxZ].every(Number.isFinite)&&area.minX<area.maxX&&area.minZ<area.maxZ;
  if(area.kind!=='polygon'||area.points.length<3||area.points.length>64||!area.points.every(p=>Number.isFinite(p.x)&&Number.isFinite(p.z)))return false;
  const points=area.points,origin=points[0];
  const twiceArea=points.reduce((sum,p,i)=>{const q=points[(i+1)%points.length];return sum+(p.x-origin.x)*(q.z-origin.z)-(q.x-origin.x)*(p.z-origin.z);},0);
  return Number.isFinite(twiceArea)&&Math.abs(twiceArea)>1e-9;
}
/** Cell centers define coverage. Bounds use inclusive minima and exclusive maxima. */
export function farmAreaContains(area:FarmArea,point:FarmPoint):boolean {
  if(area.kind==='bounds')return point.x>=area.minX&&point.x<area.maxX&&point.z>=area.minZ&&point.z<area.maxZ;
  let inside=false;
  const points=area.points;
  for(let i=0,j=points.length-1;i<points.length;j=i++){
    const a=points[j],b=points[i],cross=(point.x-a.x)*(b.z-a.z)-(point.z-a.z)*(b.x-a.x);
    if(Math.abs(cross)<1e-9&&point.x>=Math.min(a.x,b.x)&&point.x<=Math.max(a.x,b.x)&&point.z>=Math.min(a.z,b.z)&&point.z<=Math.max(a.z,b.z))return true;
    if((a.z>point.z)!==(b.z>point.z)&&point.x<(b.x-a.x)*(point.z-a.z)/(b.z-a.z)+a.x)inside=!inside;
  }
  return inside;
}
