// Procedural world: river path, terrain, sky, water, trees, reeds, bridge, lanterns, motes.
import * as THREE from 'three';
import { Reflector } from 'three/addons/objects/Reflector.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

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

// distance (2D) from point to sampled polyline, returns [dist, u]
function distToPath(samples, x, z) {
  let best = 1e9, bu = 0;
  for (let i = 0; i < samples.length - 1; i++) {
    const ax = samples[i][0], az = samples[i][1], bx = samples[i + 1][0], bz = samples[i + 1][1];
    const dx = bx - ax, dz = bz - az; const l2 = dx * dx + dz * dz;
    let t = ((x - ax) * dx + (z - az) * dz) / l2; t = t < 0 ? 0 : t > 1 ? 1 : t;
    const px = ax + dx * t - x, pz = az + dz * t - z; const d = px * px + pz * pz;
    if (d < best) { best = d; bu = (i + t) / (samples.length - 1); }
  }
  // extend beyond ends so the river continues out of view
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

// ---------- terrain mesh ----------
export function makeTerrain(path) {
  const minX = -230, maxX = 230, minZ = 150, maxZ = -path.L - 220;
  const sx = 115, sz = 190;
  const g = new THREE.PlaneGeometry(maxX - minX, minZ - maxZ, sx, sz);
  g.rotateX(-Math.PI / 2);
  g.translate((minX + maxX) / 2, 0, (minZ + maxZ) / 2);
  const pos = g.attributes.position; const col = new Float32Array(pos.count * 3);
  const cMud = new THREE.Color('#6b5040'), cGrass = new THREE.Color('#7f8a45'), cGrass2 = new THREE.Color('#5f7a3c'), cHill = new THREE.Color('#4b5f3a'), cHigh = new THREE.Color('#7a6a55'), tmp = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i) + (hash2(i, 3) - 0.5) * 2.2, z = pos.getZ(i) + (hash2(i, 7) - 0.5) * 2.2;
    pos.setX(i, x); pos.setZ(i, z);
    const h = terrainHeight(path, x, z); pos.setY(i, h);
    if (h < 0.6) tmp.copy(cMud).lerp(cGrass, THREE.MathUtils.smoothstep(h, -0.5, 0.6));
    else if (h < 9) tmp.copy(cGrass).lerp(cGrass2, fbm(x * 0.05, z * 0.05));
    else tmp.copy(cHill).lerp(cHigh, THREE.MathUtils.smoothstep(h, 14, 34));
    const v = 0.9 + hash2(i, 11) * 0.2; tmp.multiplyScalar(v);
    col[i * 3] = tmp.r; col[i * 3 + 1] = tmp.g; col[i * 3 + 2] = tmp.b;
  }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  const geo = g.toNonIndexed(); geo.computeVertexNormals();
  const m = new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true }));
  m.name = 'terrain';
  return m;
}

