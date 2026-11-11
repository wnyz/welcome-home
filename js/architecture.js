// Architecture + objects. Every builder returns plain Three.js groups made of
// boxes, extrusions and cylinders, so the whole world stays procedural.
//
// userData.kind tags let the world find parts that can come loose when the
// displacement intensity rises: 'window', 'bars', 'roof', 'part'.

import * as THREE from 'three';
import { C } from './config.js';
import { toon, mesh, faceted, addWindow, SHAPE, LIGHTS, beamMaterial, billboardMaterial } from './materials.js';

const TAU = Math.PI * 2;
const OUT = 0.012; // how far windows sit off a wall
export const box = (w, h, d) => new THREE.BoxGeometry(w, h, d);
const part = (o) => { o.userData.kind = 'part'; return o; };
const basic = (color) => new THREE.MeshBasicMaterial({ color });

// Taiwan: corrugated tin colors, shop-sign color blocks, scooter paint
const TIN = ['#2f6fd0', '#3aa6a0', '#c4583a', '#5b8fd9', '#d9d4c7', '#58ab6a', '#2f6fd0'];
const SIGN = [
  ['#ff0000', '#f7f1e6'], ['#f3d600', '#ff0000'], ['#008ed8', '#f7f1e6'], ['#f7f1e6', '#ff0000'],
  ['#58ab29', '#f3d600'], ['#1c3a9a', '#f3d600'], ['#ff7b52', '#f7f1e6'], ['#f7f1e6', '#008ed8'],
];

// ------------------------------------------------------------- small things

export function plant(r) {
  const g = new THREE.Group();
  const pot = mesh(box(0.12, 0.1, 0.12), toon(C.terracotta));
  pot.position.y = 0.05;
  const leaves = mesh(faceted(new THREE.IcosahedronGeometry(r ? r.f(0.09, 0.13) : 0.11, 0)), toon(C.leaf));
  leaves.position.y = 0.17;
  g.add(pot, leaves);
  return part(g);
}

export function waterTowerNY() {
  const wt = new THREE.Group();
  for (const [lx, lz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
    const leg = mesh(box(0.04, 0.32, 0.04), toon(C.ink), { edges: false });
    leg.position.set(lx * 0.16, 0.16, lz * 0.16);
    wt.add(leg);
  }
  const tank = mesh(new THREE.CylinderGeometry(0.26, 0.26, 0.44, 8), toon(C.wood));
  tank.position.y = 0.54;
  const cap = mesh(new THREE.ConeGeometry(0.3, 0.24, 8), toon(C.roofBlue));
  cap.position.y = 0.88;
  wt.add(tank, cap);
  return part(wt);
}

function stainlessTank(r) {
  const g = new THREE.Group();
  if (r.chance(0.5)) {          // horizontal tank on a stand
    const stand = mesh(box(0.42, 0.06, 0.18), toon(C.paper));
    stand.position.y = 0.03;
    const tank = mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.5, 10), toon(C.tank));
    tank.rotation.z = Math.PI / 2;
    tank.position.y = 0.19;
    g.add(stand, tank);
  } else {                      // upright tank with a domed lid
    const tank = mesh(new THREE.CylinderGeometry(0.17, 0.17, 0.42, 10), toon(C.tank));
    tank.position.y = 0.29;
    const lid = mesh(new THREE.SphereGeometry(0.17, 10, 4, 0, TAU, 0, Math.PI / 2), toon(C.tank));
    lid.position.y = 0.5;
    const stand = mesh(box(0.3, 0.08, 0.3), toon(C.ink), { edges: false });
    stand.position.y = 0.04;
    g.add(stand, tank, lid);
  }
  return part(g);
}

function acUnit() {
  const g = new THREE.Group();
  const b = mesh(box(0.26, 0.17, 0.15), toon(C.paper));
  const fan = mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.01, 10), toon(C.inkSoft), { edges: false });
  fan.rotation.x = Math.PI / 2;
  fan.position.set(0.05, 0, 0.078);
  g.add(b, fan);
  return part(g);
}

// A protruding Taiwanese iron window cage: barred front + sides, tin rain
// cover on top, a ledge with potted plants.
export function ironCage(r, { w, h, depth = 0.3, cover = C.skyBlue, plants = 1, seed = 0 }) {
  const g = new THREE.Group();
  addWindow(g, { z: depth, w, h, shape: SHAPE.BARS, seed, doubleSided: true });
  for (const s of [-1, 1]) {
    addWindow(g, { x: s * w / 2, z: depth / 2, ry: Math.PI / 2, w: depth, h, shape: SHAPE.BARS, seed, doubleSided: true });
  }
  const top = mesh(box(w + 0.1, 0.035, depth + 0.12), toon(cover));
  top.position.set(0, h / 2 + 0.05, depth / 2 + 0.02);
  top.rotation.x = 0.16;
  const ledge = mesh(box(w, 0.03, depth), toon(C.paper));
  ledge.position.set(0, -h / 2, depth / 2);
  g.add(top, ledge);
  for (let i = 0; i < plants; i++) {
    const p = plant(r);
    p.position.set((i - (plants - 1) / 2) * 0.22, -h / 2 + 0.015, depth * 0.55);
    g.add(p);
  }
  // the cage moves as one piece when things come apart
  g.traverse(o => { if (o !== g && o.userData.kind) delete o.userData.kind; });
  return part(g);
}

// New York fire escape: platforms, railings and zig-zag ladders.
function fireEscape(w, floors, fh) {
  const g = new THREE.Group();
  const iron = toon(C.ink);
  const pw = w * 0.62;
  for (let f = 1; f < floors; f++) {
    const y = f * fh + 0.02;
    const plat = mesh(box(pw, 0.03, 0.3), iron, { edges: false });
    plat.position.set(0, y, 0.15);
    const rail = mesh(box(pw, 0.02, 0.02), iron, { edges: false });
    rail.position.set(0, y + 0.2, 0.3);
    g.add(plat, rail);
    for (const sx of [-1, 1]) {
      const post = mesh(box(0.02, 0.2, 0.02), iron, { edges: false });
      post.position.set(sx * pw / 2, y + 0.1, 0.3);
      g.add(post);
    }
    if (f < floors - 1) {
      const dir = f % 2 ? 1 : -1;
      const len = Math.hypot(pw * 0.6, fh);
      const ladder = mesh(box(0.035, len, 0.08), iron, { edges: false });
      ladder.position.set(dir * pw * 0.05, y + fh / 2, 0.2);
      ladder.rotation.z = dir * Math.atan2(pw * 0.6, fh);
      g.add(ladder);
    }
  }
  return part(g);
}

// ------------------------------------------------------------- houses

// A gabled house (references 1 + 2): extruded pentagon + two roof slabs.
export function gableHouse(r, o = {}) {
  const g = new THREE.Group();
  const w = o.w ?? r.f(1.3, 1.8);
  const d = o.d ?? r.f(1.5, 2.0);
  const h = o.h ?? r.f(1.0, 1.45);
  const rh = r.f(0.5, 0.85) * w / 1.5;
  const wall = o.wall ?? r.pick([C.cream, C.paper, C.pink, C.salmon, C.cream]);
  const roofC = o.roof ?? (r.chance(0.62)
    ? r.pick([C.roofRed, C.roofRed, C.roofRedDeep])
    : r.pick([C.roofBlue, C.skyBlue]));
  const light = o.light ?? LIGHTS.warm;

  const shp = new THREE.Shape();
  shp.moveTo(-w / 2, 0); shp.lineTo(w / 2, 0); shp.lineTo(w / 2, h);
  shp.lineTo(0, h + rh); shp.lineTo(-w / 2, h); shp.closePath();
  const bodyGeo = new THREE.ExtrudeGeometry(shp, { depth: d, bevelEnabled: false });
  bodyGeo.translate(0, 0, -d / 2);
  g.add(mesh(faceted(bodyGeo), toon(wall)));

  const roof = new THREE.Group();
  roof.userData.kind = 'roof';
  const ov = 0.13, t = 0.07, L = Math.hypot(w / 2, rh);
  for (const s of [-1, 1]) {
    const ux = (-s * w / 2) / L, uy = rh / L;
    const nx = (s * rh) / L, ny = (w / 2) / L;
    const len = L + ov + t * 0.8;
    const along = (L + t * 0.8 - ov) / 2;
    const slab = mesh(box(len, t, d + ov * 2), toon(roofC));
    slab.position.set(s * w / 2 + ux * along + nx * t / 2, h + uy * along + ny * t / 2, 0);
    slab.rotation.z = Math.atan2(uy, ux);
    roof.add(slab);
  }
  if (r.chance(0.6)) {
    const s = r.chance(0.5) ? 1 : -1;
    const cx = s * w * 0.22;
    const ys = h + rh * (1 - Math.abs(cx) / (w / 2));
    const ch = mesh(box(0.2, 0.55, 0.2), toon(r.pick([C.paper, C.roofRedDeep, C.cream, C.salmon])));
    ch.position.set(cx, ys + 0.15, r.f(-d * 0.25, d * 0.25));
    roof.add(ch);
  }
  g.add(roof);

  const doorSide = r.chance(0.5) ? 1 : -1;
  const doorX = r.f(-0.2, 0.2) * w;
  const door = mesh(box(0.28, 0.52, 0.04), toon(o.door ?? r.pick([C.roofRed, C.roofBlue, C.yellow, C.roofRed])));
  door.position.set(doorX, 0.26, doorSide * (d / 2 + 0.01));
  g.add(door);

  for (const side of [1, -1]) {
    const z = side * (d / 2 + OUT), ry = side > 0 ? 0 : Math.PI;
    if (side === doorSide) {
      addWindow(g, { x: doorX > 0 ? -w * 0.27 : w * 0.27, y: h * 0.55, z, ry, w: 0.3, h: 0.32, shape: SHAPE.CROSS, seed: r.next(), light });
    } else if (r.chance(0.8)) {
      const two = w > 1.5 && r.chance(0.5);
      for (const sx of two ? [-1, 1] : [0]) {
        addWindow(g, { x: sx * w * 0.24, y: h * 0.55, z, ry, w: 0.28, h: 0.34, shape: r.pick([SHAPE.CROSS, SHAPE.RECT]), seed: r.next(), light });
      }
    }
    if (r.chance(0.45)) addWindow(g, { y: h + rh * 0.38, z, ry, w: 0.24, h: 0.24, shape: SHAPE.ROUND, seed: r.next(), light });
  }
  const n = Math.max(1, Math.round(d / 0.75));
  const shape = r.pick([SHAPE.RECT, SHAPE.CROSS, SHAPE.CROSS, SHAPE.ARCH]);
  for (const side of [1, -1]) {
    const x = side * (w / 2 + OUT), ry = side * Math.PI / 2;
    for (let k = 0; k < n; k++) {
      if (!r.chance(0.85)) continue;
      const z = (k + 0.5) / n * d - d / 2;
      addWindow(g, { x, y: h * 0.55, z, ry, w: 0.26, h: shape === SHAPE.ARCH ? 0.42 : 0.34, shape, seed: r.next(), light });
    }
  }
  return { group: g, roof };
}

