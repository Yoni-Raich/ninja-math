// Renders a style reference sheet (existing hero + enemies) that is attached to every
// Codex sprite request, so generated characters match the game's art direction.
import { mkdirSync } from 'node:fs';
import sharp from 'sharp';
import Fighter from '../src/art/Fighter.js';
import Enemy from '../src/art/Enemy.js';

mkdirSync('content/ref', { recursive: true });
const svgOf = (html, x, y, w, h, vb) => html.match(/<svg[\s\S]*<\/svg>/)[0]
  .replace(/<svg[^>]*>/, `<svg x="${x}" y="${y}" width="${w}" height="${h}" viewBox="${vb}" overflow="visible">`);

const cells = [
  svgOf(Fighter({ kind: 'kage' }), 20, 20, 400, 440, '0 0 200 220'),
  svgOf(Enemy({ kind: 'redninja' }), 440, 20, 400, 440, '0 0 200 220'),
  svgOf(Enemy({ kind: 'oni' }), 860, 20, 400, 440, '0 0 200 220'),
  svgOf(Enemy({ kind: 'tengu' }), 1280, 20, 400, 440, '0 0 200 220')
].join('');
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1700" height="480" viewBox="0 0 1700 480"><rect width="1700" height="480" fill="#FFFFFF"/>${cells}</svg>`;
await sharp(Buffer.from(svg)).png().toFile('content/ref/style-reference.png');
console.log('content/ref/style-reference.png');
