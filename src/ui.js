export const coin = (n = 22) => `<svg width="${n}" height="${n}" viewBox="0 0 30 30" aria-hidden="true"><circle cx="15" cy="15" r="13" fill="#F5B82E" stroke="#0B0B14" stroke-width="2.5"></circle><circle cx="15" cy="15" r="9.5" fill="none" stroke="#C98A12" stroke-width="1.6"></circle><rect x="11.5" y="11.5" width="7" height="7" fill="#0B0B14"></rect><path d="M8 11 A8 8 0 0 1 13 6.5" stroke="#FFF1B8" stroke-width="2" fill="none" stroke-linecap="round"></path></svg>`;

export const star = (fill, n = 14, stroke = '#0B0B14') => `<svg width="${n}" height="${n}" viewBox="-10 -10 20 20" aria-hidden="true"><path d="M0 -9 L2.4 -2.4 L9 0 L2.4 2.4 L0 9 L-2.4 2.4 L-9 0 L-2.4 -2.4 Z" fill="${fill}" stroke="${stroke}" stroke-width="1.2"></path></svg>`;

export const belt = (color, w = 30, h = 16, line = '#F8F9FA') => `<svg width="${w}" height="${h}" viewBox="0 0 30 16" aria-hidden="true"><rect x="0" y="5" width="30" height="6" fill="${color}" stroke="${line}" stroke-width="1"></rect><path d="M12 3 L18 3 L16 13 L14 13 Z" fill="${color}" stroke="${line}" stroke-width="1"></path></svg>`;

export const heart = (full, n = 20) => `<svg width="${n}" height="${n}" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21 C4 15 2 11 2 8 a5 5 0 0 1 10 -2 a5 5 0 0 1 10 2 c0 3 -2 7 -10 13 z" fill="${full ? '#E63946' : '#2A1216'}" stroke="${full ? '#FFB3B8' : '#5A2A30'}" stroke-width="2"></path>${full ? '<path d="M6 8 a3 3 0 0 1 3 -3" stroke="#FFFFFF" stroke-width="1.8" fill="none" stroke-linecap="round" opacity="0.7"></path>' : ''}</svg>`;

export const backIcon = (stroke = '#F8F9FA') => `<svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true"><path d="M9 5 L16 12 L9 19" fill="none" stroke="${stroke}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"></path></svg>`;

export const speakerIcon = (on) => `<svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9 H8 L13 5 V19 L8 15 H4 Z" fill="#F8F9FA"></path>${on ? '<path d="M16 9 Q18 12 16 15 M18.5 6.5 Q22 12 18.5 17.5" stroke="#F8F9FA" stroke-width="2" fill="none" stroke-linecap="round"></path>' : '<path d="M16 9 L21 15 M21 9 L16 15" stroke="#F8F9FA" stroke-width="2" stroke-linecap="round"></path>'}</svg>`;

export function $(root, sel) { return root.querySelector(sel); }

// Restart a CSS animation class on an element.
export function replay(el, base, cls) {
  if (!el) return;
  el.className = base;
  void el.offsetWidth;
  if (cls) el.className = base + ' ' + cls;
}
