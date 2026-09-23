// Dev helper: renders generated art into contact images for a quick visual review.
//   node scripts/contact-sheet.mjs <outDir>   -> sprites.png, images.png, backgrounds.png
import sharp from 'sharp';
import { readdirSync } from 'node:fs';
import { join } from 'node:path';

const dir = process.argv[2] || '.';
const grid = async (files, w, h, cols, load, out) => {
  const cells = await Promise.all(files.map(load));
  await sharp({ create: { width: cols * w, height: Math.ceil(files.length / cols) * h, channels: 4, background: '#3A3F5C' } })
    .composite(cells.map((c, i) => ({ input: c, left: (i % cols) * w, top: Math.floor(i / cols) * h })))
    .png().toFile(join(dir, out));
  console.log(files.length, '->', out);
};
const png = (d) => readdirSync(d).filter((f) => f.endsWith('.png'));

await grid(png('public/sprites'), 480, 120, 3, (f) => sharp('public/sprites/' + f).resize(480, 120).png().toBuffer(), 'sprites.png');
await grid(png('public/images'), 180, 180, 5, (f) => sharp('public/images/' + f).resize(180, 180, { fit: 'contain', background: '#3A3F5C' }).png().toBuffer(), 'images.png');
await grid(png('public/backgrounds').filter((f) => f.endsWith('-far.png')), 618, 206, 2,
  (f) => sharp('public/backgrounds/' + f).extract({ left: 0, top: 0, width: 1236, height: 412 }).resize(618, 206).png().toBuffer(), 'backgrounds.png');
