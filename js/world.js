// The archipelago: two main islands (New York, Taiwan), small satellite
// islands of memory (suitcase, lighthouse, a standing window, a tiny house,
// stairs to nowhere, a lone gable wall), an airliner passing over, and the
// displacement system that lets everything come apart and return.

import * as THREE from 'three';
import { C, MAX_HOUSES, LOOP_SECONDS, WORLD, rand } from './config.js';
import {
  gableHouse, nyTower, twWalkup, doorToElsewhere,
  stairsToNowhere, gableWall, standingWindow, suitcase,
  lighthouse, airplane, satellitePlatform, islandPlinth,
  mountainRange, utilityPole, flyingHouse, subwayEntrance, busStop, grove,
  manhattanGrid, skyscraper, taxi, suspensionBridge, ladderToWindow, bag as makeBag, luggageHill,
} from './architecture.js';
import { LIGHTS, toon, mesh, faceted } from './materials.js';

const TAU = Math.PI * 2;
const V3 = THREE.Vector3;
const lerp = (a, b, t) => a + (b - a) * t;
const lerpAngle = (a, b, t) => a + ((((b - a + Math.PI) % TAU) + TAU) % TAU - Math.PI) * t;
const easeInOut = (p) => (p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2);

// ------------------------------------------------------------- outlines

// Manhattan: long and narrow, squared-off sides, the south end tapering.
// Its length runs along local x (north = +x), the avenues run with it.
const manhattanR = (th) => {
  const c = Math.cos(th), s = Math.sin(th);
  const south = Math.max(0, -c);
  const LX = 12 * (1 - 0.07 * south);
  const RZ = 4.3 * (1 - 0.4 * Math.pow(south, 8)) * (1 - 0.12 * Math.pow(Math.max(0, c), 4));
  const p = 4.5;
  return Math.pow(Math.pow(Math.abs(c) / LX, p) + Math.pow(Math.abs(s) / RZ, p), -1 / p);
};

// Taiwan: a long, tapering leaf of land, set on a diagonal.
const leafR = (th) => {
  const a = th + 0.45;
  const rx = 10.4, rz = 5.9;
  const e = 1 / Math.sqrt(Math.pow(Math.cos(a) / rx, 2) + Math.pow(Math.sin(a) / rz, 2));
  return e * (1 + 0.11 * Math.cos(a)) * (1 - 0.05 * Math.cos(3 * a + 0.6));
};

const inside = (radial, x, z, margin) => Math.hypot(x, z) < radial(Math.atan2(z, x)) - margin;

// Taiwan's mountain ridge runs along the leaf's long axis (unit vector RX, RZ).
const RX = Math.cos(-0.45), RZ = Math.sin(-0.45);
const RIDGE = { length: 7.5, width: 2.0 };
const onRidge = (x, z, margin) => {
  const al = x * RX + z * RZ, pe = -x * RZ + z * RX;
  const half = RIDGE.width * Math.max(0, 1 - Math.pow(al / RIDGE.length, 2));
  return half > 0 && Math.abs(pe) < half + margin;
};

// ------------------------------------------------------------- displacement
//
// Every object that can come loose stores its original transform plus a
// fixed (seeded) direction, distance, spin and threshold. Each frame its
// displacement is computed from scratch from the global amount S (0..1),
// so it is fully reversible: no accumulated error, nothing gets lost.

const CATS = {
  window: { th: [0.0, 0.35], mag: [0.8, 3.2], up: [-0.2, 0.8], spin: 1.2 },
  part: { th: [0.05, 0.45], mag: [1.0, 4.0], up: [0.0, 1.0], spin: 1.0 },
  roof: { th: [0.05, 0.4], mag: [1.5, 5.5], up: [0.6, 1.0], spin: 0.8 },
  road: { th: [0.3, 0.62], mag: [1.0, 5.0], up: [0.2, 1.0], spin: 0.6 },
  fragment: { th: [0.15, 0.5], mag: [3.0, 9.0], up: [0.0, 0.8], spin: 1.0 },
  house: { th: [0.25, 0.6], mag: [3.0, 11.0], up: [0.1, 0.9], spin: 0.7 },
  satellite: { th: [0.4, 0.68], mag: [4.0, 12.0], up: [-0.4, 0.8], spin: 0.8 },
  layer: { th: [0.5, 0.68], mag: [2.0, 8.0], up: [-1.0, -0.3], spin: 0.35 },
  ground: { th: [0.62, 0.7], mag: [1.0, 3.0], up: [-0.6, 0.2], spin: 0.15 },
};

