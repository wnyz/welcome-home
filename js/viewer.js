// Viewer: renders the archipelago full-screen with no interface.
// Listens to control.html over BroadcastChannel and eases toward whatever
// state it receives, so every change arrives as a transition.

import * as THREE from 'three';
import { CHANNEL_NAME, LOOP_SECONDS, WORLD, TIMES, sunHeight, loadState, sanitize } from './config.js';
import { shared, setStrokeMode } from './materials.js';
import { makeMemoryAtlas, loadMemoryImages } from './memories.js';
import { createWorld } from './world.js';
import { createClouds } from './clouds.js';
import { createBirds } from './birds.js';
import { createCameraRig } from './camera.js';
import { createFreecam } from './freecam.js'; // TEMP free camera
import { presetById, TOUR, TOUR_SECONDS } from './presets.js';

THREE.ColorManagement.enabled = false; // treat every hex color as-is, like ink on paper
const TAU = Math.PI * 2;

// ?w=1920&h=1080 renders at an exact pixel size (letterboxed to fit the window)
const params = new URLSearchParams(location.search);
const fixedW = parseInt(params.get('w'), 10) || 0;
const fixedH = parseInt(params.get('h'), 10) || 0;
const fixed = fixedW > 0 && fixedH > 0;

// ------------------------------------------------------------- renderer

const stage = document.getElementById('stage');
const renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'high-performance' });
renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
stage.appendChild(renderer.domElement);

const scene = new THREE.Scene();
const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 600);
const rt = new THREE.WebGLRenderTarget(4, 4, { samples: 4 });

shared.uAtlas.value = makeMemoryAtlas();
loadMemoryImages(shared.uAtlas.value);
const world = createWorld();
scene.add(world.group);
const clouds = createClouds();
scene.add(clouds.group);
const birds = createBirds();
scene.add(birds.group);
const rig = createCameraRig(camera, world.anchors);
const freecam = createFreecam(renderer.domElement, camera, () => rig.pose.target); // TEMP free camera

// ------------------------------------------------------------- post pass
// Background gradient, local-time glows, halftone, compositing, the airplane
// window and paper grain all happen here — so a
// recording of the canvas gets exactly what is on screen.

