// The screenshot scenes behind ?shot=cover|tension|escape|caught. Each one plays the real
// rules forward from a fresh world for a fixed time, steered by a small autopilot that walks
// the thief between waypoints in the open lanes, so the frame is what a short game really
// looks like and the same seed always gives the same frame. No state is ever placed by hand.
import { STEP } from './config.js';
import { createWorld } from './world.js';
import { SCREEN_OVER, SCREEN_PLAY } from './render.js';

const SAMPLE = STEP;

/** Steer the thief toward (x, y) until close, stuck or the step budget runs out. */
function goTo(world, x, y, maxSeconds, sprint) {
  const state = world.state;
  let steps = Math.floor(maxSeconds / SAMPLE);
  let lastDist = Infinity;
  let stuck = 0;
  while (steps > 0) {
    steps -= 1;
    const dx = x - state.thief.x;
    const dy = y - state.thief.y;
    const dist = Math.hypot(dx, dy);
    if (dist < 12) return true;
    if (dist > lastDist - 0.5) stuck += 1;
    else stuck = 0;
    if (stuck > 30) return false;
    lastDist = dist;
    const len = Math.max(1, dist);
    world.step(SAMPLE, { dx: dx / len, dy: dy / len, sprint: !!sprint, coin: false, smoke: false }, false);
    if (state.over) return false;
  }
  return false;
}

/** Stand still for `seconds`, letting the hall live around the thief. */
function wait(world, seconds) {
  const steps = Math.floor(seconds / SAMPLE);
  for (let index = 0; index < steps; index += 1) {
    world.step(SAMPLE, { dx: 0, dy: 0, sprint: false, coin: false, smoke: false }, false);
    if (world.state.over) return;
  }
}

/** Stand still until the world's clock reaches `seconds`. */
function waitUntil(world, seconds) {
  while (world.state.elapsed < seconds && !world.state.over) {
    world.step(SAMPLE, { dx: 0, dy: 0, sprint: false, coin: false, smoke: false }, false);
  }
}

/** Fire one tool on a single step, in the direction the thief is facing. */
function useTool(world, tool) {
  const input = { dx: 0, dy: 0, sprint: false, coin: false, smoke: false };
  input[tool] = true;
  world.step(SAMPLE, input, false);
}

/**
 * Set `world` to the named scene and return the screen to draw over it and the best score
 * to show. The cover crosses the hall toward the pedestal, waits on the carpet until the
 * centre camera's beam sweeps over it, and tosses a coin that pulls the centre guard up
 * toward the watch; tension hides behind the south-west statue in smoke while a tossed coin
 * draws the west guard across with a question mark; escape grabs the watch, steps into the
 * centre guard's lane to be spotted, and sprints for the door with the guard in pursuit;
 * caught walks into the open and lets the centre guard run it down.
 */
export function stageShot(name, world) {
  world.reset();
  const state = world.state;
  if (name === 'tension') {
    wait(world, 0.5);
    goTo(world, 420, 700, 3, false);
    goTo(world, 330, 600, 3, false);
    waitUntil(world, 10.0);
    useTool(world, 'coin');
    useTool(world, 'smoke');
    wait(world, 0.8);
    return { screen: SCREEN_PLAY, best: 0 };
  }
  if (name === 'escape') {
    goTo(world, 640, 700, 2, true);
    goTo(world, 560, 640, 2, true);
    goTo(world, 560, 430, 2, true);
    goTo(world, 630, 400, 2, true);
    goTo(world, 700, 470, 2, true);
    wait(world, 0.7);
    goTo(world, 560, 620, 2, true);
    goTo(world, 640, 730, 2, true);
    goTo(world, 640, 795, 2, true);
    return { screen: SCREEN_PLAY, best: state.score };
  }
  if (name === 'caught') {
    // Walk into the open and let the centre guard run the thief down, three times: the
    // first two catches cost a life and send the thief back to the door, the third ends
    // the game with the guard on the thief.
    for (let attempt = 0; attempt < 3 && !state.over; attempt += 1) {
      goTo(world, 700, 500, 4, false);
      wait(world, 6);
    }
    return { screen: SCREEN_OVER, best: state.score };
  }
  // cover
  wait(world, 0.5);
  goTo(world, 580, 700, 3, false);
  goTo(world, 580, 520, 3, false);
  goTo(world, 620, 470, 3, false);
  waitUntil(world, 8.0);
  useTool(world, 'coin');
  waitUntil(world, 10.2);
  return { screen: SCREEN_PLAY, best: 0 };
}
