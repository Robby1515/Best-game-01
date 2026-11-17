// Emberfall — sound from a WebAudio oscillator: no audio files, every effect is synthesized.
// The context stays locked until the first key or click (browser policy), so unlock() is
// called on the first gesture; effects before that are simply silent.

export function createSound() {
  let ctx = null;
  let master = null;
  let muted = false;

  function unlock() {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = 0.42;
      master.connect(ctx.destination);
    }
    if (ctx.state === 'suspended') ctx.resume();
  }

  /** One oscillator note: frequency glides to `slideTo` if given, envelope in/out. */
  function tone(freq, seconds, { type = 'sine', volume = 0.2, slideTo = null, delay = 0 } = {}) {
    if (!ctx || muted) return;
    const t0 = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(30, slideTo), t0 + seconds);
    gain.gain.setValueAtTime(0, t0);
    gain.gain.linearRampToValueAtTime(volume, t0 + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.001, t0 + seconds);
    osc.connect(gain).connect(master);
    osc.start(t0);
    osc.stop(t0 + seconds + 0.05);
  }

  return {
    unlock,
    get muted() { return muted; },
    toggleMute() { muted = !muted; return muted; },
    click() { tone(660, 0.07, { type: 'triangle', volume: 0.15 }); },
    jump() { tone(300, 0.16, { type: 'square', volume: 0.06, slideTo: 620 }); },
    land() { tone(140, 0.06, { type: 'sine', volume: 0.08, slideTo: 90 }); },
    shard(n) { tone(880 + n * 90, 0.14, { type: 'sine', volume: 0.16 }); tone(1320 + n * 90, 0.2, { type: 'sine', volume: 0.1, delay: 0.05 }); },
    hurt() { tone(220, 0.3, { type: 'sawtooth', volume: 0.14, slideTo: 70 }); },
    ignite() { [523, 659, 784].forEach((f, i) => tone(f, 0.22, { type: 'triangle', volume: 0.14, delay: i * 0.07 })); },
    clear() { [523, 659, 784, 1046].forEach((f, i) => tone(f, 0.25, { type: 'triangle', volume: 0.15, delay: i * 0.09 })); },
    win() { [523, 659, 784, 1046, 784, 1046, 1318].forEach((f, i) => tone(f, 0.3, { type: 'triangle', volume: 0.15, delay: i * 0.11 })); },
    over() { [392, 330, 262, 196].forEach((f, i) => tone(f, 0.34, { type: 'triangle', volume: 0.14, delay: i * 0.16 })); },
  };
}
