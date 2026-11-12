// Materials: a 3-tone "printed" toon shader for architecture, ink outlines
// (with stroke / reduced / no-stroke modes), a window shader that looks into
// a small lit room, and the lighthouse beam.

import * as THREE from 'three';
import { C, LOOP_SECONDS, WORLD } from './config.js';

// Uniforms shared by every material, updated once per frame by the viewer.
export const shared = {
  uTime: { value: 0 },                 // seconds within the loop
  uLoop: { value: LOOP_SECONDS },
  uLight: { value: new THREE.Vector3(0.5, 0.8, 0.33).normalize() },
  uShadow: { value: new THREE.Color(C.shadow) },
  uContrast: { value: 1 },             // raised in no-stroke mode
  uWindowLight: { value: 0.7 },
  uAtlas: { value: null },
  uFrame: { value: new THREE.Color(C.ink) },
  uViewDir: { value: new THREE.Vector3(0, -0.5, -0.86) }, // camera forward (world)

  // two local times sharing one world: A = New York side, B = Taiwan side
  uTz: { value: 0 },
  uTzX: { value: new THREE.Vector2(WORLD.tzBlend[0], WORLD.tzBlend[1]) },
  uTintA: { value: new THREE.Color(1, 1, 1) },
  uTintB: { value: new THREE.Color(1, 1, 1) },
  uShadowA: { value: new THREE.Color(C.shadow) },
  uShadowB: { value: new THREE.Color(C.shadow) },
  uWinA: { value: 0 },
  uWinB: { value: 0 },
  // how dark each side is (0 = day, 1 = deep night, lights almost off)
  uNightA: { value: 0 },
  uNightB: { value: 0 },
  uPxH: { value: 1080 },              // drawing-buffer height, for sizing points
};

// ---------------------------------------------------------------- toon

const toonVert = /* glsl */`
varying vec3 vN;
varying vec3 vNl;
varying vec3 vLocal;
varying vec3 vWorld;
void main() {
  vN = normalize(mat3(modelMatrix) * normal);
  vNl = normal;   // object-space normal: surface patterns stay put while things turn
  vLocal = position;
  vec4 wp = modelMatrix * vec4(position, 1.0);
  vWorld = wp.xyz;
  gl_Position = projectionMatrix * viewMatrix * wp;
}`;