// New York: a tall walk-up / apartment block. Brick or limestone, a cornice,
// a storefront, a fire escape, a timber water tower.
// o.hero = floor index for a detailed window you can fly the camera into.
export function nyTower(r, o = {}) {
  const g = new THREE.Group();
  const floors = o.floors ?? r.i(5, 8), fh = 0.62;
  const w = o.w ?? r.f(1.3, 1.72), d = o.d ?? r.f(1.3, 1.65), h = floors * fh + 0.1;
  const wall = o.wall ?? r.pick([C.brick, C.brickDeep, '#b8392c', '#d65a40', C.brick, C.brickDeep, C.limestone]);
  let hero = null;

  const body = mesh(box(w, h, d), toon(wall));
  body.position.y = h / 2;
  const cornice = mesh(box(w + 0.16, 0.1, d + 0.16), toon(C.paper));
  cornice.position.y = h + 0.05;
  const base = mesh(box(w + 0.03, 0.08, d + 0.03), toon(C.paper));
  base.position.y = fh - 0.02;
  g.add(body, cornice, base);

  // storefront: a wide warm window and a door
  addWindow(g, { x: -w * 0.12, y: fh * 0.45, z: d / 2 + OUT, w: w * 0.55, h: fh * 0.55, shape: SHAPE.RECT, seed: r.next(), light: LIGHTS.amber, depth: 1.0 });
  const door = mesh(box(0.22, 0.42, 0.04), toon(r.pick([C.roofBlue, C.ink, C.green])));
  door.position.set(w * 0.32, 0.21, d / 2 + 0.01);
  g.add(door);

  const cols = w > 1.55 ? 3 : 2;
  const shape = r.pick([SHAPE.RECT, SHAPE.RECT, SHAPE.CROSS]);
  for (let f = 1; f < floors; f++) {
    const y = f * fh + fh * 0.55;
    for (let c = 0; c < cols; c++) {
      const x = (c - (cols - 1) / 2) * (w / cols);
      if (o.hero === f && c === Math.floor(cols / 2)) {
        hero = addWindow(g, { x, y, z: d / 2 + OUT, w: 0.34, h: 0.46, shape: SHAPE.CROSS, seed: 0.618, light: LIGHTS.warm, depth: 2.0, curtain: 0.7 });
        continue;
      }
      addWindow(g, { x, y, z: d / 2 + OUT, w: 0.2, h: 0.34, shape: f === floors - 1 && cols === 2 ? SHAPE.ARCH : shape, seed: r.next(), light: r.chance(0.8) ? LIGHTS.warm : LIGHTS.tv });
    }
    for (const side of [1, -1]) {
      for (const sz of [-1, 1]) {
        if (!r.chance(0.7)) continue;
        addWindow(g, { x: side * (w / 2 + OUT), y, z: sz * d * 0.22, ry: side * Math.PI / 2, w: 0.2, h: 0.32, shape, seed: r.next() });
      }
    }
  }
  const hasFE = o.fireEscape ?? r.chance(0.55);
  if (hasFE) {
    const fe = fireEscape(w, floors, fh);
    fe.position.z = d / 2;
    g.add(fe);
  }

  // Times Square: screens low (over the storefront), mid (on a side wall)
  // and high (on the roof)
  if (r.chance(0.65)) {
    const b = billboard(r, w * 0.92, 0.18);
    b.position.set(0, fh * 0.86, d / 2 + 0.035);
    g.add(b);
  }
  for (const side of r.chance(0.35) ? [1, -1] : [r.chance(0.5) ? 1 : -1]) {
    if (!r.chance(0.75)) continue;
    const bw = d * r.f(0.6, 0.92), bh = r.f(0.7, Math.min(2.4, h * 0.5));
    const b = billboard(r, bw, bh);
    b.position.set(side * (w / 2 + 0.035), r.f(fh * 1.2 + bh / 2, h - bh / 2 - 0.08), r.f(-0.05, 0.05) * d);
    b.rotation.y = side * Math.PI / 2;
    g.add(b);
  }
  if (!hasFE && r.chance(0.4)) {   // a tall screen wrapping the front corner
    const side = r.chance(0.5) ? 1 : -1;
    const bw = w * r.f(0.32, 0.45), bh = r.f(1.0, Math.min(2.6, h - fh - 0.3));
    const b = billboard(r, bw, bh);
    b.position.set(side * (w / 2 - bw / 2), fh + 0.1 + bh / 2, d / 2 + 0.035);
    g.add(b);
  }

  const roof = new THREE.Group();
  roof.userData.kind = 'roof';
  roof.position.y = h + 0.1;
  const roofBoard = r.chance(0.45);
  if (roofBoard) {
    const bw = r.f(0.9, 1.7), bh = r.f(0.45, 0.95);
    const st = new THREE.Group();
    for (const sx of [-1, 1]) {
      const leg = mesh(box(0.05, 0.36, 0.05), toon(C.ink), { edges: false });
      leg.position.set(sx * bw * 0.35, 0.18, 0);
      st.add(leg);
    }
    const b = billboard(r, bw, bh);
    b.position.y = 0.36 + bh / 2;
    const b2 = billboard(r, bw, bh);     // screens on both faces
    b2.position.set(0, 0.36 + bh / 2, -0.046);
    b2.rotation.y = Math.PI;
    st.add(b, b2);
    st.position.set(0, 0, -d * 0.28);
    st.rotation.y = r.f(-0.15, 0.15);
    roof.add(part(st));
  }
  if (r.chance(0.6)) {
    const bulk = mesh(box(0.42, 0.34, 0.4), toon(r.pick([C.limestone, C.paper, wall])));
    bulk.position.set(-w * 0.25, 0.17, -d * 0.22);
    roof.add(part(bulk));
  }
  g.add(roof);
  return { group: g, roof, hero };
}

