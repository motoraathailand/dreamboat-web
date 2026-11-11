// DREAM BOAT — playable sample v2 (painterly upgrade). © MOTOR AA
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { FXAAShader } from 'three/addons/shaders/FXAAShader.js';
import { PU } from './paint.js?v=6';
import * as W from './world.js?v=6';
import { Boat } from './boat.js?v=6';
import { ZONES, zoneParamsAt } from './zones.js?v=6';
import { DreamAudio } from './audio.js?v=6';
import { LANGS, detectLang, setLang, getLang, t } from './i18n.js?v=6';

const qs = new URLSearchParams(location.search);
const SHOT = qs.has('shot');
const CAM = qs.get('cam') ? qs.get('cam').split(',').map(Number) : null; // debug camera: dist,height,yaw
const isTouch = matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window;
const isMobile = isTouch && Math.min(screen.width, screen.height) < 900;
const QUALITY = qs.get('q') || (isMobile ? 'mid' : 'high');

// ---------- renderer ----------
const canvas = document.getElementById('c');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance', preserveDrawingBuffer: SHOT });
const maxPR = QUALITY === 'low' ? 0.85 : QUALITY === 'mid' ? Math.min(devicePixelRatio, 1.75) : Math.min(devicePixelRatio, 2);
let pixelRatio = QUALITY === 'high' ? Math.min(devicePixelRatio, 1.5) : Math.min(maxPR, 1.25);
renderer.setPixelRatio(pixelRatio);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
const SHADOWS = QUALITY === 'high' && !qs.has('noshadow');
if (SHADOWS) { renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap; }
renderer.outputColorSpace = THREE.SRGBColorSpace;

const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0xeda27c, 35, 380);
const camera = new THREE.PerspectiveCamera(58, 1, 0.1, 2500);

const shared = { time: { value: 0 }, pr: { value: pixelRatio } };

// ---------- world ----------
const T0 = performance.now();
const path = W.makePath();
const startZ0 = (() => { let u0 = 0; if (qs.has('zone')) u0 = (Math.max(1, Math.min(ZONES.length, parseInt(qs.get('zone')) || 1)) - 1) / ZONES.length; if (qs.has('u')) u0 = parseFloat(qs.get('u')) || 0; return path.curve.getPointAt(Math.min(0.999, u0)).z; })();
const terrain = W.makeTerrain(path, QUALITY, startZ0); scene.add(terrain);
const hmap = W.makeHeightTex(path, QUALITY, startZ0);
let worldDone = false, rush = 0;
const mountains = W.makeMountains(path); scene.add(mountains);
const sky = W.makeSky(); scene.add(sky);
const reflScale = QUALITY === 'low' ? 0.35 : 0.5;
const reflSize = () => new THREE.Vector2(Math.max(256, Math.floor(innerWidth * pixelRatio * reflScale)), Math.max(256, Math.floor(innerHeight * pixelRatio * reflScale)));
const water = W.makeWater(reflSize(), hmap); scene.add(water);
{ // no star specks in the reflection: stars are switched off while the mirror camera renders
  const orb = water.onBeforeRender.bind(water);
  water.onBeforeRender = (...a) => { const u = sky.material.uniforms.stars, v = u.value; u.value = 0; orb(...a); u.value = v; };
}
// detail-only objects live on layer 1: drawn by the main camera but skipped by the water reflection pass
const DETAIL = 1; camera.layers.enable(DETAIL);
const onDetail = (o) => o.traverse(c => c.layers.set(DETAIL));

