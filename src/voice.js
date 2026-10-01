// Voice-over: plays the clips in public/voice (built by `npm run voice`, see scripts/gen-voice.mjs).
// Clips are small Opus files decoded on first use. Math questions are assembled from number clips,
// e.g. "שלוש" + "ועוד" + "ארבע" + "כמה זה?", so every exercise can be read aloud.
import { load } from './game/save.js';
import { audioContext, voiceDestination, duckMusic } from './audio.js';

let manifest = null;
let manifestLoad = null;
const bufs = new Map();   // clip id -> Promise<AudioBuffer | null>
const lastPick = {};
let playing = [];         // sources currently scheduled
let endAt = 0;            // audio-clock time when the queue runs dry
let token = 0;            // bumped by every interrupting call so older pending calls are dropped

const enabled = () => { const s = load().settings; return s.sound && s.voice !== false; };

function ensureManifest() {
  if (!manifestLoad) {
    manifestLoad = fetch('voice/manifest.json').then((r) => (r.ok ? r.json() : null)).catch(() => null).then((m) => { manifest = m; return m; });
  }
  return manifestLoad;
}

function clip(id) {
  if (!bufs.has(id)) {
    const c = audioContext();
    bufs.set(id, !c ? Promise.resolve(null) : fetch(`voice/${id}.ogg`)
      .then((r) => (r.ok ? r.arrayBuffer() : null))
      .then((ab) => (ab ? c.decodeAudioData(ab) : null))
      .catch(() => null));
  }
  return bufs.get(id);
}

export function preloadVoice(ids) {
  if (!enabled()) return;
  ensureManifest().then((m) => { if (m) ids.forEach((id) => { if (m.clips[id]) clip(id); }); });
}

// Random variant of a group ("praise" -> praise_1..praise_8), never the same twice in a row.
export function variant(group) {
  const g = manifest && manifest.groups[group];
  if (!g) return null;
  let i;
  do { i = Math.floor(Math.random() * g.count); } while (g.count > 1 && i === lastPick[group]);
  lastPick[group] = i;
  return `${group}_${g.start + i}`;
}

export function stopVoice() {
  token++;
  playing.forEach((s) => { try { s.stop(); } catch (e) { /* already ended */ } });
  playing = [];
  endAt = 0;
}

export const voiceBusy = () => { const c = audioContext(); return !!c && endAt > c.currentTime; };

// Speak one or more clip ids back to back. Numbers in the list are silent gaps in seconds.
// interrupt:false queues the speech after whatever is already playing.
// Resolves with the audio length in ms (0 if nothing was played).
export async function say(items, { interrupt = true, vol = 1 } = {}) {
  if (!enabled()) return 0;
  const c = audioContext();
  const m = await ensureManifest();
  if (!c || !m) return 0;
  const list = (Array.isArray(items) ? items : [items]).filter((x) => x != null);
  if (list.some((x) => typeof x === 'string' && !m.clips[x])) return 0;   // never speak half a sentence
  const my = interrupt ? ++token : token;
  if (interrupt) stopVoice(), token = my;
  const decoded = await Promise.all(list.map((x) => (typeof x === 'string' ? clip(x) : x)));
  if (my !== token || decoded.some((b) => b === null)) return 0;
  let t = Math.max(c.currentTime + 0.03, interrupt ? 0 : endAt);
  const start = t;
  for (const b of decoded) {
    if (typeof b === 'number') { t += b; continue; }
    const src = c.createBufferSource();
    src.buffer = b;
    const g = c.createGain();
    g.gain.value = vol;
    src.connect(g); g.connect(voiceDestination());
    src.start(t);
    src.onended = () => { playing = playing.filter((s) => s !== src); };
    playing.push(src);
    t += b.duration + 0.02;
  }
  endAt = t;
  duckMusic(Math.max(0, (t - c.currentTime) * 1000) + 250);
  return Math.round((t - start) * 1000);
}

export const sayRandom = (group, opts) => { const id = variant(group); return id ? say(id, opts) : Promise.resolve(0); };

// "שלוש ועוד ארבע, כמה זה?"  /  "שבע פחות שתיים, כמה זה?"  /  "ארבע ועוד כמה שווה עשר?"
export function questionClips(q) {
  if (q.skill === 'bond10') return [`n_${q.a}`, 0.04, 'op_bond'];
  if (q.skill === 'sub10') return [`n_${q.a}`, 0.05, 'op_minus', 0.05, `n_${q.b}`, 0.14, 'op_howmuch'];
  return [`n_${q.a}`, 0.05, 'op_plus', 0.05, `n_${q.b}`, 0.14, 'op_howmuch'];
}
export const sayQuestion = (q, opts = { interrupt: true }) => say(questionClips(q), opts);
export const sayAnswer = (n, opts) => say(`a_${n}`, opts);

// The numbers and operators the battle needs right away, so the first question is not delayed.
export const warmUpVoice = () => preloadVoice([...Array.from({ length: 21 }, (_, i) => `n_${i}`), 'op_plus', 'op_minus', 'op_howmuch', 'op_bond']);
