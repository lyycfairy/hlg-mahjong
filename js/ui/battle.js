/*
 * Battle screen: runs one stage (a Match) with the human at seat 0.
 *
 *   const battle = new Battle(containerEl, stage, { context: 'story'|'battle' });
 *   battle.run().then(({ cleared, final, choice, opening, aborted }) => ...)
 *
 * A stage may open in the middle of its first hand, at a decision from the
 * story (stage.opening): the player is shown the hand, what each choice leads
 * to and a commentary on it, and the choice changes the rest of the match -
 * `opening` in the result is the id of the option taken. An opening with `auto`
 * is a scripted moment instead: its scene plays and the story answers for the player.
 *
 * Players with a skill carry a rage gauge (js/mahjong/skills.js); a full
 * gauge lets the skill fire, with a cut-in (js/ui/cutin.js).
 *
 * All visible text goes through I18n (js/i18n.js).
 */
(function (root) {
  'use strict';

  const typeOf = id => id >> 2;
  const WIND_KANJI = ['東', '南', '西', '北'];
  const fmt = n => n.toLocaleString('en-US');
  const signed = n => (n > 0 ? '+' : n < 0 ? '−' : '±') + fmt(Math.abs(n));
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const T = (key, vars) => I18n.t(key, vars);
  const P = x => I18n.pick(x);

  class Battle {
    constructor(el, stage, opts) {
      this.host = el;
      this.stage = stage;
      this.opts = opts || {};
      this.speed = Save.data.settings.fast ? 0.45 : 1;
      this.aborted = false;
      this.pending = null;   // { kind:'turn'|'call', opts, resolve }
      this.mode = 'idle';    // 'discard' | 'riichi'
      this.board = new SkillBoard(stage.skills || []);
      this.opening = stage.opening || null;
      this.openingStage = this.opening ? 'pending' : 'done';   // pending -> later (lines after the hand) -> done
      this.openingOption = null;
      this.busy = false;     // a cut-in or scene is playing: ignore the table
      this.selected = null;
      this.hoverType = null;
      this.lastDiscard = null;
      this.tenpaiMap = {};
      this.round = null;
      this.pointerType = 'mouse';
    }

    run() {
      return new Promise(resolve => { this._done = resolve; this.start(); });
    }

    async start() {
      this.mount();
      await this.showIntro();
      if (this.aborted) return;
      const st = this.stage;
      const agents = st.ai.map((cfg, seat) => (seat === 0 ? this.humanAgent() : this.scripted(seat, AI.create(Object.assign({}, cfg)))));
      this.match = new Match({
        agents,
        scores: st.scores,
        firstDealer: st.firstDealer,
        startWind: st.startWind,
        startKyoku: st.startKyoku || 0,
        endWind: st.endWind,
        maxHands: st.hands || undefined,
        pauseAfter: st.pause || null,
        skills: this.board,
        setup: this.opening ? dealer => Scenario.build(Object.assign({ dealer }, this.opening.scenario)) : null,
        onEvent: (e, r) => this.onEvent(e, r),
      });
      let final;
      try {
        final = await this.match.run();
      } catch (err) {
        console.error(err);
        if (!this.aborted) this.showError(err);
        return;
      }
      if (this.aborted) return;
      const cleared = !!st.goal.check(final);
      if (cleared) Save.clearStage(st.id);
      const choice = await this.showFinal(final, cleared);
      this.finish({ cleared, final, choice, opening: this.openingOption ? this.openingOption.id : null });
    }

    /** a computer player whose first action(s) the opening scripts */
    scripted(seat, agent) {
      const forced = ((this.opening && this.opening.forced) || []).filter(f => f.seat === seat);
      if (!forced.length) return agent;
      return Object.assign({}, agent, {
        onTurn: (round, s, opts) => {
          const f = forced.shift();
          if (f && f.discard === 'drawn' && round.players[s].drawn != null) {
            return { type: 'discard', tile: round.players[s].drawn, riichi: false };
          }
          return agent.onTurn(round, s, opts);
        },
      });
    }

    finish(result) {
      if (this._finished) return;
      this._finished = true;
      this.aborted = true;
      Voice.stop();
      document.removeEventListener('keydown', this._key);
      this._done(result);
    }

    wait(ms) {
      return new Promise(res => setTimeout(() => { if (!this.aborted) res(); }, ms * this.speed));
    }

    $(sel) { return this.el.querySelector(sel); }
    name(seat) { return P(this.stage.names[seat]); }
    roundName(r) { return I18n.roundName(r.roundWind, r.kyoku); }
    youMark() { return ` <span class="you-mark">◂ ${esc(T('you'))}</span>`; }

    /* ---------------------------------------------------------------- */

    mount() {
      this.host.innerHTML = '';
      const el = document.createElement('div');
      el.className = 'battle';
      const st = this.stage;
      el.innerHTML = `
        <header class="b-top">
          <div class="b-stage"><span class="b-stage-no">${esc(T('stage.no', { n: st.no }))}</span>${esc(P(st.title))}</div>
          <div class="b-goal" title="${esc(T('b.goalTip'))}">◆ ${esc(P(st.goal.text))}</div>
          <div class="b-tools">
            <button class="btn-ghost" data-act="speed"></button>
            <button class="btn-ghost" data-act="sound"></button>
            <button class="btn-ghost" data-act="voice"></button>
            <button class="btn-ghost" data-act="quit">${esc(T('b.quit'))}</button>
          </div>
        </header>
        <div class="b-table">
          <div class="b-seat b-seat-top" data-seat="2"></div>
          <div class="b-seat b-seat-left" data-seat="3"></div>
          <div class="b-board">
            <div class="b-pond b-pond-top" data-seat="2"></div>
            <div class="b-pond b-pond-left" data-seat="3"></div>
            <div class="b-info"></div>
            <div class="b-pond b-pond-right" data-seat="1"></div>
            <div class="b-pond b-pond-bottom" data-seat="0"></div>
            <div class="b-bubble pos-bottom" data-seat="0"></div>
            <div class="b-bubble pos-right" data-seat="1"></div>
            <div class="b-bubble pos-top" data-seat="2"></div>
            <div class="b-bubble pos-left" data-seat="3"></div>
            <div class="b-banner"></div>
          </div>
          <div class="b-seat b-seat-right" data-seat="1"></div>
        </div>
        <div class="b-me">
          <div class="b-me-bar">
            <div class="b-me-info"></div>
            <div class="b-hint"></div>
            <div class="b-actions"></div>
          </div>
          <div class="b-handrow"><div class="b-hand"></div><div class="b-melds"></div></div>
        </div>
        <div class="b-scene" hidden></div>
        <div class="b-overlay" hidden></div>
        <div class="b-cutin"></div>`;
      this.host.appendChild(el);
      this.el = el;
      this.updateTools();
      this._key = e => {
        if (this.aborted || !this._sceneNext || !this.el.isConnected) return;
        if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); this._sceneNext(); }
      };
      document.addEventListener('keydown', this._key);

      el.addEventListener('pointerdown', e => { this.pointerType = e.pointerType || 'mouse'; Sfx.unlock(); });
      el.addEventListener('click', e => this.onClick(e));
      el.addEventListener('pointerover', e => {
        const t = e.target.closest('.b-hand .tile');
        const type = t ? +t.dataset.type : null;
        if (type !== this.hoverType) { this.hoverType = type; this.renderHint(); }
      });
      el.addEventListener('pointerleave', () => { if (this.hoverType != null) { this.hoverType = null; this.renderHint(); } });
    }

    updateTools() {
      this.$('[data-act="speed"]').textContent = T('b.speed', { v: T(this.speed < 1 ? 'b.fast' : 'b.normal') });
      this.$('[data-act="sound"]').textContent = T('sound', { v: T(Sfx.muted ? 'off' : 'on') });
      this.$('[data-act="voice"]').textContent = T('an.voice', { v: T(Voice.enabled ? 'on' : 'off') });
    }

    /** whose voice a seat speaks with ('lackey' has a voice but no portrait of his own) */
    voiceOf(seat) {
      const st = this.stage;
      return (st.who && st.who[seat]) || String(st.portraits[seat]).split(':')[0];
    }

    onClick(e) {
      const btn = e.target.closest('[data-act]');
      if (btn && ['speed', 'sound', 'voice', 'quit'].indexOf(btn.dataset.act) >= 0) { this.onAction(btn.dataset.act, btn); return; }
      if (this._sceneNext) { if (e.target.closest('.b-scene')) this._sceneNext(); return; }
      if (this.busy) return;
      if (btn) { this.onAction(btn.dataset.act, btn); return; }
      const ov = e.target.closest('[data-ov]');
      if (ov && this._overlayResolve) {
        const fn = this._overlayResolve;
        this._overlayResolve = null;
        const box = this.$('.b-overlay');
        box.hidden = true; box.innerHTML = '';
        Sfx.click();
        fn(ov.dataset.ov);
        return;
      }
      const pondTile = e.target.closest('.b-pond .tile.can');
      if (pondTile && this.mode === 'sleight-pond') {
        this.sleightSwap(+pondTile.closest('.b-pond').dataset.seat, +pondTile.dataset.id);
        return;
      }
      const tile = e.target.closest('.b-hand .tile');
      if (tile && tile.dataset.id != null) this.onTileClick(+tile.dataset.id);
    }

    onAction(act, btn) {
      const pend = this.pending;
      switch (act) {
        case 'speed':
          this.speed = this.speed < 1 ? 1 : 0.45;
          Save.data.settings.fast = this.speed < 1; Save.write();
          this.updateTools();
          return;
        case 'sound':
          Sfx.setMuted(!Sfx.muted);
          Save.data.settings.muted = Sfx.muted; Save.write();
          if (Sfx.muted) Voice.stop();
          this.updateTools();
          return;
        case 'voice':
          Voice.setEnabled(!Voice.enabled);
          this.updateTools();
          return;
        case 'quit':
          if (btn.dataset.armed) { this.finish({ aborted: true }); return; }
          btn.dataset.armed = '1'; btn.textContent = T('b.quitConfirm'); btn.classList.add('armed');
          setTimeout(() => { if (btn.isConnected) { delete btn.dataset.armed; btn.textContent = T('b.quit'); btn.classList.remove('armed'); } }, 2500);
          return;
      }
      if (!pend) return;
      if (pend.kind === 'turn') {
        if (act === 'tsumo' && pend.opts.canTsumo) this.resolvePending({ type: 'tsumo' });
        else if (act === 'riichi' && pend.opts.riichiDiscards.length) { this.mode = 'riichi'; this.selected = null; this.render(); }
        else if (act === 'cancel') { this.mode = 'discard'; this.selected = null; this.sleightOut = null; this.render(); }
        else if (act === 'skip') this.resolvePending({ type: 'discard', tile: this.round.players[0].drawn, riichi: false });
        else if (act === 'skill') this.useSkill();
      } else if (pend.kind === 'call') {
        if (act === 'ron' && pend.opts.canRon) this.resolvePending({ type: 'ron' });
        else if (act === 'pon' && pend.opts.pon) this.resolvePending({ type: 'pon', tiles: pend.opts.pon });
        else if (act === 'chi') this.resolvePending({ type: 'chi', tiles: pend.opts.chi[+btn.dataset.idx] });
        else if (act === 'pass') this.resolvePending({ type: 'pass' });
      }
    }

    canDiscard(id) {
      const pend = this.pending;
      if (!pend || pend.kind !== 'turn') return false;
      if (this.mode === 'sleight') return true;          // any tile may be swapped out
      if (this.mode === 'sleight-pond') return id === this.sleightOut;
      const p = this.round.players[0];
      if (p.riichi) return id === p.drawn;
      if (this.mode === 'riichi') return pend.opts.riichiDiscards.indexOf(id) >= 0;
      return pend.opts.forbidden.indexOf(typeOf(id)) < 0;
    }

    onTileClick(id) {
      if (this.mode === 'sleight' || this.mode === 'sleight-pond') {
        // first the tile to give away (click it again to choose another)
        this.sleightOut = this.sleightOut === id ? null : id;
        this.selected = this.sleightOut;
        this.mode = this.sleightOut == null ? 'sleight' : 'sleight-pond';
        this.render();
        return;
      }
      if (!this.canDiscard(id)) return;
      if (this.pointerType !== 'mouse' && this.selected !== id) {
        this.selected = id; // touch: first tap lifts the tile, second tap discards
        this.hoverType = typeOf(id);
        this.render();
        return;
      }
      this.resolvePending({ type: 'discard', tile: id, riichi: this.mode === 'riichi' });
    }

    resolvePending(action) {
      const pend = this.pending;
      if (!pend) return;
      this.pending = null;
      this.mode = 'idle';
      this.selected = null;
      this.hoverType = null;
      this.tenpaiMap = {};
      this.render();
      pend.resolve(action);
    }

    /* ---------------------------------------------------------------- */

    humanAgent() {
      return {
        onTurn: (round, seat, opts) => {
          if (this.openingStage === 'pending') {
            if (this.opening.kind === 'discard') return this.openingDiscard(round, opts);
            this.openingStage = 'done';      // a scene opening, or the scripted discard never came
            if (this.opening.kind === 'scene' && this.opening.intro) {
              this.render();
              return this.scene(this.opening.intro).then(() => this.playerTurn(round, opts));
            }
          }
          return this.playerTurn(round, opts);
        },
        onCall: (round, seat, opts) => {
          if (this.openingStage === 'pending' && this.opening.kind === 'call' && opts.canRon) return this.openingCall(round, opts);
          return new Promise(resolve => {
            this.pending = { kind: 'call', opts, resolve };
            this.render();
          });
        },
      };
    }

    /** wait for the player's discard (or tsumo) */
    playerTurn(round, opts) {
      const p = round.players[0];
      if (p.riichi && !opts.canTsumo) {
        return this.wait(520).then(() => ({ type: 'discard', tile: p.drawn, riichi: false }));
      }
      return new Promise(resolve => {
        this.pending = { kind: 'turn', opts, resolve };
        this.mode = 'discard';
        this.tenpaiMap = p.riichi ? {} : round.tenpaiDiscards(0);
        this.render();
      });
    }

    /* ---- skills ----------------------------------------------------- */

    /** fire the player's skill (a full gauge is needed) */
    async useSkill() {
      if (this.busy || !this.board.ready(0)) return;
      if (this.board.skillOf(0) === 'sleight') {
        this.mode = 'sleight'; this.sleightOut = null; this.selected = null;
        this.render();
        return;
      }
      this.busy = true;
      await this.board.activate(this.round, 0);     // the engine announces it; onEvent plays the cut-in
      this.busy = false;
      this.render();
    }

    /** Sleight of Hand: the hand tile has been chosen, now the pond tile - swap them */
    async sleightSwap(pondSeat, tileId) {
      const out = this.sleightOut;
      const pend = this.pending;
      if (out == null || !pend || pend.kind !== 'turn' || this.busy) return;
      this.busy = true;
      const done = await this.board.swap(this.round, 0, out, pondSeat, tileId);
      this.busy = false;
      this.mode = 'discard'; this.sleightOut = null; this.selected = null;
      if (done) {
        // the hand has changed: what the player may now declare has too
        const r = this.round;
        const win = r.tsumoResult(0);
        pend.opts.canTsumo = !!win;
        pend.opts.tsumoResult = win;
        pend.opts.riichiDiscards = r.riichiDiscards(0);
        this.tenpaiMap = r.tenpaiDiscards(0);
      }
      this.render();
    }

    /** what the player currently sees through: who is ready, on what, and which own tiles deal in */
    readInfo() {
      const r = this.round;
      const reads = this.board.reads(r, 0);
      if (!reads.length || r.finished) return null;
      const info = { reads, waiting: [], waits: {}, danger: new Set(), insight: this.board.active[0] === 'insight' };
      for (const s of reads) {
        const w = r.waitsOf(s);
        if (w.length) { info.waiting.push(s); info.waits[s] = w; }
      }
      for (const id of r.players[0].hand) {
        for (const s of info.waiting) if (r.ronResult(s, id)) info.danger.add(typeOf(id));
      }
      return info;
    }

    cutin(seat, skill) {
      const stage = this.stage;
      const [who, face] = String(stage.portraits[seat]).split(':');
      const faces = (Characters[who] && Characters[who].faces) || [];
      return CutIn.play(this.$('.b-cutin'), {
        who, face: seat === 0 ? (faces[2] || faces[0]) : (face || faces[0]),
        name: this.name(seat), skill, skillName: T('skill.' + skill),
        side: seat === 0 ? 'left' : 'right', fast: this.speed < 1,
      });
    }

    /* ---- the opening decision ------------------------------------- */

    /**
     * Story lines over the table: [{ who, face, think, text, fx }] or { note }
     * for a system notice. One click (or Space / Enter) per line.
     */
    scene(lines) {
      lines = (lines || []).filter(Boolean);
      if (!lines.length || this.aborted) return Promise.resolve();
      const box = this.$('.b-scene');
      box.hidden = false;
      return new Promise(resolve => {
        let i = 0;
        const next = () => {
          if (this.aborted) return;
          if (i >= lines.length) {
            this._sceneNext = null;
            box.hidden = true; box.innerHTML = '';
            resolve();
            return;
          }
          const l = lines[i++];
          if (l.fx === 'clack') Sfx.tile(); else Sfx.click();
          if (l.who) Voice.line(l.who, P(l.text)); else Voice.stop();
          for (const n of lines.slice(i, i + 2)) if (n.who) Voice.preload(n.who, P(n.text));
          if (l.note) {
            box.innerHTML = `<div class="scene-line note"><div class="scene-body"><p>${esc(P(l.note))}</p></div><span class="scene-next">▼</span></div>`;
            return;
          }
          const who = l.who ? Characters[l.who] : null;
          const open = l.think ? T('vn.thinkOpen') : '', close = l.think ? T('vn.thinkClose') : '';
          const text = esc(open + P(l.text) + close).replace(/\*([^*]+)\*/g, '<em>$1</em>');
          box.innerHTML = `<div class="scene-line ${l.think ? 'think' : ''} ${who ? '' : 'narr'}">` +
            (who ? `<div class="scene-face">${Portraits.avatar(l.who + (l.face ? ':' + l.face : ''))}</div>` : '') +
            `<div class="scene-body">${who ? `<b style="color:${who.color}">${esc(P(who.name))}</b>` : ''}<p>${text}</p></div>` +
            '<span class="scene-next">▼</span></div>';
        };
        this._sceneNext = next;
        next();
      });
    }

    /** show the decision panel over the table; resolves with the chosen key */
    decide(opts) {
      const box = this.$('.b-overlay');
      box.className = 'b-overlay deciding';
      box.innerHTML = '<div class="card decide-card"><div class="decide-host"></div></div>';
      box.hidden = false;
      return Decision.open(box.querySelector('.decide-host'), Object.assign({ nameOf: s => this.name(s) }, opts)).then(key => {
        box.hidden = true; box.innerHTML = '';
        return key;
      });
    }

    /** the first discard of the match is the player's winning tile: take it, or let it go? */
    async openingCall(round, opts) {
      const op = this.opening;
      this.render();
      await this.scene(op.intro);
      if (op.auto) {
        // a scripted moment: the story answers for the player
        const option = op.options.find(o => o.id === op.auto);
        await this.scene(option.note);
        await this.resolveOpening(option);
        return { type: option.id === 'ron' ? 'ron' : 'pass' };
      }
      const view = Analysis.viewOfRound(round, 0);
      const quiet = Analysis.tenpai(view, view.hand, false);
      const loud = view.canRiichi ? Analysis.tenpai(view, view.hand, true) : null;
      const res = opts.ronResult;
      const pay = Yaku.payments(res.base, round.dealer === 0, false, round.honba).ron;
      const tile = typeOf(opts.tile);
      const best = (loud || quiet).value.max;
      const situation = `<span class="dec-from">${esc(T('an.from', { name: this.name(opts.from) }))}</span>${TileView.type(tile, 'dh win')}` +
        `<span class="dec-arrow">→</span><span class="dec-mine">${view.hand.map(t => TileView.type(t, 'ds')).join('')}</span>`;
      const choices = op.options.map(o => (o.id === 'ron'
        ? { key: 'ron', label: P(o.label), sub: T('an.ron.sub', { n: fmt(pay) }),
            html: Explain.ronHtml(res, pay, this.name(opts.from), tile),
            speech: Explain.ronSpeech(pay, this.name(opts.from)) }
        : { key: o.id, label: P(o.label), sub: T('an.pass.sub', { n: fmt(best) }),
            html: Explain.passHtml(quiet, loud),
            speech: Explain.passSpeech(quiet, best) }));
      const key = await this.decide({
        kind: 'choice', title: P(op.title), situation, choices,
        notes: k => (op.options.find(o => o.id === k) || {}).note,
      });
      await this.resolveOpening(op.options.find(o => o.id === key));
      return { type: key === 'ron' ? 'ron' : 'pass' };
    }

    /** the match opens on a plain choice from the story - no hand to weigh, only the moment */
    async openingChoice() {
      const op = this.opening;
      this.render();
      await this.scene(op.intro);
      const key = await this.decide({
        kind: 'choice', title: P(op.title), situation: op.situation ? `<p>${esc(P(op.situation))}</p>` : '',
        choices: op.options.map(o => ({
          key: o.id, label: P(o.label), sub: o.sub ? P(o.sub) : '',
          html: o.desc ? `<p>${esc(P(o.desc))}</p>` : '', speech: [],
        })),
        notes: k => (op.options.find(o => o.id === k) || {}).note,
      });
      await this.resolveOpening(op.options.find(o => o.id === key));
    }

    /** the match opens on a discard that matters: which tile? */
    async openingDiscard(round) {
      const op = this.opening;
      const p = round.players[0];
      this.render();
      await this.scene(op.intro);
      const view = Analysis.viewOfRound(round, 0);
      const hand = p.hand.filter(id => id !== p.drawn).map(typeOf);
      if (p.drawn != null) hand.push(typeOf(p.drawn));
      const noteOf = t => op.notes[Tiles.code(t)] || op.notes['*'] || [];
      const t = await this.decide({
        kind: 'discard', title: P(op.title), hand, drawn: p.drawn != null,
        rows: Analysis.discards(view), notes: noteOf,
      });
      const code = Tiles.code(t);
      await this.resolveOpening(op.options.find(o => o.tiles === code) || op.options.find(o => o.tiles === '*'));
      const tile = (p.drawn != null && typeOf(p.drawn) === t) ? p.drawn : p.hand.find(id => typeOf(id) === t);
      return { type: 'discard', tile, riichi: false };
    }

    async resolveOpening(option) {
      this.openingOption = option;
      this.openingStage = (option.later || option.laterEffects) ? 'later' : 'done';
      await this.scene(option.after);
      await this.applyEffects(option.effects);
    }

    /** consequences of the opening: change the board, then tell the player what changed */
    async applyEffects(effects) {
      if (!effects || !effects.length) return;
      // { fire: { seat } }: that seat's skill goes off now (its cut-in plays through the engine event)
      for (const e of effects) if (e.fire) await this.board.activate(this.round, e.fire.seat);
      const notices = Skills.applyEffects(this.board, effects.filter(e => !e.fire));
      this.render();
      return this.scene(notices.map(n => ({
        note: T('note.' + n.type, {
          name: n.seat != null ? this.name(n.seat) : '',
          target: n.target != null ? this.name(n.target) : '',
          skill: n.skill ? T('skill.' + n.skill) : '',
          n: n.add,
        }),
      })));
    }

    /** lines that belong after the opening hand has been settled */
    async openingAftermath(res) {
      if (this.openingStage !== 'later') return;
      this.openingStage = 'done';
      const o = this.openingOption;
      // only if the hand really ended the way the option says (a win for 'ron', a deal-in otherwise)
      const happened = res.type === 'win' && (o.id === 'ron' ? res.winner === 0 : res.loser === 0);
      if (!happened) return;
      await this.scene(o.later);
      await this.applyEffects(o.laterEffects);
    }

    /* ---------------------------------------------------------------- */

    async onEvent(evt, round) {
      if (this.aborted) return new Promise(() => {});
      this.round = round;
      this.board.onEvent(evt);      // the rage gauges fill from what happens at the table
      switch (evt.type) {
        case 'round-start':
          this.lastDiscard = null;
          this.render();
          break;
        case 'skill': {
          this.render();
          Voice.shout(this.voiceOf(evt.seat), evt.skill);
          await this.cutin(evt.seat, evt.skill);
          this.render();
          // a watching Insight goes off by itself: say what it does the first time
          const watch = this.board.watchOf(evt.seat);
          if (watch != null && !this._watchExplained) {
            this._watchExplained = true;
            await this.scene([{ note: T('note.watchFires', { name: this.name(evt.seat), target: this.name(watch) }) }]);
          }
          break;
        }
        case 'deal': {
          this.render();
          let sub = T('b.dealer', { name: this.name(round.dealer) });
          if (round.honba) sub += ' · ' + T('b.nHonba', { n: round.honba });
          await this.banner(this.roundName(round), sub);
          if (this.openingStage === 'pending' && !this._preluded) {
            this._preluded = true;
            await this.scene(this.opening.prelude);
            if (this.opening.kind === 'choice') await this.openingChoice(round);
          }
          break;
        }
        case 'draw':
          this.render();
          if (evt.seat !== 0) await this.wait(380);
          break;
        case 'discard':
          this.lastDiscard = { seat: evt.seat, tile: evt.tile };
          this.render();
          Sfx.tile();
          await this.wait(evt.seat === 0 ? 260 : 430);
          break;
        case 'riichi':
          this.render();
          Sfx.riichi();
          Voice.call(this.voiceOf(evt.seat), 'riichi');
          await this.bubble(evt.seat, T('call.riichi'), 850);
          break;
        case 'call':
          this.lastDiscard = null;
          this.render();
          Sfx.call();
          Voice.call(this.voiceOf(evt.seat), evt.callType);
          await this.bubble(evt.seat, T(evt.callType === 'pon' ? 'call.pon' : 'call.chi'), 650);
          break;
        case 'win':
          this.render();
          if (evt.result.winner === 0) Sfx.win(); else Sfx.lose();
          Voice.call(this.voiceOf(evt.result.winner), evt.result.tsumo ? 'tsumo' : 'ron');
          await this.bubble(evt.result.winner, T(evt.result.tsumo ? 'call.tsumo' : 'call.ron'), 1100);
          break;
        case 'swap':
          this.lastDiscard = { seat: evt.from, tile: evt.out };
          this.render();
          Sfx.tile();
          await this.wait(320);
          break;
        case 'exhaustive':
        case 'pause':
        case 'exposed':
          this.render();
          await this.wait(500);
          break;
        case 'round-end':
          this.render();
          await this.showRoundResult(evt.result, round, evt.over);
          await this.openingAftermath(evt.result);
          break;
        case 'match-end':
          break;
      }
    }

    bubble(seat, text, ms) {
      const b = this.$('.b-bubble[data-seat="' + seat + '"]');
      b.textContent = text;
      b.classList.remove('show');
      void b.offsetWidth;
      b.classList.add('show');
      return this.wait(ms).then(() => { b.classList.remove('show'); });
    }

    banner(title, sub) {
      const b = this.$('.b-banner');
      b.innerHTML = `<div class="banner-title">${esc(title)}</div><div class="banner-sub">${esc(sub)}</div>`;
      b.classList.add('show');
      return this.wait(1300).then(() => { b.classList.remove('show'); });
    }

    overlay(html, cls) {
      const box = this.$('.b-overlay');
      box.className = 'b-overlay ' + (cls || '');
      box.innerHTML = html;
      box.hidden = false;
      return new Promise(resolve => { this._overlayResolve = resolve; });
    }

    /* ---------------------------------------------------------------- */

    render() {
      const r = this.round;
      if (!r || !this.el) return;
      this._read = this.readInfo();
      this.renderInfo(r);
      for (const s of [1, 2, 3]) this.renderSeat(r, s);
      for (const s of [0, 1, 2, 3]) this.renderPond(r, s);
      this.renderMe(r);
      this.renderHint();
    }

    windBadge(r, seat) {
      const w = r.seatWind(seat) - 27;
      const tip = T('b.seatWind', { wind: I18n.windName(w) }) + (w === 0 ? T('b.dealerMark') : '');
      return `<span class="wind-badge ${w === 0 ? 'dealer' : ''}" lang="ja" title="${esc(tip)}">${WIND_KANJI[w]}</span>`;
    }

    renderInfo(r) {
      this.$('.b-info').innerHTML = `
        <div class="info-round">${esc(this.roundName(r))}</div>
        <div class="info-line">${esc(T('b.honba'))} <b>${r.honba}</b> · ${esc(T('b.sticks'))} <b>${r.riichiSticks}</b></div>
        <div class="info-line">${esc(T('b.wall'))} <b>${r.wall.length}</b></div>
        <div class="info-dora" title="${esc(T('b.doraTip'))}"><span>${T('b.doraInd')}</span>${r.doraIndicators.length ? TileView.html(r.doraIndicators[0], 'pt') : ''}</div>`;
    }

    meldHtml(m, cls) {
      return `<span class="meld">${m.tiles.map(id => TileView.html(id, cls + (id === m.called ? ' called' : ''))).join('')}</span>`;
    }

    riichiStick(p) {
      return p.riichi ? `<div class="riichi-stick" title="${esc(T('b.riichiTip'))}"><i></i></div>` : '';
    }

    renderSeat(r, seat) {
      const p = r.players[seat];
      const turn = r.turn === seat && !r.finished;
      const backs = new Array(p.hand.length + 1).join(TileView.back('bk'));
      const info = this._read;
      // a hand the player sees through: its waits are written on the seat
      let read = '';
      if (info && info.reads.indexOf(seat) >= 0) {
        read = info.waits[seat]
          ? `<div class="seat-read ready"><span>${esc(T('read.waits'))}</span>${info.waits[seat].map(t => TileView.type(t, 'xs')).join('')}</div>`
          : `<div class="seat-read"><span>${esc(T('read.noten'))}</span></div>`;
      }
      const watching = this.board.active[seat] === 'insight' ? `<div class="seat-status">${esc(T('status.reading'))}</div>` : '';
      this.$('.b-seat[data-seat="' + seat + '"]').innerHTML = `
        <div class="seat-card ${turn ? 'turn' : ''} ${p.riichi ? 'in-riichi' : ''}">
          <div class="seat-head">
            <div class="seat-face">${Portraits.avatar(this.stage.portraits[seat])}</div>
            <div class="seat-meta">
              <div class="seat-name">${this.windBadge(r, seat)}${esc(this.name(seat))}</div>
              <div class="seat-score">${fmt(r.scores[seat])}</div>
            </div>
          </div>
          ${this.gaugeHtml(seat)}${watching}
          ${this.riichiStick(p)}${read}
          <div class="seat-hand">${backs}</div>
          <div class="seat-melds">${p.melds.map(m => this.meldHtml(m, 'pt')).join('')}</div>
        </div>`;
    }

    /** the rage gauge of a seat that owns a skill */
    gaugeHtml(seat) {
      const skill = this.board.skillOf(seat);
      if (!skill) return '';
      const g = Math.round(this.board.gauge(seat));
      const active = this.board.active[seat];
      const cls = active ? 'active' : (this.board.ready(seat) ? 'ready' : '');
      let label = T('skill.' + skill);
      if (active === 'flow' && this.board.flowLeft[seat] > 0) label += ' ×' + this.board.flowLeft[seat];
      if (skill === 'sleight') label += ' ×' + this.board.usesLeft(seat);
      const watch = this.board.watchOf(seat);
      const desc = watch != null ? T('skill.insight.watch', { target: this.name(watch) }) : T('skill.' + skill + '.desc');
      return `<div class="gauge ${cls}" title="${esc(T('gauge.tip', { skill: T('skill.' + skill), desc }))}">` +
        `<span class="gauge-icon skill-${skill}"></span>` +
        `<span class="gauge-bar"><i style="--g:${active ? 100 : g}"></i></span>` +
        `<span class="gauge-label">${esc(label)}</span></div>`;
    }

    renderPond(r, seat) {
      const p = r.players[seat];
      const cells = [];
      let carryRiichi = false;
      for (const d of p.discards) {
        if (d.called) { if (d.riichi) carryRiichi = true; continue; }
        let cls = 'pt';
        if (d.riichi || carryRiichi) { cls += ' sideways'; carryRiichi = false; }
        if (this.lastDiscard && this.lastDiscard.tile === d.tile) cls += ' last';
        if (this.mode === 'sleight-pond' && this.pending) cls += ' can';
        cells.push(TileView.html(d.tile, cls));
      }
      const rows = [cells.slice(0, 6), cells.slice(6, 12), cells.slice(12)];
      this.$('.b-pond[data-seat="' + seat + '"]').innerHTML =
        rows.map(row => `<div class="pond-row">${row.join('')}</div>`).join('');
    }

    renderMe(r) {
      const p = r.players[0];
      const pend = this.pending;
      const myTurn = pend && pend.kind === 'turn';
      const turn = r.turn === 0 && !r.finished;

      this.$('.b-me-info').innerHTML = `
        <div class="seat-card me ${turn ? 'turn' : ''} ${p.riichi ? 'in-riichi' : ''}">
          <div class="seat-head">
            <div class="seat-face">${Portraits.avatar(this.stage.portraits[0])}</div>
            <div class="seat-meta">
              <div class="seat-name">${this.windBadge(r, 0)}${esc(this.name(0))}</div>
              <div class="seat-score">${fmt(r.scores[0])}</div>
            </div>
          </div>
          ${this.gaugeHtml(0)}
          ${this.riichiStick(p)}
        </div>`;
      const watched = [1, 2, 3].filter(s => this.board.active[s] === 'insight');
      this.$('.b-handrow').classList.toggle('watched', watched.length > 0);
      this.$('.b-handrow').dataset.watch = watched.length ? T('status.watched', { name: I18n.list(watched.map(s => this.name(s))) }) : '';

      let html = '';
      const tileHtml = id => {
        const t = typeOf(id);
        let cls = 'hd';
        if (myTurn) cls += this.canDiscard(id) ? ' can' : ' dim';
        if (this.mode === 'sleight-pond' && id === this.sleightOut) cls += ' swap-out';
        if (id === p.drawn) cls += ' drawn';
        if (this.selected === id) cls += ' sel';
        if (this._read && this._read.danger.has(t)) cls += ' danger';
        if (myTurn && this.mode === 'discard' && this.tenpaiMap[t] && this.canDiscard(id)) cls += ' tenpai';
        return TileView.html(id, cls);
      };
      for (const id of p.hand) if (id !== p.drawn) html += tileHtml(id);
      if (p.drawn != null) html += tileHtml(p.drawn);
      this.$('.b-hand').innerHTML = html;
      this.$('.b-melds').innerHTML = p.melds.map(m => this.meldHtml(m, 'ml')).join('');

      /* action buttons */
      const button = (cls, act, label, extra) => `<button class="btn ${cls}" data-act="${act}" ${extra || ''}>${label}</button>`;
      let acts = '';
      if (pend && pend.kind === 'turn') {
        if (this.mode === 'riichi' || this.mode === 'sleight' || this.mode === 'sleight-pond') {
          acts += button('', 'cancel', esc(T('act.cancel')));
        } else {
          if (pend.opts.canTsumo) acts += button('btn-win', 'tsumo', esc(T('act.tsumo')));
          if (pend.opts.riichiDiscards.length) acts += button('btn-riichi', 'riichi', esc(T('act.riichi')));
          if (p.riichi && pend.opts.canTsumo) acts += button('', 'skip', esc(T('act.pass')));
          const skill = this.board.skillOf(0);
          if (skill && this.board.ready(0) && !((skill === 'insight' || skill === 'sleight') && p.riichi)) {
            acts += button('btn-skill', 'skill', `<span class="gauge-icon skill-${skill}"></span>` + esc(T('act.skill', { skill: T('skill.' + skill) })),
              `title="${esc(T('skill.' + skill + '.desc'))}"`);
          }
        }
      } else if (pend && pend.kind === 'call') {
        const o = pend.opts;
        if (o.canRon) acts += button('btn-win', 'ron', esc(T('act.ron')));
        if (o.pon) acts += button('btn-call', 'pon', esc(T('act.pon')));
        o.chi.forEach((pair, i) => {
          acts += button('btn-call', 'chi', esc(T('act.chi')) + ' ' + pair.map(id => TileView.html(id, 'xs')).join(''), `data-idx="${i}"`);
        });
        acts += button('', 'pass', esc(T('act.pass')));
      }
      this.$('.b-actions').innerHTML = acts;
    }

    waitsHtml(types) {
      const unseen = AI.unseenCounts(this.round, 0);
      let live = 0;
      for (const t of types) live += Math.max(0, unseen[t]);
      return types.map(t => TileView.type(t, 'xs')).join('') + `<span class="live">${esc(T('hint.left', { n: live }))}</span>`;
    }

    renderHint() {
      const r = this.round;
      const box = this.$('.b-hint');
      if (!r || !box) return;
      const p = r.players[0];
      const pend = this.pending;
      let html = '';

      const read = this._read;
      if (read && pend && pend.kind === 'turn' && this.hoverType == null && this.mode !== 'riichi' && (read.insight || read.waiting.length)) {
        const who = I18n.list(read.waiting.map(s => this.name(s)));
        const n = read.waiting.length;
        let msg;
        if (!n) msg = T('hint.insightNone');
        else if (read.danger.size) msg = T('hint.insightDanger', { who, n });
        else msg = T('hint.insightSafe', { who, n });
        html = `<span class="insight-msg">${esc(msg)}</span>`;
      } else if (pend && pend.kind === 'call') {
        const o = pend.opts;
        // escape the sentence first, then drop the tile markup into its placeholder
        html = esc(T('hint.call', { name: this.name(o.from), tile: '\u0000' })).replace('\u0000', TileView.html(o.tile, 'xs'));
      } else if (pend && pend.kind === 'turn') {
        const hov = this.hoverType;
        const withTiles = (key, types) => esc(T(key, { tiles: '\u0000' })).replace('\u0000', this.waitsHtml(types));
        if (this.mode === 'sleight') {
          html = esc(T('hint.sleightHand', { n: this.board.usesLeft(0) }));
        } else if (this.mode === 'sleight-pond') {
          html = esc(T('hint.sleightPond'));
        } else if (this.mode === 'riichi') {
          html = esc(T('hint.riichiChoose'));
          if (hov != null && this.tenpaiMap[hov]) html += withTiles('hint.riichiWaits', this.tenpaiMap[hov]);
        } else if (p.riichi) {
          html = esc(T('hint.canWin'));
        } else if (hov != null && this.tenpaiMap[hov]) {
          html = withTiles('hint.tenpaiDiscard', this.tenpaiMap[hov]);
        } else if (pend.opts.afterCall) {
          html = esc(T('hint.afterCall'));
        } else if (Object.keys(this.tenpaiMap).length) {
          html = esc(T('hint.turnTenpai'));
        } else {
          html = esc(T('hint.turn'));
        }
      } else if (!r.finished) {
        const w = r.waitsOf(0);
        if (w.length) {
          html = esc(T('hint.tenpai', { tiles: '\u0000' })).replace('\u0000', this.waitsHtml(w));
          if (r.isFuriten(0)) html += ` <span class="furiten" title="${esc(T('hint.furitenTip'))}">${esc(T('hint.furiten'))}</span>`;
        }
      }
      box.innerHTML = html;
    }

    /* ---------------------------------------------------------------- */

    showIntro() {
      const st = this.stage;
      // what a seat's skill does (a watching Insight says whom it watches)
      const skillDesc = s => {
        const k = this.board.skillOf(s), w = this.board.watchOf(s);
        return w != null ? T('skill.insight.watch', { target: this.name(w) }) : T('skill.' + k + '.desc');
      };
      const skillCell = s => {
        const k = this.board.skillOf(s);
        return k ? `<span title="${esc(skillDesc(s))}"><span class="gauge-icon skill-${k}"></span>${esc(T('skill.' + k))}</span>` : '';
      };
      const foeSkills = [1, 2, 3].filter(s => this.board.skillOf(s)).map(s => `<li><span class="gauge-icon skill-${this.board.skillOf(s)}"></span>` +
        T('intro.foeSkill', { skill: esc(T('skill.' + this.board.skillOf(s))), name: esc(this.name(s)), desc: esc(skillDesc(s)) }) + '</li>').join('');
      const rows = st.names.map((n, s) => {
        const style = st.ai[s] && st.ai[s].style;
        const role = s === 0 ? `<span class="you-mark">${esc(T('you'))}</span>`
          : `<span class="role role-${style}" title="${esc(T('role.' + style + '.desc'))}">${esc(T('role.' + style))}</span>`;
        return `<tr class="${s === 0 ? 'me' : ''}"><td>${esc(P(n))}</td><td>${role}</td><td class="skill-cell">${skillCell(s)}</td><td>${fmt(st.scores[s])}</td></tr>`;
      }).join('');
      const roles = [...new Set(st.ai.filter(Boolean).map(a => a.style))]
        .map(k => `<li><span class="role role-${k}">${esc(T('role.' + k))}</span> ${esc(T('role.' + k + '.desc'))}</li>`).join('');
      const mine = this.board.skillOf(0);
      const roundName = T(st.startWind === 0 ? 'round.east' : 'round.south');
      return this.overlay(`
        <div class="card intro-card">
          <div class="card-kicker">${esc(T('stage.no', { n: st.no }))}</div>
          <h2>${esc(P(st.title))}</h2>
          <div class="card-sub">${esc(T('vs', { name: P(st.opponent) }))}</div>
          <p>${esc(P(st.blurb))}</p>
          <div class="goal-box"><span>${esc(T('intro.clear'))}</span>${esc(P(st.goal.text))}</div>
          <table class="score-table intro-table"><caption>${esc(T('intro.start', { round: roundName }))}</caption>${rows}</table>
          <ul class="role-list">${roles}</ul>
          ${mine ? `<p class="small">${T(Skills.DEFS[mine] && Skills.DEFS[mine].cost ? 'intro.skillCost' : 'intro.skill', { skill: esc(T('skill.' + mine)), desc: esc(T('skill.' + mine + '.desc')) })}</p>` : ''}
          ${foeSkills ? `<ul class="role-list skill-list">${foeSkills}</ul>` : ''}
          ${st.opening ? `<p class="small opening-note">${esc(T(st.opening.auto || st.opening.kind === 'scene' ? 'intro.openingScene' : 'intro.opening'))}</p>` : ''}
          <button class="btn btn-primary" data-ov="go">${esc(T('intro.go'))}</button>
        </div>`);
    }

    showRoundResult(res, r, over) {
      const scoreRows = [0, 1, 2, 3].map(s => {
        const d = res.deltas[s];
        return `<tr class="${s === 0 ? 'me' : ''}"><td>${esc(this.name(s))}${s === 0 ? this.youMark() : ''}</td>` +
          `<td class="delta ${d > 0 ? 'up' : d < 0 ? 'down' : ''}">${d ? signed(d) : ''}</td><td>${fmt(r.scores[s])}</td></tr>`;
      }).join('');
      const nextLabel = esc(T(over ? 'res.final' : 'res.next'));
      const kicker = esc(this.roundName(r)) + (r.honba ? ' · ' + esc(T('b.nHonba', { n: r.honba })) : '');

      if (res.type === 'win') {
        const sc = res.score;
        const mine = res.winner === 0;
        const hand = res.hand.map(id => TileView.html(id, 'rs')).join('') +
          '<span class="win-gap"></span>' + TileView.html(res.winTile, 'rs win') +
          res.melds.map(m => this.meldHtml(m, 'rs')).join('');
        const yaku = sc.yaku.map(y =>
          `<li><span>${esc(I18n.yakuName(y))}</span><span>${esc(y.yakuman > 1 ? T('limit.multi', { n: y.yakuman }) : y.yakuman ? T('res.yakuman') : T('res.han', { n: y.han }))}</span></li>`).join('');
        const limit = I18n.limitName(sc);
        const total = sc.yakuman ? limit : T('res.hanfu', { han: sc.han, fu: sc.fu }) + (limit ? ' · ' + limit : '');
        let payText;
        if (!res.tsumo) payText = T('res.pays', { name: this.name(res.loser), n: fmt(res.pay.ron) });
        else if (res.dealerWon) payText = T('res.all', { n: fmt(res.pay.fromOthers) });
        else payText = T('res.split', { a: fmt(res.pay.fromOthers), b: fmt(res.pay.fromDealer) });
        if (res.sticksWon) payText += ' · ' + T('res.sticks', { n: fmt(res.sticksWon * 1000) });
        const dora = `<div class="dora-row"><span>${esc(T('res.dora'))}</span>${res.doraIndicators.map(id => TileView.html(id, 'xs')).join('')}` +
          (res.uraIndicators.length ? `<span>${esc(T('res.ura'))}</span>${res.uraIndicators.map(id => TileView.html(id, 'xs')).join('')}` : '') + '</div>';
        return this.overlay(`
          <div class="card result-card ${mine ? 'mine' : 'theirs'}">
            <div class="card-kicker">${kicker}</div>
            <h2><span class="call-word">${esc(T(res.tsumo ? 'res.tsumo' : 'res.ron'))}</span> ${esc(this.name(res.winner))}</h2>
            <div class="result-hand">${hand}</div>
            ${dora}
            <ul class="yaku-list">${yaku}</ul>
            <div class="result-total"><span>${esc(total)}</span><b>${fmt(res.pay.total)}</b></div>
            <div class="pay-text">${esc(payText)}</div>
            <table class="score-table">${scoreRows}</table>
            <button class="btn btn-primary" data-ov="next">${nextLabel}</button>
          </div>`);
      }

      if (res.type === 'pause' || res.type === 'exposed') {
        let body;
        if (res.type === 'pause') {
          const p = r.players[res.seat];
          const value = res.yakuman ? (res.yakuman > 1 ? T('limit.multi', { n: res.yakuman }) : T('limit.yakuman'))
            : res.han ? T('res.han', { n: res.han }) : '';
          body = `<div class="result-hand">${p.hand.map(id => TileView.html(id, 'rs')).join('')}</div>` +
            (res.waits.length
              ? `<p class="small">${esc(T('res.pauseWaits', { name: this.name(res.seat) }))} ${res.waits.map(t => TileView.type(t, 'xs')).join('')}${value ? ' · <b>' + esc(value) + '</b>' : ''}</p>`
              : `<p class="small">${esc(T('res.pauseNoten', { name: this.name(res.seat) }))}</p>`);
        } else {
          body = `<p class="small">${esc(T('res.exposedText', { name: this.name(res.by), target: this.name(res.target) }))}</p>`;
        }
        return this.overlay(`
          <div class="card result-card">
            <div class="card-kicker">${kicker}</div>
            <h2>${esc(T(res.type === 'pause' ? 'res.pause' : 'res.exposed'))}</h2>
            ${body}
            <table class="score-table">${scoreRows}</table>
            <button class="btn btn-primary" data-ov="next">${nextLabel}</button>
          </div>`);
      }

      const hands = [0, 1, 2, 3].map(s => {
        const tenpai = res.tenpai.indexOf(s) >= 0;
        return `<div class="draw-row ${tenpai ? 'tenpai' : 'noten'}"><span class="draw-name">${esc(this.name(s))}</span>` +
          `<span class="draw-state">${esc(T(tenpai ? 'res.tenpai' : 'res.noten'))}</span>` +
          `<span class="draw-hand">${tenpai ? res.hands[s].map(id => TileView.html(id, 'xs')).join('') : ''}</span></div>`;
      }).join('');
      return this.overlay(`
        <div class="card result-card">
          <div class="card-kicker">${kicker}</div>
          <h2>${esc(T('res.draw'))}</h2>
          <p class="small">${esc(T('res.drawText'))}</p>
          <div class="draw-list">${hands}</div>
          <table class="score-table">${scoreRows}</table>
          <button class="btn btn-primary" data-ov="next">${nextLabel}</button>
        </div>`);
    }

    showFinal(final, cleared) {
      const rows = final.ranking.map((s, i) =>
        `<tr class="${s === 0 ? 'me' : ''}"><td>${esc(T('place.' + (i + 1)))}</td><td>${esc(this.name(s))}${s === 0 ? this.youMark() : ''}</td><td>${fmt(final.scores[s])}</td></tr>`).join('');
      if (cleared) Sfx.win(); else Sfx.lose();
      let buttons;
      if (this.opts.context === 'story') {
        buttons = `<button class="btn btn-primary" data-ov="continue">${esc(T('fin.continue'))}</button>`;
      } else {
        const next = Stages.next(this.stage.id);
        buttons = `<button class="btn" data-ov="retry">${esc(T('fin.again'))}</button>`;
        if (cleared && next) buttons += `<button class="btn btn-primary" data-ov="next">${esc(T('fin.next'))}</button>`;
        buttons += `<button class="btn" data-ov="back">${esc(T('fin.select'))}</button>`;
      }
      return this.overlay(`
        <div class="card final-card ${cleared ? 'cleared' : 'failed'}">
          <div class="card-kicker">${esc(T('stage.no', { n: this.stage.no }))} · ${esc(P(this.stage.title))}</div>
          <div class="verdict" data-result="${cleared ? 'clear' : 'defeat'}">${esc(T(cleared ? 'fin.clear' : 'fin.defeat'))}</div>
          <p class="small">${esc(P(this.stage.goal.text))}</p>
          <table class="score-table final">${rows}</table>
          <div class="btn-row">${buttons}</div>
        </div>`);
    }

    showError(err) {
      this.overlay(`
        <div class="card">
          <h2>${esc(T('err.title'))}</h2>
          <p class="small">${esc(err && err.message || err)}</p>
          <button class="btn btn-primary" data-ov="x">${esc(T('err.leave'))}</button>
        </div>`).then(() => this.finish({ aborted: true }));
    }
  }

  root.Battle = Battle;
})(window);
