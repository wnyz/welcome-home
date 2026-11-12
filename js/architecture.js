// Architecture + objects. Every builder returns plain Three.js groups made of
// boxes, extrusions and cylinders, so the whole world stays procedural.
//
// userData.kind tags let the world find parts that can come loose when the
// displacement intensity rises: 'window', 'bars', 'roof', 'part'.

import * as THREE from 'three';
import { C } from './config.js';
import { toon, mesh, faceted, addWindow, SHAPE, LIGHTS, beamMaterial, billboardMaterial, dreamyBoardMaterial, shared } from './materials.js';

const TAU = Math.PI * 2;
const OUT = 0.012; // how far windows sit off a wall
// boxes of the same size share one geometry (thousands of boxes, a few hundred sizes)
const boxCache = new Map();
export const box = (w, h, d) => {
  const key = `${w.toFixed(4)}|${h.toFixed(4)}|${d.toFixed(4)}`;
  let g = boxCache.get(key);
  if (!g) { g = new THREE.BoxGeometry(w, h, d); boxCache.set(key, g); }
  return g;
};
const part = (o) => { o.userData.kind = 'part'; return o; };
const basic = (color) => new THREE.MeshBasicMaterial({ color });

// shop-sign color blocks: soft light ripples running out from the middle,
// like a quieter portal. Shared per color + offset, so there are few materials.
const signMats = new Map();
function signMaterial(color, slot) {
  const key = color + slot;
  if (!signMats.has(key)) {
    signMats.set(key, new THREE.ShaderMaterial({
      uniforms: { uTime: shared.uTime, uLoop: shared.uLoop, uCol: { value: new THREE.Color(color) }, uOff: { value: slot / 4 } },
      vertexShader: /* glsl */`
        varying vec2 vUv;
        void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
      fragmentShader: /* glsl */`
        uniform float uTime, uLoop, uOff;
        uniform vec3 uCol;
        varying vec2 vUv;
        void main() {
          float d = length((vUv - 0.5) * vec2(2.0, 1.0));
          float x = 1.0 - abs(fract(d * 1.5 - uTime / uLoop * 10.0 + uOff) * 2.0 - 1.0);
          vec3 col = mix(uCol * 0.82, mix(uCol, vec3(1.0), 0.3), smoothstep(0.2, 0.9, x));
          gl_FragColor = vec4(col, 1.0);
        }`,
    }));
  }
  return signMats.get(key);
}

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
  const bulbs = [];
  for (let f = 1; f < floors; f++) {
    const y = f * fh + 0.02;
    const nb = Math.max(3, Math.round(pw / 0.16));
    for (let i = 0; i <= nb && f % 2 === 1; i++) {
      const t = i / nb;
      bulbs.push(new THREE.Vector3(-pw / 2 + pw * t, y + 0.2 - 0.05 * Math.sin(Math.PI * t), 0.32));
    }
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
  if (bulbs.length) g.add(stringLights(bulbs));   // Christmas lights on every balcony
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
    const b = billboard(r, bw, bh, true);     // rooftop screens: the dreamy set
    b.position.y = 0.36 + bh / 2;
    const b2 = billboard(r, bw, bh, true);   // screens on both faces
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

// A spiral staircase going nowhere: chunky steps curving up and round,
// deep blue at the bottom fading to white and pink at the top.
export function spiralStairs(n = 15) {
  const g = new THREE.Group();
  const bottom = new THREE.Color('#5ab4e8'), top = new THREE.Color('#f6d9da');
  for (let k = 0; k < n; k++) {
    const f = k / (n - 1);
    const sh = 0.2, len = 1.05 - f * 0.25, dep = 0.42 - f * 0.08;
    const col = '#' + bottom.clone().lerp(top, f).getHexString();
    const s = mesh(box(len, sh, dep), toon(col, { colorB: '#3b62c4', grad: [-sh / 2, sh / 2] }));
    const a = k * 0.44;
    const rr = 0.42 + len / 2;
    s.position.set(Math.cos(a) * rr, sh / 2 + k * sh, Math.sin(a) * rr);
    s.rotation.y = -a;
    g.add(part(s));
  }
  return g;
}

// A portal: a flat disc that only *looks* deep, the same trick as the
// windows. For each pixel the shader follows the view a little way into an
// imaginary tube behind the disc and colors it by how far back it lands:
// rings of color that crowd together and darken toward a navy center, and
// shift as the camera moves. The rings flow slowly inward (whole cycles per
// loop). A flat warm rim with an ink edge goes round it. Faces +x.
export function portal(R = 2.8) {
  const mat = new THREE.ShaderMaterial({
    uniforms: { uTime: shared.uTime, uLoop: shared.uLoop, uFrame: shared.uFrame },
    vertexShader: /* glsl */`
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * viewMatrix * modelMatrix * vec4(position, 1.0);
      }`,
    fragmentShader: /* glsl */`
      uniform float uTime, uLoop;
      uniform vec3 uFrame;
      varying vec2 vUv;
      const float TAU = 6.28318530718;
      // blue, lilac, pink, orange, and back again, so waves can repeat seamlessly
      vec3 wave(float g) {
        float x = 1.0 - abs(fract(g) * 2.0 - 1.0);       // 0..1..0
        vec3 cBlue = vec3(0.0, 0.48, 1.0);
        vec3 cLil  = vec3(0.88, 0.58, 1.0);
        vec3 cPink = vec3(0.95, 0.6, 0.75);
        vec3 cOr   = vec3(1.0, 0.53, 0.3);
        vec3 col = mix(cBlue, cLil, smoothstep(0.0, 0.4, x));
        col = mix(col, cPink, smoothstep(0.35, 0.7, x));
        return mix(col, cOr, smoothstep(0.65, 1.0, x));
      }
      void main() {
        vec2 p = vUv * 2.0 - 1.0;
        float r = length(p);
        if (r > 1.0) discard;
        vec3 col;
        {
          // colour waves born in the middle and flowing outward, 12 per loop
          float ph = uTime / uLoop;
          col = wave(r * 0.85 - ph * 12.0);
          // dark heart that breathes with each wave
          float core = 0.22 + 0.04 * sin(TAU * 12.0 * ph);
          col = mix(vec3(0.12, 0.13, 0.18), col, smoothstep(0.0, core * 1.6, r));
        }
        if (r > 0.97) col = uFrame;
        gl_FragColor = vec4(col, 1.0);
      }`,
    side: THREE.DoubleSide,
  });
  const disc = new THREE.Mesh(new THREE.CircleGeometry(R, 72), mat);
  disc.scale.set(1, 0.72, 1);             // an oval, like the reference
  disc.rotation.y = Math.PI / 2;          // faces along x
  const holder = new THREE.Group();
  holder.add(disc);
  return holder;
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

// The airliner: one smooth body (rounded nose, long cabin, a tail that
// slims and sweeps up into the fin), swept wings on a small fairing, two
// tapered engines, stabilizers. Nose along +z.
export function airplane() {
  const g = new THREE.Group();
  const white = toon(C.paper, { doubleSided: true });
  const blue = toon('#8cbcff');
  // body: a lathe profile (radius, length) from the tail tip to the nose
  const prof = [
    [0.0, -2.45], [0.07, -2.4], [0.13, -2.2], [0.2, -1.85], [0.27, -1.35], [0.3, -0.9],
    [0.3, 1.3], [0.29, 1.6], [0.26, 1.85], [0.21, 2.05], [0.14, 2.2], [0.06, 2.3], [0.0, 2.33],
  ];
  const bodyGeo = new THREE.LatheGeometry(prof.map(([r, z]) => new THREE.Vector2(r, z)), 16);
  bodyGeo.rotateX(Math.PI / 2);            // lathe axis (y) -> z, nose toward +z
  const p = bodyGeo.attributes.position;
  for (let i = 0; i < p.count; i++) {      // the tail sweeps up
    const z = p.getZ(i);
    if (z < -0.9) p.setY(i, p.getY(i) + Math.pow((-0.9 - z) / 1.55, 1.6) * 0.32);
  }
  bodyGeo.computeVertexNormals();
  const body = mesh(bodyGeo, white, { threshold: 35 });
  g.add(body);
  // cockpit windows and the pale blue cheat line
  const cw = mesh(box(0.3, 0.06, 0.1), toon(C.ink), { edges: false });
  cw.position.set(0, 0.17, 1.98);
  cw.rotation.x = -0.5;
  g.add(cw);
  for (const sx of [-1, 1]) {
    const stripe = mesh(box(0.02, 0.06, 2.6), blue, { edges: false });
    stripe.position.set(sx * 0.3, 0.03, 0.25);
    g.add(stripe);
  }
  const slab = (pts, depth) => {
    const geo = new THREE.ExtrudeGeometry(new THREE.Shape(pts.map(([x, y]) => new THREE.Vector2(x, y))), { depth, bevelEnabled: false });
    geo.rotateX(Math.PI / 2);
    geo.translate(0, depth / 2, 0);
    return faceted(geo);
  };
  // wing-root fairing
  const fair = mesh(faceted(new THREE.SphereGeometry(0.3, 12, 6)), white, { threshold: 40 });
  fair.scale.set(1.15, 0.6, 2.4);
  fair.position.set(0, -0.14, 0.05);
  g.add(fair);
  for (const sx of [-1, 1]) {
    const w = mesh(slab([[0.15, 0.6], [2.3, -0.5], [2.4, -0.75], [0.15, -0.4]].map(([x, y]) => [x * sx, y]), 0.06), white);
    w.position.y = -0.12;
    w.rotation.z = sx * 0.06;              // a little dihedral
    g.add(w);
    // engine: a tapered nacelle on a short pylon
    const nac = mesh(new THREE.LatheGeometry([[0.0, -0.32], [0.08, -0.3], [0.12, -0.15], [0.14, 0.15], [0.13, 0.3], [0.1, 0.32]].map(([r, z]) => new THREE.Vector2(r, z)), 12), white, { threshold: 35 });
    nac.geometry.rotateX(Math.PI / 2);
    nac.geometry.computeVertexNormals();
    nac.position.set(sx * 0.95, -0.3, 0.32);
    const intake = mesh(new THREE.CircleGeometry(0.1, 12), toon(C.ink), { edges: false });
    intake.position.set(sx * 0.95, -0.3, 0.645);
    const pylon = mesh(box(0.04, 0.14, 0.3), white, { edges: false });
    pylon.position.set(sx * 0.95, -0.18, 0.25);
    g.add(nac, intake, pylon);
    const stab = mesh(slab([[0.04, -1.7], [0.85, -2.2], [0.85, -2.33], [0.04, -2.15]].map(([x, y]) => [x * sx, y]), 0.04), white);
    stab.position.y = 0.2;
    g.add(stab);
  }
  // tail fin
  const finShape = new THREE.Shape([[-1.55, 0], [-2.35, 0], [-2.5, 1.0], [-2.2, 1.0]].map(([z, y]) => new THREE.Vector2(z, y)));
  const finGeo = new THREE.ExtrudeGeometry(finShape, { depth: 0.05, bevelEnabled: false });
  finGeo.rotateY(-Math.PI / 2);
  finGeo.translate(-0.025, 0.24, 0);
  g.add(mesh(faceted(finGeo), blue));
  return g;
}

// ------------------------------------------------------------- street lights

// Soft warm glow around lamps. The viewer fades every halo in with the
// night on its side of the world (see LAMP_HALOS in viewer.js).
export const LAMP_HALOS = [];
let haloTexture = null;
function haloTex() {
  if (haloTexture) return haloTexture;
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const x = c.getContext('2d');
  const gr = x.createRadialGradient(32, 32, 0, 32, 32, 32);
  gr.addColorStop(0, 'rgba(255,230,170,0.75)');
  gr.addColorStop(0.3, 'rgba(255,200,120,0.3)');
  gr.addColorStop(1, 'rgba(255,170,90,0)');
  x.fillStyle = gr;
  x.fillRect(0, 0, 64, 64);
  haloTexture = new THREE.CanvasTexture(c);
  return haloTexture;
}
export function lampHalo(size = 1.2, color = '#ffffff') {
  const s = new THREE.Sprite(new THREE.SpriteMaterial({
    map: haloTex(), color, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending,
  }));
  s.scale.setScalar(size);
  s.renderOrder = 6;
  s.visible = false;
  LAMP_HALOS.push(s);
  return s;
}
// A street lamp: pole, arm, warm head, and its night glow.
export function streetLamp(h = 1.4) {
  const g = new THREE.Group();
  const pole = mesh(box(0.05, h, 0.05), toon(C.ink), { edges: false });
  pole.position.y = h / 2;
  const armM = mesh(box(0.04, 0.04, 0.34), toon(C.ink), { edges: false });
  armM.position.set(0, h - 0.02, 0.15);
  const head = mesh(box(0.11, 0.05, 0.17), basic('#ffe7a8'), { edges: false });
  head.position.set(0, h - 0.05, 0.31);
  const glow = lampHalo(1.2);
  glow.position.set(0, h - 0.12, 0.31);
  g.add(pole, armM, head, glow);
  return g;
}

// A tall ladder standing upright in the air, with a lit window floating at
// the top: the ladder ends right at the sill. Returns the window too.
export function ladderToWindow(H = 8, lean = 0.21) {
  const g = new THREE.Group();
  const wood = toon(C.paper);
  const lad = new THREE.Group();          // the ladder leans; the window stays upright
  for (const sx of [-1, 1]) {
    const rail = mesh(box(0.07, H, 0.07), wood);
    rail.position.set(sx * 0.26, H / 2, 0);
    lad.add(rail);
  }
  for (let y = 0.25; y < H - 0.1; y += 0.32) {
    const rung = mesh(box(0.5, 0.04, 0.05), wood, { edges: false });
    rung.position.set(0, y, 0);
    lad.add(rung);
  }
  lad.rotation.z = lean;
  g.add(lad);
  const W = 1.5, Hw = 1.15, t = 0.1;
  const frame = new THREE.Group();
  const fc = toon(C.cream);
  const top = mesh(box(W + t * 2, t, t * 1.4), fc); top.position.y = Hw + t / 2;
  const sill = mesh(box(W + t * 2 + 0.2, t, t * 2.4), fc); sill.position.set(0, -t / 2, 0.04);
  const lft = mesh(box(t, Hw, t * 1.4), fc); lft.position.set(-W / 2 - t / 2, Hw / 2, 0);
  const rgt = mesh(box(t, Hw, t * 1.4), fc); rgt.position.set(W / 2 + t / 2, Hw / 2, 0);
  frame.add(top, sill, lft, rgt);
  const win = addWindow(frame, { y: Hw / 2, w: W, h: Hw, shape: SHAPE.CROSS, seed: 0.77, doubleSided: true, depth: 2.6, curtain: 0.4, light: LIGHTS.warm });
  frame.position.set(-Math.sin(lean) * H, Math.cos(lean) * H + 0.05, -0.12);
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
  const anim = [];
  g.userData.anim = anim;
  let count = 0;
  // rings of bags, smaller and fewer toward the top
  const layers = 7;
  for (let i = 0; i < layers; i++) {
    const f = i / (layers - 1);
    const rr = radius * (1 - f * 0.92);
    const n = Math.max(1, Math.round(rr * 5.5));
    for (let k = 0; k < n; k++) {
      const a = (k / n) * TAU + r.f(-0.2, 0.2) + i * 0.4;
      const b = bag(r, r.f(0.8, 1.15));
      const holder = new THREE.Group();     // the pile's place for it; the bag moves inside
      holder.position.set(Math.cos(a) * rr * r.f(0.7, 1), f * height, Math.sin(a) * rr * r.f(0.7, 1));
      b.rotation.set(r.f(-0.35, 0.35), r.f(0, TAU), r.chance(0.35) ? Math.PI / 2 + r.f(-0.2, 0.2) : r.f(-0.3, 0.3));
      holder.add(b);
      g.add(part(holder));
      const h = fract1(Math.sin(++count * 91.7) * 4375.85);
      const mode = (i === layers - 1 || (i === layers - 3 && k === 0)) ? 'float' : h < 0.4 ? 'jostle' : null;
      if (mode) anim.push({ b, mode, rot: b.rotation.clone(), k: 2 + Math.floor(h * 10) % 4, off: h * 7 % 1, sign: h < 0.2 ? 1 : -1 });
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
  const slab = (scale, depth, color, puff = 0) => {
    const geo = new THREE.ExtrudeGeometry(outline(scale), { depth, bevelEnabled: false });
    geo.rotateX(-Math.PI / 2);
    geo.translate(0, -depth, 0);
    return mesh(faceted(geo), toon(color, { puff }));
  };
  const top = slab(1, 0.28, colors.top);
  g.add(top);
  const layers = [];
  let y = -0.28;
  [[0.97, 0.9], [0.78, 1.0], [0.55, 1.1]].forEach(([scale, depth], i) => {
    depth *= depthScale;
    const m = slab(scale, depth, colors.layers[i], 0.3 * depthScale);   // quilted, like a down jacket
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
  const slot = r.i(0, 3);
  const pw = w * 0.8, ph = h * 0.86 / n;
  for (let k = 0; k < n; k++) {
    const col = k % 2 ? (alt === frame ? panel : alt) : panel;
    const y = -h * 0.43 + ph * (k + 0.5);
    for (const s of [-1, 1]) {
      const pl = new THREE.Mesh(new THREE.PlaneGeometry(pw, ph * 0.9), signMaterial(col, (k + slot) % 4));
      if (flat) { pl.position.set(0, y, s * (t / 2 + 0.003)); if (s < 0) pl.rotation.y = Math.PI; }
      else { pl.position.set(s * (t / 2 + 0.003), y, 0); pl.rotation.y = s * Math.PI / 2; }
      g.add(pl);
    }
  }
  return part(g);
}

// A Times Square screen: an abstract animated gradient in an ink frame.
function billboard(r, w, h, dreamy = false) {
  const g = new THREE.Group();
  const back = mesh(box(w + 0.05, h + 0.05, 0.04), toon(C.ink), { edges: false });
  back.position.z = -0.022;
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(w, h), dreamy ? dreamyBoardMaterial(r.next()) : billboardMaterial(r.next()));
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
    // double-sided + sunk into the ground, so overlapping peaks never show a hole
    const m = mesh(geo, toon(dark ? '#a9d98a' : '#c9e8a0', { colorB: dark ? '#3f8f3a' : '#58ab29', grad: [-hgt / 2, hgt / 2], doubleSided: true }));
    m.position.set(al * ux - pe * uz, hgt / 2 - 0.3, al * uz + pe * ux);
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

  const body = new THREE.BoxGeometry(w, h, d);   // its own copy: it gets sheared
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
    const glow = lampHalo(1.3, '#9dffb0');
    glow.position.copy(globe.position);
    g.add(lp, globe, glow);
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
  const lamp = streetLamp(1.7);
  lamp.position.set(W / 2 + 0.7, 0, 0.35);
  lamp.rotation.y = Math.PI / 2;
  g.add(lamp);
  // curb + a stripe of road
  const curb = mesh(box(W + 1.6, 0.06, 0.3), toon(C.sidewalk));
  curb.position.set(-0.2, 0.03, D / 2 + 0.25);
  g.add(curb);
  g.userData.traffic = busStopTraffic(g, W);
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
      const glow = lampHalo(1.1);
      glow.position.set(0, 1.18, -0.32);
      sl.add(pole, armM, head, glow);
      sl.position.set(x, 0.07, z + side * (AW / 2 + 0.12));
      sl.rotation.y = side > 0 ? 0 : Math.PI;
      g.add(part(sl));
    }
  }

  // lamps along the cross streets too
  for (const x of streets) {
    let k = 0;
    for (let z = -3.4; z <= 3.4; z += 2.3, k++) {
      if (avenues.some(az => Math.abs(z - az) < AW / 2 + 0.4) || !isIn(x, z, 0.4)) continue;
      const lamp = streetLamp(1.25);
      const side = k % 2 ? 1 : -1;
      lamp.position.set(x + side * (SW / 2 + 0.12), 0.07, z);
      lamp.rotation.y = side > 0 ? -Math.PI / 2 : Math.PI / 2;
      g.add(part(lamp));
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
    const m = mesh(box(w, h, d), toon(color, { win: 0.2, ...opts }));
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
    const m = mesh(box(1.25, h, 1.25), toon('#7fb0e8', { colorB: '#1f47ae', grad: [-h / 2, h / 2], win: 0.18 }));
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
  carLights(g, { front: 0.23, back: -0.23, y: 0.1, x: 0.065, size: 0.7 });
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
  win.material = otherWorldMaterial();     // not a room: a way through to somewhere else
  const glow = steadyGlow(3.4, '#ffb0d8', 0.3);
  glow.position.set(-0.4, H / 2, 0);
  frame.add(glow);
  frame.position.set(len + 0.05, deckY + 0.06, 0);
  g.add(frame);
  return { group: g, window: win };
}

// ------------------------------------------------------------- song scenes
// Pieces added for specific songs: car lights, the little bus, the bus that
// pulls into the stop, restless luggage, the window into another world,
// fire-escape string lights, two interior rooms and the round-island road.

// Head + tail lights on a vehicle whose front faces +z. The glows come on with
// the night on its side of the world (they are LAMP_HALOS).
function carLights(g, { front, back, y, x, size = 1 }) {
  for (const s of [-1, 1]) {
    const hl = mesh(box(0.05 * size, 0.035 * size, 0.012), basic('#fff6d0'), { edges: false });
    hl.position.set(s * x, y, front + 0.006);
    const hh = lampHalo(0.5 * size, '#fff1c4');
    hh.position.set(s * x, y, front + 0.07 * size);
    const tl = mesh(box(0.045 * size, 0.03 * size, 0.012), basic('#ff3b2f'), { edges: false });
    tl.position.set(s * x, y, back - 0.006);
    const th = lampHalo(0.28 * size, '#ff5040');
    th.position.set(s * x, y, back - 0.05 * size);
    g.add(hl, hh, tl, th);
  }
}

// A small round-nosed bus, 1 unit long, front facing +z.
export function miniBus(color = '#2f9a8f') {
  const g = new THREE.Group();
  const L = 1.0, W = 0.42, H = 0.46, y0 = 0.07;
  const body = mesh(box(W, H, L), toon(color));
  body.position.y = y0 + H / 2;
  const roof = mesh(box(W + 0.01, 0.05, L * 0.94), toon(C.paper));
  roof.position.y = y0 + H + 0.02;
  const glass = mesh(box(W + 0.012, 0.14, L * 0.8), toon(C.glassOff, { win: 1 }), { edges: false });
  glass.position.set(0, y0 + H * 0.68, -0.03);
  const shield = mesh(box(W * 0.84, 0.17, 0.012), toon(C.glassOff, { win: 1 }), { edges: false });
  shield.position.set(0, y0 + H * 0.66, L / 2 + 0.004);
  const stripe = mesh(box(W + 0.012, 0.04, L + 0.004), toon(C.yellow), { edges: false });
  stripe.position.y = y0 + H * 0.3;
  const sign = mesh(box(W * 0.6, 0.05, 0.012), basic('#ffd34d'), { edges: false });
  sign.position.set(0, y0 + H - 0.04, L / 2 + 0.006);
  g.add(body, roof, glass, shield, stripe, sign);
  for (const z of [-0.3, 0.3]) {
    const wheel = mesh(box(W + 0.04, 0.12, 0.16), toon(C.ink), { edges: false });
    wheel.position.set(0, 0.06, z);
    g.add(wheel);
  }
  carLights(g, { front: L / 2, back: -L / 2, y: y0 + 0.1, x: W * 0.34, size: 1.4 });
  return g;
}

// The bus stop's road, its bus, and three arrival lights on the yellow board.
function busStopTraffic(g, W) {
  const road = mesh(box(5.6, 0.03, 0.66), toon(C.asphalt), { edges: false });
  road.position.set(0, 0.015, 1.08);
  g.add(road);
  for (let i = 0; i < 7; i++) {
    const dash = mesh(box(0.34, 0.008, 0.04), basic('#f3e6b0'), { edges: false });
    dash.position.set(-2.4 + i * 0.8, 0.034, 1.08);
    g.add(dash);
  }
  const bus = miniBus();
  bus.scale.setScalar(1.8);
  bus.rotation.y = Math.PI / 2;           // drives along +x
  bus.position.set(-3, 0.03, 1.08);
  g.add(bus);
  const on = new THREE.Color('#ff5a2a'), off = new THREE.Color('#7a5a20');
  const dots = [-0.08, 0, 0.08].map(dx => {
    const d = new THREE.Mesh(new THREE.CircleGeometry(0.03, 10), new THREE.MeshBasicMaterial({ color: off }));
    d.position.set(-W / 2 - 0.45 + dx, 1.4, 0.172);
    g.add(d);
    return d;
  });
  return { bus, dots, on, off };
}

const smooth = (x) => { x = Math.min(1, Math.max(0, x)); return x * x * (3 - 2 * x); };

// Two buses per loop: one pulls in, waits, leaves. The board's three lights
// count it in, blink while it waits, go dark when it leaves.
export function animateBusStop(a, ph) {
  const u = (ph * 2) % 1;
  let x, lit = 0, blink = false;
  if (u < 0.22) { const e = u / 0.22; x = -3 + 3.2 * (1 - (1 - e) * (1 - e)); lit = 1 + Math.floor(e * 2.99); }
  else if (u < 0.55) { x = 0.2; blink = true; }
  else if (u < 0.75) { const e = (u - 0.55) / 0.2; x = 0.2 + 2.8 * e * e; }
  else { x = -3; lit = (u - 0.75) / 0.25 > 0.5 ? 1 : 0; }
  a.bus.position.x = x;
  const s = smooth((3 - Math.abs(x)) / 0.7);
  a.bus.scale.setScalar(1.8 * Math.max(0.0001, s));
  a.bus.visible = s > 0.01;
  // a little dip as it brakes and pulls away
  const dip = u > 0.2 && u < 0.26 ? Math.sin((u - 0.2) / 0.06 * Math.PI) : 0;
  a.bus.rotation.z = dip * 0.04;
  const on = blink ? (Math.sin(TAU * ph * 24) > 0 ? 3 : 0) : lit;
  a.dots.forEach((d, i) => d.material.color.copy(i < on ? a.on : a.off));
}

// Luggage that won't sit still: some bags jostle, a couple lift off the pile
// and float, turning once, before settling back.
export function animateLuggage(list, ph) {
  for (const it of list) {
    const b = it.b;
    if (it.mode === 'jostle') {
      const s = Math.max(0, Math.sin(TAU * (ph * it.k + it.off)));
      const hop = Math.pow(s, 10);
      b.position.set(0, hop * 0.14, 0);
      b.rotation.set(it.rot.x, it.rot.y, it.rot.z + hop * 0.5 * it.sign);
    } else if (it.mode === 'float') {
      const u = (ph * 2 + it.off) % 1;
      const up = smooth((u - 0.05) / 0.3) * (1 - smooth((u - 0.6) / 0.3));
      b.position.set(Math.sin(TAU * u) * 0.25 * up, up * (1.4 + Math.sin(TAU * u * 3) * 0.08), 0);
      b.rotation.set(it.rot.x * (1 - up), it.rot.y + TAU * smooth((u - 0.05) / 0.85), it.rot.z * (1 - up) + Math.sin(TAU * u * 2) * 0.2 * up);
    }
  }
}

// The bridge's window, opening onto another world: a slow spiral of the
// portal colors pulling toward a bright middle, with sparks drifting out.
export function otherWorldMaterial() {
  return new THREE.ShaderMaterial({
    uniforms: { uTime: shared.uTime, uLoop: shared.uLoop },
    vertexShader: /* glsl */`
      varying vec2 vUv;
      void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: /* glsl */`
      uniform float uTime, uLoop;
      varying vec2 vUv;
      const float TAU = 6.28318530718;
      float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      vec3 pal(float x) {
        vec3 c0 = vec3(0.0, 0.42, 0.95), c1 = vec3(0.86, 0.58, 1.0), c2 = vec3(0.98, 0.58, 0.74), c3 = vec3(1.0, 0.56, 0.3), c4 = vec3(1.0, 0.86, 0.35);
        vec3 c = mix(c0, c1, smoothstep(0.0, 0.3, x));
        c = mix(c, c2, smoothstep(0.25, 0.55, x));
        c = mix(c, c3, smoothstep(0.5, 0.8, x));
        return mix(c, c4, smoothstep(0.78, 1.0, x));
      }
      void main() {
        vec2 p = (vUv - 0.5) * vec2(1.5 / 2.1, 1.0) * 2.0;
        float r = length(p), ang = atan(p.y, p.x);
        float ph = uTime / uLoop;
        // soft rings drifting slowly inward, with only a slight wobble
        float g = log(r + 0.08) * 0.55 + 0.035 * sin(ang * 2.0 + TAU * ph * 2.0) - ph * 6.0;
        float x = 1.0 - abs(fract(g) * 2.0 - 1.0);
        x = smoothstep(0.0, 1.0, x);
        vec3 col = mix(pal(x), vec3(0.98, 0.9, 0.95), 0.18);
        col = mix(col, vec3(1.0, 0.97, 0.92), smoothstep(0.38, 0.0, r));   // light at the far end
        col *= mix(1.0, 0.7, smoothstep(0.7, 1.4, r));
        vec2 q = vec2(ang / TAU * 12.0, log(r + 0.04) * 4.0 - ph * 12.0);
        vec2 f = fract(q) - 0.5;
        float star = step(0.88, hash(floor(q))) * smoothstep(0.14, 0.0, length(f));
        col += star * 0.5;
        gl_FragColor = vec4(col, 1.0);
      }`,
    side: THREE.DoubleSide,
  });
}

// A soft glow that never switches off (unlike lamp halos)
export function steadyGlow(size, color, opacity = 0.6) {
  const s = new THREE.Sprite(new THREE.SpriteMaterial({
    map: haloTex(), color, transparent: true, opacity, depthWrite: false, blending: THREE.AdditiveBlending,
  }));
  s.scale.setScalar(size);
  s.renderOrder = 6;
  return s;
}

// String lights: round bulbs that twinkle in five colors, brighter and
// haloed at night (New York's night).
let stringMat = null;
export function stringLights(points) {
  if (!stringMat) {
    stringMat = new THREE.ShaderMaterial({
      uniforms: { uTime: shared.uTime, uLoop: shared.uLoop, uNight: shared.uNightA, uPxH: shared.uPxH },
      vertexShader: /* glsl */`
        uniform float uTime, uLoop, uNight, uPxH;
        attribute float aSeed;
        varying vec3 vCol;
        varying float vB;
        const float TAU = 6.28318530718;
        void main() {
          float k = floor(6.0 + aSeed * 7.0);
          float tw = 0.5 + 0.5 * sin(TAU * (uTime / uLoop * k + aSeed * 5.0));
          vB = mix(0.8, 1.1, uNight) * (0.55 + 0.45 * tw);
          float c = floor(fract(aSeed * 13.0) * 5.0);
          vCol = c < 0.5 ? vec3(1.0, 0.86, 0.55) : c < 1.5 ? vec3(1.0, 0.3, 0.25) : c < 2.5 ? vec3(0.35, 0.9, 0.45) : c < 3.5 ? vec3(0.4, 0.6, 1.0) : vec3(1.0, 0.85, 0.2);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = max(3.0, 0.06 * (1.6 + 1.4 * uNight) * projectionMatrix[1][1] * uPxH * 0.5);
        }`,
      fragmentShader: /* glsl */`
        uniform float uNight;
        varying vec3 vCol;
        varying float vB;
        void main() {
          float d = length(gl_PointCoord - 0.5);
          float core = smoothstep(0.5 / (1.6 + 1.4 * uNight), 0.0, d);
          float halo = smoothstep(0.5, 0.0, d) * (0.15 + 0.2 * uNight);
          float a = max(core, halo) * vB;
          if (a < 0.02) discard;
          gl_FragColor = vec4(mix(vCol, vec3(1.0), core * 0.4) * (0.6 + vB), a);
        }`,
      transparent: true, depthWrite: false,
    });
  }
  const pos = [], seed = [];
  points.forEach((p, i) => { pos.push(p.x, p.y, p.z); seed.push(fract1(i * 0.6180339 + p.x * 3.1)); });
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('aSeed', new THREE.Float32BufferAttribute(seed, 1));
  const pts = new THREE.Points(geo, stringMat);
  pts.frustumCulled = false;
  return pts;
}
const fract1 = (x) => x - Math.floor(x);

// ---- interiors. Each is a room with its open side facing +z (where the
// camera sits) and a big window in the wall at z = 0 looking out along -z.
// `eye` sits in the middle of the window; the camera presets aim at it.

function roomShell(g, { RW, RH, RD, winW, winH, sill, wall, floor, ceil, tile = 0 }) {
  const T = 0.22;
  const wm = toon(wall, { tile });
  const add = (w, h, d, x, y, z, m = wm) => { const o = mesh(box(w, h, d), m); o.position.set(x, y, z); g.add(o); return o; };
  const side = (RW - winW) / 2;
  add(side, RH, T, -RW / 2 + side / 2, RH / 2, -T / 2);
  add(side, RH, T, RW / 2 - side / 2, RH / 2, -T / 2);
  add(winW, sill, T, 0, sill / 2, -T / 2);
  add(winW, RH - sill - winH, T, 0, sill + winH + (RH - sill - winH) / 2, -T / 2);
  add(T, RH, RD, -RW / 2 - T / 2, RH / 2, RD / 2);
  add(T, RH, RD, RW / 2 + T / 2, RH / 2, RD / 2);
  add(RW + T * 2, T, RD + T, 0, -T / 2, RD / 2 - T / 2, toon(floor));
  add(RW + T * 2, T, RD + T, 0, RH + T / 2, RD / 2 - T / 2, toon(ceil));
  // window frame, a cross of mullions, a deep sill
  const fm = toon(C.paper);
  const ft = 0.1;
  add(winW + ft * 2, ft, 0.3, 0, sill - ft / 2 + 0.02, 0.0, fm);
  add(winW + ft * 2, ft, 0.3, 0, sill + winH + ft / 2 - 0.02, 0.0, fm);
  add(ft, winH, 0.3, -winW / 2 - ft / 2 + 0.02, sill + winH / 2, 0.0, fm);
  add(ft, winH, 0.3, winW / 2 + ft / 2 - 0.02, sill + winH / 2, 0.0, fm);
  add(0.06, winH, 0.12, 0, sill + winH / 2, 0.0, fm);
  add(winW, 0.06, 0.12, 0, sill + winH * 0.72, 0.0, fm);
  const ledge = add(winW + 0.4, 0.08, 0.5, 0, sill + 0.04, 0.2, fm);
  const eye = new THREE.Object3D();
  eye.position.set(0, sill + winH / 2, 0);
  g.add(eye);
  return { eye, ledge };
}

function pottedPlant(r, s = 1) {
  const g = new THREE.Group();
  const pot = mesh(new THREE.CylinderGeometry(0.16 * s, 0.12 * s, 0.24 * s, 8), toon(C.terracotta));
  pot.position.y = 0.12 * s;
  const leaves = mesh(faceted(new THREE.IcosahedronGeometry(0.26 * s, 0)), toon(r.pick(['#58ab29', '#6fb34d', '#3f8f3a'])));
  leaves.position.y = 0.42 * s;
  leaves.scale.y = 1.3;
  g.add(pot, leaves);
  return g;
}

function hangingLamp(g, x, y, z, len = 0.9) {
  const cord = mesh(box(0.02, len, 0.02), toon(C.ink), { edges: false });
  cord.position.set(x, y - len / 2, z);
  const shade = mesh(new THREE.ConeGeometry(0.28, 0.24, 10, 1, true), toon(C.softYellow, { doubleSided: true }));
  shade.position.set(x, y - len - 0.08, z);
  const bulb = mesh(new THREE.SphereGeometry(0.07, 8, 6), basic('#fff1c4'), { edges: false });
  bulb.position.set(x, y - len - 0.2, z);
  const glow = lampHalo(2.6);
  glow.position.copy(bulb.position);
  g.add(cord, shade, bulb, glow);
}

// 不想去遠方: a bedroom-ish room in Taiwan, its window open on the mountains
// and the neighbors' roofs. Curtains breathe, an electric fan turns its head.
export function lookoutRoom(r) {
  const g = new THREE.Group();
  const RW = 8.4, RH = 5.4, RD = 4.6, winW = 6, winH = 3.6, sill = 0.95;
  const { eye } = roomShell(g, { RW, RH, RD, winW, winH, sill, wall: '#efe6cf', floor: '#d9b38c', ceil: '#f7f1e6' });
  // curtains, hinged at the rail so they can sway
  const curtains = [];
  for (const s of [-1, 1]) {
    const pivot = new THREE.Group();
    pivot.position.set(s * (winW / 2 + 0.15), sill + winH + 0.25, 0.35);
    const c = mesh(box(0.7, winH + 0.6, 0.06), toon('#f6a9b4', { rib: 0.12 }));
    c.position.y = -(winH + 0.6) / 2;
    pivot.add(c);
    g.add(pivot);
    curtains.push({ pivot, s });
  }
  const rail = mesh(box(winW + 1.4, 0.05, 0.05), toon(C.ink), { edges: false });
  rail.position.set(0, sill + winH + 0.27, 0.35);
  g.add(rail);
  // sill things
  const p1 = pottedPlant(r, 1.1); p1.position.set(-2.1, sill + 0.08, 0.2);
  const p2 = pottedPlant(r, 0.8); p2.position.set(2.3, sill + 0.08, 0.25);
  const cup = mesh(new THREE.CylinderGeometry(0.09, 0.08, 0.17, 10), toon(C.paper));
  cup.position.set(1.7, sill + 0.17, 0.25);
  g.add(p1, p2, cup);
  // an electric fan on a stool, front right
  const fan = new THREE.Group();
  const stand = mesh(box(0.06, 1.1, 0.06), toon(C.paper), { edges: false });
  stand.position.y = 0.55;
  const base = mesh(new THREE.CylinderGeometry(0.3, 0.34, 0.06, 12), toon(C.paper));
  base.position.y = 0.03;
  const head = new THREE.Group();
  head.position.y = 1.15;
  const motor = mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.2, 10), toon('#8fd1c4'));
  motor.rotation.x = Math.PI / 2;
  const cage = mesh(new THREE.TorusGeometry(0.42, 0.02, 4, 24), toon('#8fd1c4'), { edges: false });
  cage.position.z = -0.14;
  const blades = new THREE.Group();
  blades.position.z = -0.14;
  for (let i = 0; i < 3; i++) {
    const b = mesh(new THREE.CircleGeometry(0.17, 8), toon('#bfe6dd', { doubleSided: true }), { edges: false });
    b.scale.set(1, 0.55, 1);
    b.position.set(Math.cos(i * TAU / 3) * 0.2, Math.sin(i * TAU / 3) * 0.2, 0);
    b.rotation.z = i * TAU / 3;
    blades.add(b);
  }
  head.add(motor, cage, blades);
  fan.add(base, stand, head);
  fan.position.set(3.2, 0, 1.6);
  g.add(fan);
  // a low bed edge along the left, a stack of books
  const bed = mesh(box(2.4, 0.55, 2.2), toon('#cfe0f2'));
  bed.position.set(-2.9, 0.28, 2.6);
  const pillow = mesh(box(0.8, 0.18, 0.5), toon(C.paper));
  pillow.position.set(-3.5, 0.64, 1.9);
  g.add(bed, pillow);
  hangingLamp(g, -2.6, RH, 2.6, 0.9);
  return { group: g, eye, curtains, fanHead: head, blades };
}

