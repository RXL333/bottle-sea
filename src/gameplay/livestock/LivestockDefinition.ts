export type LivestockKind='chicken'|'cow'|'sheep';
export type AnimalBehavior='IDLE'|'WALKING'|'EATING'|'SLEEPING';
export const BEHAVIOR_NAMES:Readonly<Record<AnimalBehavior,string>>={IDLE:'待机',WALKING:'行走',EATING:'进食',SLEEPING:'睡眠'};
export const FEED_ITEMS=Object.freeze(['feed.basic','crop.wheat','crop.corn'] as const);
export const PEN_FEED_CAPACITY=24;
export const FEED_BATCH=5;
export const PENDING_CAPACITY=20;
export const LIVESTOCK_SPECIES:Readonly<Record<LivestockKind,{name:string;productItemId:string;periodGameMinutes:number;collectVerb:string}>>={
  chicken:{name:'鸡',productItemId:'livestock.egg',periodGameMinutes:1440,collectVerb:'收蛋'},
  cow:{name:'牛',productItemId:'livestock.milk',periodGameMinutes:1440,collectVerb:'挤奶'},
  sheep:{name:'羊',productItemId:'livestock.wool',periodGameMinutes:2880,collectVerb:'剪毛'},
};
export interface PenDefinition {id:LivestockKind;name:string;bounds:{minX:number;maxX:number;minZ:number;maxZ:number};feeder:{x:number;z:number};shelter:{x:number;z:number}}
// Centre bounds include clearance for the full existing animal model at any yaw.
export const LIVESTOCK_PENS:readonly PenDefinition[]=[
  {id:'chicken',name:'鸡舍',bounds:{minX:15,maxX:21,minZ:-46.1,maxZ:-43.3},feeder:{x:18,z:-42.75},shelter:{x:20.7,z:-46.75}},
  {id:'cow',name:'牛棚',bounds:{minX:23.2,maxX:28.2,minZ:-46.1,maxZ:-43.2},feeder:{x:26,z:-47.1},shelter:{x:29.5,z:-44.5}},
  {id:'sheep',name:'羊圈',bounds:{minX:23.1,maxX:28.4,minZ:-55.2,maxZ:-49.5},feeder:{x:26,z:-48.8},shelter:{x:29.5,z:-53}},
];
export const LIVESTOCK_ANIMALS:readonly {id:string;kind:LivestockKind;x:number;z:number;yaw:number}[]=[
  {id:'chicken-0',kind:'chicken',x:17,z:-44,yaw:0},{id:'chicken-1',kind:'chicken',x:18,z:-45,yaw:1.4},{id:'chicken-2',kind:'chicken',x:19.3,z:-43.5,yaw:2.8},
  {id:'cow-0',kind:'cow',x:25,z:-44,yaw:.3},{id:'cow-1',kind:'cow',x:27,z:-45.6,yaw:-.8},
  {id:'sheep-0',kind:'sheep',x:24.5,z:-51,yaw:0},{id:'sheep-1',kind:'sheep',x:27,z:-52.5,yaw:.9},{id:'sheep-2',kind:'sheep',x:26,z:-54,yaw:1.8},
];
export const penDefinition=(id:string)=>LIVESTOCK_PENS.find(p=>p.id===id);
