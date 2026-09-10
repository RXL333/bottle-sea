import { FrontSide, ShaderMaterial } from 'three';
export function bottleMaterial(){return new ShaderMaterial({
  transparent:true,depthWrite:false,side:FrontSide,
  vertexShader:`varying vec3 vN; varying vec3 vV; void main(){vec4 p=modelViewMatrix*vec4(position,1.0);vN=normalize(normalMatrix*normal);vV=normalize(-p.xyz);gl_Position=projectionMatrix*p;}`,
  fragmentShader:`varying vec3 vN; varying vec3 vV; void main(){float rim=pow(1.0-abs(dot(normalize(vN),normalize(vV))),3.5);gl_FragColor=vec4(vec3(0.48,0.78,0.77),0.018+rim*0.5);}`,
});}
