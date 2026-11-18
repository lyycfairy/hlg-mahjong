/*
 * What a story scene keeps track of besides its text - pure functions, so the visual-novel engine
 * (js/story/vn.js) and the tests (tests/story.test.js) run the very same rules.
 *
 *   TableMoves.apply(table, move)   play one move on a story table (the format of js/ui/decision.js,
 *                                   TableBoard): the hand, pond, melds and dora change in place.
 *                                   Throws when the move is impossible (a tile nobody holds).
 *       { seat, draw: '5s' }                    a tile comes to the hand (opaque: true = the opaque copy)
 *       { seat, discard: '7s', riichi: true }   thrown from the hand, or the drawn tile if it is that one
 *       { seat, pon: '1z', from: 1 }            the last tile of `from`'s pond is taken with two from the hand
 *       { seat, chi: '456m', from: 3 }          likewise, into the run named
 *       { seat, kan: '2s' }                     four from the hand; with `from`, three and the pond tile
 *       { dora: '1s' }                          one more dora indicator is turned up
 *       { seat, ron: '5p', from: 2 }  { seat, tsumo: '8p' }   the hand is won and laid open
 *       { seat, reveal: true }                  the opaque tiles of a hand are turned face up
 *
 *   Stakes.apply(state, cmd)        Washizu mahjong's ledger: { blood, lethal, funds, won }
 *       { stakes: {...} | false }   set it (or put it away)
 *       { bleed: 400 }              that much of Akagi's blood is drawn
 *       { pay: 2600000 }            Washizu pays Akagi
 *       { transfuse: 600, cost }    blood bought back out of the winnings
 */
