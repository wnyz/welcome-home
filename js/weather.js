// Weather over the two main islands: rain on Taiwan, snow on New York.
// Both are drawn on the GPU from the loop clock, so they repeat seamlessly
// every loop. Each lives inside its island's spinner, so it stays over the
// island's own outline.

import * as THREE from 'three';
import { shared } from './materials.js';

const H = 11;   // how high above the island the drops / flakes start

function rng(seed) {
  let s = seed >>> 0;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
}

// random points inside an island outline
function pointsIn(radial, n, seed) {
  const r = rng(seed), out = [];
  while (out.length < n) {
    const x = (r() * 2 - 1) * 13, z = (r() * 2 - 1) * 13;
    const th = Math.atan2(z, x);
    if (Math.hypot(x, z) < radial(th) * 0.92) out.push([x, z]);
  }
  return out;
}

function makeRain(radial, n) {
  const r = rng(11);
  const pts = pointsIn(radial, n, 5);
  const pos = [], end = [], rnd = [];
  for (const [x, z] of pts) {
    const ph = r(), keep = r();
    for (const e of [0, 1]) { pos.push(x, 0, z); end.push(e); rnd.push(ph, keep); }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('aEnd', new THREE.Float32BufferAttribute(end, 1));
  geo.setAttribute('aRnd', new THREE.Float32BufferAttribute(rnd, 2));
  const uAmt = { value: 0.6 };
  const mat = new THREE.ShaderMaterial({
    uniforms: { uTime: shared.uTime, uLoop: shared.uLoop, uAmt },
    vertexShader: /* glsl */`
      uniform float uTime, uLoop, uAmt;
      attribute float aEnd;
      attribute vec2 aRnd;
      varying float vA;
      void main() {
        float f = fract(aRnd.x + uTime / uLoop * 40.0);   // 40 falls per loop, 3 s each
        float fall = (1.0 - f) * ${H.toFixed(1)};
        vec3 p = position;
        p.y = 0.12 + fall + aEnd * 0.75;
        p.x += (fall + aEnd * 0.75) * 0.15;                // a slight slant
        vA = step(aRnd.y, uAmt) * smoothstep(0.0, 0.12, f) * (1.0 - smoothstep(0.97, 1.0, f));
        gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
      }`,
    fragmentShader: /* glsl */`
      varying float vA;
      void main() {
        if (vA < 0.01) discard;
        gl_FragColor = vec4(0.78, 0.87, 1.0, 0.6 * vA);
      }`,
    transparent: true, depthWrite: false,
  });
  const obj = new THREE.LineSegments(geo, mat);
  obj.frustumCulled = false;
  return { obj, uAmt };
}

function makeSnow(radial, n, uPxH) {
  const r = rng(23);
  const pts = pointsIn(radial, n, 9);
  const pos = [], rnd = [];
  for (const [x, z] of pts) { pos.push(x, 0, z); rnd.push(r(), r(), r()); }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('aRnd', new THREE.Float32BufferAttribute(rnd, 3));
  const uAmt = { value: 0.6 };
  const mat = new THREE.ShaderMaterial({
    uniforms: { uTime: shared.uTime, uLoop: shared.uLoop, uAmt, uPxH },
    vertexShader: /* glsl */`
      uniform float uTime, uLoop, uAmt, uPxH;
      attribute vec3 aRnd;   // fall phase, keep, sway phase
      varying float vA;
      const float TAU = 6.28318530718;
      void main() {
        float ph = uTime / uLoop;
        float f = fract(aRnd.x + ph * 6.0);                // 6 falls per loop, 20 s each
        vec3 p = position;
        p.y = 0.08 + (1.0 - f) * ${H.toFixed(1)};
        p.x += 0.35 * sin(TAU * (ph * 12.0 + aRnd.z));     // drifting side to side
        p.z += 0.3 * cos(TAU * (ph * 9.0 + aRnd.z));
        vA = step(aRnd.y, uAmt) * smoothstep(0.0, 0.08, f) * (1.0 - smoothstep(0.96, 1.0, f));
        float size = 0.045 * (0.7 + 0.6 * fract(aRnd.z * 7.0));
        gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
        gl_PointSize = vA < 0.01 ? 0.0 : size * projectionMatrix[1][1] * uPxH * 0.5;
      }`,
    fragmentShader: /* glsl */`
      varying float vA;
      void main() {
        float d = length(gl_PointCoord - 0.5);
        float a = (1.0 - smoothstep(0.3, 0.5, d)) * vA;
        if (a < 0.01) discard;
        gl_FragColor = vec4(1.0, 1.0, 1.0, 0.9 * a);
      }`,
    transparent: true, depthWrite: false,
  });
  const obj = new THREE.Points(geo, mat);
  obj.frustumCulled = false;
  return { obj, uAmt };
}

export function createWeather(world) {
  const [ny, tw] = world.islands;
  const uPxH = { value: 1080 };
  const rain = makeRain(tw.radial, 900);
  const snow = makeSnow(ny.radial, 650, uPxH);
  tw.spinner.add(rain.obj);
  ny.spinner.add(snow.obj);
  return {
    // rain / snow: 0..1 amount; pxH: drawing-buffer height in pixels
    update({ rain: ra, snow: sn, pxH }) {
      rain.uAmt.value = ra; rain.obj.visible = ra > 0.01;
      snow.uAmt.value = sn; snow.obj.visible = sn > 0.01;
      uPxH.value = pxH;
    },
  };
}
