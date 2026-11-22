# The Meridian Vault

[![best-heist-game-20261122-0559](https://make.fun/badge/best-heist-game-20261122-0559.svg)](https://make.fun/c/best-heist-game-20261122-0559?utm_source=github&utm_medium=readme&utm_campaign=makefun)
[![rank](https://make.fun/badge/best-heist-game-20261122-0559/Kkajasd/heist-game-20261122/rank.svg)](https://make.fun/c/best-heist-game-20261122-0559?utm_source=github&utm_medium=readme&utm_campaign=makefun)
[![reward](https://make.fun/badge/best-heist-game-20261122-0559/Kkajasd/heist-game-20261122/reward.svg)](https://make.fun/c/best-heist-game-20261122-0559?utm_source=github&utm_medium=readme&utm_campaign=makefun)

A night heist in one room. Cross the Meridian gallery, dodge the guards'
vision cones and the sweeping cameras, take the Star Sapphire from its
pedestal, and reach the exit before the alarm catches you.

- **Three routes** through the gallery: the left hall (patrols), the centre
  (cameras over the pedestal), the right gallery (patrols + camera).
- **Tools at a cost:** smoke pellets hide you from every watcher; a tossed
  coin pulls a nearby guard off its patrol. Sprinting is fast — and loud.
- **The alarm meter** rises while any watcher sees you and falls while you
  stay hidden. At 100% every guard converges on you.
- **The getaway:** taking the sapphire jumps the alarm and opens the exit.
  Reach the door to escape.

## Play

Open `game/index.html` in a desktop browser (no network, no build step) or
serve `game/` with any static server.

- **WASD / arrows** — move
- **Shift** — sprint (loud)
- **E** — smoke pellet
- **Q** — throw a coin
- **Enter / click** — start, play again

## Shots

The screenshots in `screenshots/` are deterministic renders of the game's own
code: `?shot=cover`, `?shot=tension` and `?shot=escape` play the real rules
forward from a fresh world to a staged frame.

## Entry

`main.ts` (Node 22, standard library only) copies `game/` and `screenshots/`
to `/output` and writes `/output/dossier.json` with `buildDossier` from
`vendor/makefun-game.ts`.
