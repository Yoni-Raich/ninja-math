// Loads game content (enemies, worlds, generated sprite metadata) from /content at build time.
const enemyFiles = import.meta.glob('../../content/enemies/*.json', { eager: true, import: 'default' });
const worldFiles = import.meta.glob('../../content/worlds/*.json', { eager: true, import: 'default' });
const manifests = import.meta.glob('../../content/sprites/manifest.json', { eager: true, import: 'default' });
export const SPRITES = Object.values(manifests)[0] || {};

export const FOES = {};
for (const e of Object.values(enemyFiles)) {
  // A sprite enemy whose sheet hasn't been generated yet falls back to the red ninja.
  if (e.art && e.art.kind === 'sprite' && !SPRITES[e.id]) {
    FOES[e.id] = { ...e, art: { kind: 'svg', component: 'Enemy', props: { kind: 'redninja' }, portrait: [-73, -28, 0.8] }, missingSprite: true };
  } else {
    FOES[e.id] = e;
  }
}

export const WORLDS = Object.values(worldFiles)
  .sort((a, b) => a.order - b.order)
  .map((w) => ({ ...w, path: w.path.filter((id) => FOES[id]) }));