// ---- per-place props: each place is its own group, shown only near the boat (keeps phones fast) ----
const NZ = ZONES.length, ZL = 1 / NZ;
const ZP = [
  { trees: {}, reeds: {}, flowers: {}, lilies: {}, rocks: {}, huts: [[0.05, 1], [0.085, -1]] },
  { trees: { k: 0.35, near: 22, far: 70 }, reeds: { k: 3.6, inland: 16, tall: 1.35, grass: 1.4, wade: 5.5, tailK: 0.3, spread: 1.3, tailCol: '#f0dcae', tints: ['#e6c070', '#d8b060', '#f0d090', '#c8a050', '#e0b868', '#b89848'], grassPal: ['#c8b058', '#d8c068', '#b8a050', '#c8a85a'] },
    flowers: { k: 0.4 }, lilies: { k: 0.6 }, rocks: { k: 0.4 } },
  { trees: { k: 1.1, mix: [0.45, 0.7, 0.85, 0.93], warmPal: ['#8a9a50', '#a8a058', '#c89a6a', '#b07a6a', '#7a9a5a', '#c08870'] }, reeds: { k: 0.8 },
    flowers: { k: 1.5, pal: [[1.0, 0.75, 0.8], [0.98, 0.95, 0.9], [0.95, 0.7, 0.9], [1.0, 0.85, 0.6]] }, lilies: { k: 1.5, bloom: 0.3 }, rocks: { k: 0.6 }, huts: [[0.29, -1], [0.336, 1]], foot: true },
  { trees: { k: 1.2, near: 3, mix: [0.05, 0.1, 0.15, 0.5], warm: 0.2, coolPal: ['#4a5a5a', '#56665e', '#3e4e52', '#5a6a66'] }, reeds: { k: 0.5, grass: 0.7 },
    flowers: { k: 0.05 }, lilies: { k: 0.3 }, rocks: { k: 2.4, tall: 0.45, pal: ['#8a8a92', '#7a7c86', '#9494a0'] } },
  { trees: { k: 1.8, near: 2, far: 60, mix: [0.35, 0.6, 0.7, 0.85], warm: 0.75, size: 1.1, warmPal: ['#3e6a4a', '#4a7a44', '#2e5a40', '#5a7a3a', '#3a6650'], coolPal: ['#2a4a3e', '#30503a'] },
    reeds: { k: 0.7, grass: 1.2, grassPal: ['#5a8a4a', '#4a7a44', '#6a9a50', '#3e6a40'] }, flowers: { k: 0.7, pal: [[0.75, 1.0, 0.6], [0.6, 0.8, 1.0], [1.0, 0.95, 0.7]] }, lilies: { k: 0.5 }, rocks: { k: 0.8 } },
  { trees: {}, reeds: {}, flowers: { k: 0.6 }, lilies: {}, rocks: {} },
  { trees: { k: 0.8, near: 6, far: 60 }, reeds: { k: 0.9 }, flowers: { k: 0.3 }, lilies: { k: 3.0, inner: 16, bloom: 0.45 }, rocks: { k: 0.6 } },
  { trees: { k: 0.4, near: 10 }, reeds: { k: 0.5, grass: 0.6 }, flowers: { k: 0.5 }, lilies: { k: 0.6 }, rocks: { k: 0.3 }, clouds: QUALITY === 'low' ? 40 : 70 },
];
const zoneGroups = [];
let flowerMat = null, lilyBlooms = null, cloudMat = null, cloudMesh = null;
ZP.forEach((zp, i) => {
  const g = new THREE.Group(); g.name = 'zone' + (i + 1);
  const r = { u0: i * ZL, u1: (i + 1) * ZL };
  if (i === NZ - 1) r.u1 = 0.995;
  g.add(W.makeTrees(path, QUALITY, { ...r, ...zp.trees }));
  const reeds = W.makeReeds(path, shared, QUALITY, { ...r, ...zp.reeds }); g.add(reeds); if (reeds.userData.grass) onDetail(reeds.userData.grass);
  const fl = W.makeFlowers(path, QUALITY, shared, { ...r, ...zp.flowers }); g.add(fl); onDetail(fl); flowerMat = fl.material;
  const li = W.makeLilies(path, QUALITY, { ...r, ...zp.lilies }); g.add(li); onDetail(li); lilyBlooms = li.userData.blooms;
  g.add(W.makeRocks(path, { ...r, ...zp.rocks }));
  for (const [u, side] of zp.huts || []) g.add(W.makeHut(path, u, side));
  if (zp.foot) W.FOOT_U.forEach((u, k) => g.add(W.makeBridge(path, u, { old: true, skew: (k - 1) * 0.12 })));
  if (zp.clouds) { const c = W.makeCloudBanks(path, i * ZL + 0.01, 1.04, zp.clouds); g.add(c); cloudMat = c.material; cloudMesh = c; }
  g.userData.u0 = i * ZL; g.userData.u1 = (i + 1) * ZL;
  zoneGroups.push(g); scene.add(g);
});
const BRIDGE_U = W.BRIDGE_U;
const bridge = W.makeBridge(path, BRIDGE_U); scene.add(bridge); zoneGroups[5].add(bridge);
const bridgeLights = [];
for (const x of [-6, 6]) { const l = new THREE.PointLight('#ff9850', 0, 26, 1.5); l.position.set(x, 9, 0); bridge.add(l); bridgeLights.push(l); }
const floating = W.makeFloatingLanterns(path, 0.61, 0.765, QUALITY === 'low' ? 70 : 110); scene.add(floating.paper, floating.base);
const paperColors = []; for (let i = 0; i < floating.items.length; i++) { const c = new THREE.Color(); floating.paper.getColorAt(i, c); paperColors.push(c); }
const motes = W.makePoints(QUALITY === 'low' ? 160 : 300, { x: 45, y0: 0.6, y1: 9, z: 45 }, 'motes', shared); scene.add(motes);
const skyL = W.makePoints(70, { x: 220, y0: 10, y1: 120, z: 220 }, 'sky', shared); scene.add(skyL);
skyL.material.uniforms.color.value.set(1.6, 0.75, 0.3);
const petals = W.makePetals(QUALITY === 'low' ? 50 : QUALITY === 'mid' ? 80 : 130, shared); scene.add(petals);
const birds = W.makeBirds(QUALITY === 'low' ? 7 : 14, shared); scene.add(birds);

const hemi = new THREE.HemisphereLight(0xffffff, 0x444444, 1); scene.add(hemi);
const sun = new THREE.DirectionalLight(0xffffff, 2); scene.add(sun, sun.target);
if (SHADOWS) {
  sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
  const sc = sun.shadow.camera; sc.left = -48; sc.right = 48; sc.top = 48; sc.bottom = -48; sc.near = 1; sc.far = 260;
  sun.shadow.bias = -0.0006; sun.shadow.normalBias = 0.06; sun.shadow.radius = 3;
}

const boat = new Boat(); boat.bobMul = qs.has('bob') ? parseFloat(qs.get('bob')) || 3 : 1; scene.add(boat.root);
onDetail(birds); onDetail(petals); onDetail(motes);
window.__buildMs = performance.now() - T0;

