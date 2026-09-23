// Renders content-driven art: enemies (SVG components or generated sprite sheets) and world backgrounds.
import Enemy from '../art/Enemy.js';
import Warlord from '../art/Warlord.js';
import TreasureChest from '../art/TreasureChest.js';
import Scene from '../art/Scene.js';
import Fighter from '../art/Fighter.js';
import Weapon from '../art/Weapon.js';
import { SPRITES, IMAGES } from './content.js';
import { SIGNATURE } from './base.js';

const COMPONENTS = { Enemy, Warlord, TreasureChest };
const SVG_BOX = { Enemy: [200, 220], Warlord: [300, 300], TreasureChest: [180, 150] };

// Size the foe occupies on the battle stage (px, square box, feet at the bottom).
export function foeBox(foe) {
  if (foe.type === 'chest') return 150;
  if (foe.art.kind === 'sprite') return foe.type === 'boss' ? 290 : 210;
  return foe.type === 'boss' ? 255 : 176;
}

// Full-body art sized to foeBox(foe). Sprites cycle idle frames; .pose-attack / .pose-hurt on an
// ancestor switch to the attack / hurt frame (see styles/battle.css).
export function foeArt(foe, opts = {}) {
  const box = opts.box || foeBox(foe);
  if (foe.art.kind === 'sprite') {
    const cell = (SPRITES[foe.id] && SPRITES[foe.id].cell) || 320;
    return `<div class="sprite" style="width:${box}px;height:${box}px;background-image:url(sprites/${foe.id}.png);background-size:${box * 4}px ${box}px;" data-cell="${cell}"></div>`;
  }
  const C = COMPONENTS[foe.art.component];
  const [w, h] = SVG_BOX[foe.art.component];
  const s = box / h;
  return `<div style="width:${box}px;height:${box}px;position:relative;"><div style="position:absolute;left:50%;bottom:0;width:${w}px;height:${h}px;margin-left:${-w / 2}px;transform:scale(${s});transform-origin:50% 100%;">${C(foe.art.props || {})}</div></div>`;
}

// Head crop for the HUD (36x36 frame).
export function foePortrait(foe) {
  if (foe.type === 'chest') return `<div style="position:absolute;left:-2px;top:2px;width:180px;height:150px;transform:scale(0.24);transform-origin:0 0;">${TreasureChest({ open: false })}</div>`;
  if (foe.art.kind === 'sprite') return spritePortrait(foe.id);
  const [x, y, s] = foe.art.portrait || [-73, -28, 0.8];
  const [w, h] = SVG_BOX[foe.art.component];
  return `<div style="position:absolute;left:${x}px;top:${y}px;width:${w}px;height:${h}px;transform:scale(${s});transform-origin:0 0;">${COMPONENTS[foe.art.component](foe.art.props || {})}</div>`;
}

// 36x36 face crop of a sprite sheet: zoom on the upper-front part of the first frame (characters face right).
export function spritePortrait(id) {
  const m = SPRITES[id] || {};
  const cell = m.cell || 320;
  const [x0, y0, x1, y1] = m.box || [40, 20, 280, 316];
  const w = x1 - x0, h = y1 - y0;
  const side = Math.max(40, Math.min(w, h) * 0.55);
  const fx = x0 + w * 0.62, fy = y0 + side * 0.5;
  const z = 36 / side;
  return `<div style="position:absolute;left:0;top:0;width:36px;height:36px;background-image:url(sprites/${id}.png);background-repeat:no-repeat;background-size:${cell * 4 * z}px ${cell * z}px;background-position:${-(fx * z - 18)}px ${-(fy * z - 18)}px;"></div>`;
}

// World background: the built-in SVG parallax scenes, or image layers generated for new worlds.
export function worldScene(world) {
  if (world.scene !== 'image') return Scene({ world: world.scene, moving: true });
  const layers = (world.layers || []).map((l) => `
    <div class="img-layer" data-src="${l.src}" data-h="${l.height}" data-speed="${l.speed}" style="position:absolute;left:0;top:${l.y}px;width:915px;height:${l.height}px;background-image:url(${l.src});background-size:auto ${l.height}px;background-repeat:repeat-x;"></div>`).join('');
  return `<div style="position:relative;width:915px;height:412px;overflow:hidden;background:#8FD3E8;">${layers}</div>`;
}

// Image layers scroll by exactly one tile width so the loop is seamless; call once after mounting.
export function startLayers(root) {
  root.querySelectorAll('.img-layer').forEach((el) => {
    const img = new Image();
    img.onload = () => {
      const w = img.naturalWidth * (Number(el.dataset.h) / img.naturalHeight);
      el._anim = el.animate([{ backgroundPositionX: '0px' }, { backgroundPositionX: w + 'px' }], { duration: Number(el.dataset.speed) * 1000, iterations: Infinity });
      if (el._paused) el._anim.pause();
    };
    img.src = el.dataset.src;
  });
}