(function (root) {
  'use strict';
  const isNode = typeof module !== 'undefined' && module.exports;
  const Tiles = isNode ? require('../mahjong/tiles.js') : root.Tiles;

  const parse = s => Tiles.parse(s || '');
  const str = types => types.map(t => Tiles.code(t)).join('');
  const one = code => {
    const t = parse(code);
    if (t.length !== 1) throw new Error('expected one tile, got "' + code + '"');
    return t[0];
  };
  const sorted = types => types.slice().sort((a, b) => a - b);

  /** take one `t` out of a tile string; throws if it is not there */
  function take(s, t, what) {
    const types = parse(s);
    const k = types.indexOf(t);
    if (k < 0) throw new Error(what + ': no ' + Tiles.code(t) + ' in "' + s + '"');
    types.splice(k, 1);
    return str(types);
  }
  const has = (s, t) => parse(s).indexOf(t) >= 0;
  const count = (s, t) => parse(s).filter(x => x === t).length;

  const TableMoves = {
    apply(table, m) {
      const me = table.me || 0;
      delete table.call;
      if (m.dora) {
        table.dora = (table.dora || '') + Tiles.code(one(m.dora));
        return { kind: 'dora' };
      }
      const seat = table.seats[m.seat];
      if (!seat) throw new Error('move without a seat: ' + JSON.stringify(m));
      const who = 'seat ' + m.seat;
      // the player's own drawn tile lies apart from the hand until he discards
      const settle = () => {
        if (seat.draw) { seat.hand = str(sorted(parse(seat.hand).concat(parse(seat.draw)))); delete seat.draw; }
      };
      // an opaque tile leaves the hand: forget it (the glass copies go first unless the move says otherwise)
      const forget = (t, wantOpaque) => {
        if (!has(seat.opaque, t)) return;
        if (wantOpaque || count(seat.hand, t) + count(seat.draw, t) < count(seat.opaque, t)) seat.opaque = take(seat.opaque, t, who);
      };

      if (m.draw) {
        const t = one(m.draw);
        settle();
        if (m.seat === me) seat.draw = Tiles.code(t);
        else seat.hand = str(sorted(parse(seat.hand).concat([t])));
        if (m.opaque) seat.opaque = (seat.opaque || '') + Tiles.code(t);
        if (table.wall != null) table.wall--;
        return { kind: 'draw', seat: m.seat, tile: t };
      }

      if (m.discard) {
        const t = one(m.discard);
        if (seat.draw && one(seat.draw) === t && !(m.fromHand && has(seat.hand, t))) delete seat.draw;
        else { seat.hand = take(seat.hand, t, who + ' discards'); settle(); }
        forget(t, m.opaque);
        seat.river = (seat.river || '') + Tiles.code(t);
        if (m.riichi) seat.riichi = parse(seat.river).length - 1;
        table.last = { seat: m.seat };
        if (m.riichi) table.call = { seat: m.seat, kind: 'riichi' };
        return { kind: m.riichi ? 'riichi' : 'discard', seat: m.seat, tile: t };
      }

      // a call: the last tile of the discarder's pond is taken up
      const called = (t) => {
        const from = table.seats[m.from];
        const pond = parse(from && from.river);
        if (!pond.length || pond[pond.length - 1] !== t) throw new Error(who + ' calls ' + Tiles.code(t) + ', which is not the last tile of seat ' + m.from + "'s pond");
        pond.pop();
        from.river = str(pond);
        if (from.riichi != null && from.riichi >= pond.length) from.riichi = Math.max(0, pond.length - 1);
        table.last = null;
      };

      if (m.pon) {
        const t = one(m.pon);
        settle();
        called(t);
        seat.hand = take(take(seat.hand, t, who + ' pons'), t, who + ' pons');
        forget(t); forget(t);
        (seat.melds = seat.melds || []).push(str([t, t, t]));
        table.call = { seat: m.seat, kind: 'pon' };
        return { kind: 'pon', seat: m.seat, tile: t };
      }

      if (m.chi) {
        const run = parse(m.chi);
        if (run.length !== 3) throw new Error('a chi names its three tiles');
        const pond = parse(table.seats[m.from].river);
        const t = pond[pond.length - 1];
        settle();
        called(t);
        const rest = run.slice(); rest.splice(rest.indexOf(t), 1);
        for (const x of rest) { seat.hand = take(seat.hand, x, who + ' chis'); forget(x); }
        (seat.melds = seat.melds || []).push(str(sorted(run)));
        table.call = { seat: m.seat, kind: 'chi' };
        return { kind: 'chi', seat: m.seat, tile: t };
      }

      if (m.kan) {
        const t = one(m.kan);
        settle();
        const fromHand = m.from == null ? 4 : 3;
        if (m.from != null) called(t);
        for (let k = 0; k < fromHand; k++) { seat.hand = take(seat.hand, t, who + ' kans'); }
        if (has(seat.opaque, t)) seat.opaque = take(seat.opaque, t, who);
        (seat.melds = seat.melds || []).push(str([t, t, t, t]));
        table.call = { seat: m.seat, kind: 'kan' };
        return { kind: 'kan', seat: m.seat, tile: t };
      }

      if (m.ron || m.tsumo) {
        const t = one(m.ron || m.tsumo);
        if (m.ron) {
          const pond = parse(table.seats[m.from].river);
          if (pond[pond.length - 1] !== t) throw new Error(who + ' rons ' + Tiles.code(t) + ', which seat ' + m.from + ' did not just throw');
          table.last = { seat: m.from, win: true };
        } else if (m.seat === me) {
          if (!seat.draw || one(seat.draw) !== t) throw new Error(who + ' did not draw the ' + Tiles.code(t) + ' he wins on');
          delete seat.draw;
        } else {
          seat.hand = take(seat.hand, t, who + ' tsumo');
        }
        delete seat.opaque;                 // the hand is laid open
        table.win = { seat: m.seat, tile: Tiles.code(t), from: m.ron ? m.from : null };
        table.call = { seat: m.seat, kind: m.ron ? 'ron' : 'tsumo' };
        return { kind: m.ron ? 'ron' : 'tsumo', seat: m.seat, tile: t };
      }

      if (m.reveal) {
        delete seat.opaque;
        return { kind: 'reveal', seat: m.seat };
      }
      throw new Error('unknown table move: ' + JSON.stringify(m));
    },

    /** every tile a seat holds: hand, drawn tile and melds (the winning tile is not among them) */
    tilesOf(table, s) {
      const seat = table.seats[s];
      return {
        concealed: parse(seat.hand).concat(parse(seat.draw)),
        melds: (seat.melds || []).map(parse),
      };
    },
  };

  const Stakes = {
    /** a new ledger from a script's { blood, lethal, funds, won } */
    make(v) {
      return { blood: v.blood || 0, lethal: v.lethal || 2000, funds: v.funds || 0, won: v.won || 0 };
    },
    /** the ledger after a script command (null = put away); never changes `state` itself */
    apply(state, cmd) {
      let s = state ? Object.assign({}, state) : null;
      if (cmd.stakes !== undefined) s = cmd.stakes ? Object.assign(s || Stakes.make({}), cmd.stakes) : null;
      if (!s) return s;
      if (cmd.bleed) s.blood += cmd.bleed;
      if (cmd.pay) { s.funds -= cmd.pay; s.won += cmd.pay; }
      if (cmd.transfuse) { s.blood = Math.max(0, s.blood - cmd.transfuse); s.won -= cmd.cost || 0; s.funds += cmd.cost || 0; }
      return s;
    },
    /** what a cleared match leaves behind: its blood meter, and what Washizu paid in it */
    afterBattle(state, stage, final) {
      if (!state || !final) return state;
      const s = Object.assign({}, state);
      if (final.blood) s.blood = final.blood.drawn;
      if (final.money && stage && stage.money) {
        const paid = stage.money.funds - final.money.funds;
        s.funds -= paid; s.won += paid;
      }
      return s;
    },
    dead: s => !!s && s.blood >= s.lethal,
    left: s => Math.max(0, s.lethal - s.blood),
  };

  const api = { TableMoves, Stakes };
  if (isNode) module.exports = api;
  else { root.TableMoves = TableMoves; root.Stakes = Stakes; }
})(typeof window !== 'undefined' ? window : globalThis);