// Taiwan: a narrow walk-up. Tiled facade, rolling shutter at street level,
// protruding iron window cages, balconies with plants, rooftop tin addition,
// stainless water tanks.
export function twWalkup(r, o = {}) {
  const g = new THREE.Group();
  const floors = o.floors ?? r.i(3, 5), fh = 0.62;
  const w = o.w ?? r.f(1.05, 1.4), d = o.d ?? r.f(1.4, 1.85), h = floors * fh + 0.12;
  const wall = o.wall ?? r.pick([C.tileMint, C.tilePink, C.paper, C.wallYellow, C.tileBlue, C.cream]);
  const tile = o.tile ?? (r.chance(0.7) ? 0.1 : 0);
  let hero = null;

  const body = mesh(box(w, h, d), toon(wall, { tile }));
  body.position.y = h / 2;
  g.add(body);
  for (let f = 1; f < floors; f++) {
    const band = mesh(box(w + 0.05, 0.045, d + 0.05), toon(C.paper));
    band.position.y = f * fh;
    g.add(band);
  }

  // street level: rolling shutter
  addWindow(g, { y: fh * 0.42, z: d / 2 + OUT, w: w * 0.78, h: fh * 0.72, shape: SHAPE.SHUTTER, light: r.pick([C.tank, C.skyBlue, '#bfd8c4', C.paper]) });

  // over the shutter: a long shop sign, or a corrugated tin rain cover
  if (r.chance(0.55)) {
    const sg = shopSign(r, { w: w * 0.92, h: 0.17, t: 0.05, flat: true });
    sg.position.set(0, fh * 0.86, d / 2 + 0.035);
    g.add(sg);
  } else if (r.chance(0.7)) {
    const aw = mesh(box(w * 0.96, 0.03, 0.34), toon(r.pick(TIN), { rib: 0.07 }));
    aw.position.set(0, fh * 0.93, d / 2 + 0.16);
    aw.rotation.x = 0.28;
    g.add(part(aw));
  }
  // a tall vertical sign sticking out from the corner of the facade
  if (o.hero === undefined && floors >= 3 && r.chance(0.75)) {
    const sh = r.f(0.8, Math.min(1.9, h - fh - 0.25));
    const side = r.chance(0.5) ? 1 : -1;
    const sg = shopSign(r, { w: 0.3, h: sh, t: 0.05 });
    sg.position.set(side * (w / 2 - 0.03), fh + 0.12 + sh / 2, d / 2 + 0.19);
    g.add(sg);
  }

  const cover = r.pick([C.skyBlue, C.roofBlue, '#58ab6a', C.roofRed]);
  for (let f = 1; f < floors; f++) {
    const y = f * fh + fh * 0.5;
    const isHero = o.hero === f;
    if (isHero || r.chance(0.5)) {
      const ww = isHero ? Math.min(0.8, w * 0.66) : w * 0.56, wh = isHero ? 0.42 : fh * 0.44;
      const win = addWindow(g, {
        y, z: d / 2 + OUT, w: ww, h: wh, shape: SHAPE.RECT, seed: isHero ? 0.271 : r.next(),
        light: isHero ? LIGHTS.warm : r.chance(0.7) ? LIGHTS.fluorescent : LIGHTS.warm,
        depth: isHero ? 2.2 : 1.4, curtain: isHero ? 0.55 : r.chance(0.3) ? 0.4 : 0,
      });
      if (isHero) hero = win;
      const cage = ironCage(r, { w: ww + 0.06, h: wh + 0.06, depth: isHero ? 0.34 : 0.26, cover, plants: isHero ? 2 : r.i(0, 1) });
      cage.position.set(0, y, d / 2);
      g.add(cage);
    } else {
      addWindow(g, { y, z: d / 2 + OUT, w: w * 0.56, h: fh * 0.44, shape: SHAPE.GRILLE, seed: r.next(), light: LIGHTS.fluorescent });
      if (r.chance(0.5)) {
        const slab = mesh(box(w * 0.8, 0.04, 0.24), toon(C.paper));
        slab.position.set(0, f * fh + 0.03, d / 2 + 0.12);
        const rail = mesh(box(w * 0.8, 0.16, 0.025), toon(wall));
        rail.position.set(0, f * fh + 0.12, d / 2 + 0.23);
        const p = plant(r);
        p.position.set(w * 0.25, f * fh + 0.05, d / 2 + 0.12);
        g.add(part(slab), part(rail), p);
      }
    }
    for (const side of [1, -1]) {
      if (!r.chance(0.6)) continue;
      addWindow(g, {
        x: side * (w / 2 + OUT), y, z: r.f(-d * 0.2, d * 0.2), ry: side * Math.PI / 2,
        w: 0.22, h: 0.26, shape: r.chance(0.6) ? SHAPE.GRILLE : SHAPE.RECT, seed: r.next(), light: LIGHTS.fluorescent,
      });
    }
    if (r.chance(0.5)) addWindow(g, { x: r.f(-0.25, 0.25) * w, y, z: -d / 2 - OUT, ry: Math.PI, w: 0.22, h: 0.26, shape: SHAPE.GRILLE, seed: r.next() });
  }
  if (o.hero === undefined && r.chance(0.7)) {
    const ac = acUnit();
    ac.position.set(w / 2 + 0.08, fh * r.i(1, floors - 1) + 0.15, r.f(-0.3, 0.3) * d);
    ac.rotation.y = Math.PI / 2;
    g.add(ac);
  }

  const roof = new THREE.Group();
  roof.userData.kind = 'roof';
  roof.position.y = h;
  if (r.chance(0.88) || o.hero !== undefined) {
    // 鐵皮屋頂: a corrugated tin rooftop addition
    const tin = r.pick(TIN);
    const sw = w * r.f(0.78, 1.0), sd = d * r.f(0.5, 0.8), sh = r.f(0.32, 0.44);
    const cz = -d / 2 + sd / 2 + 0.02;
    const shed = mesh(box(sw, sh, sd), toon(r.chance(0.5) ? tin : r.pick([C.tank, C.paper, '#d9d4c7']), { rib: 0.06 }));
    shed.position.set(0, sh / 2, cz);
    const lid = mesh(box(sw + 0.18, 0.04, sd + 0.22), toon(tin, { rib: 0.07 }));
    lid.position.set(0, sh + 0.07, cz);
    lid.rotation.x = 0.17;
    roof.add(shed, lid);
    if (r.chance(0.5)) {   // a little tin door
      const dr = mesh(box(0.2, sh * 0.75, 0.02), toon(r.pick(TIN), { rib: 0.04 }));
      dr.position.set(r.f(-0.2, 0.2) * sw, sh * 0.375, cz + sd / 2 + 0.01);
      roof.add(dr);
    }
  }
  const tank = stainlessTank(r);
  tank.position.set(r.f(-0.2, 0.2) * w, 0, d * 0.28);
  roof.add(tank);
  if (r.chance(0.5)) {
    const p = plant(r);
    p.position.set(-w * 0.3, 0, d * 0.3);
    roof.add(p);
  }
  g.add(roof);
  return { group: g, roof, hero };
}

// ------------------------------------------------------------- crossroads

// A big graphic intersection: four arms, zebra crossings, curbs, street
// lights, a signal that cycles, and a bench for waiting.
export function crossroads(L, W) {
  const g = new THREE.Group();
  const asphalt = toon(C.asphalt);
  const white = toon('#f4f1ea');
  const yellow = toon(C.softYellow);
  const arm = (L - W) / 2;

  const center = mesh(box(W, 0.05, W), asphalt);
  center.position.y = 0.025;
  g.add(center);
  for (const [sx, sz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
    const along = sx !== 0;
    const a = mesh(box(along ? arm : W, 0.05, along ? W : arm), asphalt);
    a.position.set(sx * (W / 2 + arm / 2), 0.025, sz * (W / 2 + arm / 2));
    g.add(a);
    // dashed center line
    for (let k = 0; k * 0.75 + 1.4 < arm; k++) {
      const dist = W / 2 + 1.25 + k * 0.75;
      const dash = mesh(along ? box(0.36, 0.012, 0.07) : box(0.07, 0.012, 0.36), yellow, { edges: false });
      dash.position.set(sx * dist, 0.056, sz * dist);
      g.add(dash);
    }
    // zebra crossing just outside the intersection
    const n = Math.floor((W - 0.3) / 0.3);
    for (let k = 0; k < n; k++) {
      const off = -W / 2 + 0.3 + k * 0.3;
      const st = mesh(along ? box(0.55, 0.012, 0.15) : box(0.15, 0.012, 0.55), white, { edges: false });
      st.position.set(sx ? sx * (W / 2 + 0.42) : off, 0.056, sz ? sz * (W / 2 + 0.42) : off);
      g.add(st);
    }
    // curbs on both sides of the arm
    for (const side of [-1, 1]) {
      const curb = mesh(along ? box(arm, 0.09, 0.5) : box(0.5, 0.09, arm), toon(C.sidewalk));
      curb.position.set(
        along ? sx * (W / 2 + arm / 2) : side * (W / 2 + 0.25), 0.045,
        along ? side * (W / 2 + 0.25) : sz * (W / 2 + arm / 2));
      g.add(curb);
    }
  }

  // street lights on the four corners, leaning over the intersection
  for (const [cx, cz] of [[1, 1], [-1, 1], [1, -1], [-1, -1]]) {
    const sl = new THREE.Group();
    const pole = mesh(box(0.06, 1.6, 0.06), toon(C.ink), { edges: false });
    pole.position.y = 0.8;
    const armM = mesh(box(0.5, 0.04, 0.04), toon(C.ink), { edges: false });
    armM.position.set(-0.22, 1.58, 0);
    const head = mesh(box(0.2, 0.06, 0.12), toon(C.softYellow));
    head.position.set(-0.45, 1.55, 0);
    sl.add(pole, armM, head);
    sl.position.set(cx * (W / 2 + 0.32), 0.09, cz * (W / 2 + 0.32));
    sl.rotation.y = Math.atan2(-cz, cx);   // lamp head leans toward the center
    g.add(part(sl));
  }

  // a signal whose lights cycle — the waiting part of a crossroads
  const signal = new THREE.Group();
  const sp = mesh(box(0.06, 1.25, 0.06), toon(C.ink), { edges: false });
  sp.position.y = 0.62;
  const housing = mesh(box(0.16, 0.44, 0.13), toon(C.ink));
  housing.position.y = 1.4;
  signal.add(sp, housing);
  const lamps = [];
  ['#ff3b2a', '#f3d600', '#58ab29'].forEach((col, i) => {
    const m = new THREE.MeshBasicMaterial({ color: col });
    const l = new THREE.Mesh(new THREE.CircleGeometry(0.045, 12), m);
    l.position.set(0, 1.53 - i * 0.13, 0.066);
    l.userData.on = new THREE.Color(col);
    l.userData.off = new THREE.Color(col).multiplyScalar(0.25).lerp(new THREE.Color(C.ink), 0.5);
    signal.add(l);
    lamps.push(l);
  });
  signal.position.set(W / 2 + 0.3, 0.09, W / 2 + 0.75);
  g.add(part(signal));

  const bench = new THREE.Group();
  const seat = mesh(box(0.7, 0.05, 0.22), toon(C.skyBlue));
  seat.position.y = 0.26;
  const back = mesh(box(0.7, 0.22, 0.04), toon(C.skyBlue));
  back.position.set(0, 0.4, -0.1);
  bench.add(seat, back);
  for (const sx of [-1, 1]) {
    const leg = mesh(box(0.04, 0.26, 0.2), toon(C.ink), { edges: false });
    leg.position.set(sx * 0.3, 0.13, 0);
    bench.add(leg);
  }
  bench.position.set(-(W / 2 + 0.3), 0.09, W / 2 + 1.0);
  bench.rotation.y = Math.PI / 2;
  g.add(part(bench));

  return { group: g, lamps };
}

// ------------------------------------------------------------- fragments

export function doorToElsewhere(r) {
  const g = new THREE.Group();
  const c = toon(C.paper);
  const postL = mesh(box(0.1, 1.5, 0.14), c); postL.position.set(-0.42, 0.75, 0);
  const postR = mesh(box(0.1, 1.5, 0.14), c); postR.position.set(0.42, 0.75, 0);
  const lintel = mesh(box(0.96, 0.12, 0.16), c); lintel.position.set(0, 1.56, 0);
  const sill = mesh(box(1.1, 0.06, 0.5), toon(C.roofRed)); sill.position.y = 0.03;
  g.add(postL, postR, lintel, sill);
  addWindow(g, { y: 0.78, w: 0.74, h: 1.44, shape: SHAPE.RECT, seed: r.next(), doubleSided: true, depth: 2.5 });
  return part(g);
}

export function tableAndChair() {
  const g = new THREE.Group();
  const legs = (grp, w, d, hgt, col) => {
    for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
      const l = mesh(box(0.05, hgt, 0.05), toon(col), { edges: false });
      l.position.set(sx * (w / 2 - 0.04), hgt / 2, sz * (d / 2 - 0.04));
      grp.add(l);
    }
  };
  const table = new THREE.Group();
  const top = mesh(box(0.9, 0.06, 0.62), toon(C.paper)); top.position.y = 0.62;
  table.add(top); legs(table, 0.9, 0.62, 0.6, C.paper);
  const vase = mesh(new THREE.CylinderGeometry(0.06, 0.08, 0.2, 7), toon(C.softGreen)); vase.position.set(0.18, 0.75, 0.05);
  table.add(vase);
  const chair = new THREE.Group();
  const seat = mesh(box(0.42, 0.06, 0.42), toon(C.softYellow)); seat.position.y = 0.42;
  const back = mesh(box(0.42, 0.5, 0.05), toon(C.softYellow)); back.position.set(0, 0.7, -0.19);
  chair.add(seat, back); legs(chair, 0.42, 0.42, 0.4, C.softYellow);
  chair.position.set(-0.75, 0, 0.2); chair.rotation.y = 0.9;
  g.add(part(table), part(chair));
  return g;
}

