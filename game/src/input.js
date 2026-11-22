// The Meridian Vault — keyboard and mouse input, held keys plus the
// edge-triggered tool presses the step function consumes in one frame.
export function createInput() {
  return {
    up: false, down: false, left: false, right: false,
    sprint: false,
    useSmoke: false, // true only on the frame E is pressed
    throwCoin: false, // true only on the frame Q is pressed
    confirm: false, // Enter / Space on a menu screen
  };
}

const KEYMAP = {
  ArrowUp: 'up', KeyW: 'up',
  ArrowDown: 'down', KeyS: 'down',
  ArrowLeft: 'left', KeyA: 'left',
  ArrowRight: 'right', KeyD: 'right',
  ShiftLeft: 'sprint', ShiftRight: 'sprint',
  Enter: 'confirm',
};

export function attachInput(input, target) {
  target.addEventListener('keydown', (event) => {
    const name = KEYMAP[event.code];
    if (name) {
      input[name] = true;
      event.preventDefault();
    }
    if (event.code === 'KeyE' && !event.repeat) input.useSmoke = true;
    if (event.code === 'KeyQ' && !event.repeat) input.throwCoin = true;
    if (event.code === 'Space' && !event.repeat) input.confirm = true;
  });
  target.addEventListener('keyup', (event) => {
    const name = KEYMAP[event.code];
    if (name) input[name] = false;
  });
  target.addEventListener('blur', () => {
    input.up = input.down = input.left = input.right = input.sprint = false;
  });
  // Mouse: clicking the canvas confirms on a menu screen, like Enter.
  target.addEventListener('mousedown', () => {
    input.confirm = true;
  });
}

// Clear the one-frame presses after the step has consumed them.
export function clearPresses(input) {
  input.useSmoke = false;
  input.throwCoin = false;
  input.confirm = false;
}
