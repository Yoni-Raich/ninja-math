import { load, update } from '../game/save.js';
import { FIGHTERS, WEAPONS, SPECIALS, AURAS, SKILLS, MAX_WEAPON_LEVEL, upgradeCost, weaponStats } from '../game/data.js';
import { heroArt, weaponIcon, specialArt } from '../game/art.js';
import { coin, backIcon } from '../ui.js';
import { sfx, haptic } from '../audio.js';

const TABS = [
  { id: 'fighter', label: 'לוחמים', dot: '#E63946', list: () => FIGHTERS },
  { id: 'weapon', label: 'נשקים', dot: '#D0D7E0', list: () => WEAPONS },
  { id: 'special', label: 'מתקפות על', dot: '#F5B82E', list: () => SPECIALS },
  { id: 'aura', label: 'הילות', dot: '#22D3EE', list: () => AURAS }
];

const BACKDROP = `
<svg width="915" height="412" viewBox="0 0 915 412" style="position:absolute;left:0;top:0;" aria-hidden="true">
  <rect x="0" y="0" width="915" height="300" fill="#2A1A12"></rect>
  <rect x="0" y="40" width="915" height="220" fill="#E8D9B5" opacity="0.2"></rect>
  <g stroke="#5B3A29" stroke-width="3" opacity="0.8"><path d="M0 40 H915 M0 110 H915 M0 180 H915 M0 260 H915"></path><path d="M60 40 V260 M150 40 V260 M240 40 V260 M330 40 V260 M420 40 V260 M510 40 V260 M600 40 V260 M690 40 V260 M780 40 V260 M870 40 V260"></path></g>
  <rect x="0" y="260" width="915" height="16" fill="#5B3A29"></rect>
  <rect x="0" y="276" width="915" height="136" fill="#7A4E2D"></rect>
  <g stroke="#5E3A20" stroke-width="2"><path d="M0 300 H915 M0 330 H915 M0 366 H915 M0 404 H915"></path><path d="M120 276 L90 412 M300 276 L290 412 M480 276 L490 412 M660 276 L690 412 M840 276 L890 412"></path></g>
  <path d="M0 276 H915" stroke="#A36A3C" stroke-width="2"></path>
</svg>`;

const lockSvg = (c = '#F8F9FA') => `<svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="10" width="14" height="11" rx="2" fill="${c}"></rect><path d="M8 10 V7 a4 4 0 0 1 8 0 V10" fill="none" stroke="${c}" stroke-width="2.6"></path></svg>`;

