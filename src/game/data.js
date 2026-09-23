// targetMs: a "fast" answer for this skill — the child must be accurate AND usually this quick
// before the belt fight unlocks. Measured silently; only the belt fight shows a timer.
export const SKILLS = [
  { id: 'add5', name: 'חיבור עד 5', belt: 'לבנה', color: '#F8F9FA', targetMs: 4000 },
  { id: 'add10', name: 'חיבור עד 10', belt: 'צהובה', color: '#FCC419', targetMs: 5000 },
  { id: 'sub10', name: 'חיסור עד 10', belt: 'כתומה', color: '#FD7E14', targetMs: 6000 },
  { id: 'bond10', name: 'השלמה ל־10', belt: 'ירוקה', color: '#2FB380', targetMs: 5500 },
  { id: 'add20', name: 'חיבור עד 20', belt: 'שחורה', color: '#0B0B14', targetMs: 7000 }
];

// Enemies and worlds are data: see content/README.md.
export { FOES, WORLDS, FIGHTERS, WEAPONS, SPECIALS, IMAGES } from './content.js';
export const MAX_HEARTS = 3;

export * from './base.js';

export const AURAS = [
  { id: 'none', name: 'ללא', tag: 'בלי הילה', price: 0, glow: '#3A3F5C' },
  { id: 'fire', name: 'אש', tag: 'להבות כתומות', price: 120, glow: '#FF6B1A' },
  { id: 'ice', name: 'קרח', tag: 'אור כחול קר', price: 120, glow: '#74C0FC' },
  { id: 'storm', name: 'סערה', tag: 'ברקים צהובים', price: 160, glow: '#FCC419' },
  { id: 'shadow', name: 'צל', tag: 'עשן סגול', price: 200, glow: '#9775FA' },
  { id: 'jade', name: 'ירקן', tag: 'אנרגיה ירוקה', price: 240, glow: '#20C997' }
];

export const HITS = ['פגיעה!', 'בול!', 'מכה חזקה!', 'מושלם!', 'חתך!'];