// distant mountain ring (layers of soft silhouettes)
export function makeMountains(path) {
  const mat = new THREE.MeshLambertMaterial({ color: '#6c5a78', flatShading: true });
  const cz = -path.L / 2; const geos = []; const o = new THREE.Object3D();
  for (let layer = 0; layer < 2; layer++) {
    const count = 26;
    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2 + layer * 0.12;
      const r = 430 + layer * 120 + rr(-30, 30);
      const h = rr(50, 120) * (1 + layer * 0.5), w = rr(70, 130);
      const geo = new THREE.ConeGeometry(w, h, 6 + Math.floor(R() * 3), 1);
      o.position.set(Math.cos(a) * r * 0.75, h / 2 - 8, cz + Math.sin(a) * r * 1.25);
      o.rotation.set(0, R() * 6.28, 0); o.scale.set(1, 1, rr(0.6, 1.2)); o.updateMatrix();
      geo.applyMatrix4(o.matrix); geos.push(geo.toNonIndexed());
    }
  }
  const m = new THREE.Mesh(mergeGeometries(geos), mat); m.name = 'mountains';
  return m;
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
        vec3 col = y > 0.0 ? mix(horizon, mid, smoothstep(0.0, 0.22, y)) : mix(horizon, ground, smoothstep(0.0, -0.15, y));
        col = mix(col, top, smoothstep(0.18, 0.75, y));
        float sd = max(dot(d, sunDir), 0.0);
        // warm glow around the sun, wider along the horizon
        float glow = pow(sd, 6.0) * 0.55 + pow(sd, 40.0) * 0.8;
        col += sunColor * glow * sunGlow * (0.6 + 0.4 * smoothstep(0.3, -0.05, y));
        // painterly clouds: horizontally stretched brush strokes
        vec2 cp = d.xz / max(y + 0.12, 0.05);
        float c = fbm(vec2(cp.x * 0.35 + time * 0.004, cp.y * 1.1) );
        c = smoothstep(0.48, 0.8, c) * smoothstep(0.02, 0.12, y) * (1.0 - smoothstep(0.5, 0.85, y));
        float lit = clamp(0.5 + 0.8 * pow(sd, 3.0), 0.0, 1.0);
        vec3 cc = mix(cloudShadow, cloudColor, lit);
        cc += sunColor * pow(sd, 12.0) * 0.6 * sunGlow;
        col = mix(col, cc, c * 0.85);
        // sun disc
        float disc = smoothstep(0.9993 - 0.0004 * sunSize, 0.9997, sd) * sunSize;
        col += sunColor * disc * 3.0 * (1.0 - c * 0.6);
        // stars
        if (stars > 0.01 && y > 0.05) {
          vec2 sp = d.xz / (y + 0.3) * 160.0;
          vec2 id = floor(sp); float r = h21(id);
          float tw = 0.6 + 0.4 * sin(time * (1.0 + r * 3.0) + r * 40.0);
          float s = step(0.985, r) * smoothstep(0.42, 0.0, length(fract(sp) - 0.5)) * tw;
          col += vec3(1.0, 0.92, 0.8) * s * stars * smoothstep(0.05, 0.3, y) * (1.0 - c);
        }
        // moon
        if (moon > 0.01) {
          vec3 md = normalize(vec3(0.55, 0.42, -0.72));
          float m = dot(d, md);
          col += vec3(1.0, 0.95, 0.85) * smoothstep(0.99955, 0.9997, m) * moon * 2.2;
          col += vec3(0.7, 0.65, 0.95) * pow(max(m, 0.0), 60.0) * 0.35 * moon;
        }
        gl_FragColor = vec4(col, 1.0);
      }`,
  });
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(1000, 48, 24), mat);
  mesh.frustumCulled = false; mesh.renderOrder = -10; mesh.name = 'sky';
  return mesh;
}

// ---------- water ----------
export const RIPPLES = 12;
export function makeWater(texSize) {
  const shader = {
    name: 'DreamWater',
    uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, {
      color: { value: null }, tDiffuse: { value: null }, textureMatrix: { value: null },
      time: { value: 0 }, deep: { value: new THREE.Color() }, tint: { value: new THREE.Color() },
      sunDir: { value: new THREE.Vector3() }, sunColor: { value: new THREE.Color() },
      ripples: { value: Array.from({ length: RIPPLES }, () => new THREE.Vector4(0, 0, -100, 0)) },
      boat: { value: new THREE.Vector4() },
    }]),
    vertexShader: `
      uniform mat4 textureMatrix; varying vec4 vUv; varying vec3 vWorld;
      #include <fog_pars_vertex>
      void main(){
        vUv = textureMatrix * vec4(position, 1.0);
        vWorld = (modelMatrix * vec4(position, 1.0)).xyz;
        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        gl_Position = projectionMatrix * mvPosition;
        #include <fog_vertex>
      }`,
    fragmentShader: `
      uniform sampler2D tDiffuse; uniform float time; uniform vec3 deep, tint, sunDir, sunColor, color;
      uniform vec4 ripples[${RIPPLES}]; uniform vec4 boat;
      varying vec4 vUv; varying vec3 vWorld;
      #include <common>
      #include <fog_pars_fragment>
      float h21(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7)))*43758.5453); }
      float n2(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.-2.*f); return mix(mix(h21(i),h21(i+vec2(1,0)),f.x), mix(h21(i+vec2(0,1)),h21(i+vec2(1,1)),f.x), f.y); }
      vec2 wave(vec2 p, vec2 dir, float fq, float sp, float amp){ float ph = dot(p, dir) * fq + time * sp; return dir * cos(ph) * amp * fq; }
      void main(){
        vec2 p = vWorld.xz;
        float dist = length(vWorld - cameraPosition);
        vec2 g = vec2(0.0);
        g += wave(p, normalize(vec2(0.3, 1.0)), 0.55, 1.1, 0.06);
        g += wave(p, normalize(vec2(-0.8, 0.6)), 0.9, 1.6, 0.035);
        g += wave(p, normalize(vec2(0.9, 0.2)), 1.7, 2.3, 0.018);
        g += wave(p, normalize(vec2(-0.2, -1.0)), 2.9, 3.1, 0.009);
        // soft painterly breakup
        float nA = n2(p * 0.35 + time * 0.05), nB = n2(p * 0.35 + vec2(3.1, 7.7) - time * 0.04);
        g += (vec2(nA, nB) - 0.5) * 0.08;
        // ripples (oar splashes and wake)
        for (int i = 0; i < ${RIPPLES}; i++) {
          vec4 r = ripples[i]; float age = time - r.z;
          if (age < 0.0 || age > 4.5) continue;
          vec2 dv = p - r.xy; float d = length(dv) + 1e-4;
          float R = 0.3 + age * 1.9;
          float env = exp(-pow((d - R) * 1.6, 2.0)) * exp(-age * 0.9) * r.w;
          g += (dv / d) * cos((d - R) * 7.0) * env * 0.55;
        }
        // V-wake following the boat
        {
          vec2 fw = vec2(sin(boat.z), cos(boat.z)) * -1.0; // forward
          vec2 rel = p - boat.xy; float along = dot(rel, fw); vec2 side = vec2(-fw.y, fw.x); float lat = dot(rel, side);
          float behind = -along;
          if (behind > -1.5 && behind < 26.0) {
            float arm = abs(lat) - (behind + 1.5) * 0.36;
            float env = exp(-arm * arm * 1.4) * exp(-behind * 0.11) * boat.w;
            g += side * sign(lat) * cos(arm * 6.0 - time * 5.0) * env * 0.35;
            g += fw * sin(behind * 3.0 - time * 6.0) * exp(-lat*lat*0.9) * exp(-behind*0.25) * boat.w * 0.12;
          }
        }
        float calm = exp(-dist / 90.0);
        g *= mix(0.2, 1.35, calm);
        vec3 N = normalize(vec3(-g.x, 1.0, -g.y));
        vec3 V = normalize(cameraPosition - vWorld);
        vec4 uv = vUv; uv.xy += g * uv.w * 0.05;
        vec3 refl = texture2DProj(tDiffuse, uv).rgb;
        float fres = 0.38 + 0.62 * pow(1.0 - max(dot(N, V), 0.0), 3.0);
        vec3 base = deep * (0.8 + 0.4 * n2(p * 0.08));
        vec3 col = mix(base, refl * mix(vec3(1.0), tint, 0.18), fres);
        float streak = n2(vec2(p.x * 0.04, p.y * 0.9) + vec2(0.0, time * 0.05));
        col *= 0.93 + 0.12 * streak;
        // sun / sky glints
        vec3 H = normalize(sunDir + V);
        float spec = pow(max(dot(N, H), 0.0), 220.0) * 2.4 + pow(max(dot(N, H), 0.0), 30.0) * 0.12;
        col += sunColor * spec * smoothstep(-0.05, 0.05, sunDir.y);
        gl_FragColor = vec4(col, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
        #include <fog_fragment>
      }`,
  };
  const geo = new THREE.PlaneGeometry(1800, 1800, 1, 1);
  const water = new Reflector(geo, { textureWidth: texSize.x, textureHeight: texSize.y, color: 0xffffff, shader, clipBias: 0.003, multisample: 0 });
  water.material.fog = true;
  water.rotation.x = -Math.PI / 2;
  water.name = 'water';
  return water;
}

// ---------- trees ----------
export function makeTrees(path) {
  const group = new THREE.Group();
  const roundGeo = new THREE.IcosahedronGeometry(1, 0);
  const coneGeo = new THREE.ConeGeometry(1, 2.6, 7, 1);
  const trunkGeo = new THREE.CylinderGeometry(0.12, 0.22, 1, 5); trunkGeo.translate(0, 0.5, 0);
  const leafMat = new THREE.MeshLambertMaterial({ flatShading: true });
  const trunkMat = new THREE.MeshLambertMaterial({ color: '#4a3226', flatShading: true });
  const N = 360;
  const round = new THREE.InstancedMesh(roundGeo, leafMat, N * 2);
  const cone = new THREE.InstancedMesh(coneGeo, leafMat, N);
  const trunks = new THREE.InstancedMesh(trunkGeo, trunkMat, N);
  let nr = 0, nc = 0, nt = 0;
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), p = new THREE.Vector3(), col = new THREE.Color();
  const palette = ['#5f7d3a', '#7a8a3e', '#9a8a3a', '#4f6e3e', '#b0703a', '#8a5a3a', '#6e8a4a'];
  const up = new THREE.Vector3(0, 1, 0);
  for (let i = 0; i < N; i++) {
    const u = R();
    const pt = path.curve.getPointAt(u), tg = path.curve.getTangentAt(u);
    const side = R() < 0.5 ? -1 : 1;
    const W = riverHalfWidth(u);
    const off = W + 3 + Math.pow(R(), 1.6) * 80;
    const x = pt.x + tg.z * side * off, z = pt.z - tg.x * side * off;
    const h = terrainHeight(path, x, z);
    if (h < 0.4) continue;
    const scale = rr(1.6, 3.4) * (off > W + 40 ? 1.3 : 1);
    const trunkH = scale * rr(0.7, 1.2);
    p.set(x, h - 0.2, z); q.setFromAxisAngle(up, R() * 6.28); s.set(scale * 0.6, trunkH, scale * 0.6);
    trunks.setMatrixAt(nt++, m.compose(p, q, s));
    col.set(palette[Math.floor(R() * palette.length)]).multiplyScalar(rr(0.85, 1.1));
    if (R() < 0.62) {
      for (let k = 0; k < 2; k++) {
        p.set(x + rr(-0.4, 0.4) * scale, h + trunkH + scale * (0.55 + k * 0.6), z + rr(-0.4, 0.4) * scale);
        s.set(scale * rr(0.9, 1.25), scale * rr(0.75, 1.0), scale * rr(0.9, 1.25)).multiplyScalar(1 - k * 0.3);
        round.setMatrixAt(nr, m.compose(p, q, s)); round.setColorAt(nr++, col);
      }
    } else {
      p.set(x, h + trunkH + scale * 1.1, z); s.set(scale * 0.75, scale * 1.15, scale * 0.75);
      cone.setMatrixAt(nc, m.compose(p, q, s)); cone.setColorAt(nc++, col.multiplyScalar(0.85));
    }
  }
  round.count = nr; cone.count = nc; trunks.count = nt;
  group.add(round, cone, trunks);
  return group;
}

// ---------- reeds (swaying) ----------
export function makeReeds(path, uniforms) {
  // tapered blade
  const seg = 4, pos = [], colr = [], idx = [];
  for (let i = 0; i <= seg; i++) {
    const t = i / seg, w = 0.07 * (1 - t) + 0.005;
    const bend = t * t * 0.35;
    pos.push(-w, t, bend, w, t, bend);
    const c = new THREE.Color('#3e3a22').lerp(new THREE.Color('#ffffff'), t);
    colr.push(c.r, c.g, c.b, c.r, c.g, c.b);
    if (i < seg) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('color', new THREE.Float32BufferAttribute(colr, 3));
  geo.setIndex(idx); geo.computeVertexNormals();
  const mat = new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide });
  mat.onBeforeCompile = (sh) => {
    sh.uniforms.time = uniforms.time;
    sh.vertexShader = 'uniform float time;\n' + sh.vertexShader.replace('#include <begin_vertex>', `
      vec3 transformed = vec3(position);
      #ifdef USE_INSTANCING
        vec2 ip = instanceMatrix[3].xz;
      #else
        vec2 ip = vec2(0.0);
      #endif
      float sway = sin(time * 1.3 + ip.x * 0.35 + ip.y * 0.21) * 0.6 + sin(time * 2.7 + ip.y * 0.9) * 0.25;
      transformed.x += sway * position.y * position.y * 0.32;
      transformed.z += sway * position.y * position.y * 0.12;
    `);
  };
  const N = 2600;
  const mesh = new THREE.InstancedMesh(geo, mat, N);
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), p = new THREE.Vector3(), col = new THREE.Color();
  const tints = ['#d7b26a', '#c9a35a', '#e6c88a', '#a8a05a', '#b98a4a'];
  let n = 0;
  const clusters = 150;
  for (let c = 0; c < clusters && n < N; c++) {
    const u = R(); const pt = path.curve.getPointAt(u), tg = path.curve.getTangentAt(u);
    const side = R() < 0.5 ? -1 : 1; const W = riverHalfWidth(u);
    const off = W + rr(-3.5, 1.5);
    const cx = pt.x + tg.z * side * off, cz = pt.z - tg.x * side * off;
    const k = 10 + Math.floor(R() * 16);
    for (let j = 0; j < k && n < N; j++) {
      const x = cx + rr(-2.5, 2.5) + tg.x * rr(-4, 4), z = cz + rr(-2.5, 2.5) + tg.z * rr(-4, 4);
      const h = Math.max(terrainHeight(path, x, z), -0.6);
      if (h > 2.5) continue;
      p.set(x, h - 0.1, z); q.setFromEuler(new THREE.Euler(rr(-0.15, 0.15), R() * 6.28, rr(-0.15, 0.15)));
      const hh = rr(1.4, 3.0); s.set(rr(0.8, 1.4), hh, 1);
      mesh.setMatrixAt(n, m.compose(p, q, s));
      col.set(tints[Math.floor(R() * tints.length)]); mesh.setColorAt(n++, col);
    }
  }
  mesh.count = n; mesh.frustumCulled = false;
  return mesh;
}

// ---------- rocks & stakes ----------
export function makeRocks(path) {
  const geo = new THREE.DodecahedronGeometry(1, 0);
  const mesh = new THREE.InstancedMesh(geo, new THREE.MeshLambertMaterial({ color: '#7a6a62', flatShading: true }), 120);
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), p = new THREE.Vector3();
  let n = 0;
  for (let i = 0; i < 120; i++) {
    const u = R(); const pt = path.curve.getPointAt(u), tg = path.curve.getTangentAt(u);
    const side = R() < 0.5 ? -1 : 1; const off = riverHalfWidth(u) + rr(-2, 3);
    const x = pt.x + tg.z * side * off, z = pt.z - tg.x * side * off;
    p.set(x, Math.max(terrainHeight(path, x, z), -0.3) - 0.2, z);
    q.setFromEuler(new THREE.Euler(R() * 3, R() * 3, R() * 3)); const sc = rr(0.4, 1.4); s.set(sc * rr(1, 1.6), sc * 0.6, sc);
    mesh.setMatrixAt(n++, m.compose(p, q, s));
  }
  mesh.count = n;
  return mesh;
}

// little hut with a warm window (sunset zone)
export function makeHut(path, u, side) {
  const g = new THREE.Group();
  const pt = path.curve.getPointAt(u), tg = path.curve.getTangentAt(u);
  const off = riverHalfWidth(u) + 6;
  const x = pt.x + tg.z * side * off, z = pt.z - tg.x * side * off;
  const h = terrainHeight(path, x, z);
  const wood = new THREE.MeshLambertMaterial({ color: '#7a5038', flatShading: true });
  const roof = new THREE.MeshLambertMaterial({ color: '#8a3e2e', flatShading: true });
  const body = new THREE.Mesh(new THREE.BoxGeometry(4, 3, 3.4), wood); body.position.y = 1.5 + 1.2;
  const r = new THREE.Mesh(new THREE.ConeGeometry(3.6, 2.2, 4, 1), roof); r.position.y = 4.2 + 1.2 + 0.1; r.rotation.y = Math.PI / 4; r.scale.z = 0.85;
  for (const sx of [-1.6, 1.6]) for (const sz of [-1.3, 1.3]) { const st = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 2.6, 5), wood); st.position.set(sx, 0.0, sz); g.add(st); }
  const win = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.8), new THREE.MeshBasicMaterial({ color: new THREE.Color(4.0, 2.2, 0.9) }));
  win.position.set(0, 2.9, 1.71); g.add(body, r, win);
  const win2 = win.clone(); win2.position.set(-0.9, 2.9, -1.71); win2.rotation.y = Math.PI; g.add(win2);
  g.position.set(x, h - 0.4, z);
  g.lookAt(pt.x, h - 0.4, pt.z);
  return g;
}

// ---------- lantern geometry helpers ----------
const paperGeo = new THREE.CylinderGeometry(0.32, 0.32, 0.62, 8, 1); // hexagon-ish paper body
const capGeo = new THREE.CylinderGeometry(0.36, 0.36, 0.08, 8, 1);

export function lanternMesh(glowColor) {
  const g = new THREE.Group();
  const paper = new THREE.Mesh(paperGeo, new THREE.MeshBasicMaterial({ color: glowColor }));
  const capM = new THREE.MeshLambertMaterial({ color: '#2e1e18' });
  const top = new THREE.Mesh(capGeo, capM); top.position.y = 0.33;
  const bot = new THREE.Mesh(capGeo, capM); bot.position.y = -0.33;
  g.add(paper, top, bot);
  return g;
}

// ---------- wooden bridge ----------
export function makeBridge(path, u) {
  const g = new THREE.Group();
  const pt = path.curve.getPointAt(u), tg = path.curve.getTangentAt(u);
  g.position.set(pt.x, 0, pt.z);
  g.rotation.y = Math.atan2(tg.x, tg.z);
  const half = riverHalfWidth(u) + 9;
  const wood = new THREE.MeshLambertMaterial({ color: '#8a5a3c', flatShading: true });
  const dark = new THREE.MeshLambertMaterial({ color: '#5a3a2a', flatShading: true });
  const red = new THREE.MeshLambertMaterial({ color: '#a8402e', flatShading: true });
  const arcY = (x) => 3.2 + 5.2 * Math.cos((x / half) * Math.PI * 0.5);
  const planks = Math.round(half * 2 / 0.9);
  const plankGeo = new THREE.BoxGeometry(0.82, 0.22, 3.6);
  const pm = new THREE.InstancedMesh(plankGeo, wood, planks);
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(1, 1, 1), p = new THREE.Vector3(), col = new THREE.Color();
  for (let i = 0; i < planks; i++) {
    const x = -half + (i + 0.5) * (half * 2 / planks), y = arcY(x);
    const slope = (arcY(x + 0.1) - arcY(x - 0.1)) / 0.2;
    p.set(x, y, 0); q.setFromAxisAngle(new THREE.Vector3(0, 0, 1), Math.atan(slope));
    pm.setMatrixAt(i, m.compose(p, q, s)); pm.setColorAt(i, col.set('#8a5a3c').multiplyScalar(0.8 + R() * 0.35));
  }
  g.add(pm);
  // arched beams + rails
  for (const z of [-1.75, 1.75]) {
    const beamPts = [], railPts = [];
    for (let i = 0; i <= 24; i++) { const x = -half + (i / 24) * half * 2; beamPts.push(new THREE.Vector3(x, arcY(x) - 0.35, z)); railPts.push(new THREE.Vector3(x, arcY(x) + 1.15, z)); }
    g.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(beamPts), 40, 0.22, 5), dark));
    g.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(railPts), 40, 0.09, 5), red));
  }
  // posts
  const postGeo = new THREE.BoxGeometry(0.16, 1.2, 0.16);
  const postN = 22; const posts = new THREE.InstancedMesh(postGeo, red, postN * 2);
  let n = 0; const lanternSpots = [];
  for (let i = 0; i < postN; i++) {
    const x = -half + 0.6 + (i / (postN - 1)) * (half * 2 - 1.2), y = arcY(x) + 0.55;
    for (const z of [-1.75, 1.75]) { p.set(x, y, z); q.identity(); posts.setMatrixAt(n++, m.compose(p, q, s)); if (i % 3 === 1) lanternSpots.push(new THREE.Vector3(x, y + 0.6, z)); }
  }
  g.add(posts);
  // piers into water
  for (const x of [-half * 0.45, half * 0.45]) for (const z of [-1.4, 1.4]) {
    const h = arcY(x) + 3;
    const pier = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.4, h, 6), dark);
    pier.position.set(x, arcY(x) - h / 2, z); g.add(pier);
  }
  // hanging lanterns under the rail (outside face)
  const lanterns = [];
  for (const sp of lanternSpots) {
    const L = lanternMesh(new THREE.Color(3.2, 1.25, 0.55));
    L.scale.setScalar(0.75);
    L.position.set(sp.x, sp.y - 1.0, sp.z + Math.sign(sp.z) * 0.35);
    const str = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.5, 3), dark);
    str.position.set(sp.x, sp.y - 0.5, sp.z + Math.sign(sp.z) * 0.35);
    g.add(L, str); lanterns.push(L);
  }
  g.userData.lanterns = lanterns;
  g.userData.top = arcY(0);
  return g;
}

// ---------- floating river lanterns (instanced) ----------
export function makeFloatingLanterns(path, from, to, count) {
  const paper = new THREE.InstancedMesh(paperGeo, new THREE.MeshBasicMaterial({ color: 0xffffff }), count);
  const base = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.42, 0.46, 0.12, 8), new THREE.MeshLambertMaterial({ color: '#3a2418' }), count);
  const items = [];
  for (let i = 0; i < count; i++) {
    const u = from + (to - from) * Math.pow(R(), 0.62);
    const W = riverHalfWidth(u) - 2.5;
    let lat = rr(-W, W); if (Math.abs(lat) < 2.6) lat = Math.sign(lat || 1) * (2.6 + R() * 3);
    const hue = R();
    const c = hue < 0.6 ? new THREE.Color(3.0, 1.35, 0.5) : hue < 0.85 ? new THREE.Color(3.2, 0.9, 0.55) : new THREE.Color(2.8, 2.0, 0.9);
    paper.setColorAt(i, c);
    items.push({ u, lat, phase: R() * 6.28, speed: rr(0.25, 0.6), scale: rr(0.7, 1.05) });
  }
  return { paper, base, items };
}

// ---------- motes / fireflies / sky lanterns as points ----------
function dotTexture() {
  const cv = document.createElement('canvas'); cv.width = cv.height = 64;
  const ctx = cv.getContext('2d'); const gr = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.25, 'rgba(255,255,255,0.75)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
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
    uniforms: { map: { value: DOT() }, time: uniforms.time, color: { value: new THREE.Color(1, 0.8, 0.4) }, opacity: { value: 1 }, size: { value: kind === 'sky' ? 30 : 4.5 }, pr: uniforms.pr, center: { value: new THREE.Vector3() }, rise: { value: kind === 'sky' ? 1 : 0 }, spread: { value: new THREE.Vector2(spread.x, spread.z) } },
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
        float near = smoothstep(2.0, 9.0, -mv.z);
        vA = (rise > 0.5 ? 0.9 : tw) * near;
        gl_PointSize = min(size * pr * (60.0 / -mv.z) * (0.6 + seed * 0.8), 18.0 * pr);
      }`,
    fragmentShader: `uniform sampler2D map; uniform vec3 color; uniform float opacity; varying float vA;
      void main(){ vec4 t = texture2D(map, gl_PointCoord); gl_FragColor = vec4(color * t.rgb, t.a * vA * opacity); }`,
  });
  const pts = new THREE.Points(g, mat); pts.frustumCulled = false;
  return pts;
}
