// Atmospheric clouds.
//
// Each cloud is a camera-facing plane whose shape comes from a procedurally
// generated noise field (fractal value noise × a soft elliptical falloff).
// The shader turns that field into a mask with adjustable density and
// softness, so clouds can be anything from a faint haze to a soft, defined
// form — never blocky. Three depth layers (far behind, between the islands,
// in front) get fake parallax when the camera pans, and each cloud is tinted
// by the local time of the island it drifts near.

import * as THREE from 'three';
import { LOOP_SECONDS, MAX_CLOUDS, WORLD, rand, mulberry32 } from './config.js';

const TAU = Math.PI * 2;
const SPAN = 140;               // clouds wrap across this width of the world

// ---------------------------------------------------------------- noise field

function valueNoise(seed) {
  const r = mulberry32(seed);
  const N = 64;
  const grid = new Float32Array(N * N).map(() => r());
  const at = (x, y) => grid[((y % N + N) % N) * N + ((x % N + N) % N)];
  const sm = (t) => t * t * (3 - 2 * t);
  return (x, y) => {
    const xi = Math.floor(x), yi = Math.floor(y);
    const xf = sm(x - xi), yf = sm(y - yi);
    const a = at(xi, yi), b = at(xi + 1, yi), c = at(xi, yi + 1), d = at(xi + 1, yi + 1);
    return a + (b - a) * xf + (c - a) * yf + (a - b - c + d) * xf * yf;
  };
}

function cloudField(seed, W = 256, H = 128) {
  const n = valueNoise(seed);
  const r = mulberry32(seed * 7 + 1);
  const ox = r() * 50, oy = r() * 50;
  // a few lumps along the top edge give each cloud its own silhouette
  const lumps = Array.from({ length: 3 + Math.floor(r() * 3) }, () => ({
    x: 0.2 + r() * 0.6, y: 0.38 + r() * 0.12, rx: 0.12 + r() * 0.16, ry: 0.14 + r() * 0.12,
  }));
  const data = new Uint8Array(W * H * 4);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const u = x / W, v = y / H;               // v = 0 is the top of the texture
      // base: flattened ellipse, softer at the top than the bottom
      const dx = (u - 0.5) / 0.46, dy = (v - 0.58) / (v < 0.58 ? 0.36 : 0.22);
      let shape = Math.max(0, 1 - (dx * dx + dy * dy));
      for (const l of lumps) {
        const lx = (u - l.x) / l.rx, ly = (v - l.y) / l.ry;
        shape = Math.max(shape, Math.max(0, 1 - (lx * lx + ly * ly)) * 0.9);
      }
      let f = 0, amp = 0.5, fr = 3;
      for (let o = 0; o < 5; o++) { f += amp * n(ox + u * fr * 2, oy + v * fr); amp *= 0.5; fr *= 2.1; }
      const val = Math.max(0, Math.min(1, shape * (0.55 + f * 0.9)));
      const i = ((H - 1 - y) * W + x) * 4;   // row 0 of a DataTexture is the bottom
      data[i] = data[i + 1] = data[i + 2] = Math.round(val * 255);
      data[i + 3] = 255;
    }
  }
  const tex = new THREE.DataTexture(data, W, H);
  tex.colorSpace = THREE.NoColorSpace;
  tex.magFilter = THREE.LinearFilter;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.generateMipmaps = true;
  tex.needsUpdate = true;
  return tex;
}

// ---------------------------------------------------------------- material

