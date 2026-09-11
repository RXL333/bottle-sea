import { VoxelBatch } from '../../utils/voxel';

export const LANDMARKS=[
  {id:'chest',name:'沉没的宝箱',hint:'找到海底宝箱',x:-1.8,y:1.95,z:1.1},
  {id:'anchor',name:'远航者的船锚',hint:'找到古老船锚',x:-3.65,y:2.1,z:.65},
  {id:'ruins',name:'失落的海底遗迹',hint:'发现沉船与遗迹',x:3.1,y:2,z:.45},
  {id:'lighthouse',name:'守望者的灯塔',hint:'拜访岛上灯塔',x:.35,y:4.05,z:-.28},
] as const;
export const JOURNAL_TEXT:Record<string,string>={
  chest:'木箱上的铜锁早已被海水侵蚀，里面却仍有一点金色的微光。也许有人一直在等它归航。',
  anchor:'船锚沉入细沙，海草缠绕着锈迹。曾经牵住一艘船的重量，如今安静地牵住一段往事。',
  ruins:'断桅旁的石柱依然站立。鱼群从门洞穿过，像一封始终没有寄出的回信。',
  lighthouse:'灯光缓缓掠过海面。这座小小的灯塔，仍认真守望着每一艘晚归的船。',
};
export function treasureChest(b:VoxelBatch) {
  const x=-1.8,y=1.77,z=1.1;
  b.add('#513723',x,y+.2,z,.68,.4,.46);
  for(let i=0;i<5;i++) b.add(i%2?'#87602e':'#a27b36',x-.28+i*.14,y+.44,z,.135,.15,.48);
  for(const offset of [-.23,.23]) {b.add('#bda04a',x+offset,y+.22,z+.24,.065,.43,.026);b.add('#c4a857',x+offset,y+.53,z,.07,.03,.47);}
  b.add('#d4b447',x,y+.26,z+.263,.13,.16,.05);b.add('#423e2c',x,y+.27,z+.294,.04,.055,.015);
}
export function anchor(b:VoxelBatch) {
  const x=-3.65,y=1.82,z=.65;
  for(let i=0;i<8;i++) b.add(i%2?'#3e4842':'#4c5446',x-.018*i,y+.12+i*.14,z,.16,.138,.16);
  b.add('#424b42',x-.1,y+.87,z,.75,.14,.16);
  for(const side of [-1,1]) {
    for(let i=0;i<4;i++) b.add('#3b4540',x+side*(.1+i*.14),y+.06+i*i*.03,z,.18,.17,.18);
    b.add('#59614d',x+side*.51,y+.45,z,.16,.3,.2);
  }
  for(const [dx,dy] of [[-.22,1.22],[0,1.22],[-.11,1.33],[-.11,1.12]]) b.add('#4c574b',x+dx,y+dy,z,.12,.12,.13);
}
export function ruins(b:VoxelBatch) {
  for(const x of [2.8,3.65]) {
    b.add('#788676',x,1.83,.4,.48,.22,.48);
    for(let i=0;i<5;i++) b.add(i%2?'#758779':'#64796b',x,2+i*.16,.4,.24,.16,.26);
    b.add('#8c9780',x,2.8,.4,.4,.15,.4);
  }
  b.add('#617b6b',3.22,2.94,.4,1.5,.17,.35);
  for(let i=0;i<5;i++) b.add('#647360',2.5+i*.31,1.84,.95,.29,.16,.31,.12*i);
  // Broken ribs and a fallen mast make a small wreck, distinct from the standing ruins.
  b.add('#4b4931',1.25,1.85,-.8,1.5,.14,.52,.25);
  for(let i=0;i<6;i++) {
    for(const side of [-1,1]) b.add('#615337',.63+i*.24,2+Math.sin(i)*.06,-.8+side*.22,.07,.34,.07,.25,side*.3);
  }
  b.add('#76613d',1.1,2.04,-.8,.07,.07,1.15,-.7);
}
