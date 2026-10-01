import { Mesh,Raycaster,Vector3 } from 'three';
import type { Object3D } from 'three';
import type { MotionPose } from '../../gameplay/vehicles/VehicleMotion';
import { TRACTOR_HULL } from '../../gameplay/vehicles/VehicleMotion';
import type { DrivingHull } from '../../gameplay/vehicles/VehicleDefinition';
import type { VehicleNavigation,VehicleHull } from '../../systems/vehicles/Vehicle';
import type { NavigationSurface } from '../NavigationSurface';
import { hitsDynamicObstacle,PLAYER_FOOT_OFFSET,PLAYER_RADIUS } from '../../world/Collision';
import type { DynamicObstacle } from '../../world/Collision';
import { FARM_OBSTACLES } from './FarmLayout';
import { farmLand } from './FarmTopography';
import { farmHeight } from './FarmTerrain';
import type { SpawnPoint } from '../types';
import { hullsOverlap } from '../../gameplay/vehicles/HitchMath';

type Rect=VehicleHull;
export class FarmVehicleNavigation implements VehicleNavigation {
  private ray=new Raycaster();private direction=new Vector3();
  private cameraMeshes:Object3D[]=[];
  constructor(private navigation:NavigationSurface,private dynamic:()=>readonly DynamicObstacle[],private models:Object3D,private tractor:Object3D,private exitObstacles:()=>readonly DynamicObstacle[]=dynamic,private dimensions:DrivingHull=TRACTOR_HULL){this.refreshCameraObstacles();}
  refreshCameraObstacles(){
    this.cameraMeshes=[];
    this.models.traverse(o=>{if(!(o instanceof Mesh))return;for(let p:Object3D|null=o;p;p=p.parent)if(p===this.tractor)return;this.cameraMeshes.push(o);});
  }
  hull(p:MotionPose):Rect{const d=this.dimensions;return {x:p.x+Math.cos(p.yaw)*(d.centerX??0)+Math.sin(p.yaw)*d.centerZ,z:p.z-Math.sin(p.yaw)*(d.centerX??0)+Math.cos(p.yaw)*d.centerZ,...d,yaw:p.yaw};}
  ground(p:MotionPose):number|undefined {
    return this.groundHull(this.hull(p));
  }
  groundHull(h:VehicleHull):number|undefined {
    const c=Math.cos(h.yaw),s=Math.sin(h.yaw),heights:number[]=[];
    for(const x of [-h.halfX,0,h.halfX])for(const z of [-h.halfZ,0,h.halfZ]){
      const wx=h.x+c*x+s*z,wz=h.z-s*x+c*z;if(!farmLand(wx,wz))return;
      heights.push(farmHeight(wx,wz));
    }
    if(Math.max(...heights)-Math.min(...heights)>.18)return;
    return Math.max(...heights);
  }
  accepts(p:MotionPose):boolean {
    return this.acceptsHull(this.hull(p),this.dimensions.height);
  }
  acceptsHull(h:VehicleHull,height:number,ignore:readonly DynamicObstacle[]=[]):boolean {
    const y=this.groundHull(h);if(y===undefined)return false;
    for(const b of FARM_OBSTACLES){
      if(y>=b.maxY||y+height<=b.minY)continue;
      if(hullsOverlap(h,{x:(b.minX+b.maxX)/2,z:(b.minZ+b.maxZ)/2,halfX:(b.maxX-b.minX)/2,halfZ:(b.maxZ-b.minZ)/2,yaw:0}))return false;
    }
    // The foot jetty is too narrow for a vehicle; keep the dock approach clear.
    if(hullsOverlap(h,{x:-4,z:12.6,halfX:1.1,halfZ:3.05,yaw:0}))return false;
    return !this.dynamic().some(b=>!ignore.includes(b)&&y<b.maxY&&y+height>b.minY&&hullsOverlap(h,b));
  }
  findExit(p:MotionPose,collision:DynamicObstacle,cameraPosition?:Vector3):SpawnPoint|undefined {
    const c=Math.cos(p.yaw),s=Math.sin(p.yaw);
    const side=this.dimensions.halfX+.42,end=this.dimensions.halfZ+.55;
    for(const [x,z] of [[side,0],[-side,0],[side,-.65],[-side,-.65],[side,.65],[-side,.65],[0,-end],[0,end],[side+.3,-end],[-side-.3,-end]]){
      const wx=p.x+c*x+s*z,wz=p.z-s*x+c*z;if(!farmLand(wx,wz))continue;
      const y=farmHeight(wx,wz)+PLAYER_FOOT_OFFSET;
      if(!this.navigation.isInside(wx,y,wz)||this.navigation.hitsObstacle(wx,wz,y)||hitsDynamicObstacle(wx,wz,y,[collision,...this.exitObstacles()],PLAYER_RADIUS+.06))continue;
      // Check the player's full clearance, including a small margin from walls.
      if([[.06,0],[-.06,0],[0,.06],[0,-.06]].some(([dx,dz])=>this.navigation.hitsObstacle(wx+dx,wz+dz,y)))continue;
      if(cameraPosition){
        const eye=new Vector3(wx,y,wz),raised=eye.clone();raised.y=Math.max(cameraPosition.y,y+1.6);
        if(this.clipCamera(cameraPosition,raised).distanceToSquared(raised)>.0025||this.clipCamera(raised,eye).distanceToSquared(eye)>.0025)continue;
      }
      return {id:'tractor_exit',position:[wx,y,wz],lookAt:[wx+Math.sin(p.yaw),y,wz+Math.cos(p.yaw)]};
    }
    return;
  }
  clipCamera(from:Vector3,to:Vector3):Vector3 {
    this.direction.subVectors(to,from);const length=this.direction.length();if(length<1e-6)return to.clone();this.direction.divideScalar(length);
    let distance=length;
    // Five rays protect the near plane as well as the optical centre.
    const right=new Vector3(this.direction.z,0,-this.direction.x).normalize(),up=new Vector3().crossVectors(this.direction,right).normalize();
    for(const offset of [[0,0],[.16,0],[-.16,0],[0,.16],[0,-.16]]){
      this.ray.set(from.clone().addScaledVector(right,offset[0]).addScaledVector(up,offset[1]),this.direction);this.ray.far=length+.2;
      const hit=this.ray.intersectObjects(this.cameraMeshes,false)[0];if(hit)distance=Math.min(distance,Math.max(0,hit.distance-.24));
    }
    // Query the same terrain height data instead of raycasting thousands of
    // voxel cubes twice per frame. Obstacles above ground use actual GLB meshes.
    for(let step=.1;step<=distance;step+=.1){
      const point=from.clone().addScaledVector(this.direction,step);
      if(farmLand(point.x,point.z)&&point.y<farmHeight(point.x,point.z)+.3){distance=Math.max(0,step-.15);break;}
    }
    const result=from.clone().addScaledVector(this.direction,distance);
    if(farmLand(result.x,result.z))result.y=Math.max(result.y,farmHeight(result.x,result.z)+.3);
    return result;
  }
}
