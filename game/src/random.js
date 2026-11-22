// The Meridian Vault — a small seeded random source so the world, its patrols
// and its staged screenshots are the same on every run. No Math.random in the
// game: the seed alone decides the layout jitter and the guards' idle drift.
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function next() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Pick an integer in [min, max] from a seeded source.
export function rangeInt(next, min, max) {
  return min + Math.floor(next() * (max - min + 1));
}