export function floorLamp() {
  const g = new THREE.Group();
  const base = mesh(new THREE.CylinderGeometry(0.18, 0.2, 0.05, 8), toon(C.ink)); base.position.y = 0.025;
  const pole = mesh(box(0.04, 1.3, 0.04), toon(C.ink), { edges: false }); pole.position.y = 0.67;
  const shade = mesh(new THREE.CylinderGeometry(0.14, 0.3, 0.32, 8, 1, true), toon(C.softYellow)); shade.position.y = 1.36;
  g.add(base, pole, shade);
  return part(g);
}

// A Taiwanese scooter parked by the door.
export function scooter(color = C.roofRed) {
  const g = new THREE.Group();
  const body = mesh(box(0.22, 0.2, 0.7), toon(color)); body.position.set(0, 0.28, 0);
  const seat = mesh(box(0.2, 0.06, 0.34), toon(C.ink)); seat.position.set(0, 0.41, -0.1);
  const stem = mesh(box(0.06, 0.4, 0.06), toon(C.paper)); stem.position.set(0, 0.45, 0.32); stem.rotation.x = -0.25;
  const bar = mesh(box(0.42, 0.04, 0.04), toon(C.ink), { edges: false }); bar.position.set(0, 0.66, 0.37);
  g.add(body, seat, stem, bar);
  for (const z of [-0.28, 0.32]) {
    const wheel = mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.07, 10), toon(C.ink), { edges: false });
    wheel.rotation.z = Math.PI / 2;
    wheel.position.set(0, 0.11, z);
    g.add(wheel);
  }
  return part(g);
}

export function stairsToNowhere() {
  const g = new THREE.Group();
  for (let k = 0; k < 6; k++) {
    const hgt = 0.17 * (k + 1);
    const s = mesh(box(0.7, hgt, 0.28), toon(C.roofRed));
    s.position.set(0, hgt / 2, 0.7 - k * 0.28);
    g.add(part(s));
  }
  return g;
}

export function gableWall(r) {
  const g = new THREE.Group();
  const w = 1.6, h = 1.3, rh = 0.8;
  const shp = new THREE.Shape();
  shp.moveTo(-w / 2, 0); shp.lineTo(w / 2, 0); shp.lineTo(w / 2, h);
  shp.lineTo(0, h + rh); shp.lineTo(-w / 2, h); shp.closePath();
  const geo = new THREE.ExtrudeGeometry(shp, { depth: 0.14, bevelEnabled: false });
  geo.translate(0, 0, -0.07);
  g.add(mesh(faceted(geo), toon(C.pink)));
  const seed = r.next();
  addWindow(g, { y: 1.0, z: 0.07 + OUT, w: 0.46, h: 0.8, shape: SHAPE.ARCH, seed, depth: 2 });
  addWindow(g, { y: 1.0, z: -0.07 - OUT, ry: Math.PI, w: 0.46, h: 0.8, shape: SHAPE.ARCH, seed: seed + 0.31, depth: 2 });
  return g;
}

// A window standing on its own, framed, with a whole room behind it.
export function standingWindow(r) {
  const g = new THREE.Group();
  const W = 1.8, H = 1.3, t = 0.12, lift = 0.5;
  const c = toon(C.paper);
  const top = mesh(box(W + t * 2, t, t * 1.4), c); top.position.y = lift + H + t / 2;
  const bot = mesh(box(W + t * 2, t, t * 1.4), c); bot.position.y = lift - t / 2;
  const lft = mesh(box(t, H, t * 1.4), c); lft.position.set(-W / 2 - t / 2, lift + H / 2, 0);
  const rgt = mesh(box(t, H, t * 1.4), c); rgt.position.set(W / 2 + t / 2, lift + H / 2, 0);
  for (const sx of [-1, 1]) {
    const leg = mesh(box(0.06, lift, 0.06), toon(C.ink), { edges: false });
    leg.position.set(sx * W * 0.4, lift / 2 - t / 2, 0);
    g.add(leg);
  }
  g.add(top, bot, lft, rgt);
  addWindow(g, { y: lift + H / 2, w: W, h: H, shape: SHAPE.CROSS, seed: r.next(), doubleSided: true, depth: 2.5, curtain: 0.35 });
  return g;
}

// A single suitcase, packed and waiting.
export function suitcase() {
  const g = new THREE.Group();
  const body = mesh(box(1.1, 1.4, 0.46), toon(C.roofRed));
  body.position.y = 0.78;
  g.add(body);
  for (const sx of [-0.3, 0.3]) {
    const rib = mesh(box(0.05, 1.3, 0.48), toon(C.roofRedDeep));
    rib.position.set(sx, 0.78, 0);
    g.add(rib);
  }
  const strap = mesh(box(1.13, 0.1, 0.49), toon(C.yellow));
  strap.position.y = 0.95;
  g.add(strap);
  const handle = new THREE.Group();
  for (const sx of [-0.16, 0.16]) {
    const post = mesh(box(0.05, 0.5, 0.05), toon(C.ink), { edges: false });
    post.position.set(sx, 1.72, -0.12);
    handle.add(post);
  }
  const bar = mesh(box(0.4, 0.06, 0.08), toon(C.ink), { edges: false });
  bar.position.set(0, 1.97, -0.12);
  handle.add(bar);
  g.add(part(handle));
  for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
    const wheel = mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.05, 8), toon(C.ink), { edges: false });
    wheel.rotation.z = Math.PI / 2;
    wheel.position.set(sx * 0.45, 0.06, sz * 0.14);
    g.add(wheel);
  }
  // stickers from somewhere
  const sticker = (col, x, y, round) => {
    const geo = round ? new THREE.CircleGeometry(0.12, 14) : new THREE.PlaneGeometry(0.26, 0.17);
    const s = new THREE.Mesh(geo, toon(col));
    s.position.set(x, y, 0.235);
    g.add(s);
  };
  sticker(C.blue, -0.18, 1.2, true);
  sticker(C.green, 0.2, 0.55, false);
  sticker(C.paper, 0.28, 1.25, false);
  // luggage tag
  const tag = mesh(box(0.16, 0.24, 0.02), toon(C.paper));
  tag.position.set(0.47, 1.35, 0.26);
  tag.rotation.z = 0.25;
  g.add(part(tag));
  return g;
}

// Lighthouse with a slowly searching beam.
export function lighthouse() {
  const g = new THREE.Group();
  const H = 3.2, rb = 0.62, rt = 0.42;
  const tower = mesh(faceted(new THREE.CylinderGeometry(rt, rb, H, 8)), toon(C.paper));
  tower.position.y = H / 2;
  g.add(tower);
  const rAt = (y) => rb + (rt - rb) * (y / H);
  for (const yc of [1.0, 2.2]) {
    const bh = 0.36;
    const band = mesh(faceted(new THREE.CylinderGeometry(rAt(yc + bh / 2) + 0.015, rAt(yc - bh / 2) + 0.015, bh, 8)), toon(C.roofRed));
    band.position.y = yc;
    g.add(band);
  }
  const door = mesh(box(0.24, 0.42, 0.06), toon(C.roofBlue));
  door.position.set(0, 0.21, rb - 0.02);
  g.add(door);
  const gallery = mesh(faceted(new THREE.CylinderGeometry(0.64, 0.64, 0.07, 8)), toon(C.ink));
  gallery.position.y = H + 0.035;
  const rail = mesh(new THREE.CylinderGeometry(0.62, 0.62, 0.2, 8, 1, true), toon(C.ink));
  rail.position.y = H + 0.17;
  const lantern = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 0.42, 8), new THREE.MeshBasicMaterial({ color: '#fff2b8' }));
  lantern.position.y = H + 0.28;
  const cap = mesh(faceted(new THREE.ConeGeometry(0.44, 0.38, 8)), toon(C.roofRed));
  cap.position.y = H + 0.68;
  g.add(gallery, rail, lantern, cap);

  // beam: two soft cones from the lamp, rotating together
  const pivot = new THREE.Group();
  pivot.position.y = H + 0.28;
  const len = 18;
  const geo = new THREE.ConeGeometry(2.0, len, 24, 1, true);
  geo.translate(0, -len / 2, 0);
  geo.rotateZ(Math.PI / 2);
  const bm = beamMaterial();
  for (const a of [0, Math.PI]) {
    const beam = new THREE.Mesh(geo, bm);
    beam.rotation.y = a;
    beam.renderOrder = 5;
    pivot.add(beam);
  }
  g.add(pivot);
  return { group: g, pivot, beamMaterial: bm };
}

