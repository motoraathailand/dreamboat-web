// Procedural world v2: river path, terrain, sky, water, painted trees, reeds, grass, bridge, lanterns, petals. © MOTOR AA
import * as THREE from 'three';
import { Reflector } from 'three/addons/objects/Reflector.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { paint, PU } from './paint.js?v=2';

// ---------- small deterministic RNG ----------
export function rng(seed = 1) { let s = seed >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }
const R = rng(20261111);
const rr = (a, b) => a + (b - a) * R();

// ---------- value noise (CPU) ----------
function hash2(x, y) { const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return s - Math.floor(s); }
function vnoise(x, y) {
  const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  const a = hash2(xi, yi), b = hash2(xi + 1, yi), c = hash2(xi, yi + 1), d = hash2(xi + 1, yi + 1);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
function fbm(x, y) { let f = 0, a = 0.5; for (let i = 0; i < 4; i++) { f += a * vnoise(x, y); x *= 2.03; y *= 2.03; a *= 0.5; } return f; }

// ---------- river path ----------
export function makePath() {
  const pts = [];
  const N = 11, step = 52;
  for (let i = 0; i < N; i++) {
    const z = -i * step;
    const x = 26 * Math.sin(i * 0.85 + 0.3) + 10 * Math.sin(i * 1.9);
    pts.push(new THREE.Vector3(i === 0 ? 0 : x, 0, z));
  }
  pts[0].x = pts[1].x * 0.3;
  const curve = new THREE.CatmullRomCurve3(pts, false, 'centripetal');
  curve.arcLengthDivisions = 1000;
  const L = curve.getLength();
  const samples = [];
  for (let i = 0; i <= 400; i++) { const p = curve.getPointAt(i / 400); samples.push([p.x, p.z]); }
  return { curve, L, samples };
}
export const riverHalfWidth = (u) => 12.5 + 3.5 * Math.sin(u * 17.0 + 1.0) + (u > 0.6 && u < 0.8 ? -2.5 * Math.sin((u - 0.6) / 0.2 * Math.PI) : 0) + (u > 0.85 ? (u - 0.85) * 120 : 0);

// distance (2D) from point to sampled polyline, returns [dist, u] — coarse-to-fine for speed
function segDist(samples, i, x, z) {
  const ax = samples[i][0], az = samples[i][1], bx = samples[i + 1][0], bz = samples[i + 1][1];
  const dx = bx - ax, dz = bz - az; const l2 = dx * dx + dz * dz;
  let t = ((x - ax) * dx + (z - az) * dz) / l2; t = t < 0 ? 0 : t > 1 ? 1 : t;
  const px = ax + dx * t - x, pz = az + dz * t - z; return [px * px + pz * pz, t];
}
function distToPath(samples, x, z) {
  const n = samples.length - 1;
  let best = 1e18, bi = 0;
  for (let i = 0; i < n; i += 6) { const dx = samples[i][0] - x, dz = samples[i][1] - z; const d = dx * dx + dz * dz; if (d < best) { best = d; bi = i; } }
  best = 1e18; let bu = 0;
  for (let i = Math.max(0, bi - 14); i < Math.min(n, bi + 14); i++) { const [d, t] = segDist(samples, i, x, z); if (d < best) { best = d; bu = (i + t) / n; } }
  return [Math.sqrt(best), bu];
}

export function terrainHeight(path, x, z) {
  const [d, u] = distToPath(path.samples, x, z);
  const W = riverHalfWidth(u);
  const bank = THREE.MathUtils.smoothstep(d, W - 3, W + 9);
  const hills = THREE.MathUtils.smoothstep(d, W + 15, W + 110);
  const n = fbm(x * 0.018, z * 0.018);
  return -3.0 + bank * (4.2 + n * 2.5) + hills * (n * 34 + 6) + (fbm(x * 0.09, z * 0.09) - 0.5) * 1.4 * bank;
}

export const TB = { minX: -230, maxX: 230, minZ: 150 }; // terrain bounds (maxZ depends on path)

// ---------- terrain mesh (smooth, painted) ----------
export function makeTerrain(path, quality) {
  const minX = TB.minX, maxX = TB.maxX, minZ = TB.minZ, maxZ = -path.L - 220;
  const hiRes = quality !== 'low';
  const sx = hiRes ? 150 : 110, sz = hiRes ? 250 : 180;
  const g = new THREE.PlaneGeometry(maxX - minX, minZ - maxZ, sx, sz);
  g.rotateX(-Math.PI / 2);
  g.translate((minX + maxX) / 2, 0, (minZ + maxZ) / 2);
  const pos = g.attributes.position; const col = new Float32Array(pos.count * 3);
  const cWet = new THREE.Color('#4a3a32'), cSand = new THREE.Color('#a4865c'), cGold = new THREE.Color('#a89a4c'), cGrass = new THREE.Color('#7c8a42'),
    cGrass2 = new THREE.Color('#5a7838'), cHill = new THREE.Color('#4c6238'), cHigh = new THREE.Color('#7e6c58'), cRust = new THREE.Color('#9a6a3c'), tmp = new THREE.Color();
  const cellX = (maxX - minX) / sx, cellZ = (minZ - maxZ) / sz;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i) + (hash2(i, 3) - 0.5) * cellX * 0.5, z = pos.getZ(i) + (hash2(i, 7) - 0.5) * cellZ * 0.5;
    pos.setX(i, x); pos.setZ(i, z);
    const h = terrainHeight(path, x, z); pos.setY(i, h);
    const nA = fbm(x * 0.05, z * 0.05), nB = fbm(x * 0.013 + 9, z * 0.013);
    if (h < 0.15) tmp.copy(cWet);
    else if (h < 0.9) tmp.copy(cWet).lerp(cSand, THREE.MathUtils.smoothstep(h, 0.15, 0.6)).lerp(cGold, THREE.MathUtils.smoothstep(h, 0.55, 0.9));
    else if (h < 9) tmp.copy(cGold).lerp(cGrass, THREE.MathUtils.smoothstep(h, 0.9, 2.6)).lerp(cGrass2, nA * 0.9).lerp(cRust, Math.max(0, nB - 0.55) * 1.6);
    else tmp.copy(cHill).lerp(cHigh, THREE.MathUtils.smoothstep(h, 14, 34)).lerp(cRust, Math.max(0, nB - 0.6) * 1.2);
    const v = 0.93 + hash2(i, 11) * 0.12; tmp.multiplyScalar(v);
    col[i * 3] = tmp.r; col[i * 3 + 1] = tmp.g; col[i * 3 + 2] = tmp.b;
  }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  g.computeVertexNormals();
  const m = new THREE.Mesh(g, paint(new THREE.MeshLambertMaterial({ vertexColors: true }), { freq: 0.09, amt: 0.16, rim: 0.0 }));
  m.name = 'terrain'; m.receiveShadow = true;
  return m;
}

// terrain height as a texture for the water shader (shallows, shore foam, soft edge)
export function makeHeightTex(path, quality) {
  const W = quality === 'low' ? 160 : 256, H = quality === 'low' ? 320 : 512;
  const minX = TB.minX, maxX = TB.maxX, minZ = TB.minZ, maxZ = -path.L - 220;
  const data = new Uint8Array(W * H * 4);
  for (let j = 0; j < H; j++) {
    const z = minZ + (maxZ - minZ) * (j + 0.5) / H;
    for (let i = 0; i < W; i++) {
      const x = minX + (maxX - minX) * (i + 0.5) / W;
      const h = terrainHeight(path, x, z);
      const v = Math.max(0, Math.min(255, Math.round((h + 3) / 5 * 255)));
      const k = (j * W + i) * 4; data[k] = v; data[k + 1] = v; data[k + 2] = v; data[k + 3] = 255;
    }
  }
  const tex = new THREE.DataTexture(data, W, H, THREE.RGBAFormat);
  tex.magFilter = THREE.LinearFilter; tex.minFilter = THREE.LinearFilter; tex.needsUpdate = true;
  return { tex, bounds: new THREE.Vector4(minX, minZ, maxX - minX, maxZ - minZ) };
}

