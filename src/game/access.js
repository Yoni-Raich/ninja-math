// Keep earned belts separate from the adaptive exercise level, which can move down.
export function earnedBelt(save) {
  return Math.max(0, Number.isInteger(save.earnedBelt) ? save.earnedBelt : 0, Number.isInteger(save.level) ? save.level : 0);
}

export function requiredBelt(world, foes) {
  return Math.max(world.belt || 0, ...world.path.map((id) => foes[id]?.belt || 0));
}

export function worldAccess(worlds, foes, save, index) {
  const world = worlds[index];
  if (!Number.isInteger(index) || !world) return { playable: false, reason: 'missing', belt: 0 };
  const belt = requiredBelt(world, foes);
  if (earnedBelt(save) < belt) return { playable: false, reason: 'belt', belt };
  if (index >= (save.unlocked || 1)) return { playable: false, reason: 'path', belt };
  return { playable: true, reason: null, belt };
}

export function recommendedWorld(worlds, foes, save) {
  const available = worlds.map((_, i) => i).filter((i) => worldAccess(worlds, foes, save, i).playable);
  return available.find((i) => !(save.stars[i] > 0)) ?? available.at(-1) ?? 0;
}
