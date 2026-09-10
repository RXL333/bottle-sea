import { BoxGeometry, Color, Group, InstancedMesh, Mesh, MeshStandardMaterial, Object3D } from 'three';

export const cubeGeometry = new BoxGeometry(1, 1, 1);
export const voxelMaterial = new MeshStandardMaterial({ roughness: 0.91, flatShading: true });
const materials = new Map<string, MeshStandardMaterial>();
export function material(color: string, glow = 0) {
  const key = color + glow;
  if (!materials.has(key)) materials.set(key, new MeshStandardMaterial({ color, roughness: 0.85, flatShading: true, emissive: color, emissiveIntensity: glow }));
  return materials.get(key)!;
}
export function box(parent: Group, color: string, x: number, y: number, z: number, sx: number, sy: number, sz: number, glow = 0) {
  const mesh = new Mesh(cubeGeometry, material(color, glow));
  mesh.position.set(x, y, z); mesh.scale.set(sx, sy, sz);
  mesh.castShadow = true; mesh.receiveShadow = true; parent.add(mesh); return mesh;
}
type Block = { x: number; y: number; z: number; sx: number; sy: number; sz: number; color: string; ry: number; rz: number };
export class VoxelBatch {
  private blocks: Block[] = [];
  add(color: string, x: number, y: number, z: number, sx = .15, sy = sx, sz = sx, ry = 0, rz = 0) {
    this.blocks.push({ x, y, z, sx, sy, sz, color, ry, rz });
  }
  build(parent: Group) {
    const mesh = new InstancedMesh(cubeGeometry, voxelMaterial, this.blocks.length);
    const dummy = new Object3D(); const color = new Color();
    this.blocks.forEach((b, i) => {
      dummy.position.set(b.x, b.y, b.z); dummy.scale.set(b.sx, b.sy, b.sz); dummy.rotation.set(0, b.ry, b.rz); dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix); mesh.setColorAt(i, color.set(b.color));
    });
    mesh.castShadow = true; mesh.receiveShadow = true; mesh.computeBoundingSphere(); parent.add(mesh);
    this.blocks = []; return mesh;
  }
}
export function seededRandom(seed: number) {
  return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
}
