/*
 * Decision scenes: the hand laid out, what each choice leads to, and the
 * commentary on it (shown as text, and spoken through js/voice.js by the
 * characters' recorded voices and the 'guide' voice that reads the analysis).
 *
 *   TableBoard.html(table)           a table seen from one seat (story scenes): ponds, dora, hand
 *   Explain.*                        turn Analysis results into localized text
 *   Decision.open(host, opts)        the interactive panel; resolves with the chosen key
 *       kind 'discard'  opts.hand = tile types (the drawn one last), opts.rows = Analysis.discards(view)
 *                       resolves with the tile type
 *       kind 'choice'   opts.choices = [{ key, label, sub, html, speech: [sentences] }]   resolves with the key
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

    /**
     * The readout of one discard, as sentences for the voice. Nothing in them
     * depends on the random tiles of a match except the danger level, which
     * has its own sentence - so every sentence can be recorded in advance
     * (tools/voice_lines.js enumerates them).
     */
    discardSpeech(row, nameOf) {
      const tile = I18n.tileName(row.t);
      const out = [];
      if (row.tenpai) {
        const waits = I18n.list(row.tenpai.waits.map(w => I18n.tileName(w.t)));
        out.push(row.tenpai.value.best
          ? T('say.tenpai', { tile, waits, pts: fmt(row.tenpai.value.max) })
          : T('say.tenpaiNoYaku', { tile, waits }));
      } else {
        out.push(T('say.shanten', { tile, n: row.shanten }));
      }
      if (row.risk) out.push(Explain.dangerSpeech(nameOf(row.risk.seat), row.level));
      return out;
    },

    dangerSpeech(name, level) { return T('say.danger', { name, level: T('an.level.' + level) }); },

    /** the two answers to a winning tile: take it now, or stay ready */
    ronSpeech(pay, payer) { return [T('say.ron', { pts: fmt(pay), name: payer })]; },
    passSpeech(quiet, best) {
      return [T('say.pass', { waits: I18n.list(quiet.waits.map(w => I18n.tileName(w.t))), pts: fmt(best) })];
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
     * It is drawn as a square mahjong table seen from the player's chair: the four ponds in the middle, each
     * facing the one who threw them, every hand along its own edge (the player's own, larger, below the table)
     * and a name plate in the corner to each player's right.
     * `opts.win` (a tile code) lays the hand open with that tile as the winning one.
     * Washizu mahjong: with `glass: true` every tile is glass, and each seat may add `opaque` (the codes of
     * its opaque tiles) and `melds` (['2222s', ...]). The other seats' hands then show through the glass:
     * glass tiles face up, opaque ones as backs; in the player's own hand the opaque tiles stay ivory.
     * While a hand is being played out (js/story/storystate.js, TableMoves) the table also carries
     * `last` ({ seat }: the newest discard, outlined), `call` ({ seat, kind }: a badge - riichi, pon, kan,
     * ron...), `win` ({ seat, tile, from }: that hand lies open with its winning tile) and `focus`
     * ([{ seat, hand, river }]: the tiles a line is talking about, lit up).
     */
    html(table, opts) {
      opts = opts || {};
      const me = table.me || 0;
      const wind = s => (s - table.dealer + 4) % 4;
      const nameOf = s => TableBoard.nameOf(table, s);
      const glass = table.glass ? ' glass' : '';
      // a seat's hand split into what shows through the glass and the opaque tiles
      const split = seat => {
        const dark = Tiles.parse(seat.opaque || '');
        const shown = [], hidden = [];
        for (const t of Tiles.parse(seat.hand || '')) {
          const k = dark.indexOf(t);
          if (k >= 0) { dark.splice(k, 1); hidden.push(t); } else shown.push(t);
        }
        return { shown, hidden };
      };
      const meldsHtml = (seat, cls) => (seat.melds || []).map(m => `<span class="tb-meld">${Tiles.parse(m).map(t => TileView.type(t, cls + glass)).join('')}</span>`).join('');
      // the tiles a line of the story points at
      const lit = (i, where) => {
        const out = new Set();
        for (const f of table.focus || []) {
          if (f.seat !== i) continue;
          for (const t of Tiles.parse(f[where] || '')) out.add(t);
          if (where === 'hand' && f.opaque) out.add(-1);       // the tiles nobody can see through
        }
        return out;
      };
      const win = table.win || null;

      // the pond in front of a seat: rows of six (the third takes whatever is left)
      const pond = i => {
        const seat = table.seats[i];
        const tiles = Tiles.parse(seat.river || '');
        const glow = lit(i, 'river');
        const newest = table.last && table.last.seat === i ? tiles.length - 1 : -1;
        const cells = tiles.map((t, k) => TileView.type(t, 'qp' + glass + (seat.riichi === k ? ' sideways' : '') +
          (k === newest ? (table.last.win ? ' last hit' : ' last') : '') + (glow.has(t) ? ' focus' : '')));
        return [cells.slice(0, 6), cells.slice(6, 12), cells.slice(12)].map(r => `<div class="tq-row">${r.join('')}</div>`).join('');
      };
      // an opponent's hand, standing along his edge of the table
      const rail = i => {
        const seat = table.seats[i];
        const glowHand = lit(i, 'hand');
        let tiles;
        if (seat.hand && (table.glass || (win && win.seat === i))) {
          // glass shows through; a hand that has won lies open
          const h = split(seat);
          tiles = h.shown.map(t => TileView.type(t, 'qr' + glass + (glowHand.has(t) ? ' focus' : ''))).join('') +
            h.hidden.map(() => TileView.back('qr' + (glowHand.has(-1) ? ' focus' : ''))).join('');
        } else {
          const n = seat.hand ? Tiles.parse(seat.hand).length : 13 - (seat.melds || []).length * 3;
          tiles = new Array(n + 1).join(TileView.back('qr'));
        }
        const won = win && win.seat === i ? `<span class="tb-gap"></span>${TileView.type(Tiles.parse(win.tile)[0], 'qr win' + glass)}` : '';
        return tiles + meldsHtml(seat, 'qr') + won;
      };
      // name, wind, points and what he has just declared - in the corner to each player's right, as on a real table
      const plate = (i, pos) => {
        const seat = table.seats[i];
        const call = table.call && table.call.seat === i ? `<span class="tb-call ${table.call.kind}">${esc(T('tb.call.' + table.call.kind))}</span>` : '';
        return `<div class="tq-plate p-${pos} ${i === me ? 'me' : ''} ${seat.riichi != null ? 'riichi' : ''} ${win && win.seat === i ? 'won' : ''}">` +
          `<div class="tq-who"><span class="wind-badge ${wind(i) === 0 ? 'dealer' : ''}" lang="ja">${WIND_KANJI[wind(i)]}</span><span class="tb-name">${esc(nameOf(i))}</span></div>` +
          (seat.score != null ? `<div class="tb-score">${fmt(seat.score)}</div>` : '') +
          `<div class="tq-tags">${seat.riichi != null ? `<span class="tb-riichi">${esc(T('act.riichi'))}</span>` : ''}${call}</div></div>`;
      };
      const right = (me + 1) % 4, across = (me + 2) % 4, left = (me + 3) % 4;

      const mine = table.seats[me];
      const glowMine = lit(me, 'hand');
      let hand;
      if (table.glass) {
        // in order, the opaque tiles marked where they stand
        const dark = Tiles.parse(mine.opaque || '');
        hand = Tiles.parse(mine.hand || '').map(t => {
          const k = dark.indexOf(t);
          const f = glowMine.has(t) ? ' focus' : '';
          if (k >= 0) { dark.splice(k, 1); return TileView.type(t, 'th opaque' + f); }
          return TileView.type(t, 'th glass' + f);
        }).join('') + meldsHtml(mine, 'th');
      } else {
        hand = Tiles.parse(mine.hand || '').map(t => TileView.type(t, 'th' + (glowMine.has(t) ? ' focus' : ''))).join('') + meldsHtml(mine, 'th');
      }
      const myWin = opts.win || (win && win.seat === me ? win.tile : null);
      const extra = myWin ? `<span class="tb-gap"></span>${TileView.type(Tiles.parse(myWin)[0], 'th win' + glass)}`
        : (mine.draw ? `<span class="tb-gap"></span>${TileView.type(Tiles.parse(mine.draw)[0], 'th drawn' + glass + (glowMine.has(Tiles.parse(mine.draw)[0]) ? ' focus' : ''))}` : '');
      const dora = Tiles.parse(table.dora || '').map(t => TileView.type(t, 'qp' + glass)).join('');
      return `
        <div class="tb tq">
          <div class="tq-table">
            <div class="tq-rail r-top"><div class="tq-railrow">${rail(across)}</div></div>
            <div class="tq-rail r-left"><div class="tq-railrow">${rail(left)}</div></div>
            <div class="tq-rail r-right"><div class="tq-railrow">${rail(right)}</div></div>
            ${plate(across, 'tl')}${plate(right, 'tr')}${plate(left, 'bl')}${plate(me, 'br')}
            <div class="tq-pond d-top"><div class="tq-pondin">${pond(across)}</div></div>
            <div class="tq-pond d-left"><div class="tq-pondin">${pond(left)}</div></div>
            <div class="tq-pond d-right"><div class="tq-pondin">${pond(right)}</div></div>
            <div class="tq-pond d-bottom"><div class="tq-pondin">${pond(me)}</div></div>
            <div class="tq-center">
              <div class="tb-round">${esc(I18n.roundName(table.roundWind || 0, table.kyoku || 0))}</div>
              <div class="tb-dora"><span>${T('b.doraInd')}</span><div class="tq-doras">${dora}</div></div>
              ${table.wall != null ? `<div class="tb-wall">${esc(T('b.wall'))} <b>${table.wall}</b></div>` : ''}
            </div>
          </div>
          <div class="tb-hand"><div class="tb-handrow">${hand}${extra}</div></div>
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
        btn.title = Voice.available() ? '' : T('an.voiceNone');
        btn.classList.toggle('dim', !Voice.available());
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
        if (speak) Voice.say(d.speech.map(text => ({ who: 'guide', text })).concat(lines.map(l => ({ who: l.who, text: P(l.text) }))));
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