// The airliner, as a flat graphic: a white body with swept wings, a pale
// blue half, and a dark-blue offset shadow (like a print slightly off
// register). Nose points along +z.
export function airplane() {
  const g = new THREE.Group();
  const half = [
    [0, 2.35], [0.17, 2.2], [0.25, 1.9], [0.25, 0.55], [2.35, -0.55], [2.42, -0.8],
    [0.25, -0.35], [0.21, -1.55], [0.95, -2.12], [0.95, -2.3], [0.12, -2.08], [0.06, -2.4], [0, -2.4],
  ];
  const outline = [...half, ...half.slice(1, -1).reverse().map(([x, y]) => [-x, y])];
  const shp = new THREE.Shape(outline.map(([x, y]) => new THREE.Vector2(x, y)));
  const geo = new THREE.ExtrudeGeometry(shp, { depth: 0.08, bevelEnabled: false });
  geo.rotateX(Math.PI / 2);        // lie flat, nose toward +z
  const flat = (c) => new THREE.MeshBasicMaterial({ color: c, side: THREE.DoubleSide });
  const body = new THREE.Mesh(geo, flat('#ffffff'));
  const shadow = new THREE.Mesh(geo, flat('#1b2a8a'));
  shadow.position.set(-0.22, -0.5, 0.16);
  g.add(shadow, body);
  // the pale blue half of the fuselage
  const tone = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.02, 3.6), flat('#8cbcff'));
  tone.position.set(-0.12, 0.012, -0.3);
  g.add(tone);
  // engines in front of the wings, each with a little shadow of its own
  for (const sx of [-1, 1]) {
    const eng = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.12, 0.5), flat('#ffffff'));
    eng.position.set(sx * 1.05, 0.02, 0.15);
    const es = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.1, 0.5), flat('#1b2a8a'));
    es.position.set(sx * 1.05 - 0.22, -0.48, 0.31);
    g.add(es, eng);
  }
  // cockpit windows
  for (const sx of [-1, 1]) {
    const w = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.02, 0.08), flat('#1b2a8a'));
    w.position.set(sx * 0.07, 0.012, 2.05);
    g.add(w);
  }
  return g;
}

// A tall ladder standing upright in the air, with a lit window floating at
// the top: the ladder ends right at the sill. Returns the window too.
export function ladderToWindow(H = 8) {
  const g = new THREE.Group();
  const wood = toon(C.paper);
  for (const sx of [-1, 1]) {
    const rail = mesh(box(0.07, H, 0.07), wood);
    rail.position.set(sx * 0.26, H / 2, 0);
    g.add(rail);
  }
  for (let y = 0.25; y < H - 0.1; y += 0.32) {
    const rung = mesh(box(0.5, 0.04, 0.05), wood, { edges: false });
    rung.position.set(0, y, 0);
    g.add(rung);
  }
  const W = 1.5, Hw = 1.15, t = 0.1;
  const frame = new THREE.Group();
  const fc = toon(C.cream);
  const top = mesh(box(W + t * 2, t, t * 1.4), fc); top.position.y = Hw + t / 2;
  const sill = mesh(box(W + t * 2 + 0.2, t, t * 2.4), fc); sill.position.set(0, -t / 2, 0.04);
  const lft = mesh(box(t, Hw, t * 1.4), fc); lft.position.set(-W / 2 - t / 2, Hw / 2, 0);
  const rgt = mesh(box(t, Hw, t * 1.4), fc); rgt.position.set(W / 2 + t / 2, Hw / 2, 0);
  frame.add(top, sill, lft, rgt);
  const win = addWindow(frame, { y: Hw / 2, w: W, h: Hw, shape: SHAPE.CROSS, seed: 0.77, doubleSided: true, depth: 2.6, curtain: 0.4, light: LIGHTS.warm });
  frame.position.set(0, H + 0.05, -0.12);
  g.add(frame);
  return { group: g, frame, window: win };
}

// Luggage: one small suitcase, and a whole hill of them.
const BAG = ['#ea2b1f', '#f3d600', '#008ed8', '#58ab29', '#f6a9b4', '#1c3a9a', '#ff7b52', '#f7f1e6', '#b69ae4', '#3aa6a0', '#c4583a'];
export function bag(r, scale = 1) {
  const g = new THREE.Group();
  const w = r.f(0.32, 0.5) * scale, h = r.f(0.4, 0.62) * scale, d = r.f(0.16, 0.24) * scale;
  const col = r.pick(BAG);
  const body = mesh(box(w, h, d), toon(col));
  body.position.y = h / 2;
  const band = mesh(box(w + 0.01, 0.04 * scale, d + 0.01), toon(r.pick(BAG.filter(c => c !== col))), { edges: false });
  band.position.y = h * r.f(0.4, 0.6);
  const handle = mesh(box(0.14 * scale, 0.05 * scale, 0.04 * scale), toon(C.ink), { edges: false });
  handle.position.y = h + 0.025 * scale;
  g.add(body, band, handle);
  return g;
}
export function luggageHill(r, { radius = 1.7, height = 2.2 } = {}) {
  const g = new THREE.Group();
  // rings of bags, smaller and fewer toward the top
  const layers = 7;
  for (let i = 0; i < layers; i++) {
    const f = i / (layers - 1);
    const rr = radius * (1 - f * 0.92);
    const n = Math.max(1, Math.round(rr * 5.5));
    for (let k = 0; k < n; k++) {
      const a = (k / n) * TAU + r.f(-0.2, 0.2) + i * 0.4;
      const b = bag(r, r.f(0.8, 1.15));
      b.position.set(Math.cos(a) * rr * r.f(0.7, 1), f * height, Math.sin(a) * rr * r.f(0.7, 1));
      b.rotation.set(r.f(-0.35, 0.35), r.f(0, TAU), r.chance(0.35) ? Math.PI / 2 + r.f(-0.2, 0.2) : r.f(-0.3, 0.3));
      g.add(part(b));
    }
  }
  return g;
}

// ------------------------------------------------------------- platforms

export function satellitePlatform(radius, sides, topColor, under) {
  const g = new THREE.Group();
  const s = mesh(faceted(new THREE.CylinderGeometry(radius, radius * 0.96, 0.24, sides)), toon(topColor));
  s.position.y = -0.12;
  // a short, blunt stand (cut-off cone)
  const coneH = radius * 0.62;
  const u = mesh(faceted(new THREE.CylinderGeometry(radius * 0.84, radius * 0.3, coneH, sides)),
    toon(under[1], { colorB: under[0], grad: [-coneH / 2, coneH / 2] }));
  u.position.y = -0.24 - coneH / 2;
  g.add(s, u);
  return g;
}

// A main island: a stepped plinth whose outline comes from a radial function,
// so islands can have their own silhouettes (an apple, a long leaf...).
export function islandPlinth(radial, n, colors, { stand = null, depthScale = 1 } = {}) {
  const g = new THREE.Group();
  const outline = (scale) => {
    const s = new THREE.Shape();
    for (let i = 0; i < n; i++) {
      const th = (i / n) * TAU;
      const rr = radial(th) * scale;
      const x = Math.cos(th) * rr, z = Math.sin(th) * rr;
      if (i === 0) s.moveTo(x, -z); else s.lineTo(x, -z);
    }
    s.closePath();
    return s;
  };
  const slab = (scale, depth, color) => {
    const geo = new THREE.ExtrudeGeometry(outline(scale), { depth, bevelEnabled: false });
    geo.rotateX(-Math.PI / 2);
    geo.translate(0, -depth, 0);
    return mesh(faceted(geo), toon(color));
  };
  const top = slab(1, 0.28, colors.top);
  g.add(top);
  const layers = [];
  let y = -0.28;
  [[0.97, 0.9], [0.78, 1.0], [0.55, 1.1]].forEach(([scale, depth], i) => {
    depth *= depthScale;
    const m = slab(scale, depth, colors.layers[i]);
    m.position.y = y;
    y -= depth;
    m.userData.baseRot = (i + 1) * 0.12;
    m.rotation.y = m.userData.baseRot;
    g.add(m); layers.push(m);
  });
  // optional short, blunt stand under the layers (main islands have none)
  if (stand) {
    const R = radial(0.3);
    const tipH = stand.h;
    const tip = mesh(faceted(new THREE.CylinderGeometry(R * 0.5, R * 0.5 * stand.ratio, tipH, 7)),
      toon(colors.tip[1], { colorB: colors.tip[0], grad: [-tipH / 2, tipH / 2] }));
    tip.position.y = y - tipH / 2;
    tip.userData.baseRot = 0.7;
    tip.rotation.y = 0.7;
    g.add(tip); layers.push(tip);
  }
  return { group: g, top, layers };
}

// ------------------------------------------------------------- signs + screens

// 招牌: a shop sign made only of color blocks (no text). Vertical signs stick
// out from the facade (thin along x); flat ones lie on it (thin along z).
function shopSign(r, { w, h, t = 0.05, flat = false }) {
  const g = new THREE.Group();
  const [frame, panel] = r.pick(SIGN);
  g.add(mesh(flat ? box(w, h, t) : box(t, h, w), toon(frame)));
  // one to three stacked blocks on each face, alternating two colors
  const n = flat ? 1 : r.i(1, 3);
  const alt = r.pick(SIGN)[0];
  const pw = w * 0.8, ph = h * 0.86 / n;
  for (let k = 0; k < n; k++) {
    const col = k % 2 ? (alt === frame ? panel : alt) : panel;
    const y = -h * 0.43 + ph * (k + 0.5);
    for (const s of [-1, 1]) {
      const pl = new THREE.Mesh(new THREE.PlaneGeometry(pw, ph * 0.9), basic(col));
      if (flat) { pl.position.set(0, y, s * (t / 2 + 0.003)); if (s < 0) pl.rotation.y = Math.PI; }
      else { pl.position.set(s * (t / 2 + 0.003), y, 0); pl.rotation.y = s * Math.PI / 2; }
      g.add(pl);
    }
  }
  return part(g);
}

