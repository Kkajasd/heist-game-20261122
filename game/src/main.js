// The Velvet Vault — game loop and rules, one job: own the state machine and
// the numbers. Title, playing, paused, level clear, game over, won. The
// alarm meter is the heart of it: it rises while any guard or camera sees the
// thief, falls while hidden, sends guards to investigate past 55, and at 100
// the heist is blown — a life lost, the crew reset, the meter back to 40.
import { LEVELS, parseLevel, blocksMovement, tileAt, COLS, ROWS, HUD_HEIGHT, TILE } from './levels.js';
import { createGuard, updateGuard, guardSeesThief, guardHearsPebble, sendGuardToInvestigate, sendGuardToPursue, calmGuard } from './guards.js';
import { createCamera, updateCamera, cameraSeesThief } from './cameras.js';
import { createInput } from './input.js';
import { createAudio } from './audio.js';
import { renderGame } from './render.js';
import { parseShotQuery, stageShot } from './shots.js';
import { makeRng } from './random.js';

const W = 1280;
const H = 860;
const THIEF_SPEED = 168;
const THIEF_SNEAK_SPEED = 86;
const THIEF_RADIUS = 13;
const ALARM_RISE_GUARD = 58;
const ALARM_RISE_CAMERA = 42;
const ALARM_FALL = 13;
const ALARM_SUSPECT = 55;
const LIVES_MAX = 3;

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const input = createInput(canvas);
const audio = createAudio();

const world = {
  mode: 'title',
  levelIndex: 0,
  walls: [],
  cover: [],
  loot: [],
  lootGot: 0,
  exit: { x: 0, y: 0 },
  exitOpen: false,
  thief: { x: 0, y: 0, sneaking: false, graceLeft: 0 },
  movePath: [],
  guards: [],
  cameras: [],
  pebbles: [],
  pebbleCount: 3,
  alarm: 0,
  lives: LIVES_MAX,
  score: 0,
  elapsed: 0,
  levelTime: 0,
  message: '',
  messageLeft: 0,
  banner: null,
  hud: { levelName: '', alarm: 0, lootGot: 0, lootTotal: 0, lives: LIVES_MAX, livesMax: LIVES_MAX, pebbles: 3, score: 0, timeText: '0:00', muted: false },
};

let rng = makeRng(11);
let lastTick = 0;
let alarmTickLeft = 0;

function loadLevel(index) {
  const def = LEVELS[index];
  rng = makeRng(def.seed);
  const parsed = parseLevel(def);
  world.levelIndex = index;
  world.walls = parsed.walls;
  world.cover = parsed.cover;
  world.loot = parsed.loot.map((item) => ({ ...item, phase: rng() * Math.PI * 2 }));
  world.lootGot = 0;
  world.exit = parsed.exit;
  world.exitOpen = false;
  world.thief.x = parsed.thiefStart.x;
  world.thief.y = parsed.thiefStart.y;
  world.thief.sneaking = false;
  world.thief.graceLeft = 0;
  world.guards = parsed.guardSpawns.map((spawn, i) => createGuard(def.guardPaths[i] || [[0, 0]], spawn));
  world.cameras = parsed.cameraMounts.map((mount, i) => createCamera(mount, def.cameras[i] || { angle: 0, sweep: 50 }));
  world.pebbles = [];
  world.pebbleCount = def.pebbles;
  world.movePath = [];
  world.alarm = 0;
  world.levelTime = 0;
  world.message = def.briefing;
  world.messageLeft = 5;
  world.banner = null;
  syncHud();
}

function syncHud() {
  const totalSeconds = Math.floor(world.elapsed);
  const mm = Math.floor(totalSeconds / 60);
  const ss = String(totalSeconds % 60).padStart(2, '0');
  world.hud.levelName = `Level ${world.levelIndex + 1} of ${LEVELS.length} — ${LEVELS[world.levelIndex].name}`;
  world.hud.alarm = world.alarm;
  world.hud.lootGot = world.lootGot;
  world.hud.lootTotal = world.loot.length;
  world.hud.lives = world.lives;
  world.hud.livesMax = LIVES_MAX;
  world.hud.pebbles = world.pebbleCount;
  world.hud.score = world.score;
  world.hud.timeText = `${mm}:${ss}`;
  world.hud.muted = audio.isMuted();
}

function setBanner(title, lines, color) {
  world.banner = { title, lines, color };
}

function clearBanner() {
  world.banner = null;
}

function startGame() {
  input.drain();
  world.lives = LIVES_MAX;
  world.score = 0;
  world.elapsed = 0;
  loadLevel(0);
  world.mode = 'playing';
  audio.unlock();
  audio.playClick();
}