// 浴室: a pink-tiled bathroom inside a floating house; the window looks out
// at New York's towers. A duck floats in the tub.
export function bathroomRoom(r) {
  const g = new THREE.Group();
  const RW = 6.2, RH = 4.4, RD = 3.6, winW = 3.0, winH = 2.4, sill = 1.25;
  const { eye } = roomShell(g, { RW, RH, RD, winW, winH, sill, wall: '#f6c1c9', floor: '#f7f1e6', ceil: '#fbe3e6', tile: 0.12 });
  // checker floor
  for (let i = 0; i < 12; i++) for (let k = 0; k < 7; k++) {
    if ((i + k) % 2) continue;
    const t = mesh(box(0.5, 0.01, 0.5), toon('#f3a5b2'), { edges: false });
    t.position.set(-RW / 2 + 0.25 + i * 0.5 + 0.01, 0.006, 0.25 + k * 0.5);
    g.add(t);
  }
  // tub along the window wall, left
  const tub = mesh(box(2.4, 0.75, 1.1), toon(C.paper));
  tub.position.set(-1.7, 0.375, 0.75);
  const water = mesh(box(2.2, 0.02, 0.9), toon('#9fd3ea'), { edges: false });
  water.position.set(-1.7, 0.7, 0.75);
  const faucet = mesh(box(0.08, 0.3, 0.08), toon('#c9d3e0'), { edges: false });
  faucet.position.set(-2.75, 0.9, 0.35);
  g.add(tub, water, faucet);
  const duck = new THREE.Group();
  const db = mesh(new THREE.SphereGeometry(0.13, 8, 6), toon(C.yellow));
  db.scale.set(1.3, 0.8, 1);
  const dh = mesh(new THREE.SphereGeometry(0.08, 8, 6), toon(C.yellow));
  dh.position.set(0.1, 0.11, 0);
  const beak = mesh(box(0.06, 0.03, 0.04), toon('#ff7b2a'), { edges: false });
  beak.position.set(0.19, 0.1, 0);
  duck.add(db, dh, beak);
  duck.position.set(-1.6, 0.76, 0.85);
  g.add(duck);
  // sink + round mirror, right
  const sink = mesh(box(0.9, 0.18, 0.55), toon(C.paper));
  sink.position.set(2.1, 1.0, 0.4);
  const ped = mesh(box(0.22, 0.95, 0.22), toon(C.paper));
  ped.position.set(2.1, 0.48, 0.35);
  const mirror = new THREE.Mesh(new THREE.CircleGeometry(0.42, 24), basic('#cfe7f5'));
  mirror.position.set(2.1, 1.85, 0.012);
  const ring = new THREE.Mesh(new THREE.RingGeometry(0.42, 0.47, 24), basic(C.ink));
  ring.position.set(2.1, 1.85, 0.014);
  const brushCup = mesh(new THREE.CylinderGeometry(0.06, 0.05, 0.14, 8), toon('#8fd1c4'));
  brushCup.position.set(2.35, 1.16, 0.3);
  g.add(sink, ped, mirror, ring, brushCup);
  // towel on a rail by the window
  const tRail = mesh(box(0.7, 0.03, 0.03), toon(C.ink), { edges: false });
  tRail.position.set(0.0, sill - 0.25, 0.08);
  const towel = mesh(box(0.55, 0.7, 0.04), toon('#ffffff', { rib: 0.1 }));
  towel.position.set(0.0, sill - 0.6, 0.1);
  g.add(tRail, towel);
  const plant = pottedPlant(r, 0.7); plant.position.set(1.1, sill + 0.08, 0.2);
  g.add(plant);
  hangingLamp(g, -1.7, RH, 1.6, 0.5);
  return { group: g, eye, duck };
}

