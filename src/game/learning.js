// Adaptive practice engine.
// Levels are a ladder of skills (belts). Only first-try answers count toward mastery:
//   4 of the last 5 correct  -> next skill (new belt)
//   1 or fewer of the last 4 -> one step back, silently
//   anything else            -> stay and keep practicing
import { SKILLS } from './data.js';
import { load, update, today } from './save.js';

function rnd(a, b) { return a + Math.floor(Math.random() * (b - a + 1)); }
export function shuffle(xs) {
  const a = xs.slice();
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}

let lastKey = '';

export function makeQuestion(level) {
  const id = SKILLS[level].id;
  let a, b, ans, parts, key;
  for (let guard = 0; guard < 8; guard++) {
    if (id === 'add5') { a = rnd(1, 3); b = rnd(1, 5 - a); ans = a + b; parts = [a, '+', b, '=', '?']; }
    else if (id === 'add10') { a = rnd(2, 7); b = rnd(Math.max(1, 6 - a), 10 - a); ans = a + b; parts = [a, '+', b, '=', '?']; }
    else if (id === 'sub10') { a = rnd(4, 10); b = rnd(1, a - 1); ans = a - b; parts = [a, '−', b, '=', '?']; }
    else if (id === 'bond10') { a = rnd(1, 9); b = 10 - a; ans = b; parts = [a, '+', '?', '=', 10]; }
    else { a = rnd(6, 12); b = rnd(Math.max(2, 11 - a), Math.min(9, 20 - a)); ans = a + b; parts = [a, '+', b, '=', '?']; }
    key = parts.join('');
    if (key !== lastKey) break;
  }
  lastKey = key;
  const near = shuffle([ans - 1, ans + 1, ans + 2, ans - 2, ans + 3].filter((n) => n >= 0 && n !== ans && n <= 20)).slice(0, 2);
  const sub = id === 'sub10', bond = id === 'bond10';
  const dotsA = Array.from({ length: a }, (_, i) => ({ fill: '#FF4D5E', line: 'solid', op: sub && i >= a - b ? 0.35 : 1, cross: sub && i >= a - b }));
  const dotsB = sub ? [] : Array.from({ length: b }, () => (bond ? { fill: '#12152A', line: 'dashed', glow: 'transparent' } : { fill: '#22D3EE', line: 'solid', glow: '#22D3EE' }));
  return { ans, parts, choices: shuffle([ans].concat(near)), dotsA, dotsB, skill: id, tenFrame: id === 'add20' && a < 10 && a + b > 10, a, b, started: Date.now() };
}

// Records a first-try result. Returns { levelUp: skill | null, levelDown: bool }.
export function record(q, ok) {
  let result = { levelUp: null, levelDown: false };
  update((s) => {
    const st = s.stats[q.skill] || { ok: 0, total: 0, ms: 0, timed: 0 };
    st.total += 1;
    if (ok) {
      st.ok += 1;
      const ms = Date.now() - q.started;
      if (ms < 60000) { st.ms += ms; st.timed += 1; }
    }
    s.stats[q.skill] = st;
    const d = today();
    const day = s.days[d] || { answered: 0, correct: 0 };
    day.answered += 1;
    if (ok) day.correct += 1;
    s.days[d] = day;

    s.hist = s.hist.concat([ok]).slice(-5);
    const good = s.hist.filter(Boolean).length;
    if (s.hist.length >= 5 && good >= 4 && s.level < SKILLS.length - 1) {
      s.level += 1;
      s.hist = [];
      result.levelUp = SKILLS[s.level];
      return;
    }
    const last4 = s.hist.slice(-4);
    if (last4.length >= 4 && last4.filter(Boolean).length <= 1 && s.level > 0) {
      s.level -= 1;
      s.hist = [];
      result.levelDown = true;
    }
  });
  return result;
}

export function currentSkill() { return SKILLS[load().level]; }
export function masteryPips() { return load().hist.filter(Boolean).length; }
