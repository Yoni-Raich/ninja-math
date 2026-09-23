// Procedural sound effects and a light taiko/koto music loop (Web Audio, no sound files).
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { load } from './game/save.js';

let ctx = null;
let master = null;
let musicGain = null;
let musicTimer = null;
let noiseBuf = null;

function ac() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = 0.7;
    master.connect(ctx.destination);
    musicGain = ctx.createGain();
    musicGain.gain.value = 0.22;
    musicGain.connect(master);
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

export function unlockAudio() { ac(); }

function tone(freq, dur, { type = 'sine', vol = 0.3, slide = 0, delay = 0, dest = null } = {}) {
  const c = ac(); if (!c) return;
  const t = c.currentTime + delay;
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq + slide), t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g); g.connect(dest || master);
  o.start(t); o.stop(t + dur + 0.05);
}

function noise(dur, { vol = 0.3, freq = 2000, q = 1, type = 'bandpass', delay = 0, sweep = 0, dest = null } = {}) {
  const c = ac(); if (!c) return;
  const t = c.currentTime + delay;
  const s = c.createBufferSource();
  s.buffer = noiseBuf;
  const f = c.createBiquadFilter();
  f.type = type; f.frequency.setValueAtTime(freq, t); f.Q.value = q;
  if (sweep) f.frequency.exponentialRampToValueAtTime(Math.max(60, freq + sweep), t + dur);
  const g = c.createGain();
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  s.connect(f); f.connect(g); g.connect(dest || master);
  s.start(t, Math.random() * 0.5); s.stop(t + dur + 0.05);
}

const SFX = {
  tap: () => tone(660, 0.07, { type: 'triangle', vol: 0.15 }),
  whoosh: () => noise(0.35, { vol: 0.25, freq: 600, sweep: 3000, q: 0.8 }),
  slash: () => { noise(0.18, { vol: 0.45, freq: 3000, sweep: -2200, q: 1.2 }); tone(1400, 0.12, { type: 'sawtooth', vol: 0.06, slide: -900 }); },
  hit: () => { tone(140, 0.25, { type: 'sine', vol: 0.6, slide: -90 }); noise(0.12, { vol: 0.5, freq: 900, q: 0.7, type: 'lowpass' }); },
  block: () => { tone(1800, 0.25, { type: 'square', vol: 0.08 }); tone(2400, 0.2, { type: 'square', vol: 0.05, delay: 0.02 }); noise(0.08, { vol: 0.3, freq: 5000 }); },
  hurt: () => { tone(220, 0.3, { type: 'sawtooth', vol: 0.25, slide: -140 }); noise(0.2, { vol: 0.4, freq: 400, type: 'lowpass' }); },
  coin: () => { tone(1320, 0.08, { type: 'square', vol: 0.08 }); tone(1760, 0.18, { type: 'square', vol: 0.08, delay: 0.07 }); },
  special: () => { noise(0.9, { vol: 0.35, freq: 300, sweep: 4000, q: 0.6 }); tone(110, 0.9, { type: 'sawtooth', vol: 0.12, slide: 330 }); tone(220, 0.9, { type: 'triangle', vol: 0.12, slide: 660, delay: 0.1 }); },
  levelup: () => [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.25, { type: 'triangle', vol: 0.2, delay: i * 0.09 })),
  win: () => [392, 523, 659, 784, 1047].forEach((f, i) => tone(f, 0.35, { type: 'triangle', vol: 0.22, delay: i * 0.12 })),
  lose: () => [392, 330, 262, 196].forEach((f, i) => tone(f, 0.4, { type: 'triangle', vol: 0.2, delay: i * 0.18 })),
  heart: () => { tone(880, 0.12, { type: 'sine', vol: 0.2 }); tone(1175, 0.2, { type: 'sine', vol: 0.2, delay: 0.1 }); },
  throw: () => { noise(0.25, { vol: 0.3, freq: 2500, sweep: -1500, q: 2 }); tone(900, 0.2, { type: 'triangle', vol: 0.06, slide: 600 }); },
  claw: () => { [0, 0.06, 0.12].forEach((d) => noise(0.08, { vol: 0.35, freq: 4000, sweep: -2500, q: 3, delay: d })); },
  thud: () => { tone(60, 0.45, { vol: 0.8, slide: -30 }); noise(0.3, { vol: 0.5, freq: 250, type: 'lowpass' }); },
  fireball: () => { noise(0.6, { vol: 0.35, freq: 500, sweep: 1500, q: 0.5 }); tone(160, 0.5, { type: 'sawtooth', vol: 0.08, slide: -80 }); },
  ice: () => { [2600, 3300, 2100, 3900].forEach((f, i) => tone(f, 0.15, { type: 'sine', vol: 0.08, delay: i * 0.05 })); noise(0.2, { vol: 0.25, freq: 6000, q: 4 }); },
  laser: () => { tone(1800, 0.3, { type: 'square', vol: 0.07, slide: -1500 }); },
  zap: () => { for (let i = 0; i < 5; i++) noise(0.05, { vol: 0.4, freq: 3000 + Math.random() * 3000, q: 5, delay: i * 0.04 }); tone(80, 0.3, { type: 'sawtooth', vol: 0.12 }); },
  water: () => { [500, 700, 400].forEach((f, i) => tone(f, 0.12, { type: 'sine', vol: 0.12, slide: 400, delay: i * 0.07 })); },
  feather: () => noise(0.35, { vol: 0.25, freq: 1200, sweep: 2000, q: 1 }),
  magic: () => { tone(220, 0.8, { type: 'triangle', vol: 0.12, slide: 660 }); tone(330, 0.8, { type: 'sine', vol: 0.08, slide: 990, delay: 0.05 }); noise(0.8, { vol: 0.15, freq: 800, sweep: 3000 }); },
  roar: () => { tone(90, 1.1, { type: 'sawtooth', vol: 0.25, slide: -40 }); tone(135, 1.1, { type: 'sawtooth', vol: 0.15, slide: -60 }); noise(1.1, { vol: 0.35, freq: 350, q: 0.7, type: 'lowpass' }); },
  tick: () => tone(1500, 0.05, { type: 'square', vol: 0.06 }),
  gong: () => { [98, 196, 293, 415].forEach((f) => tone(f, 2.2, { type: 'sine', vol: 0.12 })); noise(0.4, { vol: 0.15, freq: 900 }); },
  combo: () => [659, 880, 1175].forEach((f, i) => tone(f, 0.12, { type: 'square', vol: 0.06, delay: i * 0.05 }))
};

