import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { earnedBelt, requiredBelt, worldAccess, recommendedWorld } from '../src/game/access.js';

const readContent = (folder) => readdirSync(`content/${folder}`).filter((f) => f.endsWith('.json')).map((f) => JSON.parse(readFileSync(`content/${folder}/${f}`, 'utf8')));
const worlds = readContent('worlds').sort((a, b) => a.order - b.order);
const foes = Object.fromEntries(readContent('enemies').map((foe) => [foe.id, foe]));
const save = (level = 0, unlocked = worlds.length) => ({ level, earnedBelt: level, unlocked, stars: Array(worlds.length).fill(0) });

test('72 worlds retain the original first twelve save positions', () => {
  assert.equal(worlds.length, 72);
  assert.equal(new Set(worlds.map((w) => w.id)).size, worlds.length);
  assert.deepEqual(worlds.slice(0, 12).map((w) => w.id), ['bamboo', 'rooftops', 'snow', 'volcano', 'sky', 'coral', 'desert', 'haunted', 'crystal', 'jungle', 'neon', 'moon']);
  assert.deepEqual(worlds.map((w) => w.order), Array.from({ length: 72 }, (_, i) => i + 1));
  assert.deepEqual([0, 1, 2, 3, 4].map((belt) => worlds.filter((w) => requiredBelt(w, foes) === belt).length), [24, 12, 12, 12, 12]);
});

test('each route has valid encounters, healing and exactly one final boss', () => {
  for (const world of worlds) {
    assert(world.path.length >= 5, world.id);
    assert(world.path.includes('chest'), world.id);
    for (const id of world.path) {
      assert(foes[id], `${world.id}: ${id}`);
      assert((foes[id].belt || 0) <= (world.belt || 0), `${world.id} exposes an enemy from a higher belt`);
    }
    assert.equal(world.path.filter((id) => foes[id].type === 'boss').length, 1, world.id);
    assert.equal(foes[world.path.at(-1)].type, 'boss', world.id);
  }
});

test('white belt cannot enter high-belt worlds even with old completion data', () => {
  const old = save(0);
  old.stars.fill(3);
  worlds.forEach((world, index) => assert.equal(worldAccess(worlds, foes, old, index).playable, (world.belt || 0) === 0, world.id));
});

test('belt gates and the previous-world gate both apply', () => {
  for (let belt = 0; belt <= 4; belt++) {
    const player = save(belt);
    worlds.forEach((world, i) => assert.equal(worldAccess(worlds, foes, player, i).playable, (world.belt || 0) <= belt));
  }
  assert.equal(worldAccess(worlds, foes, save(4, 1), 1).reason, 'path');
  assert.equal(worldAccess(worlds, foes, save(0, 25), 24).reason, 'belt');
  assert.equal(worldAccess(worlds, foes, save(1, 25), 24).playable, true);
});

test('a high-belt enemy cannot bypass a low world requirement', () => {
  const world = { belt: 0, path: ['elite'] };
  const enemies = { elite: { belt: 4 } };
  assert.equal(worldAccess([world], enemies, save(0), 0).reason, 'belt');
  assert.equal(worldAccess([world], enemies, save(4), 0).playable, true);
});

test('an adaptive level drop keeps earned belt access and recommends a playable world', () => {
  const player = save(0, 50);
  player.earnedBelt = 3;
  player.stars.fill(3, 0, 49);
  assert.equal(earnedBelt(player), 3);
  assert.equal(worldAccess(worlds, foes, player, 49).playable, true);
  assert.equal(recommendedWorld(worlds, foes, player), 49);
  player.earnedBelt = 0;
  assert.equal(recommendedWorld(worlds, foes, player), 23);
  for (const index of [-1, 72, 1.5, '1', undefined]) assert.equal(worldAccess(worlds, foes, player, index).playable, false);
});

test('all expansion enemies are used, with six new opponents per belt', () => {
  const jobs = JSON.parse(readFileSync('content/expansion/art-jobs.json', 'utf8'));
  const newEnemies = jobs.filter((j) => j.kind === 'sprite').map((job) => foes[job.id]);
  assert.equal(newEnemies.length, 30);
  for (let belt = 0; belt <= 4; belt++) {
    const roster = newEnemies.filter((e) => e.belt === belt);
    assert.equal(roster.length, 6);
    assert.equal(roster.filter((e) => e.type === 'boss').length, 2);
    for (const enemy of roster) assert(worlds.some((world) => world.path.includes(enemy.id)), enemy.id);
  }
});

test('generated game assets are ready; no expansion enemy uses fallback art', () => {
  const jobs = JSON.parse(readFileSync('content/expansion/art-jobs.json', 'utf8'));
  const manifest = JSON.parse(readFileSync('content/sprites/manifest.json', 'utf8'));
  for (const job of jobs) {
    if (job.kind === 'sprite') { assert.equal(manifest[job.id]?.frames, 4, job.id); assert(existsSync(`public/sprites/${job.id}.png`), job.id); }
    else assert(existsSync(`public/backgrounds/${job.id}-far.webp`), job.id);
  }
  for (const world of worlds) for (const layer of world.layers || []) assert(existsSync(`public/${layer.src}`), `${world.id}: ${layer.src}`);
});