// ---------- post ----------
const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
const bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), 0.6, 0.55, 1.35); // HDR threshold: only lanterns / sun disc bloom, not the whole sky
composer.addPass(bloom);
composer.addPass(new OutputPass());
const fxaa = new ShaderPass(FXAAShader);
// Final painterly pass: Kuwahara-style brush smoothing (high), soft god rays, colour grade,
// watercolour edge darkening, paper/canvas grain, vignette.
const grade = new ShaderPass({
  uniforms: {
    tDiffuse: { value: null }, sat: { value: 1.08 }, lift: { value: new THREE.Color() }, gain: { value: new THREE.Color(1, 1, 1) }, vig: { value: 0.4 },
    res: { value: new THREE.Vector2(1, 1) }, time: { value: 0 }, kuw: { value: 1 }, edges: { value: 1 }, blackPt: { value: 0.03 }, brush: { value: 1.0 },
    sunUV: { value: new THREE.Vector2(0.5, 0.5) }, rays: { value: 0 }, raySteps: { value: 16 }, rayCol: { value: new THREE.Color(1, 0.8, 0.6) }, contrast: { value: 1.0 },
  },
  vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
  fragmentShader: `
    uniform sampler2D tDiffuse; uniform float sat, vig, time, kuw, edges, brush, blackPt, rays, raySteps, contrast; uniform vec3 lift, gain, rayCol; uniform vec2 res, sunUV; varying vec2 vUv;
    float h(vec2 p){ return fract(sin(dot(p, vec2(12.9898,78.233)))*43758.5453); }
    float n2(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.-2.*f); return mix(mix(h(i),h(i+vec2(1,0)),f.x), mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x), f.y); }
    vec3 T(vec2 uv){ return texture2D(tDiffuse, uv).rgb; }
    // 4-sector Kuwahara (radius 2): flattens texture into soft brush patches while keeping edges
    vec3 kuwahara(vec2 uv, vec2 st){
      vec3 m0=vec3(0.), m1=vec3(0.), m2=vec3(0.), m3=vec3(0.), s0=vec3(0.), s1=vec3(0.), s2=vec3(0.), s3=vec3(0.);
      for (int j = -2; j <= 2; j++) for (int i = -2; i <= 2; i++) {
        vec3 c = T(uv + vec2(float(i), float(j)) * st); vec3 c2 = c * c;
        if (i <= 0 && j <= 0) { m0 += c; s0 += c2; }
        if (i >= 0 && j <= 0) { m1 += c; s1 += c2; }
        if (i <= 0 && j >= 0) { m2 += c; s2 += c2; }
        if (i >= 0 && j >= 0) { m3 += c; s3 += c2; }
      }
      m0 /= 9.0; m1 /= 9.0; m2 /= 9.0; m3 /= 9.0;
      vec3 v0 = s0 / 9.0 - m0*m0, v1 = s1 / 9.0 - m1*m1, v2 = s2 / 9.0 - m2*m2, v3 = s3 / 9.0 - m3*m3;
      float a0 = v0.r+v0.g+v0.b, a1 = v1.r+v1.g+v1.b, a2 = v2.r+v2.g+v2.b, a3 = v3.r+v3.g+v3.b;
      // generalized (soft-weighted) Kuwahara: blends sectors by smoothness instead of hard switching -> no crawling edges
      vec4 wts = 1.0 / (vec4(a0, a1, a2, a3) * 220.0 + 0.02); wts = wts * wts;
      vec3 r = (m0 * wts.x + m1 * wts.y + m2 * wts.z + m3 * wts.w) / (wts.x + wts.y + wts.z + wts.w);
      return r;
    }
    void main(){
      vec2 px = 1.0 / res;
      vec2 q = vUv * res / 6.0;
      vec2 w = vec2(n2(q * 0.35), n2(q * 0.35 + 7.3)) - 0.5;
      vec2 uv = vUv + w * px * 1.2 * brush;
      vec3 c; float edgeE = 0.0; vec3 lw = vec3(0.299, 0.587, 0.114);
      if (kuw > 0.5) {
        vec3 k = kuwahara(uv, px * 0.9 * brush);
        c = mix(T(uv), k, 0.75);
        if (edges > 0.5) edgeE = abs(dot(T(vUv + vec2(px.x * 1.5, 0.0)), lw) - dot(T(vUv - vec2(px.x * 1.5, 0.0)), lw))
                              + abs(dot(T(vUv + vec2(0.0, px.y * 1.5)), lw) - dot(T(vUv - vec2(0.0, px.y * 1.5)), lw));
      } else if (edges > 0.5) {
        // mobile "brush-lite": 5 taps along a slowly turning stroke field; keep the smoother of two
        // oriented strokes (a 2-sector Kuwahara) — gives painted strokes for ~1/5 the cost
        float ang = n2(q * 0.22 + 11.0) * 6.2832;
        vec2 dA = vec2(cos(ang), sin(ang)) * px * 1.8 * brush, dB = vec2(-dA.y, dA.x);
        vec3 c0 = T(uv), a1 = T(uv + dA), a2 = T(uv - dA), b1 = T(uv + dB), b2 = T(uv - dB);
        vec3 mA = (c0 + a1 + a2) / 3.0, mB = (c0 + b1 + b2) / 3.0;
        vec3 vA = (a1 - mA) * (a1 - mA) + (a2 - mA) * (a2 - mA) + (c0 - mA) * (c0 - mA);
        vec3 vB = (b1 - mB) * (b1 - mB) + (b2 - mB) * (b2 - mB) + (c0 - mB) * (c0 - mB);
        float wA = 1.0 / ((vA.r + vA.g + vA.b) * 300.0 + 0.02), wB = 1.0 / ((vB.r + vB.g + vB.b) * 300.0 + 0.02); wA *= wA; wB *= wB;
        c = mix(c0, (mA * wA + mB * wB) / (wA + wB), 0.7);
        edgeE = (abs(dot(a1, lw) - dot(a2, lw)) + abs(dot(b1, lw) - dot(b2, lw))) * 1.2;
      } else {
        c = T(uv) * 0.7 + 0.3 * T(vUv + w.yx * px * 3.5);
      }
      // soft god rays toward the sun (bright-pass radial gather)
      if (rays > 0.001 && raySteps > 0.5) {
        vec2 dir = sunUV - vUv; float dl = length(dir);
        vec2 stp = dir / raySteps * 0.85;
        vec2 sp = vUv + stp * 0.5;
        vec3 acc = vec3(0.0); float wsum = 0.0, dec = 1.0;
        for (int i = 0; i < 24; i++) {
          if (float(i) >= raySteps) break;
          vec3 sc = T(clamp(sp, 0.001, 0.999));
          float b = max(dot(sc, vec3(0.3333)) - 0.72, 0.0);
          acc += sc * b * dec; wsum += dec; dec *= 0.93; sp += stp;
        }
        acc /= max(wsum, 1.0);
        float fall = exp(-dl * 1.6);
        c += acc * rayCol * rays * 1.8 * fall;
      }
      float l = dot(c, vec3(0.299, 0.587, 0.114));
      c = mix(vec3(l), c, sat);
      c = mix(lift + c * (1.0 - lift), c * gain, smoothstep(0.0, 1.0, l));
      c = mix(c, c * c * (3.0 - 2.0 * c), 0.25);
      c = (c - 0.5) * contrast + 0.5;
      // watercolour edge darkening (pigment pooling at value changes)
      c *= 1.0 - 0.05 * smoothstep(0.12, 0.45, edgeE); // very faint pigment pooling only at strong value edges
      // levels: set a gentle black point so silhouettes read on phones; warm the highlights
      c = max(c - blackPt, 0.0) / (1.0 - blackPt);
      // paper: very soft, static, low-frequency tooth (in CSS pixels, so it never turns into per-pixel grain on high-DPR phones)
      vec2 fp = vUv * res / brush;
      float paper = (n2(fp * 0.045) - 0.5) * 0.6 + (n2(fp * 0.12 + 7.0) - 0.5) * 0.4;
      c += paper * 0.014 * (0.5 + 0.5 * (1.0 - l));
      vec2 d = vUv - 0.5; d.x *= res.x / res.y * 0.8;
      c *= 1.0 - vig * smoothstep(0.25, 0.95, length(d));
      gl_FragColor = vec4(clamp(c, 0.0, 1.0), 1.0);
    }`,
});
composer.addPass(grade);
composer.addPass(fxaa);