function thiefBlockedAt(x, y) {
  const r = THIEF_RADIUS;
  return (
    blocksMovement(world.walls, world.cover, x - r, y) ||
    blocksMovement(world.walls, world.cover, x + r, y) ||
    blocksMovement(world.walls, world.cover, x, y - r) ||
    blocksMovement(world.walls, world.cover, x, y + r)
  );
}

// Click-to-move pathfinding: a breadth-first search over walkable tiles, so
// a clicked destination routes around walls instead of pinning the thief
// against the nearest corner. Returns tile-centre waypoints, or [] when no
// route exists (the thief then simply stays put).
function findWalkPath(fromX, fromY, toX, toY) {
  const startCol = Math.floor(fromX / TILE);
  const startRow = Math.floor((fromY - HUD_HEIGHT) / TILE);
  let goalCol = Math.floor(toX / TILE);
  let goalRow = Math.floor((toY - HUD_HEIGHT) / TILE);
  const walkable = (c, r) =>
    c >= 0 && c < COLS && r >= 0 && r < ROWS &&
    tileAt(world.walls, world.cover, c * TILE + TILE / 2, HUD_HEIGHT + r * TILE + TILE / 2) === '.';
  if (!walkable(goalCol, goalRow)) {
    let found = null;
    for (let radius = 1; radius <= 4 && !found; radius++) {
      for (let r = -radius; r <= radius && !found; r++) {
        for (let c = -radius; c <= radius && !found; c++) {
          if (Math.abs(r) + Math.abs(c) === radius && walkable(goalCol + c, goalRow + r)) {
            found = [goalCol + c, goalRow + r];
          }
        }
      }
    }
    if (!found) return [];
    [goalCol, goalRow] = found;
  }
  if (!walkable(startCol, startRow)) return [];
  const key = (c, r) => r * COLS + c;
  const prev = new Map();
  const queue = [[startCol, startRow]];
  prev.set(key(startCol, startRow), null);
  while (queue.length > 0) {
    const [c, r] = queue.shift();
    if (c === goalCol && r === goalRow) break;
    for (const [dc, dr] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nc = c + dc;
      const nr = r + dr;
      if (!walkable(nc, nr) || prev.has(key(nc, nr))) continue;
      prev.set(key(nc, nr), [c, r]);
      queue.push([nc, nr]);
    }
  }
  if (!prev.has(key(goalCol, goalRow))) return [];
  const tiles = [];
  let cur = [goalCol, goalRow];
  while (cur) {
    tiles.push(cur);
    cur = prev.get(key(cur[0], cur[1]));
  }
  tiles.reverse();
  return tiles.slice(1).map(([c, r]) => ({
    x: c * TILE + TILE / 2,
    y: HUD_HEIGHT + r * TILE + TILE / 2,
  }));
}

function moveThief(dt) {
  const s = input.state;
  let dx = 0;
  let dy = 0;
  if (s.up) dy -= 1;
  if (s.down) dy += 1;
  if (s.left) dx -= 1;
  if (s.right) dx += 1;
  if (dx !== 0 || dy !== 0) {
    // Keys win over a click: a fresh direction cancels the walk path.
    world.movePath = [];
    input.clearMoveTarget();
    const len = Math.hypot(dx, dy);
    dx /= len;
    dy /= len;
  } else {
    if (s.moveTarget) {
      world.movePath = findWalkPath(world.thief.x, world.thief.y, s.moveTarget.x, s.moveTarget.y);
      input.clearMoveTarget();
    }
    const waypoint = world.movePath[0];
    if (waypoint) {
      const ddx = waypoint.x - world.thief.x;
      const ddy = waypoint.y - world.thief.y;
      const dist = Math.hypot(ddx, ddy);
      if (dist < 9) {
        world.movePath.shift();
      } else {
        dx = ddx / dist;
        dy = ddy / dist;
      }
    }
  }
  if (dx === 0 && dy === 0) return;
  world.thief.sneaking = s.sneak;
  const speed = s.sneak ? THIEF_SNEAK_SPEED : THIEF_SPEED;
  const nx = world.thief.x + dx * speed * dt;
  const ny = world.thief.y + dy * speed * dt;
  if (!thiefBlockedAt(nx, world.thief.y)) world.thief.x = nx;
  if (!thiefBlockedAt(world.thief.x, ny)) world.thief.y = ny;
}

