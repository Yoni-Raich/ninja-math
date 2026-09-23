// Built-in (hand-drawn SVG) fighters and weapons. More of each are data files in content/ (see content.js).
// belt = minimum belt level (index into SKILLS) needed to buy it.
export const BASE_FIGHTERS = [
  { id: 'kage', name: 'קאגה', tag: 'נינג׳ת הצללים — שקט ומהיר', price: 0, belt: 0, glow: '#E63946' },
  { id: 'sakura', name: 'סאקורה', tag: 'קונואיצ׳י עם זוג קונאי', price: 150, belt: 0, glow: '#FF8FB1' },
  { id: 'raiden', name: 'ריידן', tag: 'נינג׳ת הברק והשוריקן', price: 220, belt: 0, glow: '#FCC419' },
  { id: 'jin', name: 'ג׳ין', tag: 'נזיר קונג פו עם מקל בו', price: 280, belt: 0, glow: '#E8590C' },
  { id: 'ryuko', name: 'ריוקו', tag: 'לוחמת הדרקון', price: 350, belt: 1, glow: '#20C997' },
  { id: 'ryu', name: 'ריו', tag: 'סמוראי בשריון אדום', price: 450, belt: 1, glow: '#B42318' }
];

// dmg = damage per hit, crit = % chance of a double-damage critical, ranged = thrown instead of a dash.
export const BASE_WEAPONS = [
  { id: 'auto', name: 'נשק הבית', tag: 'הנשק של הלוחם', price: 0, belt: 0, dmg: 1, crit: 8, color: '#C9D3DF' },
  { id: 'katana', name: 'קטאנה', tag: 'חרב קלאסית', price: 40, belt: 0, dmg: 1, crit: 10, color: '#C9D3DF' },
  { id: 'kunai', name: 'קונאי', tag: 'להב קצר ומהיר', price: 60, belt: 0, dmg: 1, crit: 12, ranged: true, color: '#C9D3DF' },
  { id: 'shuriken', name: 'שוריקן', tag: 'כוכב מסתובב', price: 80, belt: 0, dmg: 1, crit: 12, ranged: true, color: '#C9D3DF' },
  { id: 'bo', name: 'מקל בו', tag: 'מקל ארוך', price: 90, belt: 0, dmg: 1, crit: 10, color: '#C99562' },
  { id: 'nunchaku', name: 'נונצ׳אקו', tag: 'שני מקלות ושרשרת', price: 110, belt: 0, dmg: 1, crit: 14, color: '#F5B82E' },
  { id: 'odachi', name: 'אודאצ׳י', tag: 'חרב ענקית', price: 150, belt: 1, dmg: 2, crit: 6, color: '#E0B24A' },
  { id: 'kusarigama', name: 'קוסאריגמה', tag: 'מגל ושרשרת', price: 180, belt: 1, dmg: 1, crit: 16, color: '#9AA5B1' },
  { id: 'tessen', name: 'מניפת קרב', tag: 'מניפת מתכת', price: 220, belt: 1, dmg: 1, crit: 18, color: '#E63946' }
];

// Weapon upgrade levels 1-5: more damage, more crits, and a glowing trail that changes color by level.
export const MAX_WEAPON_LEVEL = 5;
export const LEVEL_COLORS = ['#C9D3DF', '#C9D3DF', '#4DABF7', '#9775FA', '#F5B82E', '#FF4D5E'];
export function upgradeCost(w, level) { return Math.round((w.price || 60) * 0.45 * level + 70 * level); }
export function weaponStats(w, level = 1) {
  return { dmg: w.dmg + (level >= 3 ? 1 : 0) + (level >= 5 ? 1 : 0), crit: Math.min(60, w.crit + (level - 1) * 5), trail: level >= 2 ? LEVEL_COLORS[level] : w.color || '#C9D3DF' };
}
export const SIGNATURE = { kage: 'katana', sakura: 'kunai', ryu: 'odachi', jin: 'bo', raiden: 'shuriken', ryuko: 'nunchaku' };