function cloudMaterial(map) {
  return new THREE.ShaderMaterial({
    uniforms: {
      map: { value: map },
      uDensity: { value: 0.5 },
      uSoft: { value: 0.6 },
      uOpacity: { value: 0 },
      uColor: { value: new THREE.Color(1, 1, 1) },
      uShade: { value: new THREE.Color('#a9b9e6') },
    },
    vertexShader: /* glsl */`
      varying vec2 vUv;
      void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: /* glsl */`
      uniform sampler2D map;
      uniform float uDensity, uSoft, uOpacity;
      uniform vec3 uColor, uShade;
      varying vec2 vUv;
      void main() {
        float v = texture2D(map, vUv).r;
        float th = mix(0.62, 0.28, uDensity);
        float w = mix(0.04, 0.32, uSoft);
        float a = smoothstep(th - w, th + w, v);
        // lighter on top, a cool/warm shade underneath, slightly brighter in the core
        vec3 c = mix(uShade, uColor, smoothstep(0.15, 0.75, vUv.y) * 0.75 + v * 0.35);
        a *= uOpacity;
        gl_FragColor = vec4(c * a, a);   // premultiplied, like the rest of the scene
      }`,
    transparent: true,
    depthWrite: false,
    blending: THREE.CustomBlending,
    blendSrc: THREE.OneFactor,
    blendDst: THREE.OneMinusSrcAlphaFactor,
    blendSrcAlpha: THREE.OneFactor,
    blendDstAlpha: THREE.OneMinusSrcAlphaFactor,
  });
}

// ---------------------------------------------------------------- clouds

const LAYERS = [
  // far behind everything: big, faint, barely moves when the camera pans
  { z: [-48, -32], y: [-6, 16], w: [22, 34], alpha: 0.75, parallax: 0.45, speed: 1 },
  // in the gaps between islands
  { z: [-10, 10], y: [6, 13], w: [12, 20], alpha: 0.85, parallax: 0.15, speed: 1 },
  // in front: passes over the camera's view, a little faster
  { z: [22, 34], y: [-8, 6], w: [10, 16], alpha: 0.55, parallax: -0.3, speed: 2 },
];

export function createClouds() {
  const group = new THREE.Group();
  const r = rand(4242);
  const textures = Array.from({ length: 5 }, (_, i) => cloudField(101 + i * 17));
  const geo = new THREE.PlaneGeometry(1, 1);
  const order = [0, 1, 0, 2, 1, 0, 1, 2, 0, 1, 0, 1, 2, 0, 1, 2];
  const clouds = [];
  for (let i = 0; i < MAX_CLOUDS; i++) {
    const L = LAYERS[order[i]];
    const mat = cloudMaterial(textures[i % textures.length]);
    const m = new THREE.Mesh(geo, mat);
    const w = r.f(L.w[0], L.w[1]);
    m.scale.set(w, w * r.f(0.42, 0.55), 1);
    m.renderOrder = 2;
    group.add(m);
    clouds.push({
      m, mat, L,
      base: (i / MAX_CLOUDS) * SPAN + r.f(-4, 4),
      y: r.f(L.y[0], L.y[1]),
      z: r.f(L.z[0], L.z[1]),
      dir: r.chance(0.7) ? 1 : -1,
      bobK: r.i(1, 2), ph: r.next(),
    });
  }

  const white = new THREE.Color(1, 1, 1);
  const shadeBase = new THREE.Color('#a9b9e6');
  const tmpA = new THREE.Color(), tmpB = new THREE.Color();

  // phase: accumulated drift phase; camTarget: for parallax
  function update({ phase, ph, camera, camTarget, amount, density, opacity, softness, tz, cloudA, cloudB, nightA = 0, nightB = 0 }) {
    const [x0, x1] = WORLD.tzBlend;
    clouds.forEach((c, i) => {
      const u = (((c.base + phase * c.L.speed * c.dir * SPAN) % SPAN) + SPAN) % SPAN;
      const x = u - SPAN / 2;
      c.m.position.set(
        x + camTarget.x * c.L.parallax,
        c.y + Math.sin(TAU * (ph * c.bobK + c.ph)) * 0.5 + camTarget.y * c.L.parallax * 0.5,
        c.z + camTarget.z * c.L.parallax * 0.3);
      c.m.quaternion.copy(camera.quaternion);

      const edge = Math.min(1, u / 14, (SPAN - u) / 14);          // fade before wrapping
      const present = Math.min(1, Math.max(0, amount * MAX_CLOUDS - i));
      c.mat.uniforms.uOpacity.value = opacity * c.L.alpha * edge * present;
      c.mat.uniforms.uDensity.value = density;
      c.mat.uniforms.uSoft.value = softness;
      c.m.visible = c.mat.uniforms.uOpacity.value > 0.003;

      // local time: warm near one island, cool near the other, blended across
      let w = Math.min(1, Math.max(0, (c.m.position.x - x0) / (x1 - x0)));
      w = w * w * (3 - 2 * w);
      tmpA.copy(cloudA).lerp(cloudB, w);
      c.mat.uniforms.uColor.value.copy(white).lerp(tmpA, tz * 0.8);
      tmpB.copy(shadeBase).lerp(tmpA, tz * 0.5);
      c.mat.uniforms.uShade.value.copy(tmpB);
      const n = nightA + (nightB - nightA) * w;            // darker at night
      c.mat.uniforms.uColor.value.multiplyScalar(1 - 0.7 * n);
      c.mat.uniforms.uShade.value.multiplyScalar(1 - 0.75 * n);
    });
  }

  return { group, update };
}
