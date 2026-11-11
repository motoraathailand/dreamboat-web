// Procedural wooden rowing boat with a rower, two oars and a hanging bow lantern.
import * as THREE from 'three';
import { lanternMesh } from './world.js?v=3';
import { paint } from './paint.js?v=3';

const LEN = 4.4;
const hw = (s) => 0.7 * Math.pow(Math.max(1 - Math.pow(Math.abs(s), 2.4), 0.0), 0.55) + 0.02;
const gun = (s) => 0.42 + 0.28 * Math.pow(Math.abs(s), 2.5);
const dep = (s) => 0.5 * (1 - 0.55 * s * s);
// inner hull surface height at (s, x); the water shader uses the same formulas to keep water out of the boat
export const hullY = (s, x) => { const w = hw(s); const si = Math.min(1, Math.abs(x) / w); return gun(s) - dep(s) * Math.pow(Math.sqrt(1 - si * si), 0.8) - 0.25; };
export const BOAT_FLOAT = 0.06; // extra freeboard

function hullGeometry() {
  // smooth hull with painted plank bands and a coloured sheer strake
  const NS = 30, NK = 16; const pos = [], col = [], idx = [];
  const cA = new THREE.Color('#8a5634'), cB = new THREE.Color('#9c6640'), cSeam = new THREE.Color('#5e3822'), cBand = new THREE.Color('#2f5a62'), cBand2 = new THREE.Color('#c8a050'), cKeel = new THREE.Color('#3e2416');
  const tmp = new THREE.Color();
  for (let i = 0; i <= NS; i++) {
    const s = -1 + 2 * i / NS, z = s * LEN / 2;
    for (let k = 0; k <= NK; k++) {
      const th = -Math.PI / 2 + Math.PI * k / NK;
      const x = hw(s) * Math.sin(th);
      const y = gun(s) - dep(s) * Math.pow(Math.cos(th), 0.8) - 0.25;
      pos.push(x, y, z);
      const fromRim = Math.min(k, NK - k);
      if (fromRim === 0) tmp.copy(cSeam);
      else if (fromRim === 1) tmp.copy(cBand);
      else if (fromRim === 2) tmp.copy(cBand2);
      else if (fromRim >= NK / 2 - 0) tmp.copy(cKeel);
      else tmp.copy(fromRim % 2 ? cA : cB).multiplyScalar(0.92 + 0.12 * Math.sin(i * 0.9 + k * 2.1));
      col.push(tmp.r, tmp.g, tmp.b);
    }
  }
  for (let i = 0; i < NS; i++) for (let k = 0; k < NK; k++) {
    const a = i * (NK + 1) + k, b = a + NK + 1;
    idx.push(a, b, a + 1, b, b + 1, a + 1);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

const lam = (c, o) => paint(new THREE.MeshLambertMaterial({ color: c }), o || { freq: 4.0, amt: 0.12, rim: 0.35 });

export class Boat {
  constructor() {
    this.root = new THREE.Group();   // follows path, yaw
    this.body = new THREE.Group();   // bob / pitch / roll
    this.root.add(this.body);
    const wood = lam('#8a5634');
    const dark = lam('#4a2c1c');
    const hull = new THREE.Mesh(hullGeometry(), paint(new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide }), { freq: 5.0, amt: 0.1, rim: 0.4, inner: 0.18 }));
    this.body.add(hull);
    // gunwale rims
    for (const side of [-1, 1]) {
      const pts = []; for (let i = 0; i <= 24; i++) { const s = -0.97 + 1.94 * i / 24; pts.push(new THREE.Vector3(side * hw(s), gun(s) - 0.24, s * LEN / 2)); }
      this.body.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 40, 0.05, 6), dark));
    }
    // ribs inside the hull
    for (let r = 0; r < 7; r++) {
      const s = -0.7 + 1.4 * r / 6; const pts = [];
      for (let k = 0; k <= 10; k++) { const th = -Math.PI / 2 + Math.PI * k / 10; pts.push(new THREE.Vector3(hw(s) * Math.sin(th) * 0.94, gun(s) - dep(s) * Math.pow(Math.cos(th), 0.8) * 0.94 - 0.22, s * LEN / 2)); }
      this.body.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 14, 0.022, 4), dark));
    }
    // stem posts at bow and stern
    for (const end of [-1, 1]) {
      const z0 = end * LEN / 2 * 0.985;
      const c = new THREE.QuadraticBezierCurve3(new THREE.Vector3(0, -0.45, z0 * 0.96), new THREE.Vector3(0, 0.25, z0 * 1.03), new THREE.Vector3(0, 0.62, z0 * 1.02));
      this.body.add(new THREE.Mesh(new THREE.TubeGeometry(c, 10, 0.05, 6), dark));
    }
    // seats (thwarts)
    for (const s of [-0.42, 0.05, 0.62]) {
      const w = hw(s) * 2 - 0.08; const seat = new THREE.Mesh(new THREE.BoxGeometry(w, 0.06, 0.32), wood);
      seat.position.set(0, gun(s) - 0.42, s * LEN / 2); this.body.add(seat);
    }
    // dry floorboards that follow the inside of the hull (slats with small gaps), plus a basket and a bundle
    {
      const slats = [-0.22, -0.11, 0.0, 0.11, 0.22], NSz = 24, pos = [], col = [], idx = [];
      const cW = new THREE.Color('#b08058'), tmp = new THREE.Color();
      let base = 0;
      slats.forEach((sx, si) => {
        for (let i = 0; i <= NSz; i++) {
          const ss = -0.78 + 1.56 * i / NSz;
          for (const dx of [-0.048, 0.048]) {
            const x = (sx + dx) * Math.min(1, hw(ss) / 0.55);
            pos.push(x, hullY(ss, x) + 0.035, ss * LEN / 2);
            tmp.copy(cW).multiplyScalar(0.86 + 0.14 * Math.sin(si * 2.3 + i * 0.7) + (i % 6 === 0 ? -0.18 : 0)); col.push(tmp.r, tmp.g, tmp.b);
          }
          if (i < NSz) { const a = base + i * 2; idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); }
        }
        base += (NSz + 1) * 2;
      });
      const fg = new THREE.BufferGeometry();
      fg.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); fg.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
      fg.setIndex(idx); fg.computeVertexNormals();
      const floor = new THREE.Mesh(fg, paint(new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide }), { freq: 9.0, amt: 0.12, rim: 0.2 }));
      this.body.add(floor);
      // cross battens holding the slats
      for (const ss of [-0.55, -0.2, 0.35, 0.7]) {
        const b = new THREE.Mesh(new THREE.BoxGeometry(hw(ss) * 1.1, 0.03, 0.07), dark); b.position.set(0, hullY(ss, 0) + 0.065, ss * LEN / 2); this.body.add(b);
      }
    }
    const basket = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.13, 0.2, 12, 1), lam('#c09858', { freq: 12.0, amt: 0.25 }));
    basket.position.set(0.1, hullY(0.62, 0.1) + 0.16, 0.62 * LEN / 2 + 0.25); this.body.add(basket);
    const fruit = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 6), lam('#e07a3a')); fruit.position.copy(basket.position).add(new THREE.Vector3(0.02, 0.1, 0)); this.body.add(fruit);
    const bundle = new THREE.Mesh(new THREE.SphereGeometry(0.18, 12, 8), lam('#7a4a6a')); bundle.scale.set(1.2, 0.6, 0.9);
    bundle.position.set(-0.1, hullY(-0.5, -0.1) + 0.14, -0.5 * LEN / 2); this.body.add(bundle);
    // bow lantern pole (front = -z)
    const pole = new THREE.Mesh(new THREE.TubeGeometry(new THREE.QuadraticBezierCurve3(new THREE.Vector3(0, 0.3, -2.05), new THREE.Vector3(0, 1.9, -2.2), new THREE.Vector3(0, 2.05, -2.95)), 16, 0.035, 6), dark);
    this.body.add(pole);
    this.lantern = lanternMesh(new THREE.Color(4.0, 2.0, 0.8));
    this.lantern.scale.setScalar(0.55);
    this.lanternPivot = new THREE.Group(); this.lanternPivot.position.set(0, 2.02, -2.92);
    const string = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.32, 3), dark); string.position.y = -0.16;
    this.lantern.position.y = -0.5; this.lanternPivot.add(string, this.lantern); this.body.add(this.lanternPivot);
    this.light = new THREE.PointLight('#ffb060', 16, 22, 1.6); this.light.position.set(0, -0.5, 0); this.lanternPivot.add(this.light);

    // rower: sits on the middle thwart facing the stern (+z)
    this.rower = new THREE.Group(); this.rower.position.set(0, gun(0.05) - 0.4, 0.05 * LEN / 2 - 0.05); this.body.add(this.rower);
    this.torso = new THREE.Group(); this.rower.add(this.torso);
    const robeProfile = [[0.0, 0.0], [0.33, 0.0], [0.36, 0.12], [0.3, 0.42], [0.22, 0.7], [0.17, 0.84], [0.1, 0.9], [0.0, 0.92]].map(([r, y]) => new THREE.Vector2(r, y));
    const robeM = lam('#3d4a7a', { freq: 6.0, amt: 0.14, rim: 0.5 });
    const robe = new THREE.Mesh(new THREE.LatheGeometry(robeProfile, 14), robeM); robe.scale.z = 0.8; this.torso.add(robe);
    // sash
    const sash = new THREE.Mesh(new THREE.TorusGeometry(0.25, 0.035, 6, 16), lam('#d8a04a')); sash.rotation.x = Math.PI / 2; sash.scale.y = 0.8; sash.position.y = 0.46; this.torso.add(sash);
    const scarfM = lam('#c0503a', { freq: 6.0, amt: 0.12, rim: 0.5 });
    const scarf = new THREE.Mesh(new THREE.TorusGeometry(0.14, 0.055, 8, 16), scarfM);
    scarf.rotation.x = Math.PI / 2; scarf.position.y = 0.86; this.torso.add(scarf);
    // scarf tail fluttering behind
    const tailG = new THREE.PlaneGeometry(0.12, 0.5, 1, 6); tailG.translate(0, -0.25, 0);
    this.scarfTail = new THREE.Mesh(tailG, paint(new THREE.MeshLambertMaterial({ color: '#c0503a', side: THREE.DoubleSide }), { freq: 6.0, amt: 0.1, rim: 0.5 }));
    this.scarfTail.position.set(0.05, 0.88, -0.15); this.torso.add(this.scarfTail);
    const skin = lam('#e2b292', { freq: 8.0, amt: 0.06, rim: 0.5 });
    this.headG = new THREE.Group(); this.headG.position.y = 0.9; this.torso.add(this.headG);
    const HG = this.headG; const hgAdd = HG.add.bind(HG); HG.add = (...o) => { o.forEach(m => m.position.y -= 0.9); return hgAdd(...o); };
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.15, 18, 14), skin);
    head.position.y = 1.03; this.headG.add(head);
    const hair = new THREE.Mesh(new THREE.SphereGeometry(0.155, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.55), lam('#2a1c18'));
    hair.position.y = 1.04; hair.rotation.x = 0.5; this.headG.add(hair);
    const bun = new THREE.Mesh(new THREE.SphereGeometry(0.06, 10, 8), lam('#2a1c18')); bun.position.set(0, 1.12, -0.13); this.headG.add(bun);
    // conical woven hat with a soft brim
    const hatProfile = [[0.0, 0.25], [0.08, 0.2], [0.26, 0.08], [0.44, -0.0], [0.46, -0.02], [0.0, -0.02]].map(([r, y]) => new THREE.Vector2(r, y));
    const hat = new THREE.Mesh(new THREE.LatheGeometry(hatProfile.reverse(), 20), paint(new THREE.MeshLambertMaterial({ color: '#d8b06a', side: THREE.DoubleSide }), { freq: 14.0, amt: 0.18, rim: 0.6, trans: 0.4 }));
    hat.position.y = 1.13; this.headG.add(hat);
    const hatBand = new THREE.Mesh(new THREE.TorusGeometry(0.155, 0.018, 4, 16), lam('#a8402e')); hatBand.rotation.x = Math.PI / 2; hatBand.position.y = 1.16; this.headG.add(hatBand);
    this.shoulders = [new THREE.Vector3(-0.2, 0.78, 0.02), new THREE.Vector3(0.2, 0.78, 0.02)];
    const armMat = lam('#34406c', { freq: 6.0, amt: 0.12, rim: 0.5 });
    const armGeo = new THREE.CapsuleGeometry(0.055, 1, 4, 8); armGeo.translate(0, 0.5, 0);
    this.arms = [new THREE.Mesh(armGeo, armMat), new THREE.Mesh(armGeo, armMat)];
    this.arms.forEach(a => this.body.add(a));
    this.hands = [new THREE.Mesh(new THREE.SphereGeometry(0.055, 10, 8), skin), new THREE.Mesh(new THREE.SphereGeometry(0.055, 10, 8), skin)];
    this.hands.forEach(h => this.body.add(h));

    // oars: pivot at oarlocks, a little aft of the rower
    this.oars = [];
    const oarZ = 0.05 * LEN / 2 + 0.38, oarY = gun(0.17) - 0.22;
    const oarWood = lam('#a87448', { freq: 6.0, amt: 0.1, rim: 0.4 });
    for (const side of [-1, 1]) {
      const pivot = new THREE.Group(); pivot.rotation.order = 'YZX';
      pivot.position.set(side * (hw(0.17) + 0.02), oarY, oarZ);
      const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.034, 2.7, 8), oarWood);
      shaft.rotation.z = Math.PI / 2; shaft.position.x = side * (2.7 / 2 - 0.8);
      const blade = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 8), oarWood);
      blade.scale.set(0.34, 0.022, 0.11);
      blade.position.x = side * (2.7 - 0.8 - 0.1);
      const grip = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.22, 8), dark); grip.rotation.z = Math.PI / 2; grip.position.x = -side * 0.72;
      const lock = new THREE.Mesh(new THREE.TorusGeometry(0.05, 0.012, 4, 10), dark); lock.rotation.y = Math.PI / 2;
      pivot.add(shaft, blade, grip, lock);
      this.body.add(pivot);
      this.oars.push({ side, pivot, blade });
    }
    this.body.traverse(o => { if (o.isMesh && o.material.isMeshLambertMaterial) { o.castShadow = true; o.receiveShadow = true; } });
    this.phase = Math.PI * 1.3; // recovery
    this.rowAmt = 0;            // 0 rest, 1 rowing
    this.tmpV = new THREE.Vector3(); this.tmpV2 = new THREE.Vector3();
    this.handleLocal = (side) => new THREE.Vector3(-side * 0.8, 0, 0);
  }

  // returns {catch:boolean, drive:0..1} for this frame
  update(dt, t, rowing, speed) {
    const target = rowing ? 1 : 0;
    this.rowAmt += (target - this.rowAmt) * Math.min(1, dt * (rowing ? 3 : 1.2));
    let caught = false;
    const prev = this.phase;
    // keep cycling while rowing, finish the current stroke when released
    if (rowing || (this.phase % (Math.PI * 2)) < Math.PI * 1.85 && this.rowAmt > 0.05) {
      this.phase += dt * (Math.PI * 2) * 0.72;
    }
    const tp = Math.PI * 2;
    if (Math.floor(prev / tp) !== Math.floor(this.phase / tp) && rowing) caught = true;
    const ph = this.phase % tp;
    const drive = ph < Math.PI ? Math.pow(Math.sin(ph), 0.5) : 0;
    // stroke pose
    const sweep = 0.05 + 0.58 * Math.cos(ph);
    const elev = 0.14 - 0.44 * drive;
    const feather = ph < Math.PI ? 0 : Math.sin(ph - Math.PI) * 1.3;
    // resting pose: blades trailing on the water
    const ra = this.rowAmt;
    const restSweep = -0.42 + Math.sin(t * 0.7) * 0.03, restElev = -0.2;
    for (const o of this.oars) {
      const sw = restSweep + (sweep - restSweep) * ra, el = restElev + (elev - restElev) * ra;
      o.pivot.rotation.y = o.side * sw;
      o.pivot.rotation.z = o.side * el;
      o.pivot.rotation.x = o.side * feather * ra;
    }
    // torso lean
    const lean = (0.03 + 0.3 * Math.cos(ph)) * ra;
    const breath = Math.sin(t * 1.6) * 0.012 * (1 - ra);
    this.torso.rotation.x = lean + breath;
    this.torso.rotation.z = 0.03 * Math.sin(t * 0.83 + 0.4) * (1 - ra) - 0.02 * Math.sin(ph) * ra;
    // head: calm look-around while drifting, gentle nod with each stroke
    const look = Math.sin(t * 0.21) * 0.55 + Math.sin(t * 0.53 + 1.0) * 0.2;
    this.headG.rotation.y = look * (1 - ra) * 0.9;
    this.headG.rotation.x = -lean * 0.45 + 0.05 * Math.sin(ph * 2.0) * ra + Math.sin(t * 0.37) * 0.04 * (1 - ra);
    this.headG.rotation.z = Math.sin(t * 0.29 + 2.0) * 0.05 * (1 - ra);
    this.torso.position.z = lean * 0.15;
    // arms reach handles
    this.body.updateMatrixWorld(true);
    for (let i = 0; i < 2; i++) {
      const o = this.oars[i];
      const hand = o.pivot.localToWorld(this.tmpV.set(-o.side * 0.72, 0, 0));
      this.body.worldToLocal(hand);
      const sh = this.torso.localToWorld(this.tmpV2.copy(this.shoulders[i]));
      this.body.worldToLocal(sh);
      const arm = this.arms[i]; arm.position.copy(sh);
      const dir = hand.clone().sub(sh); const len = dir.length();
      arm.scale.set(1, len, 1); arm.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
      this.hands[i].position.copy(hand);
    }
    this.scarfTail.rotation.x = -0.9 - 0.25 * Math.sin(t * 3.1) - Math.min(speed, 7) * 0.05;
    this.scarfTail.rotation.z = 0.15 * Math.sin(t * 2.3);
    // bob, pitch with surge, roll
    const bm = this.bobMul || 1;
    this.body.position.y = BOAT_FLOAT + (0.05 * Math.sin(t * 1.35) + 0.03 * Math.sin(t * 2.3 + 1.1) - 0.02 * drive * ra) * bm;
    this.body.rotation.x = (0.022 * Math.sin(t * 1.1) + 0.03 * drive * ra) * bm;
    this.body.rotation.z = (0.035 * Math.sin(t * 0.83 + 0.4) + 0.012 * Math.sin(t * 1.9)) * bm;
    // lantern swings as a pendulum
    this.lanternPivot.rotation.x = -0.12 * Math.sin(t * 1.35 + 0.6) - 0.08 * drive * ra;
    this.lanternPivot.rotation.z = 0.1 * Math.sin(t * 0.83 + 1.4);
    return { caught, drive: drive * ra };
  }

  bladeWorld(i, out) { return this.oars[i].blade.getWorldPosition(out); }
}
