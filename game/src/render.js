// Canvas rendering for The Velvet Vault, one job: draw everything the player
// sees. One frame must read at a glance: dark vault floor, gold-trimmed
// walls, yellow guard cones, red camera cones, glittering loot, a green exit
// and the alarm meter up top. Cones are drawn before walls and crates, so a
// wall visibly cuts a cone off — what you see is what the sight check sees.
import { TILE, COLS, ROWS, HUD_HEIGHT } from './levels.js';
import { GUARD_RANGE, GUARD_HALF_ANGLE } from './guards.js';
import { CAMERA_HALF_ANGLE } from './cameras.js';

const W = 1280;
const H = 860;

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function drawCone(ctx, x, y, facing, halfAngle, range, color) {
  const grad = ctx.createRadialGradient(x, y, 8, x, y, range);
  grad.addColorStop(0, color.replace('A', '0.34'));
  grad.addColorStop(0.7, color.replace('A', '0.16'));
  grad.addColorStop(1, color.replace('A', '0.0'));
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.arc(x, y, range, facing - halfAngle, facing + halfAngle);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = color.replace('A', '0.28');
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x + Math.cos(facing - halfAngle) * range, y + Math.sin(facing - halfAngle) * range);
  ctx.moveTo(x, y);
  ctx.lineTo(x + Math.cos(facing + halfAngle) * range, y + Math.sin(facing + halfAngle) * range);
  ctx.stroke();
}

function drawFloor(ctx, time) {
  ctx.fillStyle = '#141824';
  ctx.fillRect(0, HUD_HEIGHT, W, H - HUD_HEIGHT);
  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      const x = col * TILE;
      const y = HUD_HEIGHT + row * TILE;
      ctx.fillStyle = (row + col) % 2 === 0 ? '#171c2b' : '#151a28';
      ctx.fillRect(x, y, TILE, TILE);
      ctx.strokeStyle = 'rgba(255,255,255,0.03)';
      ctx.strokeRect(x + 0.5, y + 0.5, TILE - 1, TILE - 1);
    }
  }
  // A worn red carpet down the middle of the gallery, for orientation.
  ctx.fillStyle = 'rgba(122,28,44,0.35)';
  ctx.fillRect(0, HUD_HEIGHT + 9 * TILE, W, TILE);
  ctx.fillStyle = 'rgba(212,175,55,0.25)';
  ctx.fillRect(0, HUD_HEIGHT + 9 * TILE, W, 2);
  ctx.fillRect(0, HUD_HEIGHT + 10 * TILE - 2, W, 2);
  void time;
}

