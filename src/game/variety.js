// Small changes of pace, placed between encounters without changing saved world indexes.
const KINDS = ['jump', 'trap', 'gate'];
export function routeActivity(world, encounter) {
  if (![1, 3, 5].includes(encounter) || encounter >= world.path.length) return null;
  const slot = (encounter - 1) / 2;
  const kind = KINDS[(world.order - 1 + slot) % KINDS.length];
  return { kind, reward: kind === 'gate' ? 18 : 12, steps: 3,
    moves: defenseMoves(world.order + slot, 2) };
}

export const BOSS_STYLES = {
  shield: { name: 'שומר המגן', hint: 'תשובה נכונה שוברת מגן. אחר כך אפשר לפגוע בבוס!', color: '#22D3EE' },
  wave: { name: 'אדון הגלים', hint: 'גל נמוך? קופצים! קליע באוויר? חוסמים!', color: '#20C997' },
  sequence: { name: 'סערה כפולה', hint: 'שתי מתקפות ברצף! עקבו אחרי הסימנים והתגוננו.', color: '#F5B82E' }
};

export function bossStyle(world, foe) {
  if (foe.type !== 'boss') return null;
  const explicit = foe.pattern;
  if (BOSS_STYLES[explicit]) return explicit;
  return ['shield', 'wave', 'sequence'][(world.order - 1) % 3];
}

export function defenseMoves(turn, count = 1) {
  return Array.from({ length: count }, (_, i) => (turn + i) % 2 ? 'block' : 'jump');
}

export function shieldCount(world, style) {
  return style === 'shield' ? (world.belt >= 3 ? 2 : 1) : 0;
}
