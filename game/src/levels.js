// The three vaults of The Velvet Vault, one job: the rooms themselves.
// Each map is 19 rows of 32 tiles. Legend: # wall, . floor, o cover crate
// (blocks movement and sight), T thief start, G guard spawn, C camera mount,
// L gold coin, D diamond, E exit. Patrol paths and camera sweeps live beside
// the map so a level reads as one room, not a spreadsheet.
export const TILE = 40;
export const COLS = 32;
export const ROWS = 19;
export const HUD_HEIGHT = 100;

export const LEVELS = [
  {
    name: 'The Velvet Gallery',
    briefing: 'Lift the gallery gold. Cameras sweep the hall — mind the cones.',
    seed: 11,
    pebbles: 3,
    map: [
      '################################',
      '#......#........#......#.......#',
      '#..L...#...o....#..D...#...L...#',
      '#......#........#......#.......#',
      '#..####....####.....####....####',
      '#..............................#',
      '#..o......G.......C.......o....#',
      '#..............................#',
      '####....#######......####......#',
      '#..............................#',
      '#..L....o.......T.........L....#',
      '#..............................#',
      '#..####....####......####......#',
      '#......#........#......#.......#',
      '#..o...#...L....#....o.........#',
      '#......#........#......#.......#',
      '#..............................#',
      '#..G.......C..........E........#',
      '################################',
    ],
    guardPaths: [
      [[10, 6], [10, 7], [14, 7], [14, 6]],
      [[3, 17], [8, 17], [8, 16], [3, 16]],
    ],
    cameras: [
      { angle: 45, sweep: 55, range: 230 },
      { angle: 0, sweep: 50, range: 220 },
    ],
  },
  {
    name: 'The Gilded Hall',
    briefing: 'Three guards, three cameras, one very loud floor. Stay low.',
    seed: 23,
    pebbles: 3,
    map: [
      '################################',
      '#..L.....#.....o....#......L...#',
      '#.......#..........#G..........#',
      '#..###......####......###......#',
      '#..............................#',
      '#..o...G........C........o.....#',
      '#..............................#',
      '#####.....########.....######..#',
      '#..............................#',
      '#....D......#.....L.....#..C...#',
      '#...........#..........#.......#',
      '#..####..........####......###.#',
      '#..............................#',
      '#..o.......C......G......o.....#',
      '#..............................#',
      '#..L....####.....####.....D....#',
      '#..............................#',
      '#....T........o........E.......#',
      '################################',
    ],
    guardPaths: [
      [[8, 5], [8, 6], [13, 6], [13, 5]],
      [[20, 12], [20, 13], [24, 13], [24, 12]],
      [[16, 3], [16, 6], [20, 6], [20, 3]],
    ],
    cameras: [
      { angle: 90, sweep: 60, range: 240 },
      { angle: 180, sweep: 55, range: 230 },
      { angle: 270, sweep: 50, range: 220 },
    ],
  },
  {
    name: 'The Crown Vault',
    briefing: 'The crown jewels. Four guards, four cameras, no second chances.',
    seed: 37,
    pebbles: 4,
    map: [
      '################################',
      '#..L...#....D....#....o....L...#',
      '#......#.........#.......C.....#',
      '#..##......###.......###...##..#',
      '#..............................#',
      '#..G....o.....C......o....G....#',
      '#..............................#',
      '###......#########......###....#',
      '#..............................#',
      '#..o....L....#....D....L...o...#',
      '#...........#..................#',
      '#..####.........####....####...#',
      '#..............................#',
      '#..C.......G.......C......o....#',
      '#..............................#',
      '#....L..####....####....L......#',
      '#..............................#',
      '#..T......o......G......E......#',
      '################################',
    ],
    guardPaths: [
      [[4, 5], [7, 5], [7, 9], [4, 9]],
      [[27, 5], [23, 5], [23, 6], [27, 6]],
      [[12, 13], [12, 17], [15, 17], [15, 13]],
      [[21, 17], [25, 17], [25, 13], [21, 13]],
    ],
    cameras: [
      { angle: 90, sweep: 65, range: 250 },
      { angle: 180, sweep: 55, range: 240 },
      { angle: 0, sweep: 60, range: 240 },
      { angle: 270, sweep: 50, range: 230 },
    ],
  },
];

// Parse one level's map into the pieces the game loop needs: a wall grid, a
// cover grid, the thief start, the exit, and the loot list. Rows are padded
// to COLS with wall and truncated past it, so a stray long row can never
// break the grid; a validation script still checks every row is exact.
export function parseLevel(def) {
  const walls = [];
  const cover = [];
  const loot = [];
  let thiefStart = { x: TILE * 2 + TILE / 2, y: HUD_HEIGHT + TILE * 2 + TILE / 2 };
  let exit = { x: TILE * 28 + TILE / 2, y: HUD_HEIGHT + TILE * 16 + TILE / 2 };
  const guardSpawns = [];
  const cameraMounts = [];
  for (let row = 0; row < ROWS; row++) {
    const raw = def.map[row] || '';
    const line = (raw + '#'.repeat(COLS)).slice(0, COLS);
    walls.push([]);
    cover.push([]);
    for (let col = 0; col < COLS; col++) {
      const ch = line[col];
      const isWall = ch === '#';
      walls[row].push(isWall);
      cover[row].push(ch === 'o');
      const cx = col * TILE + TILE / 2;
      const cy = HUD_HEIGHT + row * TILE + TILE / 2;
      if (ch === 'T') thiefStart = { x: cx, y: cy };
      if (ch === 'E') exit = { x: cx, y: cy };
      if (ch === 'L') loot.push({ x: cx, y: cy, kind: 'coin', taken: false, phase: 0 });
      if (ch === 'D') loot.push({ x: cx, y: cy, kind: 'diamond', taken: false, phase: 0 });
      if (ch === 'G') guardSpawns.push({ x: cx, y: cy });
      if (ch === 'C') cameraMounts.push({ x: cx, y: cy });
    }
  }
  return { walls, cover, loot, thiefStart, exit, guardSpawns, cameraMounts };
}

export function tileAt(walls, cover, px, py) {
  const col = Math.floor(px / TILE);
  const row = Math.floor((py - HUD_HEIGHT) / TILE);
  if (col < 0 || col >= COLS || row < 0 || row >= ROWS) return '#';
  if (walls[row][col]) return '#';
  if (cover[row][col]) return 'o';
  return '.';
}

export function blocksMovement(walls, cover, px, py) {
  return tileAt(walls, cover, px, py) !== '.';
}

export function blocksSight(walls, cover, px, py) {
  return tileAt(walls, cover, px, py) !== '.';
}

// Line of sight between two points, sampled every 6 px: a wall or a crate
// anywhere along the segment hides the thief. Cheap, and fair to read.
export function hasLineOfSight(walls, cover, ax, ay, bx, by) {
  const dx = bx - ax;
  const dy = by - ay;
  const dist = Math.sqrt(dx * dx + dy * dy);
  const steps = Math.max(1, Math.ceil(dist / 6));
  for (let i = 1; i < steps; i++) {
    const t = i / steps;
    if (blocksSight(walls, cover, ax + dx * t, ay + dy * t)) return false;
  }
  return true;
}
