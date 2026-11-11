// Zone definitions: 8 original places along one continuous river, from sunset to dawn.
// Each zone owns a palette / light / fog / grade set, ambience amounts and a music mood (same index in audio.js).
import * as THREE from 'three';

const c = (h) => new THREE.Color(h);
const v = (x, y, z) => new THREE.Vector3(x, y, z).normalize();

// shared defaults, overridden per zone
const D = {
  moon: 0, stars: 0, night: 0, fireflies: 0, skyLanterns: 0, birds: 0, petals: 0, rays: 0, lanternGlow: 0.3,
  sunSize: 1, sunGlow: 1, contrast: 1.08, blackPt: 0.03, vignette: 0.42, saturation: 1.12, exposure: 0.92,
};
const Z = (o) => Object.assign({}, D, o);

export const ZONES = [
  Z({ // 1 노을 강
    id: 'sunset-river', nameKey: 'z1name', subKey: 'z1sub',
    skyTop: c('#4a4f96'), skyMid: c('#e0705e'), skyHorizon: c('#ffb36a'), skyGround: c('#c07060'),
    cloudColor: c('#ffc890'), cloudShadow: c('#a04a72'),
    sunDir: v(0.25, 0.075, -1), sunColor: c('#fff0c8'), sunSize: 1.0, sunGlow: 1.0,
    fogColor: c('#e8946e'), fogNear: 85, fogFar: 450,
    hemiSky: c('#ffc6a0'), hemiGround: c('#5c3c46'), hemiInt: 1.25, dirColor: c('#ffb27a'), dirInt: 2.6,
    waterDeep: c('#3b3050'), waterTint: c('#ffb78a'),
    exposure: 0.88, saturation: 1.2, lift: c('#2a1830'), gain: c('#fff1dc'), vignette: 0.42,
    bloom: 0.55, lanternGlow: 0.35, motes: c('#ffe2a0'),
    shadowTint: c('#c4b0dc'), rays: 0.45, petals: 1.0, shallow: c('#6e5040'), contrast: 1.1, blackPt: 0.035, birds: 1,
  }),
  Z({ // 2 황금 갈대밭
    id: 'golden-reeds', nameKey: 'z3name', subKey: 'z3sub',
    skyTop: c('#55579c'), skyMid: c('#ee9868'), skyHorizon: c('#ffd08c'), skyGround: c('#c89a70'),
    cloudColor: c('#ffe0a8'), cloudShadow: c('#b0607a'),
    sunDir: v(-0.35, 0.1, -1), sunColor: c('#fff4d0'), sunSize: 1.0, sunGlow: 0.9,
    fogColor: c('#eeb47e'), fogNear: 90, fogFar: 470,
    hemiSky: c('#ffdcb0'), hemiGround: c('#6a5040'), hemiInt: 1.3, dirColor: c('#ffc890'), dirInt: 2.4,
    waterDeep: c('#44385a'), waterTint: c('#ffc890'),
    exposure: 0.9, saturation: 1.15, lift: c('#2a1a28'), gain: c('#fff4e0'), vignette: 0.4,
    bloom: 0.5, lanternGlow: 0.25, motes: c('#ffe8b0'),
    shadowTint: c('#c8b4d8'), rays: 0.5, shallow: c('#7a5a40'), contrast: 1.08, fireflies: 0.18, birds: 1,
  }),
  Z({ // 3 나무 다리
    id: 'wooden-bridges', nameKey: 'z4name', subKey: 'z4sub',
    skyTop: c('#3e4a8e'), skyMid: c('#c87a96'), skyHorizon: c('#ffb48a'), skyGround: c('#9a6a78'),
    cloudColor: c('#ffc0a8'), cloudShadow: c('#7a4a7a'),
    sunDir: v(0.4, 0.035, -1), sunColor: c('#ffd8b0'), sunSize: 0.85, sunGlow: 0.8,
    fogColor: c('#c88a90'), fogNear: 70, fogFar: 420,
    hemiSky: c('#e8b8c0'), hemiGround: c('#4a3448'), hemiInt: 1.15, dirColor: c('#ffb090'), dirInt: 1.8,
    waterDeep: c('#2e2848'), waterTint: c('#e8a0a8'),
    exposure: 0.95, saturation: 1.12, lift: c('#241430'), gain: c('#ffeede'), vignette: 0.44,
    bloom: 0.6, lanternGlow: 0.5, motes: c('#ffd8a0'),
    shadowTint: c('#a898d0'), rays: 0.3, petals: 0.25, shallow: c('#5a4440'), night: 0.2, fireflies: 0.1, birds: 0.6,
  }),
  Z({ // 4 안개 골짜기
    id: 'misty-valley', nameKey: 'z5name', subKey: 'z5sub',
    skyTop: c('#5a6a8a'), skyMid: c('#a8a0b8'), skyHorizon: c('#e8c8c0'), skyGround: c('#8a8a9a'),
    cloudColor: c('#f0e0e0'), cloudShadow: c('#8a8aa8'),
    sunDir: v(-0.2, 0.03, -1), sunColor: c('#ffe0d0'), sunSize: 0.35, sunGlow: 0.45,
    fogColor: c('#b8b4c4'), fogNear: 16, fogFar: 200,
    hemiSky: c('#d0d0e0'), hemiGround: c('#4a4a58'), hemiInt: 1.2, dirColor: c('#e0d0d8'), dirInt: 1.0,
    waterDeep: c('#3a4258'), waterTint: c('#c8c8dc'),
    exposure: 1.0, saturation: 0.95, lift: c('#20202e'), gain: c('#f4f0f4'), vignette: 0.4,
    bloom: 0.45, lanternGlow: 0.55, motes: c('#f0f0ff'),
    shadowTint: c('#a0a8c8'), rays: 0.15, shallow: c('#4a4a50'), contrast: 1.04, blackPt: 0.02, night: 0.4, birds: 0.2,
  }),
  Z({ // 5 반딧불 숲
    id: 'firefly-forest', nameKey: 'z6name', subKey: 'z6sub',
    skyTop: c('#0c1a2a'), skyMid: c('#1e3a44'), skyHorizon: c('#4a6a5a'), skyGround: c('#142420'),
    cloudColor: c('#3a5a5a'), cloudShadow: c('#0e1e26'),
    sunDir: v(0.1, -0.05, -1), sunColor: c('#c0e0a0'), sunSize: 0, sunGlow: 0.25, moon: 0.3, stars: 0.5,
    fogColor: c('#1e3a38'), fogNear: 20, fogFar: 240,
    hemiSky: c('#6a9a8a'), hemiGround: c('#10201c'), hemiInt: 0.95, dirColor: c('#9ac0b0'), dirInt: 0.5,
    waterDeep: c('#08141a'), waterTint: c('#4a7a6a'),
    exposure: 1.2, saturation: 1.1, lift: c('#08141a'), gain: c('#f0ffe8'), vignette: 0.5,
    bloom: 0.95, lanternGlow: 0.8, motes: c('#d8ff90'),
    shadowTint: c('#6a8a90'), shallow: c('#1a2420'), contrast: 1.06, blackPt: 0.02, night: 1, fireflies: 1,
  }),
  Z({ // 6 등불 다리
    id: 'lantern-bridge', nameKey: 'z2name', subKey: 'z2sub',
    skyTop: c('#0e1236'), skyMid: c('#3a2f6e'), skyHorizon: c('#d0726e'), skyGround: c('#2b2244'),
    cloudColor: c('#8f6aa0'), cloudShadow: c('#241c48'),
    sunDir: v(-0.15, -0.02, -1), sunColor: c('#ffb08a'), sunSize: 0.0, sunGlow: 0.55, moon: 1.0, stars: 1.0,
    fogColor: c('#4c3f6e'), fogNear: 25, fogFar: 300,
    hemiSky: c('#7c6cc0'), hemiGround: c('#2c2244'), hemiInt: 1.0, dirColor: c('#a9a4ff'), dirInt: 0.7,
    waterDeep: c('#0f1230'), waterTint: c('#8a7ad0'),
    exposure: 1.12, saturation: 1.12, lift: c('#140c2a'), gain: c('#ffe7cf'), vignette: 0.5,
    bloom: 0.9, lanternGlow: 1.0, motes: c('#ffd27a'),
    shadowTint: c('#8c88c8'), rays: 0.12, shallow: c('#2a2038'), contrast: 1.08, blackPt: 0.02, night: 1, fireflies: 0.6, skyLanterns: 1,
  }),
  Z({ // 7 별빛 호수
    id: 'starlight-lake', nameKey: 'z7name', subKey: 'z7sub',
    skyTop: c('#060a26'), skyMid: c('#1a2260'), skyHorizon: c('#4a4a8a'), skyGround: c('#10143a'),
    cloudColor: c('#4a4a80'), cloudShadow: c('#10123a'),
    sunDir: v(0, -0.1, -1), sunColor: c('#a0b0ff'), sunSize: 0, sunGlow: 0.2, moon: 1.0, stars: 1.4,
    fogColor: c('#1a2050'), fogNear: 60, fogFar: 480,
    hemiSky: c('#6a78c8'), hemiGround: c('#141838'), hemiInt: 0.95, dirColor: c('#b0c0ff'), dirInt: 0.8,
    waterDeep: c('#050a24'), waterTint: c('#8a9ae0'),
    exposure: 1.18, saturation: 1.1, lift: c('#080a24'), gain: c('#eef0ff'), vignette: 0.5,
    bloom: 0.9, lanternGlow: 0.7, motes: c('#c8d8ff'),
    shadowTint: c('#7a80c0'), shallow: c('#1a1c38'), contrast: 1.06, blackPt: 0.02, night: 1, fireflies: 0.3, skyLanterns: 0.35,
  }),
  Z({ // 8 새벽 구름바다
    id: 'dawn-cloud-sea', nameKey: 'z8name', subKey: 'z8sub',
    skyTop: c('#44509e'), skyMid: c('#e2849c'), skyHorizon: c('#ffc48a'), skyGround: c('#d89aa8'),
    cloudColor: c('#fff0e4'), cloudShadow: c('#b07098'),
    sunDir: v(0.05, 0.045, -1), sunColor: c('#fff0d8'), sunSize: 1.1, sunGlow: 0.9,
    fogColor: c('#e8aaae'), fogNear: 70, fogFar: 560,
    hemiSky: c('#ffd8d8'), hemiGround: c('#7a5a78'), hemiInt: 1.2, dirColor: c('#ffd0b0'), dirInt: 2.0,
    waterDeep: c('#4a3e78'), waterTint: c('#ffc0b8'),
    exposure: 0.8, saturation: 1.18, lift: c('#2a1c3a'), gain: c('#fff4ea'), vignette: 0.42,
    bloom: 0.55, lanternGlow: 0.2, motes: c('#fff0d0'),
    shadowTint: c('#b8a0d8'), rays: 0.5, shallow: c('#7a5a6a'), contrast: 1.12, blackPt: 0.04, birds: 1,
  }),
];
ZONES.forEach((z, i) => { z.start = i / ZONES.length; z.index = i; });

