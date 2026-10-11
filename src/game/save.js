import { WORLDS, SKILLS } from './data.js';
const KEY = 'ninja-math-save-v1';

function fresh() {
  return {
    coins: 0,
    owned: { kage: true, auto: true, none: true, blades: true },
    eq: { fighter: 'kage', weapon: 'auto', aura: 'none', special: 'blades' },
    wlv: {},
    seen: {},
    level: 0,
    earnedBelt: 0,
    hist: [],
    skills: {},
    version: 3,
    stats: {},
    unlocked: 1,
    stars: Array(WORLDS.length).fill(0),
    settings: { hints: true, speed: false, sound: true, music: true, voice: true },
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
      data.owned = Object.assign({ blades: true }, data.owned);
      // Preserve old stars, coins and inventory. Mastered skills also prove an earned belt.
      const mastered = SKILLS.reduce((highest, skill, i) => data.skills?.[skill.id]?.phase === 'mastered' ? Math.max(highest, Math.min(i + 1, SKILLS.length - 1)) : highest, 0);
      data.earnedBelt = Math.min(SKILLS.length - 1, Math.max(Number.isInteger(data.earnedBelt) ? data.earnedBelt : 0, Number.isInteger(data.level) ? data.level : 0, mastered));
      data.stars = Array.from({ length: WORLDS.length }, (_, i) => Math.max(0, Math.min(3, Number(saved.stars?.[i]) || 0)));
      data.unlocked = Math.max(1, Math.min(WORLDS.length, Number.isInteger(data.unlocked) ? data.unlocked : 1));
      // Finishing the old final world used to cap unlocked at 12. Its saved stars
      // now open the first new route without making the child replay that boss.
      let completed = 0;
      while (completed < WORLDS.length && data.stars[completed] > 0) completed++;
      data.unlocked = Math.max(data.unlocked, Math.min(WORLDS.length, completed + 1));
      data.version = 3;
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
