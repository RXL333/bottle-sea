import type { Group,Matrix4,Vector3 } from 'three';
import type { DrivingInput,MotionPose } from '../../gameplay/vehicles/VehicleMotion';
import type { DynamicObstacle } from '../../world/Collision';
import type { SpawnPoint } from '../../worlds/types';
import type { HitchPort } from '../../gameplay/vehicles/ImplementRegistry';
import type { SeedChoice } from '../../gameplay/farm/SeedingSystem';

export interface VehicleHull { x:number;z:number;halfX:number;halfZ:number;yaw:number }
export interface VehicleAttachmentDriver {
  accepts(pose:MotionPose):boolean;
  move(pose:MotionPose):void;
  record():void;
  readonly hint:string;
  readonly workHint?:string;
  readonly seedChoices?:readonly SeedChoice[];
  readonly cargoHint?:string;readonly machineControls?:string;
  unload?():import('../InteractionSystem').InteractionOutcome;
  readonly cameraDistance:number;
}

/** A world supplies geometry queries; the driver has no dependency on its map. */
export interface VehicleNavigation {
  hull(pose:MotionPose):VehicleHull;
  ground(pose:MotionPose):number|undefined;
  accepts(pose:MotionPose):boolean;
  groundHull(hull:VehicleHull):number|undefined;
  acceptsHull(hull:VehicleHull,height:number,ignore?:readonly DynamicObstacle[]):boolean;
  findExit(pose:MotionPose,collision:DynamicObstacle,cameraPosition?:Vector3):SpawnPoint|undefined;
  clipCamera(from:Vector3,to:Vector3):Vector3;
}

export interface DriveableVehicle {
  readonly id:string;readonly name:string;readonly root:Group;
  readonly speed:number;readonly yaw:number;readonly occupied:boolean;
  readonly collision:DynamicObstacle;
  readonly hitchHint?:string;readonly workHint?:string;readonly cameraDistance?:number;
  readonly seedChoices?:readonly SeedChoice[];
  readonly cargoHint?:string;readonly machineControls?:string;
  toggleHeader?():import('../InteractionSystem').InteractionOutcome;
  toggleMachine?():import('../InteractionSystem').InteractionOutcome;
  unload?():import('../InteractionSystem').InteractionOutcome;
  seatPosition():Vector3;
  entryPosition():Vector3;
  occupy(value:boolean):void;
  advance(delta:number,input:DrivingInput):void;
  stop():void;
  findExit(cameraPosition?:Vector3):SpawnPoint|undefined;
  /** Shortens a camera segment against world geometry, excluding this vehicle. */
  clipCamera(from:Vector3,to:Vector3):Vector3;
  /** Semantic mounting anchors; implement behavior stays in the attachment driver. */
  hitchBackTransform():Matrix4;
  hitchPosition(port:HitchPort,pose?:MotionPose):Vector3;
}
