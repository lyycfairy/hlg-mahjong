/*
 * The blood-drawing rack of Washizu mahjong: eight glass cylinders of 250cc, filled from the amount
 * actually drawn - never a painted picture. The last two (from 1,500cc) are the danger zone; when the
 * eighth is full, at 2,000cc, the player is dead.
 *
 *   BloodRack.html(drawn, lethal, cls)        the rack as HTML ('mini' beside a name, 'big' for a scene)
 *   BloodRack.set(el, drawn)                  refill a rack that is on the page
 *   BloodRack.tween(el, from, to, ms, tick)   fill (or drain) it over time; tick(cc) follows the level
 *   BloodRack.sequence(host, { from, to, lethal, fast })
 *                                             the drawing scene over `host`: the rack fills cylinder by
 *                                             cylinder, the counter runs, the heart beats faster as the
 *                                             lethal line comes near. A click skips to the end. Resolves
 *                                             when it is over.
 */
(function (root) {
  'use strict';
  const TUBE = 250;
  const DANGER = 1500;
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const T = (key, vars) => root.I18n.t(key, vars);
  const clamp01 = x => Math.max(0, Math.min(1, x));
  const fillOf = (drawn, i) => clamp01((drawn - i * TUBE) / TUBE);

  const BloodRack = {
    TUBE, DANGER,

    html(drawn, lethal, cls) {
      lethal = lethal || 2000;
      const n = Math.ceil(lethal / TUBE);
      let tubes = '';
      for (let i = 0; i < n; i++) {
        tubes += `<span class="tube${i * TUBE >= DANGER ? ' danger' : ''}" style="--fill:${fillOf(drawn, i).toFixed(3)}"><i></i>` +
          `<em>${(i + 1) * TUBE}</em></span>`;
      }
      const state = drawn >= lethal ? ' dead' : drawn >= DANGER ? ' near' : '';
      return `<span class="rack ${cls || ''}${state}" data-lethal="${lethal}">${tubes}</span>`;
    },

    set(el, drawn) {
      if (!el) return;
      const lethal = +el.dataset.lethal || 2000;
      el.querySelectorAll('.tube').forEach((t, i) => t.style.setProperty('--fill', fillOf(drawn, i).toFixed(3)));
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
      const el = document.createElement('div');
      el.className = 'bloodseq' + (back ? ' back' : '');
      el.innerHTML = `
        <div class="bs-box">
          <div class="bs-title">${esc(T(back ? 'blood.seq.back' : 'blood.seq.title', { cc: Math.abs(drawn) }))}</div>
          <div class="bs-rack">
            ${BloodRack.html(from, lethal, 'big')}
            <div class="bs-marks"><span class="bs-danger" style="--at:${DANGER / lethal}">${esc(T('blood.seq.danger'))}</span>` +
            `<span class="bs-lethal">${esc(T('blood.seq.lethal'))}</span></div>
          </div>
          <div class="bs-count"><b>${Math.round(from)}</b><span> / ${lethal}cc</span></div>
          <div class="bs-left"></div>
        </div>`;
      host.appendChild(el);
      const rack = el.querySelector('.rack');
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
      const ms = o.fast ? 60 : Math.min(5200, 1100 + Math.abs(drawn) * 2.4);
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
            setTimeout(close, o.fast ? 80 : 2300);
          } else {
            setTimeout(close, o.fast ? 40 : 900);
          }
        };
        const onClick = e => { e.stopPropagation(); finish(); };
        el.addEventListener('click', onClick);
        setTimeout(() => {
          if (done) return;
          beat();
          BloodRack.tween(rack, from, to, ms, v => {
            level = v; say(v);
            if (!back && v - lastDrip >= 50) { lastDrip = v; if (Sfx && Sfx.drip) Sfx.drip(); }
          }).then(ok => { if (ok) finish(); });
        }, o.fast ? 0 : 420);
      });
    },
  };

  root.BloodRack = BloodRack;
})(window);
