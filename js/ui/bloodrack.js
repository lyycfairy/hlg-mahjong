/*
 * The stakes of Washizu mahjong, drawn from the real numbers - never a fixed picture.
 *
 * Blood: four glass cylinders of 500cc. The last one (from 1,500cc) is the danger zone; when it is
 * full, at 2,000cc, the player is dead. The cylinders are the ones painted in assets/bg/bloodroom.jpg -
 * the blood-drawing scene: the men in black, the arm, the stand - and the blood is laid into them:
 * ART.tubes says where the inside of each glass is in that picture, and each is filled to the level
 * that the amount drawn comes to, under a copy of its own painted glass so the highlights and the
 * graduations stay on top of the blood.
 *
 *   BloodRack.html(drawn, lethal, cls)        'mini': four small tubes beside a name (plain CSS);
 *                                             'big': the stand alone, cut from the painting
 *   BloodRack.picture(drawn, lethal, view)    the painting itself: view 'rack' (the stand) or 'scene' (all of it)
 *   BloodRack.set(el, drawn)                  refill a rack that is on the page (any of the above)
 *   BloodRack.tween(el, from, to, ms, tick)   fill (or drain) it over time; tick(cc) follows the level
 *   BloodRack.sequence(host, { from, to, lethal, fast })
 *                                             the drawing scene over `host`: the whole painting, the
 *                                             view closing in on the cylinders as they fill, the counter
 *                                             running, the heart beating faster as the lethal line comes
 *                                             near. A click skips to the end. Resolves when it is over.
 *
 * Money: what Washizu still has, as bundles of banknotes - one bundle for every ten million yen.
 *
 *   MoneyPile.html(funds, total, cls)         the pile (bundles already lost are left as faint outlines)
 *   MoneyPile.set(el, funds)                  recount a pile that is on the page
 *
 * Without the painted pictures (assets missing) both fall back to shapes drawn in CSS.
 */