// distant layered ridges with aerial perspective (painted silhouettes)
export function makeMountains(path) {
  const group = new THREE.Group(); group.name = 'mountains';
  const cz = -path.L / 2; const layers = [];
  const LAYERS = [{ r: 360, h: 55, seed: 1 }, { r: 470, h: 95, seed: 5 }, { r: 600, h: 150, seed: 9 }];
  LAYERS.forEach((Ly, li) => {
    const seg = 360, pos = [], vv = [], idx = [];
    for (let i = 0; i <= seg; i++) {
      const a = (i / seg) * Math.PI * 2;
      const ca = Math.cos(a), sa = Math.sin(a);
      // ridge profile: big soft swells + finer painted ridgelines
      let h = 0, amp = 1, fq = 1;
      for (let o = 0; o < 6; o++) { h += amp * (vnoise(ca * 2.6 * fq + Ly.seed * 7.1, sa * 2.6 * fq + Ly.seed) - 0.35); amp *= 0.55; fq *= 2.2; }
      h = Math.max(0.12, h) * Ly.h + 8;
      const x = ca * Ly.r * 0.78, z = cz + sa * Ly.r * 1.3;
      pos.push(x, -20, z, x, h, z); vv.push(0, 1);
      if (i < seg) { const k = i * 2; idx.push(k, k + 1, k + 2, k + 1, k + 3, k + 2); }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.setAttribute('vv', new THREE.Float32BufferAttribute(vv, 1));
    geo.setIndex(idx);
    const mat = new THREE.ShaderMaterial({
      uniforms: { col: { value: new THREE.Color() }, haze: { value: new THREE.Color() }, rim: { value: new THREE.Color() }, sunDir: PU.sunDir },
      side: THREE.DoubleSide, fog: false, depthWrite: true, transparent: true,
      vertexShader: `attribute float vv; varying float vV; varying vec3 vW; void main(){ vV = vv; vW = (modelMatrix * vec4(position,1.0)).xyz; gl_Position = projectionMatrix * viewMatrix * vec4(vW, 1.0); }`,
      fragmentShader: `uniform vec3 col, haze, rim, sunDir; varying float vV; varying vec3 vW;
        float h21(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7)))*43758.5453); }
        float n2(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.-2.*f); return mix(mix(h21(i),h21(i+vec2(1,0)),f.x), mix(h21(i+vec2(0,1)),h21(i+vec2(1,1)),f.x), f.y); }
        void main(){
          float ang = atan(vW.z, vW.x);
          float strokes = n2(vec2(ang * 60.0, vW.y * 0.08)) * 0.6 + n2(vec2(ang * 180.0, vW.y * 0.25)) * 0.4;
          float t = smoothstep(0.0, 0.85, vV + (strokes - 0.5) * 0.18);
          vec3 c = mix(haze, col, t * 0.85);
          vec3 dir = normalize(vec3(vW.x, 0.0, vW.z - ${(-path.L / 2).toFixed(1)}));
          float lit = pow(max(dot(normalize(vec3(sunDir.x, 0.0, sunDir.z)), dir), 0.0), 3.0);
          c += rim * lit * smoothstep(0.55, 1.0, vV) * 0.35;
          c *= 0.96 + 0.08 * strokes;
          float soft = 1.0 - smoothstep(0.9, 1.0, vV + (strokes - 0.5) * 0.06) * 0.75;
          gl_FragColor = vec4(c, soft);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
        }`,
    });
    const mesh = new THREE.Mesh(geo, mat); mesh.renderOrder = -5; mesh.frustumCulled = false;
    group.add(mesh); layers.push({ mesh, depth: li / (LAYERS.length - 1) });
  });
  group.userData.layers = layers;
  return group;
}

// ---------- sky ----------
export function makeSky() {
  const uniforms = {
    top: { value: new THREE.Color() }, mid: { value: new THREE.Color() }, horizon: { value: new THREE.Color() }, ground: { value: new THREE.Color() },
    cloudColor: { value: new THREE.Color() }, cloudShadow: { value: new THREE.Color() },
    sunDir: { value: new THREE.Vector3(0, 0.1, -1) }, sunColor: { value: new THREE.Color() }, sunSize: { value: 1 }, sunGlow: { value: 1 },
    moon: { value: 0 }, stars: { value: 0 }, time: { value: 0 },
  };
  const mat = new THREE.ShaderMaterial({
    uniforms, side: THREE.BackSide, depthWrite: false, fog: false,
    vertexShader: `varying vec3 vDir; void main(){ vDir = normalize(position); vec4 p = projectionMatrix * modelViewMatrix * vec4(position,1.0); gl_Position = p.xyww; }`,
    fragmentShader: `
      uniform vec3 top, mid, horizon, ground, cloudColor, cloudShadow, sunColor, sunDir; uniform float sunSize, sunGlow, moon, stars, time;
      varying vec3 vDir;
      float h21(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7)))*43758.5453); }
      float n2(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.-2.*f); return mix(mix(h21(i),h21(i+vec2(1,0)),f.x), mix(h21(i+vec2(0,1)),h21(i+vec2(1,1)),f.x), f.y); }
      float fbm(vec2 p){ float s=0., a=.5; for(int i=0;i<5;i++){ s+=a*n2(p); p=p*2.07+vec2(1.7,9.2); a*=.5; } return s; }
      void main(){
        vec3 d = normalize(vDir);
        float y = d.y;
        vec3 col = y > 0.0 ? mix(horizon, mid, smoothstep(0.0, 0.24, y)) : mix(horizon, ground, smoothstep(0.0, -0.15, y));
        col = mix(col, top, smoothstep(0.2, 0.8, y));
        float sd = max(dot(d, sunDir), 0.0);
        // warm halo, wide along the horizon
        float glow = pow(sd, 5.0) * 0.42 + pow(sd, 36.0) * 0.75 + pow(sd, 400.0) * 0.9;
        float hband = exp(-abs(y - 0.02) * 14.0);
        col += sunColor * glow * sunGlow * (0.55 + 0.45 * smoothstep(0.3, -0.05, y));
        col += sunColor * hband * pow(sd, 2.0) * 0.25 * sunGlow;
        // painterly clouds: domain-warped, horizontally stretched brush strokes
        vec2 cp = d.xz / max(y + 0.12, 0.05);
        vec2 q = vec2(cp.x * 0.33 + time * 0.004, cp.y * 1.05);
        vec2 wv = vec2(fbm(q * 0.7 + 3.0), fbm(q * 0.7 + 8.0));
        float c = fbm(q + wv * 0.9);
        float stroke = n2(vec2(q.x * 7.0, q.y * 0.9 + wv.x * 3.0));
        c = smoothstep(0.46, 0.78, c + (stroke - 0.5) * 0.06) * smoothstep(0.015, 0.12, y) * (1.0 - smoothstep(0.5, 0.88, y));
        float lit = clamp(0.45 + 0.85 * pow(sd, 3.0) + (wv.y - 0.5) * 0.4, 0.0, 1.0);
        vec3 cc = mix(cloudShadow, cloudColor, lit);
        float edge = smoothstep(0.0, 0.35, c) * (1.0 - smoothstep(0.35, 0.9, c));
        cc += sunColor * (pow(sd, 10.0) * 0.6 + edge * pow(sd, 4.0) * 0.9) * sunGlow;
        col = mix(col, cc, c * 0.86);
        // sun disc (soft painted edge)
        float disc = smoothstep(0.9990 - 0.0004 * sunSize, 0.99965, sd) * sunSize;
        col += sunColor * disc * 3.2 * (1.0 - c * 0.65);
        if (stars > 0.01 && y > 0.05) {
          vec2 sp = d.xz / (y + 0.3) * 160.0;
          vec2 id = floor(sp); float r = h21(id);
          float tw = 0.6 + 0.4 * sin(time * (1.0 + r * 3.0) + r * 40.0);
          float s = step(0.985, r) * smoothstep(0.42, 0.0, length(fract(sp) - 0.5)) * tw;
          col += vec3(1.0, 0.92, 0.8) * s * stars * smoothstep(0.05, 0.3, y) * (1.0 - c);
          // faint milky band
          float band = exp(-pow(dot(d, normalize(vec3(0.6, 0.5, 0.3))) * 3.2, 2.0)) * fbm(d.xz * 6.0);
          col += vec3(0.55, 0.45, 0.8) * band * 0.12 * stars * (1.0 - c);
        }
        if (moon > 0.01) {
          vec3 md = normalize(vec3(0.55, 0.42, -0.72));
          float m = dot(d, md);
          float disc2 = smoothstep(0.99955, 0.9997, m);
          vec3 mc = vec3(1.0, 0.95, 0.85) * (0.85 + 0.15 * n2(d.xy * 900.0));
          col = mix(col, mc * 2.2, disc2 * moon);
          col += vec3(0.7, 0.65, 0.95) * (pow(max(m, 0.0), 60.0) * 0.35 + pow(max(m, 0.0), 8.0) * 0.08) * moon;
        }
        col += (h21(gl_FragCoord.xy) - 0.5) / 255.0; // dither
        gl_FragColor = vec4(col, 1.0);
      }`,
  });
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(1000, 48, 24), mat);
  mesh.frustumCulled = false; mesh.renderOrder = -10; mesh.name = 'sky';
  return mesh;
}