export function sfx(name) {
  if (!load().settings.sound) return;
  const f = SFX[name];
  if (f) try { f(); } catch (e) { /* audio not available */ }
}

// Music: a taiko pattern with a pentatonic koto line; each world sets its own tempo and scale.
const SCALES = {
  in: [329.6, 349.2, 440, 493.9, 523.3, 659.3, 698.5, 880],
  yo: [293.7, 329.6, 392, 440, 493.9, 587.3, 659.3, 784],
  hira: [440, 493.9, 523.3, 659.3, 698.5, 880, 987.8, 1046.5]
};
let style = { bpm: 100, scale: 'in' };
export function setMusicStyle(next) {
  style = Object.assign({ bpm: 100, scale: 'in' }, next || {});
}
export function startMusic() {
  if (!load().settings.music || musicTimer) return;
  const c = ac(); if (!c) return;
  let step = 0;
  let next = c.currentTime + 0.1;
  const schedule = () => {
    const beat = 60 / style.bpm / 2;
    const scale = SCALES[style.scale] || SCALES.in;
    while (next < c.currentTime + 0.3) {
      const d = next - c.currentTime;
      const bar = step % 16;
      if (bar === 0 || bar === 6 || bar === 8 || bar === 11) tone(70, 0.5, { vol: 0.5, slide: -25, delay: d, dest: musicGain });
      if (bar === 4 || bar === 12) noise(0.12, { vol: 0.25, freq: 1800, q: 1, delay: d, dest: musicGain });
      if (style.bpm >= 110 && bar % 2 === 1) noise(0.04, { vol: 0.08, freq: 7000, q: 1, delay: d, dest: musicGain });
      if (bar % 2 === 0 && Math.random() < 0.55) {
        const f = scale[Math.floor(Math.random() * scale.length)];
        tone(f, 0.6, { type: 'triangle', vol: 0.09, delay: d, dest: musicGain });
        tone(f * 2, 0.25, { type: 'sine', vol: 0.03, delay: d, dest: musicGain });
      }
      step++;
      next += beat;
    }
  };
  musicTimer = setInterval(schedule, 100);
}
export function stopMusic() {
  clearInterval(musicTimer);
  musicTimer = null;
}

export function haptic(kind = 'light') {
  const style = kind === 'heavy' ? ImpactStyle.Heavy : kind === 'medium' ? ImpactStyle.Medium : ImpactStyle.Light;
  Haptics.impact({ style }).catch(() => {});
}