// 晚安台灣: a road just inside the island's edge, all the way round, with
// street lamps on its outer side. path(t, out, ahead) gives a point (and a
// point a little further on) for t in 0..1.
export function ringRoad(radial, { inset = 0.42, width = 0.36, n = 180, lamps = 10 } = {}) {
  const g = new THREE.Group();
  const P = (t, out) => {
    const th = t * TAU;
    const rr = radial(th) - inset;
    return out.set(Math.cos(th) * rr, 0.014, Math.sin(th) * rr);
  };
  const a = new THREE.Vector3(), b = new THREE.Vector3(), nrm = new THREE.Vector3();
  const pos = [], idx = [];
  for (let i = 0; i <= n; i++) {
    P(i / n, a); P((i + 1) / n, b);
    nrm.set(b.z - a.z, 0, -(b.x - a.x)).normalize();
    pos.push(a.x + nrm.x * width / 2, a.y, a.z + nrm.z * width / 2, a.x - nrm.x * width / 2, a.y, a.z - nrm.z * width / 2);
    if (i < n) { const k = i * 2; idx.push(k, k + 2, k + 1, k + 1, k + 2, k + 3); }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  const road = new THREE.Mesh(geo, toon(C.asphalt, { doubleSided: true }));
  g.add(road);
  const dash = [];
  for (let i = 0; i < n; i += 2) { P(i / n, a); P((i + 0.9) / n, b); a.y = b.y = 0.02; dash.push(a.clone(), b.clone()); }
  g.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(dash), new THREE.LineBasicMaterial({ color: '#f3e6b0' })));
  for (let i = 0; i < lamps; i++) {
    const t = (i + 0.5) / lamps;
    P(t, a); P(t + 0.002, b);
    nrm.set(b.z - a.z, 0, -(b.x - a.x)).normalize();   // points outward
    const l = streetLamp(1.3);
    l.position.set(a.x + nrm.x * (width / 2 + 0.12), 0, a.z + nrm.z * (width / 2 + 0.12));
    l.rotation.y = Math.atan2(-nrm.x, -nrm.z);          // arm leans over the road
    g.add(l);
  }
  return { group: g, path: P };
}

