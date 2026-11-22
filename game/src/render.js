// Drawing only: the world's state and the current screen in, pixels out. The 1280x860
// playfield is scaled to fit the window and centred, the margin filled with the backdrop
// colour. The hall is a midnight-blue marble floor with a crimson carpet runner, glass cases
// and bronze statues for cover; the thief pops against the dark floor in a pool of gold
// light with a thick gold rim, guards sweep amber cones, cameras sweep red beams, and the
// golden watch glows on its pedestal. Text that holds a number is rebuilt only when the
// number changes, so a frame allocates nothing.
import {
  ALARM,
  CAMERA,
  CARPET,
  COVER_CIRCLES,
  COVER_RECTS,
  EXIT,
  FIELD,
  FONT,
  GUARD,
  LIVES,
  PALETTE,
  PEDESTAL,
  THIEF,
  TOOLS,
  WALL,
} from './config.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_OVER = 'over';

/** Gold veins in the marble floor: fixed segments, so the floor never changes between runs. */
const VEINS = [
  [120, 90, 300, 210],
  [520, 140, 700, 60],
  [900, 100, 1080, 240],
  [180, 480, 380, 620],
  [760, 500, 980, 660],
  [1080, 620, 1220, 760],
  [420, 700, 560, 820],
  [980, 420, 1120, 520],
];

function cachedLabel(prefix) {
  let value = -1;
  let text = '';
  return function label(next) {
    if (next !== value) {
      value = next;
      text = prefix + next;
    }
    return text;
  };
}

function formatTime(seconds) {
  const total = Math.floor(seconds);
  const minutes = Math.floor(total / 60);
  const rest = total % 60;
  return `${minutes}:${rest < 10 ? '0' : ''}${rest}`;
}