// ---------- water ----------
export const RIPPLES = 12;
export function makeWater(texSize, hmap) {
  const shader = {
    name: 'DreamWater',
    uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, {
      color: { value: null }, tDiffuse: { value: null }, textureMatrix: { value: null },
      time: { value: 0 }, deep: { value: new THREE.Color() }, tint: { value: new THREE.Color() }, shallow: { value: new THREE.Color('#6a5040') },
      sunDir: { value: new THREE.Vector3() }, sunColor: { value: new THREE.Color() },
      ripples: { value: Array.from({ length: RIPPLES }, () => new THREE.Vector4(0, 0, -100, 0)) },
      boat: { value: new THREE.Vector4() }, rq: { value: 1 }, hTex: { value: null }, hB: { value: new THREE.Vector4() }, foamCol: { value: new THREE.Color(1, 0.9, 0.8) },
    }]),
    vertexShader: `
      uniform mat4 textureMatrix; varying vec4 vUv; varying vec3 vWorld;
      #include <fog_pars_vertex>
      void main(){
        vec3 transformed = position;
        vUv = textureMatrix * vec4(position, 1.0);
        vWorld = (modelMatrix * vec4(position, 1.0)).xyz;
        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        gl_Position = projectionMatrix * mvPosition;
        #include <fog_vertex>
      }`,
    fragmentShader: `
      uniform sampler2D tDiffuse, hTex; uniform float time, rq; uniform vec3 deep, tint, shallow, sunDir, sunColor, color, foamCol;
      uniform vec4 ripples[${RIPPLES}]; uniform vec4 boat, hB;
      varying vec4 vUv; varying vec3 vWorld;
      #include <common>
      #include <fog_pars_fragment>
      float h21(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7)))*43758.5453); }
      float n2(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.-2.*f); return mix(mix(h21(i),h21(i+vec2(1,0)),f.x), mix(h21(i+vec2(0,1)),h21(i+vec2(1,1)),f.x), f.y); }
      vec2 dn(vec2 q){ float a = n2(q); return vec2(n2(q + vec2(0.2, 0.0)) - a, n2(q + vec2(0.0, 0.2)) - a) * 5.0; }
      vec2 wave(vec2 p, vec2 dir, float fq, float sp, float amp){ float ph = dot(p, dir) * fq + time * sp; return dir * cos(ph) * amp * fq; }
      void main(){
        vec2 p = vWorld.xz;
        float dist = length(vWorld - cameraPosition);
        float calm = exp(-dist / 90.0);
        // terrain below → depth
        vec2 huv = vec2((p.x - hB.x) / hB.z, (p.y - hB.y) / hB.w);
        float th = texture2D(hTex, huv).r * 5.0 - 3.0;
        float depth = max(-th, 0.0);
        vec2 g = vec2(0.0);
        g += wave(p, normalize(vec2(0.3, 1.0)), 0.55, 1.1, 0.06);
        g += wave(p, normalize(vec2(-0.8, 0.6)), 0.9, 1.6, 0.035);
        g += wave(p, normalize(vec2(0.9, 0.2)), 1.7, 2.3, 0.018);
        g += wave(p, normalize(vec2(-0.2, -1.0)), 2.9, 3.1, 0.009);
        float nA = n2(p * 0.35 + time * 0.05), nB = n2(p * 0.35 + vec2(3.1, 7.7) - time * 0.04);
        g += (vec2(nA, nB) - 0.5) * 0.08;
        // fine "normal map" ripples (fade with distance to avoid shimmer)
        if (rq > 0.5) {
          g += dn(p * 1.4 + time * vec2(0.16, 0.07)) * 0.022 * calm;
          g += dn(p * 3.3 - time * vec2(0.09, 0.21)) * 0.012 * calm;
        }
        for (int i = 0; i < ${RIPPLES}; i++) {
          vec4 r = ripples[i]; float age = time - r.z;
          if (age < 0.0 || age > 4.5) continue;
          vec2 dv = p - r.xy; float d = length(dv) + 1e-4;
          float R = 0.3 + age * 1.9;
          float env = exp(-pow((d - R) * 1.6, 2.0)) * exp(-age * 0.9) * r.w;
          g += (dv / d) * cos((d - R) * 7.0) * env * 0.55;
        }
        vec2 fw = vec2(sin(boat.z), cos(boat.z)) * -1.0;
        vec2 rel = p - boat.xy; float along = dot(rel, fw); vec2 side = vec2(-fw.y, fw.x); float lat = dot(rel, side);
        {
          float behind = -along;
          if (behind > -1.5 && behind < 26.0) {
            float arm = abs(lat) - (behind + 1.5) * 0.36;
            float env = exp(-arm * arm * 1.4) * exp(-behind * 0.11) * boat.w;
            g += side * sign(lat) * cos(arm * 6.0 - time * 5.0) * env * 0.35;
            g += fw * sin(behind * 3.0 - time * 6.0) * exp(-lat*lat*0.9) * exp(-behind*0.25) * boat.w * 0.12;
          }
        }
        g *= mix(0.2, 1.35, calm);
        vec3 N = normalize(vec3(-g.x, 1.0, -g.y));
        vec3 V = normalize(cameraPosition - vWorld);
        vec4 uv = vUv; uv.xy += g * uv.w * 0.05;
        vec3 refl = texture2DProj(tDiffuse, uv).rgb;
        if (rq > 0.5) {
          // soft, vertically stretched reflection blur
          float b = (0.0035 + length(g) * 0.012) * uv.w;
          refl = refl * 0.32
            + texture2DProj(tDiffuse, uv + vec4(0.0,  b * 1.8, 0.0, 0.0)).rgb * 0.19
            + texture2DProj(tDiffuse, uv + vec4(0.0, -b * 1.8, 0.0, 0.0)).rgb * 0.19
            + texture2DProj(tDiffuse, uv + vec4( b * 0.7, 0.0, 0.0, 0.0)).rgb * 0.15
            + texture2DProj(tDiffuse, uv + vec4(-b * 0.7, 0.0, 0.0, 0.0)).rgb * 0.15;
        }
        float fres = 0.36 + 0.64 * pow(1.0 - max(dot(N, V), 0.0), 3.0);
        vec3 base = deep * (0.8 + 0.4 * n2(p * 0.08));
        base = mix(shallow, base, smoothstep(0.0, 2.2, depth));
        vec3 col = mix(base, refl * mix(vec3(1.0), tint, 0.18), fres);
        float streak = n2(vec2(p.x * 0.04, p.y * 0.9) + vec2(0.0, time * 0.05));
        col *= 0.93 + 0.12 * streak;
        // soft contact shadow under the hull
        float bs = exp(-(lat * lat / 0.7 + along * along / 5.0));
        col *= 1.0 - 0.38 * bs;
        // sun highlight + glitter
        vec3 H = normalize(sunDir + V);
        float nh = max(dot(N, H), 0.0);
        float sunUp = smoothstep(-0.05, 0.05, sunDir.y);
        float spec = pow(nh, 220.0) * 2.4 + pow(nh, 30.0) * 0.12;
        if (rq > 0.5) {
          vec2 gp = p * 5.5 + g * 12.0; vec2 gi = floor(gp); float gr = h21(gi);
          float tw = 0.5 + 0.5 * sin(time * (2.0 + gr * 6.0) + gr * 40.0);
          float sp = step(0.8, gr) * tw * smoothstep(0.35, 0.0, length(fract(gp) - 0.5));
          spec += sp * pow(nh, 24.0) * 1.6 * calm * calm;
        }
        col += sunColor * spec * sunUp;
        // shoreline foam: thin broken line that laps slowly
        float fn = n2(p * 0.9 + time * 0.08) * 0.6 + n2(p * 2.7 - time * 0.11) * 0.4;
        float lap = 0.5 + 0.5 * sin(depth * 22.0 - time * 1.3 + fn * 6.0);
        float foam = smoothstep(0.55, 0.05, depth) * smoothstep(0.35, 0.75, fn * 0.6 + lap * 0.55) * (1.0 - smoothstep(0.0, 0.03, -th - 0.55));
        col = mix(col, foamCol, foam * 0.5);
        float alpha = smoothstep(0.0, 0.22, depth);
        gl_FragColor = vec4(col, alpha);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
        #include <fog_fragment>
      }`,
  };
  const geo = new THREE.PlaneGeometry(1800, 1800, 1, 1);
  const water = new Reflector(geo, { textureWidth: texSize.x, textureHeight: texSize.y, color: 0xffffff, shader, clipBias: 0.003, multisample: 0 });
  water.material.fog = true;
  water.material.transparent = true;
  water.material.uniforms.hTex.value = hmap.tex; water.material.uniforms.hB.value.copy(hmap.bounds);
  water.renderOrder = -1;
  water.rotation.x = -Math.PI / 2;
  water.name = 'water';
  return water;
}

