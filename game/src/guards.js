// Patrol guards for The Velvet Vault, one job: walk a loop, watch a cone,
// and react when the thief is seen. A guard has four moods — patrol,
// investigate (a pebble landed nearby), pursue (the alarm is high and the
// thief was just seen), and return — and its cone is what the player reads.
import { TILE, HUD_HEIGHT, hasLineOfSight } from './levels.js';
import { angleDifference, clampNumber, distanceBetween } from './random.js';

export const GUARD_RANGE = 195;
export const GUARD_HALF_ANGLE = Math.PI / 5.2; // ~35 degrees each side
export const GUARD_PATROL_SPEED = 58;
export const GUARD_CHASE_SPEED = 108;

export function createGuard(pathTiles, spawn) {
  const path = pathTiles.map(([col, row]) => ({
    x: col * TILE + TILE / 2,
    y: HUD_HEIGHT + row * TILE + TILE / 2,
  }));
  const start = path[0] || spawn;
  return {
    x: start.x,
    y: start.y,
    path,
    waypoint: 1 % Math.max(1, path.length),
    pauseLeft: 0,
    facing: -Math.PI / 2,
    mood: 'patrol',
    investigateAt: null,
    lookLeft: 0,
    seenAt: null,
    bob: 0,
  };
}

function moveToward(guard, tx, ty, speed, dt) {
  const dx = tx - guard.x;
  const dy = ty - guard.y;
  const dist = Math.sqrt(dx * dx + dy * dy);
  if (dist < 1) return true;
  const step = Math.min(dist, speed * dt);
  const nx = guard.x + (dx / dist) * step;
  const ny = guard.y + (dy / dist) * step;
  guard.facing = Math.atan2(dy, dx);
  guard.x = nx;
  guard.y = ny;
  guard.bob += dt * 9;
  return dist - step < 2;
}

export function updateGuard(guard, dt, world) {
  const { thief, walls, cover } = world;
  if (guard.pauseLeft > 0) {
    guard.pauseLeft -= dt;
    return;
  }
  if (guard.mood === 'investigate' && guard.investigateAt) {
    const arrived = moveToward(guard, guard.investigateAt.x, guard.investigateAt.y, GUARD_CHASE_SPEED, dt);
    if (arrived) {
      guard.lookLeft += dt;
      guard.facing += Math.sin(guard.lookLeft * 2.2) * dt * 1.6;
      if (guard.lookLeft > 2.6) {
        guard.mood = 'return';
        guard.lookLeft = 0;
        guard.investigateAt = null;
      }
    }
    return;
  }
  if (guard.mood === 'pursue' && guard.seenAt) {
    moveToward(guard, guard.seenAt.x, guard.seenAt.y, GUARD_CHASE_SPEED, dt);
    return;
  }
  if (guard.mood === 'return') {
    const target = guard.path[guard.waypoint];
    if (target) {
      const arrived = moveToward(guard, target.x, target.y, GUARD_PATROL_SPEED, dt);
      if (arrived) {
        guard.waypoint = (guard.waypoint + 1) % guard.path.length;
        guard.mood = 'patrol';
      }
    }
    return;
  }
  // Patrol: walk the loop, pausing a beat at each corner to look around.
  const target = guard.path[guard.waypoint];
  if (!target) return;
  const arrived = moveToward(guard, target.x, target.y, GUARD_PATROL_SPEED, dt);
  if (arrived) {
    guard.waypoint = (guard.waypoint + 1) % guard.path.length;
    guard.pauseLeft = 0.9;
  }
}

// Can this guard see the thief right now? Inside the cone, in range, and
// with a clear line of sight. Returns a 0..1 strength (1 = right on top).
export function guardSeesThief(guard, thief, walls, cover) {
  if (thief.hidden) return 0;
  const dist = distanceBetween(guard.x, guard.y, thief.x, thief.y);
  if (dist > GUARD_RANGE) return 0;
  const toThief = Math.atan2(thief.y - guard.y, thief.x - guard.x);
  if (Math.abs(angleDifference(guard.facing, toThief)) > GUARD_HALF_ANGLE) return 0;
  if (!hasLineOfSight(walls, cover, guard.x, guard.y, thief.x, thief.y)) return 0;
  return clampNumber(1.15 - dist / GUARD_RANGE, 0.25, 1);
}

export function guardHearsPebble(guard, px, py) {
  return distanceBetween(guard.x, guard.y, px, py) < 150;
}

export function sendGuardToInvestigate(guard, px, py) {
  guard.mood = 'investigate';
  guard.investigateAt = { x: px, y: py };
  guard.lookLeft = 0;
  guard.pauseLeft = 0;
}

export function sendGuardToPursue(guard, px, py) {
  guard.mood = 'pursue';
  guard.seenAt = { x: px, y: py };
  guard.pauseLeft = 0;
}

export function calmGuard(guard) {
  guard.mood = 'patrol';
  guard.investigateAt = null;
  guard.seenAt = null;
  guard.lookLeft = 0;
}