const toonFrag = /* glsl */`
uniform vec3 uColor;
uniform vec3 uColorB;
uniform vec2 uGrad;
uniform float uUseGrad;
uniform float uTile;
uniform float uRib;
uniform float uWin;
uniform float uPuff;
uniform float uNightA, uNightB, uTime, uLoop;
uniform vec3 uLight;
uniform vec3 uShadow;
uniform float uContrast;
uniform float uTz;
uniform vec2 uTzX;
uniform vec3 uTintA, uTintB, uShadowA, uShadowB;
varying vec3 vN;
varying vec3 vNl;
varying vec3 vLocal;
varying vec3 vWorld;
void main() {
  vec3 n = normalize(vN);
  vec3 base = uColor;
  if (uUseGrad > 0.5) base = mix(uColorB, uColor, smoothstep(uGrad.x, uGrad.y, vLocal.y));

  // tiled facades: a faint grid on vertical faces only
  vec3 nl = normalize(vNl);
  if (uTile > 0.0) {
    vec2 q = abs(nl.x) > abs(nl.z) ? vLocal.zy : vLocal.xy;
    vec2 g = abs(fract(q / uTile) - 0.5);
    float line = step(0.42, max(g.x, g.y)) * (1.0 - abs(nl.y));
    base = mix(base, base * 0.88, line);
  }

  // puffy, like a down jacket: soft quilted rows on the sides, each row
  // lighter in its middle and pinched at its seams
  if (uPuff > 0.0 && abs(nl.y) < 0.7) {
    float b = fract(vLocal.y / uPuff);
    float bulge = sin(b * 3.14159);
    base = mix(base * 0.74, base * 1.08, pow(bulge, 0.6));
  }

  // corrugated metal: soft ribs running along local x
  if (uRib > 0.0) {
    float rib = 0.5 + 0.5 * sin(vLocal.x / uRib * 6.28318);
    base = mix(base * 0.84, base * 1.04, rib);
  }

  // local time of day: warm/cool tint + shadow color, blended across the gap
  float w = smoothstep(uTzX.x, uTzX.y, vWorld.x);
  base = mix(base, base * mix(uTintA, uTintB, w), uTz * 0.75);
  vec3 sh = mix(uShadow, mix(uShadowA, uShadowB, w), uTz * 0.85);

  float d = dot(n, uLight);
  float lit = smoothstep(0.38, 0.48, d);
  float mid = smoothstep(-0.14, -0.02, d);
  vec3 side = mix(base, sh, 0.2 * uContrast);
  vec3 dark = mix(base, sh, 0.42 * uContrast);
  vec3 c = mix(dark, side, mid);
  c = mix(c, base, lit);

  // night: the light really goes down, toward a deep blue
  float night = mix(uNightA, uNightB, w);
  c = mix(c, c * vec3(0.16, 0.19, 0.36), night * 0.9);

  // tower windows: a grid of cells, some of which light up at night
  // tower windows: rows of small single windows with wall between them.
  // At night about 4 in 10 glow gold, at different brightnesses, and stay
  // that way; only 1 window in 10 ever changes, once a loop, fading over a
  // few seconds. Far away (tiny on screen) they blend into a calm texture
  // instead of shimmering.
  if (uWin > 0.0 && abs(nl.y) < 0.5) {
    vec2 q = abs(nl.x) > abs(nl.z) ? vLocal.zy : vLocal.xy;
    vec2 qc = q / uWin;
    vec2 cell = floor(qc);
    vec2 f = abs(fract(qc) - 0.5);
    vec2 px = fwidth(qc);
    float aa = smoothstep(0.12, 0.3, max(px.x, px.y));
    float win = mix(step(f.x, 0.2) * step(f.y, 0.27), 0.22, aa);
    float face = nl.x * 3.1 + nl.z * 7.7;
    float h = fract(sin(dot(cell, vec2(12.9898, 78.233)) + face) * 43758.5453);
    float h2 = fract(h * 37.17 + 0.31);
    float h3 = fract(h * 91.31 + 0.7);
    float base = step(0.6, h2);
    float d = fract(uTime / uLoop - h);
    float flip = step(0.9, h3) * (smoothstep(0.0, 0.04, d) - smoothstep(0.5, 0.54, d));
    float on = mix(abs(base - flip), 0.4, aa) * night;
    float level = mix(0.55 + 0.45 * h2, 0.75, aa);
    vec3 glass = mix(c, vec3(0.16, 0.24, 0.5), 0.45);
    float spill = (1.0 - aa) * (1.0 - step(f.x, 0.2) * step(f.y, 0.27)) * smoothstep(0.45, 0.22, max(f.x, f.y)) * on * level * 0.3;
    c = mix(c, vec3(1.0, 0.76, 0.36), spill);
    c = mix(c, mix(glass, vec3(1.0, 0.78, 0.38) * level, on), win);
  }
  gl_FragColor = vec4(c, 1.0);
}`;

const toonCache = new Map();

export function toon(color, opts = {}) {
  const { colorB = null, grad = [0, 1], tile = 0, rib = 0, win = 0, puff = 0, doubleSided = false } = opts;
  const key = `${color}|${colorB}|${grad.join(',')}|${tile}|${rib}|${win}|${puff}|${doubleSided}`;
  if (toonCache.has(key)) return toonCache.get(key);
  const m = new THREE.ShaderMaterial({
    uniforms: {
      uColor: { value: new THREE.Color(color) },
      uColorB: { value: new THREE.Color(colorB || color) },
      uGrad: { value: new THREE.Vector2(grad[0], grad[1]) },
      uUseGrad: { value: colorB ? 1 : 0 },
      uTile: { value: tile },
      uRib: { value: rib },
      uWin: { value: win },
      uPuff: { value: puff },
      uNightA: shared.uNightA, uNightB: shared.uNightB,
      uTime: shared.uTime, uLoop: shared.uLoop,
      uLight: shared.uLight,
      uShadow: shared.uShadow,
      uContrast: shared.uContrast,
      uTz: shared.uTz, uTzX: shared.uTzX,
      uTintA: shared.uTintA, uTintB: shared.uTintB,
      uShadowA: shared.uShadowA, uShadowB: shared.uShadowB,
    },
    vertexShader: toonVert,
    fragmentShader: toonFrag,
    side: doubleSided ? THREE.DoubleSide : THREE.FrontSide,
    // push fills back a hair so ink outlines sit cleanly on top
    polygonOffset: true,
    polygonOffsetFactor: 1,
    polygonOffsetUnits: 1,
  });
  toonCache.set(key, m);
  return m;
}

