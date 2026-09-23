// Generates enemy sprite sheets with Codex CLI image generation, then post-processes them.
//
//   node scripts/gen-sprites.mjs              -> generate every sprite enemy that has no raw sheet yet
//   node scripts/gen-sprites.mjs monkey yeti  -> (re)generate just these ids
//   node scripts/gen-sprites.mjs --process    -> only re-run slicing/normalizing on existing raw sheets
//
// Each enemy is described in content/enemies/<id>.json (see content/README.md).
// Raw 4-frame sheets go to content/sprites/raw/<id>.png; game-ready sheets to public/sprites/<id>.png
// and frame metadata to content/sprites/manifest.json.
import { readFileSync, writeFileSync, existsSync, readdirSync, mkdirSync, unlinkSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';
import sharp from 'sharp';

const CODEX = process.env.CODEX_BIN || 'C:\\Users\\SHIRA\\AppData\\Local\\Programs\\OpenAI\\Codex\\bin\\codex.exe';
const MODEL = process.env.CODEX_MODEL || 'gpt-6-luna';
const CONCURRENCY = Number(process.env.SPRITE_JOBS || 3);
const CELL = 320;
const FRAMES = ['idle fighting stance', 'idle stance, slightly lower (breathing)', 'attacking — lunging forward mid-strike', 'hurt — recoiling backwards, eyes squeezed shut'];

mkdirSync('content/sprites/raw', { recursive: true });
mkdirSync('public/sprites', { recursive: true });

// Enemies and sprite heroes (content/fighters) share the same 4-frame sheet format.
const readDir = (d) => (existsSync(d) ? readdirSync(d).filter((f) => f.endsWith('.json')).map((f) => ({ ...JSON.parse(readFileSync(d + '/' + f, 'utf8')), hero: d.endsWith('fighters') })) : []);
const specs = [...readDir('content/enemies'), ...readDir('content/fighters')].filter((e) => e.art && e.art.kind === 'sprite');

const args = process.argv.slice(2);
const onlyProcess = args.includes('--process');
const ids = args.filter((a) => !a.startsWith('--'));

function prompt(e, out) {
  const frames = (e.art.frames || FRAMES).map((f, i) => `${i + 1}) ${f}`).join(', ');
  return `Use your image generation tool to create ONE image, then save it as a PNG file at exactly this path: ${out}
Do not write any code or modify any other files. Save ONLY the image you generate in this conversation: copy the exact file path your image tool reports. Never copy or reuse any other existing image file.

Image: a game sprite sheet on a fully TRANSPARENT background (alpha channel, no backdrop, no ground, no shadow, no text, no frame borders).
Exactly 4 frames of the SAME character in ONE horizontal row, equal-width cells, generous empty spacing between frames, full body visible in every frame, identical size and scale in every frame, feet (or lowest point) on the same baseline.
Character: ${e.art.prompt} Side view FACING RIGHT.${e.hero ? ' This is a playable HERO — heroic, appealing and cool, holding their weapon.' : ''}${e.type === 'boss' ? ' This is a big, imposing BOSS character — powerful and dramatic, but still kid-friendly (not gory or scary).' : ''}
Frames left to right: ${frames}.
Art style: match the attached reference exactly — flat cartoon vector look, thick dark navy outlines (#0B0B14), bold flat colors with simple cel shading, kid-friendly but cool ninja-action style.`;
}

function runCodex(e) {
  return new Promise((res) => {
    const out = resolve('content/sprites/raw', e.id + '.png');
    if (existsSync(out)) unlinkSync(out);
    const t0 = Date.now();
    const p = spawn(CODEX, ['exec', '-m', MODEL, '--skip-git-repo-check', '-s', 'workspace-write', '-C', resolve('content'), '--image=' + resolve('content/ref/style-reference.png'), '-'], { stdio: ['pipe', 'ignore', 'ignore'] });
    p.stdin.end(prompt(e, out));
    p.on('close', () => {
      // Parallel Codex runs can pick up each other's image; treat an exact copy of another sheet as a failure.
      const hash = (f) => createHash('sha1').update(readFileSync(f)).digest('hex');
      const dup = existsSync(out) && readdirSync('content/sprites/raw').some((f) => f.endsWith('.png') && f !== e.id + '.png' && hash('content/sprites/raw/' + f) === hash(out));
      if (dup) unlinkSync(out);
      const ok = existsSync(out);
      console.log(`${ok ? 'OK  ' : 'FAIL'} ${e.id} (${Math.round((Date.now() - t0) / 1000)}s)`);
      res(ok);
    });
  });
}

// Split a raw sheet into 4 frames using connected components of the alpha mask: the 4 largest
// blobs are the frames, smaller blobs (a detached staff tip, sparks) join the nearest frame.
// Every frame is then normalized into an equal square cell with shared scale and baseline.
async function processSheet(id) {
  const { data, info } = await sharp(`content/sprites/raw/${id}.png`).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width: W, height: H, channels: C } = info;
  const solid = new Uint8Array(W * H);
  for (let i = 0; i < W * H; i++) solid[i] = data[i * C + 3] > 24 ? 1 : 0;
  const label = new Int32Array(W * H).fill(-1);
  const comps = [];
  const stack = new Int32Array(W * H);
  for (let i = 0; i < W * H; i++) {
    if (!solid[i] || label[i] >= 0) continue;
    const id2 = comps.length;
    const c = { id: id2, n: 0, x0: W, x1: 0, y0: H, y1: 0 };
    let sp = 0; stack[sp++] = i; label[i] = id2;
    while (sp) {
      const k = stack[--sp];
      const x = k % W, y = (k - x) / W;
      c.n++; if (x < c.x0) c.x0 = x; if (x > c.x1) c.x1 = x; if (y < c.y0) c.y0 = y; if (y > c.y1) c.y1 = y;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const nx = x + dx, ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
        const nk = ny * W + nx;
        if (solid[nk] && label[nk] < 0) { label[nk] = id2; stack[sp++] = nk; }
      }
    }
    comps.push(c);
  }
  const big = comps.filter((c) => c.n > 40).sort((a, b) => b.n - a.n);
  let frames = big.slice(0, 4).sort((a, b) => a.x0 - b.x0).map((c) => ({ members: [c.id], x0: c.x0, x1: c.x1, y0: c.y0, y1: c.y1 }));
  // Frames joined by an effect (a lightning glow, a weapon trail) arrive as one blob:
  // split the widest frame at its thinnest column until there are 4.
  while (frames.length < 4 && frames.length) {
    const f = frames.reduce((a, b) => (b.x1 - b.x0 > a.x1 - a.x0 ? b : a));
    const keep = new Set(f.members);
    let cut = -1, min = Infinity;
    for (let x = Math.round(f.x0 + (f.x1 - f.x0) * 0.3); x <= Math.round(f.x0 + (f.x1 - f.x0) * 0.7); x++) {
      let n = 0;
      for (let y = f.y0; y <= f.y1; y++) if (keep.has(label[y * W + x])) n++;
      if (n < min) { min = n; cut = x; }
    }
    const a = { ...f, x1: cut - 1, clip: [f.x0, cut - 1] };
    const b = { ...f, x0: cut, clip: [cut, f.x1] };
    frames.splice(frames.indexOf(f), 1, a, b);
  }
  if (frames.length < 4) throw new Error(`${id}: found ${frames.length} frames, expected 4`);
  for (const c of big.slice(4)) {
    const cx = (c.x0 + c.x1) / 2, cy = (c.y0 + c.y1) / 2;
    const dist = (f) => Math.max(0, f.x0 - cx, cx - f.x1) + Math.max(0, f.y0 - cy, cy - f.y1);
    const f = frames.reduce((best, f2) => (dist(f2) < dist(best) ? f2 : best), frames[0]);
    f.members.push(c.id);
    f.x0 = Math.min(f.x0, c.x0); f.x1 = Math.max(f.x1, c.x1); f.y0 = Math.min(f.y0, c.y0); f.y1 = Math.max(f.y1, c.y1);
  }
  const maxW = Math.max(...frames.map((f) => f.x1 - f.x0 + 1));
  const maxH = Math.max(...frames.map((f) => f.y1 - f.y0 + 1));
  const baseline = Math.max(...frames.map((f) => f.y1));
  const scale = Math.min((CELL - 12) / maxW, (CELL - 8) / maxH);
  const composites = [];
  let box = null;
  for (let i = 0; i < 4; i++) {
    const f = frames[i];
    const w = f.x1 - f.x0 + 1, h = f.y1 - f.y0 + 1;
    const keep = new Set(f.members);
    const buf = Buffer.alloc(w * h * 4);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const k = (f.y0 + y) * W + (f.x0 + x);
      if (!keep.has(label[k])) continue;
      if (f.clip && (f.x0 + x < f.clip[0] || f.x0 + x > f.clip[1])) continue;
      const o = (y * w + x) * 4, s = k * C;
      buf[o] = data[s]; buf[o + 1] = data[s + 1]; buf[o + 2] = data[s + 2]; buf[o + 3] = data[s + 3];
    }
    const sw = Math.max(1, Math.round(w * scale)), sh = Math.max(1, Math.round(h * scale));
    const img = await sharp(buf, { raw: { width: w, height: h, channels: 4 } }).resize(sw, sh).png().toBuffer();
    const left = Math.round((CELL - sw) / 2), top = CELL - 4 - Math.round((baseline - f.y1) * scale) - sh;
    if (i === 0) box = [left, top, left + sw, top + sh];
    composites.push({ input: img, left: i * CELL + left, top });
  }
  await sharp({ create: { width: CELL * 4, height: CELL, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite(composites).png({ compressionLevel: 9, palette: true, quality: 90 }).toFile(`public/sprites/${id}.png`);
  return { frames: 4, cell: CELL, box };
}
async function main() {
  let todo = specs.filter((e) => (ids.length ? ids.includes(e.id) : !existsSync(`content/sprites/raw/${e.id}.png`)));
  if (!onlyProcess && todo.length) {
    console.log(`generating ${todo.length} sprite sheet(s) with ${MODEL}, ${CONCURRENCY} at a time...`);
    const queue = todo.slice();
    const workers = Array.from({ length: CONCURRENCY }, async () => {
      while (queue.length) {
        const e = queue.shift();
        let ok = await runCodex(e);
        if (!ok) ok = await runCodex(e); // one retry
      }
    });
    await Promise.all(workers);
  }
  const manifestPath = 'content/sprites/manifest.json';
  const manifest = existsSync(manifestPath) ? JSON.parse(readFileSync(manifestPath, 'utf8')) : {};
  for (const e of specs) {
    if (!existsSync(`content/sprites/raw/${e.id}.png`)) continue;
    if (ids.length && !ids.includes(e.id) && manifest[e.id]) continue;
    try {
      manifest[e.id] = await processSheet(e.id);
      console.log('processed', e.id);
    } catch (err) { console.log('PROCESS FAIL', e.id, err.message); }
  }
  writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
}

main();
