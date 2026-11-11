// Birds that commute between the two main islands.
// Pigeons start from New York, sparrows from Taiwan. Each bird circles its
// home island (slowing to a near-hover halfway round), crosses the gap on a
// curved path, circles the other island, and flies back on a different arc.
// Everything is a function of a loop phase, so the movement is deterministic
// and loops seamlessly when bird speed is a whole number.

import * as THREE from 'three';
import { MAX_BIRDS, rand } from './config.js';

const TAU = Math.PI * 2;
const V3 = THREE.Vector3;

const TYPES = {
  pigeon: { color: '#2b3a86', span: 0.62, scale: 1.0, flap: 95 },
  sparrow: { color: '#7a4630', span: 0.44, scale: 0.75, flap: 210 },
};

// A bird is just two flat wings, one color: a drawn "︶︶" in the sky.
function makeBird(type) {
  const t = TYPES[type];
  const g = new THREE.Group();
  const mat = new THREE.MeshBasicMaterial({ color: t.color, side: THREE.DoubleSide });
  const wingGeo = new THREE.BufferGeometry();
  wingGeo.setAttribute('position', new THREE.Float32BufferAttribute([
    0, 0, 0.1, 0, 0, -0.06, t.span, 0, -0.08,
  ], 3));
  const L = new THREE.Mesh(wingGeo, mat);
  const R = new THREE.Mesh(wingGeo, mat);
  R.scale.x = -1;
  g.add(L, R);
  g.scale.setScalar(t.scale);
  return { g, L, R, type: t };
}

// cubic Bezier
function bez(p0, p1, p2, p3, t, out) {
  const u = 1 - t;
  return out.set(0, 0, 0)
    .addScaledVector(p0, u * u * u)
    .addScaledVector(p1, 3 * u * u * t)
    .addScaledVector(p2, 3 * u * t * t)
    .addScaledVector(p3, t * t * t);
}

export function createBirds() {
  const group = new THREE.Group();
  const r = rand(5150);
  const birds = [];
  for (let i = 0; i < MAX_BIRDS; i++) {
    const type = i % 2 ? 'sparrow' : 'pigeon';
    const b = makeBird(type);
    group.add(b.g);
    birds.push({
      ...b,
      home: type === 'pigeon' ? 0 : 1,
      k: i % 4 === 3 ? 2 : 1,           // laps per loop (at speed 1)
      off: r.next(),
      rad: r.f(5.5, 9.5),
      hA: r.f(6, 10), hB: r.f(5, 8.5),   // above the walk-ups; New York's towers stay inside the circle
      arc: r.f(3, 7), side: r.f(4, 9) * (r.chance(0.5) ? 1 : -1),
      dirA: r.chance(0.5) ? 1 : -1, dirB: r.chance(0.5) ? 1 : -1,
      flapPh: r.next(),
      vis: 0,
      q: new THREE.Quaternion(),
    });
  }

  const pos = new V3(), next = new V3();
  const P = [new V3(), new V3(), new V3(), new V3()];
  const m4 = new THREE.Matrix4();
  const up = new V3(0, 1, 0);

  function path(b, s, A, B, out) {
    // home island first
    const H = b.home === 0 ? A : B, O = b.home === 0 ? B : A;
    const hH = b.home === 0 ? b.hA : b.hB, hO = b.home === 0 ? b.hB : b.hA;
    const dH = b.home === 0 ? b.dirA : b.dirB, dO = b.home === 0 ? b.dirB : b.dirA;
    const toO = Math.atan2(O.z - H.z, O.x - H.x);   // angle on the home circle facing the other island
    const toH = toO + Math.PI;
    const circ = (C, ang0, h, dir, u) => {
      // slows to a near-hover halfway round: a pause over the island
      const e = u + 0.75 * Math.sin(TAU * u) / TAU;
      const a = ang0 + dir * TAU * e;
      return out.set(C.x + Math.cos(a) * b.rad, C.y + h + Math.sin(TAU * u) * 0.6, C.z + Math.sin(a) * b.rad);
    };
    const exitH = P[0].set(H.x + Math.cos(toO) * b.rad, H.y + hH, H.z + Math.sin(toO) * b.rad);
    const exitO = P[3].set(O.x + Math.cos(toH) * b.rad, O.y + hO, O.z + Math.sin(toH) * b.rad);
    if (s < 0.3) return circ(H, toO, hH, dH, s / 0.3);
    if (s < 0.5) {
      const t = (s - 0.3) / 0.2;
      P[1].lerpVectors(exitH, exitO, 0.33).add(new V3(0, b.arc, b.side));
      P[2].lerpVectors(exitH, exitO, 0.66).add(new V3(0, b.arc, b.side));
      return bez(exitH, P[1], P[2], exitO, t * t * (3 - 2 * t) * 0.3 + t * 0.7, out);
    }
    if (s < 0.8) return circ(O, toH, hO, dO, (s - 0.5) / 0.3);
    const t = (s - 0.8) / 0.2;
    P[1].lerpVectors(exitO, exitH, 0.33).add(new V3(0, b.arc * 0.6, -b.side * 0.8));
    P[2].lerpVectors(exitO, exitH, 0.66).add(new V3(0, b.arc * 0.6, -b.side * 0.8));
    return bez(exitO, P[1], P[2], exitH, t * t * (3 - 2 * t) * 0.3 + t * 0.7, out);
  }

  // phase: accumulated bird-loop phase (advances with bird speed)
  // ph: global loop phase (for wing beats)
  function update({ phase, ph, dt, count, visible, A, B }) {
    const kVis = 1 - Math.exp(-dt * 2.5);
    birds.forEach((b, i) => {
      const tgt = visible && i < count ? 1 : 0;
      b.vis += (tgt - b.vis) * kVis;
      b.g.visible = b.vis > 0.01;
      if (!b.g.visible) return;
      b.g.scale.setScalar(b.type.scale * b.vis);
      const s = (((phase * b.k + b.off) % 1) + 1) % 1;
      path(b, s, A, B, pos);
      path(b, (s + 0.0015) % 1, A, B, next);
      b.g.position.copy(pos);
      if (next.distanceToSquared(pos) > 1e-8) {
        m4.lookAt(next, pos, up);
        b.q.setFromRotationMatrix(m4);
        b.g.quaternion.slerp(b.q, 1 - Math.exp(-dt * 6));
      }
      const gliding = s < 0.3 || (s >= 0.5 && s < 0.8);
      const glide = gliding ? 0.35 + 0.65 * Math.max(0, Math.sin(TAU * (ph * 6 + b.flapPh))) : 1;
      const flap = 0.15 + Math.sin(TAU * (ph * b.type.flap + b.flapPh)) * 0.6 * glide;
      b.L.rotation.z = flap;
      b.R.rotation.z = -flap;
    });
  }

  return { group, update };
}