// ---------------------------------------------------------------- ink lines

export const inkLine = new THREE.LineBasicMaterial({ color: C.ink, transparent: false });
const allLines = [];

// Mesh with ink outlines drawn on its hard edges.
const edgeCache = new Map();
export function mesh(geo, mat, { edges = true, threshold = 25 } = {}) {
  const m = new THREE.Mesh(geo, mat);
  if (edges) {
    // outlines are worked out once per shape and shared
    const key = `${geo.uuid}|${threshold}`;
    let eg = edgeCache.get(key);
    if (!eg) { eg = new THREE.EdgesGeometry(geo, threshold); edgeCache.set(key, eg); }
    const l = new THREE.LineSegments(eg, inkLine);
    l.userData.ink = true;
    allLines.push(l);
    m.add(l);
  }
  return m;
}

// A: full ink. B: thinner-reading, lighter, translucent. C: colored surfaces only
// (shading contrast is raised a little so forms stay readable).
export function setStrokeMode(mode) {
  const none = mode === 'none';
  const reduced = mode === 'reduced';
  const lines = mode === 'lines';     // outlines only, light on black (the viewer does the fills)
  for (const l of allLines) l.visible = !none;
  inkLine.color.set(lines ? '#f3ead8' : reduced ? '#3c5bc0' : C.ink);
  inkLine.transparent = reduced;
  inkLine.opacity = reduced ? 0.38 : 1;
  inkLine.needsUpdate = true;
  shared.uContrast.value = none ? 1.45 : reduced ? 1.15 : 1;
  shared.uFrame.value.set(none ? '#2b4fb6' : reduced ? '#2a48a8' : C.ink);
}

// Faceted normals (each face flat) for the low-poly look.
export function faceted(geo) {
  const g = geo.index ? geo.toNonIndexed() : geo;
  g.computeVertexNormals();
  return g;
}

// ---------------------------------------------------------------- windows
//
// Each window is a little room. The shader traces a ray from the (orthographic)
// camera into a box behind the glass, so the window has walls, a floor, a
// ceiling lamp and, on the back wall, a "memory" from the atlas.
//
// Hooks for later (see memories.js):
//  - fixedMem: pin a window to one memory (e.g. a photo you load into the atlas)
//  - light:    color of the interior light (warm bulb, cool fluorescent, TV blue)
//  - curtain:  0..1 how far a curtain is drawn across
//  - depth:    how deep the room feels

export const SHAPE = { RECT: 0, ROUND: 1, ARCH: 2, CROSS: 3, GRILLE: 4, BARS: 5, SHUTTER: 6 };
export const LIGHTS = { warm: '#ffd9a0', fluorescent: '#e9f6ff', tv: '#9cc6ff', amber: '#ffb870' };

const winVert = /* glsl */`
varying vec2 vUv;
varying vec3 vT, vB, vN;
varying float vWX;
void main() {
  vUv = uv;
  mat3 m = mat3(modelMatrix);
  vT = normalize(m * vec3(1.0, 0.0, 0.0));
  vB = normalize(m * vec3(0.0, 1.0, 0.0));
  vN = normalize(m * vec3(0.0, 0.0, 1.0));
  vec4 wp = modelMatrix * vec4(position, 1.0);
  vWX = wp.x;
  gl_Position = projectionMatrix * viewMatrix * wp;
}`;

