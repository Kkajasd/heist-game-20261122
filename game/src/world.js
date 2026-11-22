// The game's rules and state, with no drawing and no browser in it: the thief, the guards
// and their vision cones, the sweeping cameras, the alarm, the loot, the tools and the exit.
// step() advances one fixed step and returns what happened as bit flags, so the caller can
// react without the world knowing about screens or sound. Nothing here allocates after
// createWorld returns, and nothing reads the clock: the same seed always plays the same game.

import {
  ALARM,
  CALM_BONUS,
  CAMERA,
  CAMERAS,
  COVER_CIRCLES,
  COVER_RECTS,
  EXIT,
  FIELD,
  GUARD,
  GUARD_PATROLS,
  LIVES,
  LOOT,
  PEDESTAL,
  START,
  THIEF,
  TIME_BONUS,
  TOOLS,
  WALL,
} from './config.js';

export const EVENT_COIN = 1;
export const EVENT_SMOKE = 2;
export const EVENT_LOOT = 4;
export const EVENT_CAUGHT = 8;
export const EVENT_ESCAPED = 16;
export const EVENT_SPOTTED = 32;

const MODE_PATROL = 'patrol';
const MODE_INVESTIGATE = 'investigate';
const MODE_CHASE = 'chase';

export function clamp(value, low, high) {
  return value < low ? low : value > high ? high : value;
}

function distance(ax, ay, bx, by) {
  return Math.hypot(ax - bx, ay - by);
}

/** The smallest signed angle from `from` to `to`, in (-PI, PI]. */
function angleDiff(to, from) {
  let diff = to - from;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff <= -Math.PI) diff += Math.PI * 2;
  return diff;
}

/** Does the segment (x1,y1)-(x2,y2) cross the rectangle? Slab method, exact at the edges. */
function segmentHitsRect(x1, y1, x2, y2, rect) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  let tmin = 0;
  let tmax = 1;
  if (Math.abs(dx) < 1e-9) {
    if (x1 < rect.x || x1 > rect.x + rect.width) return false;
  } else {
    let t1 = (rect.x - x1) / dx;
    let t2 = (rect.x + rect.width - x1) / dx;
    if (t1 > t2) {
      const tmp = t1;
      t1 = t2;
      t2 = tmp;
    }
    tmin = Math.max(tmin, t1);
    tmax = Math.min(tmax, t2);
    if (tmin > tmax) return false;
  }
  if (Math.abs(dy) < 1e-9) {
    if (y1 < rect.y || y1 > rect.y + rect.height) return false;
  } else {
    let t1 = (rect.y - y1) / dy;
    let t2 = (rect.y + rect.height - y1) / dy;
    if (t1 > t2) {
      const tmp = t1;
      t1 = t2;
      t2 = tmp;
    }
    tmin = Math.max(tmin, t1);
    tmax = Math.min(tmax, t2);
    if (tmin > tmax) return false;
  }
  return true;
}

/** Does the segment (x1,y1)-(x2,y2) pass within `circle.radius` of the circle's centre? */
function segmentHitsCircle(x1, y1, x2, y2, circle) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len2 = dx * dx + dy * dy;
  let t = len2 === 0 ? 0 : ((circle.x - x1) * dx + (circle.y - y1) * dy) / len2;
  t = clamp(t, 0, 1);
  const px = x1 + dx * t;
  const py = y1 + dy * t;
  const ddx = px - circle.x;
  const ddy = py - circle.y;
  return ddx * ddx + ddy * ddy < circle.radius * circle.radius;
}

/** True when no case, column or statue stands between the two points. */
function lineOfSight(ax, ay, bx, by) {
  for (let index = 0; index < COVER_RECTS.length; index += 1) {
    if (segmentHitsRect(ax, ay, bx, by, COVER_RECTS[index])) return false;
  }
  for (let index = 0; index < COVER_CIRCLES.length; index += 1) {
    if (segmentHitsCircle(ax, ay, bx, by, COVER_CIRCLES[index])) return false;
  }
  return true;
}

