// The Meridian Vault — configuration: one place for every number the game tunes.
// All sizes are in canvas pixels; the view is a fixed 1280 x 860 top-down gallery.
export const VIEW = { width: 1280, height: 860 };

// Palette: a night museum — deep blue marble, brass, velvet red, gold loot.
export const PALETTE = {
  floor: '#232a38',
  floorTile: '#28303f',
  floorTileDark: '#202634',
  wall: '#141a26',
  wallTop: '#2c3850',
  caseGlass: '#3d5a74',
  caseFrame: '#8a6d3b',
  caseTop: '#54708c',
  statue: '#6b7686',
  rope: '#a33327',
  ropePost: '#c9a227',
  loot: '#ffd75e',
  lootGlow: '#ffedb0',
  pedestal: '#4a4033',
  exit: '#2e7d4f',
  exitGlow: '#7be495',
  player: '#e8e4d8',
  playerCoat: '#1f2430',
  guard: '#c0392b',
  guardUniform: '#7a1f16',
  cone: 'rgba(255, 207, 63, 0.28)',
  coneAlert: 'rgba(255, 84, 48, 0.38)',
  camera: '#b8c4d0',
  beam: 'rgba(255, 90, 90, 0.20)',
  beamAlert: 'rgba(255, 60, 60, 0.32)',
  smoke: 'rgba(200, 205, 215, 0.55)',
  coin: '#ffd75e',
  hud: '#0d1117',
  hudText: '#e8e4d8',
  hudDim: '#9aa5b5',
  alarmLow: '#58b368',
  alarmMid: '#e0a83c',
  alarmHigh: '#e5484d',
};

// Movement and timing, in seconds and pixels.
export const PLAYER = {
  radius: 14,
  walkSpeed: 210,
  sprintSpeed: 315,
  sprintNoise: 120,
};

// A guard walks its waypoints, pauses, turns, and sweeps its cone while it waits.
export const GUARD = {
  radius: 15,
  patrolSpeed: 78,
  chaseSpeed: 165,
  investigateSpeed: 120,
  coneRange: 235,
  coneHalfAngle: 0.52, // ~60 degrees total
  sightRate: 42, // alarm points per second while a guard sees the thief
  touchRadius: 26, // closer than this and the thief is caught
  pauseSeconds: 1.4,
  turnSpeed: 1.9,
};

export const CAMERA = {
  beamRange: 265,
  beamHalfAngle: 0.30,
  sweepSpeed: 0.55, // radians per second
  sightRate: 26, // alarm points per second inside a beam
};

export const ALARM = {
  decayRate: 13, // points per second while unseen
  tripAt: 100,
  tripSeconds: 6, // how long the alarm state lasts once tripped
  afterTrip: 55, // alarm level when the trip ends
  lootGrabBoost: 25, // alarm jump when the sapphire is taken
};

export const TOOLS = {
  smokeCount: 3,
  smokeRadius: 95,
  smokeSeconds: 4.5,
  coinCount: 3,
  coinLureRadius: 260,
  coinInvestigateSeconds: 5,
};

// Fixed-step simulation: the world advances in 1/60 s steps, so a staged
// screenshot is the same frame every time it is taken.
export const STEP = 1 / 60;