// ---------- painted trees ----------
// canopy geometries are clumps of noise-displaced blobs with soft "spherical" normals,
// which read as round painted brush masses instead of faceted low-poly cones.
function blobClump(seed, blobs, opts = {}) {
  const r = rng(seed);
  const parts = [];
  const centers = [];
  const H = opts.height ?? 1.6, spread = opts.spread ?? 0.75;
  for (let b = 0; b < blobs; b++) {
    const t = blobs === 1 ? 0.5 : b / (blobs - 1);
    const ang = r() * Math.PI * 2, rad = spread * (0.35 + 0.65 * r()) * Math.sin(Math.PI * (0.25 + 0.75 * t));
    const cy = (opts.column ? t * H : 0.25 + t * H * 0.7 + r() * 0.2);
    const size = (opts.size ?? 0.62) * (0.7 + 0.5 * r()) * (opts.column ? 1 - t * 0.45 : 1 - Math.abs(t - 0.45) * 0.5);
    centers.push([Math.cos(ang) * rad, cy, Math.sin(ang) * rad, size]);
  }
  if (!opts.column) centers.push([0, H * 0.55, 0, (opts.size ?? 0.62) * 1.25]);
  let cyAvg = 0; centers.forEach(c => cyAvg += c[1]); cyAvg /= centers.length;
  for (const [cx, cy, cz, s] of centers) {
    const g = new THREE.IcosahedronGeometry(1, opts.detail ?? 1);
    const pos = g.attributes.position; const nor = new Float32Array(pos.count * 3); const col = new Float32Array(pos.count * 3);
    for (let i = 0; i < pos.count; i++) {
      let x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
      const n = vnoise(x * 2.1 + seed, z * 2.1 + y * 1.7) - 0.5;
      const k = s * (1 + n * 0.45);
      x = cx + x * k; y = cy + y * k * (opts.squash ?? 0.85); z = cz + z * k;
      pos.setXYZ(i, x, y, z);
      // soft normals: blend blob normal with whole-canopy normal
      const ax = x - cx, ay = y - cy, az = z - cz, bx = x, by = (y - cyAvg) * (opts.column ? 0.4 : 1) , bz = z;
      const la = Math.hypot(ax, ay, az) || 1, lb = Math.hypot(bx, by, bz) || 1;
      let nx = ax / la * 0.45 + bx / lb * 0.55 + 0.0, ny = ay / la * 0.45 + by / lb * 0.55 + 0.25, nz = az / la * 0.45 + bz / lb * 0.55;
      const ln = Math.hypot(nx, ny, nz); nor[i * 3] = nx / ln; nor[i * 3 + 1] = ny / ln; nor[i * 3 + 2] = nz / ln;
      // painted value: darker underside, lighter crown, per-blob jitter
      const v = 0.58 + 0.55 * THREE.MathUtils.smoothstep(y, cy - s, cy + s) * (0.6 + 0.4 * (y / (H + 0.6))) + (hash2(cx * 10, cz * 10) - 0.5) * 0.12;
      col[i * 3] = v; col[i * 3 + 1] = v; col[i * 3 + 2] = v * 0.96;
    }
    g.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    parts.push(g);
  }
  return mergeGeometries(parts);
}
function pineGeo(seed) {
  const r = rng(seed); const parts = [];
  const tiers = 5;
  for (let k = 0; k < tiers; k++) {
    const rad = 0.95 * (1 - k / (tiers + 0.6)), h = 0.95 - k * 0.06, y0 = k * 0.52;
    const g = new THREE.ConeGeometry(rad, h, 11, 2, true);
    const pos = g.attributes.position; const nor = new Float32Array(pos.count * 3); const col = new Float32Array(pos.count * 3);
    for (let i = 0; i < pos.count; i++) {
      let x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
      const a = Math.atan2(z, x); const droop = (y < 0 ? 1 : 0);
      const jag = 1 + (vnoise(a * 2.5 + k * 3 + seed, k) - 0.5) * 0.5 * droop;
      x *= jag; z *= jag; y += droop * (Math.sin(a * 5 + k) * 0.06 - 0.05);
      pos.setXYZ(i, x, y + y0 + h / 2, z);
      const lx = Math.hypot(x, z) || 1; let nx = x / lx * 0.7, ny = 0.75, nz = z / lx * 0.7; const ln = Math.hypot(nx, ny, nz);
      nor[i * 3] = nx / ln; nor[i * 3 + 1] = ny / ln; nor[i * 3 + 2] = nz / ln;
      const v = 0.55 + 0.45 * (y < 0 ? 0.2 : 1) * (0.6 + 0.4 * k / tiers) + (r() - 0.5) * 0.05;
      col[i * 3] = v; col[i * 3 + 1] = v; col[i * 3 + 2] = v;
    }
    g.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    parts.push(g.index ? g.toNonIndexed() : g);
  }
  return mergeGeometries(parts.map(p => p.index ? p.toNonIndexed() : p));
}

