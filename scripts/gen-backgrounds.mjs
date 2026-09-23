// Generates image-based world backgrounds with Codex CLI for worlds whose scene is "image".
// Each layer in content/worlds/*.json with a "prompt" becomes public/<layer.src>, resized to the
// layer height and made seamless by mirroring (A | mirrored A) so it can scroll forever.
//
//   node scripts/gen-backgrounds.mjs          -> generate missing layers
//   node scripts/gen-backgrounds.mjs sky      -> regenerate the layers of world "sky"
import { readFileSync, existsSync, readdirSync, mkdirSync, unlinkSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { resolve, dirname } from 'node:path';
import sharp from 'sharp';

const CODEX = process.env.CODEX_BIN || 'C:\\Users\\SHIRA\\AppData\\Local\\Programs\\OpenAI\\Codex\\bin\\codex.exe';
const MODEL = process.env.CODEX_MODEL || 'gpt-6-luna';
const only = process.argv.slice(2);

const worlds = readdirSync('content/worlds').filter((f) => f.endsWith('.json')).map((f) => JSON.parse(readFileSync('content/worlds/' + f, 'utf8')))
  .filter((w) => w.scene === 'image' && (!only.length || only.includes(w.id)));

function codex(promptText, out) {
  return new Promise((res) => {
    if (existsSync(out)) unlinkSync(out);
    const p = spawn(CODEX, ['exec', '-m', MODEL, '--skip-git-repo-check', '-s', 'workspace-write', '-C', resolve('content'), '--image=' + resolve('content/ref/style-reference.png'), '-'], { stdio: ['pipe', 'ignore', 'ignore'] });
    p.stdin.end(`Use your image generation tool to create ONE image, then save it as a PNG file at exactly this path: ${out}
Do not write any code or modify any other files.
${promptText}
Art style: match the attached reference — flat cartoon vector look, clean shapes, thick dark navy outlines (#0B0B14) on near elements, bold flat colors with simple cel shading.`);
    p.on('close', () => res(existsSync(out)));
  });
}

const jobs = [];
for (const w of worlds) for (const layer of w.layers || []) {
  if (!layer.prompt) continue;
  const raw = resolve('content/backgrounds/raw', layer.src.split('/').pop());
  const dst = resolve('public', layer.src);
  if (!only.length && existsSync(dst)) continue;
  jobs.push((async () => {
    mkdirSync(dirname(raw), { recursive: true });
    mkdirSync(dirname(dst), { recursive: true });
    const ok = (await codex(layer.prompt, raw)) || (await codex(layer.prompt, raw));
    if (!ok) { console.log('FAIL', layer.src); return; }
    const tile = await sharp(raw).ensureAlpha().resize({ height: layer.height }).png().toBuffer();
    const meta = await sharp(tile).metadata();
    const mirrored = await sharp(tile).flop().png().toBuffer();
    await sharp({ create: { width: meta.width * 2, height: layer.height, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
      .composite([{ input: tile, left: 0, top: 0 }, { input: mirrored, left: meta.width, top: 0 }])
      .png({ compressionLevel: 9 }).toFile(dst);
    console.log('OK', layer.src, meta.width * 2 + 'x' + layer.height);
  })());
}
await Promise.all(jobs);