export function createRenderer(canvas) {
  const context = canvas.getContext('2d');
  const view = { scale: 1, x: 0, y: 0 };
  const scoreLabel = cachedLabel('SCORE ');
  const timeLabel = cachedLabel('TIME ');
  const finalLabel = cachedLabel('Score ');
  const bestLabel = cachedLabel('Best ');

  function resize() {
    const ratio = window.devicePixelRatio || 1;
    const width = Math.round(window.innerWidth * ratio);
    const height = Math.round(window.innerHeight * ratio);
    canvas.width = width;
    canvas.height = height;
    view.scale = Math.min(width / FIELD.width, height / FIELD.height);
    view.x = (width - FIELD.width * view.scale) / 2;
    view.y = (height - FIELD.height * view.scale) / 2;
  }

  const fonts = new Map();
  function font(size, bold) {
    const key = `${bold ? '700 ' : ''}${size}`;
    if (!fonts.has(key)) fonts.set(key, `${bold ? '700 ' : ''}${size}px ${FONT}`);
    return fonts.get(key);
  }

  function text(value, x, y, size, color, align, bold) {
    context.font = font(size, bold);
    context.fillStyle = color;
    context.textAlign = align;
    context.textBaseline = 'alphabetic';
    context.fillText(value, x, y);
  }

  function drawFloor() {
    context.fillStyle = PALETTE.floor;
    context.fillRect(0, 0, FIELD.width, FIELD.height);
    // Marble slabs.
    context.strokeStyle = PALETTE.slab;
    context.lineWidth = 2;
    for (let x = 160; x < FIELD.width; x += 160) {
      context.beginPath();
      context.moveTo(x, WALL);
      context.lineTo(x, FIELD.height - WALL);
      context.stroke();
    }
    for (let y = 160; y < FIELD.height; y += 160) {
      context.beginPath();
      context.moveTo(WALL, y);
      context.lineTo(FIELD.width - WALL, y);
      context.stroke();
    }
    // Gold veins.
    context.strokeStyle = 'rgba(232, 182, 76, 0.16)';
    context.lineWidth = 1.5;
    for (let index = 0; index < VEINS.length; index += 1) {
      const vein = VEINS[index];
      context.beginPath();
      context.moveTo(vein[0], vein[1]);
      context.lineTo(vein[2], vein[3]);
      context.stroke();
    }
    // The crimson carpet runner down the middle.
    context.fillStyle = PALETTE.carpet;
    context.fillRect(CARPET.x, CARPET.y, CARPET.width, CARPET.height);
    context.strokeStyle = PALETTE.carpetEdge;
    context.lineWidth = 3;
    context.beginPath();
    context.moveTo(CARPET.x, CARPET.y);
    context.lineTo(CARPET.x, CARPET.y + CARPET.height);
    context.moveTo(CARPET.x + CARPET.width, CARPET.y);
    context.lineTo(CARPET.x + CARPET.width, CARPET.y + CARPET.height);
    context.stroke();
    context.fillStyle = 'rgba(201, 162, 39, 0.45)';
    for (let y = CARPET.y + 40; y < CARPET.y + CARPET.height; y += 80) {
      context.beginPath();
      context.moveTo(640, y - 8);
      context.lineTo(648, y);
      context.lineTo(640, y + 8);
      context.lineTo(632, y);
      context.closePath();
      context.fill();
    }
    // Walls: a dark band with a gold hairline, and the doorway at the bottom centre.
    context.fillStyle = PALETTE.backdrop;
    context.fillRect(0, 0, FIELD.width, WALL);
    context.fillRect(0, FIELD.height - WALL, FIELD.width, WALL);
    context.fillRect(0, 0, WALL, FIELD.height);
    context.fillRect(FIELD.width - WALL, 0, WALL, FIELD.height);
    // Doorway gap in the bottom wall.
    context.fillStyle = '#05060c';
    context.fillRect(EXIT.x, FIELD.height - WALL, EXIT.width, WALL);
    context.strokeStyle = PALETTE.gold;
    context.lineWidth = 2;
    context.strokeRect(1, 1, FIELD.width - 2, FIELD.height - 2);
  }

  function drawCover() {
    for (let index = 0; index < COVER_RECTS.length; index += 1) {
      const rect = COVER_RECTS[index];
      if (rect.width === 34) {
        // A marble column.
        context.fillStyle = PALETTE.marble;
        context.fillRect(rect.x, rect.y, rect.width, rect.height);
        context.strokeStyle = PALETTE.gold;
        context.lineWidth = 2;
        context.strokeRect(rect.x + 3, rect.y + 3, rect.width - 6, rect.height - 6);
      } else {
        // A glass display case: dark glass, bright rim, glints of the pieces inside.
        context.fillStyle = PALETTE.caseGlass;
        context.fillRect(rect.x, rect.y, rect.width, rect.height);
        context.strokeStyle = PALETTE.caseRim;
        context.lineWidth = 2;
        context.strokeRect(rect.x, rect.y, rect.width, rect.height);
        context.fillStyle = PALETTE.goldBright;
        for (let dot = 0; dot < 3; dot += 1) {
          context.beginPath();
          context.arc(rect.x + 50 + dot * 75, rect.y + rect.height / 2, 4, 0, Math.PI * 2);
          context.fill();
        }
      }
    }
    for (let index = 0; index < COVER_CIRCLES.length; index += 1) {
      const circle = COVER_CIRCLES[index];
      context.fillStyle = PALETTE.statue;
      context.beginPath();
      context.arc(circle.x, circle.y, circle.radius, 0, Math.PI * 2);
      context.fill();
      context.strokeStyle = PALETTE.statueHi;
      context.lineWidth = 3;
      context.beginPath();
      context.arc(circle.x, circle.y, circle.radius - 5, -2.4, -0.6);
      context.stroke();
      context.strokeStyle = PALETTE.gold;
      context.lineWidth = 1.5;
      context.beginPath();
      context.arc(circle.x, circle.y, circle.radius + 3, 0, Math.PI * 2);
      context.stroke();
    }
  }

  function drawPedestal(state) {
    // A white marble column with gold trim.
    context.fillStyle = PALETTE.marble;
    context.beginPath();
    context.arc(PEDESTAL.x, PEDESTAL.y, PEDESTAL.radius, 0, Math.PI * 2);
    context.fill();
    context.strokeStyle = PALETTE.gold;
    context.lineWidth = 2;
    context.beginPath();
    context.arc(PEDESTAL.x, PEDESTAL.y, PEDESTAL.radius - 6, 0, Math.PI * 2);
    context.stroke();
    if (!state.lootSecured) {
      // The Gilded Hour: a golden pocket watch, glowing, with slow sparkles.
      const glow = context.createRadialGradient(
        PEDESTAL.x, PEDESTAL.y, 4, PEDESTAL.x, PEDESTAL.y, 74,
      );
      glow.addColorStop(0, 'rgba(255, 217, 122, 0.55)');
      glow.addColorStop(1, 'rgba(255, 217, 122, 0)');
      context.fillStyle = glow;
      context.beginPath();
      context.arc(PEDESTAL.x, PEDESTAL.y, 74, 0, Math.PI * 2);
      context.fill();
      context.fillStyle = PALETTE.gold;
      context.beginPath();
      context.arc(PEDESTAL.x, PEDESTAL.y, 17, 0, Math.PI * 2);
      context.fill();
      context.fillStyle = PALETTE.goldBright;
      context.beginPath();
      context.arc(PEDESTAL.x, PEDESTAL.y, 11, 0, Math.PI * 2);
      context.fill();
      context.strokeStyle = '#7a5a17';
      context.lineWidth = 2;
      context.beginPath();
      context.moveTo(PEDESTAL.x, PEDESTAL.y);
      context.lineTo(PEDESTAL.x + 7, PEDESTAL.y - 5);
      context.moveTo(PEDESTAL.x, PEDESTAL.y);
      context.lineTo(PEDESTAL.x - 3, PEDESTAL.y - 8);
      context.stroke();
      for (let spark = 0; spark < 4; spark += 1) {
        const angle = state.elapsed * 0.7 + spark * (Math.PI / 2);
        const radius = 30 + 8 * Math.sin(state.elapsed * 1.3 + spark * 2);
        const sx = PEDESTAL.x + Math.cos(angle) * radius;
        const sy = PEDESTAL.y + Math.sin(angle) * radius;
        context.fillStyle = 'rgba(255, 217, 122, 0.9)';
        context.fillRect(sx - 1.5, sy - 1.5, 3, 3);
      }
      text('★ THE GILDED HOUR ★', PEDESTAL.x, PEDESTAL.y - 58, 20, PALETTE.goldBright, 'center', true);
    } else {
      text('— EMPTY —', PEDESTAL.x, PEDESTAL.y - 52, 16, PALETTE.muted, 'center', true);
    }
  }

  function drawConesAndBeams(state) {
    for (let index = 0; index < state.guards.length; index += 1) {
      const guard = state.guards[index];
      const chasing = guard.mode === 'chase';
      context.fillStyle = chasing ? 'rgba(255, 60, 60, 0.22)' : 'rgba(255, 180, 60, 0.15)';
      context.beginPath();
      context.moveTo(guard.x, guard.y);
      context.arc(guard.x, guard.y, GUARD.coneRange, guard.dir - GUARD.coneHalf, guard.dir + GUARD.coneHalf);
      context.closePath();
      context.fill();
      context.strokeStyle = chasing ? 'rgba(255, 60, 60, 0.55)' : 'rgba(255, 180, 60, 0.45)';
      context.lineWidth = 2;
      context.beginPath();
      context.moveTo(guard.x, guard.y);
      context.lineTo(
        guard.x + Math.cos(guard.dir - GUARD.coneHalf) * GUARD.coneRange,
        guard.y + Math.sin(guard.dir - GUARD.coneHalf) * GUARD.coneRange,
      );
      context.moveTo(guard.x, guard.y);
      context.lineTo(
        guard.x + Math.cos(guard.dir + GUARD.coneHalf) * GUARD.coneRange,
        guard.y + Math.sin(guard.dir + GUARD.coneHalf) * GUARD.coneRange,
      );
      context.stroke();
    }
    for (let index = 0; index < state.cameras.length; index += 1) {
      const camera = state.cameras[index];
      const tipX = camera.x + Math.cos(camera.angle) * CAMERA.beamLength;
      const tipY = camera.y + Math.sin(camera.angle) * CAMERA.beamLength;
      context.fillStyle = 'rgba(255, 46, 46, 0.10)';
      context.beginPath();
      context.moveTo(camera.x, camera.y);
      context.arc(camera.x, camera.y, CAMERA.beamLength, camera.angle - CAMERA.beamHalf, camera.angle + CAMERA.beamHalf);
      context.closePath();
      context.fill();
      context.strokeStyle = 'rgba(255, 46, 46, 0.5)';
      context.lineWidth = 2;
      context.beginPath();
      context.moveTo(camera.x, camera.y);
      context.lineTo(tipX, tipY);
      context.stroke();
      // The camera body on the wall, with its red lens.
      context.fillStyle = '#2a2f45';
      context.fillRect(camera.x - 12, camera.y - 8, 24, 16);
      context.fillStyle = PALETTE.beam;
      context.beginPath();
      context.arc(camera.x, camera.y + 8, 4, 0, Math.PI * 2);
      context.fill();
    }
  }

  function drawSmokeAndCoins(state) {
    for (let index = 0; index < state.smoke.length; index += 1) {
      const cloud = state.smoke[index];
      const gradient = context.createRadialGradient(cloud.x, cloud.y, 8, cloud.x, cloud.y, TOOLS.smokeRadius);
      gradient.addColorStop(0, 'rgba(220, 220, 230, 0.42)');
      gradient.addColorStop(1, 'rgba(220, 220, 230, 0)');
      context.fillStyle = gradient;
      context.beginPath();
      context.arc(cloud.x, cloud.y, TOOLS.smokeRadius, 0, Math.PI * 2);
      context.fill();
    }
    for (let index = 0; index < state.coins.length; index += 1) {
      const coin = state.coins[index];
      const progress = 1 - coin.t / TOOLS.coinPingSeconds;
      context.strokeStyle = `rgba(255, 217, 122, ${0.75 * (1 - progress)})`;
      context.lineWidth = 2;
      context.beginPath();
      context.arc(coin.x, coin.y, 6 + progress * 46, 0, Math.PI * 2);
      context.stroke();
      context.fillStyle = PALETTE.goldBright;
      context.beginPath();
      context.arc(coin.x, coin.y, 5, 0, Math.PI * 2);
      context.fill();
    }
  }

  function drawGuards(state) {
    for (let index = 0; index < state.guards.length; index += 1) {
      const guard = state.guards[index];
      context.fillStyle = PALETTE.guard;
      context.beginPath();
      context.arc(guard.x, guard.y, GUARD.radius, 0, Math.PI * 2);
      context.fill();
      context.strokeStyle = PALETTE.guardDark;
      context.lineWidth = 2;
      context.beginPath();
      context.arc(guard.x, guard.y, GUARD.radius, 0, Math.PI * 2);
      context.stroke();
      // A brim pointing where the guard looks.
      context.strokeStyle = PALETTE.goldBright;
      context.lineWidth = 3;
      context.beginPath();
      context.moveTo(guard.x + Math.cos(guard.dir) * 6, guard.y + Math.sin(guard.dir) * 6);
      context.lineTo(guard.x + Math.cos(guard.dir) * (GUARD.radius + 4), guard.y + Math.sin(guard.dir) * (GUARD.radius + 4));
      context.stroke();
      if (guard.mode === 'investigate') text('?', guard.x, guard.y - GUARD.radius - 8, 26, PALETTE.goldBright, 'center', true);
      if (guard.mode === 'chase') text('!', guard.x, guard.y - GUARD.radius - 8, 28, PALETTE.alarmHigh, 'center', true);
      if (guard.suspicion > 0.05 && guard.mode !== 'chase') {
        context.strokeStyle = 'rgba(255, 180, 60, 0.85)';
        context.lineWidth = 3;
        context.beginPath();
        context.arc(guard.x, guard.y, GUARD.radius + 8, -Math.PI / 2, -Math.PI / 2 + guard.suspicion * Math.PI * 2);
        context.stroke();
      }
    }
  }

  function drawThief(state) {
    const thief = state.thief;
    // A pool of warm light under the thief, so the dark figure always pops off the floor.
    const pool = context.createRadialGradient(thief.x, thief.y, 4, thief.x, thief.y, 48);
    pool.addColorStop(0, 'rgba(255, 217, 122, 0.30)');
    pool.addColorStop(1, 'rgba(255, 217, 122, 0)');
    context.fillStyle = pool;
    context.beginPath();
    context.arc(thief.x, thief.y, 48, 0, Math.PI * 2);
    context.fill();
    // Blink while invulnerable after being caught.
    if (thief.invulnerable === 0 || Math.floor(thief.invulnerable * 10) % 2 === 1) {
      context.fillStyle = PALETTE.thief;
      context.beginPath();
      context.arc(thief.x, thief.y, THIEF.radius, 0, Math.PI * 2);
      context.fill();
      context.strokeStyle = PALETTE.thiefRim;
      context.lineWidth = 3;
      context.beginPath();
      context.arc(thief.x, thief.y, THIEF.radius, 0, Math.PI * 2);
      context.stroke();
      context.strokeStyle = PALETTE.thiefRim;
      context.lineWidth = 3;
      context.beginPath();
      context.moveTo(thief.x + Math.cos(thief.face) * 4, thief.y + Math.sin(thief.face) * 4);
      context.lineTo(thief.x + Math.cos(thief.face) * (THIEF.radius + 5), thief.y + Math.sin(thief.face) * (THIEF.radius + 5));
      context.stroke();
    }
  }

  function drawExit(state) {
    const open = state.lootSecured;
    context.fillStyle = open ? 'rgba(61, 220, 120, 0.25)' : 'rgba(138, 109, 59, 0.25)';
    context.fillRect(EXIT.x, EXIT.y, EXIT.width, FIELD.height - EXIT.y);
    text(
      open ? 'EXIT · OPEN' : 'EXIT · LOCKED',
      EXIT.x + EXIT.width / 2, EXIT.y - 10, 16,
      open ? PALETTE.exit : PALETTE.exitLocked, 'center', true,
    );
  }

  function drawHud(state) {
    context.fillStyle = 'rgba(20, 24, 40, 0.92)';
    context.fillRect(0, 0, FIELD.width, 64);
    context.strokeStyle = PALETTE.gold;
    context.lineWidth = 2;
    context.beginPath();
    context.moveTo(0, 64);
    context.lineTo(FIELD.width, 64);
    context.stroke();
    text('THE GILDED HOUR', 24, 30, 26, PALETTE.gold, 'left', true);
    text('Meridian Museum · after hours', 24, 54, 14, PALETTE.muted, 'left');
    // The alarm meter, centre: ten segments, green to amber to red.
    const meterX = FIELD.width / 2 - 160;
    const meterY = 20;
    const meterW = 320;
    const meterH = 22;
    text('ALARM', meterX - 12, meterY + 17, 18, PALETTE.text, 'right', true);
    context.fillStyle = '#0b0d16';
    context.fillRect(meterX, meterY, meterW, meterH);
    for (let segment = 0; segment < 10; segment += 1) {
      const filled = state.alarm > segment * 10;
      const color = state.alarm < 40 ? PALETTE.alarmLow : state.alarm < 70 ? PALETTE.alarmMid : PALETTE.alarmHigh;
      context.fillStyle = filled ? color : '#2a2f45';
      context.fillRect(meterX + 2 + segment * ((meterW - 4) / 10), meterY + 2, (meterW - 4) / 10 - 3, meterH - 4);
    }
    context.strokeStyle = PALETTE.panelEdge;
    context.lineWidth = 2;
    context.strokeRect(meterX, meterY, meterW, meterH);
    text(`${Math.round(state.alarm)}%`, meterX + meterW + 12, meterY + 17, 18, PALETTE.text, 'left', true);
    // Right: loot, tools, lives, time, score.
    const right = FIELD.width - 24;
    text(
      state.lootSecured ? 'WATCH · SECURED' : 'WATCH · AT LARGE',
      right, 30, 18, state.lootSecured ? PALETTE.exit : PALETTE.goldBright, 'right', true,
    );
    text(
      `${scoreLabel(state.score)}   SMOKE ×${state.smokeCharges}   COIN ×${state.coinCharges}   ${timeLabel(formatTime(state.time))}`,
      right, 54, 14, PALETTE.muted, 'right',
    );
    // Lives sit beside the subtitle, clear of every other label.
    text('LIVES', 258, 54, 14, PALETTE.muted, 'left');
    for (let life = 0; life < LIVES; life += 1) {
      const lx = 310 + life * 24;
      const ly = 47;
      context.fillStyle = life < state.lives ? PALETTE.goldBright : '#2a2f45';
      context.beginPath();
      context.moveTo(lx, ly - 7);
      context.lineTo(lx + 7, ly);
      context.lineTo(lx, ly + 7);
      context.lineTo(lx - 7, ly);
      context.closePath();
      context.fill();
    }
    // A red pulse at the edges while the alarm runs hot.
    if (state.alarm >= 70) {
      const pulse = 0.10 + 0.08 * Math.sin(state.elapsed * 5);
      context.strokeStyle = `rgba(255, 71, 71, ${pulse})`;
      context.lineWidth = 10;
      context.strokeRect(5, 5, FIELD.width - 10, FIELD.height - 10);
    }
    text('WASD / arrows — move · Shift — sprint (noisy) · Q — coin · E — smoke · P — pause', 24, FIELD.height - 12, 13, PALETTE.muted, 'left');
  }

  function drawPanel(title, lines, prompt, accent) {
    const width = 640;
    const height = 150 + lines.length * 34;
    const x = (FIELD.width - width) / 2;
    const y = (FIELD.height - height) / 2;
    context.fillStyle = 'rgba(11, 13, 22, 0.82)';
    context.fillRect(0, 0, FIELD.width, FIELD.height);
    context.fillStyle = PALETTE.panel;
    context.fillRect(x, y, width, height);
    context.strokeStyle = accent || PALETTE.gold;
    context.lineWidth = 3;
    context.strokeRect(x, y, width, height);
    context.textBaseline = 'alphabetic';
    text(title, FIELD.width / 2, y + 72, 44, PALETTE.text, 'center', true);
    for (let index = 0; index < lines.length; index += 1) {
      text(lines[index], FIELD.width / 2, y + 118 + index * 34, 20, PALETTE.muted, 'center');
    }
    text(prompt, FIELD.width / 2, y + height - 36, 22, PALETTE.goldBright, 'center');
  }

  const TITLE_LINES = [
    'Steal the golden watch from the Meridian Museum.',
    'Read the cones. Mind the cameras. Slip out unseen.',
    'Three routes in. Smoke and coins at a cost. One way out.',
    '',
  ];
  const PAUSED_LINES = ['The guards will wait for you.'];
  const CAUGHT_LINES = ['', ''];
  const ESCAPED_LINES = ['', ''];

  /** Paint one frame: the hall, then the HUD or a panel for the screen the game is on. */
  function draw(state, screen, best) {
    context.setTransform(1, 0, 0, 1, 0, 0);
    context.fillStyle = PALETTE.backdrop;
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.setTransform(view.scale, 0, 0, view.scale, view.x, view.y);
    drawFloor();
    drawConesAndBeams(state);
    drawCover();
    drawPedestal(state);
    drawExit(state);
    drawSmokeAndCoins(state);
    drawGuards(state);
    drawThief(state);
    if (screen === SCREEN_TITLE) {
      TITLE_LINES[3] = bestLabel(best);
      drawPanel('THE GILDED HOUR', TITLE_LINES, 'Press Space or click to begin');
      return;
    }
    drawHud(state);
    if (screen === SCREEN_PAUSED) drawPanel('Paused', PAUSED_LINES, 'Press P to resume');
    else if (screen === SCREEN_OVER) {
      if (state.escaped) {
        ESCAPED_LINES[0] = finalLabel(state.score);
        ESCAPED_LINES[1] = bestLabel(best);
        drawPanel('CLEAN GETAWAY', ESCAPED_LINES, 'Press Space or click to run it again', PALETTE.exit);
      } else {
        CAUGHT_LINES[0] = finalLabel(state.score);
        CAUGHT_LINES[1] = bestLabel(best);
        drawPanel('CAUGHT!', CAUGHT_LINES, 'Press Space or click to try again', PALETTE.alarmHigh);
      }
    }
  }

  resize();
  window.addEventListener('resize', resize);
  return { draw };
}
