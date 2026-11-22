// The Meridian Vault — the renderer: one canvas, one frame that must read at a
// glance. The cover shows the whole heist in a single frame: the room, the
// thief crossing it, guards with their cones, cameras with their beams, the
// glowing loot and the alarm meter, all at once.
import { VIEW, PALETTE, PLAYER, GUARD, CAMERA } from './config.js';
import { PEDESTAL, EXIT, WALLS, CASES, STATUES, ROPES } from './world.js';

const TITLE_FONT = 'bold 44px Georgia, serif';
const SUBTITLE_FONT = 'bold 18px Georgia, serif';
const HUD_FONT = 'bold 15px "Courier New", monospace';
const HUD_SMALL_FONT = '13px "Courier New", monospace';
const LABEL_FONT = 'bold 12px "Courier New", monospace';

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

// A translucent wedge: a guard's vision cone or a camera's beam.
function drawWedge(ctx, x, y, angle, range, halfAngle, fill) {
  const gradient = ctx.createRadialGradient(x, y, 8, x, y, range);
  gradient.addColorStop(0, fill);
  gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.arc(x, y, range, angle - halfAngle, angle + halfAngle);
  ctx.closePath();
  ctx.fill();
}

function drawFloor(ctx) {
  ctx.fillStyle = PALETTE.floor;
  ctx.fillRect(0, 0, VIEW.width, VIEW.height);
  const tile = 64;
  for (let ty = 0; ty < VIEW.height / tile; ty += 1) {
    for (let tx = 0; tx < VIEW.width / tile; tx += 1) {
      if ((tx + ty) % 2 === 0) continue;
      ctx.fillStyle = (tx + ty) % 4 === 1 ? PALETTE.floorTile : PALETTE.floorTileDark;
      ctx.fillRect(tx * tile, ty * tile, tile, tile);
    }
  }
  // A brass inlay border around the gallery floor.
  ctx.strokeStyle = 'rgba(201, 162, 39, 0.35)';
  ctx.lineWidth = 2;
  ctx.strokeRect(44, 44, VIEW.width - 88, VIEW.height - 88);
}

function drawWalls(ctx, world) {
  for (const wall of WALLS) {
    ctx.fillStyle = PALETTE.wall;
    ctx.fillRect(wall.x, wall.y, wall.w, wall.h);
  }
  ctx.fillStyle = PALETTE.wallTop;
  ctx.fillRect(0, 0, VIEW.width, 4);
  ctx.fillRect(0, 0, 4, VIEW.height);
  // The exit door, cut into the bottom wall: green and open once the loot is
  // taken, red and locked before that.
  const doorW = 110;
  const dx = EXIT.x - doorW / 2;
  ctx.fillStyle = world.lootTaken ? PALETTE.exit : '#3a1512';
  ctx.fillRect(dx, VIEW.height - 28, doorW, 28);
  ctx.strokeStyle = world.lootTaken ? PALETTE.exitGlow : '#a33327';
  ctx.lineWidth = 3;
  ctx.strokeRect(dx, VIEW.height - 28, doorW, 28);
  ctx.fillStyle = world.lootTaken ? PALETTE.exitGlow : '#d08a7a';
  ctx.font = LABEL_FONT;
  ctx.textAlign = 'center';
  ctx.fillText(world.lootTaken ? 'EXIT — GO!' : 'EXIT · LOCKED', EXIT.x, VIEW.height - 10);
}

