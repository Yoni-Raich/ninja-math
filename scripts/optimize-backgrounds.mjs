// Converts image-world background layers to WebP (much smaller APK) and points the world files at them.
// gen-backgrounds writes whatever format the layer's src extension says, so new worlds can use .webp directly.
import { readFileSync, writeFileSync, readdirSync, existsSync, unlinkSync } from 'node:fs';
import sharp from 'sharp';

for (const f of readdirSync('content/worlds').filter((x) => x.endsWith('.json'))) {
  const path = 'content/worlds/' + f;
  const w = JSON.parse(readFileSync(path, 'utf8'));
  if (!w.layers) continue;
  let changed = false;
  for (const l of w.layers) {
    if (!l.src.endsWith('.png') || !existsSync('public/' + l.src)) continue;
    const webp = l.src.replace(/\.png$/, '.webp');
    await sharp('public/' + l.src).webp({ quality: 84, alphaQuality: 90 }).toFile('public/' + webp);
    unlinkSync('public/' + l.src);
    l.src = webp;
    changed = true;
    console.log(webp);
  }
  if (changed) writeFileSync(path, JSON.stringify(w, null, 2) + '\n');
}
