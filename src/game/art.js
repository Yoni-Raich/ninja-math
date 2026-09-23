// Renders content-driven art: enemies (SVG components or generated sprite sheets) and world backgrounds.
import Enemy from '../art/Enemy.js';
import Warlord from '../art/Warlord.js';
import TreasureChest from '../art/TreasureChest.js';
import Scene from '../art/Scene.js';
import { SPRITES } from './content.js';

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
  if (foe.art.kind === 'sprite') {
    // Zoom on the upper-front part of the first frame's bounding box (characters face right).
    const m = SPRITES[foe.id] || {};
    const cell = m.cell || 320;
    const [x0, y0, x1, y1] = m.box || [40, 20, 280, 316];
    const w = x1 - x0, h = y1 - y0;
    const side = Math.max(40, Math.min(w, h) * 0.55);
    const fx = x0 + w * 0.62, fy = y0 + side * 0.5;
    const z = 36 / side;
    return `<div style="position:absolute;left:0;top:0;width:36px;height:36px;background-image:url(sprites/${foe.id}.png);background-repeat:no-repeat;background-size:${cell * 4 * z}px ${cell * z}px;background-position:${-(fx * z - 18)}px ${-(fy * z - 18)}px;"></div>`;
  }
  const [x, y, s] = foe.art.portrait || [-73, -28, 0.8];
  const [w, h] = SVG_BOX[foe.art.component];
  return `<div style="position:absolute;left:${x}px;top:${y}px;width:${w}px;height:${h}px;transform:scale(${s});transform-origin:0 0;">${COMPONENTS[foe.art.component](foe.art.props || {})}</div>`;
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