export default function dojo(root, { go }) {
  const s0 = load();
  let tab = 'fighter';
  const sel = { fighter: s0.eq.fighter, weapon: s0.eq.weapon, special: s0.eq.special, aura: s0.eq.aura };

  function draw(keepScroll) {
    const d = load();
    const T = TABS.find((t) => t.id === tab);
    const list = T.list();
    const cur = list.find((x) => x.id === sel[tab]) || list[0];
    const look = Object.assign({}, d.eq, { [tab]: cur.id });
    const hero = FIGHTERS.find((f) => f.id === look.fighter) || FIGHTERS[0];
    const lockedBelt = (x) => (x.belt || 0) > d.level;
    const owned = !!d.owned[cur.id];
    const equipped = d.eq[tab] === cur.id;
    const locked = lockedBelt(cur) && !owned;
    const afford = d.coins >= cur.price;
    const level = (d.wlv && d.wlv[cur.id]) || 1;

    let actLabel = 'לצייד', actBg = '#2FB380', actFg = '#FFFFFF', actCoin = false;
    if (equipped) { actLabel = 'מצויד'; actBg = '#3A3F5C'; }
    else if (locked) { actLabel = 'נפתח בחגורה ' + SKILLS[cur.belt].belt; actBg = '#3A3F5C'; }
    else if (!owned) { actLabel = afford ? 'לקנות · ' + cur.price : 'חסרים ' + (cur.price - d.coins); actBg = afford ? '#F5B82E' : '#5C6177'; actFg = '#0B0B14'; actCoin = true; }

    // Weapon upgrades: shown for an owned weapon.
    let upgrade = '';
    if (tab === 'weapon' && owned) {
      const st = weaponStats(cur.id === 'auto' ? (WEAPONS.find((w) => w.id === hero.weapon) || cur) : cur, level);
      const cost = upgradeCost(cur, level);
      const max = level >= MAX_WEAPON_LEVEL;
      upgrade = `
        <div style="width:100%;display:flex;justify-content:space-between;font-size:12px;color:#D0D4E4;">
          <span>רמה <b class="num" style="color:${st.trail};">${level}/${MAX_WEAPON_LEVEL}</b></span>
          <span>נזק <b class="num" style="color:#FF8787;">${st.dmg}</b></span>
          <span>קריטי <b class="num" style="color:#FFD43B;">${st.crit}%</b></span>
        </div>
        <div style="width:100%;height:6px;background:#1E2238;border:1px solid #3A3F5C;"><div style="width:${(level / MAX_WEAPON_LEVEL) * 100}%;height:100%;background:${st.trail};box-shadow:0 0 6px ${st.trail};"></div></div>
        <button id="upg" ${max || d.coins < cost ? 'disabled' : ''} style="width:196px;height:40px;box-sizing:border-box;display:flex;align-items:center;justify-content:center;gap:6px;background:${max ? '#3A3F5C' : d.coins >= cost ? '#7048E8' : '#5C6177'};color:#FFFFFF;border:2px solid #FFFFFF;transform:skewX(-10deg);cursor:pointer;font-family:'Secular One',sans-serif;font-size:15px;">${max ? 'רמה מקסימלית' : `${coin(16)}<span>שדרוג לרמה ${level + 1} · ${cost}</span>`}</button>`;
    }

    const preview = tab === 'special'
      ? `<div class="pulse" style="display:flex;align-items:center;justify-content:center;width:206px;height:170px;">${specialArt(cur, 150)}</div>`
      : `<div style="position:relative;width:206px;height:${tab === 'weapon' ? 150 : 190}px;">
          <svg width="206" height="190" viewBox="0 0 206 190" style="position:absolute;left:0;top:${tab === 'weapon' ? -40 : 0}px;" aria-hidden="true"><circle cx="103" cy="92" r="84" fill="${(tab === 'aura' ? cur.glow : hero.glow) || '#F5B82E'}" opacity="0.18"></circle><ellipse cx="103" cy="174" rx="80" ry="12" fill="#5B3A29" stroke="#F5B82E" stroke-width="2"></ellipse><ellipse cx="103" cy="170" rx="80" ry="12" fill="#7A4E2D"></ellipse></svg>
          <div style="position:absolute;left:3px;top:${tab === 'weapon' ? -74 : -34}px;width:200px;height:220px;transform:scaleX(-1) scale(${tab === 'weapon' ? 0.78 : 0.92});transform-origin:50% 100%;"><div class="pose-idle">${heroArt(hero, { weapon: look.weapon, aura: look.aura })}</div></div>
        </div>`;

    const cards = list.map((x) => {
      const isOwned = !!d.owned[x.id];
      const isEq = d.eq[tab] === x.id;
      const isSel = sel[tab] === x.id;
      const isLocked = lockedBelt(x) && !isOwned;
      const isNew = !isLocked && !isOwned && !(d.seen || {})[x.id] && x.price > 0;
      const dress = Object.assign({}, d.eq, { [tab]: x.id });
      const f = FIGHTERS.find((z) => z.id === dress.fighter) || FIGHTERS[0];
      let art;
      if (tab === 'weapon') art = `<div style="position:absolute;left:50%;top:50%;margin-left:-66px;margin-top:-21px;width:220px;height:70px;transform:scale(0.6);transform-origin:0 0;">${weaponIcon(x, d.eq.fighter)}</div>`;
      else if (tab === 'special') art = `<div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;">${specialArt(x, 80)}</div>`;
      else art = `<div style="position:absolute;left:50%;top:-8px;margin-left:-100px;width:200px;height:220px;transform:scale(0.5);transform-origin:50% 0;"><div class="pose-idle">${heroArt(f, { weapon: dress.weapon, aura: dress.aura })}</div></div>`;
      const lvl = tab === 'weapon' && isOwned ? (d.wlv && d.wlv[x.id]) || 1 : 0;
      return `<button class="card" data-id="${x.id}" aria-pressed="${isSel}" aria-label="${x.name}" style="position:relative;height:${tab === 'fighter' || tab === 'aura' ? 150 : 118}px;box-sizing:border-box;padding:5px;display:flex;flex-direction:column;align-items:center;gap:2px;background:#12152A;border:2px solid ${isSel ? '#F5B82E' : '#3A3F5C'};box-shadow:0 4px 0 #0B0B14;cursor:pointer;color:#F8F9FA;">
        <div style="width:100%;height:${tab === 'fighter' || tab === 'aura' ? 96 : 64}px;position:relative;overflow:hidden;background:${isSel ? '#262B4A' : '#1A1D33'};${isLocked ? 'filter:brightness(.35) grayscale(.8);' : ''}">${art}</div>
        ${isLocked ? `<div style="position:absolute;top:26px;left:0;right:0;display:flex;flex-direction:column;align-items:center;gap:2px;">${lockSvg()}<span class="num" style="font-size:11px;">חגורה ${SKILLS[x.belt].belt}</span></div>` : ''}
        ${isNew ? '<span class="num pulse" style="position:absolute;top:4px;right:4px;padding:0 6px;background:#E63946;font-size:11px;transform:skewX(-10deg);">חדש!</span>' : ''}
        ${lvl > 1 ? `<span class="num" style="position:absolute;top:4px;left:6px;font-size:11px;color:#F5B82E;">רמה ${lvl}</span>` : ''}
        <span class="num" style="font-size:14px;line-height:1.2;white-space:nowrap;">${x.name}</span>
        <span style="display:flex;align-items:center;gap:4px;font-size:12px;font-weight:700;color:${isEq ? '#2FB380' : isOwned ? '#D0D4E4' : '#F5B82E'};">${isOwned || isLocked ? '' : coin(13)}<span>${isEq ? 'בשימוש' : isOwned ? 'שלי' : isLocked ? '' : x.price}</span></span>
      </button>`;
    }).join('');

    const scroll = keepScroll ? (root.querySelector('#grid') || {}).scrollTop || 0 : 0;
    root.innerHTML = `
    <style>.card{transition:transform .12s}.card:active{transform:translateY(3px)}#grid::-webkit-scrollbar{display:none}</style>
    ${BACKDROP}
    <div style="position:absolute;top:10px;left:14px;right:14px;height:44px;display:flex;align-items:center;gap:12px;">
      <div class="sk" style="padding:2px 22px;background:#0B0B14;border-bottom:3px solid #F5B82E;"><h1 class="title-xl unsk" style="margin:0;font-size:38px;line-height:1.05;">דוג׳ו</h1></div>
      <span class="num" style="font-size:13px;color:#E8D9B5;">${FIGHTERS.length} לוחמים · ${WEAPONS.length} נשקים · ${SPECIALS.length} מתקפות על</span>
      <div style="flex-grow:1;"></div>
      <div class="chip">${coin(22)}<span class="num" style="font-size:17px;color:#F5B82E;">${d.coins}</span></div>
      <button id="back" class="btn-icon" aria-label="חזרה לתפריט">${backIcon()}</button>
    </div>
    <div style="position:absolute;top:64px;right:14px;width:126px;display:flex;flex-direction:column;gap:8px;">
      ${TABS.map((t) => `<button class="tab" data-tab="${t.id}" aria-pressed="${t.id === tab}" style="height:50px;box-sizing:border-box;display:flex;align-items:center;gap:8px;padding:0 12px;background:${t.id === tab ? '#E63946' : 'rgba(11,11,20,.85)'};color:#FFFFFF;border:2px solid #F5B82E;transform:skewX(-8deg);cursor:pointer;font-family:'Secular One',sans-serif;font-size:16px;"><span style="width:10px;height:10px;flex-shrink:0;transform:rotate(45deg);background:${t.dot};"></span><span>${t.label}</span></button>`).join('')}
    </div>
    <div id="grid" style="position:absolute;top:64px;right:154px;width:486px;height:340px;overflow-y:auto;scrollbar-width:none;">
      <div style="display:grid;grid-template-columns:repeat(${tab === 'fighter' || tab === 'aura' ? 3 : 3},minmax(0,1fr));gap:10px;padding-bottom:8px;">${cards}</div>
    </div>
    <div style="position:absolute;top:64px;left:14px;width:230px;height:338px;box-sizing:border-box;padding:8px 12px 10px;display:flex;flex-direction:column;align-items:center;gap:5px;background:rgba(11,11,20,.9);border:2px solid #F5B82E;">
      <span class="title-xl" style="font-size:34px;">${cur.name}</span>
      <span style="font-size:13px;color:#D0D4E4;text-align:center;min-height:18px;">${cur.tag}</span>
      ${preview}
      ${upgrade}
      <button id="act" style="width:196px;height:${upgrade ? 40 : 50}px;box-sizing:border-box;display:flex;align-items:center;justify-content:center;gap:8px;background:${actBg};color:${actFg};border:2px solid #FFFFFF;transform:skewX(-10deg);cursor:pointer;font-family:'Secular One',sans-serif;font-size:${locked ? 15 : 18}px;">${actCoin ? coin(20) : locked ? lockSvg() : ''}<span>${actLabel}</span></button>
    </div>`;
    root.querySelector('#grid').scrollTop = scroll;

    root.querySelector('#back').onclick = () => go('title');
    root.querySelectorAll('.tab').forEach((b) => { b.onclick = () => { tab = b.dataset.tab; sfx('tap'); draw(false); }; });
    root.querySelectorAll('.card').forEach((b) => {
      b.onclick = () => {
        sel[tab] = b.dataset.id;
        update((x) => { x.seen = x.seen || {}; x.seen[b.dataset.id] = true; });
        sfx('tap'); draw(true);
      };
    });
    root.querySelector('#act').onclick = () => {
      if (equipped) return;
      if (locked) { sfx('block'); return; }
      if (!owned) {
        if (!afford) { sfx('block'); return; }
        update((x) => { x.coins -= cur.price; x.owned[cur.id] = true; x.eq[tab] = cur.id; });
        sfx('coin'); sfx('levelup'); haptic('medium');
      } else {
        update((x) => { x.eq[tab] = cur.id; });
        sfx('tap');
      }
      draw(true);
    };
    const upg = root.querySelector('#upg');
    if (upg) upg.onclick = () => {
      const cost = upgradeCost(cur, level);
      if (level >= MAX_WEAPON_LEVEL || load().coins < cost) { sfx('block'); return; }
      update((x) => { x.coins -= cost; x.wlv = x.wlv || {}; x.wlv[cur.id] = level + 1; });
      sfx('levelup'); sfx('combo'); haptic('heavy');
      draw(true);
    };
  }
  draw(false);
  return { unmount() {} };
}