// ------------------------------------------------------------- round 8
// A big apple floating by New York, a windmill island, and an airport
// departures board drifting through the sky.

// The Big Apple: a low-poly apple with a dimpled top, a stem and one leaf.
export function bigApple() {
  const g = new THREE.Group();
  const geo = new THREE.IcosahedronGeometry(1, 2);
  const p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) {
    let x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    const rho2 = x * x + z * z;
    y *= 0.9;
    if (y > 0) y -= 0.3 * Math.exp(-rho2 / 0.12);       // the dimple at the stem
    else y += 0.16 * Math.exp(-rho2 / 0.1);             // and underneath
    const wide = 1 + 0.08 * y;                          // a little wider at the shoulders
    p.setXYZ(i, x * wide, y, z * wide);
  }
  const body = mesh(faceted(geo), toon('#f0402f', { colorB: '#b81d2a', grad: [-0.8, 0.7] }));
  const stem = mesh(box(0.07, 0.42, 0.07), toon(C.wood), { edges: false });
  stem.position.set(0.02, 0.74, 0);
  stem.rotation.z = -0.18;
  const leaf = mesh(faceted(new THREE.IcosahedronGeometry(0.2, 0)), toon('#58ab29'));
  leaf.scale.set(1.8, 0.25, 0.8);
  leaf.position.set(0.24, 0.84, 0.02);
  leaf.rotation.z = 0.45;
  g.add(body, stem, leaf);
  return g;
}

