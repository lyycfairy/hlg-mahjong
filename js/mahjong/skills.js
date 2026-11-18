/*
 * Skills and the rage gauge.
 *
 * Any player - human or computer - who owns a skill also has a gauge (0..100).
 * It fills as that player draws, calls, declares riichi, wins or is hit, and
 * once it is full the skill can be fired. Firing empties the gauge.
 *
 *   const board = new SkillBoard([{ skill: 'insight', gauge: 40 }, null, null, null]);
 *   new Match({ ..., skills: board });          // the engine drives it from there
 *   board.onEvent(evt, round)                   // call for every engine event (charges gauges)
 *   board.ready(seat) / board.activate(round, seat)
 *
 * Skills (effects last until the end of the current hand):
 *   insight  the player sees every opponent's hand for what it is: who is
 *            ready and exactly which tiles deal in
 *   flow     the player's next three draws are the best tiles left in the wall
 *   confusion (In the Confusion) until the owner's next turn every opponent is in a
 *            thought-stop: none of them guards against danger, fires a skill, or
 *            fills a gauge (board.dazed(seat))
 *   notice   (Second Look) fires by itself once the gauge is full, unless its owner is
 *            dazed: he notices that the ponds have been tampered with, and the hand
 *            is voided (the round ends with { type: 'exposed' }). `watch` names the cheat.
 *   sleight  (Sleight of Hand) on his own turn the player swaps a tile in his hand
 *            for any tile lying in a pond. It does not wait for a full gauge:
 *            each swap costs DEFS.sleight.cost, so a full gauge is four swaps.
 *            The human fires it through board.swap(); computer players never do.
 *
 * A watching Insight ({ skill: 'insight', watch: seat }) keeps its eye on one
 * player. It is not fired by choice: it goes off by itself at the start of the
 * owner's turn once the gauge is full and the watched player is ready. For the
 * rest of that hand the owner cannot throw a tile the watched player is waiting
 * on - the round refuses such a discard, and if the owner is in riichi and
 * draws one, the wall hands him another tile instead.
 *
 * The board also carries two story effects that are not skills:
 *   sense(seat, target)      seat permanently reads target's waits whenever target is in riichi
 *   underrate(seats, target) for the current hand, `seats` do not take `target` seriously
 *
 * Nothing here invents or removes tiles: `flow` and the watching Insight only
 * change the order of the wall, so the 136 tiles always add up.
 */
