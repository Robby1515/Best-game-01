// Emberfall — entry point: wires input, sound, the simulation and the renderer together.
// Screen flow: title → level intro card → play (pause with P) → game over / dawn breaks.
// With ?shot=<name> in the URL it instead stages one deterministic scene (see shots.js),
// renders a single frame and flags window.__emberfallReady for the screenshot tooling.

import { createWorld, EV } from './world.js';
import { createInput } from './input.js';
import { createSound } from './sound.js';
import { createRenderer } from './render.js';
import { stageShot } from './shots.js';
import { STEP } from './config.js';

const canvas = document.getElementById('game');
const renderer = createRenderer(canvas);
const input = createInput(canvas);
const sound = createSound();
const world = createWorld();
world.reset();

const IDLE = { left: false, right: false, jumpPressed: false, jumpHeld: false };
let mode = 'title';
let paused = false;
let introT = 0;
let jumpQueued = false;
let best = 0;
try { best = Number(window.localStorage.getItem('emberfall-best') || 0) || 0; } catch { best = 0; }

function saveBest() {
  if (world.state.score > best) {
    best = world.state.score;
    try { window.localStorage.setItem('emberfall-best', String(best)); } catch { /* private mode */ }
  }
}

function startGame() {
  sound.unlock();
  sound.click();
  world.reset();
  mode = 'intro';
  introT = 0;
  paused = false;
}

/** Sound and screen changes for one simulation step's events. */
function handleEvents(ev) {
  const s = world.state;
  if (ev & EV.shard) sound.shard(s.shardsTaken);
  if (ev & EV.ignite) sound.ignite();
  if (ev & EV.hurt) sound.hurt();
  if (ev & EV.jump) sound.jump();
  if (ev & EV.land) sound.land();
  if (ev & EV.win) {
    sound.win();
    saveBest();
    mode = 'win';
  } else if (ev & EV.clear) {
    sound.clear();
    saveBest();
    world.loadLevel(s.levelIndex + 1);
    mode = 'intro';
    introT = 0;
  } else if (ev & EV.over) {
    sound.over();
    saveBest();
    mode = 'over';
  }
}

function stepOnce(keys) {
  if (mode === 'play') {
    if (paused) return;
    const ev = world.step(STEP, {
      left: keys.left,
      right: keys.right,
      jumpHeld: keys.jumpHeld,
      jumpPressed: jumpQueued,
    });
    jumpQueued = false;
    handleEvents(ev);
  } else if (mode === 'intro') {
    introT += STEP;
    world.step(STEP, IDLE);
    if (introT >= 1.7) mode = 'play';
  } else {
    // Title, game over and victory screens idle the world so the valley stays alive.
    world.step(STEP, IDLE);
  }
}

const params = new URLSearchParams(window.location.search);
const shotName = params.get('shot');
if (shotName) {
  mode = stageShot(world, shotName);
  // A staged run's own score is its best: an end scene shows the score it actually reached.
  const stagedBest = mode === 'over' || mode === 'win' ? world.state.score : 0;
  renderer.draw({ world, mode, paused: false, introT: 0, best: stagedBest, muted: false });
  window.__emberfallReady = true;
} else {
  let last = performance.now();
  let acc = 0;
  const frame = (now) => {
    requestAnimationFrame(frame);
    let dt = (now - last) / 1000;
    last = now;
    if (dt > 0.25) dt = 0.25;
    const keys = input.read();
    if (keys.mute) sound.toggleMute();
    if (keys.confirm || keys.jumpPressed) sound.unlock();
    if (keys.jumpPressed) jumpQueued = true;

    if (mode === 'title' && keys.confirm) startGame();
    else if (mode === 'intro' && keys.confirm) { mode = 'play'; sound.click(); }
    else if ((mode === 'over' || mode === 'win') && keys.confirm) startGame();
    else if (mode === 'play' && keys.pause) paused = !paused;
    else if (mode === 'play' && keys.restart) startGame();

    acc += dt;
    let steps = 0;
    while (acc >= STEP && steps < 40) {
      stepOnce(keys);
      acc -= STEP;
      steps += 1;
    }
    renderer.draw({ world, mode, paused, introT, best, muted: sound.muted });
  };
  requestAnimationFrame(frame);
}