const winFrag = /* glsl */`
uniform sampler2D uAtlas;
uniform float uTime, uLoop, uLightAmt, uSeed, uShape, uAspect;
uniform float uDepth, uCurtain, uFixedMem;
uniform vec3 uFrame, uOff, uGrille, uLightCol, uViewDir;
uniform float uTz, uWinA, uWinB, uNightA, uNightB;
uniform vec2 uTzX;
varying vec2 vUv;
varying vec3 vT, vB, vN;
varying float vWX;
const float TAU = 6.28318530718;

float h1(float n) { return fract(sin(n * 127.1 + 0.37) * 43758.5453); }

vec3 memory(float idx, vec2 uv) {
  idx = mod(idx, 9.0);
  vec2 cell = vec2(mod(idx, 3.0), floor(idx / 3.0));
  uv = clamp(uv, 0.03, 0.97);
  return texture2D(uAtlas, (cell + uv) / 3.0).rgb;
}

vec3 pick5(float h, vec3 a, vec3 b, vec3 c, vec3 d, vec3 e) {
  return h < 0.2 ? a : h < 0.4 ? b : h < 0.6 ? c : h < 0.8 ? d : e;
}

void main() {
  vec2 p = vUv * 2.0 - 1.0;   // x in [-aspect, aspect], y in [-1, 1]
  p.x *= uAspect;
  float hx = uAspect;

  float d;
  if (uShape > 0.5 && uShape < 1.5) {
    d = length(p) - min(hx, 1.0);
  } else if (uShape > 1.5 && uShape < 2.5) {
    float r = min(hx, 1.0);
    float cy = 1.0 - r;
    vec2 q = abs(p - vec2(0.0, (cy - 1.0) * 0.5)) - vec2(hx, (cy + 1.0) * 0.5);
    d = p.y > cy ? length(p - vec2(0.0, cy)) - r : max(q.x, q.y);
  } else {
    vec2 q = abs(p) - vec2(hx, 1.0);
    d = max(q.x, q.y);
  }
  if (d > 0.0) discard;

  float lw = 0.08;

  // free-standing iron bars (the sides/front of a protruding window cage)
  if (uShape > 4.5 && uShape < 5.5) {
    float bars = abs(fract(p.x / 0.3 + 0.5) - 0.5) * 0.3;
    float rails = min(abs(abs(p.y) - 0.55), abs(p.y + 0.97));
    float motif = abs(length(vec2(p.x, abs(p.y) - 0.55) * vec2(1.0, 1.6)) - 0.28);
    if (bars > 0.022 && rails > 0.03 && motif > 0.025 && d < -0.05) discard;
    gl_FragColor = vec4(uGrille, 1.0);
    return;
  }
  // rolling shutter: ribbed metal, no room behind
  if (uShape > 5.5) {
    float rib = step(0.5, fract(p.y * 5.0));
    vec3 c = mix(uLightCol, uLightCol * 0.86, rib);
    if (d > -0.05) c = uFrame;
    gl_FragColor = vec4(c, 1.0);
    return;
  }

  float ph = uTime / uLoop;

  // Which memory is on the back wall. Steps are whole numbers per loop, so
  // the sequence repeats exactly every loop.
  float steps = 3.0 + floor(h1(uSeed) * 4.0);
  float s = ph * steps + floor(h1(uSeed + 1.7) * steps);
  float k = floor(s);
  float i0 = floor(h1(mod(k, steps) + uSeed * 9.1) * 9.0);
  float i1 = floor(h1(mod(k + 1.0, steps) + uSeed * 9.1) * 9.0);
  float f = smoothstep(0.8, 1.0, fract(s));
  if (uFixedMem >= 0.0) { i0 = uFixedMem; i1 = uFixedMem; }

  // lights on / off on whole-number rhythms, shifted by the island's local time
  float side = smoothstep(uTzX.x, uTzX.y, vWX);
  float night = mix(uNightA, uNightB, side);
  float boost = mix(uWinA, uWinB, side) * uTz + night * 0.7;
  float freq = 1.0 + floor(h1(uSeed + 3.3) * 3.0);
  float wv = 0.5 + 0.5 * sin(TAU * (ph * freq + h1(uSeed + 5.1)));
  float on = smoothstep(0.25, 0.6, wv);
  float lit = smoothstep(0.0, 1.0, clamp(uLightAmt + boost, 0.0, 1.0) * (0.3 + 0.85 * on));

  // --- trace into the room
  vec3 V = normalize(uViewDir);
  vec3 rd = vec3(dot(V, vT), dot(V, vB), dot(V, vN));
  rd.z = min(rd.z, -0.08);
  rd = normalize(rd);
  vec3 o = vec3(p, 0.0);
  float D = uDepth;
  float dx = abs(rd.x) < 1e-4 ? 1e-4 : rd.x;
  float dy = abs(rd.y) < 1e-4 ? 1e-4 : rd.y;
  float tx = ((dx > 0.0 ? hx : -hx) - o.x) / dx;
  float ty = ((dy > 0.0 ? 1.0 : -1.0) - o.y) / dy;
  float tz = -D / rd.z;
  float t = min(tx, min(ty, tz));
  vec3 hp = o + rd * t;
  float depth = clamp(-hp.z / D, 0.0, 1.0);

  vec3 wallC = pick5(h1(uSeed + 2.2), vec3(0.95, 0.9, 0.8), vec3(0.78, 0.9, 0.8),
                     vec3(0.96, 0.8, 0.78), vec3(0.96, 0.92, 0.7), vec3(0.76, 0.8, 0.93));
  vec3 floorC = h1(uSeed + 4.4) < 0.5 ? vec3(0.66, 0.46, 0.33) : vec3(0.7, 0.76, 0.72);
  vec3 room;
  if (tz <= tx && tz <= ty) {
    vec2 muv = vec2(hp.x / hx * 0.5 + 0.5, hp.y * 0.5 + 0.5);
    muv = 0.5 + (muv - 0.5) * 0.85 + 0.06 * vec2(sin(TAU * (ph + uSeed)), cos(TAU * (2.0 * ph + uSeed * 3.0)));
    room = mix(memory(i0, muv), memory(i1, muv), f);
  } else if (ty < tx) {
    room = rd.y < 0.0 ? floorC * (0.95 - 0.3 * depth) : vec3(0.97, 0.96, 0.93) * (1.0 - 0.25 * depth);
  } else {
    room = wallC * (1.0 - 0.35 * depth);
  }

  // interior light: a lamp near the ceiling at the back
  vec3 lampPos = vec3(0.0, 0.75, -D * 0.6);
  float glow = exp(-dot(hp - lampPos, hp - lampPos) * 1.4);
  vec3 litRoom = room * mix(vec3(1.0), uLightCol, 0.45) * 1.05 + uLightCol * glow * 0.35;
  vec3 darkRoom = mix(uOff, room * 0.4, 0.35) * (1.0 - 0.7 * night);
  vec3 col = mix(darkRoom, litRoom, lit);

  // curtain, drawn in from the left, gently moving
  if (uCurtain > 0.0) {
    float edge = -hx + 2.0 * hx * 0.45 * uCurtain + 0.04 * sin(p.y * 6.0 + TAU * ph * 3.0);
    if (p.x < edge) {
      vec3 cloth = vec3(0.97, 0.93, 0.85) * (0.86 + 0.14 * sin(p.x * 38.0 + p.y * 2.0));
      cloth = mix(cloth * 0.45 + uOff * 0.3, cloth + uLightCol * 0.15, lit);
      col = mix(col, cloth, 0.88);
    }
  }

  // glass: a soft diagonal reflection, stronger when the room is dark
  float streak = exp(-pow((p.x + p.y * 0.8 - 0.35 * hx) * 3.5, 2.0));
  col += vec3(0.75, 0.82, 1.0) * streak * mix(0.16, 0.05, lit);

  if (uShape > 2.5 && uShape < 3.5) {                // four panes
    if (abs(p.x) < lw * 0.6 || abs(p.y) < lw * 0.6) col = uFrame;
  }
  if (uShape > 3.5 && uShape < 4.5) {                // flat iron grille
    float bars = abs(fract(p.x / 0.32 + 0.5) - 0.5) * 0.32;
    float rails = abs(abs(p.y) - 0.5);
    float diamond = abs(abs(p.x) + abs(p.y) - 0.55);
    if (bars < 0.025 || rails < 0.03 || diamond < 0.03) col = uGrille;
  }
  if (d > -lw) col = uFrame;

  gl_FragColor = vec4(col, 1.0);
}`;

