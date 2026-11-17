// Emberfall — screenshot staging: deterministic scenes for the entry's screenshots.
// Each scene runs the REAL simulation from a fresh world with scripted inputs (the same
// input tapes that prove the levels completable), so a screenshot is a true frame of play,
// never a mock-up. main.js enters this path when the page is opened with ?shot=<name>.

import { STEP } from './config.js';

const IDLE = { left: false, right: false, jumpPressed: false, jumpHeld: false };

/**
 * A tape runner: segments are [seconds, keys] or a wait — '@' until grounded, '>n'/'<n'
 * until the keeper's x passes n, '~' until the ferry is boardable, '~far' until the ride
 * arrives, '~m' until the lift descends into its boarding band, '~top' until it tops out.
 * Keys are l/r/j; a segment starting with j presses jump on its first step.
 */
function runTape(world, tape, maxSeconds = 60) {
  const p = () => world.state.player;
  const moverBoardable = () => world.state.movers.some((m) => m.dir > 0 && (m.x - (p().x + p().w)) >= 55 && (m.x - (p().x + p().w)) <= 95);
  const moverFar = () => world.state.movers.some((m) => p().groundMover === m && m.x >= m.max - 25);
  const liftInBand = () => world.state.movers.some((m) => m.axis === 'y' && m.dir > 0 && m.y >= 238 && m.y <= 264);
  const liftAtTop = () => world.state.movers.some((m) => m.axis === 'y' && p().groundMover === m && m.y <= m.min + 16);
  const posDone = (spec) => (spec[0] === '>' ? p().x >= Number(spec.slice(1)) : p().x <= Number(spec.slice(1)));
  const done = (spec, t) => {
    if (typeof spec === 'number') return t >= spec;
    if (spec === '@') return (t > 0.03 && p().onGround) || t > 3;
    if (spec === '~') return (t > 0.03 && moverBoardable()) || t > 8;
    if (spec === '~far') return (t > 0.03 && moverFar()) || t > 8;
    if (spec === '~m') return (t > 0.03 && liftInBand()) || t > 10;
    if (spec === '~top') return (t > 0.03 && liftAtTop()) || t > 10;
    return (t > 0.03 && posDone(spec)) || t > 6;
  };
  let seg = 0;
  let segTime = 0;
  let changed = true;
  const total = Math.floor(maxSeconds / STEP);
  for (let i = 0; i < total; i += 1) {
    while (seg < tape.length && done(tape[seg][0], segTime)) { seg += 1; segTime = 0; changed = true; }
    if (seg >= tape.length) break;
    const keys = tape[seg][1];
    world.step(STEP, {
      left: keys.includes('l'),
      right: keys.includes('r'),
      jumpPressed: keys.includes('j') && changed,
      jumpHeld: keys.includes('j'),
    });
    changed = false;
    segTime += STEP;
    if (world.state.over || world.state.won) break;
  }
}

function idle(world, seconds) {
  const n = Math.floor(seconds / STEP);
  for (let i = 0; i < n; i += 1) world.step(STEP, IDLE);
}

// The opening of the level-2 route: onto the ferry, across the pit, up to the high ledges.
const PLAY_TAPE = [
  [0.62, 'rj'], ['@', 'r'], ['>290', 'r'], ['~', ''], [0.62, 'rj'], ['@', ''],
  ['~far', ''], [0.4, 'r'], ['@', 'r'], ['<512', 'l'], [0.62, 'rj'], ['@', 'r'],
];

// The level-3 climb, ending on the lift as it rises beside the tower.
const DEEP_TAPE = [
  [0.35, 'r'], ['>150', 'r'], [0.3, 'rj'], ['@', 'r'], ['>425', 'r'],
  [0.12, ''], ['>435', 'r'], [0.15, ''], [0.3, 'rj'], [0.35, 'r'], ['@', 'r'],
  ['~m', ''], ['<525', 'l'], [0.28, 'rj'], [0.35, 'r'], ['@', 'r'], ['>655', 'r'],
  [0.3, 'rj'], [0.3, 'r'], ['@', ''], [0.3, 'r'], ['@', ''],
];

/** Stage a named scene in a fresh world; returns the screen mode to render. */
export function stageShot(world, name) {
  world.reset();
  if (name === 'play') {
    world.loadLevel(1);
    runTape(world, PLAY_TAPE, 40);
    idle(world, 0.25);
    return 'play';
  }
  if (name === 'deep') {
    world.loadLevel(2);
    runTape(world, DEEP_TAPE, 60);
    // Freeze mid-ride: step until the lift has climbed part-way up the tower.
    for (let i = 0; i < 400 && !(world.state.player.groundMover && world.state.movers[0].y <= 318); i += 1) {
      world.step(STEP, IDLE);
    }
    return 'play';
  }
  if (name === 'end') {
    // One shard banked, then a careless keeper walks into the pit three times.
    runTape(world, [[0.62, 'rj'], ['@', 'l'], ['<60', 'l'], [12, 'r']], 30);
    return 'over';
  }
  idle(world, 1.2);
  return 'title';
}
