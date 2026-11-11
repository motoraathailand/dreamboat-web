// Painterly material helpers + low-lying mist (global fog chunk override). © MOTOR AA
import * as THREE from 'three';

// Shared uniforms updated every frame by main.js
export const PU = {
  sunDir: { value: new THREE.Vector3(0, 0.1, -1) },
  sunCol: { value: new THREE.Color(1, 0.8, 0.6) },
  shadowTint: { value: new THREE.Color(0.85, 0.82, 1.0) },
  time: { value: 0 },
};

const f = (x) => (Number.isInteger(x) ? x.toFixed(1) : String(x));

export const NOISE3 = `
float pn_h(vec3 p){ p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
float pn_n(vec3 x){ vec3 i = floor(x); vec3 q = fract(x); q = q * q * (3.0 - 2.0 * q);
  return mix(mix(mix(pn_h(i), pn_h(i + vec3(1,0,0)), q.x), mix(pn_h(i + vec3(0,1,0)), pn_h(i + vec3(1,1,0)), q.x), q.y),
             mix(mix(pn_h(i + vec3(0,0,1)), pn_h(i + vec3(1,0,1)), q.x), mix(pn_h(i + vec3(0,1,1)), pn_h(i + vec3(1,1,1)), q.x), q.y), q.z); }
`;

// ---- global fog override: distance fog + soft, patchy mist banks hugging the water ----
THREE.ShaderChunk.fog_pars_vertex = `
#ifdef USE_FOG
  varying float vFogDepth; varying vec3 vFogWorld;
#endif`;
THREE.ShaderChunk.fog_vertex = `
#ifdef USE_FOG
  vFogDepth = - mvPosition.z;
  #ifdef USE_INSTANCING
    vFogWorld = (modelMatrix * instanceMatrix * vec4(transformed, 1.0)).xyz;
  #else
    vFogWorld = (modelMatrix * vec4(transformed, 1.0)).xyz;
  #endif
#endif`;
THREE.ShaderChunk.fog_pars_fragment = `
#ifdef USE_FOG
  uniform vec3 fogColor; varying float vFogDepth; varying vec3 vFogWorld;
  #ifdef FOG_EXP2
    uniform float fogDensity;
  #else
    uniform float fogNear; uniform float fogFar;
  #endif
  float mist_h(vec2 p){ return fract(sin(dot(p, vec2(41.3, 289.1))) * 45758.5453); }
  float mist_n(vec2 p){ vec2 i = floor(p), q = fract(p); q = q * q * (3.0 - 2.0 * q);
    return mix(mix(mist_h(i), mist_h(i + vec2(1,0)), q.x), mix(mist_h(i + vec2(0,1)), mist_h(i + vec2(1,1)), q.x), q.y); }
#endif`;
THREE.ShaderChunk.fog_fragment = `
#ifdef USE_FOG
  #ifdef FOG_EXP2
    float fogFactor = 1.0 - exp(- fogDensity * fogDensity * vFogDepth * vFogDepth);
  #else
    float fogFactor = smoothstep(fogNear, fogFar, vFogDepth);
  #endif
  vec2 mistP = vFogWorld.xz * 0.016;
  float mistN = mist_n(mistP) * 0.62 + mist_n(mistP * 2.7 + 3.1) * 0.38;
  float mistHt = 1.6 + 3.4 * mistN;
  float mistA = exp(- max(vFogWorld.y + 0.4, 0.0) / mistHt) * smoothstep(10.0, 120.0, vFogDepth) * (0.08 + 0.36 * mistN);
  fogFactor = 1.0 - (1.0 - fogFactor) * (1.0 - clamp(mistA, 0.0, 0.8));
  gl_FragColor.rgb = mix(gl_FragColor.rgb, fogColor, fogFactor);
#endif`;

// ---- painterly patch for Lambert materials ----
// freq/amt: brush-patch colour variation; trans: back-lit translucency (leaves, reeds);
// rim: soft sun-tinted rim; inner: darken back faces (boat hull interior).
export function paint(mat, o = {}) {
  const freq = o.freq ?? 0.35, amt = o.amt ?? 0.12, trans = o.trans ?? 0.0, rim = o.rim ?? 0.0, inner = o.inner ?? 0.0;
  mat.onBeforeCompile = (sh) => {
    sh.uniforms.pSunDir = PU.sunDir; sh.uniforms.pSunCol = PU.sunCol; sh.uniforms.pShadow = PU.shadowTint;
    sh.fragmentShader = 'uniform vec3 pSunDir; uniform vec3 pSunCol; uniform vec3 pShadow;\n' + NOISE3 +
      sh.fragmentShader.replace('#include <opaque_fragment>', `
      #ifdef USE_FOG
      {
        vec3 wp = vFogWorld;
        float pn = pn_n(wp * ${f(freq)}) * 0.6 + pn_n(wp * ${f(freq * 3.3)} + 4.1) * 0.4;
        outgoingLight *= ${f(1 - amt)} + ${f(2 * amt)} * pn;
        float lumP = dot(outgoingLight, vec3(0.299, 0.587, 0.114));
        outgoingLight = mix(outgoingLight * pShadow, outgoingLight, smoothstep(0.02, 0.45, lumP));
        vec3 vdP = normalize(wp - cameraPosition);
        float backP = pow(max(dot(vdP, pSunDir), 0.0), 5.0);
        outgoingLight += diffuseColor.rgb * pSunCol * backP * ${f(trans)};
        float rimP = pow(1.0 - abs(dot(normalize(normal), normalize(vViewPosition))), 3.0);
        outgoingLight += pSunCol * rimP * ${f(rim)} * (0.08 + 0.92 * backP);
        if (!gl_FrontFacing) outgoingLight *= ${f(1 - inner)};
      }
      #endif
      #include <opaque_fragment>`);
  };
  mat.customProgramCacheKey = () => `paint:${freq}:${amt}:${trans}:${rim}:${inner}`;
  return mat;
}
