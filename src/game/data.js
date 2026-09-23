export const SKILLS = [
  { id: 'add5', name: 'חיבור עד 5', belt: 'לבנה', color: '#F8F9FA' },
  { id: 'add10', name: 'חיבור עד 10', belt: 'צהובה', color: '#FCC419' },
  { id: 'sub10', name: 'חיסור עד 10', belt: 'כתומה', color: '#FD7E14' },
  { id: 'bond10', name: 'השלמה ל־10', belt: 'ירוקה', color: '#2FB380' },
  { id: 'add20', name: 'חיבור עד 20', belt: 'שחורה', color: '#0B0B14' }
];

// p = portrait crop [left, top, scale] inside the 36px HUD frame
export const FOES = {
  redninja: { type: 'enemy', name: 'שומר אדום', hp: 1, reward: 5, p: [-73, -28, 0.8] },
  tengu: { type: 'enemy', name: 'טנגו העורב', hp: 1, reward: 5, p: [-75, -27, 0.8] },
  lantern: { type: 'enemy', name: 'פנס רפאים', hp: 1, reward: 5, p: [-39, -31, 0.55] },
  oni: { type: 'enemy', name: 'אוני הענק', hp: 2, reward: 8, p: [-66, -23, 0.7] },
  mecha: { type: 'enemy', name: 'נינג׳ה כרום', hp: 2, reward: 8, p: [-75, -27, 0.8] },
  chest: { type: 'chest', name: 'תיבת אוצר', hp: 1, reward: 15, p: [0, 0, 1] },
  shogun: { type: 'boss', name: 'שוגון הצללים', hp: 3, reward: 12, p: [-79, -29, 0.6] },
  dragon: { type: 'boss', name: 'דרקון הסערה', hp: 3, reward: 12, p: [-105, -27, 0.6] }
};

export const WORLDS = [
  { id: 'bamboo', name: 'יער הבמבוק', path: ['redninja', 'tengu', 'chest', 'oni', 'shogun'] },
  { id: 'rooftops', name: 'גגות העיר', path: ['redninja', 'lantern', 'chest', 'lantern', 'dragon'] },
  { id: 'snow', name: 'מקדש השלג', path: ['tengu', 'oni', 'chest', 'redninja', 'shogun'] },
  { id: 'volcano', name: 'מבצר הלבה', path: ['mecha', 'lantern', 'chest', 'mecha', 'dragon'] }
];

export const MAX_HEARTS = 3;

export const FIGHTERS = [
  { id: 'kage', name: 'קאגה', tag: 'נינג׳ת הצללים — שקט ומהיר', special: 'סערת צללים', price: 0, glow: '#E63946' },
  { id: 'sakura', name: 'סאקורה', tag: 'קונואיצ׳י עם זוג קונאי', special: 'גשם פריחה', price: 150, glow: '#FF8FB1' },
  { id: 'raiden', name: 'ריידן', tag: 'נינג׳ת הברק והשוריקן', special: 'שוריקן ברק', price: 220, glow: '#FCC419' },
  { id: 'jin', name: 'ג׳ין', tag: 'נזיר קונג פו עם מקל בו', special: 'מקל הרעם', price: 280, glow: '#E8590C' },
  { id: 'ryuko', name: 'ריוקו', tag: 'לוחמת הדרקון', special: 'אגרוף הדרקון', price: 350, glow: '#20C997' },
  { id: 'ryu', name: 'ריו', tag: 'סמוראי בשריון אדום', special: 'חרב השחר', price: 450, glow: '#B42318' }
];

export const WEAPONS = [
  { id: 'auto', name: 'נשק הבית', tag: 'הנשק של הלוחם', price: 0, icon: 'katana' },
  { id: 'katana', name: 'קטאנה', tag: 'חרב קלאסית', price: 40 },
  { id: 'kunai', name: 'קונאי', tag: 'להב קצר ומהיר', price: 60 },
  { id: 'shuriken', name: 'שוריקן', tag: 'כוכב מסתובב', price: 80 },
  { id: 'bo', name: 'מקל בו', tag: 'מקל ארוך', price: 90 },
  { id: 'nunchaku', name: 'נונצ׳אקו', tag: 'שני מקלות ושרשרת', price: 110 },
  { id: 'odachi', name: 'אודאצ׳י', tag: 'חרב ענקית', price: 150 },
  { id: 'kusarigama', name: 'קוסאריגמה', tag: 'מגל ושרשרת', price: 180 },
  { id: 'tessen', name: 'מניפת קרב', tag: 'מניפת מתכת', price: 220 }
];

export const AURAS = [
  { id: 'none', name: 'ללא', tag: 'בלי הילה', price: 0, glow: '#3A3F5C' },
  { id: 'fire', name: 'אש', tag: 'להבות כתומות', price: 120, glow: '#FF6B1A' },
  { id: 'ice', name: 'קרח', tag: 'אור כחול קר', price: 120, glow: '#74C0FC' },
  { id: 'storm', name: 'סערה', tag: 'ברקים צהובים', price: 160, glow: '#FCC419' },
  { id: 'shadow', name: 'צל', tag: 'עשן סגול', price: 200, glow: '#9775FA' },
  { id: 'jade', name: 'ירקן', tag: 'אנרגיה ירוקה', price: 240, glow: '#20C997' }
];

export const HITS = ['פגיעה!', 'בול!', 'מכה חזקה!', 'מושלם!', 'חתך!'];
