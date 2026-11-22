// Screenshot staging for The Velvet Vault, one job: put the game in a fixed,
// readable pose for each ?shot= query and freeze it there. A shot never runs
// the simulation clock, so the same query always renders the same frame:
// the cover shows the thief mid-room, a guard cone, a camera cone, the loot
// and the alarm meter all at once.
import { TILE, HUD_HEIGHT } from './levels.js';

export function parseShotQuery() {
  const params = new URLSearchParams(window.location.search);
  return {
    shot: params.get('shot') || '',
    seed: Number(params.get('seed') || '1'),
  };
}

// Stage the world for a named shot. Returns true when a shot was staged
// (the caller then renders one frozen frame and never starts the loop).
export function stageShot(world, shot) {
  if (!shot) return false;
  const level = world.levelIndex;
  if (shot === 'start') {
    world.mode = 'title';
    return true;
  }
  if (shot === 'end') {
    world.mode = 'won';
    world.score = 2840;
    world.hud.score = 2840;
    return true;
  }
  if (shot === 'play') {
    // Cover: level 1, thief crossing the open gallery, guard cone sweeping
    // toward him, camera cone crossing the room, gold and a diamond in view,
    // alarm meter part-filled so the gauge itself is visible.
    world.mode = 'playing';
    world.thief.x = 17 * TILE + 8;
    world.thief.y = HUD_HEIGHT + 10 * TILE + 4;
    world.thief.sneaking = true;
    world.alarm = 34;
    world.hud.alarm = 34;
    const guard = world.guards[0];
    if (guard) {
      guard.x = 12 * TILE + 20;
      guard.y = HUD_HEIGHT + 7 * TILE + 20;
      guard.facing = Math.PI / 4;
      guard.mood = 'patrol';
    }
    const camera = world.cameras[0];
    if (camera) {
      camera.facing = Math.PI * 0.62;
      camera.spotted = false;
    }
    world.message = 'Stay out of the cones — grab the gold, then reach the EXIT';
    return true;
  }
  if (shot === 'alarm') {
    // A caught moment: alarm nearly full, a guard closing in, camera locked
    // on the thief, the meter red and the warning on screen.
    world.mode = 'playing';
    world.thief.x = 20 * TILE + 20;
    world.thief.y = HUD_HEIGHT + 7 * TILE + 20;
    world.alarm = 82;
    world.hud.alarm = 82;
    const guard = world.guards[0];
    if (guard) {
      guard.x = 17 * TILE + 20;
      guard.y = HUD_HEIGHT + 7 * TILE + 20;
      guard.facing = 0;
      guard.mood = 'pursue';
      guard.seenAt = { x: world.thief.x, y: world.thief.y };
    }
    const camera = world.cameras[0];
    if (camera) {
      camera.facing = Math.atan2(world.thief.y - camera.y, world.thief.x - camera.x);
      camera.spotted = true;
    }
    world.message = 'SPOTTED! Break line of sight before the alarm hits 100%';
    return true;
  }
  if (shot === 'exit') {
    // The getaway: every loot taken, the exit open and glowing, the thief
    // one step from it, alarm settled back to calm.
    world.mode = 'playing';
    for (const item of world.loot) item.taken = true;
    world.lootGot = world.loot.length;
    world.hud.lootGot = world.loot.length;
    world.exitOpen = true;
    world.thief.x = world.exit.x - 3 * TILE;
    world.thief.y = world.exit.y;
    world.alarm = 8;
    world.hud.alarm = 8;
    world.message = 'All loot grabbed — the exit is open. Run for it!';
    return true;
  }
  void level;
  return false;
}
