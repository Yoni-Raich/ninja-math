// Renders the launcher icon and splash screen from the game's own vector art into assets/,
// ready for `npx @capacitor/assets generate --android`.
import { mkdirSync } from 'node:fs';
import sharp from 'sharp';
import Fighter from '../src/art/Fighter.js';

mkdirSync('assets', { recursive: true });

function fighterSvg(kind, viewBox, size, x, y, aura = 'none') {
  const svg = Fighter({ kind, aura }).match(/<svg[\s\S]*<\/svg>/)[0];
  return svg.replace(/<svg[^>]*>/, `<svg x="${x}" y="${y}" width="${size}" height="${size}" viewBox="${viewBox}" overflow="visible">`);
}

const brush = `<path d="M150 560 C 240 330, 520 250, 820 300 C 900 312, 950 280, 980 250 C 950 360, 860 410, 740 420 C 560 436, 330 480, 190 640 C 160 672, 132 640, 150 560 Z" fill="#B42318"/>`;

// Head-and-shoulders crop of Kage for the icon.
const bust = fighterSvg('kage', '76 18 84 84', 760, 132, 150);

const iconForeground = `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">${bust}</svg>`;
const iconBackground = `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">
  <defs><radialGradient id="g" cx="0.5" cy="0.45" r="0.7"><stop offset="0" stop-color="#2A2F4A"/><stop offset="1" stop-color="#0B0B14"/></radialGradient></defs>
  <rect width="1024" height="1024" fill="url(#g)"/>
  <circle cx="512" cy="470" r="330" fill="#F4EBD0" opacity="0.9"/>
  ${brush}
</svg>`;
const iconOnly = iconBackground.replace('</svg>', `${bust}</svg>`);

const splash = (w, h) => `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <rect width="${w}" height="${h}" fill="#0B0B14"/>
  <g transform="translate(${w / 2 - 512} ${h / 2 - 560})">
    <circle cx="512" cy="470" r="300" fill="#1E2238"/>
    ${brush}
    ${fighterSvg('kage', '76 18 84 84', 700, 162, 170)}
  </g>
</svg>`;

await sharp(Buffer.from(iconOnly)).png().toFile('assets/icon-only.png');
await sharp(Buffer.from(iconForeground)).png().toFile('assets/icon-foreground.png');
await sharp(Buffer.from(iconBackground)).png().toFile('assets/icon-background.png');
await sharp(Buffer.from(splash(2732, 2732))).png().toFile('assets/splash.png');
await sharp(Buffer.from(splash(2732, 2732))).png().toFile('assets/splash-dark.png');
console.log('icons written to assets/');