export function windowMaterial({
  shape = 0, aspect = 1, seed = 0, doubleSided = false,
  depth = 1.4, curtain = 0, fixedMem = -1, light = LIGHTS.warm, grille = '#eef0ea',
}) {
  return new THREE.ShaderMaterial({
    uniforms: {
      uAtlas: shared.uAtlas,
      uTime: shared.uTime,
      uLoop: shared.uLoop,
      uLightAmt: shared.uWindowLight,
      uViewDir: shared.uViewDir,
      uFrame: shared.uFrame,
      uTz: shared.uTz, uTzX: shared.uTzX, uWinA: shared.uWinA, uWinB: shared.uWinB,
      uNightA: shared.uNightA, uNightB: shared.uNightB,
      uSeed: { value: seed * 97.13 },
      uShape: { value: shape },
      uAspect: { value: aspect },
      uDepth: { value: depth },
      uCurtain: { value: curtain },
      uFixedMem: { value: fixedMem },
      uLightCol: { value: new THREE.Color(light) },
      uOff: { value: new THREE.Color(C.glassOff) },
      uGrille: { value: new THREE.Color(grille) },
    },
    vertexShader: winVert,
    fragmentShader: winFrag,
    side: doubleSided ? THREE.DoubleSide : THREE.FrontSide,
  });
}

