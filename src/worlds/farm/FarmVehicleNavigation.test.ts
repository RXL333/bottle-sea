import { expect,it,vi } from 'vitest';
import { BoxGeometry,Group,Mesh,MeshBasicMaterial,Vector3 } from 'three';
import { FarmVehicleNavigation } from './FarmVehicleNavigation';
import type { NavigationSurface } from '../NavigationSurface';
function fixture(){const models=Object.assign(new Group(),{cameraSources:new Group()}),own=new Group();models.add(own);const nav=new FarmVehicleNavigation({} as NavigationSurface,()=>[],models,own);return {models,own,nav};}
function obstacle(x:number,z:number){const root=new Group(),mesh=new Mesh(new BoxGeometry(1,2,1),new MeshBasicMaterial());root.position.set(x,10,z);root.add(mesh);root.updateMatrixWorld(true);return {root,mesh};}
it('skips distant static geometry while preserving exact nearby obstruction',()=>{
  const f=fixture(),near=obstacle(0,2);f.models.cameraSources.add(near.root);const far=obstacle(100,100);f.models.cameraSources.add(far.root);const raycast=vi.spyOn(far.mesh,'raycast');
  f.models.cameraSources.updateMatrixWorld(true);f.nav.refreshCameraObstacles();const clipped=f.nav.clipCamera(new Vector3(0,10,0),new Vector3(0,10,5));expect(clipped.z).toBeCloseTo(1.26);expect(raycast).not.toHaveBeenCalled();
});
it('refits moving obstacles and excludes the driven vehicle',()=>{
  const f=fixture(),other=obstacle(0,2),self=obstacle(0,1);f.models.add(other.root);f.own.add(self.root);f.nav.refreshCameraObstacles();
  expect(f.nav.clipCamera(new Vector3(0,10,0),new Vector3(0,10,5)).z).toBeCloseTo(1.26);
  other.root.position.x=20;expect(f.nav.clipCamera(new Vector3(0,10,0),new Vector3(0,10,5)).z).toBe(5);
});
it('protects the edge of the near plane even when the centre ray misses',()=>{
  const f=fixture(),edge=obstacle(.6,2);f.models.cameraSources.add(edge.root);f.models.cameraSources.updateMatrixWorld(true);f.nav.refreshCameraObstacles();expect(f.nav.clipCamera(new Vector3(0,10,0),new Vector3(0,10,5)).z).toBeCloseTo(1.26);
});
