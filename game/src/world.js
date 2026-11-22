// The Meridian Vault — the world: a night museum gallery, its guards, cameras,
// loot and alarm. The thief crosses the room, takes the Star Sapphire and
// reaches the exit. Everything here is pure state plus one fixed step, so a
// staged screenshot is a real game played forward, never a posed picture.
import { VIEW, PLAYER, GUARD, CAMERA, ALARM, TOOLS, STEP } from './config.js';
import { mulberry32 } from './random.js';

// Step results, as a bitmask, so the screens can react to what just happened.
export const EVENT_NONE = 0;
export const EVENT_LOOT = 1;
export const EVENT_CAUGHT = 2;
export const EVENT_ESCAPED = 4;
export const EVENT_ALARM_TRIP = 8;
export const EVENT_SPOTTED = 16;

export const FIELD = { x: 28, y: 28, width: VIEW.width - 56, height: VIEW.height - 56 };

// The outer walls, as rectangles the thief and the guards collide with.
export const WALLS = [
  { x: 0, y: 0, w: VIEW.width, h: 28 },
  { x: 0, y: VIEW.height - 28, w: VIEW.width, h: 28 },
  { x: 0, y: 0, w: 28, h: VIEW.height },
  { x: VIEW.width - 28, y: 0, w: 28, h: VIEW.height },
];

// Display cases: solid cover. A case between a watcher and the thief breaks
// the line of sight, so the room reads as three routes, not one open floor.
export const CASES = [
  { x: 280, y: 180, w: 180, h: 70 },
  { x: 280, y: 520, w: 180, h: 70 },
  { x: 560, y: 150, w: 200, h: 70 },
  { x: 900, y: 180, w: 180, h: 70 },
  { x: 900, y: 520, w: 180, h: 70 },
  { x: 560, y: 620, w: 200, h: 70 },
];

// Marble statues: round cover, same rule as the cases.
export const STATUES = [
  { x: 480, y: 380, r: 26 },
  { x: 820, y: 380, r: 26 },
];

// The sapphire's pedestal, at the middle of the room. Touch it to take the loot.
export const PEDESTAL = { x: 665, y: 365, w: 70, h: 70, lootRadius: 62 };

// The exit door in the bottom wall. It only opens once the loot is taken.
export const EXIT = { x: 640, y: VIEW.height - 28 };

// Velvet ropes around the pedestal: decoration only, they never block movement.
export const ROPES = [
  { x1: 615, y1: 330, x2: 715, y2: 330 },
  { x1: 615, y1: 470, x2: 715, y2: 470 },
  { x1: 615, y1: 330, x2: 615, y2: 470 },
  { x1: 715, y1: 330, x2: 715, y2: 470 },
];

// --- geometry helpers -------------------------------------------------------

function clamp(value, min, max) {
  return value < min ? min : value > max ? max : value;
}

function distance(x1, y1, x2, y2) {
  return Math.hypot(x2 - x1, y2 - y1);
}

// Does the segment (x1,y1)-(x2,y2) cross the rectangle? A watcher's sight
// line is blocked when it crosses any case, statue or inner wall.
function segmentHitsRect(x1, y1, x2, y2, r) {
  if (x1 > r.x && x1 < r.x + r.w && y1 > r.y && y1 < r.y + r.h) return true;
  if (x2 > r.x && x2 < r.x + r.w && y2 > r.y && y2 < r.y + r.h) return true;
  const dx = x2 - x1;
  const dy = y2 - y1;
  let tmin = 0;
  let tmax = 1;
  if (Math.abs(dx) < 1e-9) {
    if (x1 < r.x || x1 > r.x + r.w) return false;
  } else {
    let t1 = (r.x - x1) / dx;
    let t2 = (r.x + r.w - x1) / dx;
    if (t1 > t2) { const t = t1; t1 = t2; t2 = t; }
    tmin = Math.max(tmin, t1);
    tmax = Math.min(tmax, t2);
    if (tmin > tmax) return false;
  }
  if (Math.abs(dy) < 1e-9) {
    if (y1 < r.y || y1 > r.y + r.h) return false;
  } else {
    let t1 = (r.y - y1) / dy;
    let t2 = (r.y + r.h - y1) / dy;
    if (t1 > t2) { const t = t1; t1 = t2; t2 = t; }
    tmin = Math.max(tmin, t1);
    tmax = Math.min(tmax, t2);
    if (tmin > tmax) return false;
  }
  return true;
}