export function makeTrees(path, quality) {
  const group = new THREE.Group(); group.name = 'trees';
  const variants = [
    { geo: blobClump(11, 6, { height: 1.7, spread: 0.8 }), kind: 'round' },
    { geo: blobClump(23, 8, { height: 2.0, spread: 1.0, size: 0.55 }), kind: 'round' },
    { geo: blobClump(37, 5, { height: 1.2, spread: 1.15, size: 0.7, squash: 0.7 }), kind: 'round' }, // wide, umbrella-ish
    { geo: blobClump(41, 6, { height: 2.6, spread: 0.18, size: 0.5, column: true, squash: 1.0 }), kind: 'column' }, // cypress / poplar
    { geo: pineGeo(53), kind: 'pine' },
  ].map(v => { v.geo = v.geo.index ? v.geo.toNonIndexed() : v.geo; return v; });
  const leafMat = paint(new THREE.MeshLambertMaterial({ vertexColors: true }), { freq: 1.3, amt: 0.14, trans: 0.55, rim: 0.35 });
  const trunkGeo = new THREE.CylinderGeometry(0.09, 0.2, 1, 7, 3); trunkGeo.translate(0, 0.5, 0);
  { const p = trunkGeo.attributes.position; for (let i = 0; i < p.count; i++) { const y = p.getY(i); p.setX(i, p.getX(i) + Math.sin(y * 3.0) * 0.05); } trunkGeo.computeVertexNormals(); }
  const trunkMat = paint(new THREE.MeshLambertMaterial({ color: '#4a3226' }), { freq: 2.0, amt: 0.15 });
  const N = quality === 'low' ? 210 : quality === 'mid' ? 310 : 360;
  const meshes = variants.map(v => { const im = new THREE.InstancedMesh(v.geo, leafMat, N); im.count = 0; im.castShadow = true; im.receiveShadow = false; return im; });
  const trunks = new THREE.InstancedMesh(trunkGeo, trunkMat, N); trunks.castShadow = true;
  let nt = 0;
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), p = new THREE.Vector3(), col = new THREE.Color();
  const warm = ['#6a8a3c', '#88923e', '#a8963c', '#c08a3a', '#b8683a', '#9a5236', '#7a9a4a', '#5e8040'];
  const cool = ['#3e6a4a', '#4a6e3e', '#355e48'];
  const up = new THREE.Vector3(0, 1, 0);
  for (let i = 0; i < N; i++) {
    const u = R();
    const pt = path.curve.getPointAt(u), tg = path.curve.getTangentAt(u);
    const side = R() < 0.5 ? -1 : 1;
    const W = riverHalfWidth(u);
    const off = W + 4 + Math.pow(R(), 1.5) * 85;
    const x = pt.x + tg.z * side * off, z = pt.z - tg.x * side * off;
    const h = terrainHeight(path, x, z);
    if (h < 0.5) continue;
    // keep the bridge abutments clear
    if (Math.abs(u - 0.72) < 0.012 && off < W + 16) continue;
    const pick = R();
    const vi = pick < 0.3 ? 0 : pick < 0.52 ? 1 : pick < 0.64 ? 2 : pick < 0.8 ? 3 : 4;
    const scale = rr(1.5, 3.1) * (off > W + 40 ? 1.35 : 1);
    const trunkH = scale * (vi === 3 ? rr(0.35, 0.55) : vi === 4 ? rr(0.4, 0.6) : rr(0.75, 1.2));
    q.setFromAxisAngle(up, R() * 6.28);
    p.set(x, h - 0.25, z); s.set(scale * 0.55, trunkH + scale * 0.5, scale * 0.55);
    trunks.setMatrixAt(nt++, m.compose(p, q, s));
    if (vi === 4 || vi === 3) col.set(cool[Math.floor(R() * cool.length)]); else col.set(warm[Math.floor(R() * warm.length)]);
    col.multiplyScalar(rr(0.85, 1.12));
    const im = meshes[vi];
    const cs = vi === 3 ? scale * 0.9 : scale;
    p.set(x, h + trunkH * 0.92, z); s.set(cs * rr(0.9, 1.15), cs * rr(0.9, 1.15), cs * rr(0.9, 1.15));
    im.setMatrixAt(im.count, m.compose(p, q, s)); im.setColorAt(im.count, col); im.count++;
  }
  trunks.count = nt;
  meshes.forEach(im => { if (im.instanceColor) im.instanceColor.needsUpdate = true; group.add(im); });
  group.add(trunks);
  return group;
}

// ---------- reeds, cattails & grass (swaying) ----------
function bladeGeo(seg, width, bendAmt, darkBase, head) {
  const pos = [], colr = [], idx = [];
  for (let i = 0; i <= seg; i++) {
    const t = i / seg, w = width * (1 - t) + 0.004;
    const bend = t * t * bendAmt;
    pos.push(-w, t, bend, w, t, bend);
    const c = new THREE.Color(darkBase).lerp(new THREE.Color('#ffffff'), Math.pow(t, 0.8));
    colr.push(c.r, c.g, c.b, c.r, c.g, c.b);
    if (i < seg) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
  }
  let geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('color', new THREE.Float32BufferAttribute(colr, 3));
  geo.setIndex(idx);
  if (head) {
    // cattail: brown velvet head near the top of a straight stem
    const hg = new THREE.CylinderGeometry(0.045, 0.05, 0.2, 6, 1); hg.translate(0, 0.8, 0.0);
    const hc = new Float32Array(hg.attributes.position.count * 3); const cc = new THREE.Color('#4a2a1a');
    for (let i = 0; i < hc.length; i += 3) { hc[i] = cc.r; hc[i + 1] = cc.g; hc[i + 2] = cc.b; }
    hg.setAttribute('color', new THREE.BufferAttribute(hc, 3)); hg.deleteAttribute('uv'); hg.deleteAttribute('normal');
    geo = mergeGeometries([geo, hg]);
  }
  geo.computeVertexNormals();
  return geo;
}
function swayMaterial(uniforms, o) {
  const mat = paint(new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide }), o);
  const inner = mat.onBeforeCompile;
  mat.onBeforeCompile = (sh) => {
    inner(sh);
    sh.uniforms.time = uniforms.time;
    sh.vertexShader = 'uniform float time;\n' + sh.vertexShader.replace('#include <begin_vertex>', `
      vec3 transformed = vec3(position);
      #ifdef USE_INSTANCING
        vec2 ip = instanceMatrix[3].xz;
      #else
        vec2 ip = vec2(0.0);
      #endif
      float gust = 0.6 + 0.4 * sin(time * 0.35 + ip.x * 0.05 + ip.y * 0.04);
      float sway = (sin(time * 1.3 + ip.x * 0.35 + ip.y * 0.21) * 0.6 + sin(time * 2.7 + ip.y * 0.9) * 0.25) * gust;
      transformed.x += sway * position.y * position.y * 0.32;
      transformed.z += sway * position.y * position.y * 0.12;
    `);
  };
  mat.customProgramCacheKey = () => 'sway' + JSON.stringify(o);
  return mat;
}
export function makeReeds(path, uniforms, quality) {
  const group = new THREE.Group(); group.name = 'reeds';
  const lowQ = quality === 'low';
  const reedMat = swayMaterial(uniforms, { freq: 2.0, amt: 0.1, trans: 0.7, rim: 0.25 });
  const reedGeo = bladeGeo(4, 0.07, 0.35, '#3e3a22', false);
  const tailGeo = bladeGeo(4, 0.03, 0.05, '#3e3a22', true);
  const grassGeo = bladeGeo(3, 0.06, 0.25, '#2e3a1a', false);
  const N = lowQ ? 1800 : 2800;
  const reeds = new THREE.InstancedMesh(reedGeo, reedMat, N), tails = new THREE.InstancedMesh(tailGeo, reedMat, Math.floor(N / 5));
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), p = new THREE.Vector3(), col = new THREE.Color(), e = new THREE.Euler();
  const tints = ['#d7b26a', '#c9a35a', '#e6c88a', '#a8a05a', '#b98a4a', '#8e9a52'];
  let n = 0, nt = 0;
  const clusters = lowQ ? 120 : 170;
  for (let c = 0; c < clusters && n < N; c++) {
    const u = R(); const pt = path.curve.getPointAt(u), tg = path.curve.getTangentAt(u);
    const side = R() < 0.5 ? -1 : 1; const W = riverHalfWidth(u);
    const off = W + rr(-3.5, 1.5);
    const cx = pt.x + tg.z * side * off, cz = pt.z - tg.x * side * off;
    const k = 10 + Math.floor(R() * 18);
    for (let j = 0; j < k && n < N; j++) {
      const x = cx + rr(-2.5, 2.5) + tg.x * rr(-4, 4), z = cz + rr(-2.5, 2.5) + tg.z * rr(-4, 4);
      const h = Math.max(terrainHeight(path, x, z), -0.6);
      if (h > 2.5) continue;
      p.set(x, h - 0.1, z); q.setFromEuler(e.set(rr(-0.15, 0.15), R() * 6.28, rr(-0.15, 0.15)));
      if (R() < 0.16 && nt < tails.count) {
        const hh = rr(1.6, 2.6); s.set(1, hh, 1);
        tails.setMatrixAt(nt, m.compose(p, q, s)); tails.setColorAt(nt++, col.set('#d8c890').multiplyScalar(rr(0.85, 1.05)));
      } else {
        const hh = rr(1.4, 3.0); s.set(rr(0.8, 1.4), hh, 1);
        reeds.setMatrixAt(n, m.compose(p, q, s)); reeds.setColorAt(n++, col.set(tints[Math.floor(R() * tints.length)]));
      }
    }
  }
  reeds.count = n; tails.count = nt; reeds.frustumCulled = false; tails.frustumCulled = false;
  group.add(reeds, tails);
  // bank grass tufts
  const G = lowQ ? 2200 : 6500;
  const grass = new THREE.InstancedMesh(grassGeo, swayMaterial(uniforms, { freq: 1.5, amt: 0.12, trans: 0.5, rim: 0.15 }), G);
  const gt = ['#9aa04a', '#b4a650', '#7e9440', '#c8a85a', '#a88a44', '#6e8a3e'];
  let ng = 0;
  for (let c = 0; c < G / 14 && ng < G; c++) {
    const u = R(); const pt = path.curve.getPointAt(u), tg = path.curve.getTangentAt(u);
    const side = R() < 0.5 ? -1 : 1; const W = riverHalfWidth(u);
    const off = W + 1.5 + Math.pow(R(), 1.4) * 26;
    const cx = pt.x + tg.z * side * off, cz = pt.z - tg.x * side * off;
    const base = col.set(gt[Math.floor(R() * gt.length)]).clone();
    for (let j = 0; j < 14 && ng < G; j++) {
      const x = cx + rr(-1.6, 1.6), z = cz + rr(-1.6, 1.6);
      const h = terrainHeight(path, x, z);
      if (h < 0.1 || h > 9) continue;
      p.set(x, h - 0.05, z); q.setFromEuler(e.set(rr(-0.3, 0.3), R() * 6.28, rr(-0.3, 0.3)));
      s.set(rr(0.8, 1.4), rr(0.35, 0.9), 1);
      grass.setMatrixAt(ng, m.compose(p, q, s)); grass.setColorAt(ng++, col.copy(base).multiplyScalar(rr(0.85, 1.12)));
    }
  }
  grass.count = ng; grass.frustumCulled = false; group.add(grass); group.userData.grass = grass;
  return group;
}

