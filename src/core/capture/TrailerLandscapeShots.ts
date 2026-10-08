import { lookPose } from './CameraPath';
import type { TrailerShot } from './TrailerShots';

/** Horizontal compositions reuse the same scene, duration and gameplay definitions. */
export function landscapeShot(source:TrailerShot):TrailerShot {
  const shot=structuredClone(source),frames=shot.path.poses;
  switch(shot.id){
    case 'bottle-reveal':shot.path.poses=[lookPose([.5,6.3,29],[.5,3.2,0],40),lookPose([.5,5.7,18],[.5,3.2,0],40)];break;
    case 'farm-reveal':shot.path.poses=[frames[0],lookPose([0,70,65],[0,4,-30],54)];break;
    case 'tractor-pass':for(const pose of frames)pose.fov=42;break;
    case 'combine-harvest':shot.followOffset=[4.4,2.7,4.4];shot.path.poses=[lookPose([4.4,6.732,-7.6],[0,4.932,-12.4],44),lookPose([4.4,6.732,-17.6],[0,4.932,-22.4],44)];break;
    case 'farm-life':shot.path.poses=[lookPose([25.7,4.8,-57],[26,4.6,-50],44),lookPose([26.3,4.95,-57],[26,4.6,-50],44)];break;
  }
  return shot;
}
