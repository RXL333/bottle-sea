import { Euler,Matrix4,Quaternion,Vector3 } from 'three';
import { expect,it } from 'vitest';
import { FishSystem } from './FishSystem';
import { terrainCellsNear } from '../world/island/TerrainData';

it('keeps every fish body out of solid island cells and turns continuously',()=>{const fish=new FishSystem(32),mesh=fish.children[0] as import('three').InstancedMesh,matrix=new Matrix4(),position=new Vector3(),scale=new Vector3(),rotation=new Quaternion(),euler=new Euler(0,0,0,'YXZ'),previousYaw=new Array(32).fill(0);for(let time=0;time<120;time+=.05){fish.update(time);for(let i=0;i<32;i++){mesh.getMatrixAt(i*4,matrix);matrix.decompose(position,rotation,scale);for(const cell of terrainCellsNear(position.x,position.z,.16))expect(position.y+.1>cell.solidMinY&&position.y-.1<cell.solidMaxY&&position.x>cell.minX-.16&&position.x<cell.maxX+.16&&position.z>cell.minZ-.16&&position.z<cell.maxZ+.16).toBe(false);const yaw=euler.setFromQuaternion(rotation).y,change=Math.abs(Math.atan2(Math.sin(yaw-previousYaw[i]),Math.cos(yaw-previousYaw[i])));if(time>0)expect(change).toBeLessThan(.23);previousYaw[i]=yaw;}}});
