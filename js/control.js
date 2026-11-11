// Controller: edits the shared state and broadcasts it to any open viewer.

import {
  CHANNEL_NAME, LOOP_SECONDS, DEFAULT_STATE, ATMOSPHERES, VIEWS_KEY,
  loadState, saveState, sanitize,
} from './config.js';
import { CAMERA_PRESETS, presetById } from './presets.js';
import { SONG_SCENES } from './songs.js';

const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const pad = (n) => String(n).padStart(2, '0');

let state = loadState();
let selectedSong = state.activeSong >= 0 ? state.activeSong : 0;
const channel = 'BroadcastChannel' in window ? new BroadcastChannel(CHANNEL_NAME) : null;

// ------------------------------------------------------------- formatting

const pct = v => `${Math.round(v * 100)}%`;
const fmt = {
  rotationSpeed: v => `${v >= 0 ? '' : '−'}${Math.abs(v).toFixed(2)} turns`,
  floatIntensity: v => `${v.toFixed(2)} · ${v < 1.05 ? 'floating' : v < 2.2 ? 'separating' : v < 3.6 ? 'disassembling' : 'scattered'}`,
  birdSpeed: v => `${v.toFixed(2)}×`,
  zoom: v => `${v.toFixed(2)}×`,
  cameraAngle: v => `${v.toFixed(1)}°`,
  cameraOrbit: v => `${v > 0 ? '+' : ''}${Math.round(v)}°`,
  transition: v => `${v.toFixed(1)} s`,
  houseCount: v => String(v),
  birdCount: v => String(v),
  timezone: v => v < 0.05 ? 'shared time' : pct(v),
  darkness: pct,
  split: v => v < 0.02 ? 'blended' : v > 0.98 ? 'split' : pct(v),
  twHour: v => `${pad(Math.round(v) % 24)}:00 Taiwan · ${pad((Math.round(v) + 12) % 24)}:00 New York`,
  windowLight: pct, clouds: v => `${Math.round(v * 16)} / 16`,
  cloudDensity: pct, cloudOpacity: pct, cloudSoftness: pct,
  cloudDrift: v => `${v.toFixed(2)}×`,
  halftone: pct, grain: v => v.toFixed(2),
};

// ------------------------------------------------------------- broadcast

let pending = false, pendingEase = false;
function push(ease = false) {
  saveState(state);
  pendingEase = pendingEase || ease;
  if (pending) return;
  pending = true;
  requestAnimationFrame(() => {
    pending = false;
    channel?.postMessage({ type: 'state', state, ease: pendingEase });
    pendingEase = false;
  });
}

// ------------------------------------------------------------- applying presets + scenes

function applyAtmosphere(id) {
  const a = ATMOSPHERES.find(x => x.id === id);
  if (a) [state.bgTop, state.bgMid, state.bgBottom] = a.colors;
}

function applyEffects(effects = {}) {
  for (const [k, v] of Object.entries(effects)) {
    if (k in DEFAULT_STATE && typeof v === typeof DEFAULT_STATE[k]) state[k] = v;
  }
}

// ------------------------------------------------------------- saved song views
// Kept in this browser (localStorage), keyed by title + artist so they
// survive reordering songs.js. "Copy saved views as code" turns them into
// lines for songs.js to make them permanent.

const songKey = (s) => `${s.title}|${s.artist}`;
let views = {};
try { views = JSON.parse(localStorage.getItem(VIEWS_KEY)) || {}; } catch { views = {}; }
const saveViews = () => { try { localStorage.setItem(VIEWS_KEY, JSON.stringify(views)); } catch { /* private mode */ } };
const viewFor = (s) => views[songKey(s)] || null;

function applyView(v) {
  if (typeof v.time === 'number') state.twHour = v.time;
  if (Array.isArray(v.sky)) [state.bgTop, state.bgMid, state.bgBottom] = v.sky;
  state.zoom = v.zoom;
  state.cameraAngle = v.angle;
  state.cameraOrbit = v.orbit;
  [state.cameraPanX, state.cameraPanY, state.cameraPanZ] = v.pan || [0, 0, 0];
}

function applyPreset(id) {
  const p = presetById(id);
  state.cameraPreset = p.id;
  state.zoom = p.zoom;
  state.cameraAngle = p.elevation;
  state.cameraOrbit = 0;
  state.cameraPanX = 0; state.cameraPanY = 0; state.cameraPanZ = 0;
  state.tour = false;
  if (p.atmosphere) applyAtmosphere(p.atmosphere);
  applyEffects(p.effects);
  state.cameraCue += 1;
}