// ---------- quality levels (3 high · 2 mid · 1 low); adaptive drops expensive effects first ----------
let level = QUALITY === 'high' ? 3 : QUALITY === 'mid' ? 2 : 1;
function applyLevel() {
  grade.uniforms.kuw.value = level >= 3 ? 1 : 0;
  grade.uniforms.raySteps.value = level >= 3 ? 20 : level >= 2 ? 10 : 0;
  fxaa.enabled = level >= 2;
  grade.uniforms.edges.value = level >= 2 ? 1 : 0;
  water.material.uniforms.rq.value = level >= 2 ? 1 : 0;
  petals.visible = level >= 2 || QUALITY === 'low';
  if (SHADOWS && level < 3 && sun.castShadow) { sun.castShadow = false; renderer.shadowMap.enabled = false; }
}
applyLevel();

function resize() {
  const w = innerWidth, h = innerHeight;
  renderer.setPixelRatio(pixelRatio); renderer.setSize(w, h, false);
  composer.setPixelRatio(pixelRatio); composer.setSize(w, h);
  camera.aspect = w / h; camera.fov = w < h ? 68 : 56; camera.updateProjectionMatrix();
  const rs = reflSize(); water.getRenderTarget().setSize(rs.x, rs.y);
  bloom.resolution.set(w * pixelRatio * 0.5, h * pixelRatio * 0.5);
  grade.uniforms.res.value.set(w * pixelRatio, h * pixelRatio);
  fxaa.material.uniforms.resolution.value.set(1 / (w * pixelRatio), 1 / (h * pixelRatio));
  grade.uniforms.brush.value = Math.max(1.0, pixelRatio);
  shared.pr.value = pixelRatio;
}
addEventListener('resize', resize); resize();

// ---------- state ----------
const ST = { mode: 'title', s: 0, speed: 0, rowing: false, ended: false, endTimer: 0, zoneShown: -1 };
const BASE = 2.6, ROW_MAX = 7.0;
let startU = 0;
const zoneStartU = (i) => (i <= 0 ? 0 : ZONES[i].start + 0.02);
if (qs.has('zone')) startU = zoneStartU(Math.max(0, Math.min(ZONES.length - 1, (parseInt(qs.get('zone')) || 1) - 1)));
if (qs.has('u')) startU = parseFloat(qs.get('u')) || 0;
ST.s = startU * path.L;

// progress: highest place reached (0-based), saved on this device
let reached = 0;
try { reached = Math.max(0, Math.min(ZONES.length - 1, parseInt(localStorage.getItem('dreamboat.reached') || '0') || 0)); } catch (e) {}
if (qs.has('unlock')) reached = ZONES.length - 1;
if (qs.has('reached')) reached = Math.max(0, Math.min(ZONES.length - 1, (parseInt(qs.get('reached')) || 1) - 1)); // debug: preview progress
function markReached(i) { if (i > reached) { reached = i; try { localStorage.setItem('dreamboat.reached', String(i)); } catch (e) {} } }

const audio = new DreamAudio();
try { audio.muted = localStorage.getItem('dreamboat.muted') === '1'; } catch (e) {}

// ---------- input ----------
const look = { yaw: 0, pitch: 0, tYaw: 0, tPitch: 0, idle: 0 };
const pointers = new Map(); const keys = new Set();
let rowBtnHeld = false;
const rowBtn = document.getElementById('rowBtn');
function playing() { return ST.mode === 'play'; }
canvas.addEventListener('pointerdown', (e) => { if (!playing()) return; pointers.set(e.pointerId, { x: e.clientX, y: e.clientY, sx: e.clientX, sy: e.clientY, drag: false, t: performance.now() }); try { canvas.setPointerCapture(e.pointerId); } catch (_) {} });
canvas.addEventListener('pointermove', (e) => {
  const p = pointers.get(e.pointerId); if (!p) return;
  const dx = e.clientX - p.x, dy = e.clientY - p.y; p.x = e.clientX; p.y = e.clientY;
  if (!p.drag && Math.hypot(p.x - p.sx, p.y - p.sy) > 10) p.drag = true;
  if (p.drag) { look.tYaw += dx * 0.005; look.tPitch += dy * 0.003; /* inverted (v5) */ look.idle = 0; }
});
const endPtr = (e) => pointers.delete(e.pointerId);
canvas.addEventListener('pointerup', endPtr); canvas.addEventListener('pointercancel', endPtr);
rowBtn.addEventListener('pointerdown', (e) => { e.preventDefault(); rowBtnHeld = true; rowBtn.classList.add('active'); try { rowBtn.setPointerCapture(e.pointerId); } catch (_) {} });
const rowUp = () => { rowBtnHeld = false; rowBtn.classList.remove('active'); };
rowBtn.addEventListener('pointerup', rowUp); rowBtn.addEventListener('pointercancel', rowUp); rowBtn.addEventListener('lostpointercapture', rowUp);
addEventListener('keydown', (e) => { if (['Space', 'ArrowUp', 'ArrowLeft', 'ArrowRight', 'ArrowDown'].includes(e.code)) e.preventDefault(); keys.add(e.code); if (e.code === 'KeyM') toggleMute(); });
addEventListener('keyup', (e) => keys.delete(e.code));
addEventListener('blur', () => { keys.clear(); pointers.clear(); rowUp(); });
function isRowing() {
  if (!playing() || ST.ended) return false;
  if (rowBtnHeld || keys.has('Space') || keys.has('KeyW') || keys.has('ArrowUp')) return true;
  const now = performance.now();
  for (const p of pointers.values()) if (!p.drag && now - p.t > 140) return true;
  return false;
}