// A Times Square screen: an abstract animated gradient in an ink frame.
function billboard(r, w, h) {
  const g = new THREE.Group();
  const back = mesh(box(w + 0.05, h + 0.05, 0.04), toon(C.ink), { edges: false });
  back.position.z = -0.022;
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(w, h), billboardMaterial(r.next()));
  screen.position.z = 0.001;
  g.add(back, screen);
  return part(g);
}

// ------------------------------------------------------------- Taiwan

// The Central Mountain Range: low-poly peaks along the island's long axis.
// ux, uz: unit vector of the axis. Peaks are tallest in the middle.
export function mountainRange(r, ux, uz, { length = 7.5, width = 2.0, height = 3.4 } = {}) {
  const g = new THREE.Group();
  const peaks = [];
  const add = (al, pe, rad, hgt, dark) => {
    // a cone with its apex and shoulders nudged, so no two peaks match
    const raw = new THREE.ConeGeometry(rad, hgt, r.i(5, 7), 2);
    const pos = raw.attributes.position, seen = new Map();
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
      const key = `${x.toFixed(3)},${y.toFixed(3)},${z.toFixed(3)}`;
      if (!seen.has(key)) {
        const top = y > hgt / 2 - 1e-3, bottom = y < -hgt / 2 + 1e-3;
        seen.set(key, top ? [r.f(-0.3, 0.3) * rad, 0, r.f(-0.3, 0.3) * rad]
          : bottom ? [r.f(-0.08, 0.08) * rad, 0, r.f(-0.08, 0.08) * rad]
            : [r.f(-0.18, 0.18) * rad, r.f(-0.15, 0.1) * hgt, r.f(-0.18, 0.18) * rad]);
      }
      const o = seen.get(key);
      pos.setXYZ(i, x + o[0], y + o[1], z + o[2]);
    }
    const geo = faceted(raw);
    const m = mesh(geo, toon(dark ? '#a9d98a' : '#c9e8a0', { colorB: dark ? '#3f8f3a' : '#58ab29', grad: [-hgt / 2, hgt / 2] }));
    m.position.set(al * ux - pe * uz, hgt / 2 - 0.02, al * uz + pe * ux);
    m.rotation.y = r.f(0, TAU);
    m.scale.set(1, 1, r.f(0.75, 1.0));
    g.add(m);
    peaks.push(m);
  };
  // main ridge: broad, uneven massifs, one clear high point a little off-center
  for (let al = -length * 0.78; al <= length * 0.78 + 0.01; al += r.f(1.1, 1.9)) {
    const env = 1 - Math.pow(al / length, 2);
    const peak = Math.exp(-Math.pow((al + 1.2) / 2.2, 2));       // 玉山-ish summit
    const hgt = 0.7 + height * env * r.f(0.45, 0.85) + 1.0 * peak;
    add(al, r.f(-0.45, 0.45), 1.0 + width * 0.6 * env * r.f(0.8, 1.1), hgt, false);
  }
  // darker, lower foothills on both flanks
  for (let al = -length * 0.7; al <= length * 0.7; al += r.f(1.0, 1.6)) {
    const env = 1 - Math.pow(al / length, 2);
    for (const s of [-1, 1]) {
      if (!r.chance(0.75)) continue;
      add(al + r.f(-0.5, 0.5), s * width * r.f(0.45, 0.7) * env, 0.6 + 0.6 * env, 0.5 + 1.1 * env * r.f(0.6, 1), true);
    }
  }
  return { group: g, peaks };
}

// 電線桿: a concrete utility pole with two cross-arms, insulators, a yellow and
// black safety band and sometimes a transformer. The arms point along local x.
// Returns attachment points for wires (local).
export function utilityPole(r) {
  const g = new THREE.Group();
  const H = 2.6;
  const pole = mesh(faceted(new THREE.CylinderGeometry(0.045, 0.065, H, 6)), toon('#d6d0c4'));
  pole.position.y = H / 2;
  g.add(pole);
  const band = mesh(faceted(new THREE.CylinderGeometry(0.068, 0.068, 0.22, 6)), toon(C.yellow), { edges: false });
  band.position.y = 0.32;
  g.add(band);
  const pts = [];
  for (const [y, half] of [[H - 0.12, 0.38], [H - 0.42, 0.3]]) {
    const arm = mesh(box(half * 2, 0.045, 0.05), toon('#8f8a80'), { edges: false });
    arm.position.y = y;
    g.add(arm);
    for (const sx of [-1, 0, 1]) {
      if (sx === 0 && half < 0.35) continue;
      const ins = mesh(box(0.035, 0.06, 0.035), toon(C.paper), { edges: false });
      ins.position.set(sx * half * 0.85, y + 0.05, 0);
      g.add(ins);
      pts.push(new THREE.Vector3(sx * half * 0.85, y + 0.08, 0));
    }
  }
  if (r.chance(0.5)) {
    const tr = mesh(faceted(new THREE.CylinderGeometry(0.11, 0.11, 0.3, 8)), toon('#8fa59a'));
    tr.position.set(0, H - 0.85, 0.15);
    g.add(tr);
  }
  return { group: part(g), pts };
}

// A drooping wire between two points (in the same parent space).
const wireMat = new THREE.LineBasicMaterial({ color: '#1c2550' });
export function wireSpan(a, b, sag) {
  const pts = [];
  for (let i = 0; i <= 12; i++) {
    const t = i / 12;
    const p = a.clone().lerp(b, t);
    p.y -= sag * 4 * t * (1 - t);
    pts.push(p);
  }
  return new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), wireMat);
}

// ------------------------------------------------------------- flying houses

// Little paper-cut houses (flat colors, a door, a simple roof) that float in
// zero gravity. Centered on their middle so they tumble nicely.
const SHIP = ['#e4572e', '#f2a541', '#7aa35a', '#8fc0e8', '#f4a7c0', '#26306b', '#6b4a2b', '#3d6b35',
  '#7fc8bf', '#a8323e', '#c9cc3f', '#a05bb5', '#4a86c8', '#f07b3f', '#556b8d', '#e8c547', '#d9534f', '#f6b8c8'];

export function flyingHouse(r) {
  const g = new THREE.Group();
  const kind = r.pick(['gable', 'gable', 'tall', 'wide', 'flat', 'shed']);
  const dims = {
    gable: [r.f(0.85, 1.2), r.f(0.7, 0.95)],
    tall: [r.f(0.55, 0.75), r.f(1.05, 1.45)],
    wide: [r.f(1.4, 1.9), r.f(0.6, 0.8)],
    flat: [r.f(0.85, 1.25), r.f(0.75, 1.05)],
    shed: [r.f(0.8, 1.15), r.f(0.75, 1.0)],
  }[kind];
  const [w, h] = dims, d = r.f(0.65, 1.0);
  const cols = [...SHIP];
  const take = () => cols.splice(Math.floor(r.next() * cols.length), 1)[0];
  const wall = take(), roofC = take(), doorC = take();

  const body = box(w, h, d);
  body.applyMatrix4(new THREE.Matrix4().makeShear(r.f(-0.06, 0.06), 0, 0, 0, 0, 0)); // hand-cut wobble
  g.add(mesh(body, toon(wall)));

  const top = h / 2;
  if (kind === 'gable' || kind === 'tall') {
    const ov = 0.08, rh = (w / 2 + ov) * r.f(0.75, 1.05);
    const shp = new THREE.Shape();
    shp.moveTo(-w / 2 - ov, 0); shp.lineTo(w / 2 + ov, 0); shp.lineTo(r.f(-0.05, 0.05), rh); shp.closePath();
    const geo = new THREE.ExtrudeGeometry(shp, { depth: d + 0.08, bevelEnabled: false });
    geo.translate(0, top, -(d + 0.08) / 2);
    g.add(mesh(faceted(geo), toon(roofC)));
  } else if (kind === 'shed') {
    const slab = mesh(box(w + 0.22, 0.1, d + 0.14), toon(roofC));
    slab.position.y = top + 0.12;
    slab.rotation.z = r.chance(0.5) ? 0.2 : -0.2;
    g.add(slab);
  } else {
    // flat roof that flares out a little, like a cut paper strip
    const th = r.f(0.12, 0.2), ov = r.f(0.04, 0.12);
    const shp = new THREE.Shape();
    shp.moveTo(-w / 2 - 0.02, 0); shp.lineTo(w / 2 + 0.02, 0); shp.lineTo(w / 2 + ov, th); shp.lineTo(-w / 2 - ov, th); shp.closePath();
    const geo = new THREE.ExtrudeGeometry(shp, { depth: d + 0.1, bevelEnabled: false });
    geo.translate(0, top, -(d + 0.1) / 2);
    g.add(mesh(faceted(geo), toon(roofC)));
  }

  const dw = Math.min(0.3, w * 0.26), dh = h * r.f(0.45, 0.6);
  for (const s of [1, -1]) {
    const door = mesh(box(dw, dh, 0.03), toon(doorC), { edges: false });
    door.position.set(r.f(-0.25, 0.25) * w, -h / 2 + dh / 2, s * (d / 2 + 0.012));
    g.add(door);
  }
  return g;
}

// ------------------------------------------------------------- mid islands

