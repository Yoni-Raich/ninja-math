import { load } from '../game/save.js';
import { WORLDS, SKILLS, FOES, FIGHTERS } from '../game/data.js';
import { heroArt } from '../game/art.js';
import { star, belt, backIcon, coin } from '../ui.js';
import { sfx } from '../audio.js';

// Ink illustrations for the built-in scenes; image worlds show a round crop of their background.
const ILLUSTRATIONS = {
  bamboo: `
  <g stroke="#2B2118" stroke-width="2.5" fill="none"><path d="M-60 60 V-50 M-44 60 V-70 M-26 60 V-44 M40 60 V-60 M56 60 V-40"></path><path d="M-62 20 H-58 M-46 -10 H-42 M-28 30 H-24 M38 0 H42 M54 24 H58"></path></g>
  <g fill="#5C8A4E" opacity="0.8"><path d="M-44 -40 q14 -8 26 -4 q-14 6 -26 8 z M-60 -20 q-14 -8 -26 -2 q14 4 26 6 z M40 -30 q14 -8 26 -4 q-14 6 -26 8 z"></path></g>
  <g fill="#2B2118"><rect x="-6" y="-8" width="12" height="40"></rect><path d="M-24 -2 Q0 -14 24 -2 L18 2 L-18 2 Z"></path><path d="M-20 -18 Q0 -28 20 -18 L15 -14 L-15 -14 Z"></path><path d="M-16 -32 Q0 -40 16 -32 L12 -29 L-12 -29 Z"></path></g>`,
  rooftops: `
  <circle cx="30" cy="-46" r="24" fill="#F5E9C8" stroke="#2B2118" stroke-width="2"></circle>
  <g fill="#3A4577" stroke="#2B2118" stroke-width="2"><path d="M-70 20 Q-30 0 10 20 L4 26 L-64 26 Z"></path><rect x="-60" y="26" width="60" height="30"></rect><path d="M0 0 Q40 -20 80 0 L74 6 L6 6 Z"></path><rect x="10" y="6" width="60" height="50"></rect></g>
  <g fill="#F5B82E"><rect x="-48" y="34" width="10" height="8"></rect><rect x="-28" y="34" width="10" height="8"></rect><rect x="24" y="18" width="10" height="8"></rect><rect x="46" y="18" width="10" height="8"></rect></g>
  <g fill="#B42318"><ellipse cx="-2" cy="30" rx="5" ry="7"></ellipse><ellipse cx="80" cy="12" rx="5" ry="7"></ellipse></g>`,
  snow: `
  <path d="M-90 56 L-40 -40 L0 20 L40 -60 L90 56 Z" fill="#B4C8DD" stroke="#2B2118" stroke-width="2.5" stroke-linejoin="round"></path>
  <path d="M-40 -40 L-26 -14 L-36 -18 L-46 -8 Z M40 -60 L56 -30 L44 -34 L32 -24 L28 -36 Z" fill="#FFFFFF" stroke="#2B2118" stroke-width="1.5"></path>
  <g transform="translate(0 30)"><rect x="-30" y="-20" width="6" height="46" fill="#C9302C"></rect><rect x="24" y="-20" width="6" height="46" fill="#C9302C"></rect><path d="M-40 -26 Q0 -20 40 -26 L38 -20 Q0 -15 -38 -20 Z" fill="#2B2118"></path><rect x="-34" y="-12" width="68" height="5" fill="#C9302C"></rect></g>`,
  volcano: `
  <g fill="#6C6887" opacity="0.6"><ellipse cx="10" cy="-66" rx="40" ry="12"></ellipse><ellipse cx="34" cy="-80" rx="30" ry="10"></ellipse></g>
  <path d="M-90 56 L-20 -40 L20 -40 L90 56 Z" fill="#5A2A22" stroke="#2B2118" stroke-width="2.5" stroke-linejoin="round"></path>
  <path d="M-20 -40 L20 -40 L14 -32 L-14 -32 Z" fill="#FF6A13" class="lava"></path>
  <path d="M-4 -32 Q-10 0 2 20 Q-6 40 4 56" stroke="#FF6A13" stroke-width="4" fill="none" class="lava"></path>
  <g fill="#2B2118"><rect x="44" y="20" width="30" height="36"></rect><path d="M40 22 L59 6 L78 22 Z"></path></g>`
};

const REGION = 176;   // width of one world on the scroll; the map scrolls sideways, world 1 on the right