const post = new THREE.ShaderMaterial({
  uniforms: {
    tScene: { value: rt.texture },
    uRes: { value: new THREE.Vector2(1, 1) },
    uPx: { value: 1 },
    uTop: { value: new THREE.Color() },
    uMid: { value: new THREE.Color() },
    uBot: { value: new THREE.Color() },
    uTime: shared.uTime,
    uLoop: shared.uLoop,
    uGrain: { value: 0.6 },
    uHalftone: { value: 0.35 },
    uFrame: { value: 0 },
    uTz: shared.uTz,
    uGlowA: { value: new THREE.Vector2(0.3, 0.5) },
    uGlowB: { value: new THREE.Vector2(0.7, 0.5) },
    uGlowR: { value: 0.4 },
    uGlowColA: { value: new THREE.Color() },
    uGlowColB: { value: new THREE.Color() },
    uWashA: { value: new THREE.Color() },
    uWashB: { value: new THREE.Color() },
    uAir: { value: 0 },
    uNightA: shared.uNightA,
    uNightB: shared.uNightB,
    uWashK: { value: new THREE.Vector2() },     // how much each side's hour colors the sky
    uSplit: { value: 0 },                       // 0 blended, 1 hard split down the middle
    uLeftA: { value: 1 },                       // 1 when New York is on the left of the screen
    uSunUvA: { value: new THREE.Vector2() }, uSunUvB: { value: new THREE.Vector2() },
    uMoonUvA: { value: new THREE.Vector2() }, uMoonUvB: { value: new THREE.Vector2() },
    uSunAmt: { value: new THREE.Vector2() },    // x = New York, y = Taiwan
    uMoonAmt: { value: new THREE.Vector2() },
    uSunRA: { value: 0.05 },
  },
  vertexShader: /* glsl */`
    varying vec2 vUv;
    void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`,
  fragmentShader: /* glsl */`
    uniform sampler2D tScene;
    uniform vec2 uRes;
    uniform float uPx;
    uniform vec3 uTop, uMid, uBot;
    uniform float uTime, uLoop, uGrain, uFrame, uHalftone;
    uniform float uTz, uGlowR, uAir, uNightA, uNightB, uSplit, uLeftA, uSunRA;
    uniform vec2 uWashK, uSunUvA, uSunUvB, uMoonUvA, uMoonUvB, uSunAmt, uMoonAmt;
    uniform vec2 uGlowA, uGlowB;
    uniform vec3 uGlowColA, uGlowColB, uWashA, uWashB;
    varying vec2 vUv;
    const float TAU = 6.28318530718;

    float hash(vec2 p) {
      vec3 p3 = fract(vec3(p.xyx) * 0.1031);
      p3 += dot(p3, p3.yzx + 33.33);
      return fract((p3.x + p3.y) * p3.z);
    }

    vec3 hueShift(vec3 c, float a) {
      const mat3 toYIQ = mat3(0.299, 0.596, 0.211, 0.587, -0.274, -0.523, 0.114, -0.322, 0.312);
      const mat3 toRGB = mat3(1.0, 1.0, 1.0, 0.956, -0.272, -1.106, 0.621, -0.647, 1.703);
      vec3 yiq = toYIQ * c;
      float ca = cos(a), sa = sin(a);
      yiq.yz = mat2(ca, sa, -sa, ca) * yiq.yz;
      return toRGB * yiq;
    }

    vec3 sun(vec3 col, vec2 uv, vec2 asp, vec2 at, float amt, float R) {
      if (amt < 0.001) return col;
      float ds = length((uv - at) * asp);
      float glow = exp(-ds * ds / (R * R * 7.0));
      col = mix(col, col + vec3(1.0, 0.55, 0.3) * 0.45, glow * amt * 0.7);
      float disc = 1.0 - smoothstep(R - 0.003, R + 0.002, ds);
      vec3 sunCol = mix(vec3(1.0, 0.86, 0.5), vec3(1.0, 0.36, 0.2), smoothstep(-R, R, at.y - uv.y));
      return mix(col, sunCol, disc * amt);
    }
    vec3 moon(vec3 col, vec2 uv, vec2 asp, vec2 at, float amt) {
      if (amt < 0.001) return col;
      float mr = 0.04;
      vec2 dm = (uv - at) * asp;
      float dl = length(dm);
      col = mix(col, col + vec3(0.6, 0.7, 1.0) * 0.18, exp(-dl * dl / (mr * mr * 9.0)) * amt);
      float disc = 1.0 - smoothstep(mr - 0.003, mr + 0.002, dl);
      float lit = smoothstep(mr * 0.92 - 0.003, mr * 0.92 + 0.002, length(dm - vec2(0.42, 0.14) * mr));
      col = mix(col, col * 0.85 + vec3(0.04, 0.05, 0.1), disc * 0.4 * amt);
      return mix(col, vec3(0.98, 0.96, 0.86), disc * lit * amt);
    }

    vec3 sky(vec2 uv) {
      float ph = TAU * uTime / uLoop;
      vec2 asp = vec2(uRes.x / uRes.y, 1.0);
      vec2 c = (uv - 0.5) * asp;
      float ang = 0.32 + 0.10 * sin(ph);
      float t = 0.5 - dot(c, vec2(sin(ang), cos(ang))) * 0.95;
      t += 0.035 * sin(ph * 2.0 + c.x * 2.5);
      float m = 0.5 + 0.07 * sin(ph + 1.3);
      vec3 col = t < m
        ? mix(uTop, uMid, smoothstep(0.0, m, t))
        : mix(uMid, uBot, smoothstep(m, 1.0, t));
      vec2 gp = vec2(0.45 * sin(ph), -0.1 + 0.12 * cos(ph * 2.0));
      float gl = exp(-dot(c - gp, c - gp) * 4.0);
      col = mix(col, mix(uMid, vec3(1.0, 0.84, 0.86), 0.4), gl * 0.16);
      col = hueShift(col, 0.09 * sin(ph + 0.7));

      // which island's sky we are in: a soft blend between the two islands,
      // or (split) a hard edge down the middle of the screen
      float span = uGlowB.x - uGlowA.x;
      float wx = abs(span) < 0.01 ? 0.5 : clamp((uv.x - uGlowA.x) / span, 0.0, 1.0);
      wx = wx * wx * (3.0 - 2.0 * wx);
      float halfSide = uLeftA > 0.5 ? step(0.5, uv.x) : 1.0 - step(0.5, uv.x);
      wx = mix(wx, halfSide, uSplit);

      // each side's hour colors its sky, plus a low glow under each island
      float wk = mix(uWashK.x, uWashK.y, wx);
      vec3 wash = mix(uWashA, uWashB, wx);
      col = mix(col, col * 0.6 + wash * 0.45, wk * 0.45);
      vec2 da = (uv - uGlowA) * asp, db = (uv - uGlowB) * asp;
      float r2 = uGlowR * uGlowR;
      col = mix(col, uGlowColA, exp(-dot(da, da) / r2) * uWashK.x * 0.6 * (1.0 - uSplit * 0.5));
      col = mix(col, uGlowColB, exp(-dot(db, db) / r2) * uWashK.y * 0.6 * (1.0 - uSplit * 0.5));

      // night: deep blue, with a few stars
      float nS = mix(uNightA, uNightB, wx);
      if (nS > 0.001) {
        vec3 nightCol = mix(vec3(0.10, 0.14, 0.36), vec3(0.03, 0.05, 0.17), smoothstep(0.1, 1.0, uv.y));
        col = mix(col, nightCol + col * 0.06, nS * 0.92);
        vec2 sc = floor(gl_FragCoord.xy / (3.0 * uPx));
        float hs = hash(sc);
        float tw = 0.55 + 0.45 * sin(TAU * (uTime / uLoop * (1.0 + floor(hash(sc + 3.0) * 3.0)) + hash(sc + 9.0)));
        col += vec3(0.95, 0.93, 0.85) * step(0.9975, hs) * tw * nS * smoothstep(0.25, 0.7, uv.y);
      }

      // a sun or a moon over each island, by its hour
      col = sun(col, uv, asp, uSunUvA, uSunAmt.x, uSunRA);
      col = sun(col, uv, asp, uSunUvB, uSunAmt.y, 0.05);
      col = moon(col, uv, asp, uMoonUvA, uMoonAmt.x);
      col = moon(col, uv, asp, uMoonUvB, uMoonAmt.y);

      // the split line
      col = mix(col, vec3(0.97, 0.95, 0.9), uSplit * (1.0 - smoothstep(0.0012, 0.0028, abs(uv.x - 0.5) * asp.x)));

      if (uHalftone > 0.001) {
        float cellPx = max(4.0, 9.0 * uRes.y / 1080.0);
        vec2 cellId = floor(gl_FragCoord.xy / cellPx);
        vec2 local = fract(gl_FragCoord.xy / cellPx) - 0.5;
        vec2 cc = ((cellId + 0.5) * cellPx / uRes - 0.5) * asp;
        float field = smoothstep(0.15, 0.55, -cc.y + 0.12 * sin(ph + cc.x * 3.0))
                    + 0.35 * smoothstep(0.5, 0.0, length(cc - vec2(0.55 * cos(ph), 0.3)));
        field = clamp(field, 0.0, 1.0) * uHalftone;
        float dotR = 0.5 * sqrt(field) * 1.15;
        float dotMask = 1.0 - smoothstep(dotR - 0.08, dotR + 0.02, length(local));
        vec3 ink = mix(uTop, vec3(0.97, 0.95, 0.91), 0.15);
        col = mix(col, ink, dotMask * smoothstep(0.0, 0.15, field) * 0.85);
      }
      return col;
    }

    // a soft cloud puff (three overlapping blobs) for the airplane windows
    float puff(vec2 p, float r) {
      float a = exp(-dot(p, p) / (r * r));
      a = max(a, exp(-dot(p - vec2(0.9 * r, 0.25 * r), p - vec2(0.9 * r, 0.25 * r)) / (r * r * 0.6)));
      a = max(a, exp(-dot(p + vec2(0.85 * r, -0.15 * r), p + vec2(0.85 * r, -0.15 * r)) / (r * r * 0.5)));
      return smoothstep(0.35, 0.75, a);
    }

    // looking out of an airliner: a row of five rounded windows in the cabin
    // wall, shades up, with clouds drifting past outside
    vec3 airplaneWindow(vec3 col, vec2 uv) {
      vec2 asp = vec2(uRes.x / uRes.y, 1.0);
      vec2 c = (uv - 0.5) * asp;
      float e = uAir * uAir * (3.0 - 2.0 * uAir);
      float s = mix(3.2, 1.0, e);
      vec2 hs = vec2(0.11, 0.16) * s;
      float rad = 0.085 * s;
      float gap = 0.33 * s;
      // nearest of the five windows
      float k = clamp(floor(c.x / gap + 0.5), -2.0, 2.0);
      vec2 lc = c - vec2(k * gap, 0.02 * s);
      vec2 q = abs(lc) - hs + rad;
      float sd = length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - rad;
      if (sd > 0.0) {
        // cabin wall: molded plastic, a bevel into each window, a second surround
        float bevel = smoothstep(0.0, 0.05 * s, sd);
        vec3 wall = mix(vec3(0.74, 0.73, 0.72), vec3(0.93, 0.91, 0.88), bevel);
        float ring = smoothstep(0.06 * s, 0.075 * s, sd) - smoothstep(0.075 * s, 0.09 * s, sd);
        wall = mix(wall, wall * 0.9, ring);
        // the raised shade, tucked into the top of the surround
        if (lc.y > hs.y && abs(lc.x) < hs.x - 0.01 * s && sd < 0.05 * s) wall = mix(wall, vec3(0.88, 0.86, 0.83), 0.8);
        wall *= 1.0 - 0.18 * smoothstep(0.35, 1.0, length(c));
        return wall;
      }
      // outside: the world, then clouds sliding past (whole laps per loop)
      vec3 g = col * vec3(0.93, 0.97, 1.03) + 0.025;
      float ph = uTime / uLoop;
      float cl = 0.0;
      for (int i = 0; i < 7; i++) {
        float fi = float(i);
        float speed = 2.0 + floor(hash(vec2(fi, 1.0)) * 3.0);
        float x = fract(hash(vec2(fi, 2.0)) - ph * speed) * 2.6 - 1.3;
        float y = (hash(vec2(fi, 3.0)) - 0.5) * 0.5 * s;
        float r = (0.05 + 0.06 * hash(vec2(fi, 4.0))) * s;
        cl = max(cl, puff(c - vec2(x * s, y), r) * (0.55 + 0.4 * hash(vec2(fi, 5.0))));
      }
      g = mix(g, vec3(0.97, 0.97, 1.0), cl * 0.9);
      g += vec3(0.1) * exp(-pow((lc.x * 0.9 + lc.y * 0.5 - 0.04 * s) / (0.025 * s), 2.0));
      g *= 1.0 - 0.3 * smoothstep(-0.04 * s, 0.0, sd);
      return g;
    }

    void main() {
      vec2 uv = vUv;
      vec2 fc = floor(gl_FragCoord.xy / uPx);

      vec4 s = texture2D(tScene, uv);

      vec3 col = sky(uv) * (1.0 - s.a) + s.rgb;   // scene is premultiplied
      if (uAir > 0.001) col = airplaneWindow(col, vUv);

      float n1 = hash(fc) - 0.5;
      float n2 = hash(floor(fc / 2.0) + 17.0) - 0.5;
      float n3 = hash(fc + floor(uFrame / 4.0) * 13.1) - 0.5;
      vec3 chroma = vec3(hash(fc + 3.1), hash(fc + 7.7), hash(fc + 11.3)) - 0.5;
      col += (n1 * 0.05 + n2 * 0.05 + n3 * 0.025) * uGrain + chroma * 0.025 * uGrain;
      float speck = step(0.988, hash(fc * 1.37 + 3.0));
      col = mix(col, col * 0.85, speck * uGrain * 0.6);

      vec2 vc = vUv - 0.5;
      col *= 1.0 - dot(vc, vc) * 0.16;
      gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
    }`,
  depthTest: false,
  depthWrite: false,
});
const postScene = new THREE.Scene();
postScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), post));
const postCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

