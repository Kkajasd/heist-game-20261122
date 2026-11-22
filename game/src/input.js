// Keyboard + mouse input for The Velvet Vault, one job: turn raw events into
// a small intent object the game loop reads each frame. WASD and arrows move,
// Shift sneaks, E (or right click) throws a pebble, left click sets a move
// target, P pauses, M mutes, R restarts, Enter/Space confirms on menus.
export function createInput(canvas) {
  const keys = new Set();
  const state = {
    up: false,
    down: false,
    left: false,
    right: false,
    sneak: false,
    moveTarget: null,
    throwAt: null,
    confirmPressed: false,
    pausePressed: false,
    mutePressed: false,
    restartPressed: false,
    mouseX: 0,
    mouseY: 0,
  };

  function keyName(event) {
    const k = event.key;
    if (k === 'ArrowUp' || k === 'w' || k === 'W') return 'up';
    if (k === 'ArrowDown' || k === 's' || k === 'S') return 'down';
    if (k === 'ArrowLeft' || k === 'a' || k === 'A') return 'left';
    if (k === 'ArrowRight' || k === 'd' || k === 'D') return 'right';
    return k.toLowerCase();
  }

  function refreshDirections() {
    state.up = keys.has('up');
    state.down = keys.has('down');
    state.left = keys.has('left');
    state.right = keys.has('right');
    state.sneak = keys.has('shift');
  }

  window.addEventListener('keydown', (event) => {
    const name = keyName(event);
    if (['up', 'down', 'left', 'right', ' '].includes(name)) event.preventDefault();
    if (name === 'enter' || name === ' ') state.confirmPressed = true;
    if (name === 'p') state.pausePressed = true;
    if (name === 'm') state.mutePressed = true;
    if (name === 'r') state.restartPressed = true;
    if (name === 'e') state.throwAt = { x: state.mouseX, y: state.mouseY };
    keys.add(name);
    refreshDirections();
  });

  window.addEventListener('keyup', (event) => {
    keys.delete(keyName(event));
    refreshDirections();
  });

  window.addEventListener('blur', () => {
    keys.clear();
    refreshDirections();
  });

  function canvasPoint(event) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: (event.clientX - rect.left) * (canvas.width / rect.width),
      y: (event.clientY - rect.top) * (canvas.height / rect.height),
    };
  }

  canvas.addEventListener('mousemove', (event) => {
    const p = canvasPoint(event);
    state.mouseX = p.x;
    state.mouseY = p.y;
  });

  canvas.addEventListener('mousedown', (event) => {
    const p = canvasPoint(event);
    state.mouseX = p.x;
    state.mouseY = p.y;
    if (event.button === 0) {
      state.moveTarget = p;
      state.confirmPressed = true;
    } else if (event.button === 2) {
      state.throwAt = p;
    }
  });

  canvas.addEventListener('contextmenu', (event) => event.preventDefault());

  return {
    state,
    consumeConfirm() {
      const v = state.confirmPressed;
      state.confirmPressed = false;
      return v;
    },
    consumePause() {
      const v = state.pausePressed;
      state.pausePressed = false;
      return v;
    },
    consumeMute() {
      const v = state.mutePressed;
      state.mutePressed = false;
      return v;
    },
    consumeRestart() {
      const v = state.restartPressed;
      state.restartPressed = false;
      return v;
    },
    consumeThrow() {
      const v = state.throwAt;
      state.throwAt = null;
      return v;
    },
    clearMoveTarget() {
      state.moveTarget = null;
    },
    drain() {
      // Throw away every queued one-shot press: a click made while playing
      // must never auto-confirm the level-clear or game-over screen it leads
      // to. Mode transitions call this so only a fresh press counts there.
      state.confirmPressed = false;
      state.pausePressed = false;
      state.mutePressed = false;
      state.restartPressed = false;
      state.throwAt = null;
    },
  };
}
