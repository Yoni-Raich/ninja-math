// Adaptive practice engine (v2): accuracy first, then fluency, then a timed belt fight.
//
// Every first-try answer is logged per skill with its (silently measured) response time.
// Looking at the last WINDOW first-try answers of the current skill:
//   practice  -> needs ACC_NEEDED correct AND FAST_NEEDED of them faster than the skill's target time.
//                Accurate-but-slow keeps practicing (building intuition), no matter how many are correct.
//   challenge -> unlocked when both bars are full: the next boss is a timed "belt fight"
//                (each question has target * CHALLENGE_FACTOR seconds). Beating that boss earns the belt.
//   step back -> DROP_WINDOW recent answers with DROP_MAX or fewer correct: back one skill, silently.
import { SKILLS } from './data.js';
import { load, update, today } from './save.js';

export const WINDOW = 8;
export const ACC_NEEDED = 7;
export const FAST_NEEDED = 6;
export const DROP_WINDOW = 6;
export const DROP_MAX = 2;
export const CHALLENGE_FACTOR = 1.6;
const MAX_MS = 60000;

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
  return { ans, parts, choices: shuffle([ans].concat(near)), dotsA, dotsB, skill: id, tenFrame: id === 'add20' && a < 10 && a + b > 10, a, b };
}

function skillLog(s, id) {
  s.skills = s.skills || {};
  s.skills[id] = s.skills[id] || { log: [], phase: 'practice' };
  return s.skills[id];
}

export function median(xs) {
  if (!xs.length) return 0;
  const a = xs.slice().sort((x, y) => x - y);
  const m = Math.floor(a.length / 2);
  return a.length % 2 ? a[m] : (a[m - 1] + a[m]) / 2;
}

// Progress of the current skill toward its belt: { acc, fast, accNeeded, fastNeeded, phase, targetMs }.
export function progress(s = load()) {
  const sk = SKILLS[s.level];
  const st = (s.skills && s.skills[sk.id]) || { log: [], phase: 'practice' };
  const w = st.log.slice(-WINDOW);
  return {
    acc: w.filter((e) => e.ok).length,
    fast: w.filter((e) => e.ok && e.ms <= sk.targetMs).length,
    accNeeded: ACC_NEEDED, fastNeeded: FAST_NEEDED,
    phase: st.phase, targetMs: sk.targetMs, skill: sk
  };
}

export function isChallenge() { return progress().phase === 'challenge'; }
export function challengeSeconds() { return Math.round((SKILLS[load().level].targetMs * CHALLENGE_FACTOR) / 1000); }

// Records a first-try answer. Returns { challengeUnlocked, levelDown, lostChallenge }.
export function record(q, ok, ms) {
  const result = { challengeUnlocked: false, levelDown: false, lostChallenge: false };
  const time = Math.min(MAX_MS, Math.max(0, Math.round(ms)));
  update((s) => {
    const agg = s.stats[q.skill] || { ok: 0, total: 0, ms: 0, timed: 0 };
    agg.total += 1;
    if (ok) { agg.ok += 1; agg.ms += time; agg.timed += 1; }
    s.stats[q.skill] = agg;
    const d = today();
    const day = s.days[d] || { answered: 0, correct: 0, ms: 0 };
    day.answered += 1;
    if (ok) { day.correct += 1; day.ms = (day.ms || 0) + time; }
    s.days[d] = day;

    const st = skillLog(s, q.skill);
    st.log.push({ ok, ms: time, t: Date.now() });
    if (st.log.length > 60) st.log = st.log.slice(-60);
    if (q.skill !== SKILLS[s.level].id) return;

    const recent = st.log.slice(-DROP_WINDOW);
    if (recent.length >= DROP_WINDOW && recent.filter((e) => e.ok).length <= DROP_MAX) {
      if (st.phase === 'challenge') { st.phase = 'practice'; result.lostChallenge = true; }
      if (s.level > 0) {
        s.level -= 1;
        skillLog(s, SKILLS[s.level].id).phase = 'practice';
        result.levelDown = true;
      }
      return;
    }
    const p = progress(s);
    if (st.phase === 'practice' && st.log.length >= WINDOW && p.acc >= ACC_NEEDED && p.fast >= FAST_NEEDED && s.level < SKILLS.length - 1) {
      st.phase = 'challenge';
      result.challengeUnlocked = true;
    }
  });
  return result;
}

// Called when a timed belt-fight boss is defeated. Returns the new skill (belt).
export function winBelt() {
  let won = null;
  update((s) => {
    const cur = skillLog(s, SKILLS[s.level].id);
    if (cur.phase !== 'challenge' || s.level >= SKILLS.length - 1) return;
    cur.phase = 'mastered';
    s.level += 1;
    skillLog(s, SKILLS[s.level].id).phase = 'practice';
    won = SKILLS[s.level];
  });
  return won;
}

export function currentSkill() { return SKILLS[load().level]; }
