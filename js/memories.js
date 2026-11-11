// "Memories" seen through the windows.
// Six tiny paintings are drawn at very low resolution and then upscaled with
// smoothing, which gives the soft, out-of-focus, half-remembered quality of
// reference 3 without any image files or blur filters.

import * as THREE from 'three';
import { mulberry32 } from './config.js';

const CELL = 256;

function suburb(c, n) {
  const sky = c.createLinearGradient(0, 0, 0, n * 0.6);
  sky.addColorStop(0, '#6c8ad6');
  sky.addColorStop(1, '#efbca2');
  c.fillStyle = sky; c.fillRect(0, 0, n, n);
  const houses = ['#e9a6a2', '#c4e6b2', '#efd9b8', '#e7c0c9'];
  for (let i = 0; i < 5; i++) {
    const x = i * n * 0.22 - n * 0.05, w = n * 0.2, y = n * 0.5;
    c.fillStyle = houses[i % houses.length];
    c.fillRect(x, y, w, n * 0.12);
    c.fillStyle = '#b9a7a0';
    c.beginPath(); c.moveTo(x - 1, y); c.lineTo(x + w / 2, y - n * 0.06); c.lineTo(x + w + 1, y); c.fill();
  }
  c.fillStyle = '#6fae55'; c.fillRect(0, n * 0.62, n, n);
  c.fillStyle = '#7d7f95';
  c.beginPath(); c.moveTo(n * 0.15, n); c.lineTo(n * 0.55, n * 0.64); c.lineTo(n * 0.8, n * 0.64); c.lineTo(n, n * 0.8); c.lineTo(n, n); c.fill();
}

function thermal(c, n, r) {
  c.fillStyle = '#f2d24c'; c.fillRect(0, 0, n, n);
  const cols = ['#ff2a1a', '#1c4dff', '#f6a2b5', '#14141c', '#58ab29', '#ffe14a', '#ffffff', '#1c4dff'];
  for (let i = 0; i < 11; i++) {
    c.fillStyle = cols[i % cols.length];
    c.beginPath();
    c.ellipse(r() * n, r() * n, n * (0.08 + r() * 0.25), n * (0.1 + r() * 0.35), r() * 3, 0, Math.PI * 2);
    c.fill();
  }
  c.fillStyle = '#ff2a1a'; c.fillRect(0, n * 0.36, n, n * 0.04);
}

function room(c, n) {
  c.fillStyle = '#3b2a25'; c.fillRect(0, 0, n, n);
  const g = c.createRadialGradient(n * 0.68, n * 0.38, 0, n * 0.68, n * 0.38, n * 0.55);
  g.addColorStop(0, '#ffe2a0'); g.addColorStop(0.35, '#f0a35e'); g.addColorStop(1, 'rgba(60,40,36,0)');
  c.fillStyle = g; c.fillRect(0, 0, n, n);
  c.fillStyle = '#1f1716';
  c.beginPath(); c.ellipse(n * 0.32, n * 0.72, n * 0.13, n * 0.3, 0, 0, Math.PI * 2); c.fill();
  c.beginPath(); c.arc(n * 0.32, n * 0.38, n * 0.08, 0, Math.PI * 2); c.fill();
}

function screen(c, n) {
  c.fillStyle = '#0e1f55'; c.fillRect(0, 0, n, n);
  const g = c.createRadialGradient(n * 0.5, n * 0.5, 0, n * 0.5, n * 0.5, n * 0.6);
  g.addColorStop(0, '#7fd0ff'); g.addColorStop(0.4, '#2a6fe0'); g.addColorStop(1, 'rgba(14,31,85,0)');
  c.fillStyle = g; c.fillRect(0, 0, n, n);
  c.fillStyle = '#c9ecff'; c.fillRect(n * 0.3, n * 0.32, n * 0.4, n * 0.26);
  c.fillStyle = '#0a1438'; c.fillRect(0, n * 0.78, n, n);
}

function tower(c, n, r) {
  c.fillStyle = '#0b1020'; c.fillRect(0, 0, n, n);
  const lit = ['#ffd98a', '#ffe9b8', '#bfe6ff', '#f3b0a0', '#ffd98a'];
  const s = n / 9;
  for (let y = 0; y < 9; y++) for (let x = 0; x < 9; x++) {
    if (r() < 0.45) continue;
    c.fillStyle = r() < 0.75 ? lit[Math.floor(r() * lit.length)] : '#222b44';
    c.fillRect(x * s + 1, y * s + 1, s - 2, s - 2);
  }
}

function sunset(c, n) {
  const g = c.createLinearGradient(0, 0, 0, n);
  g.addColorStop(0, '#2a63d9'); g.addColorStop(0.5, '#f7a6b9'); g.addColorStop(1, '#ff3b2a');
  c.fillStyle = g; c.fillRect(0, 0, n, n);
  c.fillStyle = '#ffe7a3';
  c.beginPath(); c.arc(n * 0.6, n * 0.66, n * 0.12, 0, Math.PI * 2); c.fill();
  c.fillStyle = '#2b3a8f'; c.fillRect(0, n * 0.78, n, n);
}

// --- airbrushed pastel memories (the cloud / shoreline references)

