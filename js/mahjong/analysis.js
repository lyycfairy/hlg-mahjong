/*
 * Reading a hand: what each possible discard leads to, and how dangerous it is.
 *
 * Shared by the story's decision scenes, the opening decision of a match and
 * the computer players, so all three reason from the same numbers.
 *
 *   const view = Analysis.viewOfRound(round, seat);      // or Analysis.viewOfTable(table)
 *   Analysis.discards(view)   -> one row per tile type that may be discarded
 *   Analysis.tenpai(view, hand13)  -> waits and their value for a ready hand
 *   Analysis.upgrades(view, hand13) -> draws that would make a ready hand better
 *   Analysis.danger(t, threat, unseen) -> { p, reason }  chance the tile deals in
 *
 * Everything in a view is what the player could really see: the own hand, the
 * ponds, open melds and the dora indicator.
 */
(function (root) {
  'use strict';
  const isNode = typeof module !== 'undefined' && module.exports;
  const Tiles = isNode ? require('./tiles.js') : root.Tiles;
  const Hand = isNode ? require('./hand.js') : root.Hand;
  const Yaku = isNode ? require('./yaku.js') : root.Yaku;

  const typeOf = id => id >> 2;

  /* ------------------------------------------------------------------ */
  /* danger                                                               */

  /**
   * Chance that discarding type `t` deals into `threat`, given that the threat
   * is ready. `threat.safe` is the set of types that cannot deal in (the
   * threat's own discards, and tiles that passed after a riichi).
   * The figures follow the usual ordering of riichi defence: a tile the
   * player threw himself is safe, honours get safer as copies show, and number
   * tiles are sorted by suji ("the tile three away has been thrown") and by
   * how close they are to the middle of the suit.
   */
  function danger(t, threat, unseen) {
    if (threat.safe.has(t)) return { p: 0, reason: 'genbutsu' };
    if (t >= 27) {
      const u = Math.max(0, unseen[t]);
      if (u === 0) return { p: 0.003, reason: 'honorDead' };
      return { p: [0, 0.012, 0.03, 0.055][Math.min(u, 3)], reason: u >= 3 ? 'honorLive' : 'honorSeen' };
    }
    const n = t % 9;
    const lowSafe = n >= 3 && threat.safe.has(t - 3);
    const highSafe = n <= 5 && threat.safe.has(t + 3);
    // a two-sided wait on t needs the two tiles just below it or just above it
    const lowWall = n < 3 || unseen[t - 1] <= 0 || unseen[t - 2] <= 0;
    const highWall = n > 5 || unseen[t + 1] <= 0 || unseen[t + 2] <= 0;
    const lowOut = n < 3 || lowSafe || lowWall;
    const highOut = n > 5 || highSafe || highWall;
    const edge = Math.min(n, 8 - n);            // 0 for 1/9 ... 4 for the 5
    let p, reason;
    if (lowOut && highOut) {
      p = [0.022, 0.04, 0.055, 0.035, 0.03][edge];
      reason = ((n < 3 || lowSafe) && (n > 5 || highSafe)) ? 'suji' : 'wall';
    } else if (lowOut || highOut) {
      if (edge >= 3) { p = 0.085; reason = 'halfSuji'; }
      else { p = [0.06, 0.085, 0.10][edge]; reason = 'live'; }
    } else {
      p = [0.06, 0.085, 0.10, 0.125, 0.125][edge];
      reason = 'live';
    }
    return { p, reason };
  }

  function level(p) {
    if (p <= 0) return 'safe';
    if (p < 0.03) return 'verylow';
    if (p < 0.06) return 'low';
    if (p < 0.095) return 'mid';
    return 'high';
  }

  /* ------------------------------------------------------------------ */
  /* views                                                                */

  function unseenFor(round, seat) {
    const seen = new Array(34).fill(0);
    for (const id of round.players[seat].hand) seen[typeOf(id)]++;
    for (const p of round.players) {
      for (const d of p.discards) if (!d.called) seen[typeOf(d.tile)]++;
      for (const m of p.melds) for (const id of m.tiles) seen[typeOf(id)]++;
    }
    for (const id of round.doraIndicators) seen[typeOf(id)]++;
    // Washizu mahjong: the glass tiles in the other hands are on show too
    if (round.glass) {
      for (const p of round.players) if (p.seat !== seat) for (const id of p.hand) if (round.isGlass(id)) seen[typeOf(id)]++;
    }
    return seen.map(n => 4 - n);
  }

  /** how likely an opponent is ready, judged from the outside */
  function tenpaiGuess(player) {
    if (player.riichi) return 1;
    const k = Math.min(player.discards.length, 17);
    let p = [0, 0, 0.01, 0.02, 0.04, 0.06, 0.09, 0.12, 0.16, 0.2, 0.24, 0.28, 0.32, 0.36, 0.4, 0.43, 0.46, 0.5][k];
    const m = player.melds.length;
    if (m === 1) p *= 1.6;
    else if (m === 2) p = Math.max(0.3, p * 2.5);
    else if (m >= 3) p = Math.max(0.8, p * 3);
    return Math.min(0.95, p);
  }

  /** what a deal-in to this opponent costs on average */
  function lossGuess(round, player) {
    const dealer = player.seat === round.dealer;
    if (player.riichi) return dealer ? 9000 : 6000;
    const doraTypes = round.doraIndicators.map(id => Tiles.doraOf(typeOf(id)));
    let han = 1;
    for (const m of player.melds) {
      const t0 = typeOf(m.tiles[0]);
      for (const id of m.tiles) if (doraTypes.indexOf(typeOf(id)) >= 0) han++;
      if (m.type === 'pon' && (Tiles.isDragon(t0) || t0 === round.seatWind(player.seat) || t0 === round.roundWindTile())) han += 0.5;
    }
    if (!player.melds.length) han = 2.2;   // a silent closed hand
    return Math.max(2000, pointsForHan(han, dealer));
  }

  function viewOfRound(round, seat) {
    const p = round.players[seat];
    const threats = [];
    for (const q of round.players) {
      if (q.seat === seat) continue;
      threats.push({
        seat: q.seat, riichi: q.riichi, dealer: q.seat === round.dealer, safe: q.safe,
        tenpai: tenpaiGuess(q), loss: lossGuess(round, q),
      });
    }
    return {
      seat,
      hand: p.hand.map(typeOf),
      melds: p.melds.map(m => ({ type: m.type, tiles: m.tiles.map(typeOf) })),
      seatWind: round.seatWind(seat),
      roundWind: round.roundWindTile(),
      dealer: seat === round.dealer,
      doraIndicators: round.doraIndicators.map(typeOf),
      unseen: unseenFor(round, seat),
      ownDiscards: p.discardedTypes,
      riichi: p.riichi,
      canRiichi: !p.riichi && p.melds.length === 0 && round.scores[seat] >= 1000 && round.wall.length >= 4,
      drawsLeft: Math.ceil(round.wall.length / 4),
      forbidden: p.forbidden || [],
      threats,
    };
  }

  /**
   * A view built from an authored table (story scenes):
   *   { me: 0, dealer: 1, roundWind: 0, dora: '5s', wall: 30,
   *     seats: [{ hand: '34567m234p4566s7p', draw: '3s', river: '1z9p...', riichi: 8 }, ...] }
   * `riichi` is the index of the discard on which riichi was declared.
   * Throws if the table shows more than four copies of a tile.
   */
  function viewOfTable(table) {
    const me = table.me || 0;
    const seen = new Array(34).fill(0);
    const order = [];   // every discard in the order it happened
    const pos = s => (s - table.dealer + 4) % 4;
    const seats = table.seats.map((s, i) => {
      const river = Tiles.parse(s.river || '');
      river.forEach((t, k) => { seen[t]++; order.push({ seat: i, t, time: k * 4 + pos(i) }); });
      return { river, riichi: s.riichi == null ? -1 : s.riichi };
    });
    const mine = table.seats[me];
    const hand = Tiles.parse(mine.hand || '').concat(Tiles.parse(mine.draw || ''));
    for (const t of hand) seen[t]++;
    const dora = Tiles.parse(table.dora || '');
    for (const t of dora) seen[t]++;
    // melds are on the table for all to see; with glass tiles, so is most of every other hand
    table.seats.forEach((s, i) => {
      for (const m of s.melds || []) for (const t of Tiles.parse(m)) seen[t]++;
      if (i === me) return;
      if (!table.glass) return;
      const dark = Tiles.parse(s.opaque || '');
      for (const t of Tiles.parse(s.hand || '')) {
        const k = dark.indexOf(t);
        if (k >= 0) dark.splice(k, 1); else seen[t]++;
      }
    });
    for (let t = 0; t < 34; t++) if (seen[t] > 4) throw new Error('table shows ' + seen[t] + ' copies of ' + Tiles.code(t));

    const threats = [];
    seats.forEach((s, i) => {
      if (i === me) return;
      const safe = new Set(s.river);
      const declared = s.riichi >= 0;
      if (declared) {
        const at = s.riichi * 4 + pos(i);
        for (const d of order) if (d.time > at) safe.add(d.t);
      }
      const dealer = i === table.dealer;
      threats.push({
        seat: i, riichi: declared, dealer, safe,
        tenpai: declared ? 1 : tenpaiGuess({ riichi: false, discards: s.river, melds: [] }),
        loss: declared ? (dealer ? 9000 : 6000) : pointsForHan(2.2, dealer),
      });
    });
    return {
      seat: me,
      hand,
      melds: [],
      seatWind: 27 + pos(me),
      roundWind: 27 + (table.roundWind || 0),
      dealer: me === table.dealer,
      doraIndicators: dora,
      unseen: seen.map(n => 4 - n),
      ownDiscards: new Set(seats[me].river),
      riichi: seats[me].riichi >= 0,
      canRiichi: seats[me].riichi < 0 && (table.wall == null || table.wall >= 4),
      drawsLeft: Math.ceil((table.wall == null ? 40 : table.wall) / 4),
      forbidden: [],
      threats,
    };
  }

  /* ------------------------------------------------------------------ */
  /* value                                                                */

  const HAN_TABLE = [0, 1000, 2000, 3900, 7700, 8000, 12000, 12000, 16000, 16000, 16000, 24000, 24000, 32000];

  /** rough ron value of a hand with `han` han (30 fu), fractional han interpolated */
  function pointsForHan(han, dealer) {
    const h = Math.max(0, Math.min(13, han));
    const lo = Math.floor(h), hi = Math.min(13, lo + 1);
    const v = HAN_TABLE[lo] + (HAN_TABLE[hi] - HAN_TABLE[lo]) * (h - lo);
    return v * (dealer ? 1.5 : 1);
  }

  function winContext(view, concealed, winTile, tsumo, riichi) {
    return {
      concealed, melds: view.melds, winTile, tsumo,
      riichi, doubleRiichi: false, ippatsu: false, haitei: false, houtei: false, tenhou: false, chiihou: false,
      seatWind: view.seatWind, roundWind: view.roundWind,
      doraIndicators: view.doraIndicators, uraIndicators: [],
    };
  }

  const ronPay = (res, dealer) => Yaku.payments(res.base, dealer, false, 0).ron;
  const tsumoPay = (res, dealer) => Yaku.payments(res.base, dealer, true, 0).total;

  /**
   * Waits of a ready 13-tile hand (given as tile types) and what each pays.
   * `riichi` says whether to count the hand as declared.
   */
  function tenpai(view, hand13, riichi) {
    const counts = Tiles.counts(hand13);
    const closed = view.melds.length === 0;
    const waits = [];
    let furiten = false, live = 0, liveRon = 0, sum = 0, max = 0, min = Infinity, best = null;
    for (const t of Hand.waits(counts, view.melds.length)) {
      const n = Math.max(0, view.unseen[t]);
      if (view.ownDiscards.has(t)) furiten = true;
      const res = Yaku.evaluate(winContext(view, hand13.concat([t]), t, false, riichi));
      const resT = Yaku.evaluate(winContext(view, hand13.concat([t]), t, true, riichi));
      const points = res ? ronPay(res, view.dealer) : 0;
      waits.push({ t, n, points, res, tsumo: resT ? tsumoPay(resT, view.dealer) : 0, resTsumo: resT });
      live += n;
      if (res) {
        liveRon += n; sum += n * points;
        if (points > max) { max = points; best = res; }
        if (points < min) min = points;
      }
    }
    if (!waits.length) return null;
    if (min === Infinity) min = 0;
    return {
      waits, live, liveRon, furiten, riichi: !!riichi, closed,
      // some waits may complete the shape without any scoring pattern
      yakuless: waits.some(w => !w.res),
      value: { avg: liveRon ? sum / liveRon : (max || 0), max, min, best },
    };
  }

  /* ------------------------------------------------------------------ */
  /* discards                                                             */

  function acceptance(counts, melds, unseen, shanten) {
    const list = [];
    let total = 0;
    for (let x = 0; x < 34; x++) {
      if (counts[x] >= 4) continue;
      counts[x]++;
      const better = Hand.shanten(counts, melds) < shanten;
      counts[x]--;
      if (better) { const n = Math.max(0, unseen[x]); list.push({ t: x, n }); total += n; }
    }
    return { list, total };
  }

  /**
   * One row per distinct tile type that can be discarded from a 14-tile hand:
   *   { t, shanten, ukeire, accepts, tenpai (see tenpai()), risks, risk, level }
   * `risk` is the most dangerous threat for that tile; `level` is its label
   * ('safe' | 'verylow' | 'low' | 'mid' | 'high'), or 'none' when nobody threatens.
   */
  function discards(view) {
    const counts = Tiles.counts(view.hand);
    const melds = view.melds.length;
    const rows = [];
    const done = new Set();
    const active = view.threats.filter(th => th.riichi || th.tenpai >= 0.3);
    for (const t of view.hand) {
      if (done.has(t) || view.forbidden.indexOf(t) >= 0) continue;
      done.add(t);
      counts[t]--;
      const shanten = Hand.shanten(counts, melds);
      const acc = acceptance(counts, melds, view.unseen, shanten);
      const rest = view.hand.slice();
      rest.splice(rest.indexOf(t), 1);
      const row = { t, shanten, ukeire: acc.total, accepts: acc.list, tenpai: null, risks: [], risk: null, level: 'none' };
      if (shanten === 0) {
        const declare = view.riichi || (view.canRiichi && melds === 0);
        row.tenpai = tenpai(view, rest, declare);
        row.dama = declare && !view.riichi ? tenpai(view, rest, false) : null;
      }
      counts[t]++;
      for (const th of active) {
        const d = danger(t, th, view.unseen);
        const r = { seat: th.seat, p: d.p, reason: d.reason, riichi: th.riichi, loss: th.loss, cost: th.tenpai * d.p * th.loss };
        row.risks.push(r);
        if (!row.risk || r.p > row.risk.p) row.risk = r;
      }
      if (row.risk) row.level = level(row.risk.p);
      row.dora = view.doraIndicators.some(i => Tiles.doraOf(i) === t);
      rows.push(row);
    }
    return rows;
  }

  /**
   * For a ready 13-tile hand: which draws would turn it into something better.
   * Returns [{ draw, n, discard, tenpai }] sorted by how much the hand gains,
   * where `tenpai` describes the improved hand after `discard`.
   */
  function upgrades(view, hand13, riichi) {
    const base = tenpai(view, hand13, riichi);
    const baseScore = base ? base.liveRon * base.value.avg : 0;
    const out = [];
    for (let x = 0; x < 34; x++) {
      const n = Math.max(0, view.unseen[x]);
      if (!n) continue;
      const hand14 = hand13.concat([x]);
      if (Hand.isAgari(Tiles.counts(hand14), view.melds.length)) continue;   // that is simply a win
      let bestRow = null;
      const seen = new Set();
      for (const t of hand14) {
        if (seen.has(t) || t === x) continue;
        seen.add(t);
        const rest = hand14.slice();
        rest.splice(rest.indexOf(t), 1);
        // looking one draw ahead, the tile that has just been seen is no longer in the wall
        const v2 = Object.assign({}, view, { unseen: view.unseen.map((u, i) => (i === x ? u - 1 : u)) });
        const tp = tenpai(v2, rest, riichi);
        if (!tp || tp.furiten) continue;
        const score = tp.liveRon * tp.value.avg;
        if (!bestRow || score > bestRow.score) bestRow = { draw: x, n, discard: t, tenpai: tp, score };
      }
      if (bestRow && bestRow.score > baseScore * 1.15 && bestRow.tenpai.value.max >= (base ? base.value.max : 0)) out.push(bestRow);
    }
    out.sort((a, b) => b.score - a.score);
    return out;
  }

  const Analysis = {
    danger, level, unseenFor, tenpaiGuess, lossGuess, pointsForHan,
    viewOfRound, viewOfTable, tenpai, discards, upgrades, acceptance,
  };
  if (isNode) module.exports = Analysis;
  else root.Analysis = Analysis;
})(typeof window !== 'undefined' ? window : globalThis);