function createScatter(seed) {
  const r = rand(seed);
  const items = [];
  const tmp = new V3();

  function add(obj, cat, { dynamic = false, outward = null } = {}) {
    const c = CATS[cat];
    let dir;
    if (outward && outward.lengthSq() > 1e-4) {
      const v = outward.clone().setY(0).normalize();
      dir = new V3(v.x + r.f(-0.5, 0.5), r.f(c.up[0], c.up[1]), v.z + r.f(-0.5, 0.5)).normalize();
    } else {
      dir = new V3(r.f(-1, 1), r.f(c.up[0], c.up[1]), r.f(-1, 1)).normalize();
    }
    const it = {
      obj, dynamic,
      basePos: obj.position.clone(),
      baseRot: obj.rotation.clone(),
      dir, mag: r.f(c.mag[0], c.mag[1]),
      spin: new V3(r.f(-1, 1), r.f(-1, 1), r.f(-1, 1)).multiplyScalar(c.spin * Math.PI * 0.5),
      th: r.f(c.th[0], c.th[1]),
      k: r.i(1, 3), ph: r.next(),
      e: 0, off: new V3(),
    };
    obj.userData.scatter = it;
    items.push(it);
    return it;
  }

  function update(S, ph) {
    for (const it of items) {
      let e = 0;
      if (S > it.th) { const s = Math.min(1, (S - it.th) / 0.3); e = s * s * (3 - 2 * s); }
      it.e = e;
      if (e > 0) {
        const drift = 0.08 * it.mag * e;
        it.off.copy(it.dir).multiplyScalar(it.mag * e).add(tmp.set(
          Math.sin(TAU * (ph * it.k + it.ph)) * drift,
          Math.sin(TAU * (ph * (it.k + 1) + it.ph * 2)) * drift * 0.6,
          Math.cos(TAU * (ph * it.k + it.ph * 3)) * drift));
      } else {
        it.off.set(0, 0, 0);
      }
      if (!it.dynamic) {
        it.obj.position.copy(it.basePos).add(it.off);
        it.obj.rotation.set(it.baseRot.x + it.spin.x * e, it.baseRot.y + it.spin.y * e, it.baseRot.z + it.spin.z * e);
      }
    }
  }

  // for objects whose base pose is animated elsewhere: call after setting it
  function apply(obj) {
    const it = obj.userData.scatter;
    if (!it || it.e === 0) return;
    obj.position.add(it.off);
    obj.rotation.x += it.spin.x * it.e;
    obj.rotation.y += it.spin.y * it.e;
    obj.rotation.z += it.spin.z * it.e;
  }

  // register loose parts inside a building (windows, roofs, cages, tanks...)
  function addParts(root) {
    root.traverse((o) => {
      if (o === root) return;
      const k = o.userData.kind;
      if (k === 'window' || k === 'bars') add(o, 'window');
      else if (k === 'part') add(o, 'part');
      else if (k === 'roof') add(o, 'roof', { dynamic: true });
    });
  }

  // diagnostics: how far is the furthest object from home right now?
  function maxOffset() {
    let m = 0;
    for (const it of items) m = Math.max(m, it.off.length());
    return { count: items.length, maxOffset: m };
  }

  return { add, addParts, update, apply, maxOffset };
}

// ------------------------------------------------------------- the world