function drawWallsAndCover(ctx, walls, cover) {
  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      const x = col * TILE;
      const y = HUD_HEIGHT + row * TILE;
      if (walls[row][col]) {
        ctx.fillStyle = '#2b2f3d';
        ctx.fillRect(x, y, TILE, TILE);
        ctx.fillStyle = '#3a3f52';
        ctx.fillRect(x, y, TILE, 5);
        ctx.fillStyle = 'rgba(212,175,55,0.55)';
        ctx.fillRect(x, y + 5, TILE, 2);
        ctx.strokeStyle = 'rgba(0,0,0,0.5)';
        ctx.strokeRect(x + 0.5, y + 0.5, TILE - 1, TILE - 1);
      } else if (cover[row][col]) {
        ctx.fillStyle = '#1e2b1f';
        roundRect(ctx, x + 4, y + 4, TILE - 8, TILE - 8, 7);
        ctx.fill();
        ctx.fillStyle = '#2e4a2c';
        ctx.beginPath();
        ctx.arc(x + 13, y + 14, 7, 0, Math.PI * 2);
        ctx.arc(x + 27, y + 18, 8, 0, Math.PI * 2);
        ctx.arc(x + 20, y + 28, 7, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#4a7a3f';
        ctx.beginPath();
        ctx.arc(x + 13, y + 12, 3, 0, Math.PI * 2);
        ctx.arc(x + 27, y + 16, 3, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }
}

function drawLoot(ctx, loot, time) {
  for (const item of loot) {
    if (item.taken) continue;
    const bob = Math.sin(time * 2.4 + item.phase) * 2.5;
    if (item.kind === 'diamond') {
      const glow = ctx.createRadialGradient(item.x, item.y + bob, 2, item.x, item.y + bob, 30);
      glow.addColorStop(0, 'rgba(120,220,255,0.55)');
      glow.addColorStop(1, 'rgba(120,220,255,0)');
      ctx.fillStyle = glow;
      ctx.fillRect(item.x - 30, item.y + bob - 30, 60, 60);
      ctx.save();
      ctx.translate(item.x, item.y + bob);
      ctx.rotate(Math.PI / 4);
      ctx.fillStyle = '#8fd8ff';
      ctx.fillRect(-9, -9, 18, 18);
      ctx.fillStyle = '#d8f4ff';
      ctx.fillRect(-9, -9, 18, 7);
      ctx.restore();
    } else {
      const glow = ctx.createRadialGradient(item.x, item.y + bob, 2, item.x, item.y + bob, 24);
      glow.addColorStop(0, 'rgba(255,215,80,0.5)');
      glow.addColorStop(1, 'rgba(255,215,80,0)');
      ctx.fillStyle = glow;
      ctx.fillRect(item.x - 24, item.y + bob - 24, 48, 48);
      ctx.fillStyle = '#d4af37';
      ctx.beginPath();
      ctx.arc(item.x, item.y + bob, 11, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffe98a';
      ctx.beginPath();
      ctx.arc(item.x, item.y + bob, 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#8a6d1f';
      ctx.font = 'bold 11px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('$', item.x, item.y + bob + 0.5);
    }
  }
}

function drawExit(ctx, exit, open, time) {
  const pulse = open ? 0.65 + Math.sin(time * 4) * 0.3 : 0.25;
  const glow = ctx.createRadialGradient(exit.x, exit.y, 4, exit.x, exit.y, 52);
  glow.addColorStop(0, `rgba(80,255,140,${pulse})`);
  glow.addColorStop(1, 'rgba(80,255,140,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(exit.x - 52, exit.y - 52, 104, 104);
  ctx.fillStyle = open ? '#12351f' : '#2a1214';
  roundRect(ctx, exit.x - 17, exit.y - 19, 34, 38, 5);
  ctx.fill();
  ctx.strokeStyle = open ? '#4dff88' : '#c0392b';
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.fillStyle = open ? '#4dff88' : '#e74c3c';
  ctx.font = 'bold 10px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(open ? 'EXIT' : 'LOCK', exit.x, exit.y - 28);
  ctx.fillStyle = open ? '#baffcf' : '#f5b7b1';
  ctx.font = 'bold 15px sans-serif';
  ctx.fillText(open ? '➜' : '✕', exit.x, exit.y + 1);
}

function drawGuards(ctx, guards) {
  for (const g of guards) {
    const alerted = g.mood !== 'patrol';
    drawCone(ctx, g.x, g.y, g.facing, GUARD_HALF_ANGLE, GUARD_RANGE, alerted ? 'rgba(255,60,50,A)' : 'rgba(255,205,60,A)');
    const bobY = Math.sin(g.bob) * 1.5;
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.beginPath();
    ctx.ellipse(g.x, g.y + 13, 12, 5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = alerted ? '#7a1f1a' : '#24365e';
    ctx.beginPath();
    ctx.arc(g.x, g.y + bobY, 13, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#d4af37';
    ctx.lineWidth = 2;
    ctx.stroke();
    // Facing tick: a little nose so the cone's direction is obvious.
    ctx.fillStyle = '#d4af37';
    ctx.beginPath();
    ctx.arc(g.x + Math.cos(g.facing) * 15, g.y + bobY + Math.sin(g.facing) * 15, 3.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(g.x - 4, g.y + bobY - 3, 2.2, 0, Math.PI * 2);
    ctx.arc(g.x + 4, g.y + bobY - 3, 2.2, 0, Math.PI * 2);
    ctx.fill();
    if (alerted) {
      ctx.fillStyle = '#ff3c32';
      ctx.font = 'bold 16px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('!', g.x, g.y + bobY - 20);
    }
  }
}

function drawCameras(ctx, cameras, time) {
  for (const c of cameras) {
    drawCone(ctx, c.x, c.y, c.facing, CAMERA_HALF_ANGLE, c.range, 'rgba(255,70,70,A)');
    const blink = c.spotted ? (Math.sin(time * 14) > 0 ? '#ff2d2d' : '#7a0d0d') : '#ff5a5a';
    ctx.fillStyle = '#3a3f52';
    ctx.beginPath();
    ctx.arc(c.x, c.y, 9, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#c8ccd8';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = blink;
    ctx.beginPath();
    ctx.arc(c.x + Math.cos(c.facing) * 4, c.y + Math.sin(c.facing) * 4, 3.5, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawThief(ctx, thief, time) {
  const r = thief.sneaking ? 11 : 13;
  ctx.fillStyle = 'rgba(0,0,0,0.45)';
  ctx.beginPath();
  ctx.ellipse(thief.x, thief.y + 14, 12, 5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#101014';
  ctx.beginPath();
  ctx.arc(thief.x, thief.y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#d4af37';
  ctx.lineWidth = 2;
  ctx.stroke();
  // Domino mask: two pale eyes on a dark face.
  ctx.fillStyle = '#f5f0dc';
  ctx.fillRect(thief.x - 8, thief.y - 4, 7, 4);
  ctx.fillRect(thief.x + 1, thief.y - 4, 7, 4);
  ctx.fillStyle = '#101014';
  ctx.beginPath();
  ctx.arc(thief.x - 4.5, thief.y - 2, 1.4, 0, Math.PI * 2);
  ctx.arc(thief.x + 4.5, thief.y - 2, 1.4, 0, Math.PI * 2);
  ctx.fill();
  if (thief.graceLeft > 0 && Math.sin(time * 16) > 0) {
    ctx.strokeStyle = 'rgba(255,255,255,0.7)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(thief.x, thief.y, r + 5, 0, Math.PI * 2);
    ctx.stroke();
  }
}

function drawPebbles(ctx, pebbles, time) {
  for (const p of pebbles) {
    ctx.strokeStyle = `rgba(200,220,255,${0.8 - p.age * 0.25})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(p.x, p.y, 6 + p.age * 26, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = '#c8ccd8';
    ctx.beginPath();
    ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
    ctx.fill();
  }
  void time;
}

function drawAlarmMeter(ctx, alarm) {
  const x = 470;
  const y = 30;
  const w = 340;
  const h = 30;
  ctx.fillStyle = '#0b0e16';
  roundRect(ctx, x - 6, y - 6, w + 12, h + 12, 9);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.18)';
  ctx.lineWidth = 1.5;
  ctx.stroke();
  const frac = alarm / 100;
  const grad = ctx.createLinearGradient(x, 0, x + w, 0);
  grad.addColorStop(0, '#37c978');
  grad.addColorStop(0.55, '#f5c542');
  grad.addColorStop(1, '#ff3c32');
  ctx.fillStyle = '#1d2333';
  roundRect(ctx, x, y, w, h, 6);
  ctx.fill();
  if (frac > 0.005) {
    ctx.fillStyle = grad;
    roundRect(ctx, x, y, Math.max(10, w * frac), h, 6);
    ctx.fill();
  }
  // Suspicion tick at 55: the line where guards start to investigate.
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(x + w * 0.55 - 1, y - 4, 2, h + 8);
  ctx.fillStyle = '#f5f0dc';
  ctx.font = 'bold 15px sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText('ALARM', x - 78, y + h / 2);
  ctx.textAlign = 'right';
  ctx.fillText(`${Math.round(alarm)}%`, x + w + 62, y + h / 2);
  const state = alarm >= 90 ? 'ALARM!' : alarm >= 55 ? 'SUSPICIOUS' : alarm >= 25 ? 'WARY' : 'CALM';
  ctx.fillStyle = alarm >= 90 ? '#ff3c32' : alarm >= 55 ? '#f5c542' : '#9fb4d8';
  ctx.font = 'bold 13px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(state, x + w / 2, y + h + 22);
}

function drawHud(ctx, hud) {
  ctx.fillStyle = '#0d1019';
  ctx.fillRect(0, 0, W, HUD_HEIGHT);
  ctx.fillStyle = 'rgba(212,175,55,0.5)';
  ctx.fillRect(0, HUD_HEIGHT - 3, W, 3);
  ctx.fillStyle = '#d4af37';
  ctx.font = 'bold 24px sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText('THE VELVET VAULT', 18, 30);
  ctx.fillStyle = '#9fb4d8';
  ctx.font = '15px sans-serif';
  ctx.fillText(hud.levelName, 18, 58);
  ctx.fillStyle = '#f5f0dc';
  ctx.font = 'bold 16px sans-serif';
  ctx.fillText(`LOOT ${hud.lootGot}/${hud.lootTotal}`, 18, 84);
  drawAlarmMeter(ctx, hud.alarm);
  // Lives as hearts, pebbles as dots, score and time at the right.
  let lx = 900;
  for (let i = 0; i < hud.livesMax; i++) {
    ctx.fillStyle = i < hud.lives ? '#ff5a6e' : 'rgba(255,90,110,0.22)';
    ctx.font = '20px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('♥', lx + i * 26, 32);
  }
  ctx.fillStyle = '#f5f0dc';
  ctx.font = 'bold 15px sans-serif';
  ctx.fillText(`PEBBLES ${hud.pebbles}`, 900, 62);
  ctx.fillText(`SCORE ${hud.score}`, 900, 86);
  ctx.textAlign = 'right';
  ctx.fillText(`TIME ${hud.timeText}`, 1262, 32);
  ctx.fillStyle = '#9fb4d8';
  ctx.font = '13px sans-serif';
  ctx.fillText('WASD move · Shift sneak · E pebble', 1262, 62);
  ctx.fillText(hud.muted ? 'M: sound OFF' : 'M: sound on', 1262, 84);
}

function drawBanner(ctx, title, lines, color) {
  ctx.fillStyle = 'rgba(8,10,16,0.72)';
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = color || '#d4af37';
  ctx.font = 'bold 54px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(title, W / 2, H / 2 - 90);
  ctx.fillStyle = '#f5f0dc';
  ctx.font = '21px sans-serif';
  lines.forEach((line, i) => {
    ctx.fillText(line, W / 2, H / 2 - 20 + i * 34);
  });
}

export function renderGame(ctx, world, time) {
  drawFloor(ctx, time);
  drawGuards(ctx, world.guards);
  drawCameras(ctx, world.cameras, time);
  drawWallsAndCover(ctx, world.walls, world.cover);
  drawLoot(ctx, world.loot, time);
  drawExit(ctx, world.exit, world.exitOpen, time);
  drawPebbles(ctx, world.pebbles, time);
  drawThief(ctx, world.thief, time);
  drawHud(ctx, world.hud);
  if (world.banner) {
    drawBanner(ctx, world.banner.title, world.banner.lines, world.banner.color);
  }
  if (world.message) {
    ctx.fillStyle = 'rgba(8,10,16,0.78)';
    const w = 620;
    roundRect(ctx, (W - w) / 2, HUD_HEIGHT + 14, w, 40, 9);
    ctx.fill();
    ctx.fillStyle = '#ffe98a';
    ctx.font = 'bold 17px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(world.message, W / 2, HUD_HEIGHT + 35);
  }
}
