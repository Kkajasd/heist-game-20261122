# The Velvet Vault

[![make.fun](https://make.fun/badge/best-heist-game-20261122-0559.svg)](https://make.fun/bounty/best-heist-game-20261122-0559?utm_source=github&utm_medium=referral&utm_campaign=competition)
[![make.fun rank](https://make.fun/badge/best-heist-game-20261122-0559/Kkajasd/heist-game-20261122/rank.svg)](https://make.fun/bounty/best-heist-game-20261122-0559?utm_source=github&utm_medium=referral&utm_campaign=competition)
[![make.fun reward](https://make.fun/badge/best-heist-game-20261122-0559/Kkajasd/heist-game-20261122/reward.svg)](https://make.fun/bounty/best-heist-game-20261122-0559?utm_source=github&utm_medium=referral&utm_campaign=competition)

A top-down 2D heist game for the make.fun **best-heist-game-20261122-0559**
bounty. You are the thief in a velvet-draped museum after dark: slip past
patrolling guards and sweeping security cameras, grab every gold coin and
diamond, and reach the exit before the alarm meter hits 100%.

## How to play

- **Move:** WASD or arrow keys, or click anywhere to walk there.
- **Sneak:** hold Shift — slower, but the alarm rises half as fast.
- **Distract:** press E or right-click to throw a pebble. Guards nearby go
  to check the noise. You carry 3 pebbles per vault (4 in the last one).
- **Loot:** touch gold coins (+100) and diamonds (+250). The exit unlocks
  only when every loot in the vault is taken.
- **Alarm meter:** the gauge up top rises while a guard or a camera can see
  you, and falls while you stay hidden. Past 55% the nearest guard comes to
  investigate. At 100% you are caught: you lose a life and restart the vault
  with the meter at 40%. Lose all 3 lives and the crew is busted.
- **Win:** empty all three vaults — the Gallery, the Gilded Hall and the
  Crown Vault — and slip out clean for the getaway bonus.
- **Keys:** P pause, M mute, R restart, Enter/click confirms on menus.

Guards patrol fixed loops and pause at corners to look around. Cameras are
mounted on the walls and sweep their red cones back and forth — time the
sweep. Walls and crates block sight, so a cone you cannot see through is a
cone you can hide behind.

## Run it

```sh
node serve.ts        # serves game/ at http://localhost:8080
```

Open the page in desktop Chrome and play. No build step, no network
requests: every file the game loads lives under `game/`, and the sound is
synthesized with WebAudio.

## Hand in

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

`main.ts` (Node 22, standard library only) copies `game/` and
`screenshots/` to the output directory and writes `dossier.json` with the
vendored `vendor/makefun-game.ts`. Screenshots are staged renders of the
game's own code — see `shots.json` for the `?shot=` queries used
(`play` is the cover: thief, guard cone, camera cone, loot and alarm meter
in one frame).

## Layout

- `game/index.html` — the page, one canvas.
- `game/src/main.js` — game loop, state machine, alarm rules.
- `game/src/levels.js` — the three vaults: maps, patrols, cameras.
- `game/src/guards.js` — patrol, investigate and pursue behaviour.
- `game/src/cameras.js` — sweeping camera cones and their sight check.
- `game/src/render.js` — canvas drawing: floor, cones, HUD, alarm meter.
- `game/src/input.js` — keyboard and mouse.
- `game/src/audio.js` — WebAudio bleeps and the alarm hum.
- `game/src/shots.js` — deterministic `?shot=` staging for screenshots.
- `game/src/random.js` — seeded RNG and small math helpers.
- `main.ts` — the hand-in program. `serve.ts` — local static server.
