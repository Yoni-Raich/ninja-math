// Generates single transparent images with Codex CLI: weapon art (content/weapons) and
// super-attack effects (content/specials) — any spec whose art.kind is "image".
//
//   node scripts/gen-images.mjs                -> generate missing images
//   node scripts/gen-images.mjs tornado meteor -> (re)generate these ids
//
// Output: public/images/<id>.png, trimmed to its content and at most 640px on the long side.
import { readFileSync, existsSync, readdirSync, mkdirSync, unlinkSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';
import sharp from 'sharp';

const CODEX = process.env.CODEX_BIN || 'C:\\Users\\SHIRA\\AppData\\Local\\Programs\\OpenAI\\Codex\\bin\\codex.exe';
const MODEL = process.env.CODEX_MODEL || 'gpt-6-luna';
const CONCURRENCY = Number(process.env.IMAGE_JOBS || 2);
const ids = process.argv.slice(2);

mkdirSync('content/images/raw', { recursive: true });
mkdirSync('public/images', { recursive: true });

const specs = ['weapons', 'specials'].flatMap((d) => (existsSync('content/' + d) ? readdirSync('content/' + d) : [])
  .filter((f) => f.endsWith('.json')).map((f) => JSON.parse(readFileSync(`content/${d}/${f}`, 'utf8'))))
  .filter((s) => s.art && s.art.kind === 'image' && (ids.length ? ids.includes(s.id) : !existsSync(`public/images/${s.id}.png`)));

const hash = (f) => createHash('sha1').update(readFileSync(f)).digest('hex');

function codex(s) {
  return new Promise((res) => {
    const out = resolve('content/images/raw', s.id + '.png');
    if (existsSync(out)) unlinkSync(out);
    const p = spawn(CODEX, ['exec', '-m', MODEL, '--skip-git-repo-check', '-s', 'workspace-write', '-C', resolve('content'), '--image=' + resolve('content/ref/style-reference.png'), '-'], { stdio: ['pipe', 'ignore', 'ignore'] });
    p.stdin.end(`Use your image generation tool to create ONE image, then save it as a PNG file at exactly this path: ${out}
Do not write any code or modify any other files. Save ONLY the image you generate in this conversation: copy the exact file path your image tool reports. Never copy or reuse any other existing image file.
Image: ${s.art.prompt}
Fully TRANSPARENT background (alpha channel), nothing else in the image, no text.
Art style: match the attached reference — flat cartoon vector look, thick dark navy outlines (#0B0B14), bold flat colors with simple cel shading, glowing effects where magical.`);
    p.on('close', () => {
      const dup = existsSync(out) && readdirSync('content/images/raw').some((f) => f.endsWith('.png') && f !== s.id + '.png' && hash('content/images/raw/' + f) === hash(out));
      if (dup) unlinkSync(out);
      res(existsSync(out));
    });
  });
}

async function finish(s) {
  const trimmed = await sharp(`content/images/raw/${s.id}.png`).ensureAlpha().trim({ threshold: 10 }).png().toBuffer();
  await sharp(trimmed).resize({ width: 640, height: 640, fit: 'inside', withoutEnlargement: true }).png({ compressionLevel: 9 }).toFile(`public/images/${s.id}.png`);
}

const queue = specs.slice();
console.log(`generating ${queue.length} image(s)...`);
await Promise.all(Array.from({ length: CONCURRENCY }, async () => {
  while (queue.length) {
    const s = queue.shift();
    const t0 = Date.now();
    // A raw image left from an interrupted run is finished without asking Codex again.
    const ok = (!ids.length && existsSync(`content/images/raw/${s.id}.png`)) || (await codex(s)) || (await codex(s));
    if (ok) { await finish(s); console.log(`OK   ${s.id} (${Math.round((Date.now() - t0) / 1000)}s)`); }
    else console.log('FAIL', s.id);
  }
}));

// Record every game-ready image's size (the game needs aspect ratios to place weapons in hand).
const { writeFileSync } = await import('node:fs');
const manifest = {};
for (const f of readdirSync('public/images').filter((x) => x.endsWith('.png'))) {
  const m = await sharp('public/images/' + f).metadata();
  manifest[f.replace('.png', '')] = { w: m.width, h: m.height };
}
writeFileSync('content/images/manifest.json', JSON.stringify(manifest, null, 2));
console.log('manifest:', Object.keys(manifest).length, 'images');