function circleHitsRect(cx, cy, radius, rect) {
  const nearX = clamp(cx, rect.x, rect.x + rect.width);
  const nearY = clamp(cy, rect.y, rect.y + rect.height);
  const ddx = cx - nearX;
  const ddy = cy - nearY;
  return ddx * ddx + ddy * ddy < radius * radius;
}

/** Push a circle out of the walls, the pedestal and every piece of cover. */
function resolveCircle(body, radius) {
  const inDoorway = body.x > EXIT.x - radius && body.x < EXIT.x + EXIT.width + radius;
  const bottom = inDoorway ? FIELD.height - radius - 2 : FIELD.height - WALL - radius;
  body.x = clamp(body.x, WALL + radius, FIELD.width - WALL - radius);
  body.y = clamp(body.y, WALL + radius, bottom);
  // The pedestal blocks movement but not sight.
  let dx = body.x - PEDESTAL.x;
  let dy = body.y - PEDESTAL.y;
  let dist = Math.hypot(dx, dy);
  const minDist = radius + PEDESTAL.radius;
  if (dist < minDist && dist > 0) {
    body.x = PEDESTAL.x + (dx / dist) * minDist;
    body.y = PEDESTAL.y + (dy / dist) * minDist;
  } else if (dist === 0) {
    body.y = PEDESTAL.y + minDist;
  }
  for (let index = 0; index < COVER_RECTS.length; index += 1) {
    const rect = COVER_RECTS[index];
    if (!circleHitsRect(body.x, body.y, radius, rect)) continue;
    const nearX = clamp(body.x, rect.x, rect.x + rect.width);
    const nearY = clamp(body.y, rect.y, rect.y + rect.height);
    dx = body.x - nearX;
    dy = body.y - nearY;
    dist = Math.hypot(dx, dy);
    if (dist > 0) {
      body.x = nearX + (dx / dist) * radius;
      body.y = nearY + (dy / dist) * radius;
    } else {
      // Centre inside the rectangle: push out along the smallest overlap.
      const pushLeft = body.x - rect.x + radius;
      const pushRight = rect.x + rect.width - body.x + radius;
      const pushUp = body.y - rect.y + radius;
      const pushDown = rect.y + rect.height - body.y + radius;
      const smallest = Math.min(pushLeft, pushRight, pushUp, pushDown);
      if (smallest === pushLeft) body.x = rect.x - radius;
      else if (smallest === pushRight) body.x = rect.x + rect.width + radius;
      else if (smallest === pushUp) body.y = rect.y - radius;
      else body.y = rect.y + rect.height + radius;
    }
  }
  for (let index = 0; index < COVER_CIRCLES.length; index += 1) {
    const circle = COVER_CIRCLES[index];
    dx = body.x - circle.x;
    dy = body.y - circle.y;
    dist = Math.hypot(dx, dy);
    const min = radius + circle.radius;
    if (dist < min && dist > 0) {
      body.x = circle.x + (dx / dist) * min;
      body.y = circle.y + (dy / dist) * min;
    } else if (dist === 0) {
      body.y = circle.y + min;
    }
  }
}

/** Move a body by (mx, my), sliding along walls and cover: x first, then y. */
function moveBody(body, radius, mx, my) {
  body.x += mx;
  resolveCircle(body, radius);
  body.y += my;
  resolveCircle(body, radius);
}

