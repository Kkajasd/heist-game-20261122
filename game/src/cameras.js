// Security cameras for The Velvet Vault, one job: sit on the wall, sweep a
// cone back and forth, and spot the thief. A camera never walks, so its cone
// is the room's clock — the player times the sweep and slips through the gap.
import { hasLineOfSight } from './levels.js';
import { angleDifference, clampNumber, distanceBetween } from './random.js';

export const CAMERA_HALF_ANGLE = Math.PI / 6.4; // ~28 degrees each side

export function createCamera(mount, def) {
  const base = (def.angle * Math.PI) / 180;
  const sweep = ((def.sweep || 50) * Math.PI) / 180;
  return {
    x: mount.x,
    y: mount.y,
    base,
    sweep,
    range: def.range || 230,
    phase: Math.random() * 0, // deterministic: every camera starts at its base
    time: 0,
    facing: base,
    spotted: false,
  };
}

export function updateCamera(camera, dt) {
  camera.time += dt;
  // Slow, readable sweep: a full swing takes about 4 seconds.
  camera.facing = camera.base + Math.sin(camera.time * 1.55) * (camera.sweep / 2);
}

export function cameraSeesThief(camera, thief, walls, cover) {
  if (thief.hidden) return 0;
  const dist = distanceBetween(camera.x, camera.y, thief.x, thief.y);
  if (dist > camera.range) return 0;
  const toThief = Math.atan2(thief.y - camera.y, thief.x - camera.x);
  if (Math.abs(angleDifference(camera.facing, toThief)) > CAMERA_HALF_ANGLE) return 0;
  if (!hasLineOfSight(walls, cover, camera.x, camera.y, thief.x, thief.y)) return 0;
  return clampNumber(1.1 - dist / camera.range, 0.3, 1);
}
