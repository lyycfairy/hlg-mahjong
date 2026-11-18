/*
 * Round (one hand) and Match (a sequence of hands) flow.
 *
 * Players are driven through "agents":
 *   agent.onTurn(round, seat, opts)  -> { type:'tsumo' } | { type:'discard', tile:id, riichi:bool }
 *   agent.onCall(round, seat, opts)  -> { type:'pass' } | { type:'ron' }
 *                                      | { type:'pon', tiles:[id,id] } | { type:'chi', tiles:[id,id] }
 * Both may return promises, which is how the human player plugs in.
 *
 * Rules: riichi mahjong, no kan, no red fives, no abortive draws,
 * head-bump (only the first player in turn order wins a discard).
 *
 * Two optional extras, both used by the story:
 *   opts.setup   start in the middle of a hand (see scenario.js for the format)
 *   opts.skills  a SkillBoard (skills.js): it is told when turns start and may
 *                rearrange the next draw for a player whose skill says so, or forbid
 *                some discards (turn opts.guard: the tiles a watched player waits on)
 */
(function (root) {
  'use strict';
  const isNode = typeof module !== 'undefined' && module.exports;
  const Tiles = isNode ? require('./tiles.js') : root.Tiles;
  const Hand = isNode ? require('./hand.js') : root.Hand;
  const Yaku = isNode ? require('./yaku.js') : root.Yaku;

  const typeOf = id => id >> 2;
  const byId = (a, b) => a - b;

  class Round {
    constructor(opts) {
      this.dealer = opts.dealer;
      this.roundWind = opts.roundWind || 0;   // 0 East, 1 South
      this.kyoku = opts.kyoku || 0;           // 0..3
      this.honba = opts.honba || 0;
      this.riichiSticks = opts.riichiSticks || 0;
      this.scores = opts.scores;              // shared array, updated in place
      this.agents = opts.agents;
      this.rng = opts.rng || Math.random;
      this.onEvent = opts.onEvent || (() => {});
      this.presetWall = opts.wall || null;    // optional pre-arranged wall (for scripted hands)
      this.setup = opts.setup || null;        // optional mid-hand starting position
      this.skills = opts.skills || null;      // optional SkillBoard
      this.last = !!opts.last;                // final scheduled hand of the match (the AI plays for placement)
      // stop the hand after `seat` has made `discards` discards in it - a story scene takes over
      this.pauseAfter = opts.pauseAfter || null;
      this.exposed = null;
      // Washizu mahjong: of every tile's four copies only one is opaque, the other three are glass,
      // and a glass tile is seen by everybody even in a hand (Round.isGlass)
      this.glass = !!opts.glass;                    // set by the 'notice' skill: the hand is voided

      this.players = [0, 1, 2, 3].map(seat => ({
        seat,
        hand: [],            // concealed tile ids, kept sorted
        melds: [],           // { type:'chi'|'pon', tiles:[ids], called:id, from:seat }
        discards: [],        // { tile:id, riichi:bool, called:bool, tsumogiri:bool }
        discardedTypes: new Set(),
        safe: new Set(),     // types known not to deal into this player: its own discards, and
        passed: new Set(),   // ... tiles others threw past its riichi (kept apart, see swapWithPond)
        drawn: null,
        riichi: false, doubleRiichi: false, ippatsu: false,
        riichiFuriten: false, tempFuriten: false,
        firstTurn: true,
        forbidden: [],       // kuikae: types that may not be discarded right after a call
        ai: {},              // scratch space for AI agents
      }));

      this.wall = [];
      this.deadWall = [];
      this.doraIndicators = [];
      this.uraIndicators = [];
      this.turn = this.dealer;
      this.anyCall = false;
      this.finished = false;
      this.result = null;
    }

    /** is this tile one of the three glass copies (in a Washizu-mahjong round)? */
    isGlass(id) { return this.glass && id % 4 !== 0; }

    seatWind(seat) { return 27 + ((seat - this.dealer + 4) % 4); }
    roundWindTile() { return 27 + this.roundWind; }
    name() { return (this.roundWind === 0 ? 'East' : 'South') + ' ' + (this.kyoku + 1); }

    handTypes(seat) { return this.players[seat].hand.map(typeOf); }

    /** context for Yaku.evaluate when `seat` wins on tile type `winType` */
    winContext(seat, winType, tsumo) {
      const p = this.players[seat];
      const concealed = p.hand.map(typeOf);
      if (!tsumo) concealed.push(winType);
      const first = tsumo && p.firstTurn && !this.anyCall;
      return {
        concealed,
        melds: p.melds.map(m => ({ type: m.type, tiles: m.tiles.map(typeOf) })),
        winTile: winType,
        tsumo,
        riichi: p.riichi, doubleRiichi: p.doubleRiichi, ippatsu: p.ippatsu,
        haitei: tsumo && this.wall.length === 0,
        houtei: !tsumo && this.wall.length === 0,
        tenhou: first && seat === this.dealer,
        chiihou: first && seat !== this.dealer,
        seatWind: this.seatWind(seat),
        roundWind: this.roundWindTile(),
        doraIndicators: this.doraIndicators.map(typeOf),
        uraIndicators: this.uraIndicators.map(typeOf),
      };
    }

    /** waits of a player's current 3n+1 tile hand */
    waitsOf(seat) {
      const p = this.players[seat];
      return Hand.waits(Tiles.counts(p.hand.map(typeOf)), p.melds.length);
    }

    isFuriten(seat) {
      const p = this.players[seat];
      if (p.tempFuriten || p.riichiFuriten) return true;
      return this.waitsOf(seat).some(t => p.discardedTypes.has(t));
    }

    /** would tile type t complete this player's hand shape (ignoring yaku/furiten)? */
    completesShape(seat, t) {
      const p = this.players[seat];
      const c = Tiles.counts(p.hand.map(typeOf));
      if (c[t] >= 4) return false;
      c[t]++;
      return Hand.isAgari(c, p.melds.length);
    }

    /** would drawing type t be a win this player may declare (shape and yaku)? */
    completesWithYaku(seat, t) {
      if (!this.completesShape(seat, t)) return false;
      const ctx = this.winContext(seat, t, false);
      ctx.tsumo = true; ctx.houtei = false;
      return !!Yaku.evaluate(ctx);
    }

    tsumoResult(seat) {
      const p = this.players[seat];
      if (p.drawn == null) return null;
      const c = Tiles.counts(p.hand.map(typeOf));
      if (!Hand.isAgari(c, p.melds.length)) return null;
      return Yaku.evaluate(this.winContext(seat, typeOf(p.drawn), true));
    }

    ronResult(seat, tileId) {
      const t = typeOf(tileId);
      if (!this.completesShape(seat, t)) return null;
      if (this.isFuriten(seat)) return null;
      return Yaku.evaluate(this.winContext(seat, t, false));
    }

    /** tile ids whose discard leaves a tenpai hand (riichi candidates) */
    riichiDiscards(seat) {
      const p = this.players[seat];
      if (p.riichi || p.melds.length > 0) return [];
      if (this.scores[seat] < 1000 || this.wall.length < 4) return [];
      const out = [];
      const c = Tiles.counts(p.hand.map(typeOf));
      const cache = {};
      for (const id of p.hand) {
        const t = typeOf(id);
        if (!(t in cache)) {
          c[t]--;
          cache[t] = Hand.waits(c, 0).length > 0;
          c[t]++;
        }
        if (cache[t]) out.push(id);
      }
      return out;
    }

    /** discards that keep the hand tenpai, mapped to their waits (for UI hints) */
    tenpaiDiscards(seat) {
      const p = this.players[seat];
      const c = Tiles.counts(p.hand.map(typeOf));
      const out = {};
      for (const id of p.hand) {
        const t = typeOf(id);
        if (t in out) continue;
        c[t]--;
        const w = Hand.waits(c, p.melds.length);
        c[t]++;
        if (w.length) out[t] = w;
      }
      return out;
    }

    callOptions(seat, from, tileId) {
      const p = this.players[seat];
      const t = typeOf(tileId);
      const opts = { tile: tileId, from, canRon: false, ronResult: null, pon: null, chi: [] };
      const r = this.ronResult(seat, tileId);
      if (r) { opts.canRon = true; opts.ronResult = r; }
      if (!p.riichi && this.wall.length > 0) {
        const same = p.hand.filter(id => typeOf(id) === t);
        if (same.length >= 2 && this.hasLegalDiscardAfter(p, [same[0], same[1]], [t])) {
          opts.pon = [same[0], same[1]];
        }
        if (seat === (from + 1) % 4 && t < 27) {
          const n = t % 9;
          const find = tt => p.hand.find(id => typeOf(id) === tt);
          const tryChi = (a, b, forbid) => {
            const ia = find(a), ib = find(b);
            if (ia == null || ib == null) return;
            if (this.hasLegalDiscardAfter(p, [ia, ib], forbid)) opts.chi.push([ia, ib]);
          };
          if (n >= 2) tryChi(t - 2, t - 1, n >= 3 ? [t, t - 3] : [t]);
          if (n >= 1 && n <= 7) tryChi(t - 1, t + 1, [t]);
          if (n <= 6) tryChi(t + 1, t + 2, n <= 5 ? [t, t + 3] : [t]);
        }
      }
      opts.any = opts.canRon || !!opts.pon || opts.chi.length > 0;
      return opts;
    }

    /** kuikae: types that may not be discarded after calling `calledType` with `used` */
    kuikaeFor(calledType, usedTypes, isChi) {
      const forbid = [calledType];
      if (isChi) {
        const lo = Math.min(calledType, usedTypes[0], usedTypes[1]);
        if (calledType === lo && lo % 9 <= 5) forbid.push(lo + 3);
        if (calledType === lo + 2 && lo % 9 >= 1) forbid.push(lo - 1);
      }
      return forbid;
    }

    /**
     * Sleight of Hand (skills.js): `seat` exchanges a tile in hand for one lying in a pond.
     * Nobody sees it happen, so the pond simply shows the new tile from now on: its owner's
     * furiten and safe tiles follow what is in the pond. Throws if either tile is not there.
     */
    swapWithPond(seat, handId, pondSeat, tileId) {
      const p = this.players[seat], q = this.players[pondSeat];
      const i = p.hand.indexOf(handId);
      const entry = q.discards.find(d => d.tile === tileId && !d.called);
      if (i < 0 || !entry) throw new Error('seat ' + seat + ' tried an impossible swap');
      p.hand[i] = tileId;
      entry.tile = handId;
      if (p.drawn === handId) p.drawn = tileId;
      p.hand.sort(byId);
      q.discardedTypes = new Set(q.discards.map(d => typeOf(d.tile)));
      q.safe = new Set([...q.discardedTypes, ...q.passed]);
    }

    hasLegalDiscardAfter(p, usedIds, forbidTypes) {
      return p.hand.some(id => usedIds.indexOf(id) < 0 && forbidTypes.indexOf(typeOf(id)) < 0);
    }

    async emit(evt) { await this.onEvent(evt, this); }

    /* ------------------------------------------------------------ */

    /** take up a position in the middle of a hand (built by Scenario.build) */
    applySetup(s) {
      this.wall = s.wall.slice();
      this.deadWall = s.deadWall.slice();
      this.doraIndicators = [this.deadWall[0]];
      this.uraIndicators = [this.deadWall[1]];
      for (const p of this.players) {
        p.hand = s.hands[p.seat].slice().sort(byId);
        p.firstTurn = false;
        for (const d of s.discards[p.seat]) {
          p.discards.push({ tile: d.tile, riichi: !!d.riichi, called: false, tsumogiri: !!d.tsumogiri });
          p.discardedTypes.add(typeOf(d.tile));
          p.safe.add(typeOf(d.tile));
          if (d.riichi) {
            p.riichi = true;
            this.scores[p.seat] -= 1000;
            this.riichiSticks++;
          }
        }
        for (const t of (s.safe && s.safe[p.seat]) || []) { p.safe.add(t); p.passed.add(t); }
        if (s.ippatsu && s.ippatsu[p.seat]) p.ippatsu = true;
      }
      this.turn = s.turn;
    }

    async play() {
      if (this.setup) {
        this.applySetup(this.setup);
      } else {
        // build and deal
        const tiles = this.presetWall ? this.presetWall.slice() : Tiles.shuffle(Tiles.fullSet(), this.rng);
        this.deadWall = tiles.splice(0, 14);
        this.doraIndicators = [this.deadWall[0]];
        this.uraIndicators = [this.deadWall[1]];
        this.wall = tiles;
        for (let i = 0; i < 13; i++) {
          for (let s = 0; s < 4; s++) this.players[(this.dealer + s) % 4].hand.push(this.wall.pop());
        }
        for (const p of this.players) p.hand.sort(byId);
        this.turn = this.dealer;
      }
      await this.emit({ type: 'deal' });

      let needDraw = true;

      for (;;) {
        const seat = this.turn;
        const p = this.players[seat];

        if (needDraw) {
          if (this.wall.length === 0) return this.exhaustiveDraw();
          if (this.skills) this.skills.beforeDraw(this, seat);
          const tile = this.wall.pop();
          p.hand.push(tile);
          p.hand.sort(byId);
          p.drawn = tile;
          p.tempFuriten = false;
          p.forbidden = [];
          await this.emit({ type: 'draw', seat, tile });
        } else {
          p.drawn = null;
        }

        const tsumoRes = needDraw ? this.tsumoResult(seat) : null;
        const turnOpts = {
          canTsumo: !!tsumoRes,
          tsumoResult: tsumoRes,
          riichiDiscards: needDraw ? this.riichiDiscards(seat) : [],
          mustTsumogiri: p.riichi,
          forbidden: p.forbidden.slice(),
          afterCall: !needDraw,
        };

        if (this.skills) await this.skills.turnStart(this, seat, turnOpts);
        if (this.exposed) return this.expose();
        const action = await this.agents[seat].onTurn(this, seat, turnOpts);

        if (action.type === 'tsumo') {
          const won = turnOpts.tsumoResult;      // not tsumoRes: a skill may have changed the drawn tile
          if (!won) throw new Error('illegal tsumo by seat ' + seat);
          return this.win(seat, null, p.drawn, won, true);
        }

        /* ---- discard ---- */
        const tile = action.tile;
        if (p.hand.indexOf(tile) < 0) throw new Error('seat ' + seat + ' discarded a tile it does not hold');
        if (p.riichi && tile !== p.drawn) throw new Error('seat ' + seat + ' must discard the drawn tile after riichi');
        if (p.forbidden.indexOf(typeOf(tile)) >= 0) throw new Error('seat ' + seat + ' made a kuikae discard');
        // a watching Insight forbids what the watched player waits on, as long as there is something else to throw
        const guard = turnOpts.guard || [];
        if (guard.indexOf(typeOf(tile)) >= 0 && !p.riichi &&
            p.hand.some(id => guard.indexOf(typeOf(id)) < 0 && p.forbidden.indexOf(typeOf(id)) < 0)) {
          throw new Error('seat ' + seat + ' threw a tile its Insight forbids');
        }
        const declaring = !!action.riichi;
        if (declaring && turnOpts.riichiDiscards.indexOf(tile) < 0) throw new Error('illegal riichi by seat ' + seat);

        if (p.riichi) p.ippatsu = false; // the ippatsu window closes with the next own discard
        if (declaring) {
          p.riichi = true;
          p.ippatsu = true;
          p.doubleRiichi = p.firstTurn && !this.anyCall;
        }
        const tsumogiri = tile === p.drawn;
        p.hand.splice(p.hand.indexOf(tile), 1);
        p.drawn = null;
        p.forbidden = [];
        p.firstTurn = false;
        const entry = { tile, riichi: declaring, called: false, tsumogiri };
        p.discards.push(entry);
        p.discardedTypes.add(typeOf(tile));
        p.safe.add(typeOf(tile));
        await this.emit({ type: 'discard', seat, tile, riichi: declaring, tsumogiri });
        const pauseNow = this.pauseAfter && seat === this.pauseAfter.seat && --this.pauseAfter.discards <= 0;
        if (pauseNow && !this.pauseAfter.react) return this.pause(seat);

        /* ---- reactions ---- */
        const order = [1, 2, 3].map(i => (seat + i) % 4);
        const options = {};
        for (const s of order) options[s] = this.callOptions(s, seat, tile);
        const decisions = {};
        let ronSeat = -1;

        for (const s of order) {
          if (!options[s].canRon) continue;
          decisions[s] = await this.agents[s].onCall(this, s, options[s]);
          if (decisions[s].type === 'ron') { ronSeat = s; break; }
        }
        if (ronSeat >= 0) {
          if (declaring) { p.riichi = false; p.ippatsu = false; p.doubleRiichi = false; } // riichi never completed
          return this.win(ronSeat, seat, tile, options[ronSeat].ronResult, false);
        }

        if (pauseNow) return this.pause(seat);        // nobody won on it: the scene takes over

        // anyone who let a winning tile go by is now furiten
        for (const s of order) {
          if (this.completesShape(s, typeOf(tile))) {
            const q = this.players[s];
            if (q.riichi) q.riichiFuriten = true; else q.tempFuriten = true;
          }
          if (this.players[s].riichi) { this.players[s].safe.add(typeOf(tile)); this.players[s].passed.add(typeOf(tile)); }
        }

        if (declaring) {
          this.scores[seat] -= 1000;
          this.riichiSticks++;
          await this.emit({ type: 'riichi', seat });
        }

        for (const s of order) {
          if (decisions[s] || (!options[s].pon && !options[s].chi.length)) continue;
          decisions[s] = await this.agents[s].onCall(this, s, options[s]);
        }

        let caller = -1;
        for (const s of order) if (decisions[s] && decisions[s].type === 'pon' && options[s].pon) caller = s;
        if (caller < 0) {
          for (const s of order) if (decisions[s] && decisions[s].type === 'chi' && options[s].chi.length) caller = s;
        }

        if (caller >= 0) {
          const d = decisions[caller];
          const q = this.players[caller];
          let used;
          if (d.type === 'pon') {
            used = options[caller].pon;
          } else {
            used = options[caller].chi.find(o => d.tiles && o[0] === d.tiles[0] && o[1] === d.tiles[1]) || options[caller].chi[0];
          }
          for (const id of used) q.hand.splice(q.hand.indexOf(id), 1);
          const meld = {
            type: d.type,
            tiles: [used[0], used[1], tile].sort(byId),
            called: tile,
            from: seat,
          };
          q.melds.push(meld);
          entry.called = true;
          this.anyCall = true;
          for (const pl of this.players) { pl.ippatsu = false; pl.firstTurn = false; }
          q.forbidden = this.kuikaeFor(typeOf(tile), used.map(typeOf), d.type === 'chi');
          await this.emit({ type: 'call', seat: caller, callType: d.type, meld, from: seat });
          this.turn = caller;
          needDraw = false;
          continue;
        }

        if (this.wall.length === 0) return this.exhaustiveDraw();
        this.turn = (seat + 1) % 4;
        needDraw = true;
      }
    }

    async win(winner, loser, tileId, score, tsumo) {
      const isDealer = winner === this.dealer;
      const pay = Yaku.payments(score.base, isDealer, tsumo, this.honba);
      const deltas = [0, 0, 0, 0];
      if (!tsumo) {
        deltas[loser] -= pay.ron;
        deltas[winner] += pay.ron;
      } else {
        for (let s = 0; s < 4; s++) {
          if (s === winner) continue;
          const amt = (s === this.dealer) ? pay.fromDealer : pay.fromOthers;
          deltas[s] -= amt;
          deltas[winner] += amt;
        }
      }
      const sticks = this.riichiSticks;
      deltas[winner] += sticks * 1000;
      this.riichiSticks = 0;
      for (let s = 0; s < 4; s++) this.scores[s] += deltas[s];

      const p = this.players[winner];
      this.finished = true;
      this.result = {
        type: 'win', winner, loser, tsumo,
        winTile: tileId,
        score, pay, deltas,
        sticksWon: sticks,
        honba: this.honba,
        hand: p.hand.filter(id => !(tsumo && id === tileId)).slice(),
        melds: p.melds,
        riichi: p.riichi,
        doraIndicators: this.doraIndicators.slice(),
        uraIndicators: p.riichi ? this.uraIndicators.slice() : [],
        dealerWon: isDealer,
      };
      await this.emit({ type: 'win', result: this.result });
      return this.result;
    }

    /** the hand stops where it stands (opts.pauseAfter): what is `seat` now waiting for, and for how much? */
    async pause(seat) {
      const waits = this.waitsOf(seat);
      let yakuman = 0, han = 0;
      for (const w of waits) {
        const res = Yaku.evaluate(this.winContext(seat, w, false));
        if (res && (res.yakuman > yakuman || (!yakuman && res.han > han))) { yakuman = res.yakuman || 0; han = res.han || 0; }
      }
      this.finished = true;
      this.result = { type: 'pause', seat, waits, yakuman, han, hand: this.players[seat].hand.slice(), deltas: [0, 0, 0, 0] };
      await this.emit({ type: 'pause', result: this.result });
      return this.result;
    }

    /** a 'notice' skill saw through a cheat: the hand is voided, nobody pays */
    async expose() {
      this.finished = true;
      this.result = { type: 'exposed', by: this.exposed.by, target: this.exposed.target, deltas: [0, 0, 0, 0] };
      await this.emit({ type: 'exposed', result: this.result });
      return this.result;
    }

    async exhaustiveDraw() {
      const tenpai = [];
      for (let s = 0; s < 4; s++) if (this.waitsOf(s).length > 0) tenpai.push(s);
      const deltas = [0, 0, 0, 0];
      if (tenpai.length > 0 && tenpai.length < 4) {
        const gain = 3000 / tenpai.length;
        const loss = 3000 / (4 - tenpai.length);
        for (let s = 0; s < 4; s++) deltas[s] = tenpai.indexOf(s) >= 0 ? gain : -loss;
      }
      for (let s = 0; s < 4; s++) this.scores[s] += deltas[s];
      this.finished = true;
      this.result = {
        type: 'draw', tenpai, deltas,
        dealerTenpai: tenpai.indexOf(this.dealer) >= 0,
        hands: this.players.map(p => p.hand.slice()),
      };
      await this.emit({ type: 'exhaustive', result: this.result });
      return this.result;
    }
  }

  /* ================================================================ */

  class Match {
    /**
     * opts: { agents, scores, firstDealer, startWind, startKyoku, endWind, rng, onEvent,
     *         setup, skills, maxHands, pauseAfter, glass, stopWhen }
     * `stopWhen()` is asked after every hand (and its round-end event): true ends the match there.
     * The match ends after the last hand of `endWind`, when someone goes below zero, or after
     * `maxHands` hands. The final result lists every hand's result in `results`.
     * `setup` (an object, or a function of the dealer seat returning one) applies to
     * the first hand only; `skills` is a SkillBoard shared by every hand.
     */
    constructor(opts) {
      this.agents = opts.agents;
      this.scores = opts.scores.slice();
      this.firstDealer = opts.firstDealer || 0;
      this.wind = opts.startWind || 0;
      this.kyoku = opts.startKyoku || 0;
      this.endWind = opts.endWind == null ? this.wind : opts.endWind;
      this.rng = opts.rng || Math.random;
      this.onEvent = opts.onEvent || (() => {});
      this.honba = 0;
      this.riichiSticks = 0;
      this.round = null;
      this.handsPlayed = 0;
      this.maxHands = opts.maxHands || 40; // safety valve
      this.setup = opts.setup || null;
      this.skills = opts.skills || null;
      this.results = [];
      this.pauseAfter = opts.pauseAfter || null;   // first hand only, like setup
      this.glass = !!opts.glass;                    // Washizu mahjong for every hand
      this.stopWhen = opts.stopWhen || null;
    }

    standings() {
      const seats = [0, 1, 2, 3];
      const prio = s => (s - this.firstDealer + 4) % 4;
      seats.sort((a, b) => (this.scores[b] - this.scores[a]) || (prio(a) - prio(b)));
      return seats;
    }

    async run() {
      for (;;) {
        const dealer = (this.firstDealer + this.kyoku) % 4;
        let setup = null;
        if (this.setup && this.handsPlayed === 0) {
          setup = typeof this.setup === 'function' ? this.setup(dealer) : this.setup;
        }
        const round = new Round({
          dealer, roundWind: this.wind, kyoku: this.kyoku,
          honba: this.honba, riichiSticks: this.riichiSticks,
          scores: this.scores, agents: this.agents, rng: this.rng,
          onEvent: this.onEvent,
          setup, skills: this.skills, glass: this.glass,
          pauseAfter: this.handsPlayed === 0 && this.pauseAfter ? Object.assign({}, this.pauseAfter) : null,
          last: this.wind === this.endWind && this.kyoku === 3,
        });
        this.round = round;
        if (this.skills) this.skills.roundStart(round);
        await this.onEvent({ type: 'round-start' }, round);
        const res = await round.play();
        this.handsPlayed++;
        this.results.push(res);
        this.riichiSticks = round.riichiSticks;

        let dealerStays;
        if (res.type === 'win') {
          dealerStays = res.winner === dealer;
          this.honba = dealerStays ? this.honba + 1 : 0;
        } else {
          dealerStays = res.dealerTenpai;
          this.honba++;
        }

        const isLast = this.wind === this.endWind && this.kyoku === 3;
        let over = false;
        if (this.scores.some(s => s < 0)) over = true;
        else if (this.handsPlayed >= this.maxHands) over = true;
        else if (!dealerStays) {
          if (isLast) over = true;
          else {
            this.kyoku++;
            if (this.kyoku > 3) { this.kyoku = 0; this.wind++; }
          }
        } else if (isLast && this.standings()[0] === dealer) {
          over = true; // the leading dealer may end the game
        }

        await this.onEvent({ type: 'round-end', result: res, over }, round);
        if (!over && this.stopWhen && this.stopWhen()) over = true;
        if (over) break;
      }

      const ranking = this.standings();
      // leftover riichi sticks go to the winner
      this.scores[ranking[0]] += this.riichiSticks * 1000;
      this.riichiSticks = 0;
      const place = [0, 0, 0, 0];
      ranking.forEach((s, i) => { place[s] = i + 1; });
      const final = { type: 'match-end', scores: this.scores.slice(), ranking, place, results: this.results.slice() };
      await this.onEvent(final, this.round);
      return final;
    }
  }

  const api = { Round, Match };
  if (isNode) module.exports = api;
  else { root.Round = Round; root.Match = Match; }
})(typeof window !== 'undefined' ? window : globalThis);