// A wind turbine (the power-making kind): a tall slim white tower, a
// nacelle, three long thin blades, a small substation box at its foot.
export function windmill() {
  const g = new THREE.Group();
  const white = toon('#f4f2ec');
  const tower = mesh(new THREE.CylinderGeometry(0.09, 0.2, 5.2, 10), white);
  tower.position.y = 2.6;
  const nacelle = mesh(box(0.3, 0.28, 0.75), white);
  nacelle.position.set(0, 5.3, -0.05);
  const hub = mesh(new THREE.ConeGeometry(0.15, 0.3, 10), white);
  hub.rotation.x = Math.PI / 2;
  hub.position.set(0, 5.3, 0.45);
  const sails = new THREE.Group();
  sails.position.set(0, 5.3, 0.4);
  for (let i = 0; i < 3; i++) {
    const arm = new THREE.Group();
    arm.rotation.z = i * TAU / 3;
    // a long blade, wide near the root and tapering to a point
    const shp = new THREE.Shape();
    shp.moveTo(-0.07, 0.1); shp.lineTo(0.12, 0.35); shp.lineTo(0.03, 2.6); shp.lineTo(-0.03, 2.6); shp.closePath();
    const geo = new THREE.ExtrudeGeometry(shp, { depth: 0.03, bevelEnabled: false });
    const blade = mesh(geo, white);
    const tip = mesh(box(0.06, 0.35, 0.035), toon(C.roofRed), { edges: false });   // red warning tip
    tip.position.set(0, 2.42, 0.015);
    arm.add(blade, tip);
    sails.add(arm);
  }
  const station = mesh(box(0.6, 0.4, 0.45), toon('#cfd8e2'));
  station.position.set(0.8, 0.2, 0.3);
  const bolt = mesh(box(0.05, 0.16, 0.01), basic(C.yellow), { edges: false });
  bolt.position.set(0.8, 0.22, 0.53);
  bolt.rotation.z = 0.5;
  const doorT = mesh(box(0.14, 0.3, 0.02), toon(C.roofBlue), { edges: false });
  doorT.position.set(0, 0.15, 0.19);
  g.add(tower, nacelle, hub, sails, station, bolt, doorT);
  // a beacon on top that blinks red at night
  const beacon = lampHalo(0.6, '#ff4030');
  beacon.position.set(0, 5.5, -0.05);
  g.add(beacon);
  return { group: g, sails };
}