function throwPebble(at) {
  if (world.pebbleCount <= 0 || world.mode !== 'playing') return;
  if (at.y < HUD_HEIGHT + 8) return;
  world.pebbleCount -= 1;
  world.pebbles.push({ x: at.x, y: at.y, age: 0 });
  audio.playPebble();
  let heard = false;
  for (const guard of world.guards) {
    if (guardHearsPebble(guard, at.x, at.y)) {
      sendGuardToInvestigate(guard, at.x, at.y);
      heard = true;
    }
  }
  world.message = heard ? 'Clink! A guard goes to check the noise…' : 'The pebble lands — nobody heard it.';
  world.messageLeft = 2.5;
}

function collectLoot() {
  for (const item of world.loot) {
    if (item.taken) continue;
    const d = Math.hypot(item.x - world.thief.x, item.y - world.thief.y);
    if (d < 26) {
      item.taken = true;
      world.lootGot += 1;
      const gain = item.kind === 'diamond' ? 250 : 100;
      world.score += gain;
      if (item.kind === 'diamond') audio.playDiamond();
      else audio.playPickup();
      world.message = item.kind === 'diamond' ? 'Diamond! +250' : 'Gold! +100';
      world.messageLeft = 1.6;
      if (world.lootGot === world.loot.length) {
        world.exitOpen = true;
        world.message = 'All loot grabbed — the exit is open. Run for it!';
        world.messageLeft = 4;
        audio.playLevelClear();
      }
    }
  }
}

function checkExit() {
  if (!world.exitOpen) return;
  const d = Math.hypot(world.exit.x - world.thief.x, world.exit.y - world.thief.y);
  if (d < 30) levelCleared();
}

function levelCleared() {
  input.drain();
  const timeBonus = Math.max(0, 600 - Math.floor(world.levelTime) * 5);
  world.score += 500 + timeBonus;
  audio.playWin();
  if (world.levelIndex + 1 >= LEVELS.length) {
    world.mode = 'won';
    setBanner('CLEAN GETAWAY!', [`Score ${world.score} — every vault emptied, nobody caught you.`, 'Press R or click to play again.'], '#4dff88');
  } else {
    world.mode = 'levelclear';
    setBanner('VAULT EMPTIED!', [`Level bonus +${500 + timeBonus} — score ${world.score}.`, 'Press Enter or click for the next vault.'], '#d4af37');
  }
  syncHud();
}

function caughtByAlarm() {
  input.drain();
  world.lives -= 1;
  audio.playCaught();
  audio.updateAlarmHum(0);
  if (world.lives <= 0) {
    world.mode = 'gameover';
    setBanner('BUSTED!', [`The crew got pinched on level ${world.levelIndex + 1}.`, `Final score ${world.score} — press R or click to try again.`], '#ff3c32');
    syncHud();
    return;
  }
  // Blown cover: guards go back to patrol, the thief slips back to the door,
  // the meter drops to 40 and two seconds of grace keep it fair.
  loadLevel(world.levelIndex);
  world.mode = 'playing';
  world.alarm = 40;
  world.thief.graceLeft = 2;
  world.message = `Caught! ${world.lives} ${world.lives === 1 ? 'life' : 'lives'} left — slip back to the door.`;
  world.messageLeft = 3;
  syncHud();
}

function updateAlarm(dt) {
  if (world.thief.graceLeft > 0) {
    world.thief.graceLeft -= dt;
    return;
  }
  let seen = 0;
  let seenBy = null;
  for (const guard of world.guards) {
    const strength = guardSeesThief(guard, world.thief, world.walls, world.cover);
    if (strength > seen) {
      seen = strength;
      seenBy = { kind: 'guard', guard };
    }
  }
  for (const camera of world.cameras) {
    const strength = cameraSeesThief(camera, world.thief, world.walls, world.cover);
    camera.spotted = strength > 0;
    if (strength > seen) {
      seen = strength;
      seenBy = { kind: 'camera', camera };
    }
  }
  const sneakFactor = world.thief.sneaking ? 0.5 : 1;
  if (seen > 0) {
    const rate = (seenBy.kind === 'guard' ? ALARM_RISE_GUARD : ALARM_RISE_CAMERA) * seen * sneakFactor;
    world.alarm = Math.min(100, world.alarm + rate * dt);
    alarmTickLeft -= dt;
    if (alarmTickLeft <= 0) {
      audio.playAlarmTick();
      alarmTickLeft = 0.5;
    }
    if (world.alarm >= ALARM_SUSPECT && seenBy.kind === 'guard') {
      sendGuardToPursue(seenBy.guard, world.thief.x, world.thief.y);
    }
    if (world.alarm >= 100) caughtByAlarm();
  } else {
    world.alarm = Math.max(0, world.alarm - ALARM_FALL * dt);
    if (world.alarm < ALARM_SUSPECT) {
      for (const guard of world.guards) {
        if (guard.mood === 'pursue') calmGuard(guard);
      }
    }
  }
  audio.updateAlarmHum(world.alarm);
}