export function addWindow(parent, { x = 0, y = 0, z = 0, ry = 0, w, h, ...opts }) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), windowMaterial({ aspect: w / h, ...opts }));
  m.position.set(x, y, z);
  m.rotation.y = ry;
  m.userData.kind = opts.shape === SHAPE.BARS ? 'bars' : 'window';
  parent.add(m);
  return m;
}

// ---------------------------------------------------------------- light beam

export function beamMaterial(color = '#fff1bd') {
  return new THREE.ShaderMaterial({
    uniforms: { uColor: { value: new THREE.Color(color) }, uStrength: { value: 0.42 } },
    vertexShader: /* glsl */`
      varying vec2 vUv;
      void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: /* glsl */`
      uniform vec3 uColor; uniform float uStrength;
      varying vec2 vUv;
      void main() {
        float a = pow(vUv.y, 2.4) * uStrength;          // bright at the lamp, gone by the end
        a *= 0.75 + 0.25 * sin(vUv.x * 6.28318 * 3.0);   // faint striations
        gl_FragColor = vec4(uColor * a, a);
      }`,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    blending: THREE.CustomBlending,
    blendSrc: THREE.OneFactor,
    blendDst: THREE.OneMinusSrcAlphaFactor,
    blendSrcAlpha: THREE.OneFactor,
    blendDstAlpha: THREE.OneMinusSrcAlphaFactor,
  });
}

// ---------------------------------------------------------------- billboards
//
// Abstract animated screens for New York: soft gradients and slow shapes in
// the exhibition colors, no text. Every motion uses whole-number frequencies
// of the loop, so recordings still loop seamlessly. Brighter at night.

const BOARD_PALETTE = [
  ['#008ed8', '#ff4b3a', '#f3d600'],
  ['#ff0000', '#f6a9b4', '#1c3a9a'],
  ['#58ab29', '#f3d600', '#008ed8'],
  ['#b69ae4', '#ff7b52', '#f7f1e6'],
  ['#1d56d6', '#58ab29', '#f2a7b8'],
  ['#f3d600', '#ff0000', '#1c3a9a'],
  ['#f6b26b', '#c48bb8', '#24357f'],
  ['#86cf9e', '#008ed8', '#ff4b3a'],
];

export function billboardMaterial(seed) {
  const pal = BOARD_PALETTE[Math.floor(seed * 997) % BOARD_PALETTE.length];
  return new THREE.ShaderMaterial({
    uniforms: {
      uTime: shared.uTime, uLoop: shared.uLoop, uLightAmt: shared.uWindowLight, uFrame: shared.uFrame,
      uSeed: { value: seed },
      uA: { value: new THREE.Color(pal[0]) },
      uB: { value: new THREE.Color(pal[1]) },
      uC: { value: new THREE.Color(pal[2]) },
    },
    vertexShader: /* glsl */`
      varying vec2 vUv;
      void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: /* glsl */`
      uniform float uTime, uLoop, uLightAmt, uSeed;
      uniform vec3 uA, uB, uC, uFrame;
      varying vec2 vUv;
      const float TAU = 6.28318530718;
      float h1(float n) { return fract(sin(n * 127.1 + 0.37) * 43758.5453); }
      void main() {
        float ph = uTime / uLoop;
        // five gradient formats, all flowing on whole-number loop frequencies
        float k = 6.0 + floor(h1(uSeed) * 6.0);
        float mode = floor(h1(uSeed + 2.7) * 5.0);
        vec2 p = vUv;
        vec2 d = (p - 0.5) * vec2(1.6, 1.0);
        float g;
        if (mode < 0.5) {                                   // radial ripples from a wandering middle
          vec2 c = 0.18 * vec2(sin(TAU * (ph + h1(uSeed + 3.1))), 0.7 * cos(TAU * (ph * 2.0 + h1(uSeed + 4.2))));
          g = length(d - c * vec2(1.6, 1.0)) * 1.3 - ph * k;
        } else if (mode < 1.5) {                            // diagonal bands sliding across
          float a = TAU * h1(uSeed + 3.1);
          g = dot(d, vec2(cos(a), sin(a))) * 1.1 - ph * k;
        } else if (mode < 2.5) {                            // conic sweep, turning
          g = atan(d.y, d.x) / TAU * 2.0 - ph * floor(k * 0.5);
        } else if (mode < 3.5) {                            // soft mesh gradient: two color blobs drifting
          vec2 b1 = vec2(0.45 * sin(TAU * ph * 2.0), 0.25 * cos(TAU * ph * 3.0));
          vec2 b2 = vec2(0.45 * cos(TAU * (ph * 3.0 + 0.3)), 0.25 * sin(TAU * (ph * 2.0 + 0.6)));
          float w1 = exp(-dot(d - b1, d - b1) * 4.0), w2 = exp(-dot(d - b2, d - b2) * 4.0);
          g = 0.5 * w1 / (w1 + w2 + 0.15) + 0.5;
          g = g - (w2 / (w1 + w2 + 0.15)) * 0.5;
        } else {                                            // square ripples, like a tunnel
          g = max(abs(d.x), abs(d.y)) * 1.4 - ph * k;
        }
        float x = 1.0 - abs(fract(g + h1(uSeed + 1.3)) * 2.0 - 1.0);   // 0..1..0
        if (mode > 2.5 && mode < 3.5) x = clamp(g, 0.0, 1.0);
        vec3 col = mix(uA, uB, smoothstep(0.0, 0.55, x));
        col = mix(col, uC, smoothstep(0.5, 1.0, x));
        if (mode < 0.5 || mode > 3.5) col *= mix(0.5, 1.0, smoothstep(0.0, 0.22, length(d)));   // darker heart
        col *= 0.9 + 0.3 * uLightAmt;
        vec2 e = min(p, 1.0 - p);
        if (min(e.x, e.y) < 0.035) col = uFrame;
        gl_FragColor = vec4(col, 1.0);
      }`,
  });
}

