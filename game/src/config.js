// Every tuning number, colour and piece of the room in one place. The playfield is a fixed
// 1280x860 logical area; the renderer scales it to the window, so no rule below depends on
// the screen size. The Meridian Museum after hours: one grand gallery, a red carpet runner
// down the middle, glass cases and statues for cover, and the golden pocket watch
// "The Gilded Hour" on its pedestal at the centre.

export const FIELD = { width: 1280, height: 860 };

/** The simulation's fixed step, in seconds: 60 updates a second whatever the display's rate. */
export const STEP = 1 / 60;

export const WALL = 28;

export const THIEF = {
  radius: 14,
  walk: 215,
  sprint: 330,
  invulnerable: 2,
};

export const LIVES = 3;

export const GUARD = {
  radius: 15,
  patrol: 72,
  investigate: 115,
  chase: 155,
  coneRange: 205,
  /** Half-angle of a guard's vision cone, in radians. */
  coneHalf: 0.55,
  pause: 0.9,
  /** Suspicion per second while the thief is inside a cone with a clear line of sight. */
  suspicionUp: 1.6,
  suspicionDown: 0.8,
  chaseSeconds: 4,
};

export const CAMERA = {
  beamLength: 540,
  /** Half-angle of a camera beam, in radians. */
  beamHalf: 0.14,
  sweep: 0.84,
  sweepSpeed: 0.45,
};

export const ALARM = {
  beamPerSecond: 13,
  conePerSecond: 30,
  chasePerSecond: 8,
  sprintPerSecond: 4,
  decayPerSecond: 4,
  lockdown: 100,
};

export const TOOLS = {
  smokeCharges: 2,
  smokeRadius: 95,
  smokeSeconds: 4.5,
  coinCharges: 3,
  coinThrow: 190,
  coinPingSeconds: 0.9,
  investigateSeconds: 3.5,
};

export const LOOT = { points: 500, grabRadius: 52 };
export const TIME_BONUS = { parSeconds: 240, perSecond: 5 };
export const CALM_BONUS = { perAlarmPoint: 2 };

/** The pedestal at the centre of the hall. Blocks movement, not sight (it is waist-high). */
export const PEDESTAL = { x: 640, y: 360, radius: 34 };

/** The door the thief came in through, bottom centre. The way out once the loot is secured. */
export const EXIT = { x: 600, y: 828, width: 80, height: 32 };

/** The red carpet runner down the middle of the hall: the fast route, and the exposed one. */
export const CARPET = { x: 600, y: 120, width: 80, height: 680 };

/** Cover that blocks both movement and line of sight: glass display cases and marble columns. */
export const COVER_RECTS = [
  { x: 170, y: 300, width: 250, height: 44 }, // west display case
  { x: 860, y: 300, width: 250, height: 44 }, // east display case
  { x: 210, y: 170, width: 34, height: 34 }, // north-west column
  { x: 1036, y: 170, width: 34, height: 34 }, // north-east column
  { x: 210, y: 656, width: 34, height: 34 }, // south-west column
  { x: 1036, y: 656, width: 34, height: 34 }, // south-east column
];

/** Round cover (bronze statues) that blocks movement and line of sight. */
export const COVER_CIRCLES = [
  { x: 300, y: 560, radius: 26 },
  { x: 980, y: 560, radius: 26 },
  { x: 640, y: 640, radius: 26 }, // the centre statue, standing on the carpet
];

/** Guard patrols: each guard walks its waypoints in order, pausing at each one. The routes are
 * drawn clear of the cases, columns and statues, so a patrol never has to push through cover. */
export const GUARD_PATROLS = [
  [
    { x: 140, y: 230 },
    { x: 500, y: 230 },
    { x: 500, y: 540 },
    { x: 140, y: 540 },
  ],
  [
    { x: 780, y: 230 },
    { x: 1140, y: 230 },
    { x: 1140, y: 540 },
    { x: 780, y: 540 },
  ],
  [
    { x: 700, y: 180 },
    { x: 700, y: 560 },
  ],
];

/** Wall cameras on the north wall, sweeping their red beams down across the hall. */
export const CAMERAS = [
  { x: 180, y: 34, base: Math.PI / 2, phase: 0 },
  { x: 640, y: 34, base: Math.PI / 2, phase: 1.9 },
  { x: 1100, y: 34, base: Math.PI / 2, phase: 3.8 },
];

/** Where the thief starts: just inside the door, bottom centre. */
export const START = { x: 640, y: 790 };

export const PALETTE = {
  backdrop: '#0b0d16',
  floor: '#171a2b',
  floorDark: '#12152a',
  slab: '#1e2338',
  gold: '#e8b64c',
  goldBright: '#ffd97a',
  carpet: '#6e1423',
  carpetEdge: '#c9a227',
  marble: '#d8d3c8',
  marbleDark: '#8f8a7d',
  caseGlass: '#1d3a44',
  caseRim: '#7fb3c8',
  statue: '#5a4632',
  statueHi: '#a8875e',
  thief: '#1c2436',
  thiefRim: '#ffd97a',
  guard: '#7a1f2b',
  guardDark: '#4d1220',
  cone: '#ffb43c',
  beam: '#ff2e2e',
  alarmLow: '#58c96b',
  alarmMid: '#e8b64c',
  alarmHigh: '#ff4747',
  panel: '#141828',
  panelEdge: '#3a4060',
  text: '#f2efe6',
  muted: '#9aa0b8',
  exit: '#3ddc78',
  exitLocked: '#8a6d3b',
};

export const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';

/** Where the best score is kept between visits (this browser only). */
export const BEST_KEY = 'gilded-hour.best';