function segmentHitsCircle(x1, y1, x2, y2, c) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len2 = dx * dx + dy * dy;
  let t = len2 === 0 ? 0 : ((c.x - x1) * dx + (c.y - y1) * dy) / len2;
  t = clamp(t, 0, 1);
  const px = x1 + dx * t;
  const py = y1 + dy * t;
  return distance(px, py, c.x, c.y) < c.r;
}

// True when nothing solid stands between the watcher and the thief. Smoke
// counts as solid too: a cloud on the sight line hides the thief.
export function lineOfSight(world, x1, y1, x2, y2) {
  for (const c of CASES) if (segmentHitsRect(x1, y1, x2, y2, c)) return false;
  for (const s of STATUES) if (segmentHitsCircle(x1, y1, x2, y2, s)) return false;
  if (segmentHitsRect(x1, y1, x2, y2, PEDESTAL)) return false;
  for (const smoke of world.smokes) {
    if (segmentHitsCircle(x1, y1, x2, y2, { x: smoke.x, y: smoke.y, r: smoke.r })) return false;
  }
  return true;
}

// Push a circle out of every solid rectangle and statue it overlaps.
function resolveCircle(state, x, y, radius) {
  for (const r of [...WALLS, ...CASES, PEDESTAL]) {
    const nx = clamp(x, r.x, r.x + r.w);
    const ny = clamp(y, r.y, r.y + r.h);
    const dx = x - nx;
    const dy = y - ny;
    const d2 = dx * dx + dy * dy;
    if (d2 < radius * radius) {
      if (d2 < 1e-6) {
        // Centred inside the rectangle: push out along the shortest side.
        const left = x - r.x;
        const right = r.x + r.w - x;
        const top = y - r.y;
        const bottom = r.y + r.h - y;
        const m = Math.min(left, right, top, bottom);
        if (m === left) x = r.x - radius;
        else if (m === right) x = r.x + r.w + radius;
        else if (m === top) y = r.y - radius;
        else y = r.y + r.h + radius;
      } else {
        const d = Math.sqrt(d2);
        x = nx + (dx / d) * radius;
        y = ny + (dy / d) * radius;
      }
    }
  }
  for (const s of STATUES) {
    const dx = x - s.x;
    const dy = y - s.y;
    const d = Math.hypot(dx, dy);
    const min = radius + s.r;
    if (d < min && d > 1e-6) {
      x = s.x + (dx / d) * min;
      y = s.y + (dy / d) * min;
    }
  }
  return { x, y };
}

// --- world construction -----------------------------------------------------

function makeGuard(waypoints, phase) {
  return {
    x: waypoints[0][0],
    y: waypoints[0][1],
    angle: 0,
    waypoints,
    wpIndex: 1,
    state: 'patrol', // patrol | chase | investigate
    pauseLeft: 0,
    sweepDir: 1,
    lastSeenX: 0,
    lastSeenY: 0,
    unseenFor: 0,
    investigateLeft: 0,
    phase,
  };
}

function makeCamera(x, y, centerAngle, sweepRange) {
  return { x, y, centerAngle, sweepRange, angle: centerAngle, phase: 0 };
}