// A New York subway entrance: a stair going down between green railings,
// two glowing globe lamps, and a strip of colored line dots.
export function subwayEntrance() {
  const g = new THREE.Group();
  const W = 1.1, L = 1.8;
  const pit = mesh(box(W, 0.04, L), toon('#18204a'), { edges: false });
  pit.position.y = 0.02;
  g.add(pit);
  for (let k = 0; k < 7; k++) {   // steps fading down into the dark
    const st = mesh(box(W * 0.9, 0.012, 0.05), basic(new THREE.Color('#f2e8d2').lerp(new THREE.Color('#18204a'), k / 7)), { edges: false });
    st.position.set(0, 0.045, L / 2 - 0.12 - k * 0.22);
    g.add(st);
  }
  const glow = new THREE.Mesh(new THREE.PlaneGeometry(W * 0.8, 0.5), basic('#ffd9a0'));
  glow.rotation.x = -Math.PI / 2;
  glow.position.set(0, 0.043, -L / 2 + 0.35);
  g.add(glow);

  const green = toon('#3f7a4f');
  const railH = 0.7;
  for (const sx of [-1, 1]) {
    const rail = mesh(box(0.04, 0.04, L), green);
    rail.position.set(sx * W / 2, railH, 0);
    g.add(rail);
    for (const z of [-L / 2, 0, L / 2]) {
      const post = mesh(box(0.04, railH, 0.04), green, { edges: false });
      post.position.set(sx * W / 2, railH / 2, z);
      g.add(post);
    }
    for (let z = -L / 2 + 0.15; z < L / 2; z += 0.15) {
      const bar = mesh(box(0.015, railH * 0.85, 0.015), green, { edges: false });
      bar.position.set(sx * W / 2, railH * 0.45, z);
      g.add(bar);
    }
    // the globe lamps
    const lp = mesh(box(0.05, 1.25, 0.05), green, { edges: false });
    lp.position.set(sx * W / 2, 0.62, L / 2);
    const globe = new THREE.Mesh(new THREE.SphereGeometry(0.13, 14, 10), basic('#7dea8f'));
    globe.position.set(sx * W / 2, 1.36, L / 2);
    g.add(lp, globe);
  }
  const backRail = mesh(box(W, 0.04, 0.04), green);
  backRail.position.set(0, railH, -L / 2);
  g.add(backRail);
  // sign over the back: a dark bar with colored line dots
  const sign = mesh(box(W + 0.1, 0.24, 0.05), toon('#1c1f2a'));
  sign.position.set(0, railH + 0.38, -L / 2);
  g.add(sign);
  ['#ee352e', '#00933c', '#fccc0a', '#0039a6'].forEach((c, i) => {
    const dot = new THREE.Mesh(new THREE.CircleGeometry(0.075, 16), basic(c));
    dot.position.set(-0.3 + i * 0.2, railH + 0.38, -L / 2 + 0.03);
    g.add(dot);
  });
  for (const sx of [-1, 1]) {
    const sp = mesh(box(0.04, 0.4, 0.04), green, { edges: false });
    sp.position.set(sx * W / 2, railH + 0.2, -L / 2);
    g.add(sp);
  }
  return g;
}

// A bus stop: a shelter with a tin roof, a lit ad panel, a bench, and a
// stop sign on a pole.
export function busStop(r) {
  const g = new THREE.Group();
  const W = 1.8, D = 0.7, H = 1.35;
  const frame = toon(C.ink);
  for (const sx of [-1, 1]) {
    const post = mesh(box(0.05, H, 0.05), frame, { edges: false });
    post.position.set(sx * W / 2, H / 2, -D / 2);
    g.add(post);
  }
  const roof = mesh(box(W + 0.2, 0.06, D + 0.25), toon('#3aa6a0', { rib: 0.07 }));
  roof.position.set(0, H + 0.05, 0);
  roof.rotation.x = -0.1;
  g.add(roof);
  const back = new THREE.Mesh(new THREE.PlaneGeometry(W, H * 0.7), new THREE.MeshBasicMaterial({
    color: '#cfe7f5', transparent: true, opacity: 0.55, side: THREE.DoubleSide, depthWrite: false,
  }));
  back.position.set(0, H * 0.5, -D / 2);
  g.add(back);
  const ad = billboard(r, 0.55, H * 0.7);
  ad.position.set(W / 2 + 0.03, H * 0.5, -D / 2 + 0.3);
  ad.rotation.y = Math.PI / 2;
  g.add(ad);
  const seat = mesh(box(W * 0.8, 0.05, 0.25), toon(C.skyBlue));
  seat.position.set(0, 0.32, -D / 2 + 0.18);
  g.add(seat);
  for (const sx of [-1, 1]) {
    const leg = mesh(box(0.04, 0.32, 0.2), frame, { edges: false });
    leg.position.set(sx * W * 0.32, 0.16, -D / 2 + 0.18);
    g.add(leg);
  }
  // stop sign
  const pole = mesh(box(0.05, 1.9, 0.05), toon(C.paper), { edges: false });
  pole.position.set(-W / 2 - 0.45, 0.95, 0.15);
  const plate = mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.04, 20), toon(C.roofBlue));
  plate.rotation.x = Math.PI / 2;
  plate.position.set(-W / 2 - 0.45, 1.8, 0.15);
  const inner = new THREE.Mesh(new THREE.CircleGeometry(0.13, 18), basic(C.paper));
  inner.position.set(-W / 2 - 0.45, 1.8, 0.175);
  const board = mesh(box(0.28, 0.4, 0.04), toon(C.yellow));
  board.position.set(-W / 2 - 0.45, 1.3, 0.15);
  g.add(pole, plate, inner, board);
  // curb + a stripe of road
  const curb = mesh(box(W + 1.6, 0.06, 0.3), toon(C.sidewalk));
  curb.position.set(-0.2, 0.03, D / 2 + 0.25);
  g.add(curb);
  return g;
}

// A small grove: a few low-poly trees.
export function grove(r) {
  const g = new THREE.Group();
  const greens = ['#58ab29', '#6fb34d', '#3f8f3a', '#8fc66c'];
  for (let i = 0; i < 5; i++) {
    const a = i / 5 * TAU + r.f(-0.3, 0.3), rr = r.f(0.6, 1.7);
    const t = new THREE.Group();
    const th = r.f(0.4, 0.7);
    const trunk = mesh(box(0.1, th, 0.1), toon(C.wood), { edges: false });
    trunk.position.y = th / 2;
    const crown = mesh(faceted(new THREE.IcosahedronGeometry(r.f(0.35, 0.6), 0)), toon(r.pick(greens)));
    crown.position.y = th + 0.3;
    crown.scale.y = r.f(1.0, 1.5);
    t.add(trunk, crown);
    t.position.set(Math.cos(a) * rr, 0, Math.sin(a) * rr);
    g.add(part(t));
  }
  return g;
}

// ------------------------------------------------------------- Manhattan

