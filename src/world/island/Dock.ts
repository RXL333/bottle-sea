import { VoxelBatch } from '../../utils/voxel';

export const DOCK={minX:.2,maxX:1.1,minZ:.62,maxZ:1.95,height:3.68};
export function dock(b:VoxelBatch) {
  for(let i=0;i<10;i++) b.add(i%2?'#83603c':'#997047',.65,3.61,.64+i*.135,.92,.14,.123);
  for(const x of [.24,1.06]) for(const z of [.77,1.8]) {
    b.add('#68472e',x,3.2,z,.13,1.35,.13);b.add('#9b7446',x,3.89,z,.17,.12,.17);
  }
  b.add('#6f5133',.24,3.88,1.27,.045,.05,1);
  for(let i=0;i<3;i++) b.add('#bea574',.2,3.53+i*.1,.57-i*.13,.65,.13,.2);
}
