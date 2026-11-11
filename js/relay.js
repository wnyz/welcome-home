// Online relay: lets the controller reach viewers on other computers.
//
// BroadcastChannel only works inside one browser, so for viewers elsewhere
// (a friend's laptop, the projector machine, OBS's own browser) the
// controller also sends every change through a free public MQTT broker over
// WebSocket. Viewers opened with ?room=CODE listen to the same room.
//
// This is a tiny MQTT 3.1.1 client (QoS 0 only) so nothing third-party has to
// load. Messages are "retained", so a viewer that opens late still gets the
// current scene straight away.
//
// Public brokers have no uptime guarantee; the controller publishes to two at
// once and viewers fall back from one to the other. Anyone who knows the room
// code can listen (and could send), so keep the code to people you trust.

export const BROKERS = [
  'wss://broker.emqx.io:8084/mqtt',
  'wss://broker.hivemq.com:8884/mqtt',
];
const PREFIX = 'whnvr-liminal-landing';
const enc = new TextEncoder();
const dec = new TextDecoder();

export const topicFor = (room, kind) => `${PREFIX}/${room}/${kind}`;

export function newRoomCode() {
  const a = new Uint8Array(8);
  crypto.getRandomValues(a);
  return Array.from(a, b => 'abcdefghjkmnpqrstuvwxyz23456789'[b % 31]).join('');
}

// ------------------------------------------------------------- MQTT packets

function str(s) {
  const b = enc.encode(s);
  return [b.length >> 8, b.length & 255, ...b];
}
function varLen(n) {
  const out = [];
  do { let d = n % 128; n = Math.floor(n / 128); if (n > 0) d |= 128; out.push(d); } while (n > 0);
  return out;
}
function packet(type, body) {
  return new Uint8Array([type, ...varLen(body.length), ...body]);
}
const CONNECT = (id) => packet(0x10, [...str('MQTT'), 4, 0x02, 0, 60, ...str(id)]);
const SUBSCRIBE = (pid, topic) => packet(0x82, [pid >> 8, pid & 255, ...str(topic), 0]);
const PUBLISH = (topic, payload, retain) => packet(0x30 | (retain ? 1 : 0), [...str(topic), ...enc.encode(payload)]);
const PING = new Uint8Array([0xc0, 0]);

// ------------------------------------------------------------- one connection

// Connects to one broker and keeps reconnecting. onMessage(topic, text).
function connection(url, { subscribe = [], onMessage, onStatus }) {
  let ws = null, alive = false, closed = false, retry = 1000, ping = 0, buf = new Uint8Array(0), pid = 1;

  function open() {
    if (closed) return;
    try { ws = new WebSocket(url, 'mqtt'); } catch { schedule(); return; }
    ws.binaryType = 'arraybuffer';
    ws.onopen = () => ws.send(CONNECT(`${PREFIX}-${Math.random().toString(36).slice(2, 10)}`));
    ws.onmessage = (e) => { feed(new Uint8Array(e.data)); };
    ws.onclose = () => { alive = false; clearInterval(ping); onStatus?.(false); schedule(); };
    ws.onerror = () => { try { ws.close(); } catch { /* already closing */ } };
  }
  function schedule() {
    if (closed) return;
    setTimeout(open, retry);
    retry = Math.min(15000, retry * 1.7);
  }
  // incoming bytes may hold several packets, or part of one
  function feed(bytes) {
    const merged = new Uint8Array(buf.length + bytes.length);
    merged.set(buf); merged.set(bytes, buf.length);
    buf = merged;
    for (;;) {
      if (buf.length < 2) return;
      let len = 0, mul = 1, i = 1, b;
      do { if (i >= buf.length) return; b = buf[i++]; len += (b & 127) * mul; mul *= 128; } while (b & 128);
      if (buf.length < i + len) return;
      handle(buf[0], buf.subarray(i, i + len));
      buf = buf.slice(i + len);
    }
  }
  function handle(h, body) {
    const type = h >> 4;
    if (type === 2) {                              // CONNACK
      if (body[1] !== 0) { ws.close(); return; }
      alive = true; retry = 1000;
      for (const t of subscribe) ws.send(SUBSCRIBE(pid++, t));
      clearInterval(ping);
      ping = setInterval(() => { if (alive) ws.send(PING); }, 30000);
      onStatus?.(true);
    } else if (type === 3) {                       // PUBLISH
      const tl = (body[0] << 8) | body[1];
      const topic = dec.decode(body.subarray(2, 2 + tl));
      const off = 2 + tl + (((h >> 1) & 3) > 0 ? 2 : 0);
      onMessage?.(topic, dec.decode(body.subarray(off)));
    }
  }
  open();
  return {
    get alive() { return alive; },
    publish(topic, text, retain = false) { if (alive) ws.send(PUBLISH(topic, text, retain)); },
    close() { closed = true; clearInterval(ping); try { ws?.close(); } catch { /* fine */ } },
  };
}

// ------------------------------------------------------------- sender + listener

// Controller side: publish to every broker at once.
export function relaySender(room, onStatus) {
  const up = new Map();
  const conns = BROKERS.map(url => connection(url, {
    onStatus: (ok) => { up.set(url, ok); onStatus?.([...up.values()].filter(Boolean).length); },
  }));
  return {
    send(kind, data, retain = false) {
      const text = JSON.stringify(data);
      for (const c of conns) c.publish(topicFor(room, kind), text, retain);
    },
    get connected() { return conns.filter(c => c.alive).length; },
    close() { conns.forEach(c => c.close()); },
  };
}

// Viewer side: listen on the first broker that answers; move to the next one
// if it stays down.
export function relayListener(room, onMessage, onStatus) {
  let i = 0, conn = null, downSince = performance.now();
  const topics = ['state', 'clock'].map(k => topicFor(room, k));
  function start() {
    conn?.close();
    conn = connection(BROKERS[i], {
      subscribe: topics,
      onMessage: (topic, text) => {
        let data; try { data = JSON.parse(text); } catch { return; }
        onMessage(topic.split('/').pop(), data);
      },
      onStatus: (ok) => { downSince = ok ? 0 : performance.now(); onStatus?.(ok, BROKERS[i]); },
    });
  }
  start();
  setInterval(() => {
    if (downSince && performance.now() - downSince > 8000) { i = (i + 1) % BROKERS.length; downSince = performance.now(); start(); }
  }, 2000);
  return { get connected() { return !!conn?.alive; } };
}