function activateScene(i) {
  i = ((i % SONG_SCENES.length) + SONG_SCENES.length) % SONG_SCENES.length;
  const s = SONG_SCENES[i];
  const saved = viewFor(s);
  applyPreset(saved ? saved.camera : s.camera);
  if (s.atmosphere) applyAtmosphere(s.atmosphere);
  if (typeof s.zoom === 'number') state.zoom = s.zoom;
  if (typeof s.angle === 'number') state.cameraAngle = s.angle;
  if (typeof s.orbit === 'number') state.cameraOrbit = s.orbit;
  if (Array.isArray(s.pan)) [state.cameraPanX, state.cameraPanY, state.cameraPanZ] = s.pan;
  if (typeof s.float === 'number') state.floatIntensity = s.float;
  if (s.birds) {
    if (typeof s.birds.count === 'number') state.birdCount = s.birds.count;
    if (typeof s.birds.speed === 'number') state.birdSpeed = s.birds.speed;
  }
  applyEffects(s.effects);
  if (typeof s.time === 'number') state.twHour = s.time;
  if (Array.isArray(s.sky)) [state.bgTop, state.bgMid, state.bgBottom] = s.sky;
  if (saved) applyView(saved);     // a saved view (camera + time) wins
  state.activeSong = i;
  selectedSong = i;
  render();
  push(true);
  $(`#songList li[data-i="${i}"]`)?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
}

// ------------------------------------------------------------- build dynamic UI

// camera presets
const camEl = $('#cameraPresets');
CAMERA_PRESETS.forEach((p, i) => {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = 'cam';
  b.dataset.id = p.id;
  b.innerHTML = `<span class="num">${pad(i + 1)}</span><span>${p.name}</span>`;
  b.addEventListener('click', () => { applyPreset(p.id); render(); push(true); });
  camEl.appendChild(b);
});

// song list
const listEl = $('#songList');
SONG_SCENES.forEach((s, i) => {
  const li = document.createElement('li');
  li.dataset.i = i;
  li.tabIndex = 0;
  li.innerHTML = `<span class="num">${pad(i + 1)}</span>
    <span class="song"><strong>${s.title}</strong><span class="artist">${s.artist}</span></span>
    <span class="cam-tag"></span>`;
  li.addEventListener('click', () => { selectedSong = i; render(); });
  li.addEventListener('dblclick', () => activateScene(i));
  listEl.appendChild(li);
});

// save-view controls
const viewSel = $('#viewSong');
SONG_SCENES.forEach((s, i) => {
  const o = document.createElement('option');
  o.value = String(i);
  o.textContent = `${pad(i + 1)} ${s.title} — ${s.artist}`;
  viewSel.appendChild(o);
});
viewSel.addEventListener('change', () => { selectedSong = +viewSel.value; render(); });
const viewMsg = $('#viewMsg');
let viewMsgTimer = 0;
const say = (t) => { viewMsg.textContent = t; clearTimeout(viewMsgTimer); viewMsgTimer = setTimeout(() => { viewMsg.textContent = ''; }, 4000); };
let pendingSave = null;
$('#saveView').addEventListener('click', () => {
  if (!channel || $('#status').dataset.live !== 'true') { say('Open the viewer first.'); return; }
  pendingSave = +viewSel.value;
  channel.postMessage({ type: 'captureView', song: pendingSave });
});
$('#clearView').addEventListener('click', () => {
  const s = SONG_SCENES[+viewSel.value];
  if (!viewFor(s)) { say('No saved view for this song.'); return; }
  delete views[songKey(s)];
  saveViews();
  render();
  say(`Cleared the view for ${s.title}.`);
});
$('#copyViews').addEventListener('click', async () => {
  const lines = SONG_SCENES.map((s) => {
    const v = viewFor(s);
    const time = (typeof v?.time === 'number' ? ` time: ${v.time},` : '')
      + (Array.isArray(v?.sky) ? ` sky: [${v.sky.map(c => `'${c}'`).join(', ')}],` : '');
    return v && `  // ${s.title}\n  camera: '${v.camera}', zoom: ${v.zoom}, angle: ${v.angle}, orbit: ${v.orbit}, pan: [${v.pan.join(', ')}],${time}`;
  }).filter(Boolean);
  if (!lines.length) { say('No saved views yet.'); return; }
  const text = lines.join('\n');
  try { await navigator.clipboard.writeText(text); say(`Copied ${lines.length} view${lines.length > 1 ? 's' : ''}. Paste into js/songs.js.`); }
  catch { window.prompt('Copy these lines:', text); }
});

