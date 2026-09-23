import Fighter from '../art/Fighter.js';
import TreasureChest from '../art/TreasureChest.js';
import FX from '../art/FX.js';
import { FOES, WORLDS, FIGHTERS, WEAPONS, SPECIALS, IMAGES, HITS, SKILLS, MAX_HEARTS, weaponStats } from '../game/data.js';
import { foeArt, foePortrait, spritePortrait, foeBox, worldScene, startLayers, setSceneMoving, heroArt } from '../game/art.js';
import { load, update } from '../game/save.js';
import { makeQuestion, record, progress, challengeSeconds, winBelt, recentMedianMs } from '../game/learning.js';
import { sfx, haptic, setMusicStyle, startMusic } from '../audio.js';
import { coin, heart, belt, replay } from '../ui.js';

const LINES = [
  { y: 120, w: 180, h: 2, o: 0.35, d: 0 }, { y: 170, w: 120, h: 3, o: 0.25, d: -0.12 },
  { y: 210, w: 220, h: 2, o: 0.3, d: -0.25 }, { y: 250, w: 140, h: 2, o: 0.2, d: -0.05 },
  { y: 290, w: 200, h: 3, o: 0.3, d: -0.3 }, { y: 320, w: 110, h: 2, o: 0.25, d: -0.18 },
  { y: 90, w: 160, h: 2, o: 0.2, d: -0.36 }
];
const HERO = { x: 745, y: 262 };            // hero chest on the stage
const PROJ_SFX = { feather: 'feather', wisp: 'fireball', water: 'water', snowball: 'throw', fireball: 'fireball', laser: 'laser', bolt: 'zap', shuriken: 'throw', kunai: 'throw', needle: 'throw', sand: 'feather', arrow: 'throw', poison: 'water', crystal: 'ice', star: 'zap' };

function projectileSvg(kind, color) {
  if (kind && kind.startsWith('image:')) {
    const id = kind.slice(6);
    return `<img src="images/${id}.png" alt="" style="width:56px;height:56px;object-fit:contain;" />`;
  }
  switch (kind) {
    case 'shuriken': return `<svg width="46" height="46" viewBox="-24 -24 48 48"><path d="M0 -20 L5 -5 L20 0 L5 5 L0 20 L-5 5 L-20 0 L-5 -5 Z" fill="#C9D3DF" stroke="#0B0B14" stroke-width="2.5"></path><circle r="4" fill="#2A2A36"></circle></svg>`;
    case 'kunai': return `<svg width="60" height="20" viewBox="0 0 60 20"><path d="M2 10 L26 3 L34 10 L26 17 Z" fill="#C9D3DF" stroke="#0B0B14" stroke-width="2"></path><rect x="34" y="7" width="18" height="6" fill="#2A2A36"></rect><circle cx="55" cy="10" r="4" fill="none" stroke="#9AA5B1" stroke-width="2"></circle></svg>`;
    case 'arrow': return `<svg width="70" height="16" viewBox="0 0 70 16"><path d="M4 8 H56" stroke="#8B5A2B" stroke-width="3"></path><path d="M0 8 L12 2 L10 8 L12 14 Z" fill="#C9D3DF" stroke="#0B0B14" stroke-width="1.5"></path><path d="M56 8 L68 2 M56 8 L68 14" stroke="${color}" stroke-width="4"></path></svg>`;
    case 'needle': return `<svg width="44" height="14" viewBox="0 0 44 14"><path d="M2 7 L40 3 L40 11 Z" fill="${color}" stroke="#0B0B14" stroke-width="1.5"></path></svg>`;
    case 'sand': return `<svg width="56" height="40" viewBox="0 0 56 40"><path d="M54 20 Q30 0 6 14 Q20 20 4 26 Q30 40 54 20 Z" fill="#E9C46A" opacity=".85"></path><circle cx="16" cy="12" r="3" fill="#C9A227"></circle><circle cx="28" cy="28" r="2.5" fill="#C9A227"></circle></svg>`;
    case 'poison': return `<svg width="40" height="40" viewBox="0 0 40 40"><circle cx="20" cy="20" r="15" fill="#69DB7C" stroke="#0B0B14" stroke-width="2.5"></circle><circle cx="14" cy="15" r="4" fill="#D3F9D8"></circle><circle cx="25" cy="25" r="3" fill="#2B8A3E"></circle></svg>`;
    case 'crystal': return `<svg width="44" height="30" viewBox="0 0 44 30"><path d="M2 15 L18 3 L42 15 L18 27 Z" fill="${color}" stroke="#0B0B14" stroke-width="2"></path><path d="M18 3 L22 15 L18 27" stroke="#FFFFFF" stroke-width="1.5" fill="none"></path></svg>`;
    case 'star': return `<svg width="44" height="44" viewBox="-22 -22 44 44"><path d="M0 -18 L5 -6 L18 -5 L8 4 L11 17 L0 10 L-11 17 L-8 4 L-18 -5 L-5 -6 Z" fill="${color}" stroke="#0B0B14" stroke-width="2"></path></svg>`;
    case 'feather': return `<svg width="54" height="22" viewBox="0 0 54 22"><path d="M52 11 Q30 -2 2 11 Q30 24 52 11 Z" fill="${color}" stroke="#0B0B14" stroke-width="2"></path><path d="M52 11 L6 11" stroke="#0B0B14" stroke-width="1.5"></path></svg>`;
    case 'wisp': return `<svg width="48" height="40" viewBox="0 0 48 40"><path d="M46 20 Q30 2 10 8 Q18 14 4 20 Q18 26 10 32 Q30 38 46 20 Z" fill="${color}" opacity=".9"></path><circle cx="36" cy="20" r="8" fill="#E7F5FF"></circle></svg>`;
    case 'water': return `<svg width="40" height="30" viewBox="0 0 40 30"><path d="M38 15 Q20 -4 4 15 Q20 34 38 15 Z" fill="${color}" stroke="#0B0B14" stroke-width="2"></path><circle cx="28" cy="11" r="3" fill="#FFFFFF"></circle></svg>`;
    case 'snowball': return `<svg width="42" height="42" viewBox="0 0 42 42"><circle cx="21" cy="21" r="18" fill="#F4F8FB" stroke="#0B0B14" stroke-width="3"></circle><path d="M10 16 q6 -6 14 -4" stroke="#CADCEC" stroke-width="3" fill="none"></path></svg>`;
    case 'fireball': return `<svg width="56" height="40" viewBox="0 0 56 40"><path d="M54 20 Q36 0 12 6 Q22 12 2 20 Q22 28 12 34 Q36 40 54 20 Z" fill="#FF6B1A"></path><circle cx="40" cy="20" r="11" fill="#FFD43B"></circle><circle cx="42" cy="20" r="5" fill="#FFF3B0"></circle></svg>`;
    case 'laser': return `<svg width="120" height="14" viewBox="0 0 120 14"><rect x="0" y="3" width="120" height="8" rx="4" fill="${color}" opacity=".45"></rect><rect x="4" y="5" width="112" height="4" rx="2" fill="#FFFFFF"></rect></svg>`;
    case 'bolt': return `<svg width="50" height="40" viewBox="0 0 50 40"><path d="M48 4 L28 18 L36 20 L4 36 L20 20 L12 18 Z" fill="${color}" stroke="#0B0B14" stroke-width="2" stroke-linejoin="round"></path></svg>`;
    default: return `<svg width="40" height="40" viewBox="0 0 40 40"><circle cx="20" cy="20" r="14" fill="${color}"></circle></svg>`;
  }
}
const BOLT_SVG = (c) => `<svg width="90" height="360" viewBox="0 0 90 360"><path d="M50 0 L20 130 L48 130 L14 250 L44 250 L30 360 L80 200 L52 200 L78 90 L50 90 L70 0 Z" fill="${c}" stroke="#FFFFFF" stroke-width="4" stroke-linejoin="round"></path></svg>`;

