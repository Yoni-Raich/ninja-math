const KEY = 'ninja-math-save-v1';

function fresh() {
  return {
    coins: 0,
    owned: { kage: true, auto: true, none: true },
    eq: { fighter: 'kage', weapon: 'auto', aura: 'none' },
    level: 0,
    hist: [],
    skills: {},
    version: 2,
    stats: {},
    unlocked: 1,
    stars: [0, 0, 0, 0],
    settings: { hints: true, speed: false, sound: true, music: true },
    days: {}
  };
}

let data = null;

export function load() {
  if (data) return data;
  data = fresh();
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const saved = JSON.parse(raw);
      data = Object.assign(fresh(), saved);
      data.settings = Object.assign(fresh().settings, saved.settings || {});
      data.eq = Object.assign(fresh().eq, saved.eq || {});
      // v1 saves leveled up on accuracy alone; restart the belt ladder under the timed rules (coins and items stay).
      if ((saved.version || 1) < 2) { data.level = 0; data.hist = []; data.skills = {}; }
      data.version = 2;
    }
  } catch (e) {
    data = fresh();
  }
  return data;
}

export function save() {
  try { localStorage.setItem(KEY, JSON.stringify(data)); } catch (e) { /* storage unavailable: keep playing in memory */ }
}

export function update(fn) {
  fn(load());
  save();
}

export function reset() {
  data = fresh();
  save();
}

export function today() {
  const d = new Date();
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}
