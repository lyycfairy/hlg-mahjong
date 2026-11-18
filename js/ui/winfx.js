/*
 * The limit-hand win effect: whenever anybody wins a hand worth a mangan or more, the table gives way
 * to a painted scene with the name of the limit struck across it - and the bigger the hand, the grander
 * the scene.
 *
 *   level  limit              the painting (assets/fx/win_*.jpg)        what is added at this level
 *   1      mangan             the hawk strikes                          a band across the table, one slash, one ring
 *   2      haneman            the carp leaps the dragon gate            a taller band, crossed slashes, turning rays
 *   3      baiman             the tiger comes down the mountain         the whole screen, lightning, rising embers
 *   4      sanbaiman          the phoenix rises from the fire           more of everything, the name struck stroke by stroke
 *   5      yakuman            the dragon in the heavens                 a blackout first, then gold: rain of sparks, the yaku named
 *   6      two yakuman or more  the dragon again, unleashed             the longest and loudest of all, with a multiplier
 *
 *   WinFx.tier(score)          0..6 from a Yaku.evaluate result ({ base, yakuman }) or a limit id
 *                              ('mangan' ... 'yakuman', 'yakuman2')
 *   WinFx.plan(level, fast)    how long it runs and how much of everything it has - every number grows
 *                              with the level (tests/engine.test.js holds it to that)
 *   WinFx.play(host, opts)     play it over `host`; resolves when it is over. A click skips to the end
 *                              (once the picture has been up for a moment, so that nobody skips it by accident).
 *       opts: { score | level, title, tag, sub, kicker, mine, fast }
 *
 * The first two functions are pure and load under Node; the rest needs a page. All motion is CSS and one
 * canvas of sparks; where a painting is missing the scene still plays on plain colours.
 */