export function createWorld() {
  const world = new THREE.Group();
  const scatter = createScatter(777);
  const anchors = {};

  const origin = new THREE.Object3D();
  world.add(origin);
  anchors.world = origin;
  const drift = new THREE.Object3D();      // slowly moving point the airplane view looks at
  world.add(drift);
  anchors.drift = drift;

  // ---------------------------------------------------- main islands
  function mainIsland(key, radial, colors, n = 20) {
    const root = new THREE.Group();
    root.position.fromArray(WORLD[key].center);
    world.add(root);
    const spinner = new THREE.Group();
    root.add(spinner);
    const plinth = islandPlinth(radial, n, colors);
    spinner.add(plinth.group);
    anchors[key] = root;
    return { key, root, spinner, plinth, radial, houses: [], vis: 1, center: root.position.clone() };
  }

  const ny = mainIsland('ny', manhattanR, {
    top: C.paper, layers: [C.salmon, C.roofRed, C.roofBlue], tip: [C.blush, C.roofBlue],
  }, 56);
  const tw = mainIsland('tw', leafR, {
    top: '#9ccf6e', layers: ['#7dbb57', C.green, C.roofBlue], tip: [C.softYellow, C.roofBlue],
  });
  const islands = [ny, tw];

  // ---- New York: Manhattan's grid. Two avenues along the island, four
  // cross streets; the main intersection has the signal and crossings.
  const AVES = [1.5, -1.5], AW = 1.0, STREETS = [-6, -1.5, 3, 7.5], SW = 0.75, MAIN = [-1.5, 1.5];
  const cross = manhattanGrid((x, z, m) => inside(manhattanR, x, z, m), { avenues: AVES, AW, streets: STREETS, SW, main: MAIN });
  ny.spinner.add(cross.group);
  const crossAnchor = new THREE.Object3D();
  crossAnchor.position.set(MAIN[0], 0, MAIN[1]);
  ny.spinner.add(crossAnchor);
  anchors.crossroads = crossAnchor;
  // Manhattanhenge: looking south down the first avenue
  const hengeAnchor = new THREE.Object3D();
  hengeAnchor.position.set(7.0, 0, AVES[0]);
  ny.spinner.add(hengeAnchor);
  anchors.henge = hengeAnchor;

  // building slots: one row on each outer strip facing the avenue, one row
  // down the middle; two buildings per block between cross streets
  const nyAll = [];
  {
    const edges = [-13, ...STREETS.flatMap(x => [x - SW / 2, x + SW / 2]), 13];
    const xs = [];
    for (let i = 0; i < edges.length; i += 2) {
      const a = edges[i], b = edges[i + 1];
      if (i === 0) for (let x = b - 0.92; x > a; x -= 1.85) xs.push(x);
      else if (i === edges.length - 2) for (let x = a + 0.92; x < b; x += 1.85) xs.push(x);
      else xs.push((a + b) / 2 - 0.92, (a + b) / 2 + 0.92);
    }
    const fits = (x, z) => [[-1, -1], [1, -1], [-1, 1], [1, 1]].every(([a, b]) => inside(manhattanR, x + a * 0.87, z + b * 0.83, 0.15));
    for (const [strip, z, ry] of [['N', 2.8, Math.PI], ['M', 0, null], ['S', -2.8, 0]]) {
      for (const x of xs) if (fits(x, z)) nyAll.push({ strip, x, z, ry });
    }
  }
  const takeSlot = (strip, x) => {
    const i = nyAll.findIndex(q => q.strip === strip && Math.abs(q.x - x) < 0.1);
    return i >= 0 ? nyAll.splice(i, 1)[0] : null;
  };

  // ---- New York: skyscrapers, midtown
  const towers = [];
  [['M', -2.83, 'deco', 0], ['M', -0.17, 'needle', 0], ['N', 1.67, 'glass', Math.PI],
    ['N', -2.83, 'slab', Math.PI], ['S', -0.17, 'glass', 0]].forEach(([strip, x, kind, ry], i) => {
    const sl = takeSlot(strip, x);
    if (!sl) return;
    const t = skyscraper(rand(700 + i * 13), kind);
    t.position.set(sl.x, 0, sl.z);
    t.rotation.y = ry;
    ny.spinner.add(t);
    towers.push(t);
  });

  // ---- New York: a hero walk-up whose window the camera can fly into
  const nyHero = nyTower(rand(41), { floors: 7, w: 1.7, d: 1.6, wall: C.brick, hero: 3, fireEscape: true });
  const heroSlot = takeSlot('N', 4.33);
  nyHero.group.position.set(heroSlot.x, 0, heroSlot.z);
  nyHero.group.rotation.y = Math.PI;
  ny.spinner.add(nyHero.group);
  anchors.nyWindow = nyHero.hero;

  // the door to elsewhere, at the southern tip
  const nyDoor = doorToElsewhere(rand(5));
  takeSlot('M', -9.14);
  nyDoor.position.set(-9.7, 0, 0);
  nyDoor.rotation.y = -Math.PI / 2;
  ny.spinner.add(nyDoor);

  // ---- New York: a suspension bridge off the northern tip, ending in a window
  takeSlot('M', 10.64);
  const bridge = suspensionBridge(rand(9), 7.5);
  bridge.group.position.set(11.3, 0, 0);
  ny.spinner.add(bridge.group);
  anchors.bridgeWindow = bridge.window;

  // ---- New York: yellow cabs. Two loops (an inner and an outer lane) around
  // the avenues and the outermost cross streets; they drive, stop, drive.
  const rect = (x0, x1, z0, z1) => [[x0, z0], [x1, z0], [x1, z1], [x0, z1]];
  const XA = STREETS[0], XB = STREETS[STREETS.length - 1];
  const routes = [
    { pts: rect(XA + 0.17, XB - 0.17, AVES[1] + 0.22, AVES[0] - 0.22), dir: 1 },
    { pts: rect(XA - 0.17, XB + 0.17, AVES[1] - 0.22, AVES[0] + 0.22), dir: -1 },
  ].map(rt => {
    const segs = [];
    let L = 0;
    rt.pts.forEach((p, i) => {
      const q = rt.pts[(i + 1) % rt.pts.length];
      const len = Math.hypot(q[0] - p[0], q[1] - p[1]);
      segs.push({ p, q, len, at: L });
      L += len;
    });
    return { ...rt, segs, L };
  });
  const routePoint = (rt, d, out) => {
    d = ((d % rt.L) + rt.L) % rt.L;
    const sg = rt.segs.find(q => d >= q.at && d <= q.at + q.len) || rt.segs[0];
    const t = (d - sg.at) / sg.len;
    return out.set(sg.p[0] + (sg.q[0] - sg.p[0]) * t, 0.06, sg.p[1] + (sg.q[1] - sg.p[1]) * t);
  };
  const taxis = [];
  for (let i = 0; i < 12; i++) {
    const cab = taxi();
    ny.spinner.add(cab);
    taxis.push({ g: cab, rt: routes[i % 2], off: Math.floor(i / 2) / 6 + (i % 2) * 0.05, stops: 9 });
  }

  // ---- Taiwan: hero walk-up with an iron window cage, facing out to sea
  const twHeroA = Math.PI / 2 + 0.25;
  const twHeroR = leafR(twHeroA) - 1.6;
  const twHero = twWalkup(rand(23), { floors: 4, w: 1.35, d: 1.6, wall: C.tileMint, tile: 0.1, hero: 2 });
  twHero.group.position.set(Math.cos(twHeroA) * twHeroR, 0, Math.sin(twHeroA) * twHeroR);
  twHero.group.rotation.y = Math.PI / 2 - twHeroA;
  tw.spinner.add(twHero.group);
  anchors.twWindow = twHero.hero;

  // ---- Taiwan: the mountains down the middle
  const mtn = mountainRange(rand(88), RX, RZ, { length: RIDGE.length, width: RIDGE.width, height: 2.9 });
  tw.spinner.add(mtn.group);

  const twReserved = [
    [twHero.group.position.x, twHero.group.position.z, 1.7],
  ];

  // ---- house pools (the controller decides how many are present)
  function makePool(island, types, seed) {
    island.houses = types.map((t, i) => {
      const hr = rand(seed + i * 77);
      const b = t === 'tower' ? nyTower(hr)
        : t === 'mid' ? nyTower(hr, { floors: hr.i(3, 4), w: hr.f(1.5, 1.75) })
          : t === 'walk' ? twWalkup(hr)
            : gableHouse(hr, { roof: hr.pick([C.roofRedDeep, C.roofRed]), light: LIGHTS.fluorescent });
      const holder = new THREE.Group();
      holder.add(b.group);
      holder.visible = false;
      island.spinner.add(holder);
      return {
        holder, roof: b.roof, roofBase: b.roof.position.clone(), inner: b.group,
        vis: 0, cur: { x: 0, z: 0, ry: 0 }, tween: null,
        ph: hr.next(), kBob: hr.i(1, 3), kRoof: hr.i(1, 2), phRoof: hr.next(),
      };
    });
  }
  makePool(ny, nyAll.map((_, i) => (i % 3 === 1 ? 'mid' : 'tower')), 1000);
  makePool(tw, ['walk', 'walk', 'gable', 'walk', 'walk', 'walk', 'gable', 'walk', 'walk', 'walk', 'walk', 'walk'], 3000);

  // ---- Taiwan: 電線桿 in the lanes beside the houses (they travel with
  // their house), and wires strung between them in every direction.
  const localBox = (obj) => {
    obj.updateWorldMatrix(true, true);
    const inv = obj.matrixWorld.clone().invert();
    const bb = new THREE.Box3(), tmp = new THREE.Box3(), m = new THREE.Matrix4();
    obj.traverse(o => {
      if (!o.isMesh) return;
      if (!o.geometry.boundingBox) o.geometry.computeBoundingBox();
      bb.union(tmp.copy(o.geometry.boundingBox).applyMatrix4(m.multiplyMatrices(inv, o.matrixWorld)));
    });
    return bb;
  };
  const pr = rand(515);
  const twPoles = [];
  tw.houses.forEach((h) => {
    const bb = localBox(h.inner);
    h.top = new V3(0, bb.max.y * 0.78, bb.max.z);          // where a drop wire can land
    if (!pr.chance(0.8)) return;
    const p = utilityPole(pr);
    p.group.position.set((pr.chance(0.5) ? 1 : -1) * (bb.max.x + 0.2), 0, pr.chance(0.6) ? bb.max.z + 0.2 : bb.min.z - 0.2);
    p.group.rotation.y = pr.chance(0.5) ? 0 : Math.PI / 2;
    h.holder.add(p.group);
    twPoles.push({ ...p, owner: h });
  });
  const wireMat = new THREE.LineBasicMaterial({ color: '#1c2550' });
  const wires = Array.from({ length: 90 }, () => {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(13 * 3), 3));
    const line = new THREE.Line(geo, wireMat);
    line.frustumCulled = false;
    line.visible = false;
    tw.spinner.add(line);
    return { line, a: null, b: null, sag: 0.3 };
  });
  // decide who connects to whom for a layout (from the houses' final slots)
  function wireUp(slots) {
    const at = (tp) => {
      const s0 = slots[tw.houses.indexOf(tp.owner) % slots.length];
      const l = tp.group.position, c = Math.cos(s0.ry), sn = Math.sin(s0.ry);
      return new V3(s0.x + l.x * c + l.z * sn, 0, s0.z - l.x * sn + l.z * c);
    };
    const P = twPoles.map(at);
    const jobs = [];
    const seen = new Set();
    P.forEach((p, i) => {
      const near = P.map((q, j) => [j, p.distanceTo(q)]).filter(([j, d]) => j !== i && d < 4.8).sort((a, b) => a[1] - b[1]).slice(0, 2);
      for (const [j] of near) {
        const key = Math.min(i, j) + ':' + Math.max(i, j);
        if (seen.has(key)) continue;
        seen.add(key);
        const n = pr.i(1, 3);
        for (let k = 0; k < n; k++) jobs.push({ a: { pole: twPoles[i], k: pr.i(0, 4) }, b: { pole: twPoles[j], k: pr.i(0, 4) }, sag: pr.f(0.15, 0.55) });
      }
      // a drop wire to a neighbor's facade
      if (pr.chance(0.6)) {
        let best = null, bd = 3.6;
        tw.houses.forEach((h, hi) => {
          if (h === twPoles[i].owner) return;
          const s0 = slots[hi % slots.length];
          const d = Math.hypot(s0.x - p.x, s0.z - p.z);
          if (d < bd) { bd = d; best = h; }
        });
        if (best) jobs.push({ a: { pole: twPoles[i], k: pr.i(0, 4) }, b: { house: best }, sag: pr.f(0.1, 0.3) });
      }
    });
    wires.forEach((w, i) => Object.assign(w, jobs[i] || { a: null, b: null }));
  }
  const wv = [new V3(), new V3(), new V3()];
  function endPoint(e, out) {
    if (e.pole) {
      e.pole.group.updateMatrix();
      e.pole.owner.holder.updateMatrix();
      return out.copy(e.pole.pts[e.k % e.pole.pts.length]).applyMatrix4(e.pole.group.matrix).applyMatrix4(e.pole.owner.holder.matrix);
    }
    e.house.holder.updateMatrix();
    return out.copy(e.house.top).applyMatrix4(e.house.holder.matrix);
  }
  const ownerOf = (e) => (e.pole ? e.pole.owner : e.house);
  function updateWires(S) {
    for (const w of wires) {
      if (!w.a) { w.line.visible = false; continue; }
      const ok = S < 0.02 && ownerOf(w.a).vis > 0.98 && ownerOf(w.b).vis > 0.98;
      w.line.visible = ok;
      if (!ok) continue;
      endPoint(w.a, wv[0]);
      endPoint(w.b, wv[1]);
      const arr = w.line.geometry.attributes.position.array;
      for (let i = 0; i <= 12; i++) {
        const t = i / 12;
        wv[2].lerpVectors(wv[0], wv[1], t);
        arr[i * 3] = wv[2].x;
        arr[i * 3 + 1] = wv[2].y - w.sag * 4 * t * (1 - t);
        arr[i * 3 + 2] = wv[2].z;
      }
      w.line.geometry.attributes.position.needsUpdate = true;
    }
  }

  // ---- layouts
  // New York: the remaining grid slots, shuffled per layout seed; buildings
  // face their avenue. Taiwan is a looser, denser cluster.
  function nySlots(seed) {
    const r = rand(seed * 131 + 5);
    return nyAll.map(q => ({ ...q, key: r.next() })).sort((p, q) => p.key - q.key)
      .map(q => ({ x: q.x + r.f(-0.08, 0.08), z: q.z, ry: q.ry ?? (r.chance(0.5) ? 0 : Math.PI) }));
  }
  function twSlots(seed) {
    for (let attempt = 0; attempt < 60; attempt++) {
      const r = rand(seed * 9973 + attempt * 131 + 9);
      const s = 2.35;
      const rot = r.f(0, TAU), ox = r.f(-0.5, 0.5) * s, oz = r.f(-0.5, 0.5) * s;
      const cells = [];
      for (let j = -5; j <= 5; j++) for (let i = -6; i <= 6; i++) {
        const x = (i + (j & 1) * 0.5) * s + ox, z = j * s * 0.866 + oz;
        const xr = x * Math.cos(rot) - z * Math.sin(rot);
        const zr = x * Math.sin(rot) + z * Math.cos(rot);
        if (!inside(leafR, xr, zr, 1.3)) continue;
        if (onRidge(xr, zr, 0.9)) continue;
        if (twReserved.some(([rx, rz, rr]) => Math.hypot(xr - rx, zr - rz) < rr + 0.6)) continue;
        cells.push({ x: xr + r.f(-0.08, 0.08), z: zr + r.f(-0.08, 0.08), key: r.next() + Math.hypot(xr, zr) / 16 });
      }
      if (cells.length < MAX_HOUSES) continue;
      cells.sort((a, b) => a.key - b.key);
      return cells.slice(0, MAX_HOUSES).map(c => ({ x: c.x, z: c.z, ry: r.i(0, 3) * Math.PI / 2 + r.f(-0.1, 0.1) }));
    }
    return Array.from({ length: MAX_HOUSES }, (_, i) => ({ x: Math.cos(i) * 4, z: Math.sin(i) * 2, ry: 0 }));
  }

  let currentSeed = null;
  function setLayout(seed, nowSec, immediate = false) {
    if (seed === currentSeed) return;
    const first = currentSeed === null;
    currentSeed = seed;
    const twS = twSlots(seed);
    wireUp(twS);
    [[ny, nySlots(seed)], [tw, twS]].forEach(([island, slots]) => {
      island.houses.forEach((h, i) => {
        const to = slots[i % slots.length];
        if (immediate) { h.cur = { ...to }; h.tween = null; }
        else h.tween = { from: { ...h.cur }, to, start: nowSec + i * 0.09, dur: 2.6 };
      });
    });
    if (first) registerHouses();
  }

  // ---------------------------------------------------- satellites
  const sats = [];
  const r = rand(20261109);
  function satellite(name, pos, platform, content, yaw = null, still = false) {
    const g = new THREE.Group();
    g.position.fromArray(pos);
    g.add(platform);
    if (content) g.add(content);
    world.add(g);
    if (name) anchors[name] = g;
    const s = { g, base: g.position.clone(), ph: r.next(), k: r.i(1, 3), vis: 1, yaw: yaw ?? sats.length, still };
    sats.push(s);
    return s;
  }
  const bag = suitcase();
  bag.rotation.set(0, -0.35, 0.05);
  satellite('suitcase', [-3, -5, 17], satellitePlatform(1.7, 6, C.paper, [C.salmon, C.roofBlue]), bag);

  const lh = lighthouse();
  satellite('lighthouse', [2, 1.8, -19], satellitePlatform(1.9, 7, C.cream, [C.skyBlue, C.roofBlue]), lh.group);

  const sw = standingWindow(r);
  satellite('windowIsland', [1, 8.5, 1], satellitePlatform(1.5, 5, C.paper, [C.blush, C.skyBlue]), sw);

  const tiny = gableHouse(r, { w: 1.0, d: 1.1, h: 0.75, wall: C.softYellow, roof: C.green, door: C.roofBlue });
  satellite('tinyHouse', [34, 3.5, 11], satellitePlatform(1.2, 6, C.paper, [C.softGreen, C.roofBlue]), tiny.group);

  satellite('stairs', [-37, 4.5, 9], satellitePlatform(1.6, 5, C.paper, [C.salmon, C.roofBlue]), stairsToNowhere());
  satellite('wall', [33, -3.5, -13], satellitePlatform(1.5, 6, C.cream, [C.blush, C.skyBlue]), gableWall(r));

  // ---------------------------------------------------- mid islands
  // Between the two main islands and the small ones in size.
  function midIsland(name, pos, R, colors, content, yaw, still = false) {
    const radial = (th) => R * (1 + 0.07 * Math.cos(3 * th + R) + 0.04 * Math.cos(5 * th + 1.3));
    const plinth = islandPlinth(radial, 16, colors, { stand: { h: R * 0.5, ratio: 0.45 }, depthScale: 0.42 });
    return satellite(name, pos, plinth.group, content, yaw, still);
  }
  midIsland('subway', [-5.5, -3, 12.5], 3.2,
    { top: C.sidewalk, layers: [C.salmon, C.roofRed, C.roofBlue], tip: [C.blush, C.roofBlue] },
    subwayEntrance(), 0.35);
  midIsland('busStop', [3.5, 2.5, 13.5], 3.3,
    { top: '#bfe0a8', layers: [C.tileMint, C.softGreen, C.roofBlue], tip: [C.softYellow, C.roofBlue] },
    busStop(rand(61)), -0.1);
  midIsland('grove', [-1.5, -4.2, -12.5], 2.9,
    { top: '#9ccf6e', layers: [C.wallYellow, C.green, C.roofBlue], tip: [C.softYellow, C.roofBlue] },
    grove(rand(73)), 0.2);

  // ---------------------------------------------------- the baggage belt
  // One long conveyor loop under and around both main islands, passing over
  // a hill of luggage. Bags ride it all the way round, one lap per loop.
  const BELT = { c: [-2, -8.5, 0], a: 37, b: 25, w: 0.8 };
  const beltPts = [];
  for (let i = 0; i < 260; i++) {
    const t = (i / 260) * TAU;
    beltPts.push(new V3(BELT.c[0] + Math.sin(t) * BELT.a, BELT.c[1], BELT.c[2] + Math.cos(t) * BELT.b));
  }
  const beltLen = [0];
  for (let i = 1; i <= beltPts.length; i++) beltLen.push(beltLen[i - 1] + beltPts[i - 1].distanceTo(beltPts[i % beltPts.length]));
  const beltL = beltLen[beltPts.length];
  const beltAt = (d, out, tan) => {
    d = ((d % beltL) + beltL) % beltL;
    let lo = 0, hi = beltPts.length;
    while (hi - lo > 1) { const m = (lo + hi) >> 1; if (beltLen[m] <= d) lo = m; else hi = m; }
    const a0 = beltPts[lo], a1 = beltPts[(lo + 1) % beltPts.length];
    const f = (d - beltLen[lo]) / (beltLen[lo + 1] - beltLen[lo]);
    out.lerpVectors(a0, a1, f);
    if (tan) tan.subVectors(a1, a0).normalize();
    return out;
  };
  // a closed band (belt or rail) along the loop, built as one mesh
  function band(offset, halfW, y0, y1, color) {
    const pos = [];
    const side = new V3(), up = new V3(0, 1, 0), tn = new V3();
    const edge = (i) => {
      const p = beltPts[i % beltPts.length];
      tn.subVectors(beltPts[(i + 1) % beltPts.length], beltPts[(i - 1 + beltPts.length) % beltPts.length]).normalize();
      side.crossVectors(up, tn).normalize();
      const c = p.clone().addScaledVector(side, offset);
      return [c.clone().addScaledVector(side, -halfW), c.clone().addScaledVector(side, halfW)];
    };
    for (let i = 0; i < beltPts.length; i++) {
      const [l0, r0] = edge(i), [l1, r1] = edge(i + 1);
      const q = (a, b, c, d) => pos.push(...a, ...b, ...c, ...a, ...c, ...d);
      const v = (p, y) => [p.x, y, p.z];
      q(v(l0, y1), v(l1, y1), v(r1, y1), v(r0, y1));      // top
      q(v(l0, y0), v(r0, y0), v(r1, y0), v(l1, y0));      // bottom
      q(v(l0, y0), v(l1, y0), v(l1, y1), v(l0, y1));      // sides
      q(v(r0, y0), v(r0, y1), v(r1, y1), v(r1, y0));
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    return mesh(faceted(geo), toon(color), { threshold: 40 });
  }
  const belt = new THREE.Group();
  belt.add(band(0, BELT.w / 2, BELT.c[1] - 0.14, BELT.c[1], '#3a4060'));
  for (const sd of [-1, 1]) belt.add(band(sd * (BELT.w / 2 + 0.03), 0.03, BELT.c[1] - 0.14, BELT.c[1] + 0.12, C.softYellow));
  world.add(belt);
  const riders = [];
  const br = rand(3131);
  for (let i = 0; i < 36; i++) {
    const b = makeBag(br, br.f(1.1, 1.5));
    world.add(b);
    riders.push({ g: b, off: i / 36 + br.f(-0.006, 0.006), twist: br.f(-0.4, 0.4), lie: br.chance(0.4) });
  }
  // the luggage hill, the belt running along its edge
  midIsland('luggage', [BELT.c[0], BELT.c[1] - 0.06, BELT.c[2] + BELT.b - 1.3], 3.6,
    { top: C.sidewalk, layers: [C.blush, C.roofRed, C.roofBlue], tip: [C.softYellow, C.roofBlue] },
    (() => { const h = luggageHill(rand(808)); h.position.set(0, 0, -1.1); return h; })(), 0, true);

  // ---------------------------------------------------- the ladder
  // A tall ladder standing upright in the air, a window floating at its top.
  const ladder = ladderToWindow(8);
  const ladderBase = new V3(12, -3.2, 17);
  ladder.group.position.copy(ladderBase);
  ladder.group.rotation.y = -0.35;
  world.add(ladder.group);
  anchors.ladder = ladder.group;
  anchors.ladderWindow = ladder.window;

  // ---------------------------------------------------- flying houses
  // Paper-cut houses drifting in zero gravity: slow loops, gentle tilts, never
  // flipping over. All motion is whole cycles per loop.
  const ships = [];
  const fr = rand(4242);
  const avoid = [
    [WORLD.ny.center, 21], [WORLD.tw.center, 13],   // New York's bridge sweeps far as it turns
    ...sats.map(s => [s.base.toArray(), 4.5]),
    [ladderBase.toArray(), 3],
  ];
  for (let tries = 0; ships.length < 26 && tries < 6000; tries++) {
    const p = [fr.f(-44, 44), fr.f(-5, 12), fr.f(-24, 22)];   // above the baggage belt
    const sc = fr.f(0.6, 1.9);
    const amp = new V3(fr.f(1.5, 4), fr.f(0.6, 1.6), fr.f(1.5, 4));
    // keep clear of islands for the whole drift, not just the start point
    const reach = Math.max(amp.x, amp.z) + sc * 1.2;
    const blocked = avoid.some(([c, rad]) => Math.hypot(p[0] - c[0], p[2] - c[2]) < rad + reach && Math.abs(p[1] - c[1]) < 9 + amp.y)
      || ships.some(sh => Math.hypot(p[0] - sh.base.x, p[1] - sh.base.y, p[2] - sh.base.z) < 7);
    if (blocked) continue;
    const g = flyingHouse(fr);
    g.scale.setScalar(sc);
    world.add(g);
    ships.push({
      g, sc, base: new V3(...p), vis: 1, amp,
      k: [fr.i(1, 2), fr.i(1, 3), fr.i(1, 2)], ph: [fr.next(), fr.next(), fr.next()],
      yaw: fr.f(0, TAU), spin: fr.pick([-1, 0, 0, 1]), tilt: [fr.f(0.12, 0.32), fr.f(0.12, 0.32)], kt: fr.i(1, 3),
    });
  }

  // ---------------------------------------------------- airplane
  const plane = airplane();
  plane.scale.setScalar(1.15);
  world.add(plane);
  anchors.airplane = plane;
  let planeVis = 1;

  // ---------------------------------------------------- register displacement
  function registerHouses() {
    for (const isl of islands) {
      for (const h of isl.houses) {
        h.holder.position.set(h.cur.x, 0, h.cur.z);
        scatter.add(h.holder, 'house', { dynamic: true, outward: h.holder.position });
        scatter.addParts(h.inner);
      }
    }
  }
  for (const isl of islands) {
    isl.plinth.layers.forEach(l => scatter.add(l, 'layer', { dynamic: true }));
    scatter.add(isl.plinth.top, 'ground');
  }
  cross.group.children.forEach(c => {
    if (c.userData.kind === 'part') { scatter.add(c, 'fragment', { outward: c.position }); scatter.addParts(c); }
    else scatter.add(c, 'road', { outward: c.position });
  });
  for (const [b, isl] of [[nyHero, ny], [twHero, tw]]) {
    scatter.add(b.group, 'house', { outward: b.group.position });
    scatter.addParts(b.group);
    void isl;
  }
  mtn.peaks.forEach(m => scatter.add(m, 'fragment', { outward: m.position }));
  twPoles.forEach(p => scatter.add(p.group, 'part'));
  for (const t of towers) { scatter.add(t, 'house', { outward: t.position }); scatter.addParts(t); }
  scatter.add(bridge.group, 'house', { outward: bridge.group.position });
  scatter.addParts(bridge.group);
  for (const t of taxis) scatter.add(t.g, 'fragment', { dynamic: true });
  for (const sh of ships) {
    scatter.add(sh.g, 'satellite', { dynamic: true });
    scatter.addParts(sh.g);
  }
  for (const f of [nyDoor]) {
    scatter.add(f, 'fragment', { outward: f.position });
    scatter.addParts(f);
  }
  scatter.add(belt, 'satellite');
  for (const rd of riders) scatter.add(rd.g, 'fragment', { dynamic: true });
  scatter.add(ladder.group, 'satellite', { dynamic: true });
  for (const s of sats) {
    scatter.add(s.g, 'satellite', { dynamic: true });
    s.g.children.slice(1).forEach(c => scatter.addParts(c));
  }

  // ---------------------------------------------------- update
  const tmpV = new V3();
  function update({
    loopT, nowSec, dt, angle, floatI, houseCount,
    showMain, showSatellites, airplaneVisible,
  }) {
    const ph = loopT / LOOP_SECONDS;
    const a = Math.min(floatI, 1.5);                       // gentle floating amount
    const S = Math.min(1, Math.max(0, (floatI - 1) / 4));   // displacement amount
    scatter.update(S, ph);

    const kVis = 1 - Math.exp(-dt * 2.2);
    islands.forEach((isl, idx) => {
      isl.vis += ((showMain ? 1 : 0) - isl.vis) * kVis;
      const sv = Math.max(0.0001, isl.vis * isl.vis * (3 - 2 * isl.vis));
      isl.root.scale.setScalar(sv);
      isl.root.visible = sv > 0.002;

      isl.root.position.copy(isl.center);
      isl.root.position.y += Math.sin(TAU * (ph * 2 + idx * 0.5)) * 0.35 * a;
      isl.root.rotation.x = Math.sin(TAU * (ph + idx * 0.3)) * 0.025 * a;
      isl.root.rotation.z = Math.sin(TAU * (ph * 3 + 0.2 + idx * 0.4)) * 0.018 * a;
      isl.spinner.rotation.y = idx === 0 ? angle : -angle + 0.6;

      isl.plinth.layers.forEach((m, i) => {
        m.rotation.set(0, m.userData.baseRot + Math.sin(TAU * (ph * (i + 1) + i * 0.17 + idx * 0.1)) * 0.06 * a, 0);
        m.position.set(0, m.userData.scatter.basePos.y, 0);
        scatter.apply(m);
      });

      const shown = Math.round(houseCount * isl.houses.length / MAX_HOUSES);
      isl.houses.forEach((h, i) => {
        const tgt = i < shown ? 1 : 0;
        h.vis += (tgt - h.vis) * kVis;
        if (Math.abs(tgt - h.vis) < 0.002) h.vis = tgt;
        const s = h.vis * h.vis * (3 - 2 * h.vis);
        h.holder.visible = s > 0.002;
        h.holder.scale.setScalar(Math.max(s, 0.0001));

        let { x, z, ry } = h.cur;
        let lift = 0;
        if (h.tween) {
          const p = Math.min(1, Math.max(0, (nowSec - h.tween.start) / h.tween.dur));
          const e = easeInOut(p);
          x = lerp(h.tween.from.x, h.tween.to.x, e);
          z = lerp(h.tween.from.z, h.tween.to.z, e);
          ry = lerpAngle(h.tween.from.ry, h.tween.to.ry, e);
          lift = Math.sin(Math.PI * e) * 1.4;
          if (p >= 1) h.tween = null;
          h.cur = { x, z, ry };
        }
        h.holder.position.set(x, lift + Math.sin(TAU * (ph * h.kBob + h.ph)) * 0.06 * a, z);
        h.holder.rotation.set(0, ry, 0);
        scatter.apply(h.holder);
        // roofs occasionally lift off, as if the house is breathing out
        h.roof.position.copy(h.roofBase);
        h.roof.position.y += Math.pow(Math.max(0, Math.sin(TAU * (ph * h.kRoof + h.phRoof))), 8) * 0.3 * a;
        h.roof.rotation.set(0, 0, 0);
        scatter.apply(h.roof);
      });
    });

    updateWires(S);

    // cabs: whole laps per loop, nine stop-and-go steps per lap
    for (const t of taxis) {
      const q = (ph + t.off) * t.stops;
      const step = Math.floor(q), f = q - step;
      const e = f < 0.6 ? (f / 0.6) * (f / 0.6) * (3 - 2 * f / 0.6) : 1;
      const d = ((step + e) / t.stops) * t.rt.L * t.rt.dir;
      routePoint(t.rt, d, t.g.position);
      routePoint(t.rt, d + 0.3 * t.rt.dir, tmpV);
      t.g.rotation.set(0, Math.atan2(tmpV.x - t.g.position.x, tmpV.z - t.g.position.z), 0);
      scatter.apply(t.g);
    }

    // traffic signal: four cycles per loop
    const q = (ph * 4) % 1;
    const phase = q < 0.45 ? 2 : q < 0.55 ? 1 : 0;
    cross.lamps.forEach((l, i) => l.material.color.copy(i === phase ? l.userData.on : l.userData.off));

    sats.forEach((s, i) => {
      s.vis += ((showSatellites ? 1 : 0) - s.vis) * kVis;
      const sv = Math.max(0.0001, s.vis * s.vis * (3 - 2 * s.vis));
      s.g.scale.setScalar(sv);
      s.g.visible = sv > 0.002;
      s.g.position.copy(s.base);
      const sa = s.still ? 0 : a;   // the luggage island holds still under its belt
      s.g.position.y += Math.sin(TAU * (ph * s.k + s.ph)) * 0.45 * sa;
      s.g.rotation.set(0, Math.sin(TAU * (ph + s.ph)) * 0.3 * sa + s.yaw, 0);
      scatter.apply(s.g);
    });

    ships.forEach((sh, i) => {
      sh.vis += ((showSatellites ? 1 : 0) - sh.vis) * kVis;
      const sv = Math.max(0.0001, sh.vis * sh.vis * (3 - 2 * sh.vis));
      sh.g.visible = sv > 0.002;
      sh.g.scale.setScalar(sh.sc * sv);
      const m = 0.6 + 0.4 * Math.min(a, 1);   // still drift a little at float 0
      sh.g.position.set(
        sh.base.x + Math.sin(TAU * (ph * sh.k[0] + sh.ph[0])) * sh.amp.x * m,
        sh.base.y + Math.sin(TAU * (ph * sh.k[1] + sh.ph[1])) * sh.amp.y * m,
        sh.base.z + Math.cos(TAU * (ph * sh.k[2] + sh.ph[2])) * sh.amp.z * m);
      sh.g.rotation.set(
        Math.sin(TAU * (ph * sh.kt + sh.ph[0])) * sh.tilt[0],
        sh.yaw + TAU * ph * sh.spin + 0.4 * Math.sin(TAU * (ph + sh.ph[2])),
        Math.sin(TAU * (ph * sh.kt + sh.ph[1] + 0.25)) * sh.tilt[1], 'YXZ');
      scatter.apply(sh.g);
      void i;
    });

    // bags on the belt: one lap per loop
    for (const rd of riders) {
      beltAt((ph + rd.off) * beltL, rd.g.position, tmpV);
      rd.g.rotation.set(rd.lie ? -Math.PI / 2 : 0, Math.atan2(tmpV.x, tmpV.z) + rd.twist, 0, 'YXZ');
      if (rd.lie) rd.g.position.y += 0.15;   // lying flat: lift it onto the belt
      rd.g.visible = showSatellites;
      scatter.apply(rd.g);
    }
    belt.visible = showSatellites;

    // the ladder sways a little, the window at its top with it
    ladder.group.position.copy(ladderBase);
    ladder.group.position.y += Math.sin(TAU * (ph * 2 + 0.3)) * 0.3 * a;
    ladder.group.rotation.set(Math.sin(TAU * (ph + 0.1)) * 0.02 * a, -0.35 + Math.sin(TAU * ph) * 0.08 * a, Math.sin(TAU * (ph * 2 + 0.6)) * 0.025 * a);
    ladder.group.visible = showSatellites;
    scatter.apply(ladder.group);

    // lighthouse: one sweep every 15 s, with small hesitations and a slow
    // up/down tilt — it is looking for something
    lh.pivot.rotation.set(0, TAU * ph * 8 + 0.25 * Math.sin(TAU * ph * 24), 0.07 * Math.sin(TAU * ph * 5));

    // airliner: one lap per loop, high above everything
    planeVis += ((airplaneVisible ? 1 : 0) - planeVis) * kVis;
    plane.visible = planeVis > 0.01;
    plane.scale.setScalar(1.15 * Math.max(0.0001, planeVis));
    const pa = TAU * ph;
    plane.position.set(Math.cos(pa) * 46, 15 + Math.sin(TAU * ph * 2) * 1.2, -6 + Math.sin(pa) * 24);
    tmpV.set(-Math.sin(pa) * 46, 0, Math.cos(pa) * 24).normalize();
    plane.rotation.set(0, Math.atan2(tmpV.x, tmpV.z), -0.22);

    // the drifting point the airplane window looks down at
    drift.position.set(Math.sin(TAU * ph) * 14, 0, -2 + Math.sin(TAU * ph * 2) * 5);
  }

  return { group: world, anchors, islands, setLayout, update, scatterInfo: scatter.maxOffset };
}
