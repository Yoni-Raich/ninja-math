# Game content: worlds and enemies

Everything a player fights through is data in this folder. The game loads it at build time
(`src/game/content.js`), so adding a world or an enemy needs no game-code changes.

```
content/
  enemies/<id>.json      one file per enemy, boss or chest
  worlds/NN-<id>.json    one file per world (NN = order on the map)
  templates/             copy these to start a new enemy or world
  sprites/raw/           raw Codex sprite sheets (4 frames in a row)
  sprites/manifest.json  written by the sprite script
  ref/                   style reference attached to every Codex request
public/sprites/<id>.png        game-ready sprite sheets (4 cells of 320x320)
public/backgrounds/*.png       image-world background layers
```

## Add an enemy

1. Copy `templates/enemy.json` to `enemies/<id>.json` and fill it in.
2. Generate its art with Codex:
   ```bash
   npm run sprites -- <id>
   ```
   Codex draws a 4-frame sheet on a transparent background (idle, idle, attack, hurt) in the game's style
   (it gets `ref/style-reference.png`); the script slices it, lines up the feet and writes `public/sprites/<id>.png`.
   Look at the result, and re-run the same command to get a different take.
3. Put the id into a world's `path`.

| field | values |
|---|---|
| `type` | `enemy`, `boss` (bigger, gets a boss intro and can be a timed belt fight), `chest` |
| `hp` | hits needed (bosses 3-4) |
| `reward` | coins per hit |
| `attack` | how it hits back on a wrong answer: `melee` (lunges), `projectile` (throws), `magic` (charge + beam) |
| `projectile` | `feather`, `wisp`, `water`, `snowball`, `fireball`, `laser`, `bolt`, `shuriken` |
| `color` | effect color for sparks, beams and projectiles |
| `art.kind` | `sprite` (Codex-generated) or `svg` (hand-drawn components in `src/art`) |

## Add a world

1. Copy `templates/world.json` to `worlds/NN-<id>.json`.
2. `scene`: one of the built-in parallax scenes (`bamboo`, `rooftops`, `snow`, `volcano`) or `image`
   with generated `layers` (far background + ground strip, each with a Codex `prompt`).
3. Generate the backgrounds:
   ```bash
   npm run backgrounds -- <id>
   ```
   Each layer is mirrored into a seamless loop and scrolls at `speed` seconds per tile.
4. `music`: `bpm` and `scale` (`in`, `yo`, `hira`) for the procedural soundtrack.
5. `path`: the encounters in order. The last one should be a boss; a `chest` restores a heart.

The map, HUD, and battle adapt to any number of worlds and stages.
