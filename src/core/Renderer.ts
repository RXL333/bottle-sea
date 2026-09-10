import { ACESFilmicToneMapping, PCFShadowMap, WebGLRenderer } from 'three';

export const QUALITY = {
  LOW: { ratio: 0.65, waterStep: 0.25, fish: 20, rain: 250 },
  MEDIUM: { ratio: 0.9, waterStep: 0.16, fish: 32, rain: 500 },
  HIGH: { ratio: 1.25, waterStep: 0.14, fish: 44, rain: 850 },
} as const;
export type Quality = keyof typeof QUALITY;

export class Renderer extends WebGLRenderer {
  quality: Quality = 'MEDIUM';
  constructor() {
    super({ antialias: false, alpha: false, powerPreference: 'high-performance' });
    this.toneMapping = ACESFilmicToneMapping;
    this.toneMappingExposure = 1.3;
    this.shadowMap.enabled = true;
    this.shadowMap.type = PCFShadowMap;
    this.domElement.setAttribute('aria-label', '瓶中沧海，交互式三维体素海洋');
    this.resize();
  }
  resize() {
    this.setPixelRatio(Math.min(window.devicePixelRatio, QUALITY[this.quality].ratio));
    this.setSize(window.innerWidth, window.innerHeight);
  }
}

