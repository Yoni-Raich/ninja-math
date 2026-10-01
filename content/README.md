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
| `projectile` | `feather`, `wisp`, `water`, `snowball`, `fireball`, `laser`, `bolt`, `shuriken`, `arrow`, `needle`, `sand`, `poison`, `crystal`, `star` |
| `color` | effect color for sparks, beams and projectiles |
| `charge` | `true` = winds up an attack with a visible bar while the question is open. Answering in time interrupts it (stun + bonus coins); a wrong answer speeds it up. The wind-up time adapts to the child's own recent speed (never under 6.5 s). Bosses in a belt fight use the strict belt timer. |
| `art.kind` | `sprite` (Codex-generated) or `svg` (hand-drawn components in `src/art`) |

## Add a fighter, weapon or super attack

Copy the matching template from `templates/` into `fighters/`, `weapons/` or `specials/`, then generate its art:

```bash
npm run sprites -- my-fighter      # fighters: 4-frame sprite sheet (same as enemies)
npm run images -- my-weapon        # weapons and super attacks: one transparent image
```

- `belt`: the belt level (0 = white ... 4 = black) needed before it can be bought. Belt-locked items show a lock and
  the belt name in the shop, so learning progress unlocks new things to discover.
- Weapons: `dmg` damage per hit, `crit` % chance of a double-damage critical, `ranged` thrown instead of a dash.
  Every weapon upgrades in the shop to level 5 (more damage at 3 and 5, more crits, a glowing trail that changes color).
- Super attacks: `fx` picks the cinematic — `slashes`, `rain`, `petals`, `lightning`, `clones` (no image needed),
  or `spikes`, `tornado`, `dragon`, `wave`, `meteor` (use the generated image).
- Anything whose art hasn't been generated yet is simply hidden from the shop.

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

## Voice-over (Hebrew narration)

All speech comes from Gemini TTS (Google AI Studio "Generate speech"). Everything is described in
`content/voice/lines.json`; `npm run voice` turns it into small Opus files in `public/voice/`.

- **Digits and questions** — `n_0..n_20` (numbers) plus `op_plus`, `op_minus`, `op_howmuch`, `op_bond`.
  `src/voice.js` stitches them into "שלוש ועוד ארבע, כמה זה?"; the answer is spoken from `a_<n>`.
- **Battle cries** — groups `attack`, `crit`, `combo`, `special`, `interrupt`, `hurt`, `start`, `warn`, `praise`,
  `speedy`, `retry`, `stronger`, `ko`, `boss`, plus single lines (`victory`, `defeat`, `beltwin`, ...).
  Add a line to a group's `lines` array and rerun: variants are picked at random automatically.
- **Names** — specials (`sp_<id>`), worlds (`world_<id>`), bosses (`foe_<id>`), fighters (`fighter_<id>`) and
  weapons (`weapon_<id>`) are read from their JSON files, so new content gets a voice with one command.

```
$env:GEMINI_API_KEY = "..."      # an AI Studio key
npm run voice                    # generates only the clips that are still missing (resumable)
npm run voice -- n_3 praise_1    # regenerate specific clips
npm run voice -- --process       # re-trim / re-encode existing raw clips
npm run voice -- --verify        # transcribe every clip back and flag mismatches
```

The free tier allows only ~10 requests per model per day, so clips are generated in batches (one request reads
~16 lines, cut apart on the silences) and each voice role has its own model in `lines.json`. If a model's daily
quota runs out the script stops cleanly; run it again after the quota resets. Models named `*native-audio*` use the
Live API instead (one clip per session). A clip that is missing is simply skipped in the game.
