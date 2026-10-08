import { Box3,Euler,Float32BufferAttribute,Group,Mesh,MeshStandardMaterial,Quaternion,Vector3 } from 'three';
import type { BufferGeometry,Material,Object3D } from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import type { Quality } from '../core/Renderer';
import type { DriveableVehicle } from './vehicles/Vehicle';
import { PLAYER_FOOT_OFFSET } from '../world/Collision';
import { disposeWorld } from '../worlds/disposeWorld';
import { separateModelSurfaces } from '../utils/modelSurfaces';

export const CHARACTER_MODEL_URL=`${import.meta.env.BASE_URL}models/character/player_character.glb`;
export const CHARACTER_SCALE=.33;
const JOINTS=['Hips','Spine','Head','Hat','Backpack','Thigh_L','Shin_L','Foot_L','Arm_L','Forearm_L','Hand_L','Thigh_R','Shin_R','Foot_R','Arm_R','Forearm_R','Hand_R'] as const;
type Joint=typeof JOINTS[number];
type CharacterPose='IDLE'|'WALK'|'RUN'|'SEATED';
export interface CharacterFrame {
  delta:number;time:number;visible:boolean;firstPerson:boolean;
  eye:Vector3;orientation:Quaternion;eyeHeight?:number;sprinting?:boolean;grounded?:boolean;
  paused?:boolean;vehicle?:DriveableVehicle;
}
type ModelLoader=(url:string)=>Promise<Group>;
/** Global visual avatar. Never owns input, collision, Inventory or saved player state. */
export class PlayerCharacter extends Group {
  private parts=new Map<Joint,Object3D>();private rests=new Map<Joint,Quaternion>();
  private model?:Group;private pending?:Promise<void>;private disposed=false;private quality:Quality='MEDIUM';
  private previousEye?:Vector3;private gait=0;private speed=0;private hipAnchor=new Vector3();private look=new Euler(0,0,0,'YXZ');
  private poseRotation=new Quaternion();private poseEuler=new Euler();private seatOffset=new Vector3();
  private preparedVehicles=new WeakSet<Group>();
  pose:CharacterPose='IDLE';
  constructor(private loader:ModelLoader=async url=>(await new GLTFLoader().loadAsync(url)).scene){super();this.name='PlayerCharacterPresentation';this.visible=false;this.scale.setScalar(CHARACTER_SCALE);}
  get loaded(){return !!this.model;}
  get diagnostics(){return {loaded:this.loaded,visible:this.visible,pose:this.pose,firstPerson:this.parts.get('Head')?.visible===false};}
  load(){return this.pending??=this.loadModel();}
  private async loadModel(){
    const model=await this.loader(CHARACTER_MODEL_URL);
    if(this.disposed){disposeWorld(model);return;}
    separateModelSurfaces(model);
    model.traverse(o=>{const id=o.userData.part_id;if(JOINTS.includes(id as Joint))this.parts.set(id as Joint,o);});
    if(JOINTS.some(id=>!this.parts.has(id))){this.parts.clear();disposeWorld(model);throw new Error('Character model is missing required pose joints');}
    try{this.batchPalette(model);}catch(error){this.parts.clear();disposeWorld(model);throw error;}
    model.updateMatrixWorld(true);this.hipAnchor.copy(this.parts.get('Hips')!.getWorldPosition(new Vector3()));
    for(const id of JOINTS)this.rests.set(id,this.parts.get(id)!.quaternion.clone());
    this.model=model;this.add(model);this.applyQuality(this.quality);this.userData.triangles=this.triangles();
  }
  /** One palette-colored draw per articulated part instead of dozens of material draws. */
  private batchPalette(model:Group){
    const palette=new MeshStandardMaterial({vertexColors:true,roughness:.86}),geometries=new Set<BufferGeometry>(),materials=new Set<Material>();
    const batches:{part:Object3D;meshes:Mesh[];geometry:BufferGeometry}[]=[];
    try{for(const part of this.parts.values()){
      const meshes=part.children.filter((o):o is Mesh=>o instanceof Mesh);if(!meshes.length)continue;
      const copies:BufferGeometry[]=[],unindexed=meshes.some(mesh=>!mesh.geometry.index);
      try{for(const mesh of meshes){
        const material=mesh.material;if(!(material instanceof MeshStandardMaterial))throw new Error('Character palette requires plain PBR materials');
        const geometry=unindexed&&mesh.geometry.index?mesh.geometry.toNonIndexed():mesh.geometry.clone();copies.push(geometry);mesh.updateMatrix();geometry.applyMatrix4(mesh.matrix);
        const count=geometry.getAttribute('position').count,colors=new Float32Array(count*3);for(let i=0;i<count;i++)material.color.toArray(colors,i*3);geometry.setAttribute('color',new Float32BufferAttribute(colors,3));geometries.add(mesh.geometry);materials.add(material);
      }
        const geometry=mergeGeometries(copies,false);if(!geometry)throw new Error('Character palette could not be batched');batches.push({part,meshes,geometry});
      }finally{for(const copy of copies)copy.dispose();}
    }}catch(error){for(const batch of batches)batch.geometry.dispose();palette.dispose();throw error;}
    for(const {part,meshes,geometry} of batches){const mesh=new Mesh(geometry,palette);mesh.name=`CharacterPart_${part.userData.part_id}`;for(const old of meshes)part.remove(old);part.add(mesh);}
    for(const geometry of geometries)geometry.dispose();for(const material of materials)material.dispose();model.userData.paletteBatched=true;
  }
  private triangles(){let count=0;this.model?.traverse(o=>{if(o instanceof Mesh)count+=(o.geometry.index?.count??o.geometry.getAttribute('position').count)/3;});return count;}
  applyQuality(quality:Quality){this.quality=quality;this.model?.traverse(o=>{if(o instanceof Mesh){o.castShadow=quality!=='LOW';o.receiveShadow=true;}});}
  /** Cab exports use opaque glass. Clone only vehicle glass so the driver is visible,
   * leaving the shared building/asset palette and every vehicle rule unchanged. */
  private prepareCab(vehicle:DriveableVehicle){
    if(this.preparedVehicles.has(vehicle.root))return;this.preparedVehicles.add(vehicle.root);
    const glass=new Map<MeshStandardMaterial,MeshStandardMaterial>();
    vehicle.root.traverse(o=>{if(!(o instanceof Mesh)||!(o.material instanceof MeshStandardMaterial)||!o.material.name.toLowerCase().includes('glass'))return;
      const source=o.material;let material=glass.get(source);if(!material){material=source.clone();material.transparent=true;material.opacity=.18;material.depthWrite=false;glass.set(source,material);}o.material=material;o.castShadow=false;
    });
  }
  private rotate(id:Joint,x=0,y=0,z=0){const joint=this.parts.get(id)!;this.poseEuler.set(x,y,z);this.poseRotation.setFromEuler(this.poseEuler);joint.quaternion.copy(this.rests.get(id)!).multiply(this.poseRotation);}
  setPose(pose:CharacterPose,phase=0,time=0){
    if(!this.loaded)return;this.pose=pose;for(const id of JOINTS)this.parts.get(id)!.quaternion.copy(this.rests.get(id)!);
    if(pose==='SEATED'){
      this.rotate('Thigh_L',-1.45);this.rotate('Thigh_R',-1.45);this.rotate('Shin_L',1.45);this.rotate('Shin_R',1.45);
      this.rotate('Foot_L',-.12);this.rotate('Foot_R',-.12);this.rotate('Spine',-.06);
      this.rotate('Arm_L',-.82,0,-.16);this.rotate('Arm_R',-.82,0,.16);this.rotate('Forearm_L',-.42);this.rotate('Forearm_R',-.42);
    }else{
      const moving=pose==='WALK'||pose==='RUN',stride=moving?Math.sin(phase)*(pose==='RUN'?.72:.44):0;
      this.rotate('Thigh_L',stride);this.rotate('Thigh_R',-stride);this.rotate('Shin_L',Math.max(0,-stride)*.8);this.rotate('Shin_R',Math.max(0,stride)*.8);
      this.rotate('Arm_L',-stride*.65,0,-.09);this.rotate('Arm_R',stride*.65,0,.09);this.rotate('Forearm_L',-.08-Math.max(0,stride)*.24);this.rotate('Forearm_R',-.08-Math.max(0,-stride)*.24);
      this.rotate('Spine',pose==='RUN'?-.10:0,0,Math.sin(time*1.8)*.012);this.rotate('Head',Math.sin(time*1.2)*.012);
    }
    this.updateMatrixWorld(true);
  }
  update(frame:CharacterFrame){
    this.visible=this.loaded&&frame.visible;if(!this.visible){this.previousEye=undefined;this.speed=0;return;}
    const firstPerson=frame.firstPerson&&!frame.vehicle;this.parts.get('Head')!.visible=!firstPerson;this.parts.get('Backpack')!.visible=!firstPerson;
    const dt=Math.min(.1,Math.max(0,frame.delta));
    if(frame.vehicle){
      this.prepareCab(frame.vehicle);
      this.scale.setScalar(CHARACTER_SCALE);this.setPose('SEATED',0,frame.time);this.rotation.set(0,frame.vehicle.yaw,0);this.position.copy(frame.vehicle.seatPosition());
      this.seatOffset.copy(this.hipAnchor).multiplyScalar(CHARACTER_SCALE).applyQuaternion(this.quaternion);this.position.sub(this.seatOffset);this.previousEye=undefined;this.speed=0;
    }else{
      this.scale.setScalar(CHARACTER_SCALE*(frame.eyeHeight??PLAYER_FOOT_OFFSET)/PLAYER_FOOT_OFFSET);
      const distance=this.previousEye?Math.hypot(frame.eye.x-this.previousEye.x,frame.eye.z-this.previousEye.z):0;
      const raw=dt>0&&distance<.5?distance/dt:0;this.speed+=(raw-this.speed)*(1-Math.exp(-dt*12));
      this.previousEye=frame.eye.clone();if(!frame.paused)this.gait+=this.speed*dt*(frame.sprinting?13:17);
      const moving=!frame.paused&&frame.grounded!==false&&this.speed>.04;
      this.setPose(moving?frame.sprinting?'RUN':'WALK':'IDLE',this.gait,frame.paused?0:frame.time);
      this.look.setFromQuaternion(frame.orientation,'YXZ');this.rotation.set(0,this.look.y+Math.PI,0);this.position.copy(frame.eye);this.position.y-=frame.eyeHeight??PLAYER_FOOT_OFFSET;
    }
    this.updateMatrixWorld(true);
  }
  /** Model viewer and asset QA use the same loaded geometry and runtime poses. */
  showAt(feet:Vector3,yaw:number,pose:CharacterPose='IDLE',phase=0){if(!this.loaded)return;this.visible=true;this.scale.setScalar(CHARACTER_SCALE);this.parts.get('Head')!.visible=true;this.parts.get('Backpack')!.visible=true;this.position.copy(feet);this.rotation.set(0,yaw,0);this.setPose(pose,phase);}
  bounds(){return new Box3().setFromObject(this);}
  dispose(){if(this.disposed)return;this.disposed=true;disposeWorld(this);this.model=undefined;this.parts.clear();this.rests.clear();this.visible=false;}
}
