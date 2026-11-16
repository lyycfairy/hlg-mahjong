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
 *
 * The board also carries two story effects that are not skills:
 *   sense(seat, target)      seat permanently reads target's waits whenever target is in riichi
 *   underrate(seats, target) for the current hand, `seats` do not take `target` seriously
 *
 * Nothing here invents or removes tiles: `flow` only changes the order of
 * the wall, so the 136 tiles always add up.
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
  };

  class SkillBoard {
    /** seats: for each of the four seats, { skill, gauge } or null */
    constructor(seats) {
      this.seats = [0, 1, 2, 3].map(s => {
        const c = seats && seats[s];
        return c && c.skill ? { skill: c.skill, gauge: Math.min(MAX, c.gauge || 0) } : null;
      });
      this.senses = [[], [], [], []];     // permanent: seat -> targets read while they are in riichi
      this.used = [0, 0, 0, 0];
      this.resetHand();
    }

    resetHand() {
      this.active = [null, null, null, null];   // skill id in effect this hand
      this.flowLeft = [0, 0, 0, 0];
      this.ignore = [[], [], [], []];           // seat -> targets it does not take seriously this hand
    }

    skillOf(seat) { return this.seats[seat] ? this.seats[seat].skill : null; }
    gauge(seat) { return this.seats[seat] ? this.seats[seat].gauge : 0; }
    ready(seat) { return !!this.seats[seat] && this.seats[seat].gauge >= MAX && !this.active[seat]; }

    /** give a seat a skill (or replace it) - used by story consequences */
    grant(seat, skill, gauge) {
      this.seats[seat] = { skill, gauge: Math.min(MAX, gauge || 0) };
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

    /** charge gauges from engine events */
    onEvent(evt) {
      switch (evt.type) {
        case 'draw': this.add(evt.seat, GAIN.draw); break;
        case 'call': this.add(evt.seat, GAIN.call); break;
        case 'riichi': this.add(evt.seat, GAIN.riichi); break;
        case 'win':
          this.add(evt.result.winner, GAIN.win);
          if (evt.result.loser != null) this.add(evt.result.loser, GAIN.dealIn);
          break;
      }
    }

    /** called by the round before a player acts: computer players fire their skill here */
    async turnStart(round, seat, opts) {
      if (!this.ready(seat)) return;
      const agent = round.agents[seat];
      if (!agent || !agent.wantsSkill) return;       // the human fires through the interface
      if (agent.wantsSkill(round, seat, this.skillOf(seat), opts)) await this.activate(round, seat);
    }

    async activate(round, seat) {
      if (!this.ready(seat)) return false;
      const skill = this.seats[seat].skill;
      this.seats[seat].gauge = 0;
      this.active[seat] = skill;
      this.used[seat]++;
      if (skill === 'flow') this.flowLeft[seat] = DEFS.flow.draws;
      await round.emit({ type: 'skill', seat, skill });
      return true;
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
   *   { grant: { seat, skill, gauge } }   { gauge: { seat, set | add } }
   *   { underrate: { seats, target } }    { sense: { seat, target } }
   * Returns what happened, for the interface to announce.
   */
  function applyEffects(board, effects) {
    const notices = [];
    for (const e of effects || []) {
      if (e.grant) {
        board.grant(e.grant.seat, e.grant.skill, e.grant.gauge);
        notices.push({ type: 'grant', seat: e.grant.seat, skill: e.grant.skill });
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