export function createWorld(random) {
  const thief = { x: START.x, y: START.y, face: -Math.PI / 2, moving: false, invulnerable: 0 };
  const guards = GUARD_PATROLS.map((waypoints) => ({
    x: waypoints[0].x,
    y: waypoints[0].y,
    dir: 0,
    waypoints,
    wpIndex: 1,
    pause: 0,
    suspicion: 0,
    mode: MODE_PATROL,
    modeT: 0,
    target: { x: 0, y: 0 },
  }));
  const cameras = CAMERAS.map((cam) => ({ x: cam.x, y: cam.y, base: cam.base, phase: cam.phase, angle: cam.base }));
  const smoke = [];
  const coins = [];
  const state = {
    thief,
    guards,
    cameras,
    smoke,
    coins,
    alarm: 0,
    lives: LIVES,
    score: 0,
    lootSecured: false,
    escaped: false,
    over: false,
    time: 0,
    elapsed: 0,
    smokeCharges: TOOLS.smokeCharges,
    coinCharges: TOOLS.coinCharges,
    lockdown: false,
  };

  function reset() {
    thief.x = START.x;
    thief.y = START.y;
    thief.face = -Math.PI / 2;
    thief.moving = false;
    thief.invulnerable = 0;
    for (let index = 0; index < guards.length; index += 1) {
      const guard = guards[index];
      guard.x = guard.waypoints[0].x;
      guard.y = guard.waypoints[0].y;
      guard.dir = 0;
      guard.wpIndex = 1;
      guard.pause = 0;
      guard.suspicion = 0;
      guard.mode = MODE_PATROL;
      guard.modeT = 0;
    }
    for (let index = 0; index < cameras.length; index += 1) cameras[index].angle = cameras[index].base;
    smoke.length = 0;
    coins.length = 0;
    state.alarm = 0;
    state.lives = LIVES;
    state.score = 0;
    state.lootSecured = false;
    state.escaped = false;
    state.over = false;
    state.time = 0;
    state.elapsed = 0;
    state.smokeCharges = TOOLS.smokeCharges;
    state.coinCharges = TOOLS.coinCharges;
    state.lockdown = false;
  }

  function thiefHidden() {
    for (let index = 0; index < smoke.length; index += 1) {
      if (distance(thief.x, thief.y, smoke[index].x, smoke[index].y) < TOOLS.smokeRadius) return true;
    }
    return false;
  }

  function guardSees(guard) {
    if (thiefHidden()) return false;
    const dx = thief.x - guard.x;
    const dy = thief.y - guard.y;
    const dist = Math.hypot(dx, dy);
    if (dist > GUARD.coneRange) return false;
    if (dist < guard.radius + THIEF.radius) return true;
    const angle = Math.atan2(dy, dx);
    if (Math.abs(angleDiff(angle, guard.dir)) > GUARD.coneHalf) return false;
    return lineOfSight(guard.x, guard.y, thief.x, thief.y);
  }

  function cameraSees(camera) {
    if (thiefHidden()) return false;
    const dx = thief.x - camera.x;
    const dy = thief.y - camera.y;
    const dist = Math.hypot(dx, dy);
    if (dist > CAMERA.beamLength) return false;
    const angle = Math.atan2(dy, dx);
    if (Math.abs(angleDiff(angle, camera.angle)) > CAMERA.beamHalf) return false;
    return lineOfSight(camera.x, camera.y, thief.x, thief.y);
  }

  function useCoin() {
    if (state.coinCharges <= 0 || state.over) return 0;
    state.coinCharges -= 1;
    let x = thief.x + Math.cos(thief.face) * TOOLS.coinThrow;
    let y = thief.y + Math.sin(thief.face) * TOOLS.coinThrow;
    x = clamp(x, WALL + 10, FIELD.width - WALL - 10);
    y = clamp(y, WALL + 10, FIELD.height - WALL - 10);
    // Never let the coin land inside cover: pull it back toward the thief until it is clear.
    for (let step = 0; step < 12; step += 1) {
      let inside = false;
      for (let index = 0; index < COVER_RECTS.length; index += 1) {
        if (circleHitsRect(x, y, 6, COVER_RECTS[index])) inside = true;
      }
      for (let index = 0; index < COVER_CIRCLES.length; index += 1) {
        if (distance(x, y, COVER_CIRCLES[index].x, COVER_CIRCLES[index].y) < COVER_CIRCLES[index].radius + 6) inside = true;
      }
      if (!inside) break;
      x -= Math.cos(thief.face) * 16;
      y -= Math.sin(thief.face) * 16;
    }
    coins.push({ x, y, t: TOOLS.coinPingSeconds });
    // The nearest guard who can hear it goes to look.
    let nearest = null;
    let nearestDist = 420;
    for (let index = 0; index < guards.length; index += 1) {
      const guard = guards[index];
      const dist = distance(guard.x, guard.y, x, y);
      if (dist < nearestDist) {
        nearest = guard;
        nearestDist = dist;
      }
    }
    if (nearest !== null && nearest.mode !== MODE_CHASE) {
      nearest.mode = MODE_INVESTIGATE;
      nearest.target.x = x;
      nearest.target.y = y;
      nearest.modeT = TOOLS.investigateSeconds;
    }
    return EVENT_COIN;
  }

  function useSmoke() {
    if (state.smokeCharges <= 0 || state.over) return 0;
    state.smokeCharges -= 1;
    smoke.push({ x: thief.x, y: thief.y, t: TOOLS.smokeSeconds });
    return EVENT_SMOKE;
  }

  function updateGuard(guard, dt) {
    if (guard.mode === MODE_PATROL) {
      const target = guard.waypoints[guard.wpIndex];
      if (guard.pause > 0) {
        guard.pause -= dt;
      } else {
        const dx = target.x - guard.x;
        const dy = target.y - guard.y;
        const dist = Math.hypot(dx, dy);
        if (dist < 6) {
          guard.pause = GUARD.pause;
          guard.wpIndex = (guard.wpIndex + 1) % guard.waypoints.length;
        } else {
          const step = (GUARD.patrol * dt) / dist;
          guard.dir = Math.atan2(dy, dx);
          moveBody(guard, GUARD.radius, dx * step, dy * step);
        }
      }
    } else if (guard.mode === MODE_INVESTIGATE) {
      const dx = guard.target.x - guard.x;
      const dy = guard.target.y - guard.y;
      const dist = Math.hypot(dx, dy);
      if (dist < 8) {
        guard.modeT -= dt;
        guard.dir = Math.atan2(dy, dx);
        if (guard.modeT <= 0) {
          guard.mode = MODE_PATROL;
          guard.suspicion = 0.5;
        }
      } else {
        const step = (GUARD.investigate * dt) / dist;
        guard.dir = Math.atan2(dy, dx);
        moveBody(guard, GUARD.radius, dx * step, dy * step);
      }
    } else {
      // Chase: straight at the thief, until the chase runs out.
      const dx = thief.x - guard.x;
      const dy = thief.y - guard.y;
      const dist = Math.hypot(dx, dy);
      guard.dir = Math.atan2(dy, dx);
      if (dist > 1) {
        const step = (GUARD.chase * dt) / dist;
        moveBody(guard, GUARD.radius, dx * step, dy * step);
      }
      guard.modeT -= dt;
      if (guard.modeT <= 0 && !state.lockdown) {
        guard.mode = MODE_PATROL;
        guard.suspicion = 0.4;
      }
    }
  }

  function computeScore() {
    const timeBonus = Math.max(0, Math.round(TIME_BONUS.parSeconds - state.time)) * TIME_BONUS.perSecond;
    const calmBonus = Math.max(0, Math.round(ALARM.lockdown - state.alarm)) * CALM_BONUS.perAlarmPoint;
    state.score = (state.lootSecured ? LOOT.points : 0) + timeBonus + calmBonus;
  }

  /**
   * One fixed step. `input` is { dx, dy, sprint, coin, smoke } with dx/dy each -1, 0 or 1.
   * With `harmless` set (the title screen's backdrop) the hall lives but nothing touches the
   * thief and nothing scores.
   */
  function step(dt, input, harmless) {
    let events = 0;
    state.elapsed += dt;
    for (let index = 0; index < cameras.length; index += 1) {
      const camera = cameras[index];
      camera.angle = camera.base + CAMERA.sweep * Math.sin(state.elapsed * CAMERA.sweepSpeed + camera.phase);
    }
    for (let index = 0; index < guards.length; index += 1) updateGuard(guards[index], dt);
    for (let index = smoke.length - 1; index >= 0; index -= 1) {
      smoke[index].t -= dt;
      if (smoke[index].t <= 0) smoke.splice(index, 1);
    }
    for (let index = coins.length - 1; index >= 0; index -= 1) {
      coins[index].t -= dt;
      if (coins[index].t <= 0) coins.splice(index, 1);
    }
    if (harmless || state.over) {
      computeScore();
      return events;
    }

    state.time += dt;
    if (thief.invulnerable > 0) thief.invulnerable = Math.max(0, thief.invulnerable - dt);

    const len = Math.hypot(input.dx, input.dy);
    thief.moving = len > 0;
    if (len > 0) {
      const speed = input.sprint ? THIEF.sprint : THIEF.walk;
      const nx = (input.dx / len) * speed * dt;
      const ny = (input.dy / len) * speed * dt;
      thief.face = Math.atan2(input.dy, input.dx);
      moveBody(thief, THIEF.radius, nx, ny);
    }
    if (input.coin) events |= useCoin();
    if (input.smoke) events |= useSmoke();

    // Vision and the alarm.
    let exposed = false;
    let chasing = false;
    for (let index = 0; index < guards.length; index += 1) {
      const guard = guards[index];
      if (guard.mode === MODE_CHASE) chasing = true;
      if (guardSees(guard)) {
        exposed = true;
        guard.suspicion = Math.min(1, guard.suspicion + GUARD.suspicionUp * dt);
        state.alarm = Math.min(ALARM.lockdown, state.alarm + ALARM.conePerSecond * dt);
        if (guard.suspicion >= 1 && guard.mode !== MODE_CHASE) {
          guard.mode = MODE_CHASE;
          guard.modeT = GUARD.chaseSeconds;
          events |= EVENT_SPOTTED;
        }
      } else {
        guard.suspicion = Math.max(0, guard.suspicion - GUARD.suspicionDown * dt);
      }
    }
    for (let index = 0; index < cameras.length; index += 1) {
      if (cameraSees(cameras[index])) {
        exposed = true;
        state.alarm = Math.min(ALARM.lockdown, state.alarm + ALARM.beamPerSecond * dt);
      }
    }
    if (input.sprint && thief.moving) {
      let nearGuard = false;
      for (let index = 0; index < guards.length; index += 1) {
        if (distance(thief.x, thief.y, guards[index].x, guards[index].y) < 280) nearGuard = true;
      }
      if (nearGuard) {
        state.alarm = Math.min(ALARM.lockdown, state.alarm + ALARM.sprintPerSecond * dt);
      }
    }
    if (chasing) state.alarm = Math.min(ALARM.lockdown, state.alarm + ALARM.chasePerSecond * dt);
    if (!exposed && !chasing) state.alarm = Math.max(0, state.alarm - ALARM.decayPerSecond * dt);
    if (state.alarm >= ALARM.lockdown && !state.lockdown) {
      state.lockdown = true;
      for (let index = 0; index < guards.length; index += 1) {
        guards[index].mode = MODE_CHASE;
        guards[index].modeT = 99;
      }
    }

    // The loot.
    if (!state.lootSecured && distance(thief.x, thief.y, PEDESTAL.x, PEDESTAL.y) < LOOT.grabRadius) {
      state.lootSecured = true;
      events |= EVENT_LOOT;
    }

    // Caught: a chasing guard lays a hand on the thief.
    if (thief.invulnerable === 0) {
      for (let index = 0; index < guards.length; index += 1) {
        const guard = guards[index];
        if (guard.mode !== MODE_CHASE) continue;
        if (distance(thief.x, thief.y, guard.x, guard.y) < GUARD.radius + THIEF.radius + 2) {
          state.lives -= 1;
          events |= EVENT_CAUGHT;
          if (state.lives <= 0) {
            state.over = true;
          } else {
            thief.x = START.x;
            thief.y = START.y;
            thief.face = -Math.PI / 2;
            thief.invulnerable = THIEF.invulnerable;
            state.alarm = 35;
            state.lockdown = false;
            for (let other = 0; other < guards.length; other += 1) {
              guards[other].mode = MODE_PATROL;
              guards[other].suspicion = 0;
              guards[other].modeT = 0;
            }
          }
          break;
        }
      }
    }

    // The getaway: through the door with the watch in hand.
    if (
      state.lootSecured &&
      thief.x > EXIT.x &&
      thief.x < EXIT.x + EXIT.width &&
      thief.y > EXIT.y
    ) {
      state.escaped = true;
      state.over = true;
      events |= EVENT_ESCAPED;
    }

    computeScore();
    return events;
  }

  reset();
  return { state, reset, step, useCoin, useSmoke };
}
