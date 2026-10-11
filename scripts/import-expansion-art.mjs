// Import only the selected generated images. Keep the original art and source files.
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import sharp from 'sharp';

const resultsPath = process.argv[2] || 'content/expansion/art-results.json';
const results = JSON.parse(readFileSync(resultsPath, 'utf8'));
const prompts = new Map(JSON.parse(readFileSync('content/expansion/art-jobs.json', 'utf8')).map((job) => [job.id, job.prompt]));
const sprites = [];
for (const job of results) {
  job.prompt ||= prompts.get(job.id);
  if (!existsSync(job.path)) throw new Error(`Generated image missing: ${job.id}`);
  const destination = job.kind === 'sprite' ? `content/sprites/raw/${job.id}.png` : `content/backgrounds/raw/${job.id}-far.png`;
  mkdirSync(dirname(destination), { recursive: true });
  if (!existsSync(destination)) copyFileSync(job.path, destination);
  if (job.kind === 'sprite') { sprites.push(job.id); continue; }
  const tile = await sharp(destination).resize({ height: 412 }).png().toBuffer();
  const { width } = await sharp(tile).metadata();
  const mirror = await sharp(tile).flop().png().toBuffer();
  await sharp({ create: { width: width * 2, height: 412, channels: 4, background: '#8FD3E8' } })
    .composite([{ input: tile, left: 0, top: 0 }, { input: mirror, left: width, top: 0 }])
    .webp({ quality: 85 }).toFile(`public/backgrounds/${job.id}-far.webp`);
  console.log('Imported background', job.id);
}
if (sprites.length) {
  const processed = spawnSync(process.execPath, [resolve('scripts/gen-sprites.mjs'), '--process', ...sprites], { encoding: 'utf8' });
  process.stdout.write(processed.stdout || '');
  process.stderr.write(processed.stderr || '');
  if (processed.status !== 0) throw new Error('Sprite processing failed');
  const manifest = JSON.parse(readFileSync('content/sprites/manifest.json', 'utf8'));
  for (const id of sprites) if (!manifest[id] || !existsSync(`public/sprites/${id}.png`)) throw new Error(`Sprite not ready: ${id}`);
}
// A portable record of the exact prompts and selected workspace files.
writeFileSync('content/expansion/art-manifest.json', JSON.stringify(results.map(({ id, kind, prompt }) => ({
  id, kind, prompt, generator: 'built-in image_gen',
  source: kind === 'sprite' ? `content/sprites/raw/${id}.png` : `content/backgrounds/raw/${id}-far.png`,
  asset: kind === 'sprite' ? `public/sprites/${id}.png` : `public/backgrounds/${id}-far.webp`
})), null, 2) + '\n');