// The street grid: long avenues along x, short cross streets along z. One
// intersection carries the zebra crossings, the cycling signal and a bench.
// isIn(x, z, margin) tells whether a point is on the island.
export function manhattanGrid(isIn, { avenues, AW, streets, SW, main }) {
  const g = new THREE.Group();
  const asphalt = toon(C.asphalt);
  const white = toon('#f4f1ea');
  const yellow = toon(C.softYellow);
  const extent = (fixed, along, half) => {     // how far a road can run before the shore
    let lo = 0, hi = 0;
    const ok = (t) => along === 'x' ? isIn(t, fixed - half, 0.3) && isIn(t, fixed + half, 0.3) : isIn(fixed - half, t, 0.3) && isIn(fixed + half, t, 0.3);
    while (ok(hi + 0.05)) hi += 0.05;
    while (ok(lo - 0.05)) lo -= 0.05;
    return [lo, hi];
  };
  const aveSpan = {};
  for (const z of avenues) {
    const [x0, x1] = extent(z, 'x', AW / 2);
    aveSpan[z] = [x0, x1];
    const a = mesh(box(x1 - x0, 0.05, AW), asphalt);
    a.position.set((x0 + x1) / 2, 0.025, z);
    g.add(a);
    for (let x = x0 + 0.4; x < x1 - 0.4; x += 0.7) {
      if (streets.some(sx => Math.abs(x - sx) < SW / 2 + 0.25)) continue;
      const dash = mesh(box(0.34, 0.012, 0.06), yellow, { edges: false });
      dash.position.set(x, 0.056, z);
      g.add(dash);
    }
    // sidewalks between cross streets, on both sides
    const cuts = [x0, ...streets.flatMap(sx => [sx - SW / 2, sx + SW / 2]), x1].sort((p, q) => p - q);
    for (let i = 0; i < cuts.length - 1; i += 2) {
      const a0 = Math.max(x0, cuts[i]), a1 = Math.min(x1, cuts[i + 1]);
      if (a1 - a0 < 0.2) continue;
      for (const side of [-1, 1]) {
        const curb = mesh(box(a1 - a0, 0.07, 0.2), toon(C.sidewalk));
        curb.position.set((a0 + a1) / 2, 0.035, z + side * (AW / 2 + 0.1));
        g.add(curb);
      }
    }
  }
  for (const x of streets) {
    const [z0, z1] = extent(x, 'z', SW / 2);
    const st = mesh(box(SW, 0.05, z1 - z0), asphalt);
    st.position.set(x, 0.024, (z0 + z1) / 2);
    g.add(st);
  }

  // the main intersection: zebra crossings on all four sides
  const [mx, mz] = main;
  for (const [sx, sz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
    const across = sx !== 0 ? AW : SW;
    const n = Math.floor((across - 0.1) / 0.17);
    for (let k = 0; k < n; k++) {
      const off = -across / 2 + 0.12 + k * 0.17;
      const stripe = mesh(sx ? box(0.36, 0.012, 0.09) : box(0.09, 0.012, 0.36), white, { edges: false });
      stripe.position.set(mx + (sx ? sx * (SW / 2 + 0.24) : off), 0.057, mz + (sz ? sz * (AW / 2 + 0.24) : off));
      g.add(stripe);
    }
  }
  // street lights along the avenues
  for (const z of avenues) {
    const [x0, x1] = aveSpan[z];
    let k = 0;
    for (let x = x0 + 1.2; x < x1 - 0.8; x += 2.6, k++) {
      if (streets.some(sx => Math.abs(x - sx) < SW / 2 + 0.3)) continue;
      const side = k % 2 ? 1 : -1;
      const sl = new THREE.Group();
      const pole = mesh(box(0.05, 1.3, 0.05), toon(C.ink), { edges: false });
      pole.position.y = 0.65;
      const armM = mesh(box(0.04, 0.04, 0.36), toon(C.ink), { edges: false });
      armM.position.set(0, 1.28, -0.16);
      const head = mesh(box(0.1, 0.05, 0.16), basic('#ffe7a8'), { edges: false });
      head.position.set(0, 1.25, -0.32);
      sl.add(pole, armM, head);
      sl.position.set(x, 0.07, z + side * (AW / 2 + 0.12));
      sl.rotation.y = side > 0 ? 0 : Math.PI;
      g.add(part(sl));
    }
  }

  // signal on the main corner
  const signal = new THREE.Group();
  const sp = mesh(box(0.05, 1.05, 0.05), toon(C.ink), { edges: false });
  sp.position.y = 0.52;
  const housing = mesh(box(0.13, 0.38, 0.11), toon(C.ink));
  housing.position.y = 1.2;
  signal.add(sp, housing);
  const lamps = [];
  ['#ff3b2a', '#f3d600', '#58ab29'].forEach((col, i) => {
    const l = new THREE.Mesh(new THREE.CircleGeometry(0.038, 12), new THREE.MeshBasicMaterial({ color: col }));
    l.position.set(0, 1.31 - i * 0.11, 0.056);
    l.userData.on = new THREE.Color(col);
    l.userData.off = new THREE.Color(col).multiplyScalar(0.25).lerp(new THREE.Color(C.ink), 0.5);
    signal.add(l);
    lamps.push(l);
  });
  signal.position.set(mx + SW / 2 + 0.14, 0.07, mz + AW / 2 + 0.14);
  g.add(part(signal));

  const bench = new THREE.Group();
  const seat = mesh(box(0.55, 0.04, 0.17), toon(C.skyBlue));
  seat.position.y = 0.22;
  const back = mesh(box(0.55, 0.17, 0.03), toon(C.skyBlue));
  back.position.set(0, 0.33, -0.08);
  bench.add(seat, back);
  bench.position.set(mx - SW / 2 - 0.5, 0.07, mz - AW / 2 - 0.16);
  bench.rotation.y = Math.PI;
  g.add(part(bench));
  return { group: g, lamps, aveSpan };
}

// Skyscrapers: generic towers, two to three times the walk-ups. Window grids
// light up at night (see the toon shader's win option).
export function skyscraper(r, kind) {
  const g = new THREE.Group();
  const tower = (w, h, d, y, color, opts = {}) => {
    const m = mesh(box(w, h, d), toon(color, { tile: 0.18, win: 0.18, ...opts }));
    m.position.y = y + h / 2;
    g.add(m);
    return y + h;
  };
  if (kind === 'deco') {           // stepped setbacks and a spire
    const c = r.pick([C.limestone, '#d9cdb4', C.cream]);
    let y = tower(1.6, r.f(4.5, 5.5), 1.55, 0, c);
    y = tower(1.2, r.f(2.2, 2.8), 1.15, y, c);
    y = tower(0.8, r.f(1.2, 1.6), 0.78, y, c);
    const crown = mesh(faceted(new THREE.ConeGeometry(0.42, 1.0, 4)), toon('#c9cfd8'));
    crown.position.y = y + 0.5;
    crown.rotation.y = Math.PI / 4;
    const spire = mesh(box(0.05, 1.3, 0.05), toon(C.ink), { edges: false });
    spire.position.y = y + 1.6;
    g.add(crown, spire);
  } else if (kind === 'glass') {   // slim blue glass with a slanted top
    const h = r.f(8.5, 10.5);
    const m = mesh(box(1.25, h, 1.25), toon('#7fb0e8', { colorB: '#1f47ae', grad: [-h / 2, h / 2], tile: 0.16, win: 0.16 }));
    m.position.y = h / 2;
    g.add(m);
    const shp = new THREE.Shape();
    shp.moveTo(-0.625, 0); shp.lineTo(0.625, 0); shp.lineTo(0.625, 0.9); shp.closePath();
    const geo = new THREE.ExtrudeGeometry(shp, { depth: 1.25, bevelEnabled: false });
    geo.translate(0, h, -0.625);
    g.add(mesh(faceted(geo), toon('#9cc6ff')));
  } else if (kind === 'slab') {    // a wide office slab
    const c = r.pick(['#c9cfd8', '#e3d6c3', '#b9c4d6']);
    const y = tower(1.7, r.f(6.5, 7.5), 1.15, 0, c);
    const top = mesh(box(0.9, 0.5, 0.7), toon(C.paper));
    top.position.y = y + 0.25;
    g.add(top);
  } else {                         // needle: very tall and thin, with an antenna
    const c = r.pick(['#8fa3c8', '#dfe4ea']);
    let y = tower(1.05, r.f(9.5, 11), 1.05, 0, c);
    y = tower(0.7, 0.8, 0.7, y, c);
    const ant = mesh(box(0.04, 1.6, 0.04), toon(C.ink), { edges: false });
    ant.position.y = y + 0.8;
    g.add(ant);
  }
  // a big screen low on the front, Times Square style
  if (r.chance(0.7)) {
    const b = billboard(r, r.f(0.8, 1.1), r.f(0.9, 1.6));
    b.position.set(0, r.f(1.4, 2.2), (kind === 'glass' ? 0.625 : kind === 'slab' ? 0.575 : kind === 'deco' ? 0.775 : 0.525) + 0.03);
    g.add(b);
  }
  return g;
}

// A yellow cab.
export function taxi() {
  const g = new THREE.Group();
  const body = mesh(box(0.2, 0.1, 0.46), toon('#f3c400'));
  body.position.y = 0.09;
  const cab = mesh(box(0.18, 0.08, 0.24), toon('#f3c400'));
  cab.position.set(0, 0.18, -0.02);
  const glass = mesh(box(0.185, 0.05, 0.2), toon(C.glassOff), { edges: false });
  glass.position.set(0, 0.18, -0.02);
  const sign = mesh(box(0.08, 0.035, 0.04), basic('#fff6c8'), { edges: false });
  sign.position.set(0, 0.24, -0.02);
  g.add(body, cab, glass, sign);
  for (const z of [-0.15, 0.15]) {
    const wheel = mesh(box(0.22, 0.06, 0.08), toon(C.ink), { edges: false });
    wheel.position.set(0, 0.04, z);
    g.add(wheel);
  }
  return g;
}

// A suspension bridge running along +x, ending in a big lit window standing
// in the air. Returns the window (for the camera) too.
export function suspensionBridge(r, len) {
  const g = new THREE.Group();
  const steel = toon('#5b7fc4');
  const deckY = 0.16;
  const deck = mesh(box(len, 0.1, 0.9), toon('#d9d4c7'));
  deck.position.set(len / 2, deckY, 0);
  const road = mesh(box(len, 0.012, 0.6), toon(C.asphalt), { edges: false });
  road.position.set(len / 2, deckY + 0.056, 0);
  g.add(deck, road);
  for (const z of [-0.43, 0.43]) {
    const rail = mesh(box(len, 0.04, 0.03), steel, { edges: false });
    rail.position.set(len / 2, deckY + 0.22, z);
    g.add(rail);
  }
  const towerH = 2.6, tx = [len * 0.22, len * 0.72];
  for (const x of tx) {
    for (const z of [-0.45, 0.45]) {
      const post = mesh(box(0.12, towerH, 0.12), steel);
      post.position.set(x, deckY + towerH / 2, z);
      g.add(post);
    }
    for (const y of [towerH * 0.55, towerH - 0.06]) {
      const beam = mesh(box(0.12, 0.14, 1.02), steel);
      beam.position.set(x, deckY + y, 0);
      g.add(beam);
    }
  }
  // main cables and hangers
  const cableMat = new THREE.LineBasicMaterial({ color: C.ink });
  const topY = deckY + towerH;
  const cableY = (x) => {
    if (x <= tx[0]) return deckY + 0.25 + (topY - deckY - 0.25) * Math.pow(x / tx[0], 1.6);
    if (x >= tx[1]) return topY - (topY - deckY - 0.25) * Math.pow((x - tx[1]) / (len - tx[1]), 0.8);
    const t = (x - tx[0]) / (tx[1] - tx[0]);
    return topY - 1.9 * 4 * t * (1 - t);
  };
  for (const z of [-0.45, 0.45]) {
    const pts = [];
    for (let i = 0; i <= 48; i++) { const x = i / 48 * len; pts.push(new THREE.Vector3(x, cableY(x), z)); }
    g.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), cableMat));
    const hang = [];
    for (let x = 0.3; x < len - 0.1; x += 0.3) {
      if (tx.some(t => Math.abs(x - t) < 0.12)) continue;
      hang.push(new THREE.Vector3(x, deckY + 0.05, z), new THREE.Vector3(x, cableY(x), z));
    }
    g.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(hang), cableMat));
  }
  // the window at the end, facing back along the bridge
  const W = 1.5, H = 2.1, t = 0.12;
  const frame = new THREE.Group();
  const fc = toon(C.paper);
  const top = mesh(box(t * 1.4, t, W + t * 2), fc); top.position.y = H + t / 2;
  const bot = mesh(box(t * 1.4, t, W + t * 2), fc); bot.position.y = -t / 2;
  const lft = mesh(box(t * 1.4, H, t), fc); lft.position.set(0, H / 2, -W / 2 - t / 2);
  const rgt = mesh(box(t * 1.4, H, t), fc); rgt.position.set(0, H / 2, W / 2 + t / 2);
  frame.add(top, bot, lft, rgt);
  const win = addWindow(frame, { y: H / 2, ry: -Math.PI / 2, w: W, h: H, shape: SHAPE.CROSS, seed: 0.42, doubleSided: true, depth: 3, curtain: 0.3, light: LIGHTS.warm });
  frame.position.set(len + 0.05, deckY + 0.06, 0);
  g.add(frame);
  return { group: g, window: win };
}