export function createWorld(seed) {
  const next = mulberry32(seed);
  // A little seeded jitter on the guards' starting phase, so patrols do not
  // march in lockstep; the layout itself stays fixed for readability.
  const jitter = () => (next() - 0.5) * 0.9;
  const guards = [
    makeGuard([[220, 320], [220, 640], [420, 640], [420, 320]], jitter()),
    makeGuard([[880, 300], [1080, 300], [1080, 640], [880, 640]], jitter()),
    makeGuard([[500, 120], [800, 120]], jitter()),
  ];
  const cameras = [
    // Wall-mounted, below the HUD band: left wall sweeps the left hall,
    // right wall sweeps the right hall, bottom wall sweeps the exit approach.
    makeCamera(28, 300, 0, 0.62),
    makeCamera(VIEW.width - 28, 300, Math.PI, 0.62),
    makeCamera(980, VIEW.height - 28, -Math.PI / 2, 0.55),
  ];
  return {
    seed,
    time: 0,
    phase: 'play', // play | caught | escaped
    player: {
      x: 95, y: 95, dir: 0, moving: false, sprinting: false,
      smokes: TOOLS.smokeCount, coins: TOOLS.coinCount,
    },
    guards,
    cameras,
    lootTaken: false,
    alarm: 0,
    alarmTripped: false,
    tripLeft: 0,
    smokes: [],
    coins: [],
    detections: 0,
    spottedNow: false,
    seenBy: null, // 'guard' | 'camera' | null, for the HUD
    result: null, // { time, detections, smokesLeft, coinsLeft } once finished
  };
}

// --- sensing ----------------------------------------------------------------

function angleTo(x1, y1, x2, y2) {
  return Math.atan2(y2 - y1, x2 - x1);
}

function angleDiff(a, b) {
  let d = a - b;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
}

function guardSees(world, guard) {
  const p = world.player;
  const d = distance(guard.x, guard.y, p.x, p.y);
  if (d > GUARD.coneRange) return false;
  if (Math.abs(angleDiff(angleTo(guard.x, guard.y, p.x, p.y), guard.angle)) > GUARD.coneHalfAngle) return false;
  return lineOfSight(world, guard.x, guard.y, p.x, p.y);
}

function cameraSees(world, camera) {
  const p = world.player;
  const d = distance(camera.x, camera.y, p.x, p.y);
  if (d > CAMERA.beamRange) return false;
  if (Math.abs(angleDiff(angleTo(camera.x, camera.y, p.x, p.y), camera.angle)) > CAMERA.beamHalfAngle) return false;
  return lineOfSight(world, camera.x, camera.y, p.x, p.y);
}

// --- the step ---------------------------------------------------------------

