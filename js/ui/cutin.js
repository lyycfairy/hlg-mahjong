/*
 * Skill cut-in: the band that slams across the screen when a skill fires.
 *
 *   CutIn.play(hostEl, { who: 'akagi', face: 'glare', name, skill: 'insight', skillName, fast }) -> Promise
 *
 * The pictures are generated artwork (assets/fx, see tools/generate_assets.py):
 * a speed-line backdrop, one painting per skill, a four-frame strip of an eye
 * opening for Insight, and a lightning bolt. All motion is CSS; where a picture
 * is missing the band still plays with plain colours.
 */
(function (root) {
  'use strict';

  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const ART = { insight: 'fx/insight.jpg', flow: 'fx/flow.jpg', sleight: 'fx/sleight.jpg' };

  const CutIn = {
    play(host, o) {
      const dur = o.fast ? 1100 : 2100;
      const el = document.createElement('div');
      el.className = `cutin cutin-${o.skill} ${o.side === 'right' ? 'from-right' : 'from-left'}`;
      el.style.setProperty('--dur', dur + 'ms');
      const bg = n => (Assets.has(n) ? ` style="background-image:url('${Assets.url(n)}')"` : '');
      const portrait = Assets.portrait(o.who, o.face);
      const strip = o.skill === 'insight' && Assets.has('fx/eye_strip.jpg');
      el.innerHTML = `
        <div class="cutin-dim"></div>
        <div class="cutin-band">
          <div class="cutin-lines"${bg('fx/cutin.jpg')}></div>
          <div class="cutin-art"${bg(ART[o.skill] || '')}></div>
          ${strip ? `<div class="cutin-eye"${bg('fx/eye_strip.jpg')}></div>` : ''}
          ${Assets.has('fx/bolt.webp') ? `<div class="cutin-bolt"${bg('fx/bolt.webp')}></div>` : ''}
          <div class="cutin-char">${portrait ? `<img src="${Assets.url(portrait)}" alt="">` : Portraits.html(o.who, o.face)}</div>
          <div class="cutin-text">
            <div class="cutin-skill">${esc(o.skillName)}</div>
            <div class="cutin-who">${esc(o.name)}</div>
          </div>
        </div>
        <div class="cutin-flash"></div>`;
      host.appendChild(el);
      if (o.skill === 'flow') Sfx.thunder(); else Sfx.riichi();
      return new Promise(resolve => {
        setTimeout(() => { el.remove(); resolve(); }, dur);
      });
    },
  };

  root.CutIn = CutIn;
})(window);