// ---------- UI ----------
const $ = (id) => document.getElementById(id);
const hud = $('hud'), hint = $('hint'), zt = $('zoneTitle'), fade = $('fade');
function refreshTexts() {
  $('langCode').textContent = getLang().toUpperCase();
  const muted = audio.muted; $('muteLabel').textContent = t(muted ? 'unmute' : 'mute');
  $('muteBtn').setAttribute('aria-label', t(muted ? 'unmute' : 'mute'));
  $('icSound').innerHTML = muted ? '<path d="M4 10v4h4l5 4V6L8 10z"/><path d="M17 9l5 6M22 9l-5 6"/>' : '<path d="M4 10v4h4l5 4V6L8 10z"/><path d="M16 9a4 4 0 0 1 0 6M18.5 6.5a8 8 0 0 1 0 11"/>';
  const h = isTouch ? t('hintTouch') : t('hintKeys');
  hint.textContent = h; $('startHint').textContent = h;
  if (ST.zoneShown >= 0) setZoneTitle(ST.zoneShown, false);
  buildPlaces();
  $('startPlacesBtn').classList.toggle('hidden', reached < 1);
  const menu = $('langMenu'); menu.innerHTML = '';
  for (const L of LANGS) { const b = document.createElement('button'); b.textContent = L.label; b.className = L.code === getLang() ? 'on' : ''; b.onclick = () => { setLang(L.code); refreshTexts(); menu.classList.add('hidden'); }; menu.appendChild(b); }
}
setLang(qs.get('lang') || detectLang(), !!qs.get('lang') && false);
refreshTexts();
$('langBtn').onclick = (e) => { e.stopPropagation(); $('langMenu').classList.toggle('hidden'); };
document.addEventListener('pointerdown', (e) => { if (!$('langMenu').contains(e.target) && e.target.closest('#langBtn') == null) $('langMenu').classList.add('hidden'); });
function toggleMute() { audio.setMuted(!audio.muted); try { localStorage.setItem('dreamboat.muted', audio.muted ? '1' : '0'); } catch (e) {} refreshTexts(); }
$('muteBtn').onclick = toggleMute;
// language button also on title screen (hud is visible on title too)
hud.classList.remove('hidden');

function setZoneTitle(i, show = true) {
  const z = ZONES[i]; zt.querySelector('.zt-name').textContent = t(z.nameKey); zt.querySelector('.zt-sub').textContent = t(z.subKey);
  if (show) { zt.classList.add('show'); clearTimeout(setZoneTitle.tm); setZoneTitle.tm = setTimeout(() => zt.classList.remove('show'), SHOT ? 1e9 : 6500); }
}

function startGame() {
  audio.start(); audio.setMuted(audio.muted);
  $('startScreen').classList.add('hidden');
  ST.mode = 'play'; ST.ended = false; ST.endTimer = 0; ST.endShown = false;
  rowBtn.classList.remove('hidden'); hint.classList.remove('hidden');
  setTimeout(() => hint.classList.add('hidden'), 9000);
  ST.zoneShown = -1;
}
$('startBtn').onclick = startGame;
// travel to a place (0 = from the very start) with a soft fade
function sailFrom(i) {
  audio.start(); // inside the click so mobile browsers allow sound
  fade.classList.remove('off'); rush = 2.4; // finish any unbuilt terrain while the screen is dark
  setTimeout(() => {
    ST.s = zoneStartU(i) * path.L; ST.speed = 0; ripIdx = 0;
    ['endScreen', 'placeScreen', 'startScreen'].forEach(id => $(id).classList.add('hidden')); audio.fadeOutEnd(false);
    camInit = false; startGame(); fade.classList.add('off');
  }, 2600);
}
$('againBtn').onclick = () => sailFrom(0);
$('placeStartBtn').onclick = () => sailFrom(0);
let placesFrom = 'endScreen';
function openPlaces(from) { placesFrom = from; buildPlaces(); zt.classList.remove('show'); $(from).classList.add('hidden'); $('placeScreen').classList.remove('hidden'); }
$('endPlacesBtn').onclick = () => openPlaces('endScreen');
$('startPlacesBtn').onclick = () => openPlaces('startScreen');
$('placeBackBtn').onclick = () => { $('placeScreen').classList.add('hidden'); $(placesFrom).classList.remove('hidden'); };
// place cards: a tiny painted thumbnail from each place's own palette
function buildPlaces() {
  const grid = $('placeGrid'); grid.innerHTML = '';
  const hx = (c) => '#' + c.getHexString();
  ZONES.forEach((z, i) => {
    const open = i <= reached;
    const b = document.createElement('button'); b.className = 'pcard' + (open ? '' : ' locked');
    b.style.background = `linear-gradient(180deg, ${hx(z.skyTop)} 0%, ${hx(z.skyMid)} 45%, ${hx(z.skyHorizon)} 70%)`;
    const sunC = z.sunSize > 0.2 ? hx(z.sunColor) : z.moon > 0.5 ? '#f4eee0' : 'transparent';
    b.innerHTML = `<div class="sun" style="background:${sunC};opacity:${z.sunSize > 0.2 ? 0.9 : 0.7};${z.sunSize > 0.2 ? '' : 'width:16%;left:70%;top:14%'}"></div>`
      + `<div class="hill" style="background:${hx(z.fogColor.clone().lerp(z.hemiGround, 0.55))}"></div>`
      + `<div class="water" style="background:linear-gradient(180deg, ${hx(z.waterTint.clone().lerp(z.waterDeep, 0.35))}, ${hx(z.waterDeep)})"></div>`
      + `<div class="num">${i + 1} / ${ZONES.length}</div>`
      + (open ? '' : '<svg class="lock ic" viewBox="0 0 24 24"><rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg>')
      + `<div class="lbl">${open ? t(z.nameKey) : t('locked')}</div>`;
    b.setAttribute('aria-label', open ? t(z.nameKey) : t('locked'));
    if (open) b.onclick = () => sailFrom(i); else b.disabled = true;
    grid.appendChild(b);
  });
}

