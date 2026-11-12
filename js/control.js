// Controller: edits the shared state and broadcasts it to any open viewer.

import {
  CHANNEL_NAME, LOOP_SECONDS, DEFAULT_STATE, ATMOSPHERES, VIEWS_KEY,
  loadState, saveState, sanitize,
} from './config.js';
import { CAMERA_PRESETS, presetById } from './presets.js';
import { SONG_SCENES } from './songs.js';
import { relaySender, newRoomCode } from './relay.js';

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
  rain: pct,
  snow: pct,
  breathe: pct, quake: pct, ripple: pct,
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
    relay?.send('state', { state, ease: pendingEase }, true);
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
// a song can bump viewVersion in songs.js to retire views saved before the change
const viewFor = (s) => {
  const v = views[songKey(s)];
  return v && (v.ver || 1) >= (s.viewVersion || 1) ? v : null;
};

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
  state.split = 0;   // a song only gets the split sky if it asks for it
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
  resetClock();
});

$('#restart').addEventListener('click', () => { channel?.postMessage({ type: 'restart' }); resetClock(); });
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

// ------------------------------------------------------------- show clock
// The controller keeps the one clock every viewer follows (loop time plus
// island turn, bird and cloud phases), so viewers on different computers show
// the same moment. Survives a reload of this page.

const CLOCK_KEY = 'whnvr-liminal-landing/clock';
let clock = { t: 0, angle: 0, bird: 0, cloud: 0 };
try {
  const c = JSON.parse(localStorage.getItem(CLOCK_KEY));
  if (c && typeof c.t === 'number') {
    const dt = state.autoAnimate ? Math.max(0, (Date.now() - c.wall) / 1000) : 0;
    clock = { t: c.t + dt, angle: c.angle + state.rotationSpeed * Math.PI * 2 / LOOP_SECONDS * dt, bird: c.bird + state.birdSpeed * dt / LOOP_SECONDS, cloud: c.cloud + state.cloudDrift * dt / LOOP_SECONDS };
  }
} catch { /* fresh clock */ }
let clockLast = performance.now();
function tickClock() {
  const now = performance.now();
  const dt = Math.min(1, (now - clockLast) / 1000);
  clockLast = now;
  if (!state.autoAnimate) return;
  clock.t += dt;
  clock.angle = (clock.angle + state.rotationSpeed * Math.PI * 2 / LOOP_SECONDS * dt) % (Math.PI * 2);
  clock.bird = (clock.bird + state.birdSpeed * dt / LOOP_SECONDS) % 1;
  clock.cloud = (clock.cloud + state.cloudDrift * dt / LOOP_SECONDS) % 1;
}
function sendClock() {
  tickClock();
  const msg = { t: clock.t, angle: clock.angle, bird: clock.bird, cloud: clock.cloud };
  channel?.postMessage({ type: 'clock', ...msg });
  relay?.send('clock', msg, true);
  try { localStorage.setItem(CLOCK_KEY, JSON.stringify({ ...msg, wall: Date.now() })); } catch { /* private mode */ }
}
function resetClock() { clock = { t: 0, angle: 0, bird: 0, cloud: 0 }; clockLast = performance.now(); sendClock(); }
setInterval(tickClock, 100);
setInterval(sendClock, 2000);

// ------------------------------------------------------------- share live (relay)

const ROOM_KEY = 'whnvr-liminal-landing/room';
const ONLINE_KEY = 'whnvr-liminal-landing/online';
let roomCode = localStorage.getItem(ROOM_KEY) || newRoomCode();
try { localStorage.setItem(ROOM_KEY, roomCode); } catch { /* private mode */ }
let relay = null;
const onlineBox = $('#onlineOn');
const onlineStatus = $('#onlineStatus');
const shareLink = $('#shareLink');
const viewerUrl = () => new URL(`viewer.html?room=${roomCode}&w=1920&h=1080`, location.href).href;

function setOnlineStatus(n) {
  const local = /^(localhost|127\.|0\.0\.0\.0)/.test(location.hostname);
  onlineStatus.dataset.ok = String(n > 0);
  onlineStatus.textContent = !relay ? 'off'
    : n > 0 ? `live · room ${roomCode}${local ? ' · this is a localhost link: use the github.io controller to share' : ''}`
      : 'connecting…';
}
function startRelay() {
  relay?.close();
  relay = relaySender(roomCode, setOnlineStatus);
  setOnlineStatus(0);
  // once connected, send the current scene + clock (kept by the relay for late joiners)
  const first = setInterval(() => {
    if (!relay) { clearInterval(first); return; }
    if (relay.connected) { clearInterval(first); push(); sendClock(); }
  }, 300);
}
function stopRelay() { relay?.close(); relay = null; setOnlineStatus(0); }

shareLink.value = viewerUrl();
onlineBox.checked = localStorage.getItem(ONLINE_KEY) !== 'off';
if (onlineBox.checked) startRelay(); else setOnlineStatus(0);
onlineBox.addEventListener('change', () => {
  try { localStorage.setItem(ONLINE_KEY, onlineBox.checked ? 'on' : 'off'); } catch { /* private mode */ }
  if (onlineBox.checked) startRelay(); else stopRelay();
});
$('#copyLink').addEventListener('click', async () => {
  try { await navigator.clipboard.writeText(shareLink.value); onlineStatus.textContent = 'link copied'; setTimeout(() => setOnlineStatus(relay?.connected || 0), 2000); }
  catch { shareLink.select(); }
});
$('#newRoom').addEventListener('click', () => {
  roomCode = newRoomCode();
  try { localStorage.setItem(ROOM_KEY, roomCode); } catch { /* private mode */ }
  shareLink.value = viewerUrl();
  if (relay) startRelay();
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
      views[songKey(s)] = { ...m.view, time: state.twHour, sky: [state.bgTop, state.bgMid, state.bgBottom], ver: s.viewVersion || 1 };
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