(function (root) {
  'use strict';
  const isNode = typeof module !== 'undefined' && module.exports;
  const Tiles = isNode ? require('./tiles.js') : root.Tiles;
  const Hand = isNode ? require('./hand.js') : root.Hand;

  const typeOf = id => id >> 2;

  const GAIN = { draw: 4, call: 10, riichi: 10, win: 30, dealIn: 15 };
  const MAX = 100;
  const DEFS = {
    insight: { id: 'insight' },
    flow: { id: 'flow', draws: 3 },
    sleight: { id: 'sleight', cost: 25 },
    confusion: { id: 'confusion' },
    notice: { id: 'notice', auto: true },
  };

  class SkillBoard {
    /** seats: for each of the four seats, { skill, gauge } or null */
    constructor(seats) {
      this.seats = [0, 1, 2, 3].map(s => {
        const c = seats && seats[s];
        return c && c.skill ? { skill: c.skill, gauge: Math.min(MAX, c.gauge || 0), watch: c.watch != null ? c.watch : null } : null;
      });
      this.senses = [[], [], [], []];     // permanent: seat -> targets read while they are in riichi
      this.used = [0, 0, 0, 0];
      this.resetHand();
    }

    resetHand() {
      this.active = [null, null, null, null];   // skill id in effect this hand
      this.flowLeft = [0, 0, 0, 0];
      this.ignore = [[], [], [], []];           // seat -> targets it does not take seriously this hand
      this.swapped = [0, 0, 0, 0];              // Sleight of Hand swaps made this hand
      this.daze = null;                          // { by: seat } while a confusion holds the others
    }

    /** is `seat` in the thought-stop of somebody else's confusion? */
    dazed(seat) { return !!this.daze && this.daze.by !== seat; }

    skillOf(seat) { return this.seats[seat] ? this.seats[seat].skill : null; }
    /** the player a watching Insight keeps its eye on, or null */
    watchOf(seat) { return this.seats[seat] && this.seats[seat].skill === 'insight' ? this.seats[seat].watch : null; }
    gauge(seat) { return this.seats[seat] ? this.seats[seat].gauge : 0; }
    /** gauge a single use takes: all of it, except for a skill with a cost of its own */
    cost(seat) { const d = this.seats[seat] && DEFS[this.seats[seat].skill]; return (d && d.cost) || MAX; }
    ready(seat) { return !!this.seats[seat] && this.seats[seat].gauge >= this.cost(seat) && !this.active[seat]; }
    /** uses left in the gauge (Sleight of Hand) */
    usesLeft(seat) { return this.seats[seat] ? Math.floor(this.seats[seat].gauge / this.cost(seat)) : 0; }

    /** give a seat a skill (or replace it) - used by story consequences */
    grant(seat, skill, gauge, watch) {
      this.seats[seat] = { skill, gauge: Math.min(MAX, gauge || 0), watch: watch != null ? watch : null };
    }

    add(seat, amount) {
      const s = this.seats[seat];
      if (s) s.gauge = Math.max(0, Math.min(MAX, s.gauge + amount));
    }

    sense(seat, target) { if (this.senses[seat].indexOf(target) < 0) this.senses[seat].push(target); }
    underrate(seats, target) { for (const s of seats) if (this.ignore[s].indexOf(target) < 0) this.ignore[s].push(target); }
    ignores(seat, target) { return this.ignore[seat].indexOf(target) >= 0; }

    /** opponents whose hands `seat` currently sees through */
    reads(round, seat) {
      const out = [];
      for (let o = 0; o < 4; o++) {
        if (o === seat) continue;
        if (this.active[seat] === 'insight') out.push(o);
        else if (this.senses[seat].indexOf(o) >= 0 && round.players[o].riichi) out.push(o);
      }
      return out;
    }

    /* ---- driven by the engine ------------------------------------------ */

    roundStart(round) {
      this.resetHand();
      round.skills = this;
    }

    /** charge gauges from engine events (a dazed player's gauge stands still) */
    onEvent(evt) {
      const add = (seat, n) => { if (!this.dazed(seat)) this.add(seat, n); };
      switch (evt.type) {
        case 'draw': add(evt.seat, GAIN.draw); break;
        case 'call': add(evt.seat, GAIN.call); break;
        case 'riichi': add(evt.seat, GAIN.riichi); break;
        case 'win':
          add(evt.result.winner, GAIN.win);
          if (evt.result.loser != null) add(evt.result.loser, GAIN.dealIn);
          break;
      }
    }

    /** tile types `seat` may not throw right now: what the player he watches is waiting on */
    guarded(round, seat) {
      const w = this.watchOf(seat);
      if (w == null || this.active[seat] !== 'insight' || round.players[w].hand.length % 3 !== 1) return [];
      return round.waitsOf(w);
    }

    /** called by the round before a player acts: computer players fire their skill here */
    async turnStart(round, seat, opts) {
      if (this.daze && this.daze.by === seat) this.daze = null;     // his own turn: everyone comes to
      if (this.dazed(seat)) { opts.guard = []; return; }            // thinking has stopped: no skill, no guard
      if (this.skillOf(seat) === 'notice') {
        if (this.ready(seat)) await this.activate(round, seat);
        return;
      }
      if (this.watchOf(seat) != null) {
        // a watching Insight is not the owner's to time: it fires when the watched player is ready
        if (this.ready(seat) && round.waitsOf(this.watchOf(seat)).length) await this.activate(round, seat);
        this.guard(round, seat, opts);
        return;
      }
      if (!this.ready(seat)) return;
      const agent = round.agents[seat];
      if (!agent || !agent.wantsSkill) return;       // the human fires through the interface
      if (agent.wantsSkill(round, seat, this.skillOf(seat), opts)) await this.activate(round, seat);
    }

    /**
     * Sleight of Hand: swap `handId` from `seat`'s hand for the pond tile `tileId` thrown by `pondSeat`.
     * Only on that player's own turn (the interface asks), never in riichi. The first swap of a
     * hand is announced as the skill firing (the cut-in); every swap is announced as { type: 'swap' }.
     */
    async swap(round, seat, handId, pondSeat, tileId) {
      if (this.skillOf(seat) !== 'sleight' || !this.ready(seat) || round.players[seat].riichi) return false;
      const there = round.players[seat].hand.indexOf(handId) >= 0 &&
        round.players[pondSeat].discards.some(d => d.tile === tileId && !d.called);
      if (!there) return false;
      if (!this.swapped[seat]) await round.emit({ type: 'skill', seat, skill: 'sleight' });
      round.swapWithPond(seat, handId, pondSeat, tileId);
      this.seats[seat].gauge -= this.cost(seat);
      this.swapped[seat]++;
      this.used[seat]++;
      await round.emit({ type: 'swap', seat, out: handId, in: tileId, from: pondSeat });
      return true;
    }

    async activate(round, seat) {
      if (!this.ready(seat) || this.skillOf(seat) === 'sleight') return false;
      const skill = this.seats[seat].skill;
      this.seats[seat].gauge = 0;
      this.active[seat] = skill;
      this.used[seat]++;
      if (skill === 'flow') this.flowLeft[seat] = DEFS.flow.draws;
      if (skill === 'confusion') this.daze = { by: seat };
      await round.emit({ type: 'skill', seat, skill });
      // the round sees this after the turn's skills and ends the hand (Round.play)
      if (skill === 'notice') round.exposed = { by: seat, target: this.seats[seat].watch };
      return true;
    }

    /**
     * Tell the round which tiles `seat` may not throw this turn (opts.guard) and drop them from its
     * riichi choices. A player in riichi has to throw what he drew, so if that is one of them, he
     * draws another: the tile goes back into the wall in exchange for the nearest one that is safe
     * (or, failing that, one of the dead-wall tiles that are never used, since there is no kan).
     */
    guard(round, seat, opts) {
      const types = this.guarded(round, seat);
      opts.guard = types;
      if (!types.length) return;
      const bad = id => types.indexOf(typeOf(id)) >= 0;
      opts.riichiDiscards = opts.riichiDiscards.filter(id => !bad(id));
      const p = round.players[seat];
      if (!p.riichi || p.drawn == null || opts.canTsumo || !bad(p.drawn)) return;
      let from = round.wall, i = -1;
      for (let k = round.wall.length - 1; k >= 0; k--) if (!bad(round.wall[k])) { i = k; break; }
      if (i < 0) {
        from = round.deadWall;
        for (let k = round.deadWall.length - 1; k >= 2; k--) if (!bad(round.deadWall[k])) { i = k; break; }
      }
      if (i < 0) return;
      const old = p.drawn;
      p.hand[p.hand.indexOf(old)] = from[i];
      p.drawn = from[i];
      from[i] = old;
      p.hand.sort((a, b) => a - b);
      const win = round.tsumoResult(seat);
      opts.canTsumo = !!win;
      opts.tsumoResult = win;
    }

    /** `flow`: bring the most useful tile left in the wall to the top */
    beforeDraw(round, seat) {
      if (this.flowLeft[seat] <= 0) return;
      this.flowLeft[seat]--;
      const p = round.players[seat];
      const wall = round.wall;
      if (wall.length < 2) return;
      const counts = Tiles.counts(p.hand.map(typeOf));
      const melds = p.melds.length;
      const cur = Hand.shanten(counts, melds);
      const tried = {};
      let best = -1, bestScore = 0;
      for (let i = 0; i < wall.length; i++) {
        const t = typeOf(wall[i]);
        if (!(t in tried)) {
          let score = 0;
          if (counts[t] < 4) {
            counts[t]++;
            const sh = Hand.shanten(counts, melds);
            // a completed hand is only worth taking if it can actually be declared
            if (sh < 0) score = (melds === 0 || round.completesWithYaku(seat, t)) ? 100 : 0;
            else if (sh < cur) score = 10;
            counts[t]--;
          }
          tried[t] = score;
        }
        if (tried[t] > bestScore) { bestScore = tried[t]; best = i; }
      }
      if (best >= 0) {
        const top = wall.length - 1;
        const tmp = wall[top]; wall[top] = wall[best]; wall[best] = tmp;
      }
    }
  }

  /**
   * Apply the consequences of a story decision to a board:
   *   { grant: { seat, skill, gauge, watch } }   { gauge: { seat, set | add } }
   *   { underrate: { seats, target } }    { sense: { seat, target } }
   * Returns what happened, for the interface to announce.
   */
  function applyEffects(board, effects) {
    const notices = [];
    for (const e of effects || []) {
      if (e.grant) {
        board.grant(e.grant.seat, e.grant.skill, e.grant.gauge, e.grant.watch);
        if (e.grant.watch != null) notices.push({ type: 'grantWatch', seat: e.grant.seat, skill: e.grant.skill, target: e.grant.watch });
        else notices.push({ type: 'grant', seat: e.grant.seat, skill: e.grant.skill });
      } else if (e.gauge) {
        const before = board.gauge(e.gauge.seat);
        if (e.gauge.set != null) board.add(e.gauge.seat, e.gauge.set - before);
        else board.add(e.gauge.seat, e.gauge.add);
        const now = board.gauge(e.gauge.seat);
        notices.push({ type: now >= MAX ? 'gaugeFull' : 'gauge', seat: e.gauge.seat, add: now - before });
      } else if (e.underrate) {
        board.underrate(e.underrate.seats, e.underrate.target);
        notices.push({ type: 'underrate', target: e.underrate.target });
      } else if (e.sense) {
        board.sense(e.sense.seat, e.sense.target);
        notices.push({ type: 'sense', seat: e.sense.seat, target: e.sense.target });
      }
    }
    return notices;
  }

  const Skills = { SkillBoard, GAIN, MAX, DEFS, applyEffects };
  if (isNode) module.exports = Skills;
  else { root.Skills = Skills; root.SkillBoard = SkillBoard; }
})(typeof window !== 'undefined' ? window : globalThis);
