// The Meridian Vault — deterministic screenshot staging. Each shot plays the
// real rules forward from a fresh world for a fixed number of steps, steered
// by a short scripted route, so the frame is what a real game looks like and
// the same seed always gives the same frame. The cover is the whole heist in
// one frame: the thief mid-room, cones sweeping, beams crossing, loot glowing.
import { STEP } from './config.js';

const SAMPLE = STEP;

// A scripted route: a list of [seconds, keys] the autopilot holds down.
// The thief slips down the left hall, crosses camera A's beam on the way
// (so the alarm is partway up), then out into the open floor toward the
// sapphire — never so close that the loot is taken before its own shot.
const COVER_ROUTE = [
  [0.75, { right: true }],
  [1.0, { down: true }],
  [0.5, {}], // hold in the camera beam: the alarm climbs a little
  [1.75, { right: true }],
];

// The tension shot: the cover route, then a step toward the pedestal and a
// hold in the open while a guard's cone sweeps and a coin rings.
const TENSION_ROUTE = [
  [0.75, { right: true }],
  [1.0, { down: true }],
  [0.5, {}],
  [1.75, { right: true }],
  [0.3, { down: true }],
  [1.0, {}], // hold still, exposed, while the cone passes
];

// The escape shot: the cover route, then to the pedestal for the sapphire,
// The escape shot: the cover route, then to the pedestal for the sapphire,
// then around the pedestal's right side, over the statue, down the far-right
// corridor past the bottom case, and into the exit. The descent stays right
// of the statue and the bottom case, and the run left happens BELOW the
// bottom case — never through it — so the thief reaches the exit.
const ESCAPE_ROUTE = [
  [0.75, { right: true }],
  [1.0, { down: true }],
  [0.5, {}],
  [1.75, { right: true }],
  [0.9, { down: true, right: true }], // close on the pedestal, take the loot
  [0.6, { right: true }], // over the statue, to the far-right corridor
  [1.9, { down: true }], // down past the bottom case
  [0.9, { left: true }], // below the bottom case, toward the exit column
  [0.55, { down: true }], // to the bottom wall
  [0.3, { left: true }], // into the exit
];

function runRoute(world, stepWorld, route) {
  for (const [seconds, keys] of route) {
    const steps = Math.round(seconds / SAMPLE);
    for (let i = 0; i < steps; i += 1) {
      stepWorld(world, SAMPLE, {
        up: !!keys.up, down: !!keys.down, left: !!keys.left, right: !!keys.right,
        sprint: !!keys.sprint, useSmoke: false, throwCoin: false,
      });
      if (world.phase !== 'play') return;
    }
  }
}

// Set `world` to the named scene and return the screen to draw over it.
// cover: mid-crossing, alarm partway up, everything visible at once.
// tension: hidden behind cover, a cone sweeping past, coin ringing.
// escape: sapphire taken, alarm high, the thief sprinting for the exit.
export function stageShot(name, world, stepWorld) {
  const routes = { cover: COVER_ROUTE, tension: TENSION_ROUTE, escape: ESCAPE_ROUTE };
  const route = routes[name] || routes.cover;
  runRoute(world, stepWorld, route);
  if (name === 'escape' && !world.lootTaken) {
    // The scripted route is tuned to reach the pedestal; if it fell short,
    // walk the last stretch straight at the sapphire so the shot still shows
    // the getaway it is named for.
    for (let i = 0; i < 600 && !world.lootTaken && world.phase === 'play'; i += 1) {
      const dx = 700 - world.player.x;
      const dy = 400 - world.player.y;
      stepWorld(world, SAMPLE, {
        up: dy < -8, down: dy > 8, left: dx < -8, right: dx > 8,
        sprint: false, useSmoke: false, throwCoin: false,
      });
    }
  }
  if (name === 'tension' && world.coins.length === 0 && world.player.coins > 0) {
    // Ring one coin on the far side so a guard turns to investigate it.
    world.player.coins -= 1;
    world.coins.push({ x: 1050, y: 250, left: 5 });
    const guard = world.guards[1];
    guard.state = 'investigate';
    guard.lastSeenX = 1050;
    guard.lastSeenY = 250;
    guard.investigateLeft = 5;
  }
  return 'play';
}
