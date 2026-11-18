/*
 * Scripted starting positions: a hand that begins in the middle, at the moment
 * a decision has to be made.
 *
 *   const setup = Scenario.build(spec, rng);     // pass as Match / Round opts.setup
 *
 * spec:
 *   dealer   seat of the dealer
 *   turn     seat that draws next
 *   n        discards that seat has already made (the others follow from the turn order)
 *   dora     dora indicator, e.g. '9s'
 *   hands    { seat: '567m67p...' }   fixed 13-tile hands; other seats get a random hand that
 *                                     is then played forward, so their ponds look like real ones
 *   rivers   { seat: '1z9m...' }      fixed ponds, in order (required for a fixed hand)
 *   riichi   { seat: index }          discard on which a fixed-hand seat declared riichi
 *   draws    ['8p', ...]              the next tiles to come off the wall, in order
 *   opaque   { seat: '3z' }           Washizu mahjong: these tiles of a fixed hand are the opaque copy
 *                                     (the one of each four that nobody can see through)
 *   discarded { seat: '5z' }          tiles a generated seat has already thrown (placed early in its
 *                                     pond, the rest of the pond is played forward as usual)
 *   avoid    '5p8p'                   types the generated seats never discard (optional)
 *
 * Only what the scene needs is fixed; everything else is dealt from the
 * remaining tiles, so the same opening plays out differently every time.
 * The result always uses each of the 136 tiles exactly once.
 */
