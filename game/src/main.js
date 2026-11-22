// The Meridian Vault — the game loop: title, play, caught, escaped. The loop
// runs on a fixed 1/60 s step, so the game plays the same however fast the
// browser draws it. A ?shot=cover|tension|escape query stages a deterministic
// scene for the screenshots instead of opening the title screen.
import { VIEW, STEP } from './config.js';
import { createWorld, stepWorld } from './world.js';
import { drawGame } from './render.js';
import { createInput, attachInput, clearPresses } from './input.js';
import { stageShot } from './shots.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
canvas.width = VIEW.width;
canvas.height = VIEW.height;

const input = createInput();
attachInput(input, window);

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seed = Number(params.get('seed') || 7);

let world = createWorld(seed);
let screen = 'title'; // title | play | caught | escaped

if (shot) {
  // A staged screenshot: play the real rules forward to the named scene,
  // then draw that one frame and stop. The frame is the game's own render.
  stageShot(shot, world, stepWorld);
  screen = 'play';
  drawGame(ctx, world, screen);
  document.title = `The Meridian Vault — ${shot}`;
} else {
  let last = performance.now();
  let accumulator = 0;
  let lastEvents = 0;

  function frame(now) {
    const elapsed = Math.min(0.25, (now - last) / 1000);
    last = now;
    accumulator += elapsed;
    while (accumulator >= STEP) {
      accumulator -= STEP;
      if (screen === 'title' && input.confirm) {
        world = createWorld(seed);
        screen = 'play';
      } else if ((screen === 'caught' || screen === 'escaped') && input.confirm) {
        world = createWorld(seed);
        screen = 'play';
      } else if (screen === 'play') {
        lastEvents = stepWorld(world, STEP, input);
        if (world.phase === 'caught') screen = 'caught';
        if (world.phase === 'escaped') screen = 'escaped';
      }
      clearPresses(input);
    }
    drawGame(ctx, world, screen);
    // Announce the state for screen readers, throttled to one line a second.
    const status = document.getElementById('status');
    if (status && (screen !== 'play' || world.spottedNow)) {
      status.textContent = screen === 'play'
        ? `Alarm ${Math.round(world.alarm)} percent. ${world.lootTaken ? 'Sapphire secured, reach the exit.' : 'Sapphire still on its pedestal.'}`
        : screen;
    }
    requestAnimationFrame(frame);
  }

  requestAnimationFrame(frame);
}
