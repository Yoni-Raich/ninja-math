import Fighter from '../art/Fighter.js';
import { load } from '../game/save.js';
import { WORLDS, SKILLS, FOES } from '../game/data.js';
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

const LEFT = 70, RIGHT = 850;   // map spans right-to-left: world 1 on the right

export default function map(root, { go }) {
  const s = load();
  const N = WORLDS.length;
  const unlocked = Math.min(s.unlocked, N);
  const cur = unlocked - 1;
  const regionW = (RIGHT - LEFT) / N;
  const scale = Math.min(1, regionW / 190);
  const lv = SKILLS[s.level];
  const totalStars = s.stars.reduce((a, b) => a + (b || 0), 0);

  // Node positions: each world's stages zigzag across its region.
  const pts = [];
  WORLDS.forEach((w, wi) => {
    const x0 = RIGHT - wi * regionW - 12, x1 = RIGHT - (wi + 1) * regionW + 12;
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
    const locked = p.w > cur;
    const bg = done ? '#F5B82E' : isCur ? '#E63946' : locked ? '#9C927A' : '#F1E6CC';
    return `<div style="position:absolute;left:${p.x - size / 2}px;top:${p.y - size / 2}px;width:${size}px;height:${size}px;pointer-events:none;">
      ${isCur ? `<span class="ring" style="position:absolute;left:0;top:0;width:${size}px;height:${size}px;border-radius:50%;border:3px solid #E63946;box-sizing:border-box;"></span>` : ''}
      <span style="position:absolute;left:0;top:0;width:${size}px;height:${size}px;box-sizing:border-box;transform:rotate(45deg);background:${bg};border:3px solid #2B2118;"></span>
      ${p.boss ? `<svg width="${size}" height="${size}" viewBox="0 0 24 24" style="position:absolute;left:0;top:0;" aria-hidden="true"><path d="M5 16 L6 8 L10 11 L12 6 L14 11 L18 8 L19 16 Z" fill="${isCur ? '#FFFFFF' : '#2B2118'}"></path></svg>` : ''}
    </div>`;
  }).join('');

  const regions = WORLDS.map((w, i) => {
    const cx = RIGHT - (i + 0.5) * regionW;
    const art = ILLUSTRATIONS[w.scene]
      ? `<g transform="translate(${cx} 150) scale(${scale})">${ILLUSTRATIONS[w.scene]}</g>`
      : `<g transform="translate(${cx} 146)"><clipPath id="clip-${w.id}"><circle r="${62 * scale}"></circle></clipPath><image href="${(w.layers && w.layers[0] && w.layers[0].src) || ''}" x="${-160 * scale}" y="${-70 * scale}" height="${140 * scale}" preserveAspectRatio="xMidYMid slice" clip-path="url(#clip-${w.id})"></image><circle r="${62 * scale}" fill="none" stroke="#2B2118" stroke-width="3"></circle></g>`;
    const lock = i > cur ? `<g transform="translate(${cx} 250)"><rect x="${-regionW / 2 + 4}" y="-190" width="${regionW - 8}" height="240" fill="#2B2118" opacity="0.5"></rect><path d="M-14 -58 a14 14 0 0 1 28 0 v10" stroke="#F1E6CC" stroke-width="5" fill="none"></path><rect x="-22" y="-50" width="44" height="34" rx="4" fill="#F1E6CC"></rect><circle cx="0" cy="-34" r="5" fill="#2B2118"></circle></g>` : '';
    return art + lock;
  }).join('');

  const hp = pts[curIdx];
  root.innerHTML = `
  <style>
    @keyframes ring{0%{transform:scale(.8);opacity:.9}100%{transform:scale(2.2);opacity:0}}
    .ring{animation:ring 1.4s ease-out infinite}
    .world-hit{position:absolute;top:70px;height:250px;background:transparent;border:none;cursor:pointer;padding:0;}
  </style>
  <svg width="915" height="412" viewBox="0 0 915 412" style="position:absolute;left:0;top:0;" aria-hidden="true">
    <defs><radialGradient id="paper" cx="0.5" cy="0.5" r="0.7"><stop offset="0" stop-color="#F1E6CC"></stop><stop offset="1" stop-color="#D9C79F"></stop></radialGradient></defs>
    <rect x="36" y="22" width="843" height="370" fill="url(#paper)"></rect>
    <g fill="#C9B587" opacity="0.5"><ellipse cx="200" cy="330" rx="90" ry="20"></ellipse><ellipse cx="640" cy="120" rx="70" ry="16"></ellipse><ellipse cx="480" cy="350" rx="60" ry="12"></ellipse></g>
    <rect x="20" y="14" width="18" height="386" rx="9" fill="#5B3A29" stroke="#2B1A10" stroke-width="2"></rect>
    <rect x="877" y="14" width="18" height="386" rx="9" fill="#5B3A29" stroke="#2B1A10" stroke-width="2"></rect>
    <rect x="17" y="8" width="24" height="10" rx="3" fill="#F5B82E"></rect><rect x="17" y="396" width="24" height="10" rx="3" fill="#F5B82E"></rect>
    <rect x="874" y="8" width="24" height="10" rx="3" fill="#F5B82E"></rect><rect x="874" y="396" width="24" height="10" rx="3" fill="#F5B82E"></rect>
    <polyline points="${poly(pts)}" fill="none" stroke="#2B2118" stroke-width="3" stroke-dasharray="2 8" stroke-linecap="round"></polyline>
    <polyline points="${poly(pts.slice(0, curIdx + 1))}" fill="none" stroke="#B42318" stroke-width="4" stroke-dasharray="10 6" stroke-linecap="round"></polyline>
    ${regions}
  </svg>
  <div style="position:absolute;top:28px;left:0;right:0;display:flex;justify-content:center;pointer-events:none;">
    <div class="sk" style="padding:0 28px;background:#2B2118;"><h1 class="title-xl unsk" style="margin:0;font-size:40px;line-height:1.05;color:#F1E6CC;">מפת העולמות</h1></div>
  </div>
  ${WORLDS.map((w, i) => `
    <div style="position:absolute;left:${RIGHT - (i + 1) * regionW}px;top:206px;width:${regionW}px;display:flex;flex-direction:column;align-items:center;gap:2px;pointer-events:none;">
      <span class="num" style="font-size:13px;color:${i > cur ? '#7A6F58' : '#2B2118'};white-space:nowrap;">${i + 1} · ${w.name}</span>
      <div style="display:flex;gap:2px;">${[0, 1, 2].map((k) => star(k < (s.stars[i] || 0) ? '#F5B82E' : '#E4D6B4', 13, '#2B2118')).join('')}</div>
    </div>`).join('')}
  ${nodes}
  <div style="position:absolute;left:${hp.x - 36}px;top:${hp.y - 76}px;width:200px;height:220px;transform:scale(.32);transform-origin:0 0;pointer-events:none;"><div class="pose-idle">${Fighter({ kind: s.eq.fighter, weapon: s.eq.weapon, aura: s.eq.aura })}</div></div>
  ${WORLDS.map((w, i) => `<button class="world-hit" data-w="${i}" aria-label="עולם ${i + 1}: ${w.name}${i > cur ? ' (נעול)' : ''}" style="left:${RIGHT - (i + 1) * regionW}px;width:${regionW}px;"></button>`).join('')}

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