// small wildflowers on the banks (static points, normal blending)
export function makeFlowers(path, quality, uniforms) {
  const N = quality === 'low' ? 700 : 1800;
  const pos = [], colr = [], seed = [];
  const pal = [[1.0, 0.86, 0.62], [1.0, 0.62, 0.55], [0.95, 0.95, 0.85], [0.95, 0.7, 0.85], [1.0, 0.78, 0.35]];
  for (let c = 0; c < N / 9; c++) {
    const u = R(); const pt = path.curve.getPointAt(u), tg = path.curve.getTangentAt(u);
    const side = R() < 0.5 ? -1 : 1; const W = riverHalfWidth(u);
    const off = W + 2 + Math.pow(R(), 1.3) * 20;
    const cx = pt.x + tg.z * side * off, cz = pt.z - tg.x * side * off;
    const cl = pal[Math.floor(R() * pal.length)];
    for (let j = 0; j < 9; j++) {
      const x = cx + rr(-1.8, 1.8), z = cz + rr(-1.8, 1.8); const h = terrainHeight(path, x, z);
      if (h < 0.3 || h > 8) continue;
      pos.push(x, h + rr(0.25, 0.6), z); colr.push(cl[0], cl[1], cl[2]); seed.push(R());
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(colr, 3));
  g.setAttribute('seed', new THREE.Float32BufferAttribute(seed, 1));
  const mat = new THREE.ShaderMaterial({
    uniforms: { pr: uniforms.pr, light: { value: new THREE.Color(1, 1, 1) } }, transparent: false, depthWrite: true,
    vertexShader: `attribute vec3 color; attribute float seed; uniform float pr; varying vec3 vC; void main(){ vC = color; vec4 mv = modelViewMatrix * vec4(position, 1.0); gl_Position = projectionMatrix * mv; gl_PointSize = clamp(2.6 * pr * (40.0 / -mv.z) * (0.7 + seed * 0.6), 0.0, 7.0 * pr); }`,
    fragmentShader: `uniform vec3 light; varying vec3 vC; void main(){ vec2 d = gl_PointCoord - 0.5; float r = length(d); if (r > 0.5) discard; float petal = 0.75 + 0.25 * cos(atan(d.y, d.x) * 5.0); if (r > 0.5 * petal) discard; vec3 c = vC * light * (1.05 - r * 0.7); gl_FragColor = vec4(c, 1.0);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
    }`,
  });
  const pts = new THREE.Points(g, mat); pts.name = 'flowers';
  return pts;
}

// lily pads drifting in the shallows
export function makeLilies(path, quality) {
  const shape = new THREE.CircleGeometry(1, 14, 0.35, Math.PI * 2 - 0.35); shape.rotateX(-Math.PI / 2);
  const mat = paint(new THREE.MeshLambertMaterial({ color: '#ffffff', emissive: new THREE.Color('#2c2a14') }), { freq: 3.0, amt: 0.18, rim: 0.5 });
  const N = quality === 'low' ? 160 : 320;
  const pads = new THREE.InstancedMesh(shape, mat, N);
  const bloomGeo = new THREE.ConeGeometry(0.16, 0.22, 6, 1, true); bloomGeo.translate(0, 0.1, 0);
  const blooms = new THREE.InstancedMesh(bloomGeo, new THREE.MeshBasicMaterial({ color: 0xffffff }), 60);
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), p = new THREE.Vector3(), col = new THREE.Color();
  let n = 0, nb = 0;
  for (let c = 0; c < N / 8 && n < N; c++) {
    const u = rr(0.03, 0.97); const pt = path.curve.getPointAt(u), tg = path.curve.getTangentAt(u);
    const side = R() < 0.5 ? -1 : 1; const W = riverHalfWidth(u);
    const off = W - rr(2.0, 5.5);
    const cx = pt.x + tg.z * side * off, cz = pt.z - tg.x * side * off;
    for (let j = 0; j < 8 && n < N; j++) {
      const x = cx + rr(-2.2, 2.2) + tg.x * rr(-3, 3), z = cz + rr(-2.2, 2.2) + tg.z * rr(-3, 3);
      p.set(x, 0.04, z); q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), R() * 6.28); const sc = rr(0.25, 0.55); s.set(sc, 1, sc);
      pads.setMatrixAt(n, m.compose(p, q, s)); pads.setColorAt(n++, col.set(R() < 0.7 ? '#86a450' : '#a0aa52').multiplyScalar(rr(0.85, 1.15)));
      if (R() < 0.12 && nb < 60) {
        p.y = 0.06; s.setScalar(rr(0.8, 1.2));
        blooms.setMatrixAt(nb, m.compose(p, q, s)); blooms.setColorAt(nb++, col.set(R() < 0.6 ? '#ffb0b8' : '#fff0e0'));
      }
    }
  }
  pads.count = n; blooms.count = nb;
  const g = new THREE.Group(); g.add(pads, blooms); g.name = 'lilies';
  g.userData.blooms = blooms;
  return g;
}

// ---------- rocks ----------
export function makeRocks(path) {
  const geo = new THREE.IcosahedronGeometry(1, 1);
  { const p = geo.attributes.position; for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i), z = p.getZ(i); const k = 1 + (vnoise(x * 2 + 5, z * 2 + y) - 0.5) * 0.5; p.setXYZ(i, x * k, y * k, z * k); } geo.computeVertexNormals(); }
  const mesh = new THREE.InstancedMesh(geo, paint(new THREE.MeshLambertMaterial({ color: '#7a6a62' }), { freq: 1.5, amt: 0.2, rim: 0.2 }), 120);
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), p = new THREE.Vector3(), col = new THREE.Color();
  let n = 0;
  for (let i = 0; i < 120; i++) {
    const u = R(); const pt = path.curve.getPointAt(u), tg = path.curve.getTangentAt(u);
    const side = R() < 0.5 ? -1 : 1; const off = riverHalfWidth(u) + rr(-2, 3);
    const x = pt.x + tg.z * side * off, z = pt.z - tg.x * side * off;
    p.set(x, Math.max(terrainHeight(path, x, z), -0.3) - 0.2, z);
    q.setFromEuler(new THREE.Euler(R() * 3, R() * 3, R() * 3)); const sc = rr(0.4, 1.4); s.set(sc * rr(1, 1.6), sc * 0.6, sc);
    mesh.setMatrixAt(n, m.compose(p, q, s)); mesh.setColorAt(n++, col.set(R() < 0.5 ? '#7a6a62' : '#6a6a58').multiplyScalar(rr(0.85, 1.1)));
  }
  mesh.count = n; mesh.castShadow = true; mesh.receiveShadow = true;
  return mesh;
}