// atmosphere presets
const presetsEl = $('#presets');
ATMOSPHERES.forEach((p) => {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = 'preset';
  b.dataset.id = p.id;
  b.title = p.id;
  b.style.background = `linear-gradient(180deg, ${p.colors.join(', ')})`;
  b.innerHTML = `<span>${p.id}</span>`;
  b.addEventListener('click', () => { applyAtmosphere(p.id); render(); push(); });
  presetsEl.appendChild(b);
});

// ------------------------------------------------------------- UI <-> state

function render() {
  for (const el of $$('[data-key]')) {
    const k = el.dataset.key;
    if (el.type === 'checkbox') el.checked = !!state[k];
    else if (el.dataset.scale === 'log') {
      const lo = Math.log(+el.min), hi = Math.log(+el.max);
      el.dataset.lo = lo; el.dataset.hi = hi;
      el.value = String(+el.min + (Math.log(state[k]) - lo) / (hi - lo) * (+el.max - +el.min));
    } else el.value = state[k];
  }
  for (const out of $$('output[data-for]')) {
    const k = out.dataset.for;
    out.textContent = fmt[k] ? fmt[k](state[k]) : state[k];
  }
  $('#skyPreview').style.background = `linear-gradient(100deg, ${state.bgTop}, ${state.bgMid}, ${state.bgBottom})`;
  for (const b of $$('.preset')) {
    const p = ATMOSPHERES.find(x => x.id === b.dataset.id);
    b.setAttribute('aria-pressed', String(p.colors[0] === state.bgTop && p.colors[1] === state.bgMid && p.colors[2] === state.bgBottom));
  }
  for (const b of $$('.cam')) b.setAttribute('aria-pressed', String(b.dataset.id === state.cameraPreset && !state.tour));
  for (const b of $$('#strokeButtons button')) b.setAttribute('aria-pressed', String(b.dataset.stroke === state.stroke));
  for (const li of $$('#songList li')) {
    const i = +li.dataset.i;
    li.classList.toggle('selected', i === selectedSong);
    li.classList.toggle('active', i === state.activeSong);
    const v = viewFor(SONG_SCENES[i]);
    li.querySelector('.cam-tag').innerHTML = v
      ? `<span class="saved-mark" title="saved view">●</span>${presetById(v.camera).name}${typeof v.time === 'number' ? ` · ${pad(v.time)}:00` : ''}`
      : presetById(SONG_SCENES[i].camera).name;
  }
  if (document.activeElement !== viewSel) viewSel.value = String(selectedSong);
  const s = SONG_SCENES[state.activeSong];
  $('#activeSong').textContent = s ? `${pad(state.activeSong + 1)} ${s.title} — ${s.artist}` : '—';
  $('#activeCamera').textContent = state.tour ? 'Autonomous tour' : presetById(state.cameraPreset).name;
}

// log-scale slider position -> value
function readSlider(el) {
  if (el.dataset.scale === 'log') {
    const lo = Math.log(+el.min), hi = Math.log(+el.max);
    const f = (+el.value - +el.min) / (+el.max - +el.min);
    return Math.exp(lo + f * (hi - lo));
  }
  return parseFloat(el.value);
}

const INTS = new Set(['houseCount', 'birdCount', 'twHour']);
for (const el of $$('[data-key]')) {
  const k = el.dataset.key;
  el.addEventListener('input', () => {
    if (el.type === 'checkbox') state[k] = el.checked;
    else if (el.type === 'range') state[k] = INTS.has(k) ? parseInt(el.value, 10) : readSlider(el);
    else state[k] = el.value;
    if (k === 'tour' && !state.tour) state.cameraCue += 1;
    render();
    push();
  });
  // gently snap to whole numbers (seamless loops)
  if (el.dataset.snap) {
    el.addEventListener('change', () => {
      const v = state[k], n = Math.round(v);
      if (Math.abs(v - n) < 0.08 && v !== n) { state[k] = n; render(); push(); }
    });
  }
}

