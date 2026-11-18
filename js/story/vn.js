/*
 * Visual-novel engine. See js/data/chapter1.js for the script format.
 *
 * Besides text, portraits and choices it can lay a mahjong table out behind
 * the dialogue ({ table }) and stop on a discard that matters ({ decide }),
 * where every tile of the hand shows where it leads.
 *
 * A hand can also be played out on that table, move by move ({ move }, { focus } - the moves are
 * js/story/storystate.js's), and Washizu mahjong keeps a ledger on screen ({ stakes }, { bleed },
 * { pay }, { transfuse }) with the blood rack as a prop ({ rack }): see chapter1.js for the commands.
 *
 *   const vn = new VN(hostEl, chapter, {
 *     onBattle: stageId => Promise<{ cleared }>,   // run a mahjong stage
 *     onEnd: cmd => {},                            // chapter finished ({ completed })
 *     onQuit: () => {},                            // player left via the menu
 *   });
 *   vn.play();
 */
(function (root) {
  'use strict';

  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const SLOTS = ['left', 'center', 'right'];

  class VN {
    constructor(host, chapter, hooks) {
      this.host = host;
      this.chapter = chapter;
      this.script = chapter.script;
      this.hooks = hooks || {};
      this.labels = {};
      this.script.forEach((c, i) => { if (c.label) this.labels[c.label] = i; });
      this.i = 0;
      this.dead = false;
      this.skip = false;
      this.auto = false;
      this.log = [];
      this.slots = { left: null, center: null, right: null };
      this.faces = {};     // current expression per character
      this.rain = false;
      this.onAdvance = null;
      this.paused = false; // true while a battle, a decision or the log is on screen
      this.flags = {};     // decisions taken so far: { flagName: optionId, opening: 'ron' | 'pass' | ... }
      this.table = null;   // the mahjong table currently laid out behind the text, if any
      this.stakes = null;  // Washizu mahjong's ledger while it is on screen: { blood, lethal, funds, won }
      this.ledgerAt = {};  // the ledger as it stood when each label was passed (see jump)
      this.rackAt = null;  // the level the rack prop shows (null = no prop; 'live' follows the ledger)
    }

    $(sel) { return this.el.querySelector(sel); }

    mount() {
      this.host.innerHTML = '';
      const el = document.createElement('div');
      el.className = 'vn';
      el.innerHTML = `
        <div class="vn-bg"><div class="bg-layer" data-bg="black"></div><div class="rain"></div><div class="rain far"></div><div class="flash"></div></div>
        <div class="vn-chars">${SLOTS.map(s => `<div class="vn-char at-${s}" data-slot="${s}"></div>`).join('')}</div>
        <div class="vn-table" hidden></div>
        <div class="vn-rack" hidden></div>
        <div class="vn-stakes" hidden></div>
        <div class="vn-fx"></div>
        <div class="vn-box"><div class="vn-face"></div><div class="vn-name"></div><div class="vn-text"></div><div class="vn-next">▼</div></div>
        <div class="vn-card" hidden></div>
        <div class="vn-choices" hidden></div>
        <div class="vn-tools">
          <button data-vn="log">${esc(I18n.t('vn.log'))}</button>
          <button data-vn="auto">${esc(I18n.t('vn.auto'))}</button>
          <button data-vn="skip">${esc(I18n.t('vn.skip'))}</button>
          <button data-vn="sound"></button>
          <button data-vn="voice"></button>
          <button data-vn="quit">${esc(I18n.t('vn.title'))}</button>
        </div>
        <div class="vn-log" hidden></div>`;
      this.host.appendChild(el);
      this.el = el;
      this.updateTools();

      el.addEventListener('click', e => {
        Sfx.unlock();
        const tool = e.target.closest('[data-vn]');
        if (tool) { this.onTool(tool.dataset.vn); return; }
        const replay = e.target.closest('[data-replay]');
        if (replay) { const l = this.log[+replay.dataset.replay]; if (l) Voice.line(l.who, l.raw); return; }
        const ch = e.target.closest('[data-choice]');
        if (ch) { if (this._choose) this._choose(+ch.dataset.choice); return; }
        if (!this.$('.vn-log').hidden) { this.$('.vn-log').hidden = true; return; }
        this.advance();
      });
      this._key = e => {
        if (this.dead || this.paused || !this.el.isConnected) return;
        if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); this.advance(); }
        else if (e.key === 'Escape') { this.$('.vn-log').hidden = true; }
      };
      document.addEventListener('keydown', this._key);
    }

    destroy() {
      this.dead = true;
      clearInterval(this._typeTimer);
      clearTimeout(this._autoTimer);
      document.removeEventListener('keydown', this._key);
      Sfx.rain(false);
      Voice.stop();
    }

    updateTools() {
      this.$('[data-vn="auto"]').classList.toggle('on', this.auto);
      this.$('[data-vn="skip"]').classList.toggle('on', this.skip);
      this.$('[data-vn="sound"]').textContent = I18n.t('sound', { v: I18n.t(Sfx.muted ? 'off' : 'on') });
      this.$('[data-vn="voice"]').textContent = I18n.t('an.voice', { v: I18n.t(Voice.enabled ? 'on' : 'off') });
    }

    onTool(name) {
      switch (name) {
        case 'log': this.showLog(); break;
        case 'auto':
          this.auto = !this.auto; this.skip = false;
          this.updateTools();
          if (this.auto && this._lineDone && this._autoFrom) this._autoFrom();
          break;
        case 'skip':
          this.skip = !this.skip; this.auto = false;
          this.updateTools();
          if (this.skip) this.advance();
          break;
        case 'sound':
          Sfx.setMuted(!Sfx.muted);
          Save.data.settings.muted = Sfx.muted; Save.write();
          if (!Sfx.muted) Sfx.rain(this.rain); else Voice.stop();
          this.updateTools();
          break;
        case 'voice':
          Voice.setEnabled(!Voice.enabled);
          this.updateTools();
          break;
        case 'quit':
          this.destroy();
          if (this.hooks.onQuit) this.hooks.onQuit();
          break;
      }
    }

    advance() {
      if (this.dead || this.paused) return;
      if (this.onAdvance) this.onAdvance();
    }

    pause(ms) {
      if (this.skip) ms = Math.min(ms, 40);
      return new Promise(res => setTimeout(() => { if (!this.dead) res(); }, ms));
    }

    jump(label) {
      if (!(label in this.labels)) throw new Error('unknown label: ' + label);
      this.i = this.labels[label];
      // going back to a moment the story has passed puts the ledger back as it stood there
      if (label in this.ledgerAt) {
        this.stakes = this.ledgerAt[label] ? Object.assign({}, this.ledgerAt[label]) : null;
        if (this.el) this.renderStakes();
      }
    }

    /* ---------------------------------------------------------------- */

    /** fetch every picture this chapter uses up front, so scene changes never pop in */
    preload() {
      const paths = [];
      for (const cmd of this.script) {
        if (cmd.bg) { const b = Backgrounds.get(cmd.bg); if (b.img) paths.push(b.img.replace(/^assets\//, '')); }
        const id = cmd.show || cmd.who;
        if (id && Characters[id]) for (const f of Characters[id].faces || []) paths.push(`portraits/${id}_${f}.webp`, `portraits/${id}_${f}_face.webp`);
      }
      Assets.preload([...new Set(paths)]);
    }

    async play() {
      this.mount();
      this.preload();
      while (this.i < this.script.length && !this.dead) {
        const cmd = this.script[this.i++];
        await this.exec(cmd);
      }
      if (!this.dead) this.finish({ completed: true });
    }

    finish(cmd) {
      if (this.dead) return;
      this.destroy();
      if (this.hooks.onEnd) this.hooks.onEnd(cmd);
    }

    async exec(cmd) {
      if (cmd.goto) { this.jump(cmd.goto); return; }
      if (cmd.label) this.ledgerAt[cmd.label] = this.stakes ? Object.assign({}, this.stakes) : null;
      if (cmd.bg) await this.setBg(cmd.bg);
      if (cmd.hide) this.hideChar(cmd.hide);
      if (cmd.show) {
        const entered = this.showChar(cmd.show, cmd.at || this.slotOf(cmd.show) || 'center', cmd.face);
        if (entered) await this.pause(260);
      }
      if (cmd.fx) await this.fx(cmd.fx);
      if (cmd.card) await this.card(cmd);
      if (cmd.table !== undefined) await this.setTable(cmd.table, cmd);
      if (cmd.stakes !== undefined) await this.setStakes(cmd);
      if (cmd.rack !== undefined) this.setRack(cmd.rack);
      if (cmd.focus !== undefined) this.setFocus(cmd.focus);
      if (cmd.move) await this.moves(cmd.move);
      if (cmd.bleed) await this.bleed(cmd.bleed);
      if (cmd.transfuse) await this.transfuse(cmd);
      if (cmd.pay) await this.pay(cmd.pay);
      if (cmd.text != null) await this.line(cmd);
      if (cmd.choice) await this.choose(cmd.choice);
      if (cmd.decide) await this.decide(cmd.decide);
      if (cmd.battle) await this.battle(cmd);
      if (cmd.branch) {
        const to = cmd.to[this.flags[cmd.branch]] || cmd.to['*'];
        if (to) this.jump(to);
        return;
      }
      if (cmd.end) this.finish(cmd);
    }

    /**
     * Lay a mahjong table out behind the text (or clear it with `false`): the
     * ponds, the dora and the hand of the player whose decision it is. While it
     * is up the standing portraits step aside and the speaker's face moves into
     * the text box.
     */
    async setTable(table, cmd) {
      const box = this.$('.vn-table');
      if (!table) {
        box.hidden = true; box.innerHTML = '';
        this.table = null;
        this.el.classList.remove('has-table');
        this.$('.vn-face').innerHTML = '';
        return;
      }
      Analysis.viewOfTable(table);       // throws on an impossible table (five copies of a tile)
      this.table = JSON.parse(JSON.stringify(table));     // a copy: the moves played on it must not change the script
      this.tableWon = cmd.won || null;
      box.innerHTML = TableBoard.html(this.table, { win: cmd.won });
      box.hidden = false;
      this.el.classList.add('has-table');
      await this.pause(260);
    }

    redrawTable() {
      if (this.table) this.$('.vn-table').innerHTML = TableBoard.html(this.table, { win: this.tableWon });
    }

    /** light up the tiles a line talks about: { seat, hand: '7s8s', river: '4m' } (or several); false clears */
    setFocus(f) {
      if (!this.table) return;
      this.table.focus = f ? [].concat(f) : null;
      this.redrawTable();
    }

    /** play moves on the table, one after another (js/story/storystate.js, TableMoves); { wait: ms } pauses */
    async moves(list) {
      const HOLD = { draw: 260, discard: 430, riichi: 700, pon: 560, chi: 560, kan: 620, dora: 620, ron: 760, tsumo: 760, reveal: 500 };
      for (const m of [].concat(list)) {
        if (this.dead || !this.table) return;
        if (m.wait) { await this.pause(m.wait); continue; }
        const r = TableMoves.apply(this.table, m);
        this.table.focus = m.focus ? [].concat(m.focus) : null;
        this.redrawTable();
        if (r.kind === 'discard' || r.kind === 'dora') Sfx.tile();
        else if (r.kind === 'riichi') Sfx.riichi();
        else if (r.kind === 'pon' || r.kind === 'chi' || r.kind === 'kan') Sfx.call();
        else if (r.kind === 'ron' || r.kind === 'tsumo') Sfx.win();
        await this.pause(HOLD[r.kind] || 300);
      }
    }

    /* ---- Washizu mahjong: the ledger, the rack ---------------------- */

    renderStakes() {
      const box = this.$('.vn-stakes');
      const s = this.stakes;
      if (!s) { box.hidden = true; box.innerHTML = ''; this.el.classList.remove('has-stakes'); return; }
      const name = id => { const c = Characters[id]; return c ? `<b class="vs-name" style="color:${c.color}">${esc(I18n.pick(c.name))}</b>` : ''; };
      box.hidden = false;
      this.el.classList.add('has-stakes');
      box.innerHTML =
        `<div class="vs vs-blood">${name(s.bleeder || 'akagi19')}${BloodRack.html(s.blood, s.lethal, 'mini')}` +
        `<span data-vs="blood">${esc(I18n.t('hud.blood', { drawn: Math.round(s.blood), left: Math.round(Stakes.left(s)) }))}</span>` +
        `<span class="vs-won" data-vs="won">${esc(I18n.t('hud.won', { n: I18n.yen(s.won) }))}</span></div>` +
        `<div class="vs vs-money">${name(s.payer || 'washizu')}<span class="vs-funds" data-vs="funds">${esc(I18n.t('hud.funds', { n: I18n.yen(s.funds) }))}</span></div>`;
      box.classList.toggle('near', s.blood >= BloodRack.DANGER);
      if (this.rackAt != null) this.drawRack(this.rackAt === 'live' ? s.blood : (this.rackShown || 0));
    }

    /** count the ledger on screen from one state to another */
    tweenStakes(from, to, ms) {
      const box = this.$('.vn-stakes');
      if (this.skip) ms = 0;
      return new Promise(resolve => {
        const t0 = performance.now();
        const mix = (a, b, k) => a + (b - a) * k;
        const step = now => {
          if (this.dead) return resolve();
          const k = ms <= 0 ? 1 : Math.min(1, (now - t0) / ms);
          this.stakes = Object.assign({}, to, { blood: mix(from.blood, to.blood, k), funds: mix(from.funds, to.funds, k), won: mix(from.won, to.won, k) });
          this.renderStakes();
          if (k < 1) requestAnimationFrame(step);
          else { this.stakes = to; this.renderStakes(); resolve(); }
        };
        requestAnimationFrame(step);
      });
    }

    flashStakes(part) {
      const el = this.$('.vn-stakes [data-vs="' + part + '"]');
      if (!el) return;
      el.classList.remove('blink'); void el.offsetWidth; el.classList.add('blink');
    }

    /** { stakes: {...} } sets the ledger (tween: true counts up to it); { stakes: false } puts it away */
    async setStakes(cmd) {
      const from = this.stakes;
      const to = Stakes.apply(from, { stakes: cmd.stakes });
      if (cmd.tween && from && to) {
        if (to.funds !== from.funds) Sfx.coin();
        await this.tweenStakes(from, to, 1100);
        if (to.funds !== from.funds) { this.flashStakes('funds'); this.flashStakes('won'); }
      } else {
        this.stakes = to;
        this.renderStakes();
      }
    }

    /** blood is drawn: the rack fills over the scene, then the ledger shows the new total */
    async bleed(cc) {
      if (!this.stakes) return;
      const from = this.stakes.blood;
      const to = Stakes.apply(this.stakes, { bleed: cc });
      this.shake();
      await BloodRack.sequence(this.el, { from, to: to.blood, lethal: to.lethal, fast: this.skip });
      if (this.dead) return;
      this.stakes = to;
      this.renderStakes();
      this.flashStakes('blood');
    }

    /** blood bought back with the winnings */
    async transfuse(cmd) {
      if (!this.stakes) return;
      const from = this.stakes;
      const to = Stakes.apply(from, { transfuse: cmd.transfuse, cost: cmd.cost });
      await BloodRack.sequence(this.el, { from: from.blood, to: to.blood, lethal: to.lethal, fast: this.skip });
      if (this.dead) return;
      this.stakes = to;
      this.renderStakes();
      this.flashStakes('blood'); this.flashStakes('won');
    }

    /** Washizu pays: his funds run down, Akagi's winnings up */
    async pay(yen) {
      if (!this.stakes) return;
      const from = this.stakes;
      const to = Stakes.apply(from, { pay: yen });
      Sfx.coin();
      await this.tweenStakes(from, to, 900);
      this.flashStakes('funds'); this.flashStakes('won');
      await this.pause(250);
    }

    /**
     * The stakes prop: the stand cut from the painting, filled to `level` - and, once the ledger is on screen,
     * Washizu's money beside it: a bundle of banknotes for every ten million yen he has left.
     */
    drawRack(level) {
      const box = this.$('.vn-rack');
      const s = this.stakes;
      const lethal = (s && s.lethal) || 2000;
      const mode = s ? 'money' : 'blood';
      if (box.dataset.mode !== mode || !box.firstChild) {
        const payer = s && Characters[s.payer || 'washizu'];
        box.dataset.mode = mode;
        box.innerHTML =
          `<div class="vr-panel vr-blood">${BloodRack.html(this.rackShown || 0, lethal, 'big')}` +
          `<div class="vr-count"><b>${Math.round(this.rackShown || 0)}</b><span> / ${lethal}cc</span></div></div>` +
          (s ? `<div class="vr-panel vr-money"><div class="vr-money-name">${esc(I18n.t('hud.money.title', { name: payer ? I18n.pick(payer.name) : '' }))}</div>` +
            `${MoneyPile.html(s.funds, s.total)}<div class="vr-funds"></div></div>` : '');
      }
      if (s) {
        MoneyPile.set(box.querySelector('.pile'), s.funds);
        box.querySelector('.vr-funds').innerHTML = `${esc(I18n.yen(s.funds))}<small>${esc(I18n.t('hud.money.unit'))}</small>`;
      }
      const rack = box.querySelector('.rack'), num = box.querySelector('.vr-count b');
      const from = this.rackShown || 0;
      if (from === level && rack._rackTween) return;                 // already on its way there
      this.rackShown = level;
      BloodRack.tween(rack, from, level, this.skip || from === level ? 0 : Math.min(2600, 500 + Math.abs(level - from) * 2.2), v => {
        num.textContent = Math.round(v);
        box.classList.toggle('near', v >= BloodRack.DANGER);
      });
    }

    /**
     * The rack as a prop in the scene: a number fills it to that level (to show what the rules mean),
     * true makes it follow the ledger - the blood really drawn - and false takes it away.
     */
    setRack(v) {
      const box = this.$('.vn-rack');
      if (v === false || v == null) {
        box.hidden = true; box.innerHTML = ''; delete box.dataset.mode;
        this.rackAt = null; this.rackShown = 0;
        this.el.classList.remove('has-rack');
        return;
      }
      box.hidden = false;
      this.el.classList.add('has-rack');
      this.rackAt = v === true ? 'live' : v;
      this.drawRack(v === true ? ((this.stakes && this.stakes.blood) || 0) : v);
    }

    /**
     * A discard that matters. The hand on the table becomes clickable; every
     * tile shows where it leads (from js/mahjong/analysis.js) with a spoken
     * commentary. `d.options` maps the chosen tile to a branch.
     */
    async decide(d) {
      this.skip = false; this.auto = false;
      this.updateTools();
      const table = this.table;
      const mine = table.seats[table.me || 0];
      const view = Analysis.viewOfTable(table);
      const hand = Tiles.parse(mine.hand).concat(Tiles.parse(mine.draw || ''));
      this.onAdvance = null;
      this.paused = true;
      this.el.classList.add('deciding');
      const host = this.$('.vn-table .tb-decide');
      const t = await Decision.open(host, {
        kind: 'discard', title: I18n.pick(d.title), hand, drawn: !!mine.draw,
        rows: Analysis.discards(view),
        nameOf: s => TableBoard.nameOf(table, s),
        notes: x => d.notes[Tiles.code(x)] || d.notes['*'] || [],
      });
      if (this.dead) return new Promise(() => {});
      host.innerHTML = '';
      this.el.classList.remove('deciding');
      this.paused = false;
      const code = Tiles.code(t);
      const opt = d.options.find(o => o.tiles === code) || d.options.find(o => o.tiles === '*');
      if (d.flag) this.flags[d.flag] = opt.id;
      if (d.apply) await this.moves({ seat: table.me || 0, discard: code });     // the tile goes to the pond
      this.log.push({ name: '', color: '', text: '▸ ' + I18n.t('an.discard', { tile: I18n.tileName(t) }), choice: true });
      if (opt.goto) this.jump(opt.goto);
    }

    /** cross-fade to another backdrop (a painting when available, a CSS scene otherwise) */
    async setBg(name) {
      const holder = this.$('.vn-bg');
      const old = holder.querySelector('.bg-layer:not(.leaving)');
      const next = document.createElement('div');
      next.className = 'bg-layer entering';
      const info = Backgrounds.paint(next, name);
      holder.insertBefore(next, holder.querySelector('.rain'));
      void next.offsetWidth;
      next.classList.remove('entering');
      if (old) { old.classList.add('leaving'); setTimeout(() => old.remove(), 800); }
      this.bg = name;
      this.rain = info.rain;
      holder.classList.toggle('storming', info.rain);
      Sfx.rain(info.rain);
      await this.pause(500);
    }

    slotOf(id) {
      return SLOTS.find(s => this.slots[s] === id) || null;
    }

    /**
     * Put a character on screen. `face` picks an expression (the character's
     * default when omitted). Returns true if the character newly entered,
     * false if it was already standing there and only its expression changed.
     */
    showChar(id, slot, face) {
      // a character can only stand in one place
      for (const s of SLOTS) if (this.slots[s] === id && s !== slot) this.clearSlot(s);
      const already = this.slots[slot] === id;
      this.slots[slot] = id;
      this.faces[id] = face || (Characters[id].faces || [])[0] || null;
      const el = this.$('.vn-char[data-slot="' + slot + '"]');
      this.drawChar(el, id);
      if (already) return false;
      el.classList.remove('on');
      void el.offsetWidth;
      el.classList.add('on');
      return true;
    }

    drawChar(el, id) {
      const face = this.faces[id];
      const painted = !!Assets.portrait(id, face);
      const img = el.querySelector('img.portrait-img');
      if (painted && img) img.src = Assets.url(Assets.portrait(id, face));   // swap in place: no flicker
      else el.innerHTML = Portraits.html(id, face);
      el.classList.toggle('painted', painted);
    }

    /** change the expression of a character who is on screen */
    setFace(id, face) {
      this.faces[id] = face;
      const slot = this.slotOf(id);
      if (slot) this.drawChar(this.$('.vn-char[data-slot="' + slot + '"]'), id);
    }

    clearSlot(slot) {
      this.slots[slot] = null;
      const el = this.$('.vn-char[data-slot="' + slot + '"]');
      el.classList.remove('on', 'dim', 'speaking');
    }

    hideChar(id) {
      for (const s of SLOTS) if (id === 'all' || this.slots[s] === id) this.clearSlot(s);
    }

    setSpeaker(id) {
      for (const s of SLOTS) {
        const el = this.$('.vn-char[data-slot="' + s + '"]');
        el.classList.toggle('dim', !!id && !!this.slots[s] && this.slots[s] !== id);
        el.classList.toggle('speaking', !!id && this.slots[s] === id);
      }
    }

    async fx(name) {
      if (name === 'thunder') {
        const f = this.$('.flash');
        f.classList.remove('go'); void f.offsetWidth; f.classList.add('go');
        this.shake();
        Sfx.thunder();
        await this.pause(700);
      } else if (name === 'shake') {
        this.shake();
        await this.pause(300);
      } else if (name === 'clack') {
        Sfx.tile();
        await this.pause(200);
      } else if (name === 'zawa') {
        // the uneasy murmur that hangs over every Fukumoto gambling table
        const box = this.$('.vn-fx');
        for (let k = 0; k < 7; k++) {
          const s = document.createElement('span');
          s.className = 'zawa';
          s.textContent = 'ざわ…';
          s.style.left = (6 + Math.random() * 78) + '%';
          s.style.top = (6 + Math.random() * 52) + '%';
          s.style.fontSize = (22 + Math.random() * 30) + 'px';
          s.style.setProperty('--rot', (Math.random() * 24 - 12) + 'deg');
          s.style.animationDelay = (k * 0.16) + 's';
          box.appendChild(s);
          setTimeout(() => s.remove(), 3600);
        }
        await this.pause(900);
      }
    }

    shake() {
      this.el.classList.remove('shake'); void this.el.offsetWidth; this.el.classList.add('shake');
    }

    card(cmd) {
      const box = this.$('.vn-card');
      box.innerHTML = `<div><h1>${esc(I18n.pick(cmd.card))}</h1>${cmd.sub ? `<p>${esc(I18n.pick(cmd.sub))}</p>` : ''}</div>`;
      box.hidden = false;
      this.$('.vn-box').classList.add('hide');
      return new Promise(resolve => {
        const done = () => {
          this.onAdvance = null;
          clearTimeout(this._autoTimer);
          box.hidden = true;
          this.$('.vn-box').classList.remove('hide');
          resolve();
        };
        this.onAdvance = done;
        if (this.skip) this._autoTimer = setTimeout(done, 350);
        else if (this.auto) this._autoTimer = setTimeout(done, 2600);
      });
    }

    line(cmd) {
      const who = cmd.who ? Characters[cmd.who] : null;
      const whoName = who ? I18n.pick(who.name) : '';
      const text = I18n.pick(cmd.text);
      const box = this.$('.vn-box');
      const nameEl = this.$('.vn-name');
      const textEl = this.$('.vn-text');
      const next = this.$('.vn-next');
      box.classList.toggle('think', !!cmd.think);
      box.classList.toggle('narr', !who);
      nameEl.textContent = whoName;
      nameEl.style.color = who ? who.color : '';
      if (cmd.who && cmd.face) this.setFace(cmd.who, cmd.face);
      // with a table laid out the portraits are hidden, so the speaker's face goes in the box
      const faceEl = this.$('.vn-face');
      const face = cmd.who ? (cmd.face || this.faces[cmd.who]) : null;
      faceEl.innerHTML = (this.table || this.rackAt != null) && cmd.who ? Portraits.avatar(cmd.who + (face ? ':' + face : '')) : '';
      if (cmd.who && face) this.faces[cmd.who] = face;
      this.setSpeaker(cmd.who || null);
      this.log.push({ name: whoName, color: who ? who.color : '', text, think: !!cmd.think, who: cmd.who || null, raw: text });

      // the character's recorded voice (narration is not voiced); skipping stays silent
      const voiced = cmd.who && !this.skip ? Voice.line(cmd.who, text) : (Voice.stop(), Promise.resolve(false));
      this.preloadVoices();

      // split into characters, toggling emphasis on *asterisks*
      let html = '', em = false;
      const open = cmd.think ? I18n.t('vn.thinkOpen') : '', close = cmd.think ? I18n.t('vn.thinkClose') : '';
      for (const ch of open + text + close) {
        if (ch === '*') { em = !em; continue; }
        html += `<span class="ch${em ? ' em' : ''}">${esc(ch)}</span>`;
      }
      textEl.innerHTML = html;
      const spans = textEl.querySelectorAll('.ch');
      next.classList.remove('show');
      this._lineDone = false;

      return new Promise(resolve => {
        let shown = 0;
        const started = Date.now();
        let gone = false;
        const go = () => {
          if (gone) return;
          gone = true;
          clearInterval(this._typeTimer);
          clearTimeout(this._autoTimer);
          this.onAdvance = null;
          resolve();
        };
        const finishTyping = () => {
          clearInterval(this._typeTimer);
          for (const s of spans) s.classList.add('on');
          this._lineDone = true;
          next.classList.add('show');
          if (this.skip) this._autoTimer = setTimeout(go, 45);
          else if (this.auto) this.autoAdvance(go, voiced, started, 900 + spans.length * 32);
        };
        this._autoFrom = () => this.autoAdvance(go, voiced, started, 900 + spans.length * 32);
        this.onAdvance = () => { if (!this._lineDone) finishTyping(); else go(); };
        if (this.skip) { finishTyping(); return; }
        this._typeTimer = setInterval(() => {
          if (shown < spans.length) spans[shown++].classList.add('on');
          else finishTyping();
        }, 18);
      });
    }

    /** Auto mode: move on once the text has had time to be read and the voice has finished */
    autoAdvance(go, voiced, started, readMs) {
      const lineNo = this.i;
      voiced.then(spoke => {
        if (this.dead || !this.auto || this.i !== lineNo) return;
        const wait = spoke ? 450 : Math.max(0, readMs - (Date.now() - started));
        clearTimeout(this._autoTimer);
        this._autoTimer = setTimeout(go, wait);
      });
    }

    /** fetch the next couple of voiced lines while this one plays */
    preloadVoices() {
      let n = 0;
      for (let k = this.i; k < this.script.length && k < this.i + 12 && n < 2; k++) {
        const c = this.script[k];
        if (c.who && c.text != null) { Voice.preload(c.who, I18n.pick(c.text)); n++; }
      }
    }

    choose(options) {
      this.skip = false;
      this._autoFrom = null;
      this.updateTools();
      const box = this.$('.vn-choices');
      box.innerHTML = options.map((o, i) => `<button data-choice="${i}">${esc(I18n.pick(o.text))}</button>`).join('');
      box.hidden = false;
      this.onAdvance = null;
      return new Promise(resolve => {
        this._choose = idx => {
          this._choose = null;
          box.hidden = true;
          Sfx.click();
          const opt = options[idx];
          this.log.push({ name: '', color: '', text: '▸ ' + I18n.pick(opt.text), choice: true });
          if (opt.goto) this.jump(opt.goto);
          resolve();
        };
      });
    }

    async battle(cmd) {
      this.skip = false; this.auto = false;
      this.updateTools();
      this.paused = true;
      Sfx.rain(false);
      const res = await this.hooks.onBattle(cmd.battle);
      if (this.dead) return new Promise(() => {});
      this.paused = false;
      this.flags.opening = (res && res.opening) || null;    // what the player did at the opening decision
      // skipped at the table: the story goes on as it does when the match is won (or where the script says)
      if (res && res.skipped) { this.jump(cmd.skip || cmd.win); return; }
      // a cleared match of Washizu mahjong leaves its blood and money on the story's ledger
      if (res && res.cleared && this.stakes) {
        this.stakes = Stakes.afterBattle(this.stakes, Stages.get(cmd.battle), res.final);
        this.renderStakes();
      }
      this.jump(res && res.cleared ? cmd.win : cmd.lose);
    }

    showLog() {
      const box = this.$('.vn-log');
      box.innerHTML = '<div class="log-inner"><h3>' + esc(I18n.t('vn.backlog')) + '</h3>' + this.log.map((l, i) =>
        `<div class="log-line${l.think ? ' think' : ''}${l.choice ? ' choice' : ''}">` +
        (l.name ? `<b style="color:${l.color}">${esc(l.name)}</b>` : '') +
        `<span>${esc(l.text.replace(/\*/g, ''))}</span>` +
        (l.who && Voice.has(l.who, l.raw) ? `<button class="log-replay" data-replay="${i}" title="${esc(I18n.t('vn.replay'))}" aria-label="${esc(I18n.t('vn.replay'))}">▶</button>` : '') +
        '</div>').join('') +
        '<p class="log-close">' + esc(I18n.t('vn.logClose')) + '</p></div>';
      box.hidden = false;
      const inner = box.querySelector('.log-inner');
      inner.scrollTop = inner.scrollHeight;
    }
  }

  root.VN = VN;
})(window);