export default function map(root, { go }) {
  const s = load();
  const N = WORLDS.length;
  const unlocked = Math.min(s.unlocked, N);
  const cur = unlocked - 1;
  const CW = N * REGION + 90;
  const RIGHT = CW - 45;
  const lv = SKILLS[s.level];
  const totalStars = s.stars.reduce((a, b) => a + (b || 0), 0);
  const worldX = (i) => RIGHT - (i + 0.5) * REGION;

  const pts = [];
  WORLDS.forEach((w, wi) => {
    const x0 = RIGHT - wi * REGION - 14, x1 = RIGHT - (wi + 1) * REGION + 14;
    const n = w.path.length;
    w.path.forEach((id, i) => {
      const t = n === 1 ? 0.5 : i / (n - 1);
      const boss = FOES[id].type === 'boss';
      pts.push({ x: x0 + (x1 - x0) * t, y: boss ? 236 : i % 2 ? 296 : 266, w: wi, boss, first: i === 0 });
    });
  });
  const curIdx = pts.findIndex((p) => p.w === cur && p.first);
  const poly = (list) => list.map((p) => `${Math.round(p.x)},${p.y}`).join(' ');
  const nodes = pts.map((p, i) => {
    const size = p.boss ? 26 : 16;
    const done = p.w < cur || s.stars[p.w] > 0;
    const isCur = i === curIdx;
    const bg = done ? '#F5B82E' : isCur ? '#E63946' : p.w > cur ? '#9C927A' : '#F1E6CC';
    return `<div style="position:absolute;left:${p.x - size / 2}px;top:${p.y - size / 2}px;width:${size}px;height:${size}px;pointer-events:none;">
      ${isCur ? `<span class="ring" style="position:absolute;left:0;top:0;width:${size}px;height:${size}px;border-radius:50%;border:3px solid #E63946;box-sizing:border-box;"></span>` : ''}
      <span style="position:absolute;left:0;top:0;width:${size}px;height:${size}px;box-sizing:border-box;transform:rotate(45deg);background:${bg};border:3px solid #2B2118;"></span>
      ${p.boss ? `<svg width="${size}" height="${size}" viewBox="0 0 24 24" style="position:absolute;left:0;top:0;" aria-hidden="true"><path d="M5 16 L6 8 L10 11 L12 6 L14 11 L18 8 L19 16 Z" fill="${isCur ? '#FFFFFF' : '#2B2118'}"></path></svg>` : ''}
    </div>`;
  }).join('');

  const regions = WORLDS.map((w, i) => {
    const cx = worldX(i);
    const art = ILLUSTRATIONS[w.scene]
      ? `<g transform="translate(${cx} 150) scale(0.85)">${ILLUSTRATIONS[w.scene]}</g>`
      : `<g transform="translate(${cx} 146)"><clipPath id="clip-${w.id}"><circle r="60"></circle></clipPath><image href="${(w.layers && w.layers[0] && w.layers[0].src) || ''}" x="-170" y="-66" height="132" preserveAspectRatio="xMidYMid slice" clip-path="url(#clip-${w.id})"></image><circle r="60" fill="none" stroke="#2B2118" stroke-width="3"></circle></g>`;
    const lock = i > cur ? `<g transform="translate(${cx} 250)"><rect x="${-REGION / 2 + 4}" y="-190" width="${REGION - 8}" height="240" fill="#2B2118" opacity="0.5"></rect><path d="M-14 -58 a14 14 0 0 1 28 0 v10" stroke="#F1E6CC" stroke-width="5" fill="none"></path><rect x="-22" y="-50" width="44" height="34" rx="4" fill="#F1E6CC"></rect><circle cx="0" cy="-34" r="5" fill="#2B2118"></circle></g>` : '';
    return art + lock;
  }).join('');
  const blots = Array.from({ length: Math.ceil(CW / 300) }, (_, i) => `<ellipse cx="${150 + i * 300}" cy="${i % 2 ? 340 : 110}" rx="80" ry="16"></ellipse>`).join('');

  const hp = pts[curIdx];
  const hero = FIGHTERS.find((f) => f.id === s.eq.fighter) || FIGHTERS[0];
  root.innerHTML = `
  <style>
    @keyframes ring{0%{transform:scale(.8);opacity:.9}100%{transform:scale(2.2);opacity:0}}
    .ring{animation:ring 1.4s ease-out infinite}
    .world-hit{position:absolute;top:70px;height:250px;background:transparent;border:none;cursor:pointer;padding:0;}
    #mapScroll::-webkit-scrollbar{display:none}
  </style>
  <div style="position:absolute;inset:0;background:#0B0B14;"></div>
  <div id="mapScroll" dir="ltr" style="position:absolute;left:38px;top:0;width:839px;height:412px;overflow-x:auto;overflow-y:hidden;scrollbar-width:none;touch-action:pan-x;">
    <div style="position:relative;width:${CW}px;height:412px;">
      <svg width="${CW}" height="412" viewBox="0 0 ${CW} 412" style="position:absolute;left:0;top:0;" aria-hidden="true">
        <defs><linearGradient id="paper" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#EFE3C6"></stop><stop offset="0.5" stop-color="#F3E9D1"></stop><stop offset="1" stop-color="#E3D2AD"></stop></linearGradient></defs>
        <rect x="0" y="22" width="${CW}" height="370" fill="url(#paper)"></rect>
        <g fill="#C9B587" opacity="0.45">${blots}</g>
        <polyline points="${poly(pts)}" fill="none" stroke="#2B2118" stroke-width="3" stroke-dasharray="2 8" stroke-linecap="round"></polyline>
        <polyline points="${poly(pts.slice(0, curIdx + 1))}" fill="none" stroke="#B42318" stroke-width="4" stroke-dasharray="10 6" stroke-linecap="round"></polyline>
        ${regions}
      </svg>
      ${WORLDS.map((w, i) => `
        <div dir="rtl" style="position:absolute;left:${worldX(i) - REGION / 2}px;top:206px;width:${REGION}px;display:flex;flex-direction:column;align-items:center;gap:2px;pointer-events:none;">
          <span class="num" style="font-size:13px;color:${i > cur ? '#7A6F58' : '#2B2118'};white-space:nowrap;">${i + 1} · ${w.name}</span>
          <div style="display:flex;gap:2px;">${[0, 1, 2].map((k) => star(k < (s.stars[i] || 0) ? '#F5B82E' : '#E4D6B4', 13, '#2B2118')).join('')}</div>
        </div>`).join('')}
      ${nodes}
      <div style="position:absolute;left:${hp.x - 36}px;top:${hp.y - 76}px;width:200px;height:220px;transform:scale(.32);transform-origin:0 0;pointer-events:none;"><div class="pose-idle">${heroArt(hero, { weapon: s.eq.weapon, aura: s.eq.aura })}</div></div>
      ${WORLDS.map((w, i) => `<button class="world-hit" data-w="${i}" aria-label="עולם ${i + 1}: ${w.name}${i > cur ? ' (נעול)' : ''}" style="left:${worldX(i) - REGION / 2}px;width:${REGION}px;"></button>`).join('')}
    </div>
  </div>
  <svg width="915" height="412" viewBox="0 0 915 412" style="position:absolute;left:0;top:0;pointer-events:none;" aria-hidden="true">
    <rect x="20" y="14" width="20" height="386" rx="10" fill="#5B3A29" stroke="#2B1A10" stroke-width="2"></rect>
    <rect x="875" y="14" width="20" height="386" rx="10" fill="#5B3A29" stroke="#2B1A10" stroke-width="2"></rect>
    <rect x="17" y="8" width="26" height="10" rx="3" fill="#F5B82E"></rect><rect x="17" y="396" width="26" height="10" rx="3" fill="#F5B82E"></rect>
    <rect x="872" y="8" width="26" height="10" rx="3" fill="#F5B82E"></rect><rect x="872" y="396" width="26" height="10" rx="3" fill="#F5B82E"></rect>
  </svg>
  <div style="position:absolute;top:28px;left:0;right:0;display:flex;justify-content:center;pointer-events:none;">
    <div class="sk" style="padding:0 28px;background:#2B2118;"><h1 class="title-xl unsk" style="margin:0;font-size:40px;line-height:1.05;color:#F1E6CC;">מפת העולמות</h1></div>
  </div>
  <div style="position:absolute;left:60px;right:60px;bottom:30px;height:50px;display:flex;align-items:center;gap:12px;">
    <button id="back" class="btn-icon" aria-label="חזרה לתפריט" style="background:#2B2118;border-color:#2B2118;">${backIcon('#F1E6CC')}</button>
    <div class="chip" style="height:34px;background:#2B2118;color:#F1E6CC;">${belt(lv.color, 30, 16, '#F1E6CC')}<span class="num" style="font-size:14px;">חגורה ${lv.belt} · ${totalStars} מתוך ${N * 3} כוכבים</span></div>
    <div class="chip" style="height:34px;background:#2B2118;">${coin(20)}<span class="num" style="font-size:15px;color:#F5B82E;">${s.coins}</span></div>
    <div style="flex-grow:1;"></div>
    <button id="go" class="btn-main" style="height:48px;padding:0 26px;border-color:#2B2118;">
      <span class="title-xl unsk" style="font-size:34px;line-height:1;">לקרב!</span>
      <span class="num unsk" style="font-size:13px;">${WORLDS[cur].name}</span>
    </button>
  </div>`;

  const sc = root.querySelector('#mapScroll');
  sc.scrollLeft = Math.max(0, worldX(cur) - 419);
  sc.addEventListener('wheel', (e) => { sc.scrollLeft += e.deltaY + e.deltaX; e.preventDefault(); }, { passive: false });
  root.querySelector('#back').onclick = () => go('title');
  root.querySelector('#go').onclick = () => go('battle', { world: cur });
  root.querySelectorAll('.world-hit').forEach((b) => {
    b.onclick = () => {
      const i = Number(b.dataset.w);
      if (i > cur) { sfx('block'); b.animate([{ transform: 'translateX(0)' }, { transform: 'translateX(-8px)' }, { transform: 'translateX(8px)' }, { transform: 'translateX(0)' }], 300); return; }
      go('battle', { world: i });
    };
  });
  return { unmount() {} };
}