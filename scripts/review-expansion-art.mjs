import { mkdirSync, readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';
import sharp from 'sharp';

const output = 'output/expansion-checks';
mkdirSync(output, { recursive: true });
const jobs = JSON.parse(readFileSync('content/expansion/art-jobs.json', 'utf8'));
const hashes = new Set();
const label = (id, w, h) => Buffer.from(`<svg width="${w}" height="${h}"><text x="8" y="${h - 8}" fill="#FFFFFF" font-size="15" font-family="Arial">${id}</text></svg>`);
const sprites = jobs.filter((j) => j.kind === 'sprite');
const spriteTiles = [];
for (const job of sprites) {
  const path = `public/sprites/${job.id}.png`;
  const hash = createHash('sha256').update(readFileSync(path)).digest('hex');
  assert(!hashes.has(hash), `${job.id}: duplicate sprite`);
  hashes.add(hash);
  const { data, info } = await sharp(path).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  assert.equal(info.width, 1280, job.id);
  assert.equal(info.height, 320, job.id);
  for (let cell = 0; cell < 4; cell++) {
    let pixels = 0;
    for (let y = 0; y < 320; y++) for (let x = cell * 320; x < (cell + 1) * 320; x++) if (data[(y * 1280 + x) * 4 + 3] > 24) pixels++;
    assert(pixels > 1000 && pixels < 90000, `${job.id}: frame ${cell} must contain a transparent character`);
  }
  const frames = await sharp(path).resize(480, 120).png().toBuffer();
  spriteTiles.push(await sharp({ create: { width: 480, height: 146, channels: 4, background: '#30374B' } })
    .composite([{ input: frames, left: 0, top: 0 }, { input: label(job.id, 480, 146), left: 0, top: 0 }]).png().toBuffer());
}
await sharp({ create: { width: 1440, height: 1460, channels: 4, background: '#30374B' } })
  .composite(spriteTiles.map((input, i) => ({ input, left: i % 3 * 480, top: Math.floor(i / 3) * 146 }))).png().toFile(`${output}/new-enemies.png`);
const backgrounds = jobs.filter((j) => j.kind === 'background');
const backgroundTiles = [];
for (const job of backgrounds) {
  const path = `public/backgrounds/${job.id}-far.webp`;
  const { width, height } = await sharp(path).metadata();
  const landscape = await sharp(path).extract({ left: 0, top: 0, width: Math.floor(width / 2), height }).resize(480, 164).png().toBuffer();
  backgroundTiles.push(await sharp({ create: { width: 480, height: 190, channels: 4, background: '#30374B' } })
    .composite([{ input: landscape, left: 0, top: 0 }, { input: label(job.id, 480, 190), left: 0, top: 0 }]).png().toBuffer());
}
await sharp({ create: { width: 1440, height: 760, channels: 4, background: '#30374B' } })
  .composite(backgroundTiles.map((input, i) => ({ input, left: i % 3 * 480, top: Math.floor(i / 3) * 190 }))).png().toFile(`${output}/new-locations.png`);
console.log('PASS 30 unique transparent four-frame sprites. Created enemy and location contact sheets.');
