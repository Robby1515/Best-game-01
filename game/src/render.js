// Emberfall — all drawing: a night valley in indigo and amber, drawn entirely in code.
// The renderer reads the world and a scene ({mode, paused, introT, best, muted}); it never
// changes the simulation, so the staged screenshots in shots.js are honest renders of play.

import { VIEW, TILE, COLS, ROWS, PALETTE as C } from './config.js';
import { LEVELS } from './levels.js';

const DISPLAY = 'Georgia, "Times New Roman", serif';
const BODY = 'system-ui, -apple-system, "Segoe UI", sans-serif';

/** Deterministic 0..1 hash of three integers, for stars, tile shades and motes. */
function hash(a, b, c) {
  const h = Math.sin(a * 127.1 + b * 311.7 + c * 74.7) * 43758.5453;
  return h - Math.floor(h);
}

export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');
  const W = VIEW.width;
  const H = VIEW.height;

  function text(str, x, y, { font = BODY, size = 14, color = C.parchment, align = 'center', alpha = 1, spacing = 0, weight = 'normal' } = {}) {
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.font = `${weight} ${size}px ${font}`;
    ctx.textAlign = align;
    ctx.textBaseline = 'middle';
    try { ctx.letterSpacing = `${spacing}px`; } catch { /* older engines: no letterspacing */ }
    ctx.fillStyle = color;
    ctx.fillText(str, x, y);
    ctx.restore();
  }

  function drawSky(t) {
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, C.skyTop);
    g.addColorStop(1, C.skyBottom);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    // Stars: seeded points that twinkle slowly.
    for (let i = 0; i < 110; i += 1) {
      const x = hash(i, 1, 7) * W;
      const y = hash(i, 2, 7) * H * 0.62;
      const tw = 0.35 + 0.65 * Math.abs(Math.sin(t * (0.4 + hash(i, 3, 7)) + i));
      ctx.globalAlpha = tw * (0.35 + hash(i, 4, 7) * 0.6);
      ctx.fillStyle = '#dfe8ff';
      const r = hash(i, 5, 7) < 0.12 ? 1.8 : 1.1;
      ctx.fillRect(x, y, r, r);
    }
    ctx.globalAlpha = 1;
    // The moon and its halo.
    const halo = ctx.createRadialGradient(848, 70, 8, 848, 70, 90);
    halo.addColorStop(0, 'rgba(232,228,200,0.35)');
    halo.addColorStop(1, 'rgba(232,228,200,0)');
    ctx.fillStyle = halo;
    ctx.fillRect(758, -20, 180, 180);
    ctx.fillStyle = C.moon;
    ctx.beginPath(); ctx.arc(848, 70, 25, 0, 6.29); ctx.fill();
    ctx.fillStyle = 'rgba(160,155,125,0.5)';
    ctx.beginPath(); ctx.arc(839, 63, 5, 0, 6.29); ctx.fill();
    ctx.beginPath(); ctx.arc(856, 79, 3.6, 0, 6.29); ctx.fill();
  }

  function ridge(baseY, amp, color, seed, drift) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(0, H);
    for (let x = 0; x <= W; x += 16) {
      const y = baseY + Math.sin(x * 0.006 + seed + drift) * amp + Math.sin(x * 0.017 + seed * 2) * amp * 0.4;
      ctx.lineTo(x, y);
    }
    ctx.lineTo(W, H);
    ctx.closePath();
    ctx.fill();
  }

  function drawTiles(world) {
    const lvl = world.state.levelIndex;
    for (let r = 0; r < ROWS; r += 1) {
      for (let c = 0; c < COLS; c += 1) {
        const ch = world.tileAt(c, r);
        const x = c * TILE;
        const y = r * TILE;
        if (ch === '#') {
          const v = hash(c, r, lvl);
          ctx.fillStyle = v < 0.33 ? C.stoneDark : v < 0.72 ? C.stone : '#35406a';
          ctx.fillRect(x, y, TILE, TILE);
          if (world.tileAt(c, r - 1) !== '#') { ctx.fillStyle = C.stoneTop; ctx.fillRect(x, y, TILE, 4); }
          if (v > 0.8) { ctx.fillStyle = 'rgba(10,13,26,0.35)'; ctx.fillRect(x + 6 + v * 12, y + 14, 7, 2); }
        } else if (ch === '=') {
          ctx.fillStyle = C.wood;
          ctx.fillRect(x, y + 3, TILE, TILE - 6);
          ctx.fillStyle = C.woodTop;
          ctx.fillRect(x, y + 3, TILE, 4);
          ctx.fillStyle = 'rgba(30,18,8,0.6)';
          ctx.fillRect(x + 5, y + 17, TILE - 10, 2);
          ctx.beginPath(); ctx.arc(x + 6, y + 10, 1.4, 0, 6.29); ctx.arc(x + TILE - 6, y + 10, 1.4, 0, 6.29); ctx.fill();
        } else if (ch === '~') {
          const cr = world.state.crumbles.get(`${c},${r}`);
          if (cr && cr.phase === 'gone') continue;
          const shake = cr && cr.phase === 'shaking' ? Math.sin(world.state.time * 70 + c) * 1.6 : 0;
          ctx.save();
          ctx.translate(shake, 0);
          ctx.fillStyle = C.crumble;
          ctx.fillRect(x, y, TILE, TILE);
          ctx.fillStyle = C.stoneTop;
          ctx.fillRect(x, y, TILE, 4);
          ctx.strokeStyle = 'rgba(10,13,26,0.55)';
          ctx.lineWidth = 1.4;
          ctx.beginPath();
          ctx.moveTo(x + 7, y + 6); ctx.lineTo(x + 13, y + 16); ctx.lineTo(x + 10, y + 26);
          ctx.moveTo(x + 21, y + 4); ctx.lineTo(x + 18, y + 14);
          ctx.stroke();
          ctx.restore();
        } else if (ch === '^') {
          ctx.fillStyle = C.thorn;
          for (let i = 0; i < 3; i += 1) {
            const bx = x + 2 + i * 9;
            ctx.beginPath();
            ctx.moveTo(bx, y + TILE);
            ctx.lineTo(bx + 4.5, y + 6);
            ctx.lineTo(bx + 9, y + TILE);
            ctx.closePath();
            ctx.fill();
          }
          ctx.fillStyle = C.thornTip;
          ctx.beginPath();
          ctx.moveTo(x + 5.2, y + 10); ctx.lineTo(x + 6.5, y + 6); ctx.lineTo(x + 7.8, y + 10); ctx.closePath(); ctx.fill();
          ctx.beginPath();
          ctx.moveTo(x + 14.2, y + 10); ctx.lineTo(x + 15.5, y + 6); ctx.lineTo(x + 16.8, y + 10); ctx.closePath(); ctx.fill();
          ctx.beginPath();
          ctx.moveTo(x + 23.2, y + 10); ctx.lineTo(x + 24.5, y + 6); ctx.lineTo(x + 25.8, y + 10); ctx.closePath(); ctx.fill();
        }
      }
    }
  }

  function drawMovers(world) {
    for (const m of world.state.movers) {
      ctx.strokeStyle = 'rgba(160,175,220,0.18)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      if (m.axis === 'x') { ctx.moveTo(m.min, m.y + m.h / 2); ctx.lineTo(m.max + m.w, m.y + m.h / 2); }
      else { ctx.moveTo(m.x + m.w / 2, m.min); ctx.lineTo(m.x + m.w / 2, m.max + m.h); }
      ctx.stroke();
      ctx.fillStyle = '#3d4a78';
      ctx.beginPath(); ctx.roundRect(m.x, m.y, m.w, m.h, 4); ctx.fill();
      ctx.fillStyle = '#5a6ca6';
      ctx.fillRect(m.x, m.y, m.w, 4);
      ctx.fillStyle = 'rgba(12,16,30,0.7)';
      ctx.beginPath(); ctx.arc(m.x + 9, m.y + m.h / 2 + 1, 2, 0, 6.29); ctx.arc(m.x + m.w - 9, m.y + m.h / 2 + 1, 2, 0, 6.29); ctx.fill();
    }
  }

  function drawGate(world, t) {
    const g = world.state.gate;
    if (!g) return;
    const cx = g.x + g.w / 2;
    const top = g.y - g.h;
    if (g.lit) {
      const glow = ctx.createRadialGradient(cx, top + 18, 6, cx, top + 18, 110);
      glow.addColorStop(0, 'rgba(255,179,64,0.5)');
      glow.addColorStop(1, 'rgba(255,179,64,0)');
      ctx.fillStyle = glow;
      ctx.fillRect(cx - 110, top - 92, 220, 220);
      ctx.fillStyle = 'rgba(255,179,64,0.16)';
      ctx.beginPath(); ctx.ellipse(cx, g.y, 44, 8, 0, 0, 6.29); ctx.fill();
    }
    ctx.fillStyle = '#141a2e';
    ctx.fillRect(cx - 2.5, top + 26, 5, g.h - 26);
    ctx.fillRect(cx - 17, top + 22, 34, 4);
    ctx.strokeStyle = '#0d1120';
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.roundRect(cx - 13, top, 26, 28, 4); ctx.stroke();
    if (g.lit) {
      const flick = 1 + Math.sin(t * 11) * 0.08 + Math.sin(t * 23) * 0.05;
      const glass = ctx.createRadialGradient(cx, top + 15, 2, cx, top + 15, 15);
      glass.addColorStop(0, '#fff3c4');
      glass.addColorStop(0.55, C.amber);
      glass.addColorStop(1, '#c46a1e');
      ctx.fillStyle = glass;
      ctx.beginPath(); ctx.roundRect(cx - 10, top + 3, 20, 22, 3); ctx.fill();
      ctx.fillStyle = '#ffdf8a';
      ctx.beginPath(); ctx.ellipse(cx, top + 17, 3.4 * flick, 6.4 * flick, 0, 0, 6.29); ctx.fill();
      ctx.fillStyle = C.flame;
      ctx.beginPath(); ctx.ellipse(cx, top + 19, 1.9 * flick, 3.8 * flick, 0, 0, 6.29); ctx.fill();
    } else {
      ctx.fillStyle = '#26314f';
      ctx.beginPath(); ctx.roundRect(cx - 10, top + 3, 20, 22, 3); ctx.fill();
      ctx.fillStyle = 'rgba(190,220,255,0.25)';
      ctx.fillRect(cx - 6, top + 6, 4, 10);
    }
    ctx.fillStyle = '#141a2e';
    ctx.beginPath(); ctx.arc(cx, top - 3, 3, 0, 6.29); ctx.fill();
  }

  function drawShards(world, t) {
    for (const s of world.state.shards) {
      if (s.taken) continue;
      const pulse = 1 + Math.sin(t * 3 + s.phase) * 0.13;
      ctx.save();
      ctx.translate(s.x, s.y + Math.sin(t * 2 + s.phase) * 2.5);
      ctx.scale(pulse, pulse);
      ctx.shadowColor = C.amber;
      ctx.shadowBlur = 15;
      ctx.fillStyle = C.amber;
      ctx.beginPath();
      ctx.moveTo(0, -10); ctx.lineTo(6.5, 0); ctx.lineTo(0, 10); ctx.lineTo(-6.5, 0);
      ctx.closePath(); ctx.fill();
      ctx.shadowBlur = 0;
      ctx.fillStyle = C.amberHot;
      ctx.beginPath();
      ctx.moveTo(0, -5); ctx.lineTo(3.2, 0); ctx.lineTo(0, 5); ctx.lineTo(-3.2, 0);
      ctx.closePath(); ctx.fill();
      ctx.restore();
    }
  }

  function drawWisps(world, t) {
    const p = world.state.player;
    for (const w of world.state.wisps) {
      const y = w.y + Math.sin(w.phase) * 3;
      const glow = ctx.createRadialGradient(w.x, y, 2, w.x, y, 30);
      glow.addColorStop(0, 'rgba(160,215,255,0.4)');
      glow.addColorStop(1, 'rgba(160,215,255,0)');
      ctx.fillStyle = glow;
      ctx.fillRect(w.x - 30, y - 30, 60, 60);
      ctx.fillStyle = 'rgba(214,240,255,0.92)';
      ctx.beginPath();
      ctx.arc(w.x, y - 3, 12, Math.PI, 0);
      ctx.quadraticCurveTo(w.x + 12, y + 9, w.x + 6, y + 6 + Math.sin(w.phase * 2) * 1.6);
      ctx.quadraticCurveTo(w.x + 2, y + 10, w.x - 2, y + 6 + Math.cos(w.phase * 2) * 1.6);
      ctx.quadraticCurveTo(w.x - 8, y + 9, w.x - 12, y + 5);
      ctx.quadraticCurveTo(w.x - 12, y - 3, w.x - 12, y - 3);
      ctx.closePath(); ctx.fill();
      const look = p ? Math.sign(p.x - w.x) * 2 : 0;
      ctx.fillStyle = '#12233c';
      ctx.beginPath();
      ctx.ellipse(w.x - 4.4 + look, y - 4, 1.9, 2.8, 0, 0, 6.29);
      ctx.ellipse(w.x + 4.4 + look, y - 4, 1.9, 2.8, 0, 0, 6.29);
      ctx.fill();
    }
  }

  function drawKeeper(world, t) {
    const p = world.state.player;
    if (!p) return;
    if (p.grace > 0 && Math.floor(t * 12) % 2 === 0) ctx.globalAlpha = 0.35;
    const cx = p.x + p.w / 2;
    const feet = p.y + p.h;
    const bob = p.onGround && Math.abs(p.vx) > 25 ? Math.abs(Math.sin(t * 13)) * 1.6 : 0;
    ctx.save();
    ctx.translate(cx, feet - bob);
    ctx.scale(p.face * (1 + p.squash * 0.6), 1 - p.squash);
    // The hand lantern's glow comes first, behind the cloak.
    const glow = ctx.createRadialGradient(10, -13, 1, 10, -13, 17);
    glow.addColorStop(0, 'rgba(255,179,64,0.55)');
    glow.addColorStop(1, 'rgba(255,179,64,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(-8, -30, 36, 34);
    // Cloak: a hooded bell shape with a darker hem.
    ctx.fillStyle = C.cloak;
    ctx.beginPath();
    ctx.moveTo(-10, 0);
    ctx.quadraticCurveTo(-11, -16, -6.5, -22);
    ctx.quadraticCurveTo(0, -27, 6.5, -22);
    ctx.quadraticCurveTo(11, -16, 10, 0);
    ctx.quadraticCurveTo(5, -2.4, 0, 0);
    ctx.quadraticCurveTo(-5, -2.4, -10, 0);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = C.cloakDark;
    ctx.beginPath();
    ctx.moveTo(-10, 0);
    ctx.quadraticCurveTo(-5, -2.4, 0, 0);
    ctx.quadraticCurveTo(5, -2.4, 10, 0);
    ctx.lineTo(9.2, -6);
    ctx.quadraticCurveTo(0, -3.4, -9.2, -6);
    ctx.closePath(); ctx.fill();
    // Hood and face.
    ctx.fillStyle = C.cloakDark;
    ctx.beginPath(); ctx.arc(0, -23, 7.6, 0, 6.29); ctx.fill();
    ctx.fillStyle = C.skin;
    ctx.beginPath(); ctx.arc(0.8, -22.4, 5, 0, 6.29); ctx.fill();
    ctx.fillStyle = C.ink;
    ctx.beginPath(); ctx.arc(2.6, -22.8, 0.95, 0, 6.29); ctx.fill();
    // Scarf, its tail fluttering behind.
    ctx.fillStyle = C.scarf;
    ctx.fillRect(-6, -18.6, 12.5, 3.4);
    ctx.beginPath();
    ctx.moveTo(-6, -18.6);
    ctx.lineTo(-11 - Math.sin(t * 6) * 1.6, -15.6 + Math.cos(t * 6) * 1.2);
    ctx.lineTo(-6, -15.2);
    ctx.closePath(); ctx.fill();
    // The hand lantern.
    ctx.fillStyle = '#141a2e';
    ctx.fillRect(8.4, -16.5, 5.4, 7);
    ctx.fillStyle = C.amber;
    ctx.fillRect(9.7, -15.2, 2.8, 4.4);
    ctx.restore();
    ctx.globalAlpha = 1;
  }

  function drawParticles(world) {
    for (const pt of world.state.particles) {
      ctx.globalAlpha = Math.max(0, 1 - pt.age / pt.life);
      ctx.fillStyle = pt.color;
      ctx.beginPath(); ctx.arc(pt.x, pt.y, pt.size, 0, 6.29); ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  function drawMotes(t) {
    ctx.fillStyle = C.amber;
    for (let i = 0; i < 26; i += 1) {
      const x = hash(i, 8, 3) * W + Math.sin(t * 0.6 + i * 2.1) * 9;
      const y = H - ((hash(i, 9, 3) * H + t * (7 + hash(i, 10, 3) * 9)) % H);
      ctx.globalAlpha = 0.16 + hash(i, 11, 3) * 0.3;
      ctx.beginPath(); ctx.arc(x, y, 1 + hash(i, 12, 3) * 1.3, 0, 6.29); ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  function drawVignette() {
    const g = ctx.createRadialGradient(W / 2, H / 2, H * 0.42, W / 2, H / 2, H * 0.95);
    g.addColorStop(0, 'rgba(4,6,14,0)');
    g.addColorStop(1, 'rgba(4,6,14,0.44)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
  }

  function flameIcon(x, y, lit) {
    if (lit) {
      ctx.fillStyle = C.flame;
      ctx.beginPath();
      ctx.moveTo(x, y - 8);
      ctx.quadraticCurveTo(x + 5.4, y - 1, x + 3.4, y + 4.6);
      ctx.quadraticCurveTo(x + 1.8, y + 8, x, y + 8);
      ctx.quadraticCurveTo(x - 1.8, y + 8, x - 3.4, y + 4.6);
      ctx.quadraticCurveTo(x - 5.4, y - 1, x, y - 8);
      ctx.fill();
      ctx.fillStyle = C.amberHot;
      ctx.beginPath(); ctx.ellipse(x, y + 3.4, 1.8, 2.8, 0, 0, 6.29); ctx.fill();
    } else {
      ctx.strokeStyle = 'rgba(220,228,255,0.3)';
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(x, y - 8);
      ctx.quadraticCurveTo(x + 5.4, y - 1, x + 3.4, y + 4.6);
      ctx.quadraticCurveTo(x + 1.8, y + 8, x, y + 8);
      ctx.quadraticCurveTo(x - 1.8, y + 8, x - 3.4, y + 4.6);
      ctx.quadraticCurveTo(x - 5.4, y - 1, x, y - 8);
      ctx.stroke();
    }
  }

  function drawHUD(world) {
    const s = world.state;
    text('SCORE', 18, 20, { size: 10, align: 'left', alpha: 0.65, spacing: 2 });
    text(String(s.score).padStart(5, '0'), 18, 40, { size: 21, align: 'left', weight: 'bold' });
    for (let i = 0; i < s.shardsTotal; i += 1) {
      const x = 25 + i * 19;
      const y = 66;
      ctx.save();
      ctx.translate(x, y);
      if (i < s.shardsTaken) {
        ctx.fillStyle = C.amber;
        ctx.shadowColor = C.amber; ctx.shadowBlur = 7;
      } else {
        ctx.strokeStyle = 'rgba(220,228,255,0.35)';
        ctx.lineWidth = 1.3;
      }
      ctx.beginPath();
      ctx.moveTo(0, -6.4); ctx.lineTo(4.2, 0); ctx.lineTo(0, 6.4); ctx.lineTo(-4.2, 0);
      ctx.closePath();
      if (i < s.shardsTaken) ctx.fill(); else ctx.stroke();
      ctx.restore();
    }
    const level = LEVELS[s.levelIndex];
    text(`LEVEL ${s.levelIndex + 1} — ${level.name.toUpperCase()}`, W / 2, 24, { size: 12, alpha: 0.85, spacing: 2 });
    for (let i = 0; i < 3; i += 1) flameIcon(W - 26 - i * 25, 26, i < s.lives);
    const mm = Math.floor(s.totalTime / 60);
    const ss = Math.floor(s.totalTime % 60);
    text(`${mm}:${String(ss).padStart(2, '0')}`, W - 18, 52, { size: 14, align: 'right', alpha: 0.85 });
    text('ARROWS / WASD MOVE · SPACE JUMP · P PAUSE · M SOUND', 18, H - 14, { size: 10, align: 'left', alpha: 0.4, spacing: 1 });
  }

  function scrim(alpha, color = '6,8,20') {
    ctx.fillStyle = `rgba(${color},${alpha})`;
    ctx.fillRect(0, 0, W, H);
  }

  function drawTitle(t) {
    scrim(0.34);
    ctx.save();
    ctx.shadowColor = 'rgba(255,179,64,0.65)';
    ctx.shadowBlur = 26;
    text('EMBERFALL', W / 2, 148, { font: DISPLAY, size: 62, weight: 'bold', color: '#ffe9a8', spacing: 12 });
    ctx.restore();
    ctx.fillStyle = C.amber;
    ctx.beginPath();
    ctx.moveTo(W / 2, 190); ctx.lineTo(W / 2 + 7, 198); ctx.lineTo(W / 2, 206); ctx.lineTo(W / 2 - 7, 198);
    ctx.closePath(); ctx.fill();
    ctx.fillRect(W / 2 - 120, 197, 96, 1.6);
    ctx.fillRect(W / 2 + 24, 197, 96, 1.6);
    text('KEEPER OF THE LAST LIGHT', W / 2, 228, { size: 15, color: C.amber, spacing: 5 });
    text('The gloam has swallowed every lantern in the valley.', W / 2, 268, { size: 15, alpha: 0.92 });
    text('Gather the ember shards, light each gate, and bring back the dawn.', W / 2, 292, { size: 15, alpha: 0.92 });
    text('ARROWS / WASD — WALK        SPACE — JUMP, HOLD FOR HIGHER', W / 2, 348, { size: 12.5, alpha: 0.75, spacing: 1 });
    text('THORNS AND WISPS COST A FLAME · YOU CARRY THREE', W / 2, 372, { size: 12.5, alpha: 0.75, spacing: 1 });
    text('PRESS ENTER OR CLICK TO BEGIN', W / 2, 428, { size: 17, weight: 'bold', color: '#ffe9a8', alpha: 0.6 + 0.4 * Math.sin(t * 3), spacing: 2 });
  }

  function drawIntro(world, introT) {
    const s = world.state;
    const level = LEVELS[s.levelIndex];
    const phase = Math.min(1, introT / 1.7);
    const a = Math.sin(phase * Math.PI) * 0.88;
    scrim(a * 0.55);
    text(`LEVEL ${s.levelIndex + 1}`, W / 2, 218, { size: 13, color: C.amber, spacing: 4, alpha: a });
    text(level.name, W / 2, 256, { font: DISPLAY, size: 36, weight: 'bold', alpha: a });
    text(level.goal, W / 2, 296, { size: 14.5, alpha: a * 0.92 });
  }

  function drawOver(world, best) {
    const s = world.state;
    scrim(0.72, '10,5,8');
    text('THE LIGHT GOES OUT', W / 2, 190, { font: DISPLAY, size: 42, weight: 'bold', color: '#e0684e', spacing: 4 });
    text('The valley stays dark… this time.', W / 2, 236, { size: 15, alpha: 0.9 });
    text(`SCORE ${s.score}`, W / 2, 300, { size: 24, weight: 'bold' });
    text(`BEST ${best}`, W / 2, 334, { size: 14, alpha: 0.75 });
    text('PRESS ENTER TO TRY AGAIN', W / 2, 404, { size: 16, weight: 'bold', color: '#ffe9a8', spacing: 2, alpha: 0.7 + 0.3 * Math.sin(world.state.time * 3) });
  }

  function drawWin(world, best) {
    const s = world.state;
    scrim(0.6);
    ctx.save();
    ctx.shadowColor = 'rgba(255,179,64,0.7)';
    ctx.shadowBlur = 22;
    text('DAWN BREAKS', W / 2, 178, { font: DISPLAY, size: 46, weight: 'bold', color: '#ffe9a8', spacing: 5 });
    ctx.restore();
    text('All three lanterns burn again over the valley.', W / 2, 224, { size: 15.5, alpha: 0.94 });
    text(`SCORE ${s.score}`, W / 2, 286, { size: 26, weight: 'bold' });
    const mm = Math.floor(s.totalTime / 60);
    const ss = Math.floor(s.totalTime % 60);
    text(`TIME ${mm}:${String(ss).padStart(2, '0')} · FLAMES LEFT ${s.lives} · BEST ${best}`, W / 2, 322, { size: 14, alpha: 0.8 });
    text('PRESS ENTER TO PLAY AGAIN', W / 2, 398, { size: 16, weight: 'bold', color: '#ffe9a8', spacing: 2, alpha: 0.7 + 0.3 * Math.sin(world.state.time * 3) });
  }

  /** Draw one frame. scene: {world, mode, paused, introT, best, muted}. */
  function draw(scene) {
    const { world, mode } = scene;
    const t = world.state.time;
    drawSky(t);
    ridge(430, 26, C.hillFar, 3.1, t * 0.004);
    ridge(472, 20, C.hillNear, 7.7, t * 0.009);
    drawTiles(world);
    drawMovers(world);
    drawGate(world, t);
    drawShards(world, t);
    drawWisps(world, t);
    drawParticles(world);
    drawKeeper(world, t);
    drawMotes(t);
    drawVignette();
    if (mode === 'play' || mode === 'intro') drawHUD(world);
    if (scene.muted) text('SOUND OFF (M)', W - 18, H - 14, { size: 10, align: 'right', alpha: 0.5 });
    if (mode === 'title') drawTitle(t);
    else if (mode === 'intro') drawIntro(world, scene.introT || 0);
    else if (mode === 'over') drawOver(world, scene.best || 0);
    else if (mode === 'win') drawWin(world, scene.best || 0);
    if (scene.paused && mode === 'play') {
      scrim(0.5);
      text('PAUSED', W / 2, H / 2 - 12, { font: DISPLAY, size: 34, weight: 'bold', spacing: 6 });
      text('P — RESUME', W / 2, H / 2 + 28, { size: 13, alpha: 0.8, spacing: 2 });
    }
  }

  return { draw };
}
