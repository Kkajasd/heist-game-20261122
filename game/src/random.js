// Seeded random numbers for The Velvet Vault: one tiny generator, one job.
// Every level uses a fixed seed, so a staged screenshot and a replayed run
// always see the same jitter, the same patrol pauses and the same sparkle.
export function makeRng(seed) {
  let state = (seed >>> 0) || 1;
  return function nextRandom() {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function pickFrom(rng, list) {
  return list[Math.floor(rng() * list.length)];
}

export function jitter(rng, amount) {
  return (rng() * 2 - 1) * amount;
}

export function clampNumber(value, low, high) {
  return value < low ? low : value > high ? high : value;
}

export function lerpNumber(a, b, t) {
  return a + (b - a) * t;
}

export function angleDifference(a, b) {
  let d = (b - a) % (Math.PI * 2);
  if (d > Math.PI) d -= Math.PI * 2;
  if (d < -Math.PI) d += Math.PI * 2;
  return d;
}

export function distanceBetween(ax, ay, bx, by) {
  const dx = bx - ax;
  const dy = by - ay;
  return Math.sqrt(dx * dx + dy * dy);
}
