/*
 * Decision scenes: the hand laid out, what each choice leads to, and the
 * commentary on it (shown as text and spoken through js/voice.js).
 *
 *   TableBoard.html(table)           a table seen from one seat (story scenes): ponds, dora, hand
 *   Explain.*                        turn Analysis results into localized text
 *   Decision.open(host, opts)        the interactive panel; resolves with the chosen key
 *       kind 'discard'  opts.hand = tile types (the drawn one last), opts.rows = Analysis.discards(view)
 *                       resolves with the tile type
 *       kind 'choice'   opts.choices = [{ key, label, sub, html, speech }]   resolves with the key
 *       opts.notes(key) -> commentary lines [{ who, face, text, think }] for a choice
 *       opts.nameOf(seat) -> display name of a seat
 *
 * The numbers come from js/mahjong/analysis.js - the same code the computer
 * players use - so what the panel says about a tile is what the engine believes.
 */
(function (root) {
  'use strict';

  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const T = (key, vars) => I18n.t(key, vars);
  const P = x => I18n.pick(x);
  const fmt = n => Math.round(n).toLocaleString('en-US');
  const WIND_KANJI = ['東', '南', '西', '北'];

  /* ------------------------------------------------------------------ */

  const Explain = {
    /** "Riichi · Tanyao · Dora 2" */
    yakuList(res) {
      return res.yaku.map(y => I18n.yakuName(y) + ((y.id === 'dora' || y.id === 'ura') ? ' ' + y.han : '')).join(' · ');
    },

    /** "5 han 30 fu · Mangan" */
    size(res) {
      const limit = I18n.limitName(res);
      if (res.yakuman) return limit;
      return T('res.hanfu', { han: res.han, fu: res.fu }) + (limit ? ' · ' + limit : '');
    },

    state(row) {
      return row.shanten <= 0 ? T('an.tenpai') : T('an.shanten', { n: row.shanten });
    },

    /** short mark under a tile: how far from ready the hand is after throwing it */
    badge(row) {
      const sh = row.shanten <= 0 ? T('an.badge.tenpai') : T('an.badge.sh', { n: row.shanten });
      const dot = row.level !== 'none' ? `<i class="lvl-dot lvl-${row.level}" title="${esc(T('an.level.' + row.level))}"></i>` : '';
      return `<span class="dec-badge ${row.shanten <= 0 ? 'ready' : ''}">${dot}${esc(sh)}</span>`;
    },

    waitsHtml(tp) {
      const differ = tp.value.max !== tp.value.min || tp.yakuless;
      return tp.waits.map(w =>
        `<span class="an-wait">${TileView.type(w.t, 'xs')}<em>×${w.n}</em>` +
        (differ ? `<small>${w.res ? fmt(w.points) : esc(T('an.noYakuShort'))}</small>` : '') + '</span>').join('');
    },

    valueHtml(tp) {
      if (!tp.value.best) return `<span class="an-warn">${esc(T('an.noYaku'))}</span>`;
      const range = tp.value.max !== tp.value.min ? fmt(tp.value.min) + '–' + fmt(tp.value.max) : fmt(tp.value.max);
      let html = `<b>${esc(T('an.ronPts', { n: range }))}</b> <em>${esc(T(tp.riichi ? 'an.withRiichi' : 'an.dama'))}</em>` +
        `<small>${esc(Explain.yakuList(tp.value.best))} — ${esc(Explain.size(tp.value.best))}</small>`;
      if (tp.furiten) html += `<small class="an-warn">${esc(T('an.furiten'))}</small>`;
      return html;
    },

    dangerHtml(row, nameOf) {
      if (!row.risk) return `<span class="lvl lvl-none">${esc(T('an.level.none'))}</span>`;
      const r = row.risk;
      const pct = r.p > 0 ? ` <em>${esc(T('an.pct', { n: Math.max(1, Math.round(r.p * 100)) }))}</em>` : '';
      return `<span class="lvl lvl-${row.level}">${esc(T('an.level.' + row.level))}</span> ` +
        `${esc(T('an.vs', { name: nameOf(r.seat) }))}${pct}<small>${esc(T('an.reason.' + r.reason))}</small>`;
    },

    /** the full reading of one discard */
    discardHtml(row, nameOf) {
      const head = `<div class="an-head">${TileView.type(row.t, 'xs')}<b>${esc(T('an.discard', { tile: I18n.tileName(row.t) }))}</b>` +
        `<span class="an-state ${row.shanten <= 0 ? 'ready' : ''}">${esc(Explain.state(row))}</span>` +
        (row.dora ? `<span class="an-dora">${esc(T('an.dora'))}</span>` : '') + '</div>';
      let body;
      if (row.tenpai) {
        body = `<div class="an-row"><span class="an-k">${esc(T('an.waits'))}</span><span class="an-v">${Explain.waitsHtml(row.tenpai)}` +
          `<em>${esc(T('an.kinds', { k: row.tenpai.waits.length, n: row.tenpai.live }))}</em></span></div>` +
          `<div class="an-row"><span class="an-k">${esc(T('an.value'))}</span><span class="an-v">${Explain.valueHtml(row.tenpai)}</span></div>`;
      } else {
        const tiles = row.accepts.filter(a => a.n > 0);
        const shown = tiles.slice(0, 13).map(a => TileView.type(a.t, 'xs')).join('') + (tiles.length > 13 ? '…' : '');
        body = `<div class="an-row"><span class="an-k">${esc(T('an.accepts'))}</span><span class="an-v">${shown || '—'}` +
          `<em>${esc(T('an.kinds', { k: tiles.length, n: row.ukeire }))}</em></span></div>`;
      }
      body += `<div class="an-row"><span class="an-k">${esc(T('an.danger'))}</span><span class="an-v">${Explain.dangerHtml(row, nameOf)}</span></div>`;
      return head + body;
    },

    /** one or two plain sentences for the voice */
    discardSpeech(row, nameOf) {
      const tile = I18n.tileName(row.t);
      let s;
      if (row.tenpai) {
        const waits = I18n.list(row.tenpai.waits.map(w => I18n.tileName(w.t)));
        s = row.tenpai.value.best
          ? T('say.tenpai', { tile, waits, n: row.tenpai.live, pts: fmt(row.tenpai.value.max) })
          : T('say.tenpaiNoYaku', { tile, waits, n: row.tenpai.live });
      } else {
        s = T('say.shanten', { tile, n: row.shanten, u: row.ukeire });
      }
      if (row.risk) s += ' ' + T('say.danger', { name: nameOf(row.risk.seat), level: T('an.level.' + row.level) });
      return s;
    },

    /** winning now: what the hand pays */
    ronHtml(res, pay, payer, tile) {
      return `<div class="an-head">${TileView.type(tile, 'xs')}<b>${esc(T('an.ron.head'))}</b><span class="an-state ready">${esc(fmt(pay))}</span></div>` +
        `<div class="an-row"><span class="an-k">${esc(T('an.value'))}</span><span class="an-v"><b>${esc(T('an.ronPts', { n: fmt(pay) }))}</b>` +
        `<small>${esc(Explain.yakuList(res))} — ${esc(Explain.size(res))}</small></span></div>` +
        `<div class="an-row"><span class="an-k">${esc(T('an.result'))}</span><span class="an-v">${esc(T('an.ron.result', { name: payer }))}</span></div>`;
    },

    /** letting it go: what the hand is still waiting for, silent and with riichi */
    passHtml(quiet, loud) {
      const line = (tp, key) => tp ? `<div class="an-row"><span class="an-k">${esc(T(key))}</span><span class="an-v">` +
        tp.waits.map(w => `<span class="an-wait">${TileView.type(w.t, 'xs')}<em>×${w.n}</em><small>${w.res ? fmt(w.points) : esc(T('an.noYakuShort'))}</small></span>`).join('') +
        '</span></div>' : '';
      return `<div class="an-head"><b>${esc(T('an.pass.head'))}</b><span class="an-state">${esc(T('an.kinds', { k: quiet.waits.length, n: quiet.live }))}</span></div>` +
        line(quiet, 'an.dama') + line(loud, 'an.withRiichi') +
        `<div class="an-row"><span class="an-k">${esc(T('an.result'))}</span><span class="an-v">${esc(T('an.pass.result'))}</span></div>`;
    },
  };

  /* ------------------------------------------------------------------ */

  const TableBoard = {
    /**
     * A story table: { me, dealer, roundWind, kyoku, dora, wall, seats: [{ who, name, hand, draw, river, riichi, score }] }.
     * `opts.win` (a tile code) lays the hand open with that tile as the winning one.
     */
    html(table, opts) {
      opts = opts || {};
      const me = table.me || 0;
      const wind = s => (s - table.dealer + 4) % 4;
      const nameOf = s => TableBoard.nameOf(table, s);
      const river = (seat, i) => {
        const tiles = Tiles.parse(seat.river || '');
        const cells = tiles.map((t, k) => TileView.type(t, 'rv' + (seat.riichi === k ? ' sideways' : ''))).join('');
        const declared = seat.riichi != null;
        return `<div class="tb-river ${i === me ? 'me' : ''} ${declared ? 'riichi' : ''}">` +
          `<div class="tb-who"><span class="wind-badge ${wind(i) === 0 ? 'dealer' : ''}" lang="ja">${WIND_KANJI[wind(i)]}</span>` +
          `<span class="tb-name">${esc(nameOf(i))}</span>` +
          (seat.score != null ? `<span class="tb-score">${fmt(seat.score)}</span>` : '') +
          (declared ? `<span class="tb-riichi">${esc(T('act.riichi'))}</span>` : '') + '</div>' +
          `<div class="tb-tiles">${cells}</div></div>`;
      };
      // opponents in the order they play after me, then my own pond
      const order = [1, 2, 3].map(k => (me + k) % 4).concat([me]);
      const mine = table.seats[me];
      const hand = Tiles.parse(mine.hand || '').map(t => TileView.type(t, 'th')).join('');
      const extra = opts.win ? `<span class="tb-gap"></span>${TileView.type(Tiles.parse(opts.win)[0], 'th win')}`
        : (mine.draw ? `<span class="tb-gap"></span>${TileView.type(Tiles.parse(mine.draw)[0], 'th drawn')}` : '');
      const dora = Tiles.parse(table.dora || '').map(t => TileView.type(t, 'rv')).join('');
      return `
        <div class="tb">
          <div class="tb-top">
            <div class="tb-info">
              <div class="tb-round">${esc(I18n.roundName(table.roundWind || 0, table.kyoku || 0))}</div>
              <div class="tb-dora"><span>${T('b.doraInd')}</span>${dora}</div>
              ${table.wall != null ? `<div class="tb-wall">${esc(T('b.wall'))} <b>${table.wall}</b></div>` : ''}
            </div>
            <div class="tb-rivers">${order.map(i => river(table.seats[i], i)).join('')}</div>
          </div>
          <div class="tb-hand"><span class="tb-label">${esc(T('tb.hand', { name: nameOf(me) }))}</span><div class="tb-handrow">${hand}${extra}</div></div>
          <div class="tb-decide"></div>
        </div>`;
    },

    nameOf(table, s) {
      const seat = table.seats[s];
      if (seat.name) return P(seat.name);
      return seat.who && Characters[seat.who] ? P(Characters[seat.who].name) : '';
    },
  };

  /* ------------------------------------------------------------------ */

  const Decision = {
    open(host, opts) {
      const discard = opts.kind === 'discard';
      const rowOf = t => opts.rows.find(r => r.t === t);
      const nameOf = opts.nameOf || (() => '');
      let selected = null;

      let pick;
      if (discard) {
        pick = '<div class="dec-hand">' + opts.hand.map((t, i) => {
          const row = rowOf(t);
          const last = i === opts.hand.length - 1 && opts.drawn;
          return `<button class="dec-tile ${last ? 'drawn' : ''}" data-key="${t}" ${row ? '' : 'disabled'} aria-label="${esc(I18n.tileName(t))}">` +
            TileView.type(t, 'dh') + (row ? Explain.badge(row) : '') + '</button>';
        }).join('') + '</div>';
      } else {
        pick = (opts.situation ? `<div class="dec-situation">${opts.situation}</div>` : '') +
          '<div class="dec-choices">' + opts.choices.map(c =>
            `<button class="dec-choice" data-key="${esc(c.key)}"><b>${esc(c.label)}</b>${c.sub ? `<small>${esc(c.sub)}</small>` : ''}</button>`).join('') + '</div>';
      }

      host.innerHTML = `
        <div class="dec" data-kind="${discard ? 'discard' : 'choice'}">
          <div class="dec-head">
            <span class="dec-title">${esc(opts.title || T('an.title'))}</span>
            <button class="btn-ghost dec-voice" data-dec="voice"></button>
          </div>
          ${pick}
          <div class="dec-body">
            <div class="dec-detail"><p class="dec-hint">${esc(T(discard ? 'an.pick' : 'an.pickChoice'))}</p></div>
            <div class="dec-says"></div>
          </div>
          <div class="dec-foot">
            <small>${esc(T('an.estimate'))}</small>
            <button class="btn btn-primary" data-dec="confirm" disabled>${esc(opts.confirmLabel || T(discard ? 'an.confirm.discard' : 'an.confirm'))}</button>
          </div>
        </div>`;
      const el = host.firstElementChild;
      const $ = sel => el.querySelector(sel);

      const voiceLabel = () => {
        const btn = $('[data-dec="voice"]');
        btn.textContent = T('an.voice', { v: T(Voice.enabled ? 'on' : 'off') });
        btn.title = Voice.supported && Voice.available() ? '' : T('an.voiceNone');
        btn.classList.toggle('dim', !(Voice.supported && Voice.available()));
      };
      voiceLabel();

      const describe = key => {
        if (discard) { const row = rowOf(+key); return { html: Explain.discardHtml(row, nameOf), speech: Explain.discardSpeech(row, nameOf) }; }
        const c = opts.choices.find(x => String(x.key) === String(key));
        return { html: c.html, speech: c.speech };
      };

      const show = (key, speak) => {
        const d = describe(key);
        $('.dec-detail').innerHTML = `<div class="an">${d.html}</div>`;
        const lines = (opts.notes ? opts.notes(discard ? +key : key) : []) || [];
        $('.dec-says').innerHTML = lines.map(l => {
          const who = l.who ? Characters[l.who] : null;
          const face = l.who ? `<span class="say-face">${Portraits.avatar(l.who + (l.face ? ':' + l.face : ''))}</span>` : '';
          const text = esc(P(l.text)).replace(/\*([^*]+)\*/g, '<em>$1</em>');
          return `<div class="say ${l.think ? 'think' : ''}">${face}<div class="say-body">` +
            (who ? `<b style="color:${who.color}">${esc(P(who.name))}</b>` : '') +
            `<span>${l.think ? esc(T('vn.thinkOpen')) : ''}${text}${l.think ? esc(T('vn.thinkClose')) : ''}</span></div></div>`;
        }).join('');
        if (speak) Voice.say([{ who: 'narrator', text: d.speech }].concat(lines.map(l => ({ who: l.who, text: P(l.text) }))));
      };

      const select = key => {
        selected = key;
        for (const b of el.querySelectorAll('[data-key]')) b.classList.toggle('sel', b.dataset.key === String(key));
        $('[data-dec="confirm"]').disabled = false;
        show(key, true);
      };

      return new Promise(resolve => {
        const finish = () => {
          Voice.stop();
          el.removeEventListener('click', onClick);
          resolve(discard ? +selected : selected);
        };
        const onClick = e => {
          e.stopPropagation();          // the story screen behind must not take this as "next line"
          const dec = e.target.closest('[data-dec]');
          if (dec) {
            if (dec.dataset.dec === 'voice') {
              Voice.setEnabled(!Voice.enabled);
              voiceLabel();
              if (Voice.enabled && selected != null) show(selected, true);
            } else if (dec.dataset.dec === 'confirm' && selected != null) { Sfx.click(); finish(); }
            return;
          }
          const k = e.target.closest('[data-key]');
          if (!k || k.disabled) return;
          Sfx.unlock(); Sfx.tile();
          select(k.dataset.key);
        };
        el.addEventListener('click', onClick);
        el.addEventListener('pointerover', e => {
          if (e.pointerType && e.pointerType !== 'mouse') return;
          const k = e.target.closest('[data-key]');
          if (k && !k.disabled && k.dataset.key !== String(selected)) show(k.dataset.key, false);
        });
        el.addEventListener('pointerout', e => {
          const k = e.target.closest('[data-key]');
          if (!k || (e.relatedTarget && k.contains(e.relatedTarget))) return;
          if (selected != null) show(selected, false);
        });
      });
    },
  };

  root.Explain = Explain;
  root.TableBoard = TableBoard;
  root.Decision = Decision;
})(window);
