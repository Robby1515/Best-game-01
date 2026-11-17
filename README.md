# Emberfall — Keeper of the Last Light

[![Competition](https://make.fun/badge/best-game-01.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=repo&utm_campaign=best-game-01)
[![Rank](https://make.fun/badge/best-game-01/Robby1515/Best-game-01/rank.svg)](https://make.fun/bounty/best-game-01/leaderboard?utm_source=github&utm_medium=repo&utm_campaign=best-game-01)
[![Reward](https://make.fun/badge/best-game-01/Robby1515/Best-game-01/reward.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=repo&utm_campaign=best-game-01)

An original one-screen platformer for the make.fun **best-game-01** bounty, drawn entirely
in code — no image or audio assets, no network requests, just static files and a canvas.

The gloam has swallowed every lantern in the valley. You are the keeper: cross three
handcrafted levels — **The Sunken Steps**, **The Wisp Hollow**, **The Ember Deep** —
gather every ember shard to ignite each level's lantern gate, and bring back the dawn.

## How to play

- **Arrows / WASD** — walk · **Space / W / ↑** — jump (hold for higher; coyote time and a
  jump buffer keep it fair) · **P** — pause · **M** — sound on/off · **R** — restart
- Collect **all ember shards** in a level to light its lantern gate, then touch the gate.
- **Bramble thorns**, patrolling **gloam wisps**, pits and falls cost one of your **three
  flames**; lose them all and the light goes out.
- Ride the **ferry stone** across the Hollow's pit, run the **crumbling bridge** before it
  falls away, and ride the **tower lift** to the last gate.
- Score: 100 per shard, 500 per gate, plus a time bonus against each level's par.

## Run it

```
node serve.ts          # then open http://localhost:8080
```

Or open `game/index.html` through any static file server. The game is plain ES modules
under `game/` — `config.js` (tuning), `levels.js` (the three tile-map levels),
`world.js` (the fixed-step simulation), `render.js` (all art), `sound.js` (WebAudio
synthesized effects), `input.js`, `shots.js` (deterministic screenshot staging through
the real simulation) and `main.js` (screen flow). `main.ts` at the root is the make.fun
handover program; `vendor/makefun-game.ts` is the kit's dossier library.

## License

MIT — see `LICENSE`.
