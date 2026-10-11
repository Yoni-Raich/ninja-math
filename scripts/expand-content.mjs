// Rebuild the expansion's data. Original worlds and save positions stay in place.
import { mkdirSync, writeFileSync } from 'node:fs';

export const ENEMIES = [
  ['acornscout', 'סייר הבלוטים', 0, 'enemy', 'melee', null, '#ED963A', 'an orange squirrel ninja with a bushy tail, jade scarf and wooden acorn staff'],
  ['mossbeetle', 'חיפושית הטחב', 0, 'enemy', 'melee', null, '#6EA85A', 'a round emerald beetle with a moss-covered shell, tiny samurai helmet and two wooden training sticks'],
  ['bubbleotter', 'לוטרת הבועות', 0, 'enemy', 'projectile', 'water', '#56C5DC', 'a playful brown otter ninja in a turquoise vest, holding a seashell that blows water bubbles'],
  ['paperfox', 'שועל הנייר', 0, 'enemy', 'projectile', 'feather', '#F2BD72', 'an orange origami fox warrior with folded paper ears, a cream kimono and paper fans'],
  ['badgerchief', 'ראש שבט הגיריות', 0, 'boss', 'melee', null, '#BBA287', 'a sturdy friendly badger samurai chief in bronze armor with a large bamboo shield and wooden training hammer'],
  ['willowguardian', 'שומר הערבה', 0, 'boss', 'magic', null, '#6FC98C', 'a friendly living willow tree guardian with leafy eyebrows, root feet, jade runes and a branch staff'],
  ['cactusronin', 'רונין הקקטוס', 1, 'enemy', 'projectile', 'needle', '#8ABD4C', 'a green cactus ronin wearing a straw hat and yellow scarf, with cactus-pad arms and wooden sandals'],
  ['sandgecko', 'שממית החולות', 1, 'enemy', 'projectile', 'sand', '#E6AC66', 'a golden sand gecko ninja with orange spots, a sand-colored mask and two curved bronze daggers'],
  ['coppercrab', 'סרטן הנחושת', 1, 'enemy', 'melee', null, '#CC7952', 'a copper armored crab warrior with huge mechanical pincers, a tiny pirate hat and turquoise glowing eyes'],
  ['windfalcon', 'בז הרוחות', 1, 'enemy', 'projectile', 'feather', '#DAB94C', 'a golden falcon ninja with flowing white wings, a yellow headband and a feather spear'],
  ['scarabking', 'מלך החרפושיות', 1, 'boss', 'magic', null, '#EBC65B', 'a regal blue and gold scarab beetle king with a sun crown, broad golden wings and a jeweled staff'],
  ['bronzegolem', 'גולם הברונזה', 1, 'boss', 'melee', null, '#BF8959', 'a huge round bronze clockwork golem with riveted armor, a glowing amber chest and oversized hammer fists'],
  ['embermantis', 'גמל שלמה לוהט', 2, 'enemy', 'melee', null, '#F9783D', 'a fiery orange praying mantis ninja with dark segmented armor and two glowing curved forearm blades'],
  ['magmaturtle', 'צב המגמה', 2, 'enemy', 'projectile', 'fireball', '#FF9650', 'a stocky red turtle warrior with a black volcanic shell cracked with glowing orange lava and stone gauntlets'],
  ['clockworkowl', 'ינשוף גלגלי השיניים', 2, 'enemy', 'projectile', 'bolt', '#DDA847', 'a brass clockwork owl inventor with large teal goggles, gear wings and a small lightning wand'],
  ['smokeraccoon', 'דביבון העשן', 2, 'enemy', 'projectile', 'wisp', '#B398CE', 'a grey raccoon ninja wearing a purple scarf and black smoke-pattern armor, carrying a glowing incense lantern'],
  ['phoenixknight', 'אביר הפניקס', 2, 'boss', 'magic', null, '#FF9152', 'a heroic giant orange phoenix knight with flaming feather wings, ruby armor and a golden sun spear'],
  ['furnacemaster', 'אדון הכבשן', 2, 'boss', 'projectile', 'fireball', '#FF7441', 'a huge friendly furnace robot samurai with black iron armor, orange glowing furnace belly, chimney shoulders and a forge hammer'],
  ['jadewasp', 'צרעת הירקן', 3, 'enemy', 'projectile', 'needle', '#55D6AF', 'a jade green wasp ninja with translucent wings, emerald segmented armor and a long glowing needle spear'],
  ['stormlynx', 'שונר הסערה', 3, 'enemy', 'projectile', 'bolt', '#75D5E2', 'a blue lynx ninja with tufted ears, silver lightning markings, a flowing green scarf and twin lightning daggers'],
  ['prismserpent', 'נחש המנסרה', 3, 'enemy', 'projectile', 'crystal', '#BF92F1', 'a coiled purple crystal serpent with rainbow prism scales, emerald eyes and a small silver samurai helmet'],
  ['runedeer', 'אייל הרונות', 3, 'enemy', 'magic', null, '#8CF3BB', 'a mystical turquoise deer warrior with branching crystal antlers, green rune cloak and an ancient jade staff'],
  ['aurorastag', 'מלך איילי הזוהר', 3, 'boss', 'magic', null, '#93EACB', 'a majestic giant white stag king with luminous teal aurora antlers, emerald armor and a crescent spear'],
  ['tempesttitan', 'טיטאן הסופות', 3, 'boss', 'projectile', 'bolt', '#67D2ED', 'a towering storm cloud samurai titan with blue stone armor, swirling cloud shoulders, green lightning eyes and a thunder drum'],
  ['voidmoth', 'עש הריק', 4, 'enemy', 'projectile', 'star', '#B58CEB', 'a dark violet cosmic moth ninja with star-pattern wings, bright magenta eyes and a silver moon mask'],
  ['eclipseninja', 'נינג׳ת הליקוי', 4, 'enemy', 'projectile', 'shuriken', '#AA89DF', 'a sleek black and purple eclipse ninja with a glowing crescent visor, cosmic scarf and two star shuriken'],
  ['orbitshark', 'כריש המסלול', 4, 'enemy', 'projectile', 'laser', '#6CBCEA', 'a blue space shark cyborg hovering upright in silver astronaut armor, with neon fins and a laser gauntlet'],
  ['novascorpion', 'עקרב הנובה', 4, 'enemy', 'projectile', 'crystal', '#F29E76', 'a black armored cosmic scorpion with glowing orange constellation spots, giant violet pincers and a blazing star tail'],
  ['stardragon', 'דרקון הכוכבים', 4, 'boss', 'magic', null, '#AB94F5', 'a majestic powerful midnight blue dragon king with a golden constellation crown, luminous violet wings and a swirling galaxy chest core'],
  ['eclipseemperor', 'קיסר הליקוי', 4, 'boss', 'magic', null, '#D0AEF8', 'a grand black and gold celestial samurai emperor with a crescent helmet, purple galaxy cape, floating star ornaments and a large glowing moon blade']
];