// ------------------------------------------------------------- sizing

let aspect = 16 / 9;
let halfH0 = 13;
function resize() {
  const vw = window.innerWidth, vh = window.innerHeight;
  let w, h, pr;
  if (fixed) {
    w = fixedW; h = fixedH; pr = 1;
    const scale = Math.min(vw / w, vh / h);
    renderer.setPixelRatio(1);
    renderer.setSize(w, h, false);
    Object.assign(renderer.domElement.style, { width: `${w * scale}px`, height: `${h * scale}px` });
  } else {
    w = vw; h = vh; pr = Math.min(window.devicePixelRatio || 1, 2);
    renderer.setPixelRatio(pr);
    renderer.setSize(w, h);
  }
  aspect = w / h;
  // framing is designed for 16:9; narrower screens widen the view instead of cropping
  halfH0 = Math.max(13, 23.1 / aspect);
  camera.left = -halfH0 * aspect; camera.right = halfH0 * aspect;
  camera.top = halfH0; camera.bottom = -halfH0;
  camera.updateProjectionMatrix();
  rt.setSize(Math.round(w * pr), Math.round(h * pr));
  post.uniforms.uRes.value.set(w * pr, h * pr);
  post.uniforms.uPx.value = pr;
}
window.addEventListener('resize', resize);
resize();

