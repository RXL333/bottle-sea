import { AmbientLight, BufferGeometry, Color, DirectionalLight, Float32BufferAttribute, Group, HemisphereLight, Mesh, MeshBasicMaterial, MeshStandardMaterial, Points, PointsMaterial, Scene, SphereGeometry } from 'three';
import { daylightAt,dawnWeight,sunsetWeight,dayPhase } from './DayTimeMath';
import type { DayPhase } from './DayTimeMath';
import { VoxelBatch,seededRandom } from '../utils/voxel';

export class DayNightSystem {
  readonly ambient=new AmbientLight('#d4e4d6',1.4);
  readonly sun=new DirectionalLight('#ffe2ad',3);
  readonly hemi=new HemisphereLight('#95c5d6','#4b5443',1.4);
  readonly sky=new Group();readonly clouds=new Group();
  night=0;
  phase:DayPhase='DAY';private cloudTime=0;private lastTime=0;
  private dawnColor=new Color('#344c58');private sunsetColor=new Color('#493f3a');private sunsetLight=new Color('#ffac6f');
  private stars:Points;private moon:Mesh;private solar:Mesh;
  private dayColor=new Color('#21343a');private nightColor=new Color('#101f32');private stormColor=new Color('#1a2b38');
  private waterDay=new Color('#087b83');private waterNight=new Color('#063744');
  private warm=new Color('#ffe2ad');private cool=new Color('#80a9d6');
  private cloudMaterial:MeshStandardMaterial;
  private cloudLayers:Group[]=[];
  constructor(private scene:Scene) {
    this.sun.position.set(-4,10,6);this.sun.castShadow=true;this.sun.shadow.mapSize.set(2048,2048);
    Object.assign(this.sun.shadow.camera,{left:-13,right:13,top:10,bottom:-10,near:.5,far:35});this.sun.shadow.bias=-.00025;this.sun.shadow.normalBias=.045;
    scene.add(this.ambient,this.sun,this.hemi,this.sky);
    const random=seededRandom(721),positions=[],brightness=[];
    for(let i=0;i<60;i++){positions.push(-5+random()*9.5,4.9+random()*.9,-.3-random());const value=.35+random()*.65;brightness.push(value,value,value*.9);}
    const geo=new BufferGeometry();geo.setAttribute('position',new Float32BufferAttribute(positions,3));
    geo.setAttribute('color',new Float32BufferAttribute(brightness,3));
    this.stars=new Points(geo,new PointsMaterial({color:'#d5e4da',vertexColors:true,size:.035,transparent:true,opacity:0,depthWrite:false}));this.sky.add(this.stars);
    this.moon=new Mesh(new SphereGeometry(.21,8,6),new MeshBasicMaterial({color:'#e3e7be'}));this.moon.position.set(3.6,5.4,-.6);this.sky.add(this.moon);
    this.solar=new Mesh(new SphereGeometry(.16,8,6),new MeshBasicMaterial({color:'#efd198'}));this.solar.position.set(-3.9,5.1,-.8);this.sky.add(this.solar);
    this.cloudMaterial=new MeshStandardMaterial({color:'#b5c2bb',roughness:1,flatShading:true});
    for(const [x,y,z,s] of [[-4.2,4.8,-.1,.65],[-2.8,5.55,-.8,.6],[2.5,5.1,-.4,.7],[4.1,4.55,-.3,.4]]) {
      const b=new VoxelBatch(),layer=new Group();
      b.add('#c7d2c8',x,y,z,s,.12,.24);b.add('#e0e0cb',x+.04,y+.12,z,s*.4,.13,.23);
      const cloud=b.build(layer);cloud.material=this.cloudMaterial;cloud.castShadow=false;this.cloudLayers.push(layer);this.clouds.add(layer);
    }
    this.sky.add(this.clouds);
  }
  update(dayTime:number,time:number,storm:number,flash=0) {
    const daylight=daylightAt(dayTime);this.night=1-daylight;
    const dawn=dawnWeight(dayTime),sunset=sunsetWeight(dayTime);this.phase=dayPhase(dayTime);
    if(this.scene.fog)this.scene.fog.color.copy(this.waterNight).lerp(this.waterDay,daylight*(1-storm*.3));
    (this.scene.background as Color).copy(this.nightColor).lerp(this.dayColor,daylight).lerp(this.stormColor,storm*.7);
    (this.scene.background as Color).lerp(this.dawnColor,dawn*.5*(1-storm)).lerp(this.sunsetColor,sunset*.55*(1-storm));
    this.ambient.intensity=.6+daylight*.74-storm*.18+flash*.8;
    this.hemi.intensity=.65+daylight*.6;
    this.sun.intensity=Math.max(.12,.5+daylight*2.5-storm*1.8)+flash*5;
    this.sun.color.copy(this.cool).lerp(this.warm,daylight);
    this.sun.color.lerp(this.sunsetLight,sunset*.7);
    this.sun.position.x=-4+Math.cos(dayTime*Math.PI*2)*3;
    (this.stars.material as PointsMaterial).opacity=this.night*(1-storm)*.8;
    this.moon.visible=this.night>.2&&storm<.7;this.solar.visible=daylight>.6&&storm<.3;
    this.cloudMaterial.color.set('#a6b8b3').lerp(this.nightColor,this.night*.45+storm*.4);
    this.cloudTime+=Math.max(0,time-this.lastTime)*(1+storm*2.2);this.lastTime=time;
    for(let i=0;i<this.cloudLayers.length;i++){this.cloudLayers[i].position.x=Math.sin(this.cloudTime*(.025+i*.012))*.3;this.cloudLayers[i].position.y=-storm*.18;}
  }
}