export const REGIONS = [
  ['lanternharbor', 'נמל הפנסים', 'an enchanting Japanese harbor at sunset with red lantern strings, little boats, wooden bridges and distant pagodas', 'coral', '#D58656'],
  ['mushroomgrove', 'חורשת הפטריות', 'a magical mossy forest of huge colorful mushrooms, tiny tree houses, fireflies and winding forest paths', 'jungle', '#82AD79'],
  ['lotuslake', 'אגם הלוטוס', 'a peaceful jade lake with enormous pink lotus flowers, lily pads, curved footbridges and a misty temple', 'coral', '#80BAB6'],
  ['paperfestival', 'פסטיבל הנייר', 'a cheerful Japanese origami festival with enormous paper cranes, colorful hanging fans, tents and fluttering ribbons', 'sky', '#EBCBA3'],
  ['sunkencity', 'העיר השקועה', 'an underwater lost city with turquoise water, ancient golden arches, colorful coral, bubbles and rays of light', 'coral', '#79B4C0'],
  ['ambercanyon', 'קניון הענבר', 'a dramatic warm amber canyon with layered cliffs, hanging rope bridges, desert towers and glowing amber stones', 'desert', '#CBB180'],
  ['clockworkport', 'נמל השעונים', 'a whimsical steampunk harbor with brass clock towers, giant gears, copper airships and warm golden steam', 'neon', '#B8A78A'],
  ['emberforge', 'נפחיית הגחלים', 'a kid-friendly volcanic forge city with glowing orange furnaces, dark basalt towers, metal bridges and floating embers', 'crystal', '#AC8376'],
  ['auroravalley', 'עמק הזוהר', 'a magical snowy valley beneath green and violet northern lights, icy trees, a distant crystal palace and mountain peaks', 'moon', '#AAC8DB'],
  ['stormcitadel', 'מצודת הסערה', 'a majestic floating stone citadel above swirling blue storm clouds, turquoise lightning, windmills and jade roofs', 'sky', '#ADC3CC'],
  ['starobservatory', 'מצפה הכוכבים', 'a cosmic mountaintop observatory with gold telescopes, violet galaxies, luminous constellations and floating moon rocks', 'moon', '#A8A3C6'],
  ['eclipsepalace', 'ארמון הליקוי', 'a magnificent celestial samurai palace with black and gold towers, a glowing solar eclipse, purple nebulae and floating stone steps', 'crystal', '#B2A3C1']
];