// little hut with a warm window and a tiny jetty (sunset zone)
export function makeHut(path, u, side) {
  const g = new THREE.Group();
  const pt = path.curve.getPointAt(u), tg = path.curve.getTangentAt(u);
  const off = riverHalfWidth(u) + 6;
  const x = pt.x + tg.z * side * off, z = pt.z - tg.x * side * off;
  const h = terrainHeight(path, x, z);
  const wood = paint(new THREE.MeshLambertMaterial({ color: '#7a5038' }), { freq: 3.0, amt: 0.18 });
  const dark = paint(new THREE.MeshLambertMaterial({ color: '#4a3226' }), { freq: 3.0, amt: 0.15 });
  const roofM = paint(new THREE.MeshLambertMaterial({ color: '#8a3e2e' }), { freq: 2.5, amt: 0.2, rim: 0.3 });
  const body = new THREE.Mesh(new THREE.BoxGeometry(4, 3, 3.4), wood); body.position.y = 1.5 + 1.2;
  // thatched roof: soft, slightly sagging pyramid with overhang
  const roofG = new THREE.ConeGeometry(3.7, 2.3, 4, 3); { const p = roofG.attributes.position; for (let i = 0; i < p.count; i++) { const yy = p.getY(i); const k = 1 - 0.05 * Math.sin((yy / 2.3 + 0.5) * Math.PI); p.setX(i, p.getX(i) * k); p.setZ(i, p.getZ(i) * k); } roofG.computeVertexNormals(); }
  const r = new THREE.Mesh(roofG, roofM); r.position.y = 4.2 + 1.25; r.rotation.y = Math.PI / 4; r.scale.z = 0.85;
  for (const sx of [-1.6, 1.6]) for (const sz of [-1.3, 1.3]) { const st = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.14, 2.6, 6), dark); st.position.set(sx, 0.0, sz); g.add(st); }
  const winM = new THREE.MeshBasicMaterial({ color: new THREE.Color(4.0, 2.2, 0.9) });
  const win = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.8), winM);
  win.position.set(0, 2.9, 1.71); g.add(body, r, win);
  const win2 = win.clone(); win2.position.set(-0.9, 2.9, -1.71); win2.rotation.y = Math.PI; g.add(win2);
  // frame around window
  const frame = new THREE.Mesh(new THREE.BoxGeometry(1.1, 1.0, 0.05), dark); frame.position.set(0, 2.9, 1.69); g.add(frame);
  // jetty toward the river (+z after lookAt)
  for (let i = 0; i < 6; i++) { const pl = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.12, 0.5), wood); pl.position.set(0, 0.9 - i * 0.12, 2.6 + i * 0.55); g.add(pl); }
  for (const sx of [-0.6, 0.6]) { const pst = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 2.4, 6), dark); pst.position.set(sx, -0.1, 5.2); g.add(pst); }
  g.traverse(o => { if (o.isMesh && o.material !== winM) { o.castShadow = true; o.receiveShadow = true; } });
  g.position.set(x, h - 0.4, z);
  g.lookAt(pt.x, h - 0.4, pt.z);
  return g;
}

// ---------- lantern geometry helpers ----------
const paperGeo = (() => {
  const pts = [];
  for (let i = 0; i <= 6; i++) { const t = i / 6; pts.push(new THREE.Vector2(0.2 + 0.15 * Math.sin(t * Math.PI), -0.31 + t * 0.62)); }
  const g = new THREE.LatheGeometry(pts, 10); return g;
})();
const capGeo = new THREE.CylinderGeometry(0.22, 0.25, 0.07, 12, 1);
const ribGeo = (() => { const g = new THREE.TorusGeometry(0.352, 0.012, 3, 16); g.rotateX(Math.PI / 2); return g; })();

export function lanternMesh(glowColor) {
  const g = new THREE.Group();
  const paper = new THREE.Mesh(paperGeo, new THREE.MeshBasicMaterial({ color: glowColor }));
  const capM = new THREE.MeshLambertMaterial({ color: '#2e1e18' });
  const top = new THREE.Mesh(capGeo, capM); top.position.y = 0.33;
  const bot = new THREE.Mesh(capGeo, capM); bot.position.y = -0.33;
  const rib = new THREE.Mesh(ribGeo, new THREE.MeshBasicMaterial({ color: new THREE.Color(glowColor).multiplyScalar(0.45) }));
  const tassel = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.2, 5), new THREE.MeshLambertMaterial({ color: '#a83a2a' })); tassel.position.y = -0.46; tassel.rotation.x = Math.PI;
  g.add(paper, top, bot, rib, tassel);
  return g;
}

// ---------- wooden bridge ----------
export function makeBridge(path, u) {
  const g = new THREE.Group();
  const pt = path.curve.getPointAt(u), tg = path.curve.getTangentAt(u);
  g.position.set(pt.x, 0, pt.z);
  g.rotation.y = Math.atan2(tg.x, tg.z);
  const half = riverHalfWidth(u) + 9;
  const wood = paint(new THREE.MeshLambertMaterial({ color: '#8a5a3c' }), { freq: 2.2, amt: 0.16, rim: 0.2 });
  const dark = paint(new THREE.MeshLambertMaterial({ color: '#5a3a2a' }), { freq: 2.2, amt: 0.14 });
  const red = paint(new THREE.MeshLambertMaterial({ color: '#a8402e' }), { freq: 2.2, amt: 0.14, rim: 0.25 });
  const arcY = (x) => 3.2 + 5.2 * Math.cos((x / half) * Math.PI * 0.5);
  const planks = Math.round(half * 2 / 0.9);
  const plankGeo = new THREE.BoxGeometry(0.82, 0.22, 3.6);
  const pm = new THREE.InstancedMesh(plankGeo, wood, planks);
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(1, 1, 1), p = new THREE.Vector3(), col = new THREE.Color();
  for (let i = 0; i < planks; i++) {
    const x = -half + (i + 0.5) * (half * 2 / planks), y = arcY(x);
    const slope = (arcY(x + 0.1) - arcY(x - 0.1)) / 0.2;
    p.set(x, y, (R() - 0.5) * 0.08); q.setFromAxisAngle(new THREE.Vector3(0, 0, 1), Math.atan(slope) + (R() - 0.5) * 0.03);
    pm.setMatrixAt(i, m.compose(p, q, s)); pm.setColorAt(i, col.set('#8a5a3c').multiplyScalar(0.8 + R() * 0.35));
  }
  g.add(pm);
  for (const z of [-1.75, 1.75]) {
    const beamPts = [], railPts = [];
    for (let i = 0; i <= 24; i++) { const x = -half + (i / 24) * half * 2; beamPts.push(new THREE.Vector3(x, arcY(x) - 0.35, z)); railPts.push(new THREE.Vector3(x, arcY(x) + 1.15, z)); }
    g.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(beamPts), 48, 0.22, 7), dark));
    g.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(railPts), 48, 0.09, 7), red));
    // lower rail
    const rail2 = railPts.map(v => new THREE.Vector3(v.x, v.y - 0.55, v.z));
    g.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(rail2), 48, 0.05, 5), red));
  }
  const postGeo = new THREE.BoxGeometry(0.16, 1.2, 0.16);
  const postN = 22; const posts = new THREE.InstancedMesh(postGeo, red, postN * 2);
  const capG = new THREE.ConeGeometry(0.15, 0.18, 4); const caps = new THREE.InstancedMesh(capG, dark, postN * 2);
  let n = 0; const lanternSpots = [];
  for (let i = 0; i < postN; i++) {
    const x = -half + 0.6 + (i / (postN - 1)) * (half * 2 - 1.2), y = arcY(x) + 0.55;
    for (const z of [-1.75, 1.75]) { p.set(x, y, z); q.identity(); posts.setMatrixAt(n, m.compose(p, q, s)); p.y += 0.69; caps.setMatrixAt(n++, m.compose(p, q, s)); if (i % 3 === 1) lanternSpots.push(new THREE.Vector3(x, y + 0.6, z)); }
  }
  g.add(posts, caps);
  for (const x of [-half * 0.45, half * 0.45]) for (const z of [-1.4, 1.4]) {
    const hh = arcY(x) + 3;
    const pier = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.44, hh, 8), dark);
    pier.position.set(x, arcY(x) - hh / 2, z); g.add(pier);
  }
  // cross bracing between piers
  for (const x of [-half * 0.45, half * 0.45]) { const br = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.14, 3.2), dark); br.position.set(x, 1.2, 0); g.add(br); }
  const lanterns = [];
  for (const sp of lanternSpots) {
    const L = lanternMesh(new THREE.Color(3.2, 1.25, 0.55));
    L.scale.setScalar(0.75);
    L.position.set(sp.x, sp.y - 1.0, sp.z + Math.sign(sp.z) * 0.35);
    const str = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.5, 3), dark);
    str.position.set(sp.x, sp.y - 0.5, sp.z + Math.sign(sp.z) * 0.35);
    g.add(L, str); lanterns.push(L);
  }
  g.traverse(o => { if (o.isMesh && o.material.isMeshLambertMaterial) { o.castShadow = true; o.receiveShadow = true; } });
  g.userData.lanterns = lanterns;
  g.userData.top = arcY(0);
  return g;
}