$('#rearrange').addEventListener('click', () => {
  let s;
  do { s = 1 + Math.floor(Math.random() * 99999); } while (s === state.layoutSeed);
  state.layoutSeed = s;
  push();
});

for (const b of $$('#scatterButtons button')) {
  b.addEventListener('click', () => { state.floatIntensity = parseFloat(b.dataset.float); render(); push(); });
}
for (const b of $$('#strokeButtons button')) {
  b.addEventListener('click', () => { state.stroke = b.dataset.stroke; render(); push(); });
}

$('#prevScene').addEventListener('click', () => activateScene((state.activeSong >= 0 ? state.activeSong : selectedSong + 1) - 1));
$('#nextScene').addEventListener('click', () => activateScene((state.activeSong >= 0 ? state.activeSong : selectedSong - 1) + 1));
$('#activateScene').addEventListener('click', () => activateScene(selectedSong));

$('#reset').addEventListener('click', () => {
  const cue = state.cameraCue + 1;
  state = { ...DEFAULT_STATE, cameraCue: cue };
  selectedSong = 0;
  render(); push(true);
  channel?.postMessage({ type: 'restart' });
});

$('#restart').addEventListener('click', () => channel?.postMessage({ type: 'restart' }));
$('#openViewer').addEventListener('click', () => window.open('viewer.html', 'whnvr-viewer'));

// performance keys (ignored while typing / dragging a slider)
const PRESET_KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0', '-'];
window.addEventListener('keydown', (e) => {
  const tag = e.target.tagName;
  if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA' || e.metaKey || e.ctrlKey || e.altKey) return;
  if (e.key === 'ArrowRight') { e.preventDefault(); $('#nextScene').click(); }
  else if (e.key === 'ArrowLeft') { e.preventDefault(); $('#prevScene').click(); }
  else if (e.key === 'Enter' && (e.target === document.body || e.target.closest?.('#songList'))) { e.preventDefault(); activateScene(selectedSong); }
  else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
    if (!e.target.closest?.('#songList') && e.target !== document.body) return;
    e.preventDefault();
    selectedSong = Math.min(SONG_SCENES.length - 1, Math.max(0, selectedSong + (e.key === 'ArrowDown' ? 1 : -1)));
    render();
    $(`#songList li[data-i="${selectedSong}"]`)?.scrollIntoView({ block: 'nearest' });
  } else {
    const idx = PRESET_KEYS.indexOf(e.key);
    if (idx >= 0 && CAMERA_PRESETS[idx]) { applyPreset(CAMERA_PRESETS[idx].id); render(); push(true); }
  }
});

// ------------------------------------------------------------- status

let lastStatus = 0;
const statusEl = $('#status');
const statusText = $('#statusText');
const loopFill = $('#loopFill');
const mmss = s => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

if (channel) {
  channel.onmessage = (e) => {
    const m = e.data || {};
    if (m.type === 'hello' && m.from === 'viewer') push();
    else if (m.type === 'state') { state = sanitize(m.state); saveState(state); render(); } // another controller
    else if (m.type === 'view' && m.song === pendingSave) {
      const s = SONG_SCENES[m.song];
      views[songKey(s)] = { ...m.view, time: state.twHour, sky: [state.bgTop, state.bgMid, state.bgBottom] };
      saveViews();
      pendingSave = null;
      // hold the captured view in the live state too
      state.cameraPreset = m.view.camera;
      applyView(m.view);
      render();
      push();
      say(`Saved view, ${pad(state.twHour)}:00 and sky to ${pad(m.song + 1)} ${s.title}.`);
    }
    else if (m.type === 'status') {
      lastStatus = performance.now();
      statusEl.dataset.live = 'true';
      const p = presetById(m.preset);
      statusText.textContent = `viewer live · ${mmss(m.t)} / ${mmss(LOOP_SECONDS)} · ${m.fps} fps · ${m.moving ? '→ ' : ''}${p.name}${m.auto ? '' : ' · paused'}`;
      loopFill.style.width = `${(m.t / LOOP_SECONDS) * 100}%`;
    }
  };
  channel.postMessage({ type: 'hello', from: 'control' });
} else {
  statusText.textContent = 'BroadcastChannel unsupported in this browser';
}

setInterval(() => {
  if (performance.now() - lastStatus > 1600) {
    statusEl.dataset.live = 'false';
    statusText.textContent = 'viewer not open';
    loopFill.style.width = '0%';
  }
}, 800);

render();
push();
