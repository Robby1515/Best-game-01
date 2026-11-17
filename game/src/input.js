// Emberfall — keyboard and mouse input: held keys for movement, one-shot presses for the rest.
// main.js calls read() once per frame; presses are edges (true for one read only).

const KEYMAP = {
  ArrowLeft: 'left', KeyA: 'left',
  ArrowRight: 'right', KeyD: 'right',
  ArrowUp: 'jump', KeyW: 'jump', Space: 'jump',
  Enter: 'confirm',
  KeyP: 'pause', Escape: 'pause',
  KeyM: 'mute',
  KeyR: 'restart',
};

export function createInput(canvas) {
  const held = new Set();
  const pressed = new Set();
  let clicked = false;

  window.addEventListener('keydown', (e) => {
    const action = KEYMAP[e.code];
    if (!action) return;
    if (action === 'left' || action === 'right' || action === 'jump') e.preventDefault();
    if (!e.repeat) pressed.add(action);
    held.add(action);
  });
  window.addEventListener('keyup', (e) => {
    const action = KEYMAP[e.code];
    if (action) held.delete(action);
  });
  window.addEventListener('blur', () => { held.clear(); });
  canvas.addEventListener('pointerdown', () => { clicked = true; pressed.add('confirm'); });

  /** The current input state; jumpPressed/confirm/pause/mute/restart fire once per press. */
  function read() {
    const out = {
      left: held.has('left'),
      right: held.has('right'),
      jumpHeld: held.has('jump'),
      jumpPressed: pressed.has('jump'),
      confirm: pressed.has('confirm') || clicked,
      pause: pressed.has('pause'),
      mute: pressed.has('mute'),
      restart: pressed.has('restart'),
    };
    pressed.clear();
    clicked = false;
    return out;
  }

  return { read };
}