// Departure board screen: rows of split-flap characters (made-up glyphs,
// nothing to read), a yellow header, a status light per row. Each row
// riffles to a new line now and then; everything repeats with the loop.
function departuresMaterial() {
  return new THREE.ShaderMaterial({
    uniforms: { uTime: shared.uTime, uLoop: shared.uLoop, uNight: shared.uNightB },
    vertexShader: /* glsl */`
      varying vec2 vUv;
      void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: /* glsl */`
      uniform float uTime, uLoop, uNight;
      varying vec2 vUv;
      float hash(vec3 p) { return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453); }
      void main() {
        vec2 uv = vUv;
        float ph = uTime / uLoop;
        vec3 bg = vec3(0.07, 0.1, 0.24);
        vec3 col = bg;
        // header
        if (uv.y > 0.84) {
          col = vec3(0.95, 0.84, 0.0);
          // a little plane mark and two word-blocks
          vec2 h = (uv - vec2(0.07, 0.92)) * vec2(7.0 / 4.2, 1.0);
          float plane = step(abs(h.y), 0.012) * step(abs(h.x), 0.045) + step(abs(h.x + 0.005), 0.012) * step(abs(h.y), 0.045);
          float words = step(0.13, uv.x) * step(uv.x, 0.48) * step(abs(uv.y - 0.92), 0.025)
                      + step(0.52, uv.x) * step(uv.x, 0.66) * step(abs(uv.y - 0.92), 0.025);
          col = mix(col, vec3(0.07, 0.1, 0.24), clamp(plane + words, 0.0, 1.0));
          gl_FragColor = vec4(col, 1.0);
          return;
        }
        // six rows
        float rows = 6.0;
        float ry = uv.y / 0.84 * rows;
        float row = floor(ry);
        float fy = fract(ry);
        float cols = 26.0;
        float cx = uv.x * cols;
        float c = floor(cx);
        float fx = fract(cx);
        // columns: time 0-3, gap, place 5-13, gap, flight 15-19, gap, gate 21-22, gap, status 24-25
        bool isChar = (c <= 3.0) || (c >= 5.0 && c <= 13.0) || (c >= 15.0 && c <= 19.0) || (c >= 21.0 && c <= 22.0);
        float k = 2.0 + floor(hash(vec3(row, 1.0, 2.0)) * 4.0);       // flips per loop
        float off = hash(vec3(row, 3.0, 4.0));
        float q = ph * k + off;
        float line = mod(floor(q), k);
        float t = fract(q);
        if (isChar) {
          // a dark tile with the flap seam across the middle
          vec2 cc = vec2(fx, fy);
          float tile = step(0.08, cc.x) * step(cc.x, 0.92) * step(0.12, cc.y) * step(cc.y, 0.88);
          col = mix(bg, vec3(0.13, 0.17, 0.33), tile);
          // riffling: each character spins through a few faces, left to right
          float r = clamp((t - c * 0.0025) / 0.035, 0.0, 1.0);
          float face = line * 7.0 + (r < 1.0 && r > 0.0 ? floor(r * 6.0) + 50.0 : 0.0);
          // 3 x 5 dot glyph
          vec2 g = (cc - vec2(0.22, 0.2)) / vec2(0.56, 0.6);
          if (g.x > 0.0 && g.x < 1.0 && g.y > 0.0 && g.y < 1.0) {
            vec2 cell = floor(g * vec2(3.0, 5.0));
            float bit = step(0.48, hash(vec3(cell + vec2(c * 3.1, row * 5.7), face)));
            vec2 fp = fract(g * vec2(3.0, 5.0)) - 0.5;
            float dotm = step(max(abs(fp.x), abs(fp.y)), 0.38);
            vec3 amber = c <= 3.0 ? vec3(1.0, 0.86, 0.3) : vec3(1.0, 0.72, 0.25);
            col = mix(col, amber * (0.85 + 0.3 * uNight), bit * dotm * tile);
          }
          col = mix(col, bg, step(abs(cc.y - 0.5), 0.02) * tile);   // the seam
        } else if (c >= 24.0 && c <= 25.0) {
          float st = hash(vec3(row, line, 9.0));
          vec3 lamp = st < 0.6 ? vec3(0.3, 0.9, 0.45) : st < 0.85 ? vec3(1.0, 0.8, 0.2) : vec3(1.0, 0.3, 0.25);
          vec2 d = vec2((cx - 25.0) / cols * 7.0, (fy - 0.5) / rows * 0.84 * 4.2);
          float blink = st > 0.85 ? step(0.5, fract(ph * 60.0)) : 1.0;
          col = mix(col, lamp, step(length(d), 0.11) * mix(0.35, 1.0, blink));
        }
        // faint row rules
        col = mix(col, vec3(0.2, 0.26, 0.48), step(fy, 0.02) * 0.6);
        gl_FragColor = vec4(col, 1.0);
      }`,
  });
}

export function departuresBoard() {
  const g = new THREE.Group();
  const W = 7, H = 4.2;
  const back = mesh(box(W + 0.3, H + 0.3, 0.26), toon(C.ink));
  g.add(back);
  const mat = departuresMaterial();
  for (const s of [1, -1]) {
    const screen = new THREE.Mesh(new THREE.PlaneGeometry(W, H), mat);
    screen.position.z = s * 0.135;
    if (s < 0) screen.rotation.y = Math.PI;
    g.add(screen);
  }
  // two little hanging rods, as if it was unhooked from a terminal ceiling
  for (const x of [-W * 0.3, W * 0.3]) {
    const rod = mesh(box(0.06, 1.2, 0.06), toon(C.ink), { edges: false });
    rod.position.set(x, H / 2 + 0.75, 0);
    g.add(rod);
  }
  return g;
}

// ------------------------------------------------------------- round 10
// Neon fish, a big clock, fireflies, a dining room, laundry in the wind,
// phones and radios.

// A soft schooling fish (after the fish-tank project): a pastel teardrop body,
// two small fins and a crescent tail that wags, seen side-on. Faces +z.
const fishMats = new Map();
const fishMat = (c, op = 1) => {
  const k = c + op;
  if (!fishMats.has(k)) fishMats.set(k, new THREE.MeshBasicMaterial({ color: c, side: THREE.DoubleSide, transparent: op < 1, opacity: op }));
  return fishMats.get(k);
};
let fishBodyGeo = null, fishTailGeo = null, fishFinGeo = null;
export function schoolFish(color) {
  if (!fishBodyGeo) {
    // drawn in (x = along the body, y = up), then turned so x runs along z
    const b = new THREE.Shape();
    b.moveTo(0.6, 0);
    b.bezierCurveTo(0.35, 0.26, -0.08, 0.26, -0.5, 0.09);
    b.bezierCurveTo(-0.55, 0.05, -0.55, -0.05, -0.5, -0.09);
    b.bezierCurveTo(-0.08, -0.26, 0.35, -0.26, 0.6, 0);
    fishBodyGeo = new THREE.ShapeGeometry(b, 10).rotateY(-Math.PI / 2);
    const t = new THREE.Shape();
    t.moveTo(0, 0);
    t.bezierCurveTo(-0.12, 0.08, -0.25, 0.2, -0.32, 0.26);
    t.bezierCurveTo(-0.24, 0.1, -0.24, -0.1, -0.32, -0.26);
    t.bezierCurveTo(-0.25, -0.2, -0.12, -0.08, 0, 0);
    fishTailGeo = new THREE.ShapeGeometry(t, 8).rotateY(-Math.PI / 2);
    const f = new THREE.Shape();
    f.moveTo(0, 0); f.quadraticCurveTo(-0.08, -0.14, -0.2, -0.16); f.quadraticCurveTo(-0.1, -0.04, 0, 0);
    fishFinGeo = new THREE.ShapeGeometry(f, 4).rotateY(-Math.PI / 2);
  }
  const g = new THREE.Group();
  g.add(new THREE.Mesh(fishBodyGeo, fishMat(color)));
  const tail = new THREE.Group();
  tail.position.z = -0.48;
  tail.add(new THREE.Mesh(fishTailGeo, fishMat(color)));
  const fin = new THREE.Mesh(fishFinGeo, fishMat(color, 0.55));
  fin.position.set(0, -0.05, 0.12);
  g.add(tail, fin);
  return { group: g, tail };
}

// A big dreamy clock: a soft sky-gradient face that slowly breathes,
// pastel dots for the hours, thin hands that spin fast.
export function bigClock() {
  const g = new THREE.Group();
  const R = 2.6;
  const body = new THREE.Group();          // squashes and stretches a little, like it's melting
  g.add(body);
  const rim = mesh(new THREE.CylinderGeometry(R + 0.18, R + 0.18, 0.3, 48), toon('#f6c1c9'));
  rim.rotation.x = Math.PI / 2;
  body.add(rim);
  const faceMat = new THREE.ShaderMaterial({
    uniforms: { uTime: shared.uTime, uLoop: shared.uLoop },
    vertexShader: /* glsl */`
      varying vec2 vUv;
      void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: /* glsl */`
      uniform float uTime, uLoop;
      varying vec2 vUv;
      const float TAU = 6.28318530718;
      void main() {
        vec2 p = vUv - 0.5;
        float ph = uTime / uLoop;
        // a soft sky inside the clock: blue at the top to peach below, a
        // pale glow drifting round, faint rings flowing out from the middle
        vec3 col = mix(vec3(0.98, 0.8, 0.72), vec3(0.62, 0.74, 0.98), smoothstep(-0.5, 0.5, p.y + 0.08 * sin(TAU * ph * 2.0 + p.x * 4.0)));
        vec2 gp = 0.22 * vec2(cos(TAU * ph * 3.0), sin(TAU * ph * 3.0));
        col = mix(col, vec3(1.0, 0.95, 0.97), exp(-dot(p - gp, p - gp) * 30.0) * 0.6);
        col = mix(col, vec3(0.86, 0.72, 0.98), 0.12 * (0.5 + 0.5 * sin(length(p) * 40.0 - TAU * ph * 12.0)));
        gl_FragColor = vec4(col, 1.0);
      }`,
  });
  const face = new THREE.Mesh(new THREE.CircleGeometry(R, 48), faceMat);
  face.position.z = 0.16;
  body.add(face);
  const dotCols = ['#ffffff', '#f6a9b4', '#b69ae4', '#8fd1c4'];
  for (let i = 0; i < 12; i++) {
    const a = i / 12 * TAU;
    const d = new THREE.Mesh(new THREE.CircleGeometry(i % 3 === 0 ? 0.16 : 0.09, 14), basic(dotCols[i % 4]));
    d.position.set(Math.sin(a) * (R - 0.42), Math.cos(a) * (R - 0.42), 0.18);
    body.add(d);
  }
  const hand = (len, w, color, z) => {
    const p = new THREE.Group();
    p.position.z = z;
    const m = mesh(box(w, len, 0.03), toon(color), { edges: false });
    m.position.y = len / 2 - 0.15;
    p.add(m);
    body.add(p);
    return p;
  };
  const hour = hand(1.3, 0.12, '#24357f', 0.2);
  const minute = hand(2.0, 0.07, '#24357f', 0.23);
  const second = hand(2.2, 0.025, '#f2a7b8', 0.26);
  const cap = new THREE.Mesh(new THREE.CircleGeometry(0.12, 16), basic('#f2a7b8'));
  cap.position.z = 0.28;
  body.add(cap);
  return { group: g, body, hour, minute, second };
}