// ------------------------------------------------------------- state

let target = loadState();
// ?preset=taiwan starts on a camera preset (handy for recording / checking views)
if (params.get('preset')) {
  const p = presetById(params.get('preset'));
  target = { ...target, cameraPreset: p.id, zoom: p.zoom, cameraAngle: p.elevation, cameraOrbit: 0, tour: false };
}
const EASED = [
  'rotationSpeed', 'floatIntensity', 'birdSpeed', 'zoom', 'cameraAngle', 'cameraOrbit',
  'cameraPanX', 'cameraPanY', 'cameraPanZ',
  'windowLight', 'clouds', 'cloudDensity', 'cloudOpacity', 'cloudDrift', 'cloudSoftness',
  'halftone', 'grain', 'timezone', 'darkness', 'split',
];
const cur = {};
for (const k of EASED) cur[k] = target[k];
const COLORS = ['bgTop', 'bgMid', 'bgBottom'];
for (const k of COLORS) cur[k] = new THREE.Color(target[k]);

// local time: Taiwan's clock is the slider, New York runs 12 hours apart.
// Each island's light is mixed from the day / golden-hour / night palettes.
const tzKeys = ['tint', 'shadow', 'glow', 'wash', 'cloud'];
const PAL = {};
for (const [name, p] of Object.entries(TIMES)) {
  PAL[name] = { window: p.window, washK: p.washK };
  for (const k of tzKeys) PAL[name][k] = new THREE.Color(p[k]);
}
const tzCur = { A: {}, B: {} };
for (const side of ['A', 'B']) for (const k of tzKeys) tzCur[side][k] = new THREE.Color();
const fall = (a, b, x) => { const u = Math.min(1, Math.max(0, (x - a) / (b - a))); return u * u * (3 - 2 * u); };
const lightAt = (h) => {
  const e = sunHeight(h);
  return { e, night: fall(0.02, -0.5, e), golden: Math.exp(-Math.pow(e / 0.25, 2)) };
};
function paint(L, out) {
  for (const k of tzKeys) out[k].copy(PAL.day[k]).lerp(PAL.golden[k], L.golden).lerp(PAL.night[k], L.night);
  const mix3 = (key) => THREE.MathUtils.lerp(THREE.MathUtils.lerp(PAL.day[key], PAL.golden[key], L.golden), PAL.night[key], L.night);
  out.window = mix3('window');
  out.washK = mix3('washK');
}
let hour = target.twHour;   // eased around the clock
let LA = lightAt(hour + 12), LB = lightAt(hour);
let henge = 0;        // eased: how much the sun is pinned for Manhattanhenge
const posA = new THREE.Vector2(), posB = new THREE.Vector2(), pinSun = new THREE.Vector2(0.5, 0.6);
let pinR = 0.075;