function drawCases(ctx) {
  for (const c of CASES) {
    ctx.fillStyle = PALETTE.caseFrame;
    ctx.fillRect(c.x - 4, c.y - 4, c.w + 8, c.h + 8);
    ctx.fillStyle = PALETTE.caseTop;
    ctx.fillRect(c.x, c.y, c.w, c.h);
    ctx.fillStyle = PALETTE.caseGlass;
    ctx.fillRect(c.x + 8, c.y + 8, c.w - 16, c.h - 16);
    // The exhibits inside: a vase, a crown, a relic, each a bright speck.
    ctx.fillStyle = '#e8c96a';
    ctx.beginPath();
    ctx.arc(c.x + c.w * 0.3, c.y + c.h / 2, 9, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#b8c4d0';
    ctx.beginPath();
    ctx.arc(c.x + c.w * 0.62, c.y + c.h / 2, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#c96a5a';
    ctx.fillRect(c.x + c.w * 0.82 - 5, c.y + c.h / 2 - 10, 10, 20);
  }
}

function drawStatues(ctx) {
  for (const s of STATUES) {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
    ctx.beginPath();
    ctx.ellipse(s.x + 4, s.y + 6, s.r, s.r * 0.8, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = PALETTE.statue;
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#8b96a6';
    ctx.beginPath();
    ctx.arc(s.x - 6, s.y - 8, s.r * 0.45, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawRopes(ctx) {
  ctx.strokeStyle = PALETTE.rope;
  ctx.lineWidth = 4;
  for (const rope of ROPES) {
    ctx.beginPath();
    ctx.moveTo(rope.x1, rope.y1);
    const mx = (rope.x1 + rope.x2) / 2;
    const my = (rope.y1 + rope.y2) / 2 + 10;
    ctx.quadraticCurveTo(mx, my, rope.x2, rope.y2);
    ctx.stroke();
  }
  ctx.fillStyle = PALETTE.ropePost;
  const posts = [[615, 330], [715, 330], [615, 470], [715, 470]];
  for (const [x, y] of posts) {
    ctx.beginPath();
    ctx.arc(x, y, 5, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawPedestalAndLoot(ctx, world) {
  const cx = PEDESTAL.x + PEDESTAL.w / 2;
  const cy = PEDESTAL.y + PEDESTAL.h / 2;
  ctx.fillStyle = PALETTE.pedestal;
  ctx.fillRect(PEDESTAL.x, PEDESTAL.y, PEDESTAL.w, PEDESTAL.h);
  ctx.fillStyle = '#6b5a41';
  ctx.fillRect(PEDESTAL.x - 4, PEDESTAL.y - 4, PEDESTAL.w + 8, 10);
  if (!world.lootTaken) {
    // The Star Sapphire, pulsing gold on its cushion.
    const pulse = 0.75 + 0.25 * Math.sin(world.time * 3);
    const glow = ctx.createRadialGradient(cx, cy - 8, 4, cx, cy - 8, 70 * pulse);
    glow.addColorStop(0, 'rgba(255, 215, 94, 0.85)');
    glow.addColorStop(1, 'rgba(255, 215, 94, 0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(cx, cy - 8, 70 * pulse, 0, Math.PI * 2);
    ctx.fill();
    ctx.save();
    ctx.translate(cx, cy - 8);
    ctx.rotate(Math.PI / 4);
    ctx.fillStyle = PALETTE.loot;
    ctx.fillRect(-13, -13, 26, 26);
    ctx.fillStyle = PALETTE.lootGlow;
    ctx.fillRect(-7, -7, 14, 14);
    ctx.restore();
    ctx.fillStyle = PALETTE.loot;
    ctx.font = LABEL_FONT;
    ctx.textAlign = 'center';
    ctx.fillText('★ STAR SAPPHIRE ★', cx, PEDESTAL.y + PEDESTAL.h + 18);
  } else {
    ctx.fillStyle = PALETTE.hudDim;
    ctx.font = LABEL_FONT;
    ctx.textAlign = 'center';
    ctx.fillText('— EMPTY —', cx, PEDESTAL.y + PEDESTAL.h + 18);
  }
}

function drawGuard(ctx, world, guard) {
  // The vision cone first, under the body, so the room reads through it.
  const coneColor = guard.state === 'chase' ? 'rgba(255, 84, 48, 0.38)' : 'rgba(255, 207, 63, 0.28)';
  drawWedge(ctx, guard.x, guard.y, guard.angle, 235, 0.52, coneColor);
  ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
  ctx.beginPath();
  ctx.ellipse(guard.x + 3, guard.y + 4, 15, 12, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = PALETTE.guardUniform;
  ctx.beginPath();
  ctx.arc(guard.x, guard.y, 15, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = PALETTE.guard;
  ctx.beginPath();
  ctx.arc(guard.x, guard.y, 10, 0, Math.PI * 2);
  ctx.fill();
  // The guard's facing: a pale helmet brim pointing where it looks.
  ctx.fillStyle = '#e8e4d8';
  ctx.beginPath();
  ctx.arc(guard.x + Math.cos(guard.angle) * 10, guard.y + Math.sin(guard.angle) * 10, 4, 0, Math.PI * 2);
  ctx.fill();
  if (guard.state === 'chase') {
    ctx.fillStyle = '#ff5440';
    ctx.font = 'bold 26px Georgia, serif';
    ctx.textAlign = 'center';
    ctx.fillText('!', guard.x, guard.y - 22);
  } else if (guard.state === 'investigate') {
    ctx.fillStyle = '#ffd75e';
    ctx.font = 'bold 22px Georgia, serif';
    ctx.textAlign = 'center';
    ctx.fillText('?', guard.x, guard.y - 22);
  }
}

function drawCamera(ctx, world, camera) {
  const beamColor = world.spottedNow && world.seenBy === 'camera'
    ? 'rgba(255, 60, 60, 0.32)' : 'rgba(255, 90, 90, 0.20)';
  drawWedge(ctx, camera.x, camera.y, camera.angle, 265, 0.30, beamColor);
  ctx.fillStyle = PALETTE.camera;
  ctx.beginPath();
  ctx.arc(camera.x, camera.y, 9, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#e5484d';
  ctx.beginPath();
  ctx.arc(camera.x + Math.cos(camera.angle) * 5, camera.y + Math.sin(camera.angle) * 5, 4, 0, Math.PI * 2);
  ctx.fill();
}

function drawPlayer(ctx, world) {
  const p = world.player;
  // A soft pool of lamplight under the thief: the figure must read at a
  // glance against the dark floor, so the glow comes before the body.
  const glow = ctx.createRadialGradient(p.x, p.y, 2, p.x, p.y, 42);
  glow.addColorStop(0, 'rgba(245, 197, 66, 0.32)');
  glow.addColorStop(1, 'rgba(245, 197, 66, 0)');
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(p.x, p.y, 42, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
  ctx.beginPath();
  ctx.ellipse(p.x + 3, p.y + 4, 14, 11, 0, 0, Math.PI * 2);
  ctx.fill();
  // The coat is light slate with a bright gold rim now — the old dark navy
  // vanished into the floor and the thief was unreadable in screenshots.
  ctx.fillStyle = '#3a4a6b';
  ctx.beginPath();
  ctx.arc(p.x, p.y, 14, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#f5c542';
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.fillStyle = PALETTE.player;
  ctx.beginPath();
  ctx.arc(p.x, p.y, 9, 0, Math.PI * 2);
  ctx.fill();
  // The mask: a dark band across the face, pointing where the thief heads.
  ctx.fillStyle = '#1f2430';
  ctx.beginPath();
  ctx.arc(p.x + Math.cos(p.dir) * 4, p.y + Math.sin(p.dir) * 4, 6, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = PALETTE.player;
  ctx.beginPath();
  ctx.arc(p.x + Math.cos(p.dir) * 8, p.y + Math.sin(p.dir) * 8, 3, 0, Math.PI * 2);
  ctx.fill();
}

function drawSmoke(ctx, world) {
  for (const smoke of world.smokes) {
    const alpha = Math.min(0.55, 0.25 + (smoke.left / 4.5) * 0.3);
    ctx.fillStyle = `rgba(200, 205, 215, ${alpha})`;
    ctx.beginPath();
    ctx.arc(smoke.x, smoke.y, smoke.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = `rgba(220, 225, 235, ${alpha * 0.8})`;
    ctx.beginPath();
    ctx.arc(smoke.x - smoke.r * 0.3, smoke.y - smoke.r * 0.2, smoke.r * 0.55, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawCoins(ctx, world) {
  for (const coin of world.coins) {
    ctx.strokeStyle = 'rgba(255, 215, 94, 0.8)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(coin.x, coin.y, 18 + Math.sin(world.time * 6) * 3, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = PALETTE.coin;
    ctx.beginPath();
    ctx.arc(coin.x, coin.y, 7, 0, Math.PI * 2);
    ctx.fill();
  }
}

function alarmColor(alarm) {
  if (alarm < 40) return PALETTE.alarmLow;
  if (alarm < 70) return PALETTE.alarmMid;
  return PALETTE.alarmHigh;
}

function drawHud(ctx, world) {
  ctx.fillStyle = PALETTE.hud;
  ctx.fillRect(0, 0, VIEW.width, 58);
  ctx.fillStyle = 'rgba(201, 162, 39, 0.6)';
  ctx.fillRect(0, 58, VIEW.width, 2);

  // Title, left.
  ctx.fillStyle = PALETTE.loot;
  ctx.font = 'bold 20px Georgia, serif';
  ctx.textAlign = 'left';
  ctx.fillText('THE MERIDIAN VAULT', 16, 26);
  ctx.fillStyle = PALETTE.hudDim;
  ctx.font = HUD_SMALL_FONT;
  const objective = world.lootTaken
    ? 'Sapphire secured — reach the EXIT, bottom centre!'
    : 'Cross the gallery — take the STAR SAPPHIRE, then escape.';
  ctx.fillText(objective, 16, 46);

  // The alarm meter, centre: wide, labelled, impossible to miss.
  const meterX = 470;
  const meterW = 340;
  ctx.fillStyle = world.alarmTripped ? '#ff5440' : PALETTE.hudText;
  ctx.font = 'bold 15px "Courier New", monospace';
  ctx.textAlign = 'left';
  ctx.fillText(world.alarmTripped ? '⚠ ALARM!' : 'ALARM', meterX, 26);
  ctx.fillStyle = '#1a2233';
  roundRect(ctx, meterX + 78, 12, meterW, 18, 4);
  ctx.fill();
  ctx.fillStyle = alarmColor(world.alarm);
  const fillW = Math.max(0, (meterW * world.alarm) / 100);
  if (fillW > 0) {
    roundRect(ctx, meterX + 78, 12, fillW, 18, 4);
    ctx.fill();
  }
  ctx.strokeStyle = PALETTE.hudDim;
  ctx.lineWidth = 1;
  roundRect(ctx, meterX + 78, 12, meterW, 18, 4);
  ctx.stroke();
  ctx.fillStyle = PALETTE.hudText;
  ctx.font = HUD_SMALL_FONT;
  ctx.fillText(`${Math.round(world.alarm)}%`, meterX + 78 + meterW + 10, 26);
  ctx.fillStyle = PALETTE.hudDim;
  ctx.fillText(world.lootTaken ? '◆ SAPPHIRE: SECURED' : '◆ SAPPHIRE: AT LARGE', meterX, 46);

  // Tools and time, right.
  ctx.textAlign = 'right';
  ctx.fillStyle = PALETTE.hudText;
  ctx.font = HUD_FONT;
  ctx.fillText(`◐ SMOKE ×${world.player.smokes}   ◎ COIN ×${world.player.coins}`, VIEW.width - 16, 26);
  const minutes = Math.floor(world.time / 60);
  const seconds = Math.floor(world.time % 60).toString().padStart(2, '0');
  ctx.fillStyle = PALETTE.hudDim;
  ctx.font = HUD_SMALL_FONT;
  ctx.fillText(`TIME ${minutes}:${seconds}   ·   WASD move · SHIFT sprint · E smoke · Q coin`, VIEW.width - 16, 46);
}

function drawTitleScreen(ctx) {
  ctx.fillStyle = 'rgba(10, 13, 20, 0.82)';
  ctx.fillRect(0, 0, VIEW.width, VIEW.height);
  ctx.fillStyle = PALETTE.loot;
  ctx.font = TITLE_FONT;
  ctx.textAlign = 'center';
  ctx.fillText('THE MERIDIAN VAULT', VIEW.width / 2, 300);
  ctx.fillStyle = PALETTE.hudText;
  ctx.font = SUBTITLE_FONT;
  ctx.fillText('A night heist in one room — cross the gallery, take the Star Sapphire, get out.', VIEW.width / 2, 350);
  ctx.fillStyle = PALETTE.hudDim;
  ctx.font = HUD_FONT;
  ctx.fillText('Dodge the guards’ vision cones. Slip past the sweeping cameras.', VIEW.width / 2, 410);
  ctx.fillText('Smoke hides you. A tossed coin pulls a guard away. Sprinting is loud.', VIEW.width / 2, 438);
  ctx.fillText('Grab the sapphire — the alarm jumps — then reach the EXIT.', VIEW.width / 2, 466);
  ctx.fillStyle = PALETTE.loot;
  ctx.font = 'bold 20px Georgia, serif';
  ctx.fillText('— Press ENTER or click to begin —', VIEW.width / 2, 540);
}

function drawEndScreen(ctx, world, won) {
  ctx.fillStyle = won ? 'rgba(20, 40, 20, 0.78)' : 'rgba(60, 12, 10, 0.82)';
  ctx.fillRect(0, 0, VIEW.width, VIEW.height);
  const r = world.result || { time: 0, detections: 0, smokesLeft: 0, coinsLeft: 0 };
  ctx.textAlign = 'center';
  ctx.fillStyle = won ? PALETTE.exitGlow : '#ff6b5e';
  ctx.font = TITLE_FONT;
  ctx.fillText(won ? 'CLEAN GETAWAY!' : 'CAUGHT!', VIEW.width / 2, 300);
  ctx.fillStyle = PALETTE.hudText;
  ctx.font = SUBTITLE_FONT;
  ctx.fillText(
    won
      ? 'The Star Sapphire is yours. The Meridian never saw you leave.'
      : 'A guard closed the distance. The Meridian keeps its sapphire — this time.',
    VIEW.width / 2, 350,
  );
  ctx.fillStyle = PALETTE.hudDim;
  ctx.font = HUD_FONT;
  const minutes = Math.floor(r.time / 60);
  const seconds = Math.floor(r.time % 60).toString().padStart(2, '0');
  ctx.fillText(`TIME ${minutes}:${seconds}   ·   SPOTTED ${r.detections}×   ·   SMOKE LEFT ${r.smokesLeft}   ·   COINS LEFT ${r.coinsLeft}`, VIEW.width / 2, 420);
  ctx.fillStyle = PALETTE.loot;
  ctx.font = 'bold 20px Georgia, serif';
  ctx.fillText('— Press ENTER or click to play again —', VIEW.width / 2, 500);
}

// Draw one frame of the game: the room, everything in it, the HUD, and any
// screen overlay. `screen` is 'title' | 'play' | 'caught' | 'escaped'.
export function drawGame(ctx, world, screen) {
  ctx.clearRect(0, 0, VIEW.width, VIEW.height);
  drawFloor(ctx);
  drawRopes(ctx);
  drawPedestalAndLoot(ctx, world);
  drawCases(ctx);
  drawStatues(ctx);
  drawWalls(ctx, world);
  drawSmoke(ctx, world);
  for (const camera of world.cameras) drawCamera(ctx, world, camera);
  for (const guard of world.guards) drawGuard(ctx, world, guard);
  drawCoins(ctx, world);
  drawPlayer(ctx, world);
  drawHud(ctx, world);
  if (screen === 'title') drawTitleScreen(ctx);
  if (screen === 'caught') drawEndScreen(ctx, world, false);
  if (screen === 'escaped') drawEndScreen(ctx, world, true);
}
