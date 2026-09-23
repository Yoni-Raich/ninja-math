import Fighter from '../art/Fighter.js';
import Weapon from '../art/Weapon.js';
import { load, update } from '../game/save.js';
import { FIGHTERS, WEAPONS, AURAS } from '../game/data.js';
import { coin, backIcon } from '../ui.js';
import { sfx, haptic } from '../audio.js';

const SIGNATURE = { kage: 'katana', sakura: 'kunai', ryu: 'odachi', jin: 'bo', raiden: 'shuriken', ryuko: 'nunchaku' };
const TABS = [
  { id: 'fighter', label: 'לוחמים', dot: '#E63946', list: FIGHTERS },
  { id: 'weapon', label: 'נשקים', dot: '#D0D7E0', list: WEAPONS },
  { id: 'aura', label: 'הילות', dot: '#22D3EE', list: AURAS }
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
  <g transform="translate(456 66)" opacity="0.55"><rect x="-34" y="0" width="68" height="120" fill="#F1E6CC"></rect><rect x="-38" y="-4" width="76" height="6" fill="#3B2618"></rect><rect x="-38" y="120" width="76" height="6" fill="#3B2618"></rect><path d="M-14 40 A20 20 0 1 1 10 70" stroke="#0B0B14" stroke-width="6" fill="none" stroke-linecap="round"></path><rect x="8" y="92" width="8" height="8" fill="#B42318"></rect></g>
</svg>`;

export default function dojo(root, { go }) {
  const s = load();
  let tab = 'fighter';
  const sel = { fighter: s.eq.fighter, weapon: s.eq.weapon, aura: s.eq.aura };

  function draw() {
    const d = load();
    const T = TABS.find((t) => t.id === tab);
    const cur = T.list.find((x) => x.id === sel[tab]) || T.list[0];
    const look = Object.assign({}, d.eq, { [tab]: cur.id });
    const owned = !!d.owned[cur.id];
    const equipped = d.eq[tab] === cur.id;
    const afford = d.coins >= cur.price;
    let actLabel = 'לצייד', actBg = '#2FB380', actFg = '#FFFFFF', actCoin = false;
    if (equipped) { actLabel = 'מצויד'; actBg = '#3A3F5C'; }
    else if (!owned) { actLabel = afford ? 'לקנות · ' + cur.price : 'חסרים ' + (cur.price - d.coins); actBg = afford ? '#F5B82E' : '#5C6177'; actFg = '#0B0B14'; actCoin = true; }
    const glow = tab === 'aura' ? cur.glow : (FIGHTERS.find((f) => f.id === look.fighter) || FIGHTERS[0]).glow;
    const cols = tab === 'weapon' ? 3 : 3;

    const cards = T.list.map((x) => {
      const isOwned = !!d.owned[x.id];
      const isEq = d.eq[tab] === x.id;
      const isSel = sel[tab] === x.id;
      const dress = Object.assign({}, d.eq, { [tab]: x.id });
      const preview = tab === 'weapon'
        ? `<div style="position:absolute;left:50%;top:50%;margin-left:-53px;margin-top:-17px;width:220px;height:70px;transform:scale(0.48);transform-origin:0 0;">${Weapon({ kind: x.id === 'auto' ? SIGNATURE[d.eq.fighter] : x.id })}</div>`
        : `<div style="position:absolute;left:50%;top:-8px;margin-left:-100px;width:200px;height:220px;transform:scale(0.5);transform-origin:50% 0;"><div class="pose-idle">${Fighter({ kind: dress.fighter, weapon: dress.weapon, aura: dress.aura })}</div></div>`;
      return `<button class="card" data-id="${x.id}" aria-pressed="${isSel}" aria-label="${x.name}" style="height:${tab === 'weapon' ? 98 : 150}px;box-sizing:border-box;padding:5px;display:flex;flex-direction:column;align-items:center;gap:2px;background:#12152A;border:2px solid ${isSel ? '#F5B82E' : '#3A3F5C'};box-shadow:0 4px 0 #0B0B14;cursor:pointer;color:#F8F9FA;">
        <div style="width:100%;height:${tab === 'weapon' ? 46 : 96}px;position:relative;overflow:hidden;background:${isSel ? '#262B4A' : '#1A1D33'};">${preview}</div>
        <span class="num" style="font-size:15px;line-height:1.2;">${x.name}</span>
        <span style="display:flex;align-items:center;gap:4px;font-size:13px;font-weight:700;color:${isEq ? '#2FB380' : isOwned ? '#D0D4E4' : '#F5B82E'};">${isOwned ? '' : coin(14)}<span>${isEq ? 'בשימוש' : isOwned ? 'שלי' : x.price}</span></span>
      </button>`;
    }).join('');

    root.innerHTML = `
    <style>.card{transition:transform .12s}.card:active{transform:translateY(3px)}</style>
    ${BACKDROP}
    <div style="position:absolute;top:10px;left:14px;right:14px;height:44px;display:flex;align-items:center;gap:12px;">
      <div class="sk" style="padding:2px 22px;background:#0B0B14;border-bottom:3px solid #F5B82E;"><h1 class="title-xl unsk" style="margin:0;font-size:38px;line-height:1.05;">דוג׳ו</h1></div>
      <span class="num" style="font-size:14px;color:#E8D9B5;">לוחמים · נשקים · הילות</span>
      <div style="flex-grow:1;"></div>
      <div class="chip">${coin(22)}<span class="num" style="font-size:17px;color:#F5B82E;">${d.coins}</span></div>
      <button id="back" class="btn-icon" aria-label="חזרה לתפריט">${backIcon()}</button>
    </div>
    <div style="position:absolute;top:72px;right:14px;width:126px;display:flex;flex-direction:column;gap:10px;">
      ${TABS.map((t) => `<button class="tab" data-tab="${t.id}" aria-pressed="${t.id === tab}" style="height:54px;box-sizing:border-box;display:flex;align-items:center;gap:8px;padding:0 12px;background:${t.id === tab ? '#E63946' : 'rgba(11,11,20,.85)'};color:#FFFFFF;border:2px solid #F5B82E;transform:skewX(-8deg);cursor:pointer;font-family:'Secular One',sans-serif;font-size:17px;"><span style="width:10px;height:10px;flex-shrink:0;transform:rotate(45deg);background:${t.dot};"></span><span>${t.label}</span></button>`).join('')}
    </div>
    <div style="position:absolute;top:70px;right:154px;width:486px;height:332px;overflow-y:auto;scrollbar-width:none;">
      <div style="display:grid;grid-template-columns:repeat(${cols},minmax(0,1fr));gap:10px;padding-bottom:6px;">${cards}</div>
    </div>
    <div style="position:absolute;top:70px;left:14px;width:230px;height:328px;box-sizing:border-box;padding:10px 12px 12px;display:flex;flex-direction:column;align-items:center;gap:6px;background:rgba(11,11,20,.88);border:2px solid #F5B82E;">
      <span class="title-xl" style="font-size:36px;">${cur.name}</span>
      <span style="font-size:13px;color:#D0D4E4;text-align:center;min-height:18px;">${cur.tag}</span>
      <div style="position:relative;width:206px;height:190px;">
        <svg width="206" height="190" viewBox="0 0 206 190" style="position:absolute;left:0;top:0;" aria-hidden="true"><circle cx="103" cy="92" r="84" fill="${glow}" opacity="0.18"></circle><ellipse cx="103" cy="174" rx="80" ry="12" fill="#5B3A29" stroke="#F5B82E" stroke-width="2"></ellipse><ellipse cx="103" cy="170" rx="80" ry="12" fill="#7A4E2D"></ellipse></svg>
        <div style="position:absolute;left:3px;top:-34px;width:200px;height:220px;transform:scaleX(-1) scale(0.92);transform-origin:50% 100%;"><div class="pose-idle">${Fighter({ kind: look.fighter, weapon: look.weapon, aura: look.aura })}</div></div>
      </div>
      <button id="act" style="width:196px;height:52px;box-sizing:border-box;display:flex;align-items:center;justify-content:center;gap:8px;background:${actBg};color:${actFg};border:2px solid #FFFFFF;transform:skewX(-10deg);cursor:pointer;font-family:'Secular One',sans-serif;font-size:19px;">${actCoin ? coin(20) : ''}<span>${actLabel}</span></button>
    </div>`;

    root.querySelector('#back').onclick = () => go('title');
    root.querySelectorAll('.tab').forEach((b) => { b.onclick = () => { tab = b.dataset.tab; sfx('tap'); draw(); }; });
    root.querySelectorAll('.card').forEach((b) => { b.onclick = () => { sel[tab] = b.dataset.id; sfx('tap'); draw(); }; });
    root.querySelector('#act').onclick = () => {
      if (equipped) return;
      if (!owned) {
        if (!afford) { sfx('block'); return; }
        update((x) => { x.coins -= cur.price; x.owned[cur.id] = true; x.eq[tab] = cur.id; });
        sfx('coin'); sfx('levelup'); haptic('medium');
      } else {
        update((x) => { x.eq[tab] = cur.id; });
        sfx('tap');
      }
      draw();
    };
  }
  draw();
  return { unmount() {} };
}