// Fireflies: warm points drifting round a spot, each flickering on and off.
export function fireflies(n = 40, radius = 1.8) {
  const pos = [], seed = [];
  for (let i = 0; i < n; i++) {
    const a = fract1(i * 0.618) * TAU, b = fract1(i * 0.377) * 2 - 1, rr = radius * (0.35 + 0.65 * fract1(i * 0.731));
    pos.push(Math.cos(a) * rr * Math.sqrt(1 - b * b), b * rr * 0.8, Math.sin(a) * rr * Math.sqrt(1 - b * b));
    seed.push(fract1(i * 0.4142 + 0.17));
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('aSeed', new THREE.Float32BufferAttribute(seed, 1));
  const mat = new THREE.ShaderMaterial({
    uniforms: { uTime: shared.uTime, uLoop: shared.uLoop, uPxH: shared.uPxH },
    vertexShader: /* glsl */`
      uniform float uTime, uLoop, uPxH;
      attribute float aSeed;
      varying float vA;
      const float TAU = 6.28318530718;
      void main() {
        float ph = uTime / uLoop;
        float k1 = 2.0 + floor(aSeed * 3.0), k2 = 3.0 + floor(fract(aSeed * 7.0) * 3.0);
        vec3 p = position + vec3(sin(TAU * (ph * k1 + aSeed)) * 0.35, sin(TAU * (ph * k2 + aSeed * 3.0)) * 0.25, cos(TAU * (ph * k1 + aSeed * 5.0)) * 0.35);
        // flicker: mostly dim, then a soft pulse of light
        float f = pow(max(0.0, sin(TAU * (ph * (8.0 + floor(aSeed * 9.0)) + aSeed * 11.0))), 3.0);
        vA = 0.3 + 0.6 * f;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
        gl_PointSize = max(5.0, 0.28 * projectionMatrix[1][1] * uPxH * 0.5);
      }`,
    fragmentShader: /* glsl */`
      varying float vA;
      void main() {
        float d = length(gl_PointCoord - 0.5);
        float a = (smoothstep(0.5, 0.0, d) * 0.25 + smoothstep(0.16, 0.0, d) * 0.85) * vA;
        if (a < 0.01) discard;
        gl_FragColor = vec4(vec3(0.95, 0.97, 0.9) * a * 0.8, a);
      }`,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  });
  const pts = new THREE.Points(geo, mat);
  pts.frustumCulled = false;
  return pts;
}

// 一桌菜: a dining room in Taiwan with a round red table set for dinner; its
// window looks out over the island. Steam rises from the dishes.
export function diningRoom(r) {
  const g = new THREE.Group();
  const RW = 8.0, RH = 5.2, RD = 4.8, winW = 4.6, winH = 3.0, sill = 1.5;
  const { eye } = roomShell(g, { RW, RH, RD, winW, winH, sill, wall: '#f3e2c4', floor: '#c98f62', ceil: '#f7f1e6' });
  const T = new THREE.Group();
  T.position.set(0, 0, 2.4);
  const top = mesh(new THREE.CylinderGeometry(1.7, 1.7, 0.14, 40), toon('#d8322a'));
  top.position.y = 1.0;
  const lazy = mesh(new THREE.CylinderGeometry(0.85, 0.85, 0.06, 32), toon('#b52a24'));
  lazy.position.y = 1.1;
  const leg = mesh(new THREE.CylinderGeometry(0.16, 0.3, 0.95, 10), toon('#8f2a22'));
  leg.position.y = 0.48;
  T.add(top, lazy, leg);
  // dishes on the turntable and rice bowls round the edge
  const dishCols = ['#58ab29', '#f2a33a', '#f6a9b4', '#f3d600', '#c4583a'];
  for (let i = 0; i < 5; i++) {
    const a = i / 5 * TAU;
    const plate = mesh(new THREE.CylinderGeometry(0.26, 0.2, 0.05, 16), toon(C.paper));
    plate.position.set(Math.cos(a) * 0.5, 1.16, Math.sin(a) * 0.5);
    const food = mesh(new THREE.SphereGeometry(0.17, 8, 4, 0, TAU, 0, Math.PI / 2), toon(dishCols[i]));
    food.position.set(Math.cos(a) * 0.5, 1.18, Math.sin(a) * 0.5);
    food.scale.y = 0.6;
    T.add(plate, food);
  }
  const fish = mesh(new THREE.SphereGeometry(0.22, 8, 6), toon('#e8b26a'));
  fish.scale.set(1.6, 0.4, 0.7);
  fish.position.set(0, 1.2, 0);
  T.add(fish);
  for (let i = 0; i < 6; i++) {
    const a = i / 6 * TAU + 0.3;
    const bowl = mesh(new THREE.SphereGeometry(0.13, 10, 5, 0, TAU, Math.PI / 2, Math.PI / 2), toon('#f4f2ec', { doubleSided: true }));
    bowl.position.set(Math.cos(a) * 1.35, 1.2, Math.sin(a) * 1.35);
    const rice = mesh(new THREE.SphereGeometry(0.11, 8, 4, 0, TAU, 0, Math.PI / 2), toon('#ffffff'));
    rice.position.set(Math.cos(a) * 1.35, 1.17, Math.sin(a) * 1.35);
    const chop = mesh(box(0.02, 0.02, 0.4), toon(C.wood), { edges: false });
    chop.position.set(Math.cos(a) * 1.35 + 0.18, 1.09, Math.sin(a) * 1.35);
    chop.rotation.y = -a;
    T.add(bowl, rice, chop);
    // a round stool for each place
    const stool = mesh(new THREE.CylinderGeometry(0.28, 0.24, 0.6, 12), toon('#8f2a22'));
    stool.position.set(Math.cos(a) * 2.15, 0.3, Math.sin(a) * 2.15);
    T.add(stool);
  }
  g.add(T);
  // steam: soft white puffs rising from the middle dishes
  const steam = [];
  for (let i = 0; i < 8; i++) {
    const s = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 6), new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0, depthWrite: false }));
    g.add(s);
    steam.push({ m: s, off: i / 8, x: (fract1(i * 0.61) - 0.5) * 0.9, z: 2.4 + (fract1(i * 0.37) - 0.5) * 0.9 });
  }
  hangingLamp(g, 0, RH, 2.4, 1.9);
  return { group: g, eye, steam };
}
export function animateSteam(steam, ph) {
  for (const s of steam) {
    const u = (ph * 10 + s.off) % 1;
    s.m.position.set(s.x + Math.sin(u * 6 + s.off * 9) * 0.12, 1.3 + u * 1.4, s.z);
    s.m.scale.setScalar(0.6 + u * 1.6);
    s.m.material.opacity = Math.sin(Math.PI * u) * 0.35;
  }
}