const ROUTES = [
  ['שביל', 'מסלול אימון'], ['מסע', 'מסע השמש'], ['אתגר', 'אתגר הלהבות'], ['משמר', 'משמר הירקן'], ['אגדת', 'אגדות המאסטרים']
];
const FILTERS = ['', 'saturate(1.1) sepia(.12)', 'saturate(1.15) hue-rotate(-12deg)', 'hue-rotate(18deg) saturate(1.1)', 'hue-rotate(-25deg) brightness(.82)'];
const write = (path, value) => writeFileSync(path, JSON.stringify(value, null, 2) + '\n');

export function expandContent() {
  for (const directory of ['content/enemies', 'content/worlds', 'content/expansion', 'public/backgrounds']) mkdirSync(directory, { recursive: true });
  for (const [id, name, belt, type, attack, projectile, color, character] of ENEMIES) {
    write(`content/enemies/${id}.json`, {
      id, name, tag: type === 'boss' ? 'בוס · שומר האזור' : 'לוחם חדש', type, belt,
      hp: type === 'boss' ? 3 + belt : 1 + Math.floor(belt / 2),
      reward: type === 'boss' ? 16 + belt * 6 : 8 + belt * 3,
      attack, ...(projectile ? { projectile } : {}), color,
      charge: belt > 0 && (type === 'boss' || ['magic', 'projectile'].includes(attack)),
      art: { kind: 'sprite', prompt: character + '.' }
    });
  }
  // Five routes through twelve new locations, with a different encounter roster per belt.
  for (let belt = 0; belt < 5; belt++) {
    const roster = ENEMIES.filter((e) => e[2] === belt);
    const regular = roster.filter((e) => e[3] === 'enemy').map((e) => e[0]);
    const bosses = roster.filter((e) => e[3] === 'boss').map((e) => e[0]);
    REGIONS.forEach(([region, name, description, ground], index) => {
      const order = 13 + belt * 12 + index;
      const id = `${region}-${belt}`;
      const encounters = Array.from({ length: 6 + belt }, (_, stage) => regular[(index + stage) % regular.length]);
      encounters.splice(3, 0, 'chest');
      if (belt >= 2) encounters.splice(7, 0, 'chest');
      encounters.push(bosses[index % bosses.length]);
      write(`content/worlds/${String(order).padStart(2, '0')}-${id}.json`, {
        order, id, name: `${ROUTES[belt][0]} ${name}`, chapter: ROUTES[belt][1], belt, region, scene: 'image',
        layers: [
          { src: `backgrounds/${region}-far.webp`, speed: 66 - belt * 4, y: 0, height: 412, filter: FILTERS[belt] },
          { src: `backgrounds/${ground}-ground.webp`, speed: 8 - belt * .4, y: 318, height: 94 }
        ],
        music: { bpm: 88 + belt * 7 + index % 4 * 5, scale: ['in', 'yo', 'hira'][(index + belt) % 3] },
        path: encounters
      });
    });
  }
  const spritePrompt = (character, boss) => `Use case: stylized-concept. Production-ready transparent sprite sheet for a children's ninja math action game. FOUR frames of the SAME ${character} in ONE horizontal row of equal cells. Side view FACING RIGHT. Frames: 1 idle fighting stance; 2 breathing idle slightly crouched; 3 lunging forward attack; 4 recoiling hurt. Full body visible in each cell, consistent scale, same foot baseline, wide transparent padding, no borders, text, floor or shadows. Flat cartoon vector-like art, thick dark navy outlines #0B0B14, bold flat colors, simple cel shading, friendly but cool.${boss ? ' An imposing but child-friendly boss, no scary or violent detail.' : ''} Aspect ratio about 3:1.`;
  write('content/expansion/art-jobs.json', [
    ...ENEMIES.map(([id, , , type, , , , character]) => ({ id, kind: 'sprite', prompt: spritePrompt(character, type === 'boss') })),
    ...REGIONS.map(([id, , description]) => ({ id, kind: 'background', prompt: `Use case: stylized-concept. A wide panoramic side-scrolling children's ninja game background: ${description}. Landscape about 3:1. Flat cartoon vector-like illustration, bold colorful shapes, simple cel shading, dark navy outlines on near elements, layered distant scenery. Keep the lower third calm and simple for the game's characters. No characters, text, UI, borders or watermark. Full opaque scene with a sky; no transparency.` }))
  ]);
  console.log('Created 60 worlds, 30 enemies/bosses and 42 art jobs. Original worlds are unchanged.');
}

if (process.argv[1]?.replaceAll('\\', '/').endsWith('/expand-content.mjs')) expandContent();