// Advance the world one fixed step. `input` carries the held movement keys and
// the edge-triggered tool presses for this step. Returns an EVENT_* bitmask.
export function stepWorld(world, dt, input) {
  if (world.phase !== 'play') return EVENT_NONE;
  let events = EVENT_NONE;
  world.time += dt;
  const p = world.player;

  // --- the thief moves ------------------------------------------------------
  let mx = (input.right ? 1 : 0) - (input.left ? 1 : 0);
  let my = (input.down ? 1 : 0) - (input.up ? 1 : 0);
  const moving = mx !== 0 || my !== 0;
  p.moving = moving;
  p.sprinting = moving && !!input.sprint;
  if (moving) {
    const len = Math.hypot(mx, my);
    mx /= len;
    my /= len;
    p.dir = Math.atan2(my, mx);
    const speed = p.sprinting ? PLAYER.sprintSpeed : PLAYER.walkSpeed;
    const pos = resolveCircle(world, p.x + mx * speed * dt, p.y + my * speed * dt, PLAYER.radius);
    p.x = pos.x;
    p.y = pos.y;
  }

  // --- tools ----------------------------------------------------------------
  if (input.useSmoke && p.smokes > 0) {
    p.smokes -= 1;
    world.smokes.push({ x: p.x, y: p.y, r: TOOLS.smokeRadius, left: TOOLS.smokeSeconds });
  }
  if (input.throwCoin && p.coins > 0) {
    p.coins -= 1;
    const cx = p.x + Math.cos(p.dir) * 150;
    const cy = p.y + Math.sin(p.dir) * 150;
    world.coins.push({ x: clamp(cx, 60, VIEW.width - 60), y: clamp(cy, 60, VIEW.height - 60), left: TOOLS.coinInvestigateSeconds });
  }
  for (const smoke of world.smokes) smoke.left -= dt;
  world.smokes = world.smokes.filter((s) => s.left > 0);
  for (const coin of world.coins) coin.left -= dt;
  world.coins = world.coins.filter((c) => c.left > 0);

  // --- the loot ---------------------------------------------------------------
  if (!world.lootTaken) {
    const pc = { x: PEDESTAL.x + PEDESTAL.w / 2, y: PEDESTAL.y + PEDESTAL.h / 2 };
    if (distance(p.x, p.y, pc.x, pc.y) < PEDESTAL.lootRadius) {
      world.lootTaken = true;
      world.alarm = Math.min(ALARM.tripAt, world.alarm + ALARM.lootGrabBoost);
      events |= EVENT_LOOT;
    }
  }

  // --- cameras sweep, and watch ----------------------------------------------
  let seen = false;
  let seenBy = null;
  for (const camera of world.cameras) {
    camera.phase += dt * CAMERA.sweepSpeed;
    camera.angle = camera.centerAngle + Math.sin(camera.phase) * camera.sweepRange;
    if (cameraSees(world, camera)) {
      seen = true;
      seenBy = 'camera';
      world.alarm = Math.min(ALARM.tripAt, world.alarm + CAMERA.sightRate * dt);
    }
  }

  // --- guards patrol, watch, chase --------------------------------------------
  for (const guard of world.guards) {
    const sees = guardSees(world, guard);
    if (sees) {
      guard.lastSeenX = p.x;
      guard.lastSeenY = p.y;
      guard.unseenFor = 0;
      if (guard.state !== 'chase') {
        guard.state = 'chase';
        world.detections += 1;
        events |= EVENT_SPOTTED;
      }
      world.alarm = Math.min(ALARM.tripAt, world.alarm + GUARD.sightRate * dt);
      seen = true;
      seenBy = 'guard';
    }

    // A sprinting thief is heard: a guard close by comes to look.
    if (p.sprinting && p.moving && guard.state === 'patrol'
      && distance(guard.x, guard.y, p.x, p.y) < PLAYER.sprintNoise) {
      guard.state = 'investigate';
      guard.lastSeenX = p.x;
      guard.lastSeenY = p.y;
      guard.investigateLeft = 2.5;
    }

    // A ringing coin pulls a nearby guard off its patrol.
    for (const coin of world.coins) {
      if (guard.state === 'patrol' && distance(guard.x, guard.y, coin.x, coin.y) < TOOLS.coinLureRadius) {
        guard.state = 'investigate';
        guard.lastSeenX = coin.x;
        guard.lastSeenY = coin.y;
        guard.investigateLeft = TOOLS.coinInvestigateSeconds;
      }
    }

    if (world.alarmTripped) {
      // The alarm is up: every guard converges on the thief.
      guard.state = 'chase';
      guard.lastSeenX = p.x;
      guard.lastSeenY = p.y;
    }

    // --- move the guard -------------------------------------------------------
    if (guard.state === 'patrol') {
      const target = guard.waypoints[guard.wpIndex];
      if (guard.pauseLeft > 0) {
        guard.pauseLeft -= dt;
        // Sweep the cone while waiting: look left, then right.
        guard.angle += guard.sweepDir * GUARD.turnSpeed * 0.45 * dt;
        if (guard.angle > 1.1) guard.sweepDir = -1;
        if (guard.angle < -1.1) guard.sweepDir = 1;
      } else {
        const d = distance(guard.x, guard.y, target[0], target[1]);
        const step = GUARD.patrolSpeed * dt;
        if (d <= step) {
          guard.x = target[0];
          guard.y = target[1];
          guard.wpIndex = (guard.wpIndex + 1) % guard.waypoints.length;
          guard.pauseLeft = GUARD.pauseSeconds;
        } else {
          const nx = (target[0] - guard.x) / d;
          const ny = (target[1] - guard.y) / d;
          guard.x += nx * step;
          guard.y += ny * step;
          guard.angle = Math.atan2(ny, nx);
        }
      }
    } else if (guard.state === 'chase') {
      const d = distance(guard.x, guard.y, guard.lastSeenX, guard.lastSeenY);
      const step = GUARD.chaseSpeed * dt;
      if (d > 4) {
        const nx = (guard.lastSeenX - guard.x) / d;
        const ny = (guard.lastSeenY - guard.y) / d;
        const pos = resolveCircle(world, guard.x + nx * step, guard.y + ny * step, GUARD.radius);
        guard.x = pos.x;
        guard.y = pos.y;
        guard.angle = Math.atan2(ny, nx);
      }
      if (!sees) {
        guard.unseenFor += dt;
        if (guard.unseenFor > 2.5 && !world.alarmTripped) {
          guard.state = 'investigate';
          guard.investigateLeft = 3;
        }
      }
    } else if (guard.state === 'investigate') {
      const d = distance(guard.x, guard.y, guard.lastSeenX, guard.lastSeenY);
      const step = GUARD.investigateSpeed * dt;
      if (d > 6) {
        const nx = (guard.lastSeenX - guard.x) / d;
        const ny = (guard.lastSeenY - guard.y) / d;
        const pos = resolveCircle(world, guard.x + nx * step, guard.y + ny * step, GUARD.radius);
        guard.x = pos.x;
        guard.y = pos.y;
        guard.angle = Math.atan2(ny, nx);
      } else {
        guard.investigateLeft -= dt;
        guard.angle += GUARD.turnSpeed * 0.6 * dt;
        if (guard.investigateLeft <= 0) guard.state = 'patrol';
      }
    }

    // Caught: a guard close enough to touch the thief ends the run.
    if (distance(guard.x, guard.y, p.x, p.y) < GUARD.touchRadius) {
      world.phase = 'caught';
      world.result = {
        time: world.time,
        detections: world.detections,
        smokesLeft: p.smokes,
        coinsLeft: p.coins,
      };
      return events | EVENT_CAUGHT;
    }
  }

  // --- the alarm ---------------------------------------------------------------
  world.spottedNow = seen;
  world.seenBy = seen ? seenBy : null;
  if (!seen && !world.alarmTripped) {
    world.alarm = Math.max(0, world.alarm - ALARM.decayRate * dt);
  }
  if (world.alarm >= ALARM.tripAt && !world.alarmTripped) {
    world.alarmTripped = true;
    world.tripLeft = ALARM.tripSeconds;
    events |= EVENT_ALARM_TRIP;
  }
  if (world.alarmTripped) {
    world.tripLeft -= dt;
    if (world.tripLeft <= 0) {
      world.alarmTripped = false;
      world.alarm = ALARM.afterTrip;
      for (const guard of world.guards) {
        if (guard.state === 'chase') {
          guard.state = 'investigate';
          guard.investigateLeft = 2;
        }
      }
    }
  }

  // --- the exit ------------------------------------------------------------------
  if (world.lootTaken) {
    if (distance(p.x, p.y, EXIT.x, EXIT.y) < 46) {
      world.phase = 'escaped';
      world.result = {
        time: world.time,
        detections: world.detections,
        smokesLeft: p.smokes,
        coinsLeft: p.coins,
      };
      return events | EVENT_ESCAPED;
    }
  }

  return events;
}
