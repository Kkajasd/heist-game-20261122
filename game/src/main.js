// Boot and the one loop: input is read every frame, the world advances in fixed 1/60 s steps
// (several in a slow frame, none in a fast one), and the renderer paints what is there. The game
// moves between four screens: title, play, paused and game over. One-shot presses (coin, smoke)
// are taken once per frame and fired on the next fixed step, so a press between two frames is
// never lost and never counted twice.
//
// ?seed=N fixes the layout's random elements. ?shot=cover|tension|escape|caught (with &seed=N)
// stages that scene instead of running the loop, paints it twice and sets window.__shotReady
// for a screenshot.
import { BEST_KEY, LIVES, STEP } from './config.js';
import { createRandom } from './random.js';
import { createWorld, EVENT_CAUGHT, EVENT_COIN, EVENT_ESCAPED, EVENT_LOOT, EVENT_SMOKE, EVENT_SPOTTED } from './world.js';
import { ACTION_COIN, ACTION_CONFIRM, ACTION_PAUSE, ACTION_SMOKE, createInput } from './input.js';
import { createRenderer, SCREEN_OVER, SCREEN_PAUSED, SCREEN_PLAY, SCREEN_TITLE } from './render.js';
import { stageShot } from './shots.js';

/** The longest frame the loop catches up on; a longer stall (a hidden tab) is dropped, not replayed. */
const MAX_FRAME = 0.25;

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : 7;

const canvas = document.getElementById('game');
const status = document.getElementById('status');
const world = createWorld(createRandom(seed));
const renderer = createRenderer(canvas);

function readBest() {
  try {
    return Number.parseInt(window.localStorage.getItem(BEST_KEY) ?? '0', 10) || 0;
  } catch {
    return 0;
  }
}

function saveBest(value) {
  try {
    window.localStorage.setItem(BEST_KEY, String(value));
  } catch {
    // Storage can be off (private windows): the best score then lasts this visit only.
  }
}

function runShot(name) {
  const scene = stageShot(name, world);
  let painted = 0;
  function paint() {
    renderer.draw(world.state, scene.screen, scene.best);
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
}

function runGame() {
  const input = createInput(canvas);
  let screen = SCREEN_TITLE;
  let best = readBest();
  let accumulator = 0;
  let last = performance.now();
  let pendingCoin = false;
  let pendingSmoke = false;

  // Screen readers (and anyone watching the page's text) hear the screen changes and each hit.
  function announce(message) {
    status.textContent = message;
  }

  function startGame() {
    world.reset();
    accumulator = 0;
    screen = SCREEN_PLAY;
    announce(`Playing. ${LIVES} lives. Steal the watch and slip out.`);
  }

  function endGame(escaped) {
    screen = SCREEN_OVER;
    if (world.state.score > best) {
      best = world.state.score;
      saveBest(best);
    }
    announce(escaped ? `Clean getaway. Score ${world.state.score}.` : `Caught. Score ${world.state.score}. Best ${best}.`);
  }

  function step() {
    if (screen === SCREEN_TITLE) {
      world.step(STEP, { dx: 0, dy: 0, sprint: false, coin: false, smoke: false }, true);
      return;
    }
    const direction = input.direction();
    const coin = pendingCoin;
    const smoke = pendingSmoke;
    pendingCoin = false;
    pendingSmoke = false;
    const events = world.step(STEP, {
      dx: direction.x,
      dy: direction.y,
      sprint: input.sprinting(),
      coin,
      smoke,
    }, false);
    if (events & EVENT_SPOTTED) announce('Spotted! Break line of sight!');
    if (events & EVENT_LOOT) announce('The Gilded Hour is yours. Get to the exit!');
    if (events & EVENT_COIN) announce('Coin tossed. A guard goes to look.');
    if (events & EVENT_SMOKE) announce('Smoke out.');
    if (events & EVENT_CAUGHT) announce(world.state.lives === 1 ? 'Caught. 1 life left.' : `Caught. ${world.state.lives} lives left.`);
    if (events & EVENT_ESCAPED) endGame(true);
    else if (world.state.over) endGame(false);
  }

  function frame(now) {
    requestAnimationFrame(frame);
    accumulator += Math.min((now - last) / 1000, MAX_FRAME);
    last = now;
    const actions = input.takeActions();
    if (actions & ACTION_CONFIRM && (screen === SCREEN_TITLE || screen === SCREEN_OVER)) startGame();
    else if (actions & ACTION_PAUSE && screen === SCREEN_PLAY) {
      screen = SCREEN_PAUSED;
      announce('Paused.');
    } else if (actions & (ACTION_PAUSE | ACTION_CONFIRM) && screen === SCREEN_PAUSED) {
      screen = SCREEN_PLAY;
      announce('Playing.');
    }
    if (actions & ACTION_COIN) pendingCoin = true;
    if (actions & ACTION_SMOKE) pendingSmoke = true;
    if (screen === SCREEN_TITLE || screen === SCREEN_PLAY) {
      while (accumulator >= STEP && (screen === SCREEN_TITLE || screen === SCREEN_PLAY)) {
        step();
        accumulator -= STEP;
      }
    } else {
      accumulator = 0;
    }
    renderer.draw(world.state, screen, best);
  }

  // Leaving the tab pauses a running game rather than letting the guards close in unseen.
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && screen === SCREEN_PLAY) {
      screen = SCREEN_PAUSED;
      announce('Paused.');
    }
  });

  announce('The Gilded Hour. Press Space or click to start.');
  requestAnimationFrame(frame);
}

if (shot) runShot(shot);
else runGame();
