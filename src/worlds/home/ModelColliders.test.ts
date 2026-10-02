import { expect,it } from 'vitest';
import { BoxGeometry,Group,Mesh,MeshBasicMaterial,Vector3 } from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { modelColliders } from './ModelColliders';
import { hitsWorldObstacle } from '../../world/Collision';
it('leaves gaps between disconnected blocks in a shared palette mesh',()=>{
  const a=new BoxGeometry(1,1,1).translate(-2,0,0),b=new BoxGeometry(1,1,1).translate(2,0,0),root=new Group();root.add(new Mesh(mergeGeometries([a,b]),new MeshBasicMaterial()));root.position.copy(new Vector3(10,8,0));
  const bounds=modelColliders(root);expect(bounds).toHaveLength(2);expect(bounds.some(b=>b.minX<10&&b.maxX>10)).toBe(false);expect(hitsWorldObstacle(10,0,8,.14,bounds,[])).toBe(false);expect(hitsWorldObstacle(8,0,8,.14,bounds,[])).toBe(true);
});
