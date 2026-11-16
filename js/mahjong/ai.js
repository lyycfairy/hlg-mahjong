/*
 * Computer opponents.
 *
 *   AI.create({ style, level, ally, signal, rng }) -> agent
 *
 * Every computer player reasons the same way and differs only in temperament.
 * For each tile it could throw, it works out
 *   - how far the hand would be from ready and how many live tiles improve it,
 *   - what the hand is worth (exactly, with the real scoring code, once ready;
 *     from its dora and scoring patterns in reach before that),
 *   - the chance of winning in the turns that are left,
 *   - the chance the tile deals in, and what that would cost,
 * and throws the tile with the best balance. Folding is not a separate mode:
 * a hand that is far from winning simply stops being worth a dangerous tile.
 * Calls (pon / chi) are judged by the same yardstick - is the opened hand worth
 * more than the closed one?
 *
 * style
 *   'aggressor'     attacks: values his own hand highly, shrugs at danger, always declares
 *                   riichi, opens his hand readily
 *   'independent'   plays his own game by the numbers: balanced attack and defence, and
 *                   plays for his final placing in the last hand
 *   'collaborator'  plays for a team-mate (`ally`, a seat). He never wins off the ally, is
 *                   never afraid of the ally's riichi, throws tiles the ally can call, and
 *                   when an enemy threatens - or the ally holds a big hand - deals the ally's
 *                   winning tile on purpose. `signal` (0..1) is how reliably the two pass
 *                   signals, i.e. how often he knows what the ally holds; `feed` (0..1) is
 *                   how readily he gives up a big hand to the ally when nobody threatens.
 * level   0..1  how often the best discard is found (below 1 the player blunders now and then)
 *
 * A computer player sees only what a human could see: its own hand, the ponds,
 * open melds and the dora indicator - plus the ally's hand for a collaborator
 * passing signals, and the hands a skill lets it read (see skills.js).
 */