(function (root) {
  'use strict';
  const isNode = typeof module !== 'undefined' && module.exports;
  const Tiles = isNode ? require('./tiles.js') : root.Tiles;
  const Hand = isNode ? require('./hand.js') : root.Hand;

  const typeOf = id => id >> 2;

  /**
   * A computer player whose first turn(s) a scene scripts. forced: [{ seat, discard, riichi }] -
   * discard 'drawn' throws the tile just drawn, a code ('5m') throws that tile (declaring riichi
   * if `riichi` is set and the rules allow it). Turns after the scripted ones are the agent's own.
   */
  function scripted(agent, forced, seat) {
    const mine = forced.filter(f => f.seat === seat);
    if (!mine.length) return agent;
    return Object.assign({}, agent, {
      onTurn: (round, s, opts) => {
        const f = mine.shift();
        const p = round.players[s];
        if (f && f.discard === 'drawn' && p.drawn != null) return { type: 'discard', tile: p.drawn, riichi: false };
        if (f && f.discard && f.discard !== 'drawn') {
          const t = Tiles.parse(f.discard)[0];
          const id = p.hand.find(x => typeOf(x) === t);
          if (id != null) return { type: 'discard', tile: id, riichi: !!f.riichi && opts.riichiDiscards.indexOf(id) >= 0 };
        }
        return agent.onTurn(round, s, opts);
      },
    });
  }

  /** which tile a random hand lets go of while it is played forward */
  function dropFrom(hand, avoid) {
    const counts = Tiles.counts(hand.map(typeOf));
    let best = null;
    const seen = new Set();
    for (const id of hand) {
      const t = typeOf(id);
      if (seen.has(t) || avoid.has(t)) continue;
      seen.add(t);
      counts[t]--;
      const sh = Hand.shanten(counts, 0);
      counts[t]++;
      // among equally efficient discards: lone honours first, then terminals, then the edges
      let keep;
      if (t >= 27) keep = counts[t] >= 2 ? 6 : 0;
      else keep = [1, 2, 3, 3.2, 3.3, 3.2, 3, 2, 1][t % 9] + (counts[t] >= 2 ? 1 : 0);
      const score = sh * 10 + keep;
      if (!best || score < best.score) best = { id, score };
    }
    return best ? best.id : hand[hand.length - 1];
  }

  function build(spec, rng) {
    rng = rng || Math.random;
    const free = [];                       // free[type] = ids not yet placed
    for (let t = 0; t < 34; t++) free.push([t * 4, t * 4 + 1, t * 4 + 2, t * 4 + 3]);
    const take = t => {
      if (!free[t].length) throw new Error('scenario uses more than four ' + Tiles.code(t));
      return free[t].pop();
    };
    const takeAll = str => Tiles.parse(str || '').map(take);
    // the opaque copy of a kind is its id t*4 (Round.isGlass); a scene can hand it to a seat on purpose
    const takeOpaque = t => {
      const i = free[t].indexOf(t * 4);
      if (i < 0) throw new Error('the opaque ' + Tiles.code(t) + ' is already taken');
      return free[t].splice(i, 1)[0];
    };
    const pos = s => (s - spec.dealer + 4) % 4;
    const n = spec.n || 0;
    const riverLen = s => n + (pos(s) < pos(spec.turn) ? 1 : 0);

    // ---- everything the scene fixes -------------------------------------
    const indicator = take(Tiles.parse(spec.dora)[0]);
    const hands = [null, null, null, null];
    const discards = [[], [], [], []];
    const fixed = Object.keys(spec.hands || {}).map(Number);
    // opaque tiles first, so that no other seat takes them by chance
    const opaqueOf = {};
    for (const s of Object.keys(spec.opaque || {}).map(Number)) opaqueOf[s] = Tiles.parse(spec.opaque[s]).map(takeOpaque);
    for (const s of fixed) {
      const dark = (opaqueOf[s] || []).slice();
      hands[s] = Tiles.parse(spec.hands[s]).map(t => {
        const k = dark.findIndex(id => (id >> 2) === t);
        return k >= 0 ? dark.splice(k, 1)[0] : take(t);
      });
      if (hands[s].length !== 13) throw new Error('scenario hand for seat ' + s + ' must have 13 tiles');
      const river = takeAll((spec.rivers || {})[s]);
      if (river.length !== riverLen(s)) throw new Error('scenario pond for seat ' + s + ' must have ' + riverLen(s) + ' tiles');
      const at = spec.riichi && spec.riichi[s] != null ? spec.riichi[s] : -1;
      discards[s] = river.map((tile, i) => ({ tile, riichi: i === at, tsumogiri: at >= 0 && i > at }));
    }
    const draws = (spec.draws || []).map(code => take(Tiles.parse(code)[0]));
    const thrown = [[], [], [], []];
    for (const s of Object.keys(spec.discarded || {}).map(Number)) {
      if (fixed.indexOf(s) >= 0) throw new Error('seat ' + s + ' has a fixed pond: put its tiles in rivers');
      thrown[s] = takeAll(spec.discarded[s]);
      if (thrown[s].length > riverLen(s)) throw new Error('seat ' + s + ' cannot have thrown that many tiles yet');
    }

    // ---- the rest is dealt at random -------------------------------------
    const pool = Tiles.shuffle([].concat(...free), rng);
    const avoid = new Set(Tiles.parse(spec.avoid || ''));
    for (let s = 0; s < 4; s++) {
      if (hands[s]) continue;
      const hand = pool.splice(0, 13);
      for (let k = 0; k < riverLen(s) - thrown[s].length; k++) {
        hand.push(pool.pop());
        const out = dropFrom(hand, avoid);
        hand.splice(hand.indexOf(out), 1);
        discards[s].push({ tile: out, riichi: false, tsumogiri: false });
      }
      // the tiles the scene says he threw go in early, every other discard
      thrown[s].forEach((tile, i) => discards[s].splice(Math.min(2 * i + 1, discards[s].length), 0, { tile, riichi: false, tsumogiri: false }));
      hands[s] = hand;
    }

    const total = discards.reduce((sum, d) => sum + d.length, 0);
    const liveCount = 70 - total;
    const deadWall = [indicator].concat(pool.splice(0, 13));
    const wall = pool.splice(0, liveCount - draws.length).concat(draws.slice().reverse());
    if (pool.length || wall.length !== liveCount) throw new Error('scenario tile count does not add up');

    // tiles that passed a riichi are safe against it
    const safe = {}, ippatsu = {};
    for (const s of fixed) {
      const at = discards[s].findIndex(d => d.riichi);
      if (at < 0) continue;
      const when = at * 4 + pos(s);
      safe[s] = [];
      for (let o = 0; o < 4; o++) {
        if (o === s) continue;
        discards[o].forEach((d, i) => { if (i * 4 + pos(o) > when) safe[s].push(typeOf(d.tile)); });
      }
      ippatsu[s] = at === discards[s].length - 1;
    }
    return { hands, discards, wall, deadWall, turn: spec.turn, safe, ippatsu };
  }

  const Scenario = { build, scripted };
  if (isNode) module.exports = Scenario;
  else root.Scenario = Scenario;
})(typeof window !== 'undefined' ? window : globalThis);