(function (root) {
  'use strict';
  const TUBE = 500;
  const DANGER = 1500;
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const T = (key, vars) => root.I18n.t(key, vars);
  const clamp01 = x => Math.max(0, Math.min(1, x));
  const fillOf = (drawn, i) => clamp01((drawn - i * TUBE) / TUBE);

  /*
   * The painting, 16:9. `tubes`: the inside of each cylinder as [left, top, width, height] in percent of
   * the picture (measured on the generated image - measure again if tools/generate_assets.py makes a new
   * one). `views`: the part of the picture a view shows.
   */
  const ART = {
    img: 'bg/bloodroom.jpg',
    tubes: [[55.25, 36.0, 6.0, 41.8], [65.375, 36.0, 6.25, 41.8], [75.625, 36.0, 6.125, 41.8], [85.75, 36.0, 6.25, 41.8]],
    views: { scene: [0, 0, 100, 100], rack: [50.5, 17, 47.5, 71] },
    focus: [96, 62],          // what the drawing scene closes in around
  };
  const has = path => !!(root.Assets && root.Assets.has(path));
  const stateOf = (drawn, lethal) => (drawn >= lethal ? ' dead' : drawn >= DANGER ? ' near' : '');

  const BloodRack = {
    TUBE, DANGER, ART,

    /** plain CSS tubes: the small rack beside a name, and the fallback when the painting is missing */
    plain(drawn, lethal, cls) {
      const n = Math.ceil(lethal / TUBE);
      let tubes = '';
      for (let i = 0; i < n; i++) {
        tubes += `<span class="tube${i * TUBE >= DANGER ? ' danger' : ''}" style="--fill:${fillOf(drawn, i).toFixed(3)}"><i></i>` +
          `<em>${(i + 1) * TUBE}</em></span>`;
      }
      return `<span class="rack ${cls || ''}${stateOf(drawn, lethal)}" data-lethal="${lethal}">${tubes}</span>`;
    },

    picture(drawn, lethal, view) {
      lethal = lethal || 2000;
      if (!has(ART.img)) return BloodRack.plain(drawn, lethal, 'big');
      const [vx, vy, vw, vh] = ART.views[view] || ART.views.scene;
      const url = root.Assets.url(ART.img);
      const tubes = ART.tubes.map(([x, y, w, h], i) => {
        const danger = i * TUBE >= DANGER ? ' danger' : '';
        // the same painting again, cut to this glass and laid over the blood so its shine stays on top
        const glass = `background-image:url('${url}');background-size:${(10000 / w).toFixed(2)}% ${(10000 / h).toFixed(2)}%;` +
          `background-position:${(x / (100 - w) * 100).toFixed(3)}% ${(y / (100 - h) * 100).toFixed(3)}%`;
        return `<span class="bp-tube${danger}" style="left:${x}%;top:${y}%;width:${w}%;height:${h}%;--fill:${fillOf(drawn, i).toFixed(3)}">` +
          `<i class="bp-liq"></i><i class="bp-glass" style="${glass}"></i></span>` +
          `<b class="bp-mark${danger}" style="left:${x + w / 2}%;top:${y + h + 3.4}%">${(i + 1) * TUBE}</b>`;
      }).join('');
      const last = ART.tubes[ART.tubes.length - 1];
      const zone = `<b class="bp-zone" style="left:${last[0] + last[2] / 2}%;top:${last[1] - 12.5}%">${esc(T('blood.seq.danger'))}</b>`;
      const canvas = `width:${(10000 / vw).toFixed(2)}%;height:${(10000 / vh).toFixed(2)}%;left:${(-vx / vw * 100).toFixed(2)}%;top:${(-vy / vh * 100).toFixed(2)}%`;
      return `<span class="rack bp bp-${view}${stateOf(drawn, lethal)}" data-lethal="${lethal}" style="--ar:${((vw * 16) / (vh * 9)).toFixed(4)}">` +
        `<span class="bp-canvas" style="${canvas}"><img src="${url}" alt="" draggable="false">${tubes}${zone}</span></span>`;
    },

    html(drawn, lethal, cls) {
      lethal = lethal || 2000;
      return cls === 'big' ? BloodRack.picture(drawn, lethal, 'rack') : BloodRack.plain(drawn, lethal, cls);
    },

    set(el, drawn) {
      if (!el) return;
      const lethal = +el.dataset.lethal || 2000;
      el.querySelectorAll('.tube, .bp-tube').forEach((t, i) => t.style.setProperty('--fill', fillOf(drawn, i).toFixed(3)));
      el.classList.toggle('near', drawn >= DANGER && drawn < lethal);
      el.classList.toggle('dead', drawn >= lethal);
    },

    tween(el, from, to, ms, tick) {
      const token = {};
      if (el) el._rackTween = token;
      return new Promise(resolve => {
        const t0 = performance.now();
        const step = now => {
          if (el && el._rackTween !== token) { resolve(false); return; }       // a newer tween took over
          const k = ms <= 0 ? 1 : clamp01((now - t0) / ms);
          const e = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;      // ease in and out
          const v = from + (to - from) * e;
          BloodRack.set(el, v);
          if (tick) tick(v);
          if (k < 1) requestAnimationFrame(step); else resolve(true);
        };
        requestAnimationFrame(step);
      });
    },

    sequence(host, o) {
      const lethal = o.lethal || 2000;
      const from = o.from, to = o.to, drawn = to - from;
      const back = drawn < 0;                                  // a transfusion runs the other way
      const dies = to >= lethal;
      const painted = has(ART.img);
      const el = document.createElement('div');
      el.className = 'bloodseq' + (back ? ' back' : '') + (painted ? ' painted' : '');
      // the view closes in toward the stand, from a point that keeps all four cylinders - and the arm - in the picture
      el.innerHTML = `
        <div class="bs-stage"><div class="bs-zoom" style="transform-origin:${ART.focus[0]}% ${ART.focus[1]}%">${BloodRack.picture(from, lethal, 'scene')}</div></div>
        <div class="bs-box">
          <div class="bs-title">${esc(T(back ? 'blood.seq.back' : 'blood.seq.title', { cc: Math.abs(drawn) }))}</div>
          <div class="bs-count"><b>${Math.round(from)}</b><span> / ${lethal}cc</span></div>
          <div class="bs-left"></div>
        </div>`;
      host.appendChild(el);
      const rack = el.querySelector('.rack');
      const zoom = el.querySelector('.bs-zoom');
      const num = el.querySelector('.bs-count b');
      const left = el.querySelector('.bs-left');
      const say = v => {
        num.textContent = Math.round(v);
        left.textContent = v >= lethal ? T('blood.seq.dead') : T('blood.seq.left', { n: Math.round(lethal - v) });
        el.classList.toggle('near', v >= DANGER && v < lethal);
      };
      say(from);
      void el.offsetWidth;
      el.classList.add('on');

      const Sfx = root.Sfx;
      let done = false, beatTimer = null, lastDrip = from, level = from;
      const beat = () => {
        if (done || back) return;
        if (Sfx && Sfx.heartbeat) Sfx.heartbeat(level / lethal);
        el.classList.remove('beat'); void el.offsetWidth; el.classList.add('beat');
        beatTimer = setTimeout(beat, 950 - 560 * clamp01(level / lethal));          // faster as death comes near
      };
      const ms = o.fast ? 60 : Math.min(5600, 1700 + Math.abs(drawn) * 2.4);
      return new Promise(resolve => {
        const finish = () => {
          if (done) return;
          done = true;
          clearTimeout(beatTimer);
          rack._rackTween = null;
          BloodRack.set(rack, to); say(to);
          el.removeEventListener('click', onClick);
          const close = () => { el.classList.remove('on'); setTimeout(() => { el.remove(); resolve(); }, o.fast ? 0 : 320); };
          if (dies) {
            el.classList.add('dead');
            if (Sfx && Sfx.flatline) Sfx.flatline();
            setTimeout(close, o.fast ? 80 : 2400);
          } else {
            setTimeout(close, o.fast ? 40 : 1000);
          }
        };
        const onClick = e => { e.stopPropagation(); finish(); };
        el.addEventListener('click', onClick);
        // first the whole scene - the men, the arm, the needle - then the view closes in as the blood runs
        setTimeout(() => {
          if (done) return;
          zoom.style.transitionDuration = ms + 'ms';
          el.classList.add('running');
          beat();
          BloodRack.tween(rack, from, to, ms, v => {
            level = v; say(v);
            if (!back && v - lastDrip >= 50) { lastDrip = v; if (Sfx && Sfx.drip) Sfx.drip(); }
          }).then(ok => { if (ok) finish(); });
        }, o.fast ? 0 : 900);
      });
    },
  };

  const MoneyPile = {
    UNIT: 10000000,

    html(funds, total, cls) {
      const slots = Math.ceil((total || 500000000) / MoneyPile.UNIT);
      let cells = '';
      for (let i = 0; i < slots; i++) cells += `<i style="--part:${clamp01(funds / MoneyPile.UNIT - i).toFixed(3)}"></i>`;
      return `<span class="pile ${cls || ''}" data-total="${total || 500000000}">${cells}</span>`;
    },

    set(el, funds) {
      if (!el) return;
      el.querySelectorAll('i').forEach((c, i) => c.style.setProperty('--part', clamp01(funds / MoneyPile.UNIT - i).toFixed(3)));
    },
  };

  root.BloodRack = BloodRack;
  root.MoneyPile = MoneyPile;
})(window);