(function (root) {
  'use strict';
  const isNode = typeof module !== 'undefined' && module.exports;
  const Tiles = isNode ? require('./tiles.js') : root.Tiles;
  const Hand = isNode ? require('./hand.js') : root.Hand;
  const Yaku = isNode ? require('./yaku.js') : root.Yaku;
  const Analysis = isNode ? require('./analysis.js') : root.Analysis;

  const typeOf = id => id >> 2;

  const STYLES = {
    aggressor:    { attack: 1.4,  caution: 0.55, callMargin: 0.0,  riichi: 1.0,  big: 1.15, greed: 0.85 },
    independent:  { attack: 1.0,  caution: 1.0,  callMargin: 0.12, riichi: 0.95, big: 1.0,  greed: 0.65 },
    collaborator: { attack: 0.75, caution: 1.2,  callMargin: 0.2,  riichi: 0.7,  big: 1.0,  greed: 0.6 },
  };

  const isValueHonor = (round, seat, t) => Tiles.isDragon(t) || t === round.seatWind(seat) || t === round.roundWindTile();

  /** tie-breaker: how much a tile is worth holding on to when all else is equal */
  function keepValue(round, seat, t, counts) {
    if (t >= 27) return (isValueHonor(round, seat, t) ? 2 : 0) + (counts[t] >= 2 ? 4 : 0);
    return [1, 2, 3, 3.2, 3.3, 3.2, 3, 2, 1][t % 9];
  }

  const TYPICAL = [5, 16, 28, 36];   // live tiles that usually improve a hand that is ready / 1 / 2 / 3 away

  /**
   * Chance of winning from here. A small chain: far -> one away -> ready -> won,
   * stepped once per remaining turn. `acc[k]` is the number of live tiles that
   * advance a hand that is k steps from ready (acc[0] = winning tiles).
   * Every turn somebody else may win first; `race(j)` is that chance on the
   * j-th turn from now, which is what makes a fast cheap hand worth having.
   */
  function winChance(sh, acc, unseenTotal, turns, ronFactor, speed, race) {
    if (turns <= 0 || unseenTotal <= 0) return 0;
    const p0 = Math.min(1, acc[0] / unseenTotal);
    const q0 = 1 - (1 - p0) * Math.pow(1 - Math.min(1, ronFactor * p0), 3);   // own draw, or one of three discards
    const p1 = Math.min(1, acc[1] / unseenTotal * speed);
    const p2 = Math.min(1, acc[2] / unseenTotal * speed);
    const p3 = Math.min(1, acc[3] / unseenTotal * speed);
    let w0 = 0, w1 = 0, w2 = 0, w3 = 0;
    // from the last turn back to this one
    for (let j = turns - 1; j >= 0; j--) {
      const live = 1 - (race ? race(j) : 0);
      const n0 = q0 + (1 - q0) * live * w0;
      const n1 = live * (p1 * w0 + (1 - p1) * w1);
      const n2 = live * (p2 * w1 + (1 - p2) * w2);
      const n3 = live * (p3 * w2 + (1 - p3) * w3);
      w0 = n0; w1 = n1; w2 = n2; w3 = n3;
    }
    if (sh <= 0) return w0;
    if (sh === 1) return w1;
    if (sh === 2) return w2;
    return w3 * Math.pow(0.45, sh - 3);
  }

  /**
   * What an unfinished hand is likely to be worth: its dora plus the scoring
   * patterns within reach. An open hand with no pattern in sight is worth
   * nothing, which is what keeps the AI from calling itself into a dead hand.
   * counts: concealed tiles (types); melds: [{ type, tiles:[types] }]
   */
  function estimate(env, counts, melds) {
    const open = melds.length > 0;
    let dora = 0, honors = 0, yaochuHand = 0, total = 0;
    const suit = [0, 0, 0];
    for (let t = 0; t < 34; t++) {
      const c = counts[t];
      if (!c) continue;
      total += c;
      if (t >= 27) honors += c; else suit[(t / 9) | 0] += c;
      if (Tiles.isYaochu(t)) yaochuHand += c;
    }
    let meldYaochu = false, allPon = true;
    const meldSuit = [0, 0, 0];
    let meldHonors = 0;
    for (const m of melds) {
      if (m.type !== 'pon') allPon = false;
      for (const x of m.tiles) {
        if (Tiles.isYaochu(x)) meldYaochu = true;
        if (x >= 27) meldHonors++; else meldSuit[(x / 9) | 0]++;
      }
    }
    for (const d of env.doraTypes) {
      dora += counts[d];
      for (const m of melds) for (const x of m.tiles) if (x === d) dora++;
    }

    const routes = [];   // { han, prob }
    for (let t = 27; t < 34; t++) {
      if (!isValueHonor(env.round, env.seat, t)) continue;
      const han = (t === env.seatWind && t === env.roundWind) ? 2 : 1;
      if (melds.some(m => m.type === 'pon' && m.tiles[0] === t) || counts[t] >= 3) routes.push({ han, prob: 1 });
      else if (counts[t] === 2 && env.unseen[t] > 0) routes.push({ han, prob: open ? 0.5 : 0.35 });
    }
    if (!meldYaochu) {
      if (yaochuHand === 0) routes.push({ han: 1, prob: 0.9 });
      else if (yaochuHand <= 2 && env.turn <= 10) routes.push({ han: 1, prob: yaochuHand === 1 ? 0.45 : 0.2 });
    }
    const all = total + melds.length * 3;
    for (let s = 0; s < 3; s++) {
      if (meldSuit[(s + 1) % 3] || meldSuit[(s + 2) % 3]) continue;
      const inSuit = suit[s] + meldSuit[s] + honors + meldHonors;
      const off = all - inSuit;
      const pure = honors + meldHonors === 0;
      if (off === 0) routes.push({ han: pure ? (open ? 5 : 6) : (open ? 2 : 3), prob: 0.95 });
      else if (off <= 2 && inSuit >= 9) routes.push({ han: open ? 2 : 3, prob: off === 1 ? 0.5 : 0.25 });
    }
    if (open && allPon) {
      let pairs = 0;
      for (let t = 0; t < 34; t++) if (counts[t] >= 2) pairs++;
      if (pairs + melds.length >= 4) routes.push({ han: 2, prob: 0.4 });
    }

    let sum = 0, none = 1;
    for (const r of routes) { sum += r.han * r.prob; none *= 1 - r.prob; }
    let han, pYaku;
    if (!open) { han = 1.5 + sum; pYaku = 1; }           // riichi is always there for a closed hand
    else { pYaku = 1 - none; han = pYaku > 0 ? Math.max(1, sum / pYaku) : 0; }
    return { value: pYaku * Analysis.pointsForHan(han + dora, env.dealer), pYaku };
  }

  /** everything the player knows about the table, gathered once per decision */
  function environment(round, seat, P) {
    const p = round.players[seat];
    const view = Analysis.viewOfRound(round, seat);
    const board = round.skills || null;
    const reads = board ? board.reads(round, seat) : [];
    let unseenTotal = 0;
    for (const u of view.unseen) unseenTotal += Math.max(0, u);
    const threats = [];
    for (const th of view.threats) {
      if (P.style === 'collaborator' && th.seat === P.ally) continue;   // the ally is never a threat
      const q = round.players[th.seat];
      const t = { seat: th.seat, safe: th.safe, tenpai: th.tenpai, loss: th.loss, riichi: th.riichi, exact: null, weight: 1 };
      if (reads.indexOf(th.seat) >= 0) {
        // a skill shows this hand for what it is: the tiles that deal in, and their price
        t.exact = {};
        for (const w of round.waitsOf(th.seat)) {
          const res = round.ronResult(th.seat, w * 4);
          if (res) t.exact[w] = Yaku.payments(res.base, th.seat === round.dealer, false, round.honba).ron;
        }
        t.tenpai = Object.keys(t.exact).length ? 1 : 0;
      }
      if (board && board.ignores(seat, th.seat)) t.weight = 0.2;        // "he is only a beginner"
      if (q.riichi || t.exact || t.tenpai >= 0.3) threats.push(t);    // a quiet closed hand is not worth fearing yet
    }
    const doraTypes = round.doraIndicators.map(id => Tiles.doraOf(typeOf(id)));
    // how likely the hand is to end in somebody else's favour on a given turn from now:
    // hands rarely end early, often end around the middle, and a declared riichi speeds that up
    const turnNow = p.discards.length;
    let declared = 0;
    for (const th of threats) if (th.riichi) declared += th.weight;
    const race = j => Math.min(0.3, Math.max(0, 0.0096 * (turnNow + j - 3)) + 0.05 * declared);
    return {
      race,
      round, seat, view, threats, doraTypes, unseenTotal,
      unseen: view.unseen,
      seatWind: view.seatWind, roundWind: view.roundWind, dealer: view.dealer,
      turn: p.discards.length,
      turnsLeft: Math.ceil(round.wall.length / 4),
    };
  }

  /** expected cost of throwing type t; `certain` when a read hand is known to win on it */
  function riskOf(env, t) {
    let cost = 0, certain = false;
    for (const th of env.threats) {
      if (th.exact) {
        if (th.exact[t]) { cost += th.exact[t] * th.weight; certain = true; }
      } else {
        cost += th.tenpai * Analysis.danger(t, th, env.unseen).p * th.loss * th.weight;
      }
    }
    if (cost > 0 && env.doraTypes.indexOf(t) >= 0) cost *= 1.25;
    return { cost, certain };
  }

  /**
   * Look at a hand of 13 - 3*melds concealed tiles (as counts): how far from
   * ready, how many live tiles advance it, what it is worth. `tp` is the exact
   * tenpai reading when the hand is ready.
   */
  function inspect(env, counts, melds, willRiichi) {
    const m = melds.length;
    const sh = Hand.shanten(counts, m);
    const open = m > 0;
    let acc, value, tp = null, ronFactor;
    if (sh === 0) {
      const hand = [];
      for (let t = 0; t < 34; t++) for (let k = 0; k < counts[t]; k++) hand.push(t);
      const v = Object.assign({}, env.view, { melds });
      tp = Analysis.tenpai(v, hand, !open && willRiichi);
    }
    if (tp) {
      // a wait with no scoring pattern can still be drawn by a closed hand; a furiten hand can only draw
      acc = tp.liveRon + (tp.closed ? (tp.live - tp.liveRon) * 0.3 : 0);
      if (tp.furiten) acc = tp.live * 0.3;
      value = tp.value.avg || (tp.closed ? 1500 : 0);
      ronFactor = tp.riichi ? 0.5 : (open ? 0.8 : 0.9);
    } else if (sh === 0) {
      acc = 0; value = 0; ronFactor = 0.6;      // "ready" only on tiles that no longer exist
    } else {
      acc = Analysis.acceptance(counts, m, env.unseen, sh).total;
      value = estimate(env, counts, melds).value;
      ronFactor = open ? 0.8 : 0.6;
    }
    return { sh, acc, value, tp, open, ronFactor };
  }

  /**
   * Attack score of an inspected hand. `known[k]` is the best acceptance the
   * player can already have at k steps from ready (from the other discards on
   * offer); stages nobody has reached yet use typical figures. Because a hand
   * that steps back has to pass a stage it could have kept, it never outranks
   * the efficient discard on speed alone - only on safety or value.
   */
  function rate(env, a, style, known) {
    const acc = TYPICAL.slice();
    if (known) for (let k = 0; k < 4; k++) if (known[k] >= 1) acc[k] = known[k];
    acc[Math.min(a.sh, 3)] = a.acc;
    a.chance = winChance(a.sh, acc, env.unseenTotal, env.turnsLeft, a.ronFactor, a.open ? 1.35 : 1, env.race);
    // `greed` says how much the size of the hand counts next to the chance of winning it at all
    let score = a.chance * Math.pow(a.value, style.greed) * Math.pow(4000, 1 - style.greed) * style.attack;
    if (a.value >= 7700) score *= style.big;
    // being ready when the wall runs out is worth something too
    if (a.sh === 0) score += 900 * (env.turnsLeft <= 4 ? 1 : 0.35);
    else if (a.sh === 1) score += 150;
    a.score = score;
    return a;
  }

  const appraise = (env, counts, melds, style, willRiichi) => rate(env, inspect(env, counts, melds, willRiichi), style, null);

  function create(params) {
    const P = Object.assign({ style: 'independent', level: 1, ally: null, signal: 1, feed: 0.5 }, params || {});
    if (params && params.level == null && params.efficiency != null) P.level = params.efficiency;   // older configs
    if (!STYLES[P.style]) P.style = 'independent';
    const rng = P.rng || Math.random;
    const base = STYLES[P.style];

    /** temperament for this decision, adjusted for the standings in the last hand */
    function mood(round, seat) {
      const style = Object.assign({}, base);
      if (round.last && P.level >= 0.8 && P.style !== 'aggressor') {
        const mine = round.scores[seat];
        let top = -Infinity;
        for (let s = 0; s < 4; s++) if (s !== seat) top = Math.max(top, round.scores[s]);
        if (mine > top + 8000) { style.caution *= 1.5; style.riichi *= 0.5; }       // protect the lead
        else if (mine < top) style.attack *= 1.25;                                 // nothing to protect
      }
      return style;
    }

    function meldsOf(p) {
      return p.melds.map(m => ({ type: m.type, tiles: m.tiles.map(typeOf) }));
    }

    function onTurn(round, seat, opts) {
      if (opts.canTsumo) return { type: 'tsumo' };
      const p = round.players[seat];
      if (p.riichi) return { type: 'discard', tile: p.drawn, riichi: false };

      const style = mood(round, seat);
      const env = environment(round, seat, P);
      const counts = Tiles.counts(p.hand.map(typeOf));
      const melds = meldsOf(p);
      const riichiTypes = new Set(opts.riichiDiscards.map(typeOf));

      const cands = [];
      const done = new Set();
      for (const id of p.hand) {
        const t = typeOf(id);
        if (done.has(t) || opts.forbidden.indexOf(t) >= 0) continue;
        done.add(t);
        counts[t]--;
        const a = inspect(env, counts, melds, riichiTypes.has(t));
        const keep = keepValue(round, seat, t, counts);
        counts[t]++;
        cands.push({ id, t, a, keep, risk: riskOf(env, t) });
      }
      const known = [0, 0, 0, 0];
      for (const c of cands) if (c.a.sh >= 0 && c.a.sh <= 3) known[c.a.sh] = Math.max(known[c.a.sh], c.a.acc);
      for (const c of cands) {
        rate(env, c.a, style, known);
        // a tile known to deal in ends the hand: there is no attack left to weigh against it
        if (c.risk.certain) c.score = -2000 - c.risk.cost;
        else c.score = c.a.score - style.caution * c.risk.cost - c.keep * 6;
      }

      /* ---- playing for the team ---- */
      if (P.style === 'collaborator' && P.ally != null && (P.signal >= 1 || rng() < P.signal)) {
        const ally = round.players[P.ally];
        const menace = env.threats.reduce((m, th) => Math.max(m, th.riichi || th.exact ? th.tenpai * th.weight : 0), 0);
        const ownBest = cands.reduce((m, c) => Math.max(m, c.a.sh === 0 ? c.a.score : 0), 0);
        const feedsBig = rng() < P.feed;
        for (const c of cands) {
          const res = round.ronResult(P.ally, c.id);
          if (res) {
            // the ally's winning tile: hand it over when that stops an enemy's attack, or when the
            // ally's hand is big and his own is going nowhere
            const pay = Yaku.payments(res.base, P.ally === round.dealer, false, round.honba).ron;
            if (menace >= 0.6 || (pay >= 7700 && ownBest < 1500 && feedsBig)) c.score += 4000 + pay * 0.1;
            else c.score -= 250;       // otherwise there is no reason to end the hand for him
            continue;
          }
          if (ally.riichi) continue;
          // a tile the ally can call to get closer
          const o = round.callOptions(P.ally, seat, c.id);
          if (!o.pon && !o.chi.length) continue;
          const ac = Tiles.counts(ally.hand.map(typeOf));
          const before = Hand.shanten(ac, ally.melds.length);
          let helps = false;
          for (const used of (o.pon ? [o.pon] : []).concat(o.chi)) {
            const c2 = ac.slice();
            for (const u of used) c2[typeOf(u)]--;
            if (Hand.shanten(c2, ally.melds.length + 1) < before) helps = true;
          }
          if (helps) c.score += o.pon ? 320 : 240;
        }
      }

      cands.sort((x, y) => y.score - x.score);
      let choice = cands[0];
      if (cands.length > 1 && rng() > P.level) {
        // a lapse: something plausible, but not the best
        const alt = cands.slice(1, 4).filter(c => c.a.sh <= choice.a.sh + 1);
        if (alt.length) choice = alt[(rng() * alt.length) | 0];
      }

      /* ---- riichi ---- */
      let declare = false;
      const tp = choice.a.tp;
      if (choice.a.sh === 0 && tp && riichiTypes.has(choice.t) && tp.live > 0 && !tp.furiten) {
        declare = rng() < style.riichi;
        if (declare && P.style !== 'aggressor') {
          // a hand that is already big without riichi may stay hidden
          counts[choice.t]--;
          const quiet = appraise(env, counts, melds, style, false).tp;
          counts[choice.t]++;
          if (quiet && !quiet.yakuless && quiet.value.avg >= 7700 && rng() < 0.5) declare = false;
        }
      }
      return { type: 'discard', tile: choice.id, riichi: declare };
    }

    function onCall(round, seat, opts) {
      if (opts.canRon) {
        if (P.style === 'collaborator' && opts.from === P.ally) return { type: 'pass' };   // never off the ally
        return { type: 'ron' };
      }
      if (!opts.pon && !opts.chi.length) return { type: 'pass' };
      const p = round.players[seat];
      const style = mood(round, seat);
      const env = environment(round, seat, P);
      const counts = Tiles.counts(p.hand.map(typeOf));
      const melds = meldsOf(p);
      const t = typeOf(opts.tile);

      const now = appraise(env, counts, melds, style, true);
      // with a riichi on the table, only open the hand if that makes it ready
      const pressed = env.threats.some(th => th.riichi && th.weight >= 1);

      let best = null;
      const consider = (type, used) => {
        const usedTypes = used.map(typeOf);
        const c2 = counts.slice();
        for (const u of usedTypes) c2[u]--;
        const m2 = melds.concat([{ type, tiles: usedTypes.concat([t]).sort((a, b) => a - b) }]);
        const forbid = round.kuikaeFor(t, usedTypes, type === 'chi');
        let top = null;
        for (let d = 0; d < 34; d++) {
          if (!c2[d] || forbid.indexOf(d) >= 0) continue;
          c2[d]--;
          const a = appraise(env, c2, m2, style, false);
          c2[d]++;
          const risk = riskOf(env, d);
          const score = risk.certain ? -2000 - risk.cost : a.score - style.caution * risk.cost;
          if (!top || score > top.score) top = { score, a };
        }
        if (!top) return;
        if (pressed && top.a.sh > 0 && P.style !== 'aggressor') return;
        if (top.a.sh >= now.sh && top.a.value <= now.value) return;          // no faster and no richer
        if (!best || top.score > best.score) best = { type, tiles: used, score: top.score };
      };
      if (opts.pon) consider('pon', opts.pon);
      for (const o of opts.chi) consider('chi', o);

      if (best && best.score > now.score * (1 + style.callMargin) + 60) return { type: best.type, tiles: best.tiles };
      return { type: 'pass' };
    }

    /** should a full gauge be spent now? (asked by the SkillBoard at the start of a turn) */
    function wantsSkill(round, seat, skill) {
      const p = round.players[seat];
      if (skill === 'insight') {
        if (p.riichi) return false;                                       // nothing left to decide
        const foe = q => q.seat !== seat && !(P.style === 'collaborator' && q.seat === P.ally);
        return round.players.some(q => foe(q) && (q.riichi || q.melds.length >= 2)) || p.discards.length >= 6;
      }
      if (skill === 'flow') {
        if (round.wall.length < 8) return false;
        if (p.riichi) return true;
        return Hand.shanten(Tiles.counts(p.hand.map(typeOf)), p.melds.length) <= 2;
      }
      return false;
    }

    return { onTurn, onCall, wantsSkill, params: P, isAI: true };
  }

  const AI = { create, STYLES, unseenCounts: Analysis.unseenFor };
  if (isNode) module.exports = AI;
  else root.AI = AI;
})(typeof window !== 'undefined' ? window : globalThis);
