// Procedural wooden rowing boat with a rower, two oars and a hanging bow lantern.
import * as THREE from 'three';
import { lanternMesh } from './world.js';

const LEN = 4.4;
const hw = (s) => 0.7 * Math.pow(Math.max(1 - Math.pow(Math.abs(s), 2.4), 0.0), 0.55) + 0.02;
const gun = (s) => 0.42 + 0.28 * Math.pow(Math.abs(s), 2.5);
const dep = (s) => 0.5 * (1 - 0.55 * s * s);

function hullGeometry() {
  const NS = 18, NK = 8; const pos = [], col = [], idx = [];
  const cA = new THREE.Color('#8a5634'), cB = new THREE.Color('#a26a40'), cRim = new THREE.Color('#5a3420'), cKeel = new THREE.Color('#4a2c1c');
  for (let i = 0; i <= NS; i++) {
    const s = -1 + 2 * i / NS, z = s * LEN / 2;
    for (let k = 0; k <= NK; k++) {
      const th = -Math.PI / 2 + Math.PI * k / NK;
      const x = hw(s) * Math.sin(th);
      const y = gun(s) - dep(s) * Math.pow(Math.cos(th), 0.8) - 0.25;
      pos.push(x, y, z);
      const edge = (k === 0 || k === NK) ? cRim : (k === NK / 2 ? cKeel : (k % 2 ? cA : cB));
      col.push(edge.r, edge.g, edge.b);
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
  const ng = g.toNonIndexed(); ng.computeVertexNormals();
  return ng;
}

export class Boat {
  constructor() {
    this.root = new THREE.Group();   // follows path, yaw
    this.body = new THREE.Group();   // bob / pitch / roll
    this.root.add(this.body);
    const wood = new THREE.MeshLambertMaterial({ color: '#8a5634', flatShading: true });
    const dark = new THREE.MeshLambertMaterial({ color: '#4a2c1c', flatShading: true });
    const hull = new THREE.Mesh(hullGeometry(), new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide, flatShading: true }));
    this.body.add(hull);
    // gunwale rims
    for (const side of [-1, 1]) {
      const pts = []; for (let i = 0; i <= 20; i++) { const s = -0.97 + 1.94 * i / 20; pts.push(new THREE.Vector3(side * hw(s), gun(s) - 0.25, s * LEN / 2)); }
      this.body.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 30, 0.045, 4), dark));
    }
    // seats (thwarts)
    for (const s of [-0.42, 0.05, 0.62]) {
      const w = hw(s) * 2 - 0.08; const seat = new THREE.Mesh(new THREE.BoxGeometry(w, 0.06, 0.32), wood);
      seat.position.set(0, gun(s) - 0.42, s * LEN / 2); this.body.add(seat);
    }
    // floor boards
    const floor = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.04, LEN * 0.72), new THREE.MeshLambertMaterial({ color: '#6a4028' }));
    floor.position.set(0, -0.66, 0); this.body.add(floor);
    // bow lantern pole (front = -z)
    const pole = new THREE.Mesh(new THREE.TubeGeometry(new THREE.QuadraticBezierCurve3(new THREE.Vector3(0, 0.3, -2.05), new THREE.Vector3(0, 1.9, -2.2), new THREE.Vector3(0, 2.05, -2.95)), 12, 0.035, 4), dark);
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
    const cloak = new THREE.Mesh(new THREE.ConeGeometry(0.34, 0.95, 7, 1), new THREE.MeshLambertMaterial({ color: '#3d4a7a', flatShading: true }));
    cloak.position.y = 0.45; this.torso.add(cloak);
    const scarf = new THREE.Mesh(new THREE.TorusGeometry(0.15, 0.05, 4, 8), new THREE.MeshLambertMaterial({ color: '#c0503a', flatShading: true }));
    scarf.rotation.x = Math.PI / 2; scarf.position.y = 0.86; this.torso.add(scarf);
    const head = new THREE.Mesh(new THREE.IcosahedronGeometry(0.15, 1), new THREE.MeshLambertMaterial({ color: '#e0b090', flatShading: true }));
    head.position.y = 1.02; this.torso.add(head);
    const hat = new THREE.Mesh(new THREE.ConeGeometry(0.42, 0.22, 10, 1), new THREE.MeshLambertMaterial({ color: '#d8b06a', flatShading: true }));
    hat.position.y = 1.16; this.torso.add(hat);
    this.shoulders = [new THREE.Vector3(-0.2, 0.78, 0.02), new THREE.Vector3(0.2, 0.78, 0.02)];
    const armMat = new THREE.MeshLambertMaterial({ color: '#34406c', flatShading: true });
    const armGeo = new THREE.CylinderGeometry(0.05, 0.06, 1, 5); armGeo.translate(0, 0.5, 0);
    this.arms = [new THREE.Mesh(armGeo, armMat), new THREE.Mesh(armGeo, armMat)];
    this.arms.forEach(a => this.body.add(a));

    // oars: pivot at oarlocks, a little aft of the rower
    this.oars = [];
    const oarZ = 0.05 * LEN / 2 + 0.38, oarY = gun(0.17) - 0.22;
    for (const side of [-1, 1]) {
      const pivot = new THREE.Group(); pivot.rotation.order = 'YZX';
      pivot.position.set(side * (hw(0.17) + 0.02), oarY, oarZ);
      const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.035, 2.7, 5), wood);
      shaft.rotation.z = Math.PI / 2; shaft.position.x = side * (2.7 / 2 - 0.8);
      const blade = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.03, 0.2), wood);
      blade.position.x = side * (2.7 - 0.8 - 0.1);
      pivot.add(shaft, blade);
      this.body.add(pivot);
      this.oars.push({ side, pivot, blade });
    }
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
    this.torso.rotation.x = lean;
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
    }
    // bob, pitch with surge, roll
    this.body.position.y = 0.05 * Math.sin(t * 1.35) + 0.03 * Math.sin(t * 2.3 + 1.1) - 0.02 * drive * ra;
    this.body.rotation.x = 0.022 * Math.sin(t * 1.1) + 0.03 * drive * ra;
    this.body.rotation.z = 0.035 * Math.sin(t * 0.83 + 0.4) + 0.012 * Math.sin(t * 1.9);
    // lantern swings as a pendulum
    this.lanternPivot.rotation.x = -0.12 * Math.sin(t * 1.35 + 0.6) - 0.08 * drive * ra;
    this.lanternPivot.rotation.z = 0.1 * Math.sin(t * 0.83 + 1.4);
    return { caught, drive: drive * ra };
  }

  bladeWorld(i, out) { return this.oars[i].blade.getWorldPosition(out); }
}