// ---------- ripples ----------
const ripples = water.material.uniforms.ripples.value; let ripIdx = 0;
function addRipple(x, z, str) { ripples[ripIdx].set(x, z, shared.time.value, str); ripIdx = (ripIdx + 1) % W.RIPPLES; }

// ---------- adaptive quality ----------
let fpsAcc = 0, fpsN = 0, fpsT = 0;
let slowWindows = 0;
function adapt(dt) {
  fpsAcc += dt; fpsN++; fpsT += dt;
  if (fpsT < 2.5) return;
  const fps = fpsN / fpsAcc; fpsAcc = fpsN = fpsT = 0;
  window.__fps = fps;
  if (SHOT) return;
  if (fps < 42) {
    slowWindows++;
    if (level > 1 && (level === 3 || slowWindows >= 2)) { level--; slowWindows = 0; applyLevel(); }
    else if (pixelRatio > 0.7) { pixelRatio = Math.max(0.7, pixelRatio - 0.15); resize(); }
    else if (fps < 30 && bloom.enabled) { bloom.enabled = false; }
  } else {
    slowWindows = 0;
    if (fps > 58 && pixelRatio < maxPR) { pixelRatio = Math.min(maxPR, pixelRatio + 0.1); resize(); }
  }
}

// ---------- main loop ----------
const clock = new THREE.Clock();
const boatPos = new THREE.Vector3(), tmpV = new THREE.Vector3(), tmpV2 = new THREE.Vector3(), camPos = new THREE.Vector3(), camLook = new THREE.Vector3();
let camInit = false, wakeT = 0, lastHeading = 0;
const P = {}; const tmpC = new THREE.Color();
const m4 = new THREE.Matrix4(), q4 = new THREE.Quaternion(), s4 = new THREE.Vector3(), p4 = new THREE.Vector3(), e4 = new THREE.Euler();

