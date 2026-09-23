import Scene from '../art/Scene.js';
import Fighter from '../art/Fighter.js';
import Enemy from '../art/Enemy.js';
import Warlord from '../art/Warlord.js';
import TreasureChest from '../art/TreasureChest.js';
import FX from '../art/FX.js';
import { FOES, WORLDS, FIGHTERS, HITS, SKILLS, MAX_HEARTS } from '../game/data.js';
import { load, update } from '../game/save.js';
import { makeQuestion, record } from '../game/learning.js';
import { sfx, haptic } from '../audio.js';
import { coin, heart, belt, star, replay } from '../ui.js';

const LINES = [
  { y: 120, w: 180, h: 2, o: 0.35, d: 0 }, { y: 170, w: 120, h: 3, o: 0.25, d: -0.12 },
  { y: 210, w: 220, h: 2, o: 0.3, d: -0.25 }, { y: 250, w: 140, h: 2, o: 0.2, d: -0.05 },
  { y: 290, w: 200, h: 3, o: 0.3, d: -0.3 }, { y: 320, w: 110, h: 2, o: 0.25, d: -0.18 },
  { y: 90, w: 160, h: 2, o: 0.2, d: -0.36 }
];
const SPEED_SECONDS = 10;

export default function battle(root, { go, params }) {
  const save = load();
  const worldIdx = Math.min(params.world ?? 0, WORLDS.length - 1);
  const W = WORLDS[worldIdx];
  const heroKind = save.eq.fighter;
  const hero = FIGHTERS.find((f) => f.id === heroKind) || FIGHTERS[0];
  const timers = [];
  const later = (ms, fn) => { const t = setTimeout(fn, ms); timers.push(t); return t; };

  const S = {
    enc: 0, phase: 'run', hp: 1, hearts: MAX_HEARTS, combo: 0, maxCombo: 0, energy: 0,
    q: null, wrong: [], tries: 0, hint: true, earned: 0, answered: 0, firstOk: 0, special: false, hitText: '', gain: 0, aura: 'none', timerId: null
  };
  const foeKey = () => W.path[S.enc];
  const foe = () => FOES[foeKey()];

  root.innerHTML = `
  <div class="battle" style="position:absolute;inset:0;">
    <div id="stageFx" style="position:absolute;inset:0;">
      <div id="scene" style="position:absolute;left:0;top:0;">${Scene({ world: W.id, moving: true })}</div>
      <div id="speed" style="position:absolute;inset:0;overflow:hidden;pointer-events:none;">${LINES.map((l) => `<div class="speed-line" style="position:absolute;left:0;top:${l.y}px;width:${l.w}px;height:${l.h}px;border-radius:2px;background:#FFFFFF;opacity:${l.o};animation-delay:${l.d}s;"></div>`).join('')}</div>
      <div id="foe"></div>
      <div id="heroMove" style="position:absolute;right:70px;bottom:50px;width:200px;height:220px;">
        <div style="width:200px;height:220px;transform:scaleX(-1) scale(0.8);transform-origin:50% 100%;">
          <div id="heroPose" class="pose-run"></div>
        </div>
      </div>
      <div id="fx" style="position:absolute;inset:0;pointer-events:none;"></div>
    </div>
    <div id="flash" style="position:absolute;inset:0;pointer-events:none;"></div>
    <div id="hud"></div>
    <div id="belt"></div>
    <div id="combo"></div>
    <div id="panel"></div>
    <div id="choices"></div>
    <div id="float"></div>
    <div id="toast"></div>
    <div id="overlay"></div>
  </div>`;
  const $ = (id) => root.querySelector('#' + id);

  // ---------- rendering ----------
  function renderHero() {
    $('heroPose').innerHTML = Fighter({ kind: heroKind, weapon: save.eq.weapon, aura: S.aura });
  }
  function setAura(a) { if (a !== S.aura) { S.aura = a; renderHero(); } }

  function renderFoe() {
    const f = foe();
    let html = '';
    if (f.type === 'enemy') html = `<div id="foeMove" style="position:absolute;left:50px;bottom:50px;width:200px;height:220px;"><div id="foePose" class="pose-idle" style="width:200px;height:220px;transform:scale(0.8);transform-origin:50% 100%;">${Enemy({ kind: foeKey() })}</div></div>`;
    else if (f.type === 'boss') html = `<div id="foeMove" style="position:absolute;left:0;bottom:44px;width:300px;height:300px;"><div id="foePose" class="pose-idle" style="width:300px;height:300px;transform:scale(0.85);transform-origin:50% 100%;">${Warlord({ kind: foeKey() })}</div></div>`;
    else html = `<div id="foeMove" style="position:absolute;left:70px;bottom:52px;width:180px;height:150px;"><div id="foePose">${TreasureChest({ open: false })}</div></div>`;
    $('foe').innerHTML = html;
  }
  const foeMove = (cls) => replay($('foeMove'), '', cls);
  const heroMove = (cls) => replay($('heroMove'), '', cls);
  const heroPose = (cls) => { $('heroPose').className = cls; };

  function portrait() {
    const f = foe();
    if (f.type === 'chest') return `<div style="position:absolute;left:-2px;top:2px;width:180px;height:150px;transform:scale(0.24);transform-origin:0 0;">${TreasureChest({ open: false })}</div>`;
    const art = f.type === 'boss' ? Warlord({ kind: foeKey() }) : Enemy({ kind: foeKey() });
    const size = f.type === 'boss' ? 300 : 200;
    return `<div style="position:absolute;left:${f.p[0]}px;top:${f.p[1]}px;width:${size}px;height:${size === 300 ? 300 : 220}px;transform:scale(${f.p[2]});transform-origin:0 0;">${art}</div>`;
  }

  function renderHud() {
    const f = foe();
    const line = f.type === 'boss' ? '#9775FA' : f.type === 'chest' ? '#F5B82E' : '#E63946';
    const hpW = Math.floor(150 / f.hp) - 3;
    $('hud').innerHTML = `
    <div style="position:absolute;top:8px;left:12px;right:12px;height:50px;display:flex;align-items:center;gap:10px;">
      <div style="width:262px;height:50px;box-sizing:border-box;display:flex;align-items:center;gap:8px;padding:0 8px 0 18px;background:rgba(11,11,20,.86);border:2px solid #F5B82E;clip-path:polygon(0 0,100% 0,100% 100%,14px 100%);">
        <div style="width:40px;height:40px;flex-shrink:0;position:relative;overflow:hidden;background:#1E2238;border:2px solid #F5B82E;box-sizing:border-box;transform:scaleX(-1);">
          <div style="position:absolute;left:-84px;top:-34px;width:200px;height:220px;transform:scale(0.9);transform-origin:0 0;">${Fighter({ kind: heroKind, weapon: 'auto', aura: 'none' })}</div>
        </div>
        <div style="flex-grow:1;display:flex;flex-direction:column;gap:3px;">
          <div style="display:flex;align-items:center;gap:6px;">
            <span class="num" style="font-size:15px;line-height:1;">${hero.name}</span>
            <span id="hearts" style="display:flex;gap:1px;" aria-label="${S.hearts} לבבות">${Array.from({ length: MAX_HEARTS }, (_, i) => `<span data-h="${i}" style="display:inline-flex;">${heart(i < S.hearts, 17)}</span>`).join('')}</span>
          </div>
          <div style="display:flex;align-items:center;gap:4px;" aria-label="מד צ׳י">
            <span class="num" style="font-size:11px;color:#22D3EE;">צ׳י</span>
            ${[0, 1, 2, 3].map((i) => `<span class="${S.energy >= 4 ? 'glow' : ''}" style="width:30px;height:9px;transform:skewX(-20deg);background:${i < S.energy ? '#22D3EE' : '#1E2238'};border:1px solid #22D3EE;"></span>`).join('')}
          </div>
        </div>
      </div>
      <div style="flex-grow:1;display:flex;flex-direction:column;align-items:center;gap:3px;">
        <span class="num" style="font-size:13px;color:#F5B82E;text-shadow:0 1px 2px #000;">עולם ${worldIdx + 1} · ${W.name}</span>
        <div style="display:flex;align-items:center;gap:10px;">${W.path.map((k, i) => `<span class="${i === S.enc ? 'pulse' : ''}" style="width:${FOES[k].type === 'boss' ? 18 : 13}px;height:${FOES[k].type === 'boss' ? 18 : 13}px;transform:rotate(45deg);background:${i < S.enc ? '#F5B82E' : i === S.enc ? '#E63946' : '#1E2238'};border:2px solid ${i === S.enc ? '#FFFFFF' : '#F5B82E'};box-sizing:border-box;box-shadow:0 0 0 2px #0B0B14;"></span>`).join('')}</div>
      </div>
      <div style="width:250px;height:50px;box-sizing:border-box;display:flex;align-items:center;gap:8px;padding:0 18px 0 8px;background:rgba(11,11,20,.86);border:2px solid ${line};clip-path:polygon(0 0,100% 0,calc(100% - 14px) 100%,0 100%);">
        <div style="flex-grow:1;display:flex;flex-direction:column;align-items:flex-end;gap:3px;">
          <span class="num" style="font-size:15px;line-height:1;">${f.name}</span>
          <div style="display:flex;gap:3px;" aria-label="חיים של היריב">${Array.from({ length: f.hp }, (_, i) => `<span style="width:${hpW}px;height:9px;transform:skewX(20deg);background:${i < S.hp ? line : '#2A1216'};border:1px solid ${line};"></span>`).join('')}</div>
        </div>
        <div style="width:40px;height:40px;flex-shrink:0;position:relative;overflow:hidden;background:#2A1216;border:2px solid ${line};box-sizing:border-box;">${portrait()}</div>
      </div>
    </div>`;
  }

  function renderBelt() {
    const s = load();
    const lv = SKILLS[s.level];
    const good = s.hist.filter(Boolean).length;
    $('belt').innerHTML = `
    <div style="position:absolute;top:64px;left:12px;right:12px;height:32px;display:flex;align-items:center;gap:8px;">
      <div class="chip">${belt(lv.color)}<span class="num" style="font-size:13px;">חגורה ${lv.belt} · ${lv.name}</span>
        <span style="display:flex;gap:2px;" aria-label="התקדמות לחגורה הבאה">${[0, 1, 2, 3, 4].map((i) => star(i < good ? '#F5B82E' : '#3A3F5C', 14)).join('')}</span></div>
      <div style="flex-grow:1;"></div>
      <div class="chip">${coin(20)}<span class="num" style="font-size:16px;color:#F5B82E;">${s.coins}</span></div>
      <button id="pause" class="btn-icon" aria-label="השהיה" style="border-color:#F8F9FA;">
        <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5 V19 M16 5 V19" stroke="#F8F9FA" stroke-width="3.5" stroke-linecap="round"></path></svg>
      </button>
    </div>`;
    $('pause').onclick = openPause;
  }

  function renderCombo() {
    const show = S.combo >= 2 && S.phase !== 'run';
    $('combo').innerHTML = show ? `
      <div class="pop-in" style="position:absolute;right:64px;top:104px;display:flex;flex-direction:column;align-items:center;transform:rotate(-6deg);">
        <span dir="ltr" class="title-xl" style="font-size:64px;color:#F5B82E;text-shadow:3px 3px 0 #B42318,-2px -2px 0 #0B0B14,2px -2px 0 #0B0B14,-2px 2px 0 #0B0B14;">x${S.combo}</span>
        <span class="num" style="font-size:15px;color:#FFFFFF;background:#B42318;padding:0 10px;transform:skewX(-12deg);">קומבו!</span>
      </div>` : '';
  }

  function dotsHtml(q) {
    const orb = (d) => `<span style="position:relative;width:16px;height:16px;box-sizing:border-box;border-radius:50%;background:${d.fill};border:2px ${d.line} #F8F9FA;opacity:${d.op ?? 1};box-shadow:0 0 6px ${d.glow ?? d.fill};">${d.cross ? '<svg width="16" height="16" viewBox="0 0 16 16" style="position:absolute;left:-2px;top:-2px;"><path d="M3 3 L13 13 M13 3 L3 13" stroke="#FFFFFF" stroke-width="2.5" stroke-linecap="round"></path></svg>' : ''}</span>`;
    if (q.tenFrame) {
      const fill = 10 - q.a;
      const frame = Array.from({ length: 10 }, (_, i) => orb(i < q.a ? { fill: '#FF4D5E', line: 'solid' } : { fill: '#22D3EE', line: 'solid' })).join('');
      const rest = Array.from({ length: q.b - fill }, () => orb({ fill: '#22D3EE', line: 'solid' })).join('');
      return `<div style="display:grid;grid-template-columns:repeat(5,16px);gap:4px;padding:4px;border:2px solid #F5B82E;">${frame}</div><span class="num" style="font-size:18px;">+</span><div style="display:grid;grid-template-columns:repeat(5,16px);gap:4px;">${rest}</div><span dir="rtl" style="font-size:12px;color:#B9C0D8;">10 ועוד ${q.b - fill}</span>`;
    }
    const cols = (n) => Math.max(1, Math.min(5, n));
    const a = `<div style="display:grid;grid-template-columns:repeat(${cols(q.dotsA.length)},16px);gap:5px;">${q.dotsA.map(orb).join('')}</div>`;
    const b = q.dotsB.length ? `<span class="num" style="font-size:20px;">+</span><div style="display:grid;grid-template-columns:repeat(${cols(q.dotsB.length)},16px);gap:5px;">${q.dotsB.map(orb).join('')}</div>` : '';
    return a + b;
  }

  function renderPanel(pop) {
    const q = S.q;
    const ph = S.phase;
    if (!q || ph === 'run' || ph === 'defeat') { $('panel').innerHTML = ''; return; }
    const f = foe();
    const done = ph === 'hit' || ph === 'special' || ph === 'ko';
    const isBoss = f.type === 'boss', isChest = f.type === 'chest';
    let msg = isChest ? 'פתרו כדי לפרוץ את התיבה!' : isBoss ? `מכה ${f.hp - S.hp + 1} מתוך ${f.hp} — קדימה!` : 'פתרו כדי לתקוף!';
    let color = '#F8F9FA';
    if (S.energy >= 4 && !isChest) { msg = 'מתקפה מיוחדת מוכנה!'; color = '#22D3EE'; }
    if (ph === 'counter' || ph === 'oops') { msg = S.hearts > 0 ? 'אאוץ׳! נסו שוב' : 'הובסת...'; color = '#FF8787'; }
    if (done) { msg = S.hitText; color = '#F5B82E'; }
    const line = ph === 'counter' || ph === 'oops' ? '#E63946' : S.energy >= 4 && !isChest ? '#22D3EE' : '#F5B82E';
    const x = isBoss ? 300 : 258, w = isBoss ? 350 : 380;
    const speed = load().settings.speed && (ph === 'ask' || ph === 'oops');
    $('panel').innerHTML = `
    <div class="panel-frame ${pop ? 'pop-in' : ''}" style="position:absolute;top:102px;left:${x}px;width:${w}px;background:${line};">
      <div class="panel-body" style="padding:8px 26px 10px;display:flex;flex-direction:column;align-items:center;gap:5px;">
        <div style="width:100%;display:flex;align-items:center;gap:8px;">
          <span class="num" style="padding:2px 10px;background:${isBoss ? '#7048E8' : isChest ? '#C98A12' : '#B42318'};color:#FFFFFF;font-size:12px;white-space:nowrap;transform:skewX(-12deg);">${f.name}</span>
          <span class="num" style="flex-grow:1;font-size:15px;color:${color};">${msg}</span>
          ${speed ? `<svg width="30" height="30" viewBox="0 0 44 44" aria-label="זמן"><circle cx="22" cy="22" r="20" fill="none" stroke="#1E2238" stroke-width="5"></circle><circle cx="22" cy="22" r="20" fill="none" stroke="#FCC419" stroke-width="5" stroke-dasharray="126" transform="rotate(-90 22 22)" style="animation:timerRun ${SPEED_SECONDS}s linear both;"></circle></svg>` : ''}
          <button id="hintBtn" aria-label="רמז: הצג נקודות" style="width:44px;height:44px;flex-shrink:0;margin:-6px 0;border-radius:50%;border:2px solid #F5B82E;background:${S.hint ? '#F5B82E' : '#12152A'};display:flex;align-items:center;justify-content:center;cursor:pointer;padding:0;">
            <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true"><path d="M2 12 Q12 3 22 12 Q12 21 2 12 Z" fill="none" stroke="${S.hint ? '#0B0B14' : '#F5B82E'}" stroke-width="2" stroke-linejoin="round"></path><circle cx="12" cy="12" r="3.5" fill="${S.hint ? '#0B0B14' : '#F5B82E'}"></circle></svg>
          </button>
        </div>
        <div dir="ltr" class="num" style="display:flex;align-items:center;gap:10px;font-size:48px;line-height:1.1;color:#FFFFFF;">
          ${q.parts.map((t) => t === '?' ? `<span class="tok tok-ans ${done ? 'tok-done' : ''}">${done ? q.ans : '?'}</span>` : `<span class="tok">${t}</span>`).join('')}
        </div>
        ${S.hint ? `<div dir="ltr" style="display:flex;align-items:center;justify-content:center;gap:12px;padding:5px 12px;background:#0B0B14;border:1px solid #2E3350;">${dotsHtml(q)}</div>` : ''}
      </div>
    </div>`;
    $('hintBtn').onclick = () => { S.hint = !S.hint; sfx('tap'); renderPanel(false); };
  }

  function renderChoices() {
    const q = S.q;
    const ph = S.phase;
    if (!q || ph === 'run' || ph === 'defeat' || ph === 'clear') { $('choices').innerHTML = ''; return; }
    const done = ph === 'hit' || ph === 'special' || ph === 'ko';
    $('choices').innerHTML = `
    <div style="position:absolute;left:0;right:0;bottom:12px;display:flex;justify-content:center;gap:22px;">
      ${q.choices.map((v) => {
        const bad = S.wrong.includes(v);
        const cls = 'ans' + (bad ? ' ans-wrong' : '') + (done && v === q.ans ? ' ans-right' : '');
        const off = bad || done || ph === 'counter';
        return `<button class="${cls}" data-v="${v}" ${off ? 'disabled' : ''} aria-label="תשובה ${v}" style="width:104px;height:74px;transform:skewX(-10deg);background:#12152A;border:3px solid #F5B82E;box-shadow:0 5px 0 #7A5A12,0 0 0 3px #0B0B14;color:#FFFFFF;font-family:'Secular One',sans-serif;font-size:44px;cursor:pointer;padding:0;"><span style="display:inline-block;transform:skewX(10deg);">${v}</span></button>`;
      }).join('')}
    </div>`;
    root.querySelectorAll('#choices button').forEach((b) => { b.onpointerdown = (e) => { e.preventDefault(); pick(Number(b.dataset.v)); }; });
  }

  function spawnFx(html, ms) {
    const el = document.createElement('div');
    el.className = 'fx-el';
    el.style.cssText = 'position:absolute;inset:0;';
    el.innerHTML = html;
    $('fx').appendChild(el);
    later(ms, () => el.remove());
  }

  function float(html, ms = 1400) {
    const el = document.createElement('div');
    el.innerHTML = html;
    $('float').appendChild(el);
    later(ms, () => el.remove());
  }

  function toast(title, sub, color) {
    $('toast').innerHTML = `
    <div class="toast" style="position:absolute;top:262px;left:50%;margin-left:-170px;width:340px;box-sizing:border-box;padding:8px 16px;display:flex;align-items:center;gap:12px;background:#12152A;border:2px solid #F5B82E;box-shadow:0 0 20px rgba(245,184,46,.5);z-index:5;">
      ${belt(color, 46, 24)}
      <div style="display:flex;flex-direction:column;"><span class="num" style="font-size:18px;color:#F5B82E;">${title}</span><span style="font-size:14px;color:#D0D4E4;">${sub}</span></div>
    </div>`;
    later(3100, () => { $('toast').innerHTML = ''; });
  }

  function flash(color) {
    $('flash').innerHTML = color === 'red' ? '<div class="red-flash"></div>' : '<div class="flash" style="position:absolute;inset:0;background:#FFFFFF;animation-delay:.18s;"></div>';
    later(700, () => { $('flash').innerHTML = ''; });
  }

  function shake() { replay($('stageFx'), '', 'shake'); }

  // ---------- flow ----------
  function run(enc) {
    clearTimeout(S.timerId);
    S.enc = enc; S.phase = 'run'; S.q = null; S.wrong = []; S.tries = 0; S.hp = foe().hp;
    $('scene').className = '';
    $('speed').style.display = '';
    renderFoe();
    foeMove('enc-enter');
    heroPose('pose-run');
    heroMove('');
    renderHud(); renderBelt(); renderCombo(); renderPanel(); renderChoices();
    if (enc === 0) {
      $('overlay').innerHTML = `<div class="banner" style="position:absolute;top:150px;right:150px;padding:8px 40px;background:#0B0B14;border-top:3px solid #F5B82E;border-bottom:3px solid #F5B82E;"><div class="num" style="font-size:14px;color:#F5B82E;transform:skewX(12deg);">עולם ${worldIdx + 1}</div><div class="title-xl" style="font-size:58px;color:#FFFFFF;transform:skewX(12deg);">${W.name}</div></div>`;
      later(1900, () => { if (S.phase === 'run') $('overlay').innerHTML = ''; });
    }
    sfx('whoosh');
    later(1900, ask);
  }

  function ask() {
    const s = load();
    S.phase = 'ask'; S.q = makeQuestion(s.level); S.wrong = []; S.tries = 0; S.hint = s.settings.hints && s.level <= 1;
    $('scene').className = 'paused';
    $('speed').style.display = 'none';
    $('overlay').innerHTML = '';
    heroPose('pose-idle');
    foeMove('');
    renderPanel(true); renderChoices(); renderCombo();
    armTimer();
  }

  function armTimer() {
    clearTimeout(S.timerId);
    if (!load().settings.speed) return;
    S.timerId = later(SPEED_SECONDS * 1000, () => { if (S.phase === 'ask' || S.phase === 'oops') miss(null); });
  }

  function pick(v) {
    if (!S.q || (S.phase !== 'ask' && S.phase !== 'oops') || S.wrong.includes(v)) return;
    clearTimeout(S.timerId);
    sfx('tap');
    if (v === S.q.ans) hitFoe();
    else miss(v);
  }

  function hitFoe() {
    const f = foe();
    const first = S.tries === 0;
    S.answered += 1;
    if (first) S.firstOk += 1;
    const res = first ? record(S.q, true) : { levelUp: null };
    const special = first && S.energy >= 4 && f.type !== 'chest';
    const dmg = special ? (f.type === 'boss' ? 2 : f.hp) : 1;
    S.gain = (first ? f.reward : Math.ceil(f.reward / 2)) * (special ? 2 : 1);
    S.combo = first ? S.combo + 1 : 1;
    S.maxCombo = Math.max(S.maxCombo, S.combo);
    S.energy = special ? 0 : Math.min(4, S.energy + (first ? 1 : 0));
    S.hp = Math.max(0, S.hp - dmg);
    S.earned += S.gain;
    S.special = special;
    S.hitText = special ? hero.special : f.type === 'chest' ? 'נפרץ!' : HITS[Math.floor(Math.random() * HITS.length)];
    update((s) => { s.coins += S.gain; });
    if (res.levelUp) { later(900, () => { toast('חגורה ' + res.levelUp.belt + '!', 'שלב חדש: ' + res.levelUp.name, res.levelUp.color); sfx('levelup'); }); }
    if (special) {
      S.phase = 'special';
      renderPanel(); renderChoices();
      setAura('storm');
      sfx('special'); haptic('heavy');
      $('overlay').innerHTML = `
        <div class="dim" style="position:absolute;inset:0;background:rgba(11,11,20,.72);"></div>
        <div class="cutin" style="position:absolute;left:-60px;right:-60px;top:120px;height:160px;overflow:hidden;background:#B42318;border-top:4px solid #F5B82E;border-bottom:4px solid #F5B82E;">
          ${LINES.map((l, i) => `<div class="speed-line" style="position:absolute;left:0;top:${10 + i * 20}px;width:${l.w}px;height:3px;background:#FF8787;opacity:.7;animation-delay:${l.d}s;"></div>`).join('')}
          <div style="position:absolute;right:120px;top:-40px;width:200px;height:220px;transform:scaleX(-1) scale(1.55);transform-origin:50% 0;"><div class="pose-idle">${Fighter({ kind: heroKind, weapon: save.eq.weapon, aura: 'storm' })}</div></div>
          <div style="position:absolute;left:150px;top:20px;transform:skewY(6deg);"><div class="num" style="font-size:18px;color:#F5B82E;">מתקפה מיוחדת</div><div class="title-xl" style="font-size:92px;color:#FFFFFF;text-shadow:4px 4px 0 #0B0B14;">${hero.special}</div></div>
        </div>`;
      later(1700, () => { $('overlay').innerHTML = ''; strike(); });
    } else {
      strike();
    }
  }

  function strike() {
    const f = foe();
    const isBoss = f.type === 'boss', isChest = f.type === 'chest';
    S.phase = 'hit';
    renderPanel(); renderChoices(); renderCombo(); renderHud();
    if (isChest) {
      heroPose('pose-win');
      $('foePose').innerHTML = TreasureChest({ open: true });
      sfx('coin'); haptic('light');
      if (S.hearts < MAX_HEARTS) {
        S.hearts += 1;
        later(400, () => { renderHud(); const h = root.querySelector(`#hearts [data-h="${S.hearts - 1}"]`); if (h) h.className = 'heart-gain'; sfx('heart'); });
        float(`<div class="gain" style="position:absolute;left:180px;top:150px;display:flex;align-items:center;gap:4px;">${heart(true, 30)}<span class="num" style="font-size:24px;color:#FF8787;">+1</span></div>`);
      }
    } else {
      heroPose('pose-attack');
      heroMove(isBoss ? 'hero-dash-boss' : 'hero-dash');
      sfx('slash');
      later(220, () => { sfx('hit'); haptic('medium'); shake(); flash('white'); });
      foeMove('enc-hurt');
      const fx = isBoss ? { x: 30, y: 100, ix: 80, iy: 170 } : { x: 20, y: 130, ix: 70, iy: 200 };
      spawnFx(`<div style="position:absolute;left:${fx.x}px;top:${fx.y}px;width:240px;height:240px;"><div class="fx-slash" style="width:240px;height:240px;transform-origin:50% 50%;">${FX({ kind: S.special ? 'special' : 'slash', color: S.special ? '#E63946' : '#22D3EE' })}</div></div>
        <div style="position:absolute;left:${fx.ix}px;top:${fx.iy}px;width:240px;height:240px;transform:scale(0.55);transform-origin:0 0;"><div class="fx-burst" style="width:240px;height:240px;transform-origin:50% 50%;animation-delay:.18s;">${FX({ kind: 'impact', color: '#F5B82E' })}</div></div>`, 900);
    }
    float(`<div class="hit-text" style="position:absolute;left:60px;top:150px;font-family:'Karantina',sans-serif;font-weight:700;font-size:60px;line-height:1;color:#FFFFFF;text-shadow:3px 3px 0 #B42318,-2px -2px 0 #0B0B14,2px -2px 0 #0B0B14,-2px 2px 0 #0B0B14;">${S.hitText}</div>
      <div class="gain" style="position:absolute;left:190px;top:206px;display:flex;align-items:center;gap:4px;">${coin(26)}<span dir="ltr" class="num" style="font-size:26px;color:#F5B82E;text-shadow:0 2px 0 #0B0B14;">+${S.gain}</span></div>`);
    later(500, () => sfx('coin'));
    later(1150, after);
  }

  function after() {
    const f = foe();
    renderBelt();
    setAura(S.energy >= 4 ? 'ice' : 'none');
    if (S.hp > 0) { ask(); return; }
    S.phase = 'ko';
    if (f.type !== 'chest') {
      foeMove('enc-ko');
      spawnFx(`<div style="position:absolute;left:${f.type === 'boss' ? 80 : 70}px;top:${f.type === 'boss' ? 170 : 200}px;width:240px;height:240px;transform:scale(0.7);transform-origin:0 0;"><div class="fx-burst" style="width:240px;height:240px;transform-origin:50% 50%;">${FX({ kind: 'smoke', color: '#4A4560' })}</div></div>`, 900);
    }
    heroPose('pose-idle');
    later(f.type === 'chest' ? 500 : 800, () => {
      if (f.type === 'boss') victory();
      else run(S.enc + 1);
    });
  }

  function miss(v) {
    const f = foe();
    const first = S.tries === 0;
    if (first) record(S.q, false);
    S.answered += first ? 1 : 0;
    if (v !== null) S.wrong = S.wrong.concat([v]);
    S.tries += 1;
    S.hint = true;
    S.combo = 0;
    S.phase = 'counter';
    renderPanel(); renderChoices(); renderCombo();
    if (f.type === 'chest') {
      // A locked chest can't hit back: it just stays shut.
      sfx('block');
      replay($('foeMove'), '', 'enc-hurt');
      later(600, () => { S.phase = 'oops'; renderPanel(); renderChoices(); armTimer(); });
      return;
    }
    foeMove(f.type === 'boss' ? 'enc-attack-boss' : 'enc-attack');
    replay($('foePose'), '', 'pose-attack');
    sfx('whoosh');
    later(320, () => {
      S.hearts -= 1;
      sfx('hurt'); haptic('heavy');
      heroPose('pose-hurt');
      flash('red'); shake();
      renderHud();
      const lost = root.querySelector(`#hearts [data-h="${S.hearts}"]`);
      if (lost) lost.className = 'heart-lose';
      spawnFx(`<div style="position:absolute;right:170px;top:180px;width:240px;height:240px;transform:scale(0.5);transform-origin:100% 0;"><div class="fx-burst" style="width:240px;height:240px;transform-origin:50% 50%;">${FX({ kind: 'impact', color: '#E63946' })}</div></div>`, 800);
    });
    later(900, () => {
      $('foePose').className = 'pose-idle';
      if (S.hearts <= 0) { defeat(); return; }
      heroPose('pose-idle');
      S.phase = 'oops';
      renderPanel(); renderChoices();
      armTimer();
    });
  }

  function defeat() {
    S.phase = 'defeat';
    clearTimeout(S.timerId);
    renderPanel(); renderChoices(); renderCombo();
    heroPose('pose-down');
    sfx('lose');
    $('overlay').innerHTML = `
      <div style="position:absolute;inset:0;background:rgba(40,0,8,.55);"></div>
      <div class="defeat" style="position:absolute;left:0;right:0;top:110px;display:flex;flex-direction:column;align-items:center;">
        <span class="title-xl" style="font-size:140px;color:#E63946;text-shadow:5px 5px 0 #0B0B14,-3px -3px 0 #0B0B14,3px -3px 0 #0B0B14,-3px 3px 0 #0B0B14;">הובסת!</span>
      </div>`;
    later(2000, () => go('result', { world: worldIdx, won: false, earned: S.earned, answered: S.answered, firstOk: S.firstOk, maxCombo: S.maxCombo, stage: S.enc }));
  }

  function victory() {
    S.phase = 'clear';
    heroPose('pose-win');
    sfx('win');
    const stars = Math.max(1, S.hearts);
    update((s) => {
      s.stars[worldIdx] = Math.max(s.stars[worldIdx] || 0, stars);
      s.unlocked = Math.max(s.unlocked, Math.min(WORLDS.length, worldIdx + 2));
    });
    $('overlay').innerHTML = `
      <div style="position:absolute;inset:0;background:rgba(11,11,20,.6);"></div>
      <div class="victory" style="position:absolute;left:0;right:0;top:96px;display:flex;flex-direction:column;align-items:center;">
        <span class="title-xl" style="font-size:150px;color:#F5B82E;text-shadow:5px 5px 0 #B42318,-3px -3px 0 #0B0B14,3px -3px 0 #0B0B14,-3px 3px 0 #0B0B14;">ניצחון!</span>
      </div>`;
    later(2200, () => go('result', { world: worldIdx, won: true, stars, earned: S.earned, answered: S.answered, firstOk: S.firstOk, maxCombo: S.maxCombo }));
  }

  // ---------- pause ----------
  let pausedPhase = null;
  function openPause() {
    if (S.phase === 'defeat' || S.phase === 'clear') return;
    sfx('tap');
    clearTimeout(S.timerId);
    pausedPhase = S.phase;
    const box = document.createElement('div');
    box.id = 'pauseBox';
    box.style.cssText = 'position:absolute;inset:0;z-index:20;';
    box.innerHTML = `
      <div style="position:absolute;inset:0;background:rgba(11,11,20,.8);"></div>
      <div style="position:absolute;left:0;right:0;top:90px;display:flex;flex-direction:column;align-items:center;gap:16px;">
        <span class="title-xl" style="font-size:80px;">הפסקה</span>
        <button id="resume" class="btn-main cta"><span class="title-xl unsk" style="font-size:40px;">ממשיכים</span></button>
        <div style="display:flex;gap:12px;">
          <button id="toMap" class="btn-sub"><span class="unsk">למפה</span></button>
          <button id="toTitle" class="btn-sub"><span class="unsk">לתפריט</span></button>
        </div>
      </div>`;
    root.querySelector('.battle').appendChild(box);
    box.querySelector('#resume').onclick = () => { box.remove(); sfx('tap'); if (pausedPhase === 'ask' || pausedPhase === 'oops') armTimer(); };
    box.querySelector('#toMap').onclick = () => go('map');
    box.querySelector('#toTitle').onclick = () => go('title');
  }

  renderHero();
  run(0);

  return { unmount() { timers.forEach(clearTimeout); clearTimeout(S.timerId); } };
}