export default function battle(root, { go, params }) {
  const save = load();
  const worldIdx = Math.min(params.world ?? 0, WORLDS.length - 1);
  const W = WORLDS[worldIdx];
  const hero = FIGHTERS.find((f) => f.id === save.eq.fighter) || FIGHTERS[0];
  const heroKind = hero.id;
  const wSel = WEAPONS.find((w) => w.id === save.eq.weapon) || WEAPONS[0];
  const wBase = wSel.id === 'auto' ? (WEAPONS.find((w) => w.id === hero.weapon) || wSel) : wSel;
  const wLevel = (save.wlv && save.wlv[wSel.id]) || 1;
  const stats = weaponStats(wBase, wLevel);
  const ranged = !!wBase.ranged;
  const throwKind = IMAGES[wBase.id] ? (wBase.id === 'windbow' ? 'arrow' : 'image:' + wBase.id) : wBase.id;
  const special = SPECIALS.find((s) => s.id === save.eq.special) || SPECIALS[0];
  const heroWeapon = save.eq.weapon;
  const timers = [];
  const later = (ms, fn) => { const t = setTimeout(fn, ms); timers.push(t); return t; };

  const S = {
    enc: 0, phase: 'run', hp: 1, hearts: MAX_HEARTS, combo: 0, maxCombo: 0, energy: 0,
    q: null, wrong: [], tries: 0, hint: true, earned: 0, answered: 0, firstOk: 0, special: false,
    hitText: '', gain: 0, aura: 'none', beltFight: false, dmg: 1, crit: false, interrupted: false, interrupts: 0,
    shownAt: 0, pausedMs: 0, pauseStart: 0,
    charge: { dur: 0, elapsed: 0, start: 0, timers: [] }
  };
  const foeKey = () => W.path[S.enc];
  const foe = () => FOES[foeKey()];
  const foeLeft = () => (foe().type === 'boss' ? 10 : 60);
  const foeCenter = () => { const b = foeBox(foe()); return { x: foeLeft() + b / 2, y: 412 - 50 - b / 2, top: 412 - 50 - b }; };

  setMusicStyle(W.music);
  startMusic();

  root.innerHTML = `
  <div class="battle" style="position:absolute;inset:0;">
    <div id="stageFx" style="position:absolute;inset:0;">
      <div id="scene" style="position:absolute;left:0;top:0;">${worldScene(W)}</div>
      <div id="speed" style="position:absolute;inset:0;overflow:hidden;pointer-events:none;">${LINES.map((l) => `<div class="speed-line" style="position:absolute;left:0;top:${l.y}px;width:${l.w}px;height:${l.h}px;border-radius:2px;background:#FFFFFF;opacity:${l.o};animation-delay:${l.d}s;"></div>`).join('')}</div>
      <div id="foe"></div>
      <div id="heroMove" style="position:absolute;right:70px;bottom:50px;width:200px;height:220px;">
        <div style="width:200px;height:220px;transform:scaleX(-1) scale(0.8);transform-origin:50% 100%;">
          <div id="heroPose" class="pose-run"></div>
        </div>
      </div>
      <div id="fx" style="position:absolute;inset:0;pointer-events:none;"></div>
    </div>
    <div id="chargeBar"></div>
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
  startLayers(root);

  // ---------- rendering ----------
  function renderHero() { $('heroPose').innerHTML = heroArt(hero, { weapon: heroWeapon, aura: S.aura }); }
  function setAura(a) { if (a !== S.aura) { S.aura = a; renderHero(); } }
  const heroPortrait = () => (hero.art.kind === 'sprite'
    ? spritePortrait(hero.id)
    : `<div style="position:absolute;left:-84px;top:-34px;width:200px;height:220px;transform:scale(0.9);transform-origin:0 0;">${Fighter({ kind: heroKind, weapon: 'auto', aura: 'none' })}</div>`);

  function renderFoe() {
    const f = foe();
    const b = foeBox(f);
    const art = f.type === 'chest' ? TreasureChest({ open: false }) : foeArt(f);
    $('foe').innerHTML = `<div id="foeMove" style="position:absolute;left:${foeLeft()}px;bottom:50px;width:${f.type === 'chest' ? 180 : b}px;height:${b}px;"><div id="foeGlow"></div><div id="foePose" class="pose-idle" style="position:relative;">${art}</div></div>`;
  }
  const foeMove = (cls) => replay($('foeMove'), '', cls);
  const heroMove = (cls) => replay($('heroMove'), '', cls);
  const heroPose = (cls) => { $('heroPose').className = cls; };
  const foePose = (cls) => { const el = $('foePose'); if (el) el.className = cls; };

  function renderHud() {
    const f = foe();
    const nextBelt = SKILLS[Math.min(load().level + 1, SKILLS.length - 1)];
    const line = S.beltFight && f.type === 'boss' ? nextBelt.color : f.type === 'boss' ? '#9775FA' : f.type === 'chest' ? '#F5B82E' : '#E63946';
    const hpW = Math.max(6, Math.floor(150 / f.hp) - 3);
    $('hud').innerHTML = `
    <div style="position:absolute;top:8px;left:12px;right:12px;height:50px;display:flex;align-items:center;gap:10px;">
      <div style="width:262px;height:50px;box-sizing:border-box;display:flex;align-items:center;gap:8px;padding:0 8px 0 18px;background:rgba(11,11,20,.86);border:2px solid #F5B82E;clip-path:polygon(0 0,100% 0,100% 100%,14px 100%);">
        <div style="width:40px;height:40px;flex-shrink:0;position:relative;overflow:hidden;background:#1E2238;border:2px solid #F5B82E;box-sizing:border-box;transform:scaleX(-1);">${heroPortrait()}</div>
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
        <div style="display:flex;align-items:center;gap:7px;">${W.path.map((k, i) => `<span class="${i === S.enc ? 'pulse' : ''}" style="width:${FOES[k].type === 'boss' ? 17 : 11}px;height:${FOES[k].type === 'boss' ? 17 : 11}px;transform:rotate(45deg);background:${i < S.enc ? '#F5B82E' : i === S.enc ? '#E63946' : '#1E2238'};border:2px solid ${i === S.enc ? '#FFFFFF' : '#F5B82E'};box-sizing:border-box;box-shadow:0 0 0 2px #0B0B14;"></span>`).join('')}</div>
      </div>
      <div style="width:250px;height:50px;box-sizing:border-box;display:flex;align-items:center;gap:8px;padding:0 18px 0 8px;background:rgba(11,11,20,.86);border:2px solid ${line};clip-path:polygon(0 0,100% 0,calc(100% - 14px) 100%,0 100%);">
        <div style="flex-grow:1;display:flex;flex-direction:column;align-items:flex-end;gap:3px;">
          <span class="num" style="font-size:15px;line-height:1;">${f.name}</span>
          <div style="display:flex;gap:3px;" aria-label="חיים של היריב">${Array.from({ length: f.hp }, (_, i) => `<span style="width:${hpW}px;height:9px;transform:skewX(20deg);background:${i < S.hp ? line : '#2A1216'};border:1px solid ${line};"></span>`).join('')}</div>
        </div>
        <div style="width:40px;height:40px;flex-shrink:0;position:relative;overflow:hidden;background:#2A1216;border:2px solid ${line};box-sizing:border-box;">${foePortrait(f)}</div>
      </div>
    </div>`;
  }

  // Belt chip: two quiet progress bars — accuracy and speed — toward the belt fight.
  function renderBelt() {
    const s = load();
    const p = progress(s);
    const lv = SKILLS[s.level];
    const bar = (v, max, color) => `<span style="width:44px;height:7px;background:#1E2238;border:1px solid ${color};display:inline-block;"><span style="display:block;height:100%;width:${Math.min(100, (v / max) * 100)}%;background:${color};"></span></span>`;
    const top = s.level >= SKILLS.length - 1;
    $('belt').innerHTML = `
    <div style="position:absolute;top:64px;left:12px;right:12px;height:32px;display:flex;align-items:center;gap:8px;">
      <div class="chip">${belt(lv.color)}<span class="num" style="font-size:13px;">חגורה ${lv.belt} · ${lv.name}</span>
        ${p.phase === 'challenge'
          ? `<span class="num pulse" style="font-size:12px;color:#F5B82E;">קרב חגורה בבוס!</span>`
          : top ? '' : `<span style="display:flex;align-items:center;gap:4px;" aria-label="דיוק ${p.acc} מתוך ${p.accNeeded}, מהירות ${p.fast} מתוך ${p.fastNeeded}">
              <svg width="12" height="12" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12 L10 17 L19 7" stroke="#2FB380" stroke-width="4" fill="none" stroke-linecap="round"></path></svg>${bar(p.acc, p.accNeeded, '#2FB380')}
              <svg width="12" height="12" viewBox="0 0 24 24" aria-hidden="true"><path d="M13 2 L4 14 H11 L10 22 L20 9 H13 Z" fill="#22D3EE"></path></svg>${bar(p.fast, p.fastNeeded, '#22D3EE')}
            </span>`}
      </div>
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
    const cols = (n) => Math.max(1, Math.min(5, n));
    if (q.tenFrame) {
      const fill = 10 - q.a;
      const frame = Array.from({ length: 10 }, (_, i) => orb(i < q.a ? { fill: '#FF4D5E', line: 'solid' } : { fill: '#22D3EE', line: 'solid' })).join('');
      const rest = Array.from({ length: q.b - fill }, () => orb({ fill: '#22D3EE', line: 'solid' })).join('');
      return `<div style="display:grid;grid-template-columns:repeat(5,16px);gap:4px;padding:4px;border:2px solid #F5B82E;">${frame}</div><span class="num" style="font-size:18px;">+</span><div style="display:grid;grid-template-columns:repeat(${cols(q.b - fill)},16px);gap:4px;">${rest}</div><span dir="rtl" style="font-size:12px;color:#B9C0D8;">10 ועוד ${q.b - fill}</span>`;
    }
    const a = `<div style="display:grid;grid-template-columns:repeat(${cols(q.dotsA.length)},16px);gap:5px;">${q.dotsA.map(orb).join('')}</div>`;
    const b = q.dotsB.length ? `<span class="num" style="font-size:20px;">+</span><div style="display:grid;grid-template-columns:repeat(${cols(q.dotsB.length)},16px);gap:5px;">${q.dotsB.map(orb).join('')}</div>` : '';
    return a + b;
  }

  function renderPanel(pop) {
    const q = S.q;
    const ph = S.phase;
    if (!q || ph === 'run' || ph === 'defeat' || ph === 'clear') { $('panel').innerHTML = ''; return; }
    const f = foe();
    const done = ph === 'hit' || ph === 'special' || ph === 'ko';
    const isBoss = f.type === 'boss', isChest = f.type === 'chest';
    let msg = isChest ? 'פתרו כדי לפרוץ את התיבה!' : isBoss ? `${S.beltFight ? 'קרב חגורה · ' : ''}מכה ${f.hp - S.hp + 1} מתוך ${f.hp}` : S.charge.dur ? 'ענו לפני שהמתקפה מוכנה!' : 'פתרו כדי לתקוף!';
    let color = S.beltFight && isBoss ? '#F5B82E' : '#F8F9FA';
    if (S.energy >= 4 && !isChest) { msg = `${special.name} מוכנה!`; color = '#22D3EE'; }
    if (ph === 'counter' || ph === 'oops') { msg = S.charge.dur ? 'טעות — האויב מתחזק! נסו שוב' : 'אאוץ׳! נסו שוב'; color = '#FF8787'; }
    if (done) { msg = S.hitText; color = '#F5B82E'; }
    const line = ph === 'counter' || ph === 'oops' ? '#E63946' : S.energy >= 4 && !isChest ? '#22D3EE' : '#F5B82E';
    const x = isBoss ? 300 : 258, w = isBoss ? 350 : 380;
    $('panel').innerHTML = `
    <div class="panel-frame ${pop ? 'pop-in' : ''}" style="position:absolute;top:102px;left:${x}px;width:${w}px;background:${line};">
      <div class="panel-body" style="padding:8px 26px 10px;display:flex;flex-direction:column;align-items:center;gap:5px;">
        <div style="width:100%;display:flex;align-items:center;gap:8px;">
          <span class="num" style="padding:2px 10px;background:${isBoss ? '#7048E8' : isChest ? '#C98A12' : '#B42318'};color:#FFFFFF;font-size:12px;white-space:nowrap;transform:skewX(-12deg);">${f.name}</span>
          <span class="num" style="flex-grow:1;font-size:15px;color:${color};">${msg}</span>
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

  // ---------- effects ----------
  function spawn(html, ms) {
    const el = document.createElement('div');
    el.className = 'fx-el';
    el.style.cssText = 'position:absolute;inset:0;';
    el.innerHTML = html;
    $('fx').appendChild(el);
    later(ms, () => el.remove());
    return el;
  }
  function float(html, ms = 1400) {
    const el = document.createElement('div');
    el.innerHTML = html;
    $('float').appendChild(el);
    later(ms, () => el.remove());
  }
  function toast(title, sub, color, ms = 3100) {
    $('toast').innerHTML = `
    <div class="toast" style="position:absolute;top:262px;left:50%;margin-left:-190px;width:380px;box-sizing:border-box;padding:8px 16px;display:flex;align-items:center;gap:12px;background:#12152A;border:2px solid #F5B82E;box-shadow:0 0 20px rgba(245,184,46,.5);z-index:5;">
      ${belt(color, 46, 24)}
      <div style="display:flex;flex-direction:column;"><span class="num" style="font-size:18px;color:#F5B82E;">${title}</span><span style="font-size:14px;color:#D0D4E4;">${sub}</span></div>
    </div>`;
    later(ms, () => { $('toast').innerHTML = ''; });
  }
  function flash(color) {
    $('flash').innerHTML = color === 'red' ? '<div class="red-flash"></div>' : `<div class="flash" style="position:absolute;inset:0;background:${color || '#FFFFFF'};"></div>`;
    later(700, () => { $('flash').innerHTML = ''; });
  }
  function shake() { replay($('stageFx'), '', 'shake'); }
  function hitstop(ms = 90) {
    const el = $('stageFx');
    el.classList.add('hitstop');
    later(ms, () => el.classList.remove('hitstop'));
  }
  function sparks(x, y, colors, n = 12) {
    spawn(Array.from({ length: n }, (_, i) => {
      const a = (i / n) * Math.PI * 2 + Math.random() * 0.4;
      const r = 50 + Math.random() * 60;
      const c = colors[i % colors.length];
      return `<span class="spark" style="left:${x - 4}px;top:${y - 4}px;background:${c};box-shadow:0 0 8px ${c};--sx:${Math.cos(a) * r}px;--sy:${Math.sin(a) * r}px;"></span>`;
    }).join(''), 600);
  }
  function damage(x, y, text, color, size = 54) {
    spawn(`<span class="dmg" style="left:${x - 20}px;top:${y}px;color:${color};font-size:${size}px;">${text}</span>`, 950);
  }
  function projectile(kind, color, from, to, t = 0.45, rot = '720deg') {
    const html = projectileSvg(kind, color);
    spawn(`<div class="proj proj-fly" style="left:${from.x - 30}px;top:${from.y - 30}px;display:flex;align-items:center;justify-content:center;--dx:${to.x - from.x}px;--dy:${to.y - from.y}px;--t:${t}s;--rot:${rot};">${html}</div>`, t * 1000 + 100);
  }
  function slashFx(c, color, kind = 'slash', mirror = false, rot = 0) {
    spawn(`<div style="position:absolute;left:${c.x - 120}px;top:${c.y - 120}px;width:240px;height:240px;transform:${mirror ? 'scaleX(-1) ' : ''}rotate(${rot}deg);"><div class="fx-slash" style="width:240px;height:240px;transform-origin:50% 50%;">${FX({ kind, color })}</div></div>`, 900);
  }

  // ---------- enemy wind-up (charge) ----------
  // Charging enemies build up an attack while the question is open. Answering correctly in time
  // interrupts it (stun + bonus); a wrong answer speeds it up; if it fills, the enemy unleashes it.
  function chargeDuration() {
    const f = foe();
    if (f.type === 'chest') return 0;
    if (S.beltFight && f.type === 'boss') return challengeSeconds() * 1000;
    if (load().settings.speed) return 10000;
    if (!f.charge) return 0;
    const sk = SKILLS[load().level];
    let ms = Math.max(sk.targetMs * 2.4, recentMedianMs() * 2);
    if (f.type === 'boss') ms *= 0.9;
    return Math.round(Math.min(20000, Math.max(6500, ms)));
  }
  function clearChargeTimers() { S.charge.timers.forEach(clearTimeout); S.charge.timers = []; }
  function renderCharge() {
    const f = foe();
    const c = foeCenter();
    const dur = S.charge.dur, el = S.charge.elapsed;
    const glow = $('foeGlow');
    if (!dur) { $('chargeBar').innerHTML = ''; if (glow) glow.innerHTML = ''; return; }
    const warn = el / dur > 0.7;
    $('chargeBar').innerHTML = `
      <div id="chargeWrap" class="${warn ? 'charge-warn' : ''}" style="position:absolute;left:${Math.max(8, c.x - 80)}px;top:${Math.max(98, c.top - 18)}px;width:160px;display:flex;flex-direction:column;align-items:center;gap:2px;pointer-events:none;">
        <span class="num" style="font-size:12px;color:${warn ? '#FF4D5E' : '#FFD8A8'};text-shadow:0 1px 2px #000;">${warn ? 'מתקפה כמעט מוכנה!' : 'מכין מתקפה...'}</span>
        <div style="width:160px;height:12px;background:rgba(11,11,20,.85);border:2px solid ${warn ? '#FF4D5E' : '#F5B82E'};box-sizing:border-box;transform:skewX(-14deg);overflow:hidden;">
          <div id="chargeFill" class="charge-fill" style="height:100%;background:linear-gradient(90deg, #F5B82E, ${f.color || '#E63946'});animation-duration:${dur}ms;animation-delay:-${el}ms;"></div>
        </div>
      </div>`;
    if (glow) glow.innerHTML = `<div class="charge-glow" style="position:absolute;left:50%;bottom:10%;width:120%;height:120%;margin-left:-60%;border-radius:50%;background:radial-gradient(circle, ${f.color || '#E63946'}aa 0%, ${f.color || '#E63946'}33 45%, transparent 70%);pointer-events:none;animation-duration:${dur}ms;animation-delay:-${el}ms;"></div>`;
  }
  function startCharge() {
    clearChargeTimers();
    if (!S.charge.dur) { renderCharge(); return; }
    S.charge.start = performance.now();
    renderCharge();
    const left = S.charge.dur - S.charge.elapsed;
    const warnAt = S.charge.dur * 0.7 - S.charge.elapsed;
    if (warnAt > 0) S.charge.timers.push(later(warnAt, () => { renderCharge2Warn(); }));
    for (let i = 3; i >= 1; i--) if (left > i * 1000) S.charge.timers.push(later(left - i * 1000, () => sfx('tick')));
    S.charge.timers.push(later(left, chargedAttack));
  }
  function renderCharge2Warn() {
    S.charge.elapsed += performance.now() - S.charge.start;
    S.charge.start = performance.now();
    renderCharge();
  }
  function pauseCharge() {
    if (!S.charge.dur || !S.charge.start) return;
    S.charge.elapsed = Math.min(S.charge.dur, S.charge.elapsed + performance.now() - S.charge.start);
    S.charge.start = 0;
    clearChargeTimers();
    root.querySelectorAll('#chargeFill, #foeGlow .charge-glow').forEach((e) => { e.style.animationPlayState = 'paused'; });
  }
  function stopCharge() { clearChargeTimers(); S.charge = { dur: 0, elapsed: 0, start: 0, timers: [] }; renderCharge(); }
  function boostCharge() {
    pauseCharge();
    S.charge.elapsed = Math.min(S.charge.dur, S.charge.elapsed + S.charge.dur * 0.35);
    replay($('foePose'), 'pose-idle', 'charge-jump');
    sfx('magic');
    if (S.charge.elapsed >= S.charge.dur) chargedAttack();
    else startCharge();
  }
  function chargedAttack() {
    if (S.phase !== 'ask' && S.phase !== 'oops') return;
    clearChargeTimers();
    S.phase = 'counter';
    renderPanel(); renderChoices();
    $('chargeBar').innerHTML = '';
    enemyAttack(true, () => {
      if (S.hearts <= 0) { defeat(); return; }
      heroPose('pose-idle');
      S.phase = 'oops';
      renderPanel(); renderChoices();
      S.charge.elapsed = 0;
      startCharge();
    });
  }

  // ---------- flow ----------
  function run(enc) {
    stopCharge();
    S.enc = enc; S.phase = 'run'; S.q = null; S.wrong = []; S.tries = 0; S.hp = foe().hp;
    S.beltFight = foe().type === 'boss' && progress().phase === 'challenge';
    setSceneMoving(root, true);
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
    if (foe().type === 'boss') later(1700, bossIntro);
    else later(1900, ask);
  }

  function bossIntro() {
    const f = foe();
    setSceneMoving(root, false);
    $('speed').style.display = 'none';
    heroPose('pose-idle');
    foePose('pose-attack');
    later(500, () => foePose('pose-idle'));
    sfx('roar'); haptic('heavy'); shake();
    replay($('stageFx'), '', 'zoom');
    const next = SKILLS[Math.min(load().level + 1, SKILLS.length - 1)];
    $('overlay').innerHTML = `
      <div class="boss-intro" style="position:absolute;top:118px;left:-40px;right:-40px;padding:10px 0;background:${S.beltFight ? '#0B0B14' : '#1B1530'};border-top:4px solid ${S.beltFight ? next.color : '#9775FA'};border-bottom:4px solid ${S.beltFight ? next.color : '#9775FA'};display:flex;flex-direction:column;align-items:center;">
        <div class="num" style="font-size:18px;color:${S.beltFight ? '#F5B82E' : '#C4B5FD'};transform:skewX(12deg);">${S.beltFight ? `קרב חגורה ${next.belt}! ענו לפני שהמתקפה מוכנה (${challengeSeconds()} שניות)` : 'בוס!'}</div>
        <div class="title-xl" style="font-size:80px;color:#FFFFFF;transform:skewX(12deg);text-shadow:4px 4px 0 #0B0B14;">${f.name}</div>
      </div>`;
    if (S.beltFight) later(300, () => sfx('gong'));
    later(2200, () => { $('overlay').innerHTML = ''; ask(); });
  }

  function ask() {
    const s = load();
    S.phase = 'ask'; S.q = makeQuestion(s.level); S.wrong = []; S.tries = 0; S.interrupted = false;
    S.hint = s.settings.hints && s.level <= 1 && !S.beltFight;
    setSceneMoving(root, false);
    $('speed').style.display = 'none';
    $('overlay').innerHTML = '';
    heroPose('pose-idle');
    foeMove('');
    foePose('pose-idle');
    S.charge = { dur: chargeDuration(), elapsed: 0, start: 0, timers: [] };
    renderPanel(true); renderChoices(); renderCombo();
    S.shownAt = performance.now(); S.pausedMs = 0;
    startCharge();
  }

  const answerMs = () => performance.now() - S.shownAt - S.pausedMs;

  function pick(v) {
    if (!S.q || (S.phase !== 'ask' && S.phase !== 'oops') || S.wrong.includes(v)) return;
    sfx('tap');
    if (v === S.q.ans) hitFoe();
    else miss(v);
  }

  function afterRecord(res) {
    if (res.challengeUnlocked) {
      later(900, () => {
        const next = SKILLS[Math.min(load().level + 1, SKILLS.length - 1)];
        toast('אתגר חגורה נפתח!', 'נכון ומהיר! הבוס הבא יהיה קרב חגורה', next.color, 3600);
        sfx('gong');
      });
    }
    renderBelt();
  }

  function hitFoe() {
    const f = foe();
    const first = S.tries === 0;
    const wasCharging = S.charge.dur > 0;
    stopCharge();
    S.answered += first ? 1 : 0;
    if (first) S.firstOk += 1;
    if (first) afterRecord(record(S.q, true, answerMs()));
    const isSpecial = first && S.energy >= 4 && f.type !== 'chest';
    S.crit = !isSpecial && f.type !== 'chest' && Math.random() * 100 < stats.crit;
    let dmg = isSpecial ? (f.type === 'boss' ? stats.dmg + 2 : f.hp) : stats.dmg * (S.crit ? 2 : 1);
    if (f.type === 'chest') dmg = 1;
    S.dmg = Math.min(dmg, S.hp);
    S.interrupted = wasCharging && f.type !== 'chest';
    if (S.interrupted) S.interrupts += 1;
    S.gain = Math.round((first ? f.reward : Math.ceil(f.reward / 2)) * (isSpecial ? 2 : 1) * (S.interrupted ? 1.5 : 1));
    S.combo = first ? S.combo + 1 : 1;
    S.maxCombo = Math.max(S.maxCombo, S.combo);
    S.energy = isSpecial ? 0 : Math.min(4, S.energy + (first ? 1 : 0) + (S.interrupted && first ? 1 : 0));
    S.hp = Math.max(0, S.hp - dmg);
    S.earned += S.gain;
    S.special = isSpecial;
    S.double = !isSpecial && S.combo >= 3 && f.type !== 'chest';
    S.hitText = isSpecial ? special.name : f.type === 'chest' ? 'נפרץ!' : S.crit ? 'קריטי!' : S.interrupted ? 'נקטע!' : S.double ? 'קומבו כפול!' : HITS[Math.floor(Math.random() * HITS.length)];
    update((s) => { s.coins += S.gain; });
    if (S.interrupted) {
      const c = foeCenter();
      sfx('block');
      spawn(`<div style="position:absolute;left:${c.x - 50}px;top:${c.top - 10}px;width:100px;height:40px;"><svg class="stun" width="100" height="40" viewBox="-50 -20 100 40" style="transform-origin:50% 50%;">${[0, 1, 2].map((i) => `<path transform="rotate(${i * 120}) translate(30 0)" d="M0 -7 L2 -2 L7 0 L2 2 L0 7 L-2 2 L-7 0 L-2 -2 Z" fill="#FFD43B" stroke="#0B0B14" stroke-width="1"></path>`).join('')}</svg></div>`, 1300);
    }
    if (isSpecial) {
      S.phase = 'special';
      renderPanel(); renderChoices();
      setAura('storm');
      sfx('special'); haptic('heavy');
      $('overlay').innerHTML = `
        <div class="dim" style="position:absolute;inset:0;background:rgba(11,11,20,.72);"></div>
        <div class="cutin" style="position:absolute;left:-60px;right:-60px;top:120px;height:160px;overflow:hidden;background:${special.color};border-top:4px solid #F5B82E;border-bottom:4px solid #F5B82E;">
          <div style="position:absolute;inset:0;background:rgba(11,11,20,.35);"></div>
          ${LINES.map((l, i) => `<div class="speed-line" style="position:absolute;left:0;top:${10 + i * 20}px;width:${l.w}px;height:3px;background:#FFFFFF;opacity:.55;animation-delay:${l.d}s;"></div>`).join('')}
          <div style="position:absolute;right:120px;top:-40px;width:200px;height:220px;transform:scaleX(-1) scale(1.55);transform-origin:50% 0;"><div class="pose-idle">${heroArt(hero, { weapon: heroWeapon, aura: 'storm' })}</div></div>
          <div style="position:absolute;right:430px;top:30px;opacity:.9;">${special.art ? `<img src="images/${special.id}.png" alt="" style="height:100px;width:160px;object-fit:contain;" />` : ''}</div>
          <div style="position:absolute;left:150px;top:20px;transform:skewY(6deg);"><div class="num" style="font-size:18px;color:#F5B82E;">מתקפה מיוחדת</div><div class="title-xl" style="font-size:88px;color:#FFFFFF;text-shadow:4px 4px 0 #0B0B14;">${special.name}</div></div>
        </div>`;
      later(1700, () => { $('overlay').innerHTML = ''; strike(); });
    } else {
      strike();
    }
  }

  function impact(delay) {
    const f = foe();
    const c = foeCenter();
    later(delay, () => {
      sfx('hit'); haptic(S.crit || S.special ? 'heavy' : 'medium');
      hitstop(S.special ? 180 : S.crit ? 140 : 90);
      shake(); flash(S.special ? '#FFE3E3' : S.crit ? '#FFF3BF' : '#FFFFFF');
      foeMove('enc-hurt');
      foePose('pose-hurt');
      sparks(c.x, c.y, [f.color || '#F5B82E', '#FFFFFF', stats.trail], S.special ? 20 : S.crit ? 16 : 12);
      damage(c.x, c.top + 10, '-' + S.dmg, S.crit ? '#FFD43B' : '#FF4D5E', S.crit ? 70 : 54);
      if (S.crit) spawn(`<div class="crit" style="position:absolute;left:${c.x - 90}px;top:${c.top - 40}px;font-family:'Karantina',sans-serif;font-weight:700;font-size:72px;color:#FFD43B;text-shadow:4px 4px 0 #B42318,-2px -2px 0 #0B0B14,2px -2px 0 #0B0B14,-2px 2px 0 #0B0B14;">קריטי!</div>`, 1000);
      spawn(`<div style="position:absolute;left:${c.x - 66}px;top:${c.y - 66}px;width:240px;height:240px;transform:scale(${S.special ? 0.8 : 0.55});transform-origin:0 0;"><div class="fx-burst" style="width:240px;height:240px;transform-origin:50% 50%;">${FX({ kind: 'impact', color: '#F5B82E' })}</div></div>`, 700);
    });
  }

  // Super-attack cinematics; each returns the moment (ms) the blow lands.
  function playSpecial() {
    const c = foeCenter();
    const col = special.color;
    const img = special.art ? `images/${special.id}.png` : null;
    switch (special.fx) {
      case 'rain':
        for (let i = 0; i < 14; i++) later(i * 55, () => { sfx('throw'); spawn(`<div class="fall-in" style="position:absolute;left:${c.x - 23 + (Math.random() * 120 - 60)}px;top:${c.y - 23 + (Math.random() * 80 - 40)}px;--fx0:${120 + Math.random() * 120}px;--fy0:-360px;--t:.45s;">${projectileSvg('shuriken', col)}</div>`, 700); });
        return 650;
      case 'petals':
        spawn(Array.from({ length: 40 }, (_, i) => `<span class="spiral" style="position:absolute;left:${c.x - 7}px;top:${c.y - 4}px;width:14px;height:8px;border-radius:50%;background:${i % 3 ? col : '#FFFFFF'};--r:${120 + Math.random() * 160}px;animation-delay:${i * 15}ms;"></span>`).join(''), 1600);
        later(700, () => { sfx('slash'); slashFx(c, col); later(120, () => slashFx(c, '#FFFFFF', 'slash', true)); });
        return 820;
      case 'lightning':
        [-50, 0, 50].forEach((dx, i) => later(i * 160, () => { sfx('zap'); flash('#FFF9DB'); spawn(`<div class="bolt" style="position:absolute;left:${c.x + dx - 45}px;top:${c.y - 330}px;">${BOLT_SVG(col)}</div>`, 600); }));
        return 480;
      case 'clones':
        [0, 1, 2].forEach((i) => later(i * 130, () => {
          sfx('whoosh');
          spawn(`<div class="clone" style="position:absolute;right:${70 + i * 10}px;bottom:${50 + i * 14}px;width:200px;height:220px;--dx:${-(HERO.x - c.x - 60)}px;filter:brightness(.35) sepia(1) hue-rotate(220deg) saturate(4);"><div style="width:200px;height:220px;transform:scaleX(-1) scale(0.8);transform-origin:50% 100%;"><div class="pose-strike">${heroArt(hero, { weapon: heroWeapon })}</div></div></div>`, 800);
          later(420, () => { sfx('slash'); slashFx(c, col, 'slash', i % 2 === 1, i * 25); });
        }));
        return 700;
      case 'spikes':
        if (!img) break;
        [-60, 0, 60].forEach((dx, i) => later(i * 120, () => { sfx('ice'); spawn(`<div class="erupt" style="position:absolute;left:${c.x + dx - 70}px;bottom:44px;width:140px;height:${160 + i * 30}px;"><img src="${img}" alt="" style="width:100%;height:100%;object-fit:contain;object-position:50% 100%;" /></div>`, 1000); }));
        return 380;
      case 'tornado':
        if (!img) break;
        sfx('whoosh'); later(300, () => sfx('feather'));
        spawn(`<div class="sweep" style="position:absolute;left:${HERO.x - 110}px;bottom:40px;width:220px;height:300px;--dx:${-(HERO.x - c.x)}px;--t:1s;"><img class="sway" src="${img}" alt="" style="width:100%;height:100%;object-fit:contain;object-position:50% 100%;" /></div>`, 1100);
        return 800;
      case 'dragon':
        if (!img) break;
        sfx('fireball'); later(200, () => sfx('roar'));
        spawn(`<div class="sweep" style="position:absolute;left:760px;top:${c.y - 120}px;width:460px;height:240px;--dx:-1300px;--t:1.1s;"><img src="${img}" alt="" style="width:100%;height:100%;object-fit:contain;" /></div>`, 1200);
        return 620;
      case 'wave':
        if (!img) break;
        sfx('water'); later(250, () => sfx('water'));
        spawn(`<div class="sweep" style="position:absolute;left:700px;bottom:20px;width:520px;height:380px;--dx:-1100px;--t:1.1s;"><img src="${img}" alt="" style="width:100%;height:100%;object-fit:contain;object-position:50% 100%;" /></div>`, 1200);
        return 560;
      case 'meteor':
        if (!img) break;
        sfx('fireball');
        spawn(`<div class="fall-in" style="position:absolute;left:${c.x - 100}px;top:${c.y - 130}px;width:220px;height:220px;--fx0:420px;--fy0:-420px;--t:.7s;"><img src="${img}" alt="" style="width:100%;height:100%;object-fit:contain;" /></div>`, 800);
        later(700, () => { sfx('thud'); spawn(`<div style="position:absolute;left:${c.x - 150}px;top:${c.y - 150}px;width:240px;height:240px;transform:scale(1.25);transform-origin:0 0;"><div class="fx-burst" style="width:240px;height:240px;">${FX({ kind: 'impact', color: '#FF922B' })}</div></div>`, 700); });
        return 720;
      default:
        break;
    }
    // slashes (and any effect whose art is missing)
    sfx('slash');
    [0, 1, 2].forEach((i) => later(i * 110, () => { sfx('slash'); slashFx(c, i === 2 ? '#FFFFFF' : col, i === 2 ? 'special' : 'slash', i === 1, i * 30); }));
    return 360;
  }

  function strike() {
    const f = foe();
    const isBoss = f.type === 'boss', isChest = f.type === 'chest';
    const c = foeCenter();
    S.phase = 'hit';
    renderPanel(); renderChoices(); renderCombo(); renderHud();
    if (isChest) {
      heroPose('pose-win');
      $('foePose').innerHTML = TreasureChest({ open: true });
      sfx('coin'); haptic('light');
      sparks(c.x + 20, c.y, ['#F5B82E', '#FFF1B8', '#FFFFFF'], 14);
      if (S.hearts < MAX_HEARTS) {
        S.hearts += 1;
        later(400, () => { renderHud(); const h = root.querySelector(`#hearts [data-h="${S.hearts - 1}"]`); if (h) h.className = 'heart-gain'; sfx('heart'); });
        float(`<div class="gain" style="position:absolute;left:180px;top:150px;display:flex;align-items:center;gap:4px;">${heart(true, 30)}<span class="num" style="font-size:24px;color:#FF8787;">+1</span></div>`);
      }
    } else if (S.special) {
      heroPose('pose-attack');
      impact(playSpecial());
    } else if (ranged) {
      // Thrown weapon: stay in place, throw one (or two on a combo) at the enemy.
      heroPose('pose-attack');
      sfx('throw');
      const spin = throwKind === 'kunai' || throwKind === 'arrow' ? '0deg' : '-900deg';
      projectile(throwKind, stats.trail, { x: HERO.x - 40, y: HERO.y - 20 }, { x: c.x, y: c.y }, 0.32, spin);
      if (S.double) later(140, () => { sfx('throw'); projectile(throwKind, stats.trail, { x: HERO.x - 40, y: HERO.y - 40 }, { x: c.x, y: c.y - 20 }, 0.32, spin); });
      impact(320);
      if (S.double) later(470, () => { sfx('slash'); sparks(c.x, c.y - 20, ['#FFFFFF', stats.trail], 8); });
    } else {
      heroPose('pose-attack');
      heroMove(isBoss ? 'hero-dash-boss' : 'hero-dash');
      sfx('slash');
      slashFx(c, stats.trail);
      if (S.double || S.crit) later(170, () => { sfx('slash'); sfx('combo'); slashFx(c, S.crit ? '#FFD43B' : '#F5B82E', 'slash', true); });
      impact(220);
    }
    float(`<div class="hit-text" style="position:absolute;left:60px;top:150px;font-family:'Karantina',sans-serif;font-weight:700;font-size:60px;line-height:1;color:#FFFFFF;text-shadow:3px 3px 0 #B42318,-2px -2px 0 #0B0B14,2px -2px 0 #0B0B14,-2px 2px 0 #0B0B14;">${S.hitText}</div>
      <div class="gain" style="position:absolute;left:190px;top:206px;display:flex;align-items:center;gap:4px;">${coin(26)}<span dir="ltr" class="num" style="font-size:26px;color:#F5B82E;text-shadow:0 2px 0 #0B0B14;">+${S.gain}</span></div>`);
    later(500, () => sfx('coin'));
    later(S.special ? 1500 : 1150, after);
  }

  function after() {
    const f = foe();
    renderBelt();
    setAura(S.energy >= 4 ? 'ice' : 'none');
    if (S.hp > 0) { ask(); return; }
    S.phase = 'ko';
    if (f.type !== 'chest') {
      foePose('pose-hurt');
      foeMove('enc-ko');
      const c = foeCenter();
      spawn(`<div style="position:absolute;left:${c.x - 84}px;top:${c.y - 84}px;width:240px;height:240px;transform:scale(0.7);transform-origin:0 0;"><div class="fx-burst" style="width:240px;height:240px;transform-origin:50% 50%;">${FX({ kind: 'smoke', color: '#4A4560' })}</div></div>`, 900);
      if (f.type === 'boss') { sfx('thud'); shake(); flash('#FFFFFF'); hitstop(220); }
    }
    heroPose('pose-idle');
    later(f.type === 'chest' ? 500 : f.type === 'boss' ? 1000 : 800, () => {
      if (f.type === 'boss') victory();
      else run(S.enc + 1);
    });
  }

  // The enemy attacks in its own style; big = the fully charged version.
  function enemyAttack(big, done) {
    const f = foe();
    const c = foeCenter();
    let hitAt = 320;
    if (big) { sfx('roar'); flash(f.color || '#E63946'); }
    if (f.attack === 'projectile') {
      foePose('pose-attack');
      const kind = f.projectile;
      const spin = ['laser', 'fireball', 'feather', 'wisp', 'arrow', 'needle', 'sand'].includes(kind) ? '0deg' : '720deg';
      const shots = big ? 3 : 1;
      for (let i = 0; i < shots; i++) later(i * 120, () => { sfx(PROJ_SFX[kind] || 'throw'); projectile(kind, f.color, { x: c.x + 50, y: c.y - 10 - i * 18 }, { x: HERO.x, y: HERO.y - i * 12 }, 0.45, spin); });
      hitAt = 450 + (shots - 1) * 120;
    } else if (f.attack === 'magic') {
      foePose('pose-attack');
      sfx('magic');
      spawn(`<div class="charge" style="position:absolute;left:${c.x - 60}px;top:${c.y - 60}px;width:120px;height:120px;border-radius:50%;background:radial-gradient(circle, #FFFFFF 0%, ${f.color} 40%, rgba(0,0,0,0) 72%);"></div>`, 700);
      later(480, () => {
        const len = HERO.x - c.x;
        const h = big ? 60 : 32;
        spawn(`<div class="beam" style="position:absolute;left:${c.x}px;top:${HERO.y - h / 2}px;width:${len}px;height:${h}px;border-radius:${h / 2}px;background:linear-gradient(180deg, ${f.color}, #FFFFFF 50%, ${f.color});box-shadow:0 0 ${big ? 40 : 24}px ${f.color};transform-origin:0 50%;"></div>`, 600);
        flash(f.color);
      });
      hitAt = 600;
    } else {
      foeMove(f.type === 'boss' ? 'enc-attack-boss' : 'enc-attack');
      foePose('pose-attack');
      sfx(['shadowcat', 'snowwolf', 'tiger', 'scorpion', 'crab'].includes(f.id) ? 'claw' : 'whoosh');
    }
    later(hitAt, () => {
      S.hearts -= 1;
      sfx('hurt'); haptic('heavy');
      if (big || (f.attack === 'melee' && f.hp > 1)) sfx('thud');
      heroPose('pose-hurt');
      flash('red'); shake(); hitstop(big ? 140 : 80);
      sparks(HERO.x - 20, HERO.y - 20, ['#E63946', '#FFFFFF'], big ? 16 : 10);
      damage(HERO.x - 20, HERO.y - 110, '-1', '#FF4D5E');
      renderHud();
      const lost = root.querySelector(`#hearts [data-h="${S.hearts}"]`);
      if (lost) lost.className = 'heart-lose';
    });
    later(hitAt + 600, () => { foePose('pose-idle'); done(); });
  }

  // Wrong answer: charging enemies grow stronger (their wind-up jumps ahead); others hit back at once.
  function miss(v) {
    const f = foe();
    const first = S.tries === 0;
    if (first) { S.answered += 1; afterRecord(record(S.q, false, answerMs())); }
    if (v !== null) S.wrong = S.wrong.concat([v]);
    S.tries += 1;
    S.hint = true;
    S.combo = 0;
    if (f.type === 'chest') {
      S.phase = 'counter';
      renderPanel(); renderChoices(); renderCombo();
      sfx('block');
      foeMove('enc-hurt');
      later(600, () => { S.phase = 'oops'; renderPanel(); renderChoices(); });
      return;
    }
    if (S.charge.dur) {
      S.phase = 'oops';
      renderPanel(); renderChoices(); renderCombo();
      boostCharge();
      return;
    }
    S.phase = 'counter';
    renderPanel(); renderChoices(); renderCombo();
    enemyAttack(false, () => {
      if (S.hearts <= 0) { defeat(); return; }
      heroPose('pose-idle');
      S.phase = 'oops';
      renderPanel(); renderChoices();
    });
  }

  function defeat() {
    S.phase = 'defeat';
    stopCharge();
    renderPanel(); renderChoices(); renderCombo();
    heroPose('pose-down');
    sfx('lose');
    $('overlay').innerHTML = `
      <div style="position:absolute;inset:0;background:rgba(40,0,8,.55);"></div>
      <div class="defeat" style="position:absolute;left:0;right:0;top:110px;display:flex;flex-direction:column;align-items:center;">
        <span class="title-xl" style="font-size:140px;color:#E63946;text-shadow:5px 5px 0 #0B0B14,-3px -3px 0 #0B0B14,3px -3px 0 #0B0B14,-3px 3px 0 #0B0B14;">הובסת!</span>
      </div>`;
    later(2000, () => go('result', { world: worldIdx, won: false, earned: S.earned, answered: S.answered, firstOk: S.firstOk, maxCombo: S.maxCombo, stage: S.enc, stages: W.path.length, interrupts: S.interrupts }));
  }

  function victory() {
    S.phase = 'clear';
    stopCharge();
    heroPose('pose-win');
    sfx('win');
    const stars = Math.max(1, S.hearts);
    const newBelt = S.beltFight ? winBelt() : null;
    update((s) => {
      s.stars[worldIdx] = Math.max(s.stars[worldIdx] || 0, stars);
      s.unlocked = Math.max(s.unlocked, Math.min(WORLDS.length, worldIdx + 2));
    });
    $('overlay').innerHTML = `
      <div style="position:absolute;inset:0;background:rgba(11,11,20,.6);"></div>
      <div class="victory" style="position:absolute;left:0;right:0;top:96px;display:flex;flex-direction:column;align-items:center;">
        <span class="title-xl" style="font-size:150px;color:#F5B82E;text-shadow:5px 5px 0 #B42318,-3px -3px 0 #0B0B14,3px -3px 0 #0B0B14,-3px 3px 0 #0B0B14;">ניצחון!</span>
      </div>`;
    if (newBelt) later(600, () => sfx('levelup'));
    later(2200, () => go('result', { world: worldIdx, won: true, stars, earned: S.earned, answered: S.answered, firstOk: S.firstOk, maxCombo: S.maxCombo, interrupts: S.interrupts, newBelt: newBelt && newBelt.id }));
  }

  // ---------- pause (the answer clock and wind-ups stop while paused or in the background) ----------
  function pauseClock() { if (!S.pauseStart) S.pauseStart = performance.now(); pauseCharge(); }
  function resumeClock() {
    if (S.pauseStart) { S.pausedMs += performance.now() - S.pauseStart; S.pauseStart = 0; }
    if ((S.phase === 'ask' || S.phase === 'oops') && S.charge.dur && !S.charge.start) startCharge();
  }
  const onVisibility = () => { if (document.hidden) pauseClock(); else if (!root.querySelector('#pauseBox')) resumeClock(); };
  document.addEventListener('visibilitychange', onVisibility);

  function openPause() {
    if (S.phase === 'defeat' || S.phase === 'clear') return;
    sfx('tap');
    pauseClock();
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
    box.querySelector('#resume').onclick = () => { box.remove(); sfx('tap'); resumeClock(); };
    box.querySelector('#toMap').onclick = () => go('map');
    box.querySelector('#toTitle').onclick = () => go('title');
  }

  renderHero();
  run(0);

  return { unmount() { timers.forEach(clearTimeout); clearChargeTimers(); document.removeEventListener('visibilitychange', onVisibility); } };
}