// Blend window around each boundary (fraction of the whole path) — about 25 s of drifting.
export const BLEND = 0.03;

const tmp = {};
// Returns blended params object for a given progress u in [0,1].
export function zoneParamsAt(u, out = tmp) {
  const n = ZONES.length;
  let i = Math.max(0, Math.min(n - 1, Math.floor(u * n)));
  let a = ZONES[i], b = a, w = 0;
  const next = ZONES[i + 1];
  if (next) { const e = next.start; const t = THREE.MathUtils.smoothstep(u, e - BLEND, e + BLEND * 0.6); if (t > 0) { b = next; w = t; } }
  if (w === 0 && i > 0) { const e = a.start; const t = THREE.MathUtils.smoothstep(u, e - BLEND, e + BLEND * 0.6); if (t < 1) { b = a; a = ZONES[i - 1]; w = t; } }
  for (const k in a) {
    const va = a[k], vb = b[k];
    if (va instanceof THREE.Color) { (out[k] ||= new THREE.Color()).copy(va).lerp(vb, w); }
    else if (va instanceof THREE.Vector3) { (out[k] ||= new THREE.Vector3()).copy(va).lerp(vb, w).normalize(); }
    else if (typeof va === 'number' && k !== 'start' && k !== 'index') out[k] = va + (vb - va) * w;
  }
  out.blend = w; out.from = a.index; out.to = b.index;
  out.zoneIndex = w > 0.5 ? out.to : out.from;
  return out;
}