// ---------- floating river lanterns (instanced) ----------
export function makeFloatingLanterns(path, from, to, count) {
  const paper = new THREE.InstancedMesh(paperGeo, new THREE.MeshBasicMaterial({ color: 0xffffff }), count);
  const baseG = new THREE.CylinderGeometry(0.36, 0.42, 0.12, 10);
  const base = new THREE.InstancedMesh(baseG, new THREE.MeshLambertMaterial({ color: '#3a2418' }), count);
  const items = [];
  for (let i = 0; i < count; i++) {
    const u = from + (to - from) * Math.pow(R(), 0.62);
    const W = riverHalfWidth(u) - 2.5;
    let lat = rr(-W, W); if (Math.abs(lat) < 2.6) lat = Math.sign(lat || 1) * (2.6 + R() * 3);
    const hue = R();
    const c = hue < 0.6 ? new THREE.Color(2.3, 1.05, 0.42) : hue < 0.85 ? new THREE.Color(2.4, 0.75, 0.45) : new THREE.Color(2.1, 1.5, 0.75);
    paper.setColorAt(i, c);
    items.push({ u, lat, phase: R() * 6.28, speed: rr(0.25, 0.6), scale: rr(0.7, 1.05) });
  }
  return { paper, base, items };
}

// ---------- motes / fireflies / sky lanterns / petals as points ----------
function dotTexture() {
  const cv = document.createElement('canvas'); cv.width = cv.height = 64;
  const ctx = cv.getContext('2d'); const gr = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.2, 'rgba(255,255,255,0.8)'); gr.addColorStop(0.45, 'rgba(255,255,255,0.18)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = gr; ctx.fillRect(0, 0, 64, 64);
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; return t;
}
const DOT = () => (DOT.t ||= dotTexture());

export function makePoints(count, spread, kind, uniforms) {
  const pos = new Float32Array(count * 3), seed = new Float32Array(count);
  for (let i = 0; i < count; i++) { pos[i * 3] = rr(-spread.x, spread.x) + 1000; pos[i * 3 + 1] = rr(spread.y0, spread.y1); pos[i * 3 + 2] = rr(-spread.z, spread.z); seed[i] = R(); }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('seed', new THREE.BufferAttribute(seed, 1));
  const mat = new THREE.ShaderMaterial({
    uniforms: { map: { value: DOT() }, time: uniforms.time, color: { value: new THREE.Color(1, 0.8, 0.4) }, opacity: { value: 1 }, size: { value: kind === 'sky' ? 30 : 3.4 }, pr: uniforms.pr, center: { value: new THREE.Vector3() }, rise: { value: kind === 'sky' ? 1 : 0 }, spread: { value: new THREE.Vector2(spread.x, spread.z) } },
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: `
      attribute float seed; uniform float time, size, pr, rise; uniform vec3 center; uniform vec2 spread; varying float vA;
      void main(){
        vec3 p = position;
        if (rise > 0.5) { p.y = mod(p.y + time * (0.6 + seed * 0.8), 120.0) + 8.0; p.x += sin(time * 0.2 + seed * 30.0) * 3.0; }
        else { p += vec3(sin(time*0.6+seed*40.), sin(time*0.9+seed*17.)*0.6, cos(time*0.5+seed*23.)) * 1.2; }
        vec2 hs = spread; vec2 wp = mod(p.xz - center.xz + hs, 2.0 * hs) - hs + center.xz;
        vec4 mv = viewMatrix * vec4(wp.x, p.y, wp.y, 1.0);
        gl_Position = projectionMatrix * mv;
        float tw = 0.55 + 0.45 * sin(time * (1.5 + seed * 2.5) + seed * 60.0);
        float near = smoothstep(3.0, 11.0, -mv.z);
        vA = (rise > 0.5 ? 0.9 : tw * tw) * near;
        gl_PointSize = min(size * pr * (60.0 / -mv.z) * (0.6 + seed * 0.8), 12.0 * pr);
      }`,
    fragmentShader: `uniform sampler2D map; uniform vec3 color; uniform float opacity; varying float vA;
      void main(){ vec4 t = texture2D(map, gl_PointCoord); gl_FragColor = vec4(color * t.rgb, t.a * vA * opacity); }`,
  });
  const pts = new THREE.Points(g, mat); pts.frustumCulled = false;
  return pts;
}

// drifting petals (sunset zone): soft painted ovals tumbling slowly in the breeze
export function makePetals(count, uniforms) {
  const pos = new Float32Array(count * 3), seed = new Float32Array(count);
  const S = { x: 36, z: 36 };
  for (let i = 0; i < count; i++) { pos[i * 3] = rr(-S.x, S.x); pos[i * 3 + 1] = rr(0, 14); pos[i * 3 + 2] = rr(-S.z, S.z); seed[i] = R(); }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('seed', new THREE.BufferAttribute(seed, 1));
  const mat = new THREE.ShaderMaterial({
    uniforms: { time: uniforms.time, pr: uniforms.pr, center: { value: new THREE.Vector3() }, opacity: { value: 1 }, colA: { value: new THREE.Color('#ffc4b0') }, colB: { value: new THREE.Color('#ff9a8a') }, light: { value: new THREE.Color(1, 1, 1) }, spread: { value: new THREE.Vector2(S.x, S.z) } },
    transparent: true, depthWrite: false,
    vertexShader: `
      attribute float seed; uniform float time, pr; uniform vec3 center; uniform vec2 spread; varying float vS; varying float vRot; varying float vFlip; varying float vA;
      void main(){
        vec3 p = position;
        p.y = mod(p.y - time * (0.25 + seed * 0.25), 14.0) + 0.1;
        p.x += sin(time * 0.4 + seed * 20.0) * 2.0 + time * 0.6;
        p.z += cos(time * 0.3 + seed * 13.0) * 1.5;
        vec2 hs = spread; vec2 wp = mod(p.xz - center.xz + hs, 2.0 * hs) - hs + center.xz;
        vec4 mv = viewMatrix * vec4(wp.x, p.y, wp.y, 1.0);
        gl_Position = projectionMatrix * mv;
        vS = seed; vRot = time * (0.6 + seed) + seed * 30.0; vFlip = abs(sin(time * (0.8 + seed) + seed * 9.0));
        vA = smoothstep(4.0, 9.0, -mv.z) * (1.0 - smoothstep(40.0, 60.0, -mv.z)) * 0.85;
        gl_PointSize = min(0.75 * pr * (60.0 / -mv.z) * (0.7 + seed * 0.6), 9.0 * pr);
      }`,
    fragmentShader: `uniform vec3 colA, colB, light; uniform float opacity; varying float vS, vRot, vFlip, vA;
      void main(){
        vec2 d = gl_PointCoord - 0.5; float c = cos(vRot), s = sin(vRot);
        d = mat2(c, -s, s, c) * d; d.x /= max(0.25, vFlip); d.y *= 1.7;
        float r = length(d); if (r > 0.5) discard;
        vec3 col = mix(colA, colB, vS) * light * (1.0 - r * 0.6) * (0.75 + 0.25 * vFlip);
        gl_FragColor = vec4(col, smoothstep(0.5, 0.35, r) * opacity * vA);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  });
  const pts = new THREE.Points(g, mat); pts.frustumCulled = false; pts.name = 'petals';
  return pts;
}
