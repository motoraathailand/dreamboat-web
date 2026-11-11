// Zone definitions. Each zone owns a palette / light / fog / grade set and a music mood.
// Add more zones later by appending here and extending the path in world.js.
import * as THREE from 'three';

const c = (h) => new THREE.Color(h);

export const ZONES = [
  {
    id: 'sunset-river', nameKey: 'z1name', subKey: 'z1sub',
    start: 0.0, // path progress where the zone begins
    skyTop: c('#4a4f96'), skyMid: c('#e0705e'), skyHorizon: c('#ffb36a'), skyGround: c('#c07060'),
    cloudColor: c('#ffc890'), cloudShadow: c('#a04a72'),
    sunDir: new THREE.Vector3(0.25, 0.075, -1).normalize(), sunColor: c('#fff0c8'), sunSize: 1.0, sunGlow: 1.0,
    moon: 0.0, stars: 0.0,
    fogColor: c('#e8946e'), fogNear: 70, fogFar: 430,
    hemiSky: c('#ffc6a0'), hemiGround: c('#5c3c46'), hemiInt: 1.25,
    dirColor: c('#ffb27a'), dirInt: 2.6,
    waterDeep: c('#3b3050'), waterTint: c('#ffb78a'),
    exposure: 0.92, saturation: 1.18, lift: c('#2a1830'), gain: c('#fff1dc'), vignette: 0.42,
    bloom: 0.5, lanternGlow: 0.35, motes: c('#ffe2a0'),
  },
  {
    id: 'lantern-bridge', nameKey: 'z2name', subKey: 'z2sub',
    start: 0.5,
    skyTop: c('#0e1236'), skyMid: c('#3a2f6e'), skyHorizon: c('#d0726e'), skyGround: c('#2b2244'),
    cloudColor: c('#8f6aa0'), cloudShadow: c('#241c48'),
    sunDir: new THREE.Vector3(-0.15, -0.02, -1).normalize(), sunColor: c('#ffb08a'), sunSize: 0.0, sunGlow: 0.55,
    moon: 1.0, stars: 1.0,
    fogColor: c('#4c3f6e'), fogNear: 25, fogFar: 300,
    hemiSky: c('#7c6cc0'), hemiGround: c('#1c1428'), hemiInt: 0.9,
    dirColor: c('#a9a4ff'), dirInt: 0.7,
    waterDeep: c('#0f1230'), waterTint: c('#8a7ad0'),
    exposure: 1.12, saturation: 1.12, lift: c('#140c2a'), gain: c('#ffe7cf'), vignette: 0.5,
    bloom: 0.95, lanternGlow: 1.0, motes: c('#ffd27a'),
  },
];

// Blend window between zone i and i+1 (fraction of path) — long and smooth.
export const BLEND = 0.12;

const tmp = {};
// Returns blended params object for a given progress u in [0,1].
export function zoneParamsAt(u, out = tmp) {
  let i = 0;
  for (let k = 0; k < ZONES.length; k++) if (u >= ZONES[k].start) i = k;
  let a = ZONES[i], b = ZONES[Math.min(i + 1, ZONES.length - 1)], w = 0;
  if (b !== a) {
    const edge = b.start;
    w = THREE.MathUtils.smoothstep(u, edge - BLEND, edge + BLEND * 0.6);
  }
  // also blend backwards from previous zone
  if (i > 0) {
    const p = ZONES[i - 1], edge = a.start;
    const wb = THREE.MathUtils.smoothstep(u, edge - BLEND, edge + BLEND * 0.6);
    if (wb < 1) { b = a; a = p; w = wb; }
  }
  for (const k in a) {
    const va = a[k], vb = b[k];
    if (va instanceof THREE.Color) { (out[k] ||= new THREE.Color()).copy(va).lerp(vb, w); }
    else if (va instanceof THREE.Vector3) { (out[k] ||= new THREE.Vector3()).copy(va).lerp(vb, w).normalize(); }
    else if (typeof va === 'number') out[k] = va + (vb - va) * w;
  }
  out.blend = w; out.from = ZONES.indexOf(a); out.to = ZONES.indexOf(b);
  out.zoneIndex = w > 0.5 ? out.to : out.from;
  return out;
}
