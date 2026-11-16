/*
 * Tiny synthesised sound effects (Web Audio, no audio files).
 * Everything is wrapped so that a missing or blocked AudioContext
 * never interferes with the game.
 */
(function (root) {
  'use strict';

  let ctx = null;
  let rainNode = null;
  let noiseBuf = null;

  function ensure() {
    if (ctx) return ctx;
    try {
      const AC = root.AudioContext || root.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
      const len = ctx.sampleRate * 2;
      noiseBuf = ctx.createBuffer(1, len, ctx.sampleRate);
      const d = noiseBuf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    } catch (e) { ctx = null; }
    return ctx;
  }

  function noise(dur, freq, q, gain, type) {
    const c = ensure();
    if (!c || Sfx.muted) return;
    try {
      const src = c.createBufferSource();
      src.buffer = noiseBuf;
      const f = c.createBiquadFilter();
      f.type = type || 'bandpass';
      f.frequency.value = freq;
      f.Q.value = q;
      const g = c.createGain();
      const t = c.currentTime;
      g.gain.setValueAtTime(gain, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      src.connect(f); f.connect(g); g.connect(c.destination);
      src.start(t, Math.random());
      src.stop(t + dur + 0.05);
    } catch (e) { /* ignore */ }
  }

  function tone(freq, dur, gain, wave) {
    const c = ensure();
    if (!c || Sfx.muted) return;
    try {
      const o = c.createOscillator();
      o.type = wave || 'sine';
      o.frequency.value = freq;
      const g = c.createGain();
      const t = c.currentTime;
      g.gain.setValueAtTime(gain, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g); g.connect(c.destination);
      o.start(t); o.stop(t + dur + 0.05);
    } catch (e) { /* ignore */ }
  }

  const Sfx = {
    muted: false,

    /** call from a user gesture so browsers allow playback */
    unlock() {
      const c = ensure();
      if (c && c.state === 'suspended') { try { c.resume(); } catch (e) { /* ignore */ } }
    },

    setMuted(m) {
      Sfx.muted = !!m;
      if (Sfx.muted) Sfx.rain(false);
    },

    tile() { noise(0.06, 2400, 1.2, 0.5); tone(190, 0.05, 0.18, 'triangle'); },
    call() { tone(520, 0.12, 0.12, 'square'); tone(780, 0.18, 0.08, 'square'); },
    riichi() { tone(330, 0.5, 0.14, 'sawtooth'); tone(165, 0.6, 0.12, 'sine'); },
    win() { [392, 523, 659, 784].forEach((f, i) => setTimeout(() => tone(f, 0.5, 0.12, 'triangle'), i * 90)); },
    lose() { [330, 262, 196].forEach((f, i) => setTimeout(() => tone(f, 0.6, 0.12, 'sine'), i * 160)); },
    click() { tone(880, 0.04, 0.05, 'sine'); },
    text() { /* reserved for a typewriter tick */ },

    thunder() {
      noise(2.2, 90, 0.4, 0.9, 'lowpass');
      setTimeout(() => noise(1.6, 60, 0.3, 0.6, 'lowpass'), 250);
    },

    rain(on) {
      const c = ensure();
      try {
        if (!on || Sfx.muted || !c) {
          if (rainNode) { rainNode.gain.gain.linearRampToValueAtTime(0.0001, (c ? c.currentTime : 0) + 0.6); const n = rainNode; rainNode = null; setTimeout(() => { try { n.src.stop(); } catch (e) { /* ignore */ } }, 800); }
          return;
        }
        if (rainNode) return;
        const src = c.createBufferSource();
        src.buffer = noiseBuf; src.loop = true;
        const f = c.createBiquadFilter();
        f.type = 'highpass'; f.frequency.value = 1800;
        const g = c.createGain();
        g.gain.setValueAtTime(0.0001, c.currentTime);
        g.gain.linearRampToValueAtTime(0.05, c.currentTime + 1.2);
        src.connect(f); f.connect(g); g.connect(c.destination);
        src.start();
        rainNode = { src, gain: g };
      } catch (e) { rainNode = null; }
    },
  };

  root.Sfx = Sfx;
})(window);