const tmpColor = new THREE.Color();
let t = 0;            // seconds of auto-animation elapsed
let angle = 0;        // island rotation (accumulated so speed changes never jump)
let birdPhase = 0;
let cloudPhase = 0;
let air = 0;
let lastCue = target.cameraCue;
let easeBoostUntil = 0, easeRate = 2.4;
let strokeMode = null;
let tourIndex = -1;

world.setLayout(target.layoutSeed, performance.now() / 1000, true);
rig.jump(target.cameraPreset);
const startPreset = presetById(target.cameraPreset);
cur.zoom = target.zoom; cur.cameraAngle = target.cameraAngle;
void startPreset;

function applyState(s, ease) {
  const prev = target;
  target = sanitize(s);
  const nowSec = performance.now() / 1000;
  world.setLayout(target.layoutSeed, nowSec);
  if (target.cameraCue !== lastCue || target.cameraPreset !== prev.cameraPreset) {
    lastCue = target.cameraCue;
    const p = presetById(target.cameraPreset);
    if (!target.tour) {
      rig.go(target.cameraPreset, target.transition * (p.durationScale || 1), nowSec);
      // the rig interpolates zoom/angle itself during a transition
      cur.zoom = target.zoom; cur.cameraAngle = target.cameraAngle; cur.cameraOrbit = target.cameraOrbit;
      cur.cameraPanX = target.cameraPanX; cur.cameraPanY = target.cameraPanY; cur.cameraPanZ = target.cameraPanZ;
      freecam.reset();   // a new cue starts clean, so saved song views land exactly
    }
  }
  if (ease) {
    // atmosphere/float changes from a scene follow the camera's pace
    easeRate = Math.min(2.4, 3 / Math.max(0.5, target.transition));
    easeBoostUntil = nowSec + target.transition;
  }
  if (prev.tour && !target.tour) {
    rig.go(target.cameraPreset, target.transition, nowSec);
    tourIndex = -1;
  }
}