(function (root) {
  'use strict';
  const isNode = typeof module !== 'undefined' && module.exports;

  const LEVELS = ['', 'mangan', 'haneman', 'baiman', 'sanbaiman', 'yakuman', 'multi'];

  /*
   * ms       how long the scene holds (after the blackout, before the fade)
   * black    the dark, silent beat before a yakuman
   * sparks   the burst when the name lands;  embers / rain: sparks per second for as long as it holds
   * rings    shock rings from the name;  slashes: strokes across the picture;  bolts: lightning
   * rays     turning rays behind the name;  shake: how hard the picture is struck (px)
   * stagger  ms between the characters of the name (0 = the whole name at once)
   * size     the size of the name (a factor);  band: the picture is a band over the table (false = the whole screen)
   */
  const PLAN = [
    null,
    { id: 'mangan',    ms: 2300, black: 0,   sparks: 46,  embers: 0,  rain: 0,  rings: 1, slashes: 1, bolts: 0, rays: 0,  shake: 6,  stagger: 0,   size: 1,    band: 0.46 },
    { id: 'haneman',   ms: 2800, black: 0,   sparks: 90,  embers: 0,  rain: 0,  rings: 2, slashes: 2, bolts: 0, rays: 10, shake: 9,  stagger: 70,  size: 1.1,  band: 0.6 },
    { id: 'baiman',    ms: 3500, black: 0,   sparks: 150, embers: 26, rain: 0,  rings: 3, slashes: 2, bolts: 2, rays: 14, shake: 13, stagger: 120, size: 1.22, band: 0 },
    { id: 'sanbaiman', ms: 4200, black: 0,   sparks: 230, embers: 46, rain: 0,  rings: 4, slashes: 3, bolts: 3, rays: 18, shake: 17, stagger: 160, size: 1.3,  band: 0 },
    { id: 'yakuman',   ms: 5400, black: 650, sparks: 340, embers: 60, rain: 70, rings: 5, slashes: 3, bolts: 4, rays: 24, shake: 22, stagger: 240, size: 1.5,  band: 0 },
    { id: 'multi',     ms: 6600, black: 900, sparks: 480, embers: 90, rain: 120, rings: 7, slashes: 4, bolts: 6, rays: 32, shake: 28, stagger: 260, size: 1.6,  band: 0 },
  ];

  /** 0 (no effect) .. 6, from a scored hand or the name of a limit */
  function tier(score) {
    if (!score) return 0;
    if (typeof score === 'string') {
      const m = /^yakuman(\d+)$/.exec(score);
      if (m) return +m[1] > 1 ? 6 : 5;
      if (score === 'kazoe') return 5;
      return Math.max(0, LEVELS.indexOf(score));
    }
    const base = score.base || 0;
    if ((score.yakuman || 0) > 1 || base >= 16000) return 6;
    if (score.yakuman || base >= 8000) return 5;
    if (base >= 6000) return 4;
    if (base >= 4000) return 3;
    if (base >= 3000) return 2;
    if (base >= 2000) return 1;
    return 0;
  }

  /** the plan of a level; `fast` (the game's fast setting) shortens it without taking anything away */
  function plan(level, fast) {
    const p = PLAN[Math.max(0, Math.min(6, level | 0))];
    if (!p) return null;
    if (!fast) return Object.assign({ level }, p);
    return Object.assign({ level }, p, { ms: Math.round(p.ms * 0.55), black: Math.round(p.black * 0.4), stagger: Math.round(p.stagger * 0.5) });
  }

  const WinFx = { LEVELS, PLAN, tier, plan };
  if (isNode) { module.exports = WinFx; return; }

  /* ------------------------------------------------------------------ the scene */

  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const ART = level => 'fx/win_' + (level >= 5 ? 'yakuman' : LEVELS[level]) + '.jpg';
  // the winner's colours: gold for the player's own hand, blood red when it is won against him
  const PALETTE = {
    mine: ['#fff6d8', '#ffd76a', '#f2a93b', '#ffffff', '#e8432f'],
    theirs: ['#ffe3dc', '#ff6b54', '#c7291d', '#ffffff', '#7a0f0a'],
  };

  /** sparks on a canvas: a burst from a point, embers rising from the floor, a rain from above */
  function sparks(canvas, colours) {
    const ctx = canvas.getContext('2d');
    const parts = [];
    let w = 0, h = 0, raf = 0, last = 0, alive = true, embers = 0, rain = 0, owedE = 0, owedR = 0;
    const size = () => {
      const r = canvas.getBoundingClientRect();
      const dpr = Math.min(2, root.devicePixelRatio || 1);
      w = r.width; h = r.height;
      canvas.width = Math.max(1, Math.round(w * dpr)); canvas.height = Math.max(1, Math.round(h * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    size();
    const pick = () => colours[(Math.random() * colours.length) | 0];
    const rnd = (a, b) => a + Math.random() * (b - a);
    const step = now => {
      if (!alive) return;
      const dt = Math.min(0.05, (now - (last || now)) / 1000);
      last = now;
      owedE += embers * dt; owedR += rain * dt;
      while (owedE >= 1) { owedE--; parts.push({ x: rnd(0, w), y: h + 6, vx: rnd(-30, 30), vy: rnd(-260, -110), g: -20, drag: 0.995, life: rnd(1.4, 3), age: 0, r: rnd(1, 2.6), c: pick(), sway: rnd(1.5, 4) }); }
      while (owedR >= 1) { owedR--; parts.push({ x: rnd(0, w), y: -8, vx: rnd(-40, 10), vy: rnd(520, 980), g: 300, drag: 1, life: rnd(0.8, 1.6), age: 0, r: rnd(1, 2.2), c: pick(), streak: true }); }
      ctx.clearRect(0, 0, w, h);
      ctx.globalCompositeOperation = 'lighter';
      for (let i = parts.length - 1; i >= 0; i--) {
        const p = parts[i];
        p.age += dt;
        if (p.age >= p.life || p.y > h + 40 || p.y < -60) { parts.splice(i, 1); continue; }
        const px = p.x, py = p.y;
        p.vy += p.g * dt; p.vx *= p.drag; p.vy *= p.drag;
        if (p.sway) p.vx += Math.sin(p.age * p.sway * 3) * 22 * dt;
        p.x += p.vx * dt; p.y += p.vy * dt;
        const k = 1 - p.age / p.life;
        ctx.globalAlpha = Math.min(1, k * 1.6);
        ctx.strokeStyle = p.c; ctx.fillStyle = p.c;
        if (p.streak || Math.abs(p.vx) + Math.abs(p.vy) > 260) {
          ctx.lineWidth = p.r * (0.6 + k * 0.6);
          ctx.beginPath(); ctx.moveTo(px - p.vx * 0.012, py - p.vy * 0.012); ctx.lineTo(p.x, p.y); ctx.stroke();
        } else {
          ctx.beginPath(); ctx.arc(p.x, p.y, p.r * (0.5 + k * 0.7), 0, 6.283); ctx.fill();
        }
      }
      ctx.globalAlpha = 1;
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return {
      /** n sparks thrown outward from (x, y), both in 0..1 of the canvas */
      burst(x, y, n, power) {
        for (let i = 0; i < n; i++) {
          const a = Math.random() * 6.283, v = power * rnd(0.25, 1);
          parts.push({ x: x * w, y: y * h, vx: Math.cos(a) * v, vy: Math.sin(a) * v - power * 0.18, g: 620, drag: 0.985, life: rnd(0.6, 1.5), age: 0, r: rnd(1.2, 3.4), c: pick() });
        }
      },
      flow(e, r) { embers = e; rain = r; },
      stop() { alive = false; cancelAnimationFrame(raf); },
    };
  }

  WinFx.play = function (host, o) {
    const level = o.level != null ? o.level : tier(o.score);
    const p = plan(level, o.fast);
    if (!p || !host) return Promise.resolve(false);
    const Assets = root.Assets, Sfx = root.Sfx, I18n = root.I18n;
    const has = n => !!(Assets && Assets.has(n));
    const side = o.mine ? 'mine' : 'theirs';
    const title = o.title || (o.score && I18n ? I18n.limitName(o.score) : '') || (I18n ? I18n.t('limit.' + (level >= 5 ? 'yakuman' : p.id)) : p.id);
    const tag = o.tag != null ? o.tag : (I18n ? I18n.t('winfx.tag.' + p.id) : '');
    const chars = Array.from(title);
    // a long name (the Latin alphabet) still has to land within a third of the scene
    const stagger = chars.length > 1 ? Math.min(p.stagger, (p.ms * 0.3) / (chars.length - 1)) : 0;
    const T0 = p.black;                                   // when the picture opens
    const tName = T0 + p.ms * 0.2;                        // when the first character of the name lands
    const tHit = tName + stagger * (chars.length - 1);    // when the last one does
    const end = T0 + p.ms;

    const el = document.createElement('div');
    el.className = `winfx wf-L${level} wf-${p.id} ${side}${p.band ? ' wf-band' : ' wf-full'}`;
    el.style.setProperty('--dur', p.ms + 'ms');
    el.style.setProperty('--t0', T0 + 'ms');
    el.style.setProperty('--wf-size', p.size);
    el.style.setProperty('--wf-shake', p.shake + 'px');
    if (p.band) el.style.setProperty('--wf-band', (p.band * 100) + 'vh');
    // how wide the name is, in full-width characters (a Latin letter is about half of one): the type is sized to fit
    el.style.setProperty('--wf-n', Math.max(2, chars.reduce((n, c) => n + (c.charCodeAt(0) > 0x2e7f ? 1 : 0.56), 0)).toFixed(2));
    const art = has(ART(level)) ? ` style="background-image:url('${Assets.url(ART(level))}')"` : '';
    const at = ms => ` style="--at:${Math.round(ms)}ms"`;
    let slashes = '', rings = '', bolts = '';
    for (let i = 0; i < p.slashes; i++) slashes += `<i class="wf-slash s${i % 4}"${at(T0 + p.ms * 0.03 + i * 110)}></i>`;
    for (let i = 0; i < p.rings; i++) rings += `<i class="wf-ring"${at(tHit + i * 130)}></i>`;
    const boltArt = has('fx/bolt.webp') ? `background-image:url('${Assets.url('fx/bolt.webp')}');` : '';
    for (let i = 0; i < p.bolts; i++) {
      const when = tHit + 80 + (p.ms * 0.55) * (i / Math.max(1, p.bolts));
      // over the painting, clear of the name
      bolts += `<i class="wf-bolt${boltArt ? '' : ' plain'}" style="${boltArt}--at:${Math.round(when)}ms;left:${-6 + ((i * 17) % 36)}%;--flip:${i % 2 ? -1 : 1}"></i>`;
    }
    const name = chars.map((c, i) => `<span${at(tName + stagger * i)}>${c === ' ' ? '&nbsp;' : esc(c)}</span>`).join('');
    el.innerHTML = `
      <div class="wf-dim"></div>
      <div class="wf-stage">
        <div class="wf-art"${art}></div>
        <div class="wf-tint"></div>
        ${p.rays ? `<div class="wf-rays" style="--n:${p.rays}"></div>` : ''}
        ${bolts}
        ${slashes}
        <canvas class="wf-sparks"></canvas>
        <div class="wf-title">
          ${o.kicker ? `<div class="wf-kicker"${at(tName - 160)}>${esc(o.kicker)}</div>` : ''}
          <div class="wf-name">${name}${rings}</div>
          ${tag ? `<div class="wf-tag"${at(tHit + 220)}>${esc(tag)}</div>` : ''}
          ${o.sub ? `<div class="wf-sub"${at(tHit + 420)}>${esc(o.sub)}</div>` : ''}
        </div>
      </div>
      <div class="wf-white"></div>`;
    host.appendChild(el);
    void el.offsetWidth;
    el.classList.add('on');

    const stage = el.querySelector('.wf-stage');
    const white = el.querySelector('.wf-white');
    const fx = sparks(el.querySelector('.wf-sparks'), PALETTE[side]);
    const timers = [];
    const later = (ms, fn) => timers.push(setTimeout(fn, ms));
    const strike = (big, light) => {
      // the picture is struck: it jolts, and the screen flickers - once, fully, when the whole name has landed
      stage.classList.remove('wf-quake'); void stage.offsetWidth; stage.classList.add('wf-quake');
      if (!light) { white.classList.remove('hit', 'big'); void white.offsetWidth; white.classList.add('hit'); if (big) white.classList.add('big'); }
    };
    // where the name stands, for the burst (the title sits right of centre; centred on narrow screens)
    const origin = () => {
      const n = el.querySelector('.wf-name'), r = n.getBoundingClientRect(), s = el.getBoundingClientRect();
      return [(r.left + r.width / 2 - s.left) / s.width, (r.top + r.height / 2 - s.top) / s.height];
    };

    if (p.black && Sfx && Sfx.heartbeat) later(p.black * 0.25, () => Sfx.heartbeat(1));
    later(T0 + p.ms * 0.03, () => { if (Sfx && Sfx.slash) Sfx.slash(); });
    chars.forEach((c, i) => later(tName + stagger * i + 120, () => {
      const last = i === chars.length - 1;
      if (stagger || last) {
        if (Sfx && Sfx.impact) Sfx.impact(level, last);
        strike(last);
        const [x, y] = origin();
        fx.burst(x, y, last ? p.sparks : Math.round(p.sparks / (chars.length * 2)), 380 + level * 110);
      }
      if (last) {
        fx.flow(p.embers, p.rain);
        if (Sfx) { if (o.mine && Sfx.fanfare) Sfx.fanfare(level); else if (!o.mine && Sfx.doom) Sfx.doom(level); }
      }
    }));
    for (let i = 0; i < p.bolts; i++) {
      later(tHit + 80 + (p.ms * 0.55) * (i / Math.max(1, p.bolts)), () => { if (Sfx && Sfx.thunder && i % 2 === 0) Sfx.thunder(); strike(false, true); });
    }

    return new Promise(resolve => {
      let done = false;
      const finish = () => {
        if (done) return;
        done = true;
        timers.forEach(clearTimeout);
        el.removeEventListener('click', onClick);
        el.classList.add('out');
        setTimeout(() => { fx.stop(); el.remove(); resolve(true); }, 320);
      };
      // a click skips to the end - but not a click that was already on its way when the scene opened
      const born = performance.now();
      const onClick = e => { e.stopPropagation(); if (performance.now() - born > T0 + 450) finish(); };
      el.addEventListener('click', onClick);
      later(end, finish);
    });
  };

  root.WinFx = WinFx;
})(typeof window !== 'undefined' ? window : globalThis);
