// Emberfall — the simulation: keeper physics, tiles, wisps, movers, shards and the gate.
// Pure logic with no drawing and no DOM: main.js feeds it inputs and renders what it holds,
// and the screenshot staging in shots.js drives it with scripted inputs through the same step.

import { COLS, ROWS, TILE, PHYS, KEEPER, SCORE, CRUMBLE, HURT_GRACE } from './config.js';
import { LEVELS } from './levels.js';

/** Events a step can raise, as a bitmask main.js turns into sound and screen changes. */
export const EV = {
  jump: 1,
  land: 2,
  shard: 4,
  hurt: 8,
  ignite: 16,
  clear: 32,
  over: 64,
  win: 128,
};

const SOLID = new Set(['#', '=', '~']);

/** A small seeded random source, so staged scenes and particles are reproducible. */
export function seededRandom(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);

export function createWorld() {
  const state = {
    levelIndex: 0,
    score: 0,
    lives: 3,
    levelTime: 0,
    totalTime: 0,
    shardsTaken: 0,
    shardsTotal: 0,
    over: false,
    won: false,
    cleared: false,
    player: null,
    shards: [],
    wisps: [],
    movers: [],
    gate: null,
    spawn: { x: 0, y: 0 },
    crumbles: new Map(),
    particles: [],
    time: 0,
  };
  let grid = [];
  let rng = seededRandom(1);

  const crumbleKey = (c, r) => `${c},${r}`;

  function tileAt(c, r) {
    if (c < 0 || c >= COLS) return '#';
    if (r < 0 || r >= ROWS) return '.';
    return grid[r][c];
  }

  function isSolid(c, r) {
    const ch = tileAt(c, r);
    if (!SOLID.has(ch)) return false;
    if (ch === '~') {
      const cr = state.crumbles.get(crumbleKey(c, r));
      if (cr && cr.phase === 'gone') return false;
    }
    return true;
  }

  function loadLevel(index) {
    const level = LEVELS[index];
    state.levelIndex = index;
    state.levelTime = 0;
    state.cleared = false;
    grid = level.map.map((row) => row.split(''));
    state.shards = [];
    state.crumbles = new Map();
    state.gate = null;
    for (let r = 0; r < ROWS; r += 1) {
      for (let c = 0; c < COLS; c += 1) {
        const ch = grid[r][c];
        if (ch === '*') state.shards.push({ x: c * TILE + TILE / 2, y: r * TILE + TILE / 2, taken: false, phase: rng() * 6.28 });
        if (ch === '~') state.crumbles.set(crumbleKey(c, r), { phase: 'idle', timer: 0 });
        if (ch === 'P') state.spawn = { x: c * TILE + (TILE - KEEPER.width) / 2, y: (r + 1) * TILE - KEEPER.height };
        if (ch === 'L') state.gate = { x: c * TILE + 3, y: (r + 1) * TILE, w: TILE - 6, h: 64, lit: false };
      }
    }
    state.shardsTotal = state.shards.length;
    state.shardsTaken = 0;
    state.wisps = level.wisps.map((w) => ({ ...w, dir: 1, phase: rng() * 6.28 }));
    state.movers = level.movers.map((m) => ({ ...m, dir: 1, dx: 0, dy: 0 }));
    state.particles = [];
    respawn();
  }

  function reset() {
    state.score = 0;
    state.lives = 3;
    state.totalTime = 0;
    state.over = false;
    state.won = false;
    rng = seededRandom(20240);
    loadLevel(0);
  }

  function respawn() {
    state.player = {
      x: state.spawn.x, y: state.spawn.y,
      w: KEEPER.width, h: KEEPER.height,
      vx: 0, vy: 0, face: 1,
      onGround: false, coyote: 0, jumpBuffer: 0, jumpHeld: false,
      groundTile: null, groundMover: null, grace: HURT_GRACE, squash: 0,
    };
  }

  function burst(x, y, n, color, speed) {
    for (let i = 0; i < n; i += 1) {
      const a = rng() * Math.PI * 2;
      const s = speed * (0.3 + rng() * 0.7);
      state.particles.push({
        x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 40,
        life: 0.5 + rng() * 0.5, age: 0, size: 1.5 + rng() * 2.2, color,
      });
    }
  }

  function hurt(events) {
    const p = state.player;
    if (p.grace > 0 || state.cleared) return events;
    state.lives -= 1;
    burst(p.x + p.w / 2, p.y + p.h / 2, 14, '#bfe6ff', 160);
    events |= EV.hurt;
    if (state.lives <= 0) {
      state.over = true;
      events |= EV.over;
    } else {
      respawn();
    }
    return events;
  }

  /**
   * Falling out of the world always puts the keeper back at the spawn — even inside the
   * hurt grace, when it costs no second life: without this the fall would never end.
   */
  function fallOut(events) {
    const p = state.player;
    if (state.cleared) return events;
    if (p.grace <= 0) {
      state.lives -= 1;
      events |= EV.hurt;
      if (state.lives <= 0) {
        state.over = true;
        events |= EV.over;
        return events;
      }
    }
    respawn();
    return events;
  }

  function moveAxis(p, axis, amount, solids) {
    if (axis === 'x') p.x += amount; else p.y += amount;
    const c0 = Math.floor(p.x / TILE), c1 = Math.floor((p.x + p.w - 0.01) / TILE);
    const r0 = Math.floor(p.y / TILE), r1 = Math.floor((p.y + p.h - 0.01) / TILE);
    for (let r = r0; r <= r1; r += 1) {
      for (let c = c0; c <= c1; c += 1) {
        if (!isSolid(c, r)) continue;
        if (axis === 'x') {
          p.x = amount > 0 ? Math.min(p.x, c * TILE - p.w) : Math.max(p.x, (c + 1) * TILE);
          p.vx = 0;
        } else if (amount > 0) {
          p.y = Math.min(p.y, r * TILE - p.h);
          p.vy = 0; p.onGround = true; p.groundTile = { c, r }; p.groundMover = null;
        } else {
          p.y = Math.max(p.y, (r + 1) * TILE);
          p.vy = 0;
        }
      }
    }
    for (const m of solids) {
      const overlap = p.x < m.x + m.w && p.x + p.w > m.x && p.y < m.y + m.h && p.y + p.h > m.y;
      if (!overlap) continue;
      if (axis === 'x') {
        p.x = amount > 0 ? Math.min(p.x, m.x - p.w) : Math.max(p.x, m.x + m.w);
        p.vx = 0;
      } else if (amount > 0) {
        p.y = Math.min(p.y, m.y - p.h);
        p.vy = 0; p.onGround = true; p.groundTile = null; p.groundMover = m;
      } else {
        p.y = Math.max(p.y, m.y + m.h);
        p.vy = 0;
      }
    }
    return p;
  }

  /** Advance the whole world by dt seconds under `input` ({left, right, jumpPressed, jumpHeld}). */
  function step(dt, input) {
    let events = 0;
    const p = state.player;
    state.time += dt;
    if (!state.over && !state.won && !state.cleared) {
      state.levelTime += dt;
      state.totalTime += dt;
    }

    // Movers travel first; a keeper standing on one is carried along.
    for (const m of state.movers) {
      const pos = m.axis === 'x' ? m.x : m.y;
      let next = pos + m.dir * m.speed * dt;
      if (next > m.max) { next = m.max; m.dir = -1; }
      if (next < m.min) { next = m.min; m.dir = 1; }
      m.dx = m.axis === 'x' ? next - m.x : 0;
      m.dy = m.axis === 'y' ? next - m.y : 0;
      if (m.axis === 'x') m.x = next; else m.y = next;
      if (p.groundMover === m) { p.x += m.dx; p.y += m.dy; }
    }

    // Wisps patrol their lane, bobbing as they go.
    for (const w of state.wisps) {
      w.x += w.dir * w.speed * dt;
      if (w.x > w.maxX) { w.x = w.maxX; w.dir = -1; }
      if (w.x < w.minX) { w.x = w.minX; w.dir = 1; }
      w.phase += dt * 3;
    }

    // Crumbling tiles age: stood on, they shake, fall away, then grow back.
    for (const [key, cr] of state.crumbles) {
      const [c, r] = key.split(',').map(Number);
      const stoodOn = p.groundTile && p.groundTile.c === c && p.groundTile.r === r && p.onGround;
      if (cr.phase === 'idle' && stoodOn) { cr.phase = 'shaking'; cr.timer = CRUMBLE.shakeSeconds; }
      else if (cr.phase === 'shaking') {
        cr.timer -= dt;
        if (cr.timer <= 0) { cr.phase = 'gone'; cr.timer = CRUMBLE.goneSeconds; }
      } else if (cr.phase === 'gone') {
        cr.timer -= dt;
        if (cr.timer <= 0) cr.phase = 'idle';
      }
    }

    if (!state.over && !state.won && !state.cleared) {
      // Horizontal run with ground/air acceleration.
      const want = (input.right ? 1 : 0) - (input.left ? 1 : 0);
      const accel = p.onGround ? PHYS.groundAccel : PHYS.airAccel;
      if (want !== 0) {
        p.vx = clamp(p.vx + want * accel * dt, -PHYS.runSpeed, PHYS.runSpeed);
        p.face = want;
      } else {
        const drag = p.onGround ? 2400 : 120;
        p.vx = Math.abs(p.vx) <= drag * dt ? 0 : p.vx - Math.sign(p.vx) * drag * dt;
      }

      // Jumping: a buffered press and a coyote window make it feel fair.
      if (input.jumpPressed) p.jumpBuffer = PHYS.jumpBuffer; else p.jumpBuffer = Math.max(0, p.jumpBuffer - dt);
      if (p.onGround) p.coyote = PHYS.coyote; else p.coyote = Math.max(0, p.coyote - dt);
      if (p.jumpBuffer > 0 && p.coyote > 0) {
        p.vy = -PHYS.jumpSpeed;
        p.jumpBuffer = 0; p.coyote = 0; p.onGround = false;
        p.squash = -0.25;
        events |= EV.jump;
      }
      // Rising without the jump held falls faster: a tapped jump stays low, a held one soars.
      const gravityNow = p.vy < 0 && !input.jumpHeld ? PHYS.gravity * 2.1 : PHYS.gravity;
      p.vy = Math.min(p.vy + gravityNow * dt, PHYS.maxFall);

      const wasGround = p.onGround;
      const fallSpeed = p.vy;
      p.onGround = false; p.groundTile = null; p.groundMover = null;
      moveAxis(p, 'x', p.vx * dt, state.movers);
      moveAxis(p, 'y', p.vy * dt, state.movers);
      if (p.onGround && !wasGround) {
        p.squash = clamp(fallSpeed / 2400, 0.08, 0.3);
        events |= EV.land;
        burst(p.x + p.w / 2, p.y + p.h, 5, '#8a94b8', 60);
      }
      p.squash *= Math.pow(0.0015, dt); // relax back to shape quickly
      if (p.grace > 0) p.grace -= dt;

      // Ember shards: an expanded reach makes near misses still count.
      for (const s of state.shards) {
        if (s.taken) continue;
        if (p.x - 10 < s.x + 9 && p.x + p.w + 10 > s.x - 9 && p.y - 10 < s.y + 9 && p.y + p.h + 10 > s.y - 9) {
          s.taken = true;
          state.shardsTaken += 1;
          state.score += SCORE.shard;
          burst(s.x, s.y, 10, '#ffb340', 120);
          events |= EV.shard;
          if (state.shardsTaken === state.shardsTotal && state.gate && !state.gate.lit) {
            state.gate.lit = true;
            burst(state.gate.x + state.gate.w / 2, state.gate.y - 40, 18, '#ffb340', 150);
            events |= EV.ignite;
          }
        }
      }

      // Thorns: only the lower, sharp part of the tile bites.
      const c0 = Math.floor(p.x / TILE), c1 = Math.floor((p.x + p.w - 0.01) / TILE);
      const r0 = Math.floor(p.y / TILE), r1 = Math.floor((p.y + p.h - 0.01) / TILE);
      outer: for (let r = r0; r <= r1; r += 1) {
        for (let c = c0; c <= c1; c += 1) {
          if (tileAt(c, r) !== '^') continue;
          const tx = c * TILE + 6, ty = r * TILE + 15;
          if (p.x < tx + TILE - 12 && p.x + p.w > tx && p.y < ty + 15 && p.y + p.h > ty) { events = hurt(events); break outer; }
        }
      }

      // Wisps: a cold touch costs a flame.
      for (const w of state.wisps) {
        const dx = Math.max(p.x - w.x, 0, w.x - (p.x + p.w));
        const dy = Math.max(p.y - w.y, 0, w.y - (p.y + p.h));
        if (dx * dx + dy * dy < 13 * 13) events = hurt(events);
      }

      // Falling out of the world costs a flame too.
      if (p.y > ROWS * TILE + 30) events = fallOut(events);

      // The lit gate ends the level (read the player fresh: a hurt may have respawned it).
      const g = state.gate;
      const pl = state.player;
      if (!state.over && g && g.lit && pl.x < g.x + g.w && pl.x + pl.w > g.x && pl.y < g.y && pl.y + pl.h > g.y - g.h) {
        const bonus = Math.max(0, Math.floor(LEVELS[state.levelIndex].parSeconds - state.levelTime)) * SCORE.bonusPerSecond;
        state.score += SCORE.clear + bonus;
        events |= EV.clear;
        if (state.levelIndex === LEVELS.length - 1) {
          state.won = true;
          events |= EV.win;
        } else {
          state.cleared = true;
        }
      }
    }

    // Particles drift and fade whatever the state of play.
    for (const pt of state.particles) {
      pt.age += dt;
      pt.x += pt.vx * dt; pt.y += pt.vy * dt;
      pt.vy -= 30 * dt;
    }
    state.particles = state.particles.filter((pt) => pt.age < pt.life);
    return events;
  }

  return { state, reset, loadLevel, step, tileAt };
}