// ------------------------------------------------------------- sync

const channel = 'BroadcastChannel' in window ? new BroadcastChannel(CHANNEL_NAME) : null;
let fps = 60;
if (channel) {
  channel.onmessage = (e) => {
    const m = e.data || {};
    if (m.type === 'state') applyState(m.state, !!m.ease);
    else if (m.type === 'restart') { t = 0; angle = 0; birdPhase = 0; cloudPhase = 0; }
    else if (m.type === 'captureView') channel.postMessage({ type: 'view', song: m.song, view: captureView() });
    else if (m.type === 'hello' && m.from === 'control') sendStatus();
  };
  channel.postMessage({ type: 'hello', from: 'viewer' });
}
// The camera exactly as it is now (preset + sliders + mouse orbit/zoom/pan),
// folded into the state so the view holds when the mouse offsets are cleared.
function captureView() {
  const f = freecam.get();
  const panL = f.pan.applyQuaternion(rig.frameQuat.clone().invert());
  const r1 = (v, n = 100) => Math.round(v * n) / n;
  const view = {
    camera: rig.preset.id,
    zoom: r1(cur.zoom * f.zoom, 1000),
    angle: r1(Math.min(85, Math.max(-20, cur.cameraAngle + THREE.MathUtils.radToDeg(f.el))), 10),
    orbit: r1(((cur.cameraOrbit + THREE.MathUtils.radToDeg(f.az) + 540) % 360) - 180, 10),
    pan: [r1(cur.cameraPanX + panL.x), r1(cur.cameraPanY + panL.y), r1(cur.cameraPanZ + panL.z)],
  };
  Object.assign(target, { zoom: view.zoom, cameraAngle: view.angle, cameraOrbit: view.orbit,
    cameraPanX: view.pan[0], cameraPanY: view.pan[1], cameraPanZ: view.pan[2] });
  for (const k of ['zoom', 'cameraAngle', 'cameraOrbit', 'cameraPanX', 'cameraPanY', 'cameraPanZ']) cur[k] = target[k];
  freecam.reset();
  return view;
}

function sendStatus() {
  channel?.postMessage({
    type: 'status', t: t % LOOP_SECONDS, fps: Math.round(fps), auto: target.autoAnimate,
    preset: rig.preset.id, moving: rig.transitioning,
  });
}
setInterval(sendStatus, 500);

window.addEventListener('keydown', (e) => {
  if (e.key === 'f') {
    if (document.fullscreenElement) document.exitFullscreen();
    else document.documentElement.requestFullscreen?.();
  }
  if (e.key === 'r') { t = 0; angle = 0; birdPhase = 0; cloudPhase = 0; }
});

// ------------------------------------------------------------- loop

const proj = new THREE.Vector3();
function toUv(v, out) {
  proj.copy(v).project(camera);
  return out.set(proj.x * 0.5 + 0.5, proj.y * 0.5 + 0.5);
}
const nyCenter = new THREE.Vector3(), twCenter = new THREE.Vector3();
const camPan = new THREE.Vector3();
const viewDir = new THREE.Vector3();