function frame() {
  const dt = Math.min(clock.getDelta(), 0.05);
  const time = (shared.time.value += dt);
  adapt(dt);

  // --- motion along path ---
  const rowing = isRowing();
  const stroke = boat.update(dt, time, rowing, ST.speed);
  const target = ST.mode === 'title' ? 0 : ST.ended ? 0 : BASE;
  ST.speed += (target - ST.speed) * Math.min(1, dt * 0.6);
  ST.speed += stroke.drive * 9.0 * dt;           // propulsion during each drive phase
  ST.speed -= Math.max(0, ST.speed - BASE) * 0.55 * dt; // water drag
  ST.speed = Math.min(ST.speed, ROW_MAX);
  if (ST.mode !== 'title') ST.s += ST.speed * dt;
  const uEnd = 0.975;
  let u = Math.min(ST.s / path.L, 1);
  if (u > uEnd && !ST.ended && ST.mode === 'play') { ST.ended = true; }
  if (ST.ended) { ST.endTimer += dt; if (ST.endTimer > 2.5 && !ST.endShown) { ST.endShown = true; markReached(ZONES.length - 1); zt.classList.remove('show'); clearTimeout(setZoneTitle.tm); $('endScreen').classList.remove('hidden'); rowBtn.classList.add('hidden'); audio.fadeOutEnd(true); } }
  u = Math.min(u, 0.995);
  const pt = path.curve.getPointAt(u), tg = path.curve.getTangentAt(u);
  const sway = Math.sin(time * 0.21) * 1.2;
  boatPos.set(pt.x + tg.z * sway, 0, pt.z - tg.x * sway);
  const heading = Math.atan2(-tg.x, -tg.z);
  lastHeading = heading;
  boat.root.position.copy(boatPos); boat.root.rotation.y = heading;

  if (stroke.caught) {
    boat.body.updateMatrixWorld(true);
    for (let i = 0; i < 2; i++) { boat.bladeWorld(i, tmpV); addRipple(tmpV.x, tmpV.z, 1.0); }
    audio.splash(0.8 + Math.random() * 0.4);
  }
  wakeT += dt * ST.speed;
  if (wakeT > 2.2) { wakeT = 0; tmpV.set(0, 0, 2.3).applyAxisAngle(THREE.Object3D.DEFAULT_UP, heading).add(boatPos); addRipple(tmpV.x, tmpV.z, 0.35); }
  audio.setRowing(stroke.drive);

  // --- zone palette ---
  zoneParamsAt(u, P);
  const su = sky.material.uniforms;
  su.top.value.copy(P.skyTop); su.mid.value.copy(P.skyMid); su.horizon.value.copy(P.skyHorizon); su.ground.value.copy(P.skyGround);
  su.cloudColor.value.copy(P.cloudColor); su.cloudShadow.value.copy(P.cloudShadow);
  // sun direction is relative to the start heading so it sits ahead of the boat
  su.sunDir.value.copy(P.sunDir); su.sunColor.value.copy(P.sunColor); su.sunSize.value = P.sunSize; su.sunGlow.value = P.sunGlow;
  su.moon.value = P.moon; su.stars.value = P.stars; su.time.value = time;
  sky.position.copy(camera.position);
  scene.fog.color.copy(P.fogColor); scene.fog.near = P.fogNear; scene.fog.far = P.fogFar;
  hemi.color.copy(P.hemiSky); hemi.groundColor.copy(P.hemiGround); hemi.intensity = P.hemiInt;
  sun.color.copy(P.dirColor); sun.intensity = P.dirInt;
  sun.position.copy(P.sunDir).multiplyScalar(100).add(boatPos); sun.position.y = Math.max(sun.position.y, 25 * (1 - P.night) + 60 * P.night); sun.target.position.copy(boatPos);
  // painterly shared lighting
  PU.sunDir.value.copy(P.sunDir); PU.sunCol.value.copy(P.sunColor).multiplyScalar(0.35 + 0.65 * P.sunGlow * (1 - 0.6 * P.night)).lerp(P.dirColor, P.night * 0.5);
  PU.shadowTint.value.copy(P.shadowTint);
  // distant ridges travel with the boat (always on the horizon); thick fog swallows them
  mountains.position.set(boatPos.x, 0, boatPos.z);
  const fogK = THREE.MathUtils.smoothstep(P.fogFar, 420, 200);
  for (const L of mountains.userData.layers) {
    const ml = L.mesh.material.uniforms; ml.ctr.value.set(boatPos.x, boatPos.z);
    ml.haze.value.copy(P.fogColor).lerp(P.skyHorizon, (0.25 + 0.3 * L.depth) * (1 - fogK));
    ml.col.value.copy(P.fogColor).multiplyScalar(0.62 + 0.25 * L.depth).lerp(P.skyTop, 0.22 + 0.2 * L.depth).lerp(ml.haze.value, 0.15 + L.depth * 0.5).lerp(P.fogColor, fogK * (0.55 + 0.4 * L.depth));
    ml.rim.value.copy(P.sunColor).multiplyScalar(P.sunGlow * (1 - P.night) * (1 - fogK));
  }
  if (SHADOWS && sun.castShadow) {
    // stable texel snapping avoids shimmering as the boat moves
    const sc = sun.shadow.camera; sc.updateMatrixWorld();
  }
  const wu = water.material.uniforms;
  wu.time.value = time; wu.deep.value.copy(P.waterDeep); wu.tint.value.copy(P.waterTint); wu.sunDir.value.copy(P.sunDir); wu.sunColor.value.copy(P.sunColor).multiplyScalar(P.sunGlow);
  wu.boat.value.set(boatPos.x, boatPos.z, heading, Math.min(1, ST.speed / 4));
  boat.body.updateMatrixWorld(true); wu.boatInv.value.copy(boat.body.matrixWorld).invert();
  wu.shallow.value.copy(P.shallow).multiplyScalar(0.6 + 0.4 * P.hemiInt); wu.foamCol.value.copy(P.skyHorizon).lerp(P.cloudColor, 0.5).multiplyScalar(0.9);
  water.position.set(Math.round(boatPos.x / 10) * 10, 0, Math.round(boatPos.z / 10) * 10);
  renderer.toneMappingExposure = P.exposure;
  bloom.strength = P.bloom; grade.uniforms.sat.value = P.saturation; grade.uniforms.lift.value.copy(P.lift).multiplyScalar(0.25); grade.uniforms.gain.value.copy(P.gain); grade.uniforms.vig.value = P.vignette; grade.uniforms.time.value = time; grade.uniforms.contrast.value = P.contrast; grade.uniforms.blackPt.value = P.blackPt;
  // god rays: project the sun to screen space
  tmpV.copy(P.sunDir).multiplyScalar(900).add(camera.position).project(camera);
  const sunVis = tmpV.z < 1 ? THREE.MathUtils.smoothstep(1.0 - Math.max(Math.abs(tmpV.x), Math.abs(tmpV.y)), -0.6, 0.2) : 0;
  grade.uniforms.sunUV.value.set(tmpV.x * 0.5 + 0.5, tmpV.y * 0.5 + 0.5);
  grade.uniforms.rays.value = P.rays * sunVis * Math.max(0, Math.min(1, P.sunDir.y * 8 + 0.6));
  grade.uniforms.rayCol.value.copy(P.sunColor).lerp(P.skyHorizon, 0.4);
  petals.material.uniforms.opacity.value = P.petals;
  birds.material.uniforms.center.value.copy(boatPos); birds.material.uniforms.col.value.copy(P.fogColor).multiplyScalar(0.32).lerp(P.skyTop, 0.2); birds.material.uniforms.heading.value = heading; birds.visible = P.birds > 0.3; petals.material.uniforms.center.value.copy(boatPos); petals.visible = P.petals > 0.02 && (level >= 2 || QUALITY === 'low');
  petals.material.uniforms.light.value.copy(P.hemiSky).multiplyScalar(0.42 * P.hemiInt).add(tmpC.copy(P.dirColor).multiplyScalar(0.12 * P.dirInt));
  flowerMat.uniforms.light.value.copy(petals.material.uniforms.light.value).multiplyScalar(0.85 + 0.6 * P.fireflies);
  lilyBlooms.material.color.setRGB(0.75 + 0.6 * P.lanternGlow, 0.6 + 0.4 * P.lanternGlow, 0.62 + 0.35 * P.lanternGlow);
  if (cloudMat) cloudMat.emissive.copy(P.cloudColor).lerp(P.skyHorizon, 0.5).multiplyScalar(0.55 * (1 - P.night));
  motes.material.uniforms.color.value.copy(P.motes).multiplyScalar(0.6 + P.lanternGlow * 1.4);
  motes.material.uniforms.opacity.value = P.fireflies; motes.visible = P.fireflies > 0.02;
  motes.material.uniforms.center.value.copy(boatPos);
  skyL.material.uniforms.opacity.value = P.skyLanterns; skyL.material.uniforms.center.value.copy(boatPos);
  skyL.visible = P.skyLanterns > 0.02;
  boat.light.intensity = 6 + 22 * P.lanternGlow;
  boat.lantern.children[0].material.color.setRGB(2.2 + 2.0 * P.lanternGlow, 1.1 + 1.0 * P.lanternGlow, 0.45 + 0.4 * P.lanternGlow);
  bridgeLights.forEach((l, i) => { l.intensity = (40 + 8 * Math.sin(time * 3 + i)) * P.lanternGlow; });
  for (const L of bridge.userData.lanterns) L.rotation.z = Math.sin(time * 1.2 + L.position.x) * 0.06;

  // finish building the far terrain / water depth in small slices (keeps start-up fast on phones)
  if (!worldDone) { const bud = SHOT || rush > 0 ? 30 : 3; rush -= dt; const a = terrain.userData.step(bud), b = hmap.step(bud * 0.7); worldDone = a && b; }
  // place streaming: only the places around the boat are drawn
  for (const g of zoneGroups) g.visible = u > g.userData.u0 - 0.1 && u < g.userData.u1 + 0.06;
  if (cloudMesh) cloudMesh.visible = u > 0.85;
  for (const ch of terrain.userData.chunks) ch.visible = ch.userData.z1 < boatPos.z + 420 && ch.userData.z0 > boatPos.z - 700;
  audio.setZone(P.from, P.to, P.blend);
  // floating lanterns drift gently downstream (only around the lantern bridge)
  const items = floating.items; const lg = 0.25 + 0.75 * P.lanternGlow;
  const lanternsNear = Math.abs(u - BRIDGE_U) < 0.14; floating.paper.visible = floating.base.visible = lanternsNear;
  for (let i = 0; lanternsNear && i < items.length; i++) {
    const it = items[i];
    const uu = it.u - (time * it.speed * 0.02) / path.L * 10;
    const up = path.curve.getPointAt(THREE.MathUtils.clamp(uu, 0, 1)), ut = path.curve.getTangentAt(THREE.MathUtils.clamp(uu, 0, 1));
    const lat = it.lat + Math.sin(time * 0.2 + it.phase) * 0.8;
    p4.set(up.x + ut.z * lat, 0.12 + Math.sin(time * 1.4 + it.phase) * 0.05, up.z - ut.x * lat);
    // push lanterns gently aside when the boat comes close
    const dx = p4.x - boatPos.x, dz = p4.z - boatPos.z, d = Math.hypot(dx, dz);
    if (d < 3.2) { p4.x += dx / d * (3.2 - d); p4.z += dz / d * (3.2 - d); }
    e4.set(Math.sin(time * 1.1 + it.phase) * 0.06, it.phase, Math.cos(time * 1.3 + it.phase) * 0.06);
    q4.setFromEuler(e4); s4.setScalar(it.scale);
    m4.compose(p4, q4, s4); floating.base.setMatrixAt(i, m4);
    p4.y += 0.38 * it.scale; m4.compose(p4, q4, s4); floating.paper.setMatrixAt(i, m4);
    tmpV2.set(paperColors[i].r, paperColors[i].g, paperColors[i].b).multiplyScalar(lg * (0.85 + 0.15 * Math.sin(time * 2.3 + it.phase * 5)));
    floating.paper.setColorAt(i, new THREE.Color(tmpV2.x, tmpV2.y, tmpV2.z));
  }
  floating.paper.instanceMatrix.needsUpdate = true; floating.base.instanceMatrix.needsUpdate = true; floating.paper.instanceColor.needsUpdate = true;

  // zone title
  if (ST.mode === 'play' && P.zoneIndex !== ST.zoneShown) { ST.zoneShown = P.zoneIndex; setZoneTitle(P.zoneIndex); markReached(P.zoneIndex); }

  // --- camera ---
  if (look.idle > 2.5) { look.tYaw *= 1 - Math.min(1, dt * 0.6); look.tPitch *= 1 - Math.min(1, dt * 0.6); }
  look.idle += dt;
  if (keys.has('ArrowLeft') || keys.has('KeyA')) { look.tYaw -= dt * 1.1; look.idle = 0; }
  if (keys.has('ArrowRight') || keys.has('KeyD')) { look.tYaw += dt * 1.1; look.idle = 0; }
  look.tYaw = THREE.MathUtils.clamp(look.tYaw, -2.2, 2.2); look.tPitch = THREE.MathUtils.clamp(look.tPitch, -0.25, 0.45);
  look.yaw += (look.tYaw - look.yaw) * Math.min(1, dt * 4); look.pitch += (look.tPitch - look.pitch) * Math.min(1, dt * 4);
  let yaw = heading + look.yaw, dist = 8.2, height = 3.1 + look.pitch * 6;
  if (ST.mode === 'title') { yaw = heading + 0.9 + Math.sin(time * 0.08) * 0.35; dist = 10.5; height = 2.6; }
  const portrait = innerHeight > innerWidth; if (portrait) { dist += 1.8; height += 0.6; }
  if (CAM) { yaw = heading + CAM[2]; dist = CAM[0]; height = CAM[1]; }
  camPos.set(Math.sin(yaw) * dist, height, Math.cos(yaw) * dist).add(boatPos);
  camPos.y += Math.sin(time * 1.35) * 0.06;
  // keep camera above terrain
  camLook.set(boatPos.x, 1.3, boatPos.z).addScaledVector(tmpV.set(-Math.sin(heading), 0, -Math.cos(heading)), 4.0);
  if (CAM) camLook.set(boatPos.x, 0.0, boatPos.z).addScaledVector(tmpV, CAM[3] || 0);
  if (!camInit) { camera.position.copy(camPos); camInit = true; }
  camera.position.lerp(camPos, Math.min(1, dt * 2.5));
  camera.lookAt(camLook);

  if (qs.has("nopost")) renderer.render(scene, camera); else composer.render(dt);
  requestAnimationFrame(frame);
}

// expose a tiny hook for automated screenshots
window.__db = { zoneGroups, terrain, places: () => openPlaces('startScreen'), zones: ZONES, look, post: { bloom, fxaa, grade, composer }, renderer, scene, setU: (v) => { ST.s = v * path.L; camInit = false; }, start: startGame, path, ST, row: (on) => { rowBtnHeld = on; } };

requestAnimationFrame(() => { fade.classList.add('off'); });
if (SHOT) { document.body.classList.add('shot'); }
if (qs.has('auto')) { ST.mode = 'play'; $('startScreen').classList.add('hidden'); }
frame();
