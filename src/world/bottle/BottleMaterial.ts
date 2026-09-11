import { FrontSide, ShaderMaterial } from 'three';
export function bottleMaterial(){return new ShaderMaterial({
  transparent:true,depthWrite:false,side:FrontSide,
  uniforms:{flash:{value:0}},
  vertexShader:`varying vec3 vN; varying vec3 vV; varying vec3 vLocal;
    void main(){vec4 p=modelViewMatrix*vec4(position,1.0);vN=normalize(normalMatrix*normal);vV=-p.xyz;vLocal=position;gl_Position=projectionMatrix*p;}`,
  fragmentShader:`varying vec3 vN; varying vec3 vV; varying vec3 vLocal; uniform float flash;
    void main(){
      vec3 n=normalize(vN),v=normalize(vV);
      float facing=1.0-abs(dot(n,v));
      float rim=pow(facing,3.5);
      float soft=pow(facing,1.7)*0.055;
      float band=pow(max(0.0,dot(reflect(-v,n),normalize(vec3(-0.5,0.85,0.65)))),20.0);
      float thickness=smoothstep(3.8,6.2,vLocal.y)+1.0-smoothstep(-6.2,-5.4,vLocal.y);
      vec3 tint=mix(vec3(0.40,0.70,0.70),vec3(0.65,0.87,0.79),rim);
      tint+=flash*0.23;
      float alpha=0.014+rim*(0.38+thickness*0.08)+soft+band*0.07;
      gl_FragColor=vec4(tint,min(0.62,alpha+flash*rim*0.1));
    }`,
});}