let last = performance.now();
let frame = 0;
function tick(now) {
  const nowSec = now / 1000;
  const dt = Math.max(0, Math.min(0.05, (now - last) / 1000));   // the first frame can arrive "before" start
  last = now;
  fps += ((dt > 0 ? 1 / dt : 60) - fps) * 0.05;
  frame++;

  // ease every continuous parameter toward its target
  const rate = nowSec < easeBoostUntil ? easeRate : 2.4;
  const k = 1 - Math.exp(-dt * rate);
  const kCam = 1 - Math.exp(-dt * 2.4);
  for (const key of EASED) {
    const kk = (key === 'zoom' || key.startsWith('camera')) ? kCam : k;
    if (key === 'zoom') cur.zoom = Math.exp(Math.log(cur.zoom) + (Math.log(target.zoom) - Math.log(cur.zoom)) * kk);
    else cur[key] += (target[key] - cur[key]) * kk;
    // land exactly on the target, so e.g. scattered objects return precisely home
    if (Math.abs(target[key] - cur[key]) < 1e-4) cur[key] = target[key];
  }
  for (const key of COLORS) cur[key].lerp(tmpColor.set(target[key]), k);
  // the clock: ease the shorter way round (23:00 -> 00:00 moves forward)
  hour += ((((target.twHour - hour) % 24) + 36) % 24 - 12) * k;
  hour = ((hour % 24) + 24) % 24;
  LB = lightAt(hour);                                   // Taiwan
  LA = lightAt(hour + 12);                              // New York, always 12 h apart
  paint(LA, tzCur.A);
  paint(LB, tzCur.B);
  shared.uNightA.value = LA.night * cur.darkness;
  shared.uNightB.value = LB.night * cur.darkness;

  if (strokeMode !== target.stroke) { strokeMode = target.stroke; setStrokeMode(strokeMode); }

  if (target.autoAnimate) {
    t += dt;
    angle += cur.rotationSpeed * TAU / LOOP_SECONDS * dt;
    birdPhase += cur.birdSpeed * dt / LOOP_SECONDS;
    cloudPhase += cur.cloudDrift * dt / LOOP_SECONDS;
  }
  const loopT = t % LOOP_SECONDS;
  const ph = loopT / LOOP_SECONDS;

  // ---- autonomous camera tour (deterministic, from the animation clock)
  let elevation = cur.cameraAngle, zoom = cur.zoom, orbit = cur.cameraOrbit;
  if (target.tour) {
    const idx = Math.floor(t / TOUR_SECONDS) % TOUR.length;
    if (idx !== tourIndex) {
      tourIndex = idx;
      const p = presetById(TOUR[idx]);
      rig.go(p.id, target.transition * (p.durationScale || 1), nowSec);
    }
    elevation = rig.preset.elevation; zoom = rig.preset.zoom; orbit = 0;
  }
  const pan = target.tour ? null : camPan.set(cur.cameraPanX, cur.cameraPanY, cur.cameraPanZ);

  // ---- shared uniforms
  shared.uTime.value = loopT;
  shared.uWindowLight.value = cur.windowLight;
  shared.uTz.value = 1;     // the hour's tint always applies (day tint is white)
  shared.uTintA.value.copy(tzCur.A.tint); shared.uTintB.value.copy(tzCur.B.tint);
  shared.uShadowA.value.copy(tzCur.A.shadow); shared.uShadowB.value.copy(tzCur.B.shadow);
  shared.uWinA.value = tzCur.A.window; shared.uWinB.value = tzCur.B.window;

  // ---- world
  world.update({
    loopT, nowSec, dt, angle,
    floatI: cur.floatIntensity, houseCount: target.houseCount,
    showMain: target.showMain, showSatellites: target.showSatellites,
    airplaneVisible: target.airplane && air < 0.5,
  });
  world.islands[0].root.getWorldPosition(nyCenter);
  world.islands[1].root.getWorldPosition(twCenter);
  birds.update({
    phase: birdPhase, ph, dt, count: target.birdCount, visible: target.birdsVisible,
    A: nyCenter, B: twCenter,
  });

  // ---- camera
  rig.update(nowSec, elevation, zoom, orbit, pan);
  freecam.apply(); // TEMP free camera
  camera.updateMatrixWorld();
  camera.getWorldDirection(viewDir);
  shared.uViewDir.value.copy(viewDir);

  const airTarget = rig.preset.overlay === 'airplane' ? 1 : 0;
  air += (airTarget - air) * (1 - Math.exp(-dt * 1.3));
  if (Math.abs(airTarget - air) < 0.001) air = airTarget;

  clouds.update({
    phase: cloudPhase, ph, camera, camTarget: rig.pose.target,
    amount: cur.clouds, density: cur.cloudDensity, opacity: cur.cloudOpacity, softness: cur.cloudSoftness,
    tz: 1, cloudA: tzCur.A.cloud, cloudB: tzCur.B.cloud,
    nightA: shared.uNightA.value, nightB: shared.uNightB.value,
  });

  // sun + moon: over each island by its hour (clamped to its side of the
  // frame), unless a preset pins the sun, as Manhattanhenge does
  const pin = rig.preset.sun;
  henge += ((pin ? 1 : 0) - henge) * (1 - Math.exp(-dt * 1.3));
  if (pin) { pinSun.fromArray(pin.at); pinR = pin.r; }
  toUv(proj.copy(nyCenter).add(new THREE.Vector3(0, 6, 0)), posA);
  toUv(proj.copy(twCenter).add(new THREE.Vector3(0, 6, 0)), posB);
  const leftA = posA.x <= posB.x;
  const sp = cur.split;
  const clampX = (x, isLeft) => Math.min(THREE.MathUtils.lerp(0.9, isLeft ? 0.42 : 0.9, sp), Math.max(THREE.MathUtils.lerp(0.1, isLeft ? 0.1 : 0.58, sp), x));
  const sunUv = (L, pos, isLeft, out) => out.set(clampX(pos.x, isLeft), 0.6 + 0.25 * Math.min(1, Math.max(0, L.e)));
  const moonUv = (pos, isLeft, out) => out.set(clampX(pos.x, isLeft), 0.79);
  const sunAmt = (L) => fall(-0.15, 0.05, L.e);
  const U = post.uniforms;
  sunUv(LA, posA, leftA, U.uSunUvA.value).lerp(pinSun, henge);
  sunUv(LB, posB, !leftA, U.uSunUvB.value);
  moonUv(posA, leftA, U.uMoonUvA.value);
  moonUv(posB, !leftA, U.uMoonUvB.value);
  U.uSunRA.value = THREE.MathUtils.lerp(0.05, pinR, henge);
  U.uSunAmt.value.set(Math.max(sunAmt(LA), henge), sunAmt(LB)).multiplyScalar(1 - air);
  U.uMoonAmt.value.set(LA.night * (1 - henge), LB.night).multiplyScalar(1 - air);
  U.uWashK.value.set(tzCur.A.washK, tzCur.B.washK);
  U.uSplit.value = sp;
  U.uLeftA.value = leftA ? 1 : 0;

  // ---- post uniforms
  post.uniforms.uTop.value.copy(cur.bgTop);
  post.uniforms.uMid.value.copy(cur.bgMid);
  post.uniforms.uBot.value.copy(cur.bgBottom);
  post.uniforms.uGrain.value = cur.grain;
  post.uniforms.uHalftone.value = cur.halftone;
  post.uniforms.uFrame.value = frame;
  post.uniforms.uAir.value = air;
  toUv(proj.copy(nyCenter).add(new THREE.Vector3(0, -3, 0)), post.uniforms.uGlowA.value);
  toUv(proj.copy(twCenter).add(new THREE.Vector3(0, -3, 0)), post.uniforms.uGlowB.value);
  post.uniforms.uGlowR.value = Math.min(1.4, Math.max(0.08, 15 * camera.zoom / (2 * halfH0)));
  post.uniforms.uGlowColA.value.copy(tzCur.A.glow);
  post.uniforms.uGlowColB.value.copy(tzCur.B.glow);
  post.uniforms.uWashA.value.copy(tzCur.A.wash);
  post.uniforms.uWashB.value.copy(tzCur.B.wash);

  renderer.setRenderTarget(rt);
  renderer.setClearColor(0x000000, 0);
  renderer.clear();
  renderer.render(scene, camera);
  renderer.setRenderTarget(null);
  renderer.render(postScene, postCam);

  requestAnimationFrame(tick);
}
requestAnimationFrame(tick);

// debug / automation hook: window.__island.jump('window')
window.__island = {
  jump: (id) => rig.jump(id),
  get preset() { return rig.preset.id; },
  scatter: () => ({ ...world.scatterInfo(), floatIntensity: cur.floatIntensity }),
};