// 台北某個地方: two laundry poles, a string, clothes blowing in the wind.
export function laundryLine(r, span = 2.8) {
  const g = new THREE.Group();
  const H = 1.5;
  for (const s of [-1, 1]) {
    const pole = mesh(box(0.06, H, 0.06), toon('#c9b47a'), { edges: false });
    pole.position.set(s * span / 2, H / 2, 0);
    const foot = mesh(box(0.2, 0.06, 0.2), toon(C.ink), { edges: false });
    foot.position.set(s * span / 2, 0.03, 0);
    g.add(pole, foot);
  }
  const sag = (x) => H - 0.05 - 0.12 * (1 - Math.pow(2 * x / span, 2));
  const pts = [];
  for (let i = 0; i <= 20; i++) { const x = -span / 2 + span * i / 20; pts.push(new THREE.Vector3(x, sag(x), 0)); }
  g.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({ color: C.ink })));
  const cols = [C.paper, C.blush, '#8fd1c4', C.yellow, '#3f8fd6', C.roofRed, '#ffffff'];
  const items = [];
  const kinds = ['shirt', 'towel', 'sock', 'shirt', 'towel', 'sock', 'shirt'];
  kinds.forEach((kind, i) => {
    const x = -span / 2 + span * (i + 0.7) / (kinds.length + 0.4);
    const pivot = new THREE.Group();
    pivot.position.set(x, sag(x), 0);
    const col = cols[i % cols.length];
    const m = toon(col, { doubleSided: true });
    if (kind === 'shirt') {
      const shp = new THREE.Shape();
      shp.moveTo(-0.14, 0); shp.lineTo(-0.3, -0.08); shp.lineTo(-0.26, -0.2); shp.lineTo(-0.16, -0.16);
      shp.lineTo(-0.16, -0.55); shp.lineTo(0.16, -0.55); shp.lineTo(0.16, -0.16); shp.lineTo(0.26, -0.2);
      shp.lineTo(0.3, -0.08); shp.lineTo(0.14, 0); shp.lineTo(0.06, -0.06); shp.lineTo(-0.06, -0.06); shp.closePath();
      pivot.add(mesh(new THREE.ShapeGeometry(shp), m));
    } else if (kind === 'towel') {
      const t = mesh(new THREE.PlaneGeometry(0.3, 0.5), m);
      t.position.y = -0.25;
      pivot.add(t);
    } else {
      const shp = new THREE.Shape();
      shp.moveTo(-0.04, 0); shp.lineTo(0.04, 0); shp.lineTo(0.04, -0.2); shp.lineTo(0.12, -0.26); shp.lineTo(0.1, -0.3); shp.lineTo(-0.04, -0.24); shp.closePath();
      pivot.add(mesh(new THREE.ShapeGeometry(shp), m));
    }
    const peg = mesh(box(0.03, 0.06, 0.03), toon(C.roofRed), { edges: false });
    peg.position.y = 0.01;
    pivot.add(peg);
    g.add(pivot);
    items.push({ pivot, k: 3 + (i % 3), off: i * 0.13 });
  });
  return { group: g, items };
}
export function animateLaundry(items, ph) {
  for (const it of items) {
    // a steady breeze from behind, gusting now and then
    const gust = 0.5 + 0.5 * Math.sin(TAU * (ph * 2 + it.off * 0.5));
    it.pivot.rotation.x = -(0.2 + 0.35 * gust) + Math.sin(TAU * (ph * it.k * 4 + it.off)) * 0.12;
    it.pivot.rotation.z = Math.sin(TAU * (ph * it.k * 3 + it.off * 2)) * 0.08;
  }
}

// 未接來電: an old rotary phone, a mobile phone, a little radio.
export function rotaryPhone(color = C.roofRed) {
  const g = new THREE.Group();
  const base = mesh(box(0.9, 0.35, 0.7), toon(color));
  base.position.y = 0.18;
  const slope = mesh(box(0.8, 0.12, 0.45), toon(color));
  slope.position.set(0, 0.38, 0.05);
  slope.rotation.x = -0.35;
  const dial = mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.04, 16), toon(C.paper));
  dial.position.set(0, 0.47, 0.12);
  dial.rotation.x = -0.35 + Math.PI / 2 - Math.PI / 2;
  const handset = new THREE.Group();
  handset.position.y = 0.55;
  const grip = mesh(box(0.85, 0.09, 0.14), toon(color));
  const e1 = mesh(box(0.2, 0.14, 0.22), toon(color)); e1.position.x = -0.4;
  const e2 = mesh(box(0.2, 0.14, 0.22), toon(color)); e2.position.x = 0.4;
  handset.add(grip, e1, e2);
  g.add(base, slope, dial, handset);
  return { group: g, handset };
}
export function mobilePhone() {
  const g = new THREE.Group();
  const body = mesh(box(0.4, 0.8, 0.06), toon(C.ink));
  const scr = new THREE.Mesh(new THREE.PlaneGeometry(0.34, 0.68), new THREE.MeshBasicMaterial({ color: '#9fd3ea' }));
  scr.position.z = 0.032;
  g.add(body, scr);
  return { group: g, screen: scr };
}
export function radio(color = '#8fd1c4') {
  const g = new THREE.Group();
  const body = mesh(box(1.0, 0.6, 0.35), toon(color));
  const grille = mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.02, 16), toon(C.ink), { edges: false });
  grille.rotation.x = Math.PI / 2;
  grille.position.set(-0.22, 0, 0.18);
  const dialR = mesh(box(0.34, 0.12, 0.02), toon(C.paper), { edges: false });
  dialR.position.set(0.22, 0.1, 0.18);
  for (const x of [0.12, 0.32]) {
    const k = mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.05, 8), toon(C.ink), { edges: false });
    k.rotation.x = Math.PI / 2;
    k.position.set(x, -0.12, 0.19);
    g.add(k);
  }
  const ant = mesh(box(0.02, 0.8, 0.02), toon('#c9d3e0'), { edges: false });
  ant.position.set(0.4, 0.65, 0);
  ant.rotation.z = -0.35;
  const handle = mesh(box(0.6, 0.05, 0.05), toon(C.ink), { edges: false });
  handle.position.set(0, 0.36, 0);
  g.add(body, grille, dialR, ant, handle);
  return { group: g };
}