// Rooftop screens (無眠): dreamier, more moving pictures. Clouds drifting
// over a gradient sky, a night of twinkling stars with a moon crossing,
// liquid color blobs, waving aurora curtains, a soft light sweeping across.
const DREAM_PALETTE = [
  ['#1c3a9a', '#f6a9b4', '#f7f1e6'],
  ['#24357f', '#b69ae4', '#f3d600'],
  ['#0b74cf', '#86cf9e', '#f7f1e6'],
  ['#3a3f9e', '#ff8a5a', '#ffcf6b'],
  ['#1d56d6', '#f2a7b8', '#cfe7f5'],
];
export function dreamyBoardMaterial(seed) {
  const pal = DREAM_PALETTE[Math.floor(seed * 991) % DREAM_PALETTE.length];
  return new THREE.ShaderMaterial({
    uniforms: {
      uTime: shared.uTime, uLoop: shared.uLoop, uLightAmt: shared.uWindowLight, uFrame: shared.uFrame,
      uSeed: { value: seed },
      uA: { value: new THREE.Color(pal[0]) }, uB: { value: new THREE.Color(pal[1]) }, uC: { value: new THREE.Color(pal[2]) },
    },
    vertexShader: /* glsl */`
      varying vec2 vUv;
      void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: /* glsl */`
      uniform float uTime, uLoop, uLightAmt, uSeed;
      uniform vec3 uA, uB, uC, uFrame;
      varying vec2 vUv;
      const float TAU = 6.28318530718;
      float h1(float n) { return fract(sin(n * 127.1 + 0.37) * 43758.5453); }
      float h2(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      void main() {
        float ph = uTime / uLoop;
        vec2 p = vUv;
        float mode = floor(h1(uSeed + 5.3) * 5.0);
        vec3 col;
        if (mode < 0.5) {                                   // clouds drifting over a soft sky
          col = mix(uB, uA, smoothstep(0.0, 1.0, p.y));
          float cl = 0.0;
          for (int i = 0; i < 4; i++) {
            float fi = float(i);
            float x = fract(h1(uSeed + fi) + ph * (1.0 + fi)) * 1.6 - 0.3;
            vec2 d = (p - vec2(x, 0.25 + 0.5 * h1(uSeed + fi * 3.0))) * vec2(1.0, 2.2);
            cl = max(cl, exp(-dot(d, d) * 18.0) + 0.6 * exp(-dot(d - vec2(0.08, 0.03), d - vec2(0.08, 0.03)) * 30.0));
          }
          col = mix(col, uC, smoothstep(0.35, 0.8, cl));
        } else if (mode < 1.5) {                            // night: stars and a moon crossing
          col = mix(uA * 0.6, uA, p.y);
          vec2 g = floor(p * vec2(26.0, 14.0));
          float st = step(0.9, h2(g + uSeed)) * (0.5 + 0.5 * sin(TAU * (ph * (6.0 + floor(h2(g) * 6.0)) + h2(g + 3.0))));
          vec2 f = fract(p * vec2(26.0, 14.0)) - 0.5;
          col += uC * st * smoothstep(0.25, 0.0, length(f)) * 0.9;
          vec2 mp = vec2(fract(ph + h1(uSeed)) * 1.4 - 0.2, 0.62 + 0.15 * sin(TAU * ph));
          float md = length((p - mp) * vec2(1.6, 1.0));
          col = mix(col, uC, smoothstep(0.11, 0.1, md));
          col += uC * exp(-md * md * 40.0) * 0.25;
        } else if (mode < 2.5) {                            // liquid color blobs
          float f = 0.0;
          for (int i = 0; i < 3; i++) {
            float fi = float(i);
            vec2 c = vec2(0.5 + 0.35 * sin(TAU * (ph * (1.0 + fi) + h1(uSeed + fi))), 0.5 + 0.3 * cos(TAU * (ph * (2.0 + fi) + h1(uSeed + fi * 2.0))));
            vec2 d = (p - c) * vec2(1.6, 1.0);
            f += 0.03 / (dot(d, d) + 0.01);
          }
          col = mix(uA, uB, smoothstep(0.6, 1.6, f));
          col = mix(col, uC, smoothstep(2.4, 3.6, f));
        } else if (mode < 3.5) {                            // aurora curtains
          col = uA * 0.7;
          for (int i = 0; i < 3; i++) {
            float fi = float(i);
            float y = 0.45 + 0.12 * fi + 0.08 * sin(p.x * 5.0 + TAU * ph * (2.0 + fi) + fi);
            float band = exp(-pow((p.y - y) / (0.05 + 0.03 * sin(p.x * 9.0 + TAU * ph * 3.0)), 2.0));
            col += mix(uB, uC, fi / 2.0) * band * 0.7;
          }
        } else {                                            // a soft light sweeping across
          col = mix(uA, uB, p.x);
          float x = fract(ph * 4.0 + h1(uSeed));
          float bar = exp(-pow((p.x - (x * 1.4 - 0.2)) / 0.12, 2.0));
          col = mix(col, uC, bar * 0.75);
          col += uC * 0.12 * sin(TAU * (p.y * 3.0 - ph * 8.0));
        }
        col *= 0.92 + 0.25 * uLightAmt;
        vec2 e = min(p, 1.0 - p);
        if (min(e.x, e.y) < 0.03) col = uFrame;
        gl_FragColor = vec4(col, 1.0);
      }`,
  });
}
