// Loads game content from /content at build time and merges it with the built-in SVG content.
// Anything whose generated art is missing (sprite sheet / image not produced yet) is left out
// of the shop, or falls back to built-in art for enemies, so a half-finished batch never breaks the game.
import { BASE_FIGHTERS, BASE_WEAPONS, SIGNATURE } from './base.js';

const load = (files) => Object.values(files);
const enemyFiles = load(import.meta.glob('../../content/enemies/*.json', { eager: true, import: 'default' }));
const worldFiles = load(import.meta.glob('../../content/worlds/*.json', { eager: true, import: 'default' }));
const fighterFiles = load(import.meta.glob('../../content/fighters/*.json', { eager: true, import: 'default' }));
const weaponFiles = load(import.meta.glob('../../content/weapons/*.json', { eager: true, import: 'default' }));
const specialFiles = load(import.meta.glob('../../content/specials/*.json', { eager: true, import: 'default' }));
export const SPRITES = load(import.meta.glob('../../content/sprites/manifest.json', { eager: true, import: 'default' }))[0] || {};
export const IMAGES = load(import.meta.glob('../../content/images/manifest.json', { eager: true, import: 'default' }))[0] || {};

export const FOES = {};
for (const e of enemyFiles) {
  if (e.art && e.art.kind === 'sprite' && !SPRITES[e.id]) {
    FOES[e.id] = { ...e, art: { kind: 'svg', component: 'Enemy', props: { kind: 'redninja' }, portrait: [-73, -28, 0.8] }, missingSprite: true };
  } else {
    FOES[e.id] = e;
  }
}

export const WORLDS = worldFiles
  .sort((a, b) => a.order - b.order)
  .map((w) => ({ ...w, path: w.path.filter((id) => FOES[id]) }));

// Fighters: built-in SVG heroes first, then generated sprite heroes, cheapest first.
export const FIGHTERS = [
  ...BASE_FIGHTERS.map((f) => ({ ...f, art: { kind: 'svg' }, weapon: SIGNATURE[f.id] })),
  ...fighterFiles.filter((f) => SPRITES[f.id]).sort((a, b) => a.price - b.price).map((f) => ({ ...f, glow: f.glow || '#F5B82E' }))
];

export const WEAPONS = [
  ...BASE_WEAPONS.map((w) => ({ ...w, art: { kind: 'svg' } })),
  ...weaponFiles.filter((w) => IMAGES[w.id]).sort((a, b) => a.price - b.price)
];

export const SPECIALS = specialFiles
  .filter((s) => !s.art || IMAGES[s.id])
  .sort((a, b) => a.price - b.price);