function pastelCloud(c, n) {
  const g = c.createLinearGradient(0, 0, 0, n);
  g.addColorStop(0, '#1f3f9e'); g.addColorStop(0.55, '#6f8fe0'); g.addColorStop(0.75, '#d9643f'); g.addColorStop(1, '#8a7fc8');
  c.fillStyle = g; c.fillRect(0, 0, n, n);
  for (const [x, y, rx, ry] of [[0.45, 0.3, 0.3, 0.16], [0.3, 0.45, 0.22, 0.1], [0.65, 0.5, 0.25, 0.1]]) {
    const r = c.createRadialGradient(x * n, y * n, 0, x * n, y * n, rx * n);
    r.addColorStop(0, '#fff6f2'); r.addColorStop(0.5, '#f2a7a8'); r.addColorStop(1, 'rgba(242,167,168,0)');
    c.fillStyle = r;
    c.beginPath(); c.ellipse(x * n, y * n, rx * n, ry * n * 1.6, 0, 0, Math.PI * 2); c.fill();
  }
}

function shimmer(c, n, r) {
  const g = c.createLinearGradient(0, 0, 0, n);
  g.addColorStop(0, '#c9d6f4'); g.addColorStop(0.45, '#f4c0c4'); g.addColorStop(0.55, '#5d7fc9'); g.addColorStop(1, '#2b3f8c');
  c.fillStyle = g; c.fillRect(0, 0, n, n);
  for (let i = 0; i < 26; i++) {               // light on water
    const y = n * (0.55 + r() * 0.4), x = n * r();
    c.fillStyle = r() < 0.7 ? 'rgba(255,240,205,0.95)' : 'rgba(255,200,150,0.9)';
    c.beginPath(); c.ellipse(x, y, 1 + r() * 2.2, 0.6 + r(), 0, 0, Math.PI * 2); c.fill();
  }
}

function rings(c, n) {
  c.fillStyle = '#f1ece4'; c.fillRect(0, 0, n, n);
  const g = c.createRadialGradient(n / 2, n / 2, 0, n / 2, n / 2, n * 0.48);
  g.addColorStop(0, '#f6b2c8'); g.addColorStop(0.3, '#2a63e0'); g.addColorStop(0.55, '#ff3324');
  g.addColorStop(0.8, '#f3d600'); g.addColorStop(1, 'rgba(241,236,228,0)');
  c.fillStyle = g; c.fillRect(0, 0, n, n);
}

const PAINTERS = [
  { fn: suburb, res: 40 },
  { fn: thermal, res: 28 },
  { fn: room, res: 32 },
  { fn: screen, res: 32 },
  { fn: tower, res: 54 },
  { fn: sunset, res: 36 },
  { fn: pastelCloud, res: 30 },
  { fn: shimmer, res: 44 },
  { fn: rings, res: 26 },
];
export const MEMORY_COUNT = PAINTERS.length; // 9, laid out 3 x 3

export function makeMemoryAtlas() {
  const atlas = document.createElement('canvas');
  atlas.width = CELL * 3; atlas.height = CELL * 3;
  const actx = atlas.getContext('2d');
  const rng = mulberry32(11);

  PAINTERS.forEach((p, i) => {
    const lo = document.createElement('canvas');
    lo.width = lo.height = p.res;
    p.fn(lo.getContext('2d'), p.res, rng);
    // two-step upscale = cheap, portable blur
    const mid = document.createElement('canvas');
    mid.width = mid.height = 72;
    const mctx = mid.getContext('2d');
    mctx.imageSmoothingEnabled = true; mctx.imageSmoothingQuality = 'high';
    mctx.drawImage(lo, 0, 0, 72, 72);
    actx.imageSmoothingEnabled = true; actx.imageSmoothingQuality = 'high';
    actx.drawImage(mid, (i % 3) * CELL, Math.floor(i / 3) * CELL, CELL, CELL);
  });

  const tex = new THREE.CanvasTexture(atlas);
  tex.colorSpace = THREE.NoColorSpace;
  tex.generateMipmaps = false;
  tex.minFilter = THREE.LinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.userData.canvas = atlas;
  return tex;
}

// --------------------------------------------------------------------------
// Hook for real images later.
//
// Put photos / video stills in a folder (e.g. memories/) and list them here as
// { cell: 0-8, src: 'memories/kitchen.jpg', blur: 0-1 }. They replace the
// procedural painting in that cell of the atlas, so every window that shows
// that cell (or is pinned to it with fixedMem) shows your image instead.
// Leave empty to use only the procedural memories.
export const MEMORY_IMAGES = [
  // { cell: 2, src: 'memories/grandma-kitchen.jpg', blur: 0.4 },
];

export function loadMemoryImages(tex, list = MEMORY_IMAGES) {
  const atlas = tex.userData.canvas;
  if (!atlas) return;
  const ctx = atlas.getContext('2d');
  for (const { cell, src, blur = 0.3 } of list) {
    const img = new Image();
    img.onload = () => {
      // soften by drawing small then large, same as the procedural memories
      const small = document.createElement('canvas');
      const s = Math.max(16, Math.round(256 * (1 - blur * 0.85)));
      small.width = small.height = s;
      const sctx = small.getContext('2d');
      const side = Math.min(img.width, img.height);
      sctx.drawImage(img, (img.width - side) / 2, (img.height - side) / 2, side, side, 0, 0, s, s);
      ctx.imageSmoothingEnabled = true;
      ctx.drawImage(small, (cell % 3) * CELL, Math.floor(cell / 3) * CELL, CELL, CELL);
      tex.needsUpdate = true;
    };
    img.onerror = () => console.warn(`memory image not found: ${src}`);
    img.src = src;
  }
}
