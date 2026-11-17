// Emberfall — shared tuning constants: the field, the physics and the palette.
// Every other module reads its numbers from here so the game can be re-tuned in one place.

/** The canvas is one screen: the whole of a level is always visible, no camera. */
export const VIEW = { width: 960, height: 540 };

/** Levels are tile maps, TILE pixels a cell, COLS by ROWS cells. */
export const TILE = 30;
export const COLS = 32;
export const ROWS = 18;

/** The simulation advances in fixed steps of STEP seconds; rendering fills the gaps. */
export const STEP = 1 / 120;

/** Keeper physics, in pixels and seconds. The jump clears a rise of four tiles. */
export const PHYS = {
  gravity: 2100,
  runSpeed: 215,
  groundAccel: 2600,
  airAccel: 1700,
  jumpSpeed: 735,
  jumpCut: 0.42, // releasing jump early keeps this share of the upward speed
  coyote: 0.08, // grace time to jump after walking off an edge
  jumpBuffer: 0.11, // a jump pressed just before landing still fires
  maxFall: 920,
};

/** The keeper's body: a hooded figure a little under a tile wide and tall. */
export const KEEPER = { width: 22, height: 28 };

/** Scoring: a shard is worth SHARD, clearing a level CLEAR plus a time bonus. */
export const SCORE = { shard: 100, clear: 500, bonusPerSecond: 10 };

/** A crumbling tile's life once stood on: it shakes, falls, then grows back. */
export const CRUMBLE = { shakeSeconds: 0.55, goneSeconds: 2.6 };

/** How long the keeper is untouchable after a hurt, in seconds. */
export const HURT_GRACE = 1.6;

/**
 * The night palette. Deep indigo dark, warm amber light: everything dangerous is
 * pale or thorny, everything precious glows amber.
 */
export const PALETTE = {
  skyTop: '#0a0e24',
  skyBottom: '#1c2450',
  hillFar: '#131b3d',
  hillNear: '#1a2450',
  moon: '#e8e4c8',
  stone: '#2e3759',
  stoneTop: '#4a5890',
  stoneDark: '#232b47',
  wood: '#6e4a2f',
  woodTop: '#96683f',
  crumble: '#5a648f',
  thorn: '#0d1017',
  thornTip: '#9fb4d8',
  amber: '#ffb340',
  amberHot: '#ffe9a8',
  flame: '#ff8a3c',
  wisp: '#bfe6ff',
  wispCore: '#eaf7ff',
  cloak: '#b3402a',
  cloakDark: '#8c2f1f',
  scarf: '#f2d38a',
  skin: '#f0c8a0',
  ink: '#0a0c16',
  parchment: '#f4ead2',
};
