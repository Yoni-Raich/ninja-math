import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { routeActivity, bossStyle, shieldCount, defenseMoves, BOSS_STYLES } from '../src/game/variety.js';

const worlds = fs.readdirSync('content/worlds').filter((f) => f.endsWith('.json')).map((f) => JSON.parse(fs.readFileSync('content/worlds/' + f)));
test('every world offers all three activities without replacing its saved path', () => {
  for (const w of worlds) {
    const path = [...w.path];
    const activities = w.path.map((_, i) => routeActivity(w, i)).filter(Boolean);
    assert.equal(activities.length, 3, w.id);
    assert.deepEqual(activities.map((a) => a.kind).sort(), ['gate', 'jump', 'trap']);
    assert.deepEqual(w.path, path);
    assert.equal(routeActivity(w, 0), null);
    assert.equal(routeActivity(w, w.path.length), null);
  }
});
test('boss mechanics cover every belt and leave ordinary enemies alone', () => {
  for (let start = 0; start < 72; start += 12) {
    const styles = new Set(worlds.filter((w) => w.order > start && w.order <= start + 12).map((w) => bossStyle(w, { type: 'boss' })));
    assert.equal(styles.size, 3);
    for (const style of styles) assert.ok(BOSS_STYLES[style]);
  }
  assert.equal(bossStyle(worlds[0], { type: 'enemy' }), null);
  assert.equal(bossStyle(worlds[0], { type: 'boss', pattern: 'wave' }), 'wave');
  assert.equal(shieldCount({ belt: 0 }, 'shield'), 1);
  assert.equal(shieldCount({ belt: 4 }, 'shield'), 2);
  assert.equal(shieldCount({ belt: 4 }, 'wave'), 0);
});
test('defense cues alternate predictably and ask for one or two moves', () => {
  assert.deepEqual(defenseMoves(0), ['jump']);
  assert.deepEqual(defenseMoves(1), ['block']);
  assert.deepEqual(defenseMoves(2, 2), ['jump', 'block']);
  assert.deepEqual(defenseMoves(3, 2), ['block', 'jump']);
});