export function setSceneMoving(root, moving) {
  const scene = root.querySelector('#scene');
  if (scene) scene.className = moving ? '' : 'paused';
  root.querySelectorAll('.img-layer').forEach((el) => {
    el._paused = !moving;
    if (el._anim) { if (moving) el._anim.play(); else el._anim.pause(); }
  });
}

// ---------------- heroes, weapons, super attacks ----------------
const AURA_COLORS = { fire: '#FF6B1A', ice: '#74C0FC', storm: '#FCC419', shadow: '#9775FA', jade: '#20C997' };

// A hero in a 200x220 box facing right (battle screens mirror it). Built-in heroes are articulated SVG;
// generated heroes are sprite sheets that switch frames with the same .pose-* classes.
export function heroArt(fighter, { weapon = 'auto', aura = 'none' } = {}) {
  if (!fighter || fighter.art.kind !== 'sprite') {
    const img = weapon && IMAGES[weapon] ? { weaponImage: `images/${weapon}.png`, weaponRatio: IMAGES[weapon].w / IMAGES[weapon].h } : {};
    return Fighter({ kind: fighter ? fighter.id : 'kage', weapon: img.weaponImage ? 'auto' : weapon, aura, ...img });
  }
  const glow = AURA_COLORS[aura];
  return `<div style="position:relative;width:200px;height:220px;">
    ${glow ? `<div class="fg-aura" style="position:absolute;left:10px;top:20px;width:180px;height:200px;border-radius:50%;background:radial-gradient(circle, ${glow}cc 0%, ${glow}44 45%, transparent 70%);transform-origin:50% 100%;"></div>` : ''}
    <div style="position:absolute;left:50%;bottom:4px;width:180px;height:14px;margin-left:-90px;border-radius:50%;background:rgba(0,0,0,.35);"></div>
    <div class="sprite hero-sprite" style="position:absolute;left:0;bottom:0;width:210px;height:210px;background-image:url(sprites/${fighter.id}.png);background-size:840px 210px;"></div>
  </div>`;
}

export function weaponIcon(w, fighterId = 'kage', box = [220, 70]) {
  if (w.art && w.art.kind === 'image' && IMAGES[w.id]) {
    // Weapon images point up; lay them down horizontally like the built-in weapon icons.
    const r = IMAGES[w.id].w / IMAGES[w.id].h;
    const len = Math.min(box[0] * 0.92, box[1] / Math.max(r, 0.01));
    return `<div style="width:${box[0]}px;height:${box[1]}px;display:flex;align-items:center;justify-content:center;"><img src="images/${w.id}.png" alt="" style="height:${len}px;width:${len * r}px;transform:rotate(90deg);flex-shrink:0;" /></div>`;
  }
  const kind = w.id === 'auto' ? SIGNATURE[fighterId] || 'katana' : w.id;
  return Weapon({ kind });
}

const SPECIAL_GLYPH = {
  slashes: (c) => `<path d="M10 90 L90 10 M10 10 L90 90" stroke="${c}" stroke-width="12" stroke-linecap="round"></path><path d="M10 90 L90 10 M10 10 L90 90" stroke="#FFFFFF" stroke-width="4" stroke-linecap="round"></path>`,
  rain: (c) => [[20, 20], [55, 10], [80, 35], [35, 55], [70, 70]].map(([x, y]) => `<path transform="translate(${x} ${y})" d="M0 -12 L3 -3 L12 0 L3 3 L0 12 L-3 3 L-12 0 L-3 -3 Z" fill="${c}" stroke="#0B0B14" stroke-width="2"></path>`).join(''),
  petals: (c) => [[25, 30], [60, 20], [75, 55], [40, 70], [20, 60], [55, 45]].map(([x, y], i) => `<ellipse cx="${x}" cy="${y}" rx="9" ry="5" transform="rotate(${i * 50} ${x} ${y})" fill="${c}" stroke="#0B0B14" stroke-width="1.5"></ellipse>`).join(''),
  lightning: (c) => `<path d="M60 5 L30 50 L50 50 L35 95 L75 40 L52 40 L70 5 Z" fill="${c}" stroke="#0B0B14" stroke-width="3" stroke-linejoin="round"></path>`,
  clones: (c) => [20, 45, 70].map((x, i) => `<g opacity="${0.4 + i * 0.3}"><circle cx="${x}" cy="30" r="10" fill="${c}"></circle><path d="M${x - 10} 45 h20 l6 40 h-32 z" fill="${c}"></path></g>`).join('')
};

export function specialArt(sp, size = 100) {
  if (sp.art && IMAGES[sp.id]) return `<img src="images/${sp.id}.png" alt="" style="width:${size}px;height:${size}px;object-fit:contain;" />`;
  const g = SPECIAL_GLYPH[sp.fx] || SPECIAL_GLYPH.slashes;
  return `<svg width="${size}" height="${size}" viewBox="0 0 100 100" aria-hidden="true">${g(sp.color)}</svg>`;
}