function updatePlaying(dt) {
  world.elapsed += dt;
  world.levelTime += dt;
  if (world.messageLeft > 0) {
    world.messageLeft -= dt;
    if (world.messageLeft <= 0) world.message = '';
  }
  for (const p of world.pebbles) p.age += dt;
  world.pebbles = world.pebbles.filter((p) => p.age < 1.4);
  const thrown = input.consumeThrow();
  if (thrown) throwPebble(thrown);
  moveThief(dt);
  for (const guard of world.guards) updateGuard(guard, dt, world);
  for (const camera of world.cameras) updateCamera(camera, dt);
  updateAlarm(dt);
  collectLoot();
  checkExit();
  syncHud();
}

function tick(now) {
  const dt = Math.min(0.05, (now - lastTick) / 1000 || 0.016);
  lastTick = now;
  if (input.consumeMute()) {
    audio.toggleMute();
    syncHud();
  }
  if (world.mode === 'title') {
    if (input.consumeConfirm() || input.consumeRestart()) startGame();
  } else if (world.mode === 'playing') {
    if (input.consumePause()) {
      world.mode = 'paused';
      input.drain();
      setBanner('PAUSED', ['P — resume · R — restart the heist · M — mute'], '#9fb4d8');
    } else if (input.consumeRestart()) {
      startGame();
    } else {
      updatePlaying(dt);
    }
  } else if (world.mode === 'paused') {
    if (input.consumePause() || input.consumeConfirm()) {
      clearBanner();
      world.mode = 'playing';
    } else if (input.consumeRestart()) {
      startGame();
    }
  } else if (world.mode === 'levelclear') {
    if (input.consumeConfirm() || input.consumeRestart()) {
      clearBanner();
      loadLevel(world.levelIndex + 1);
      world.mode = 'playing';
    }
  } else if (world.mode === 'gameover' || world.mode === 'won') {
    if (input.consumeConfirm() || input.consumeRestart()) {
      clearBanner();
      startGame();
    }
  }
  renderGame(ctx, world, now / 1000);
  requestAnimationFrame(tick);
}

// Test hook: the play-test driver reads state through window.__heist.
window.__heist = {
  world,
  startGame,
  loadLevel,
  clearMoveTarget() {
    input.clearMoveTarget();
    world.movePath = [];
  },
  state() {
    return {
      mode: world.mode,
      level: world.levelIndex + 1,
      alarm: Math.round(world.alarm),
      lives: world.lives,
      lootGot: world.lootGot,
      lootTotal: world.loot.length,
      exitOpen: world.exitOpen,
      score: world.score,
      thief: { x: Math.round(world.thief.x), y: Math.round(world.thief.y) },
      guards: world.guards.map((g) => g.mood),
      cameras: world.cameras.length,
    };
  },
};

function boot() {
  input.drain();
  loadLevel(0);
  world.mode = 'title';
  setBanner(
    'THE VELVET VAULT',
    [
      'A three-vault heist. Grab every gold coin and diamond, then slip out the exit.',
      'Guards patrol with vision cones. Cameras sweep theirs. Both feed the ALARM meter.',
      'At 100% the alarm blows: you lose a life and start the vault over.',
      'WASD / arrows — move · Shift — sneak · E or right-click — throw a pebble',
      'Click — walk there · P — pause · M — mute · R — restart',
      'Press Enter or click to begin the heist.',
    ],
    '#d4af37',
  );
  syncHud();
  const query = parseShotQuery();
  if (stageShot(world, query.shot)) {
    // A staged shot renders exactly one frozen frame: deterministic by design.
    clearBannerIfShot(query.shot);
    if (query.shot === 'end') {
      setBanner('CLEAN GETAWAY!', ['Score 2840 — every vault emptied, nobody caught you.', 'Press R or click to play again.'], '#4dff88');
    }
    syncHud();
    renderGame(ctx, world, 1.234);
    return;
  }
  clearBanner();
  renderGame(ctx, world, 0);
  lastTick = performance.now();
  requestAnimationFrame(tick);
}

function clearBannerIfShot(shot) {
  // The title shot keeps its banner; staged play shots show the room, not text.
  if (shot !== 'start' && shot !== 'end') clearBanner();
}

boot();
