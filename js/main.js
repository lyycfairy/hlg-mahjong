/* Screens and navigation. */
(function (root) {
  'use strict';

  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const $ = id => document.getElementById(id);
  const T = (key, vars) => I18n.t(key, vars);
  const P = x => I18n.pick(x);

  const STORM_BG = '<div class="vn-bg storming"><div class="bg-layer" data-bg="storm"></div><div class="rain"></div><div class="rain far"></div><div class="flash"></div></div>';

  const App = {
    vn: null,
    battle: null,
    menu: 'title',   // which menu screen is showing, so it can be redrawn after a language change

    init() {
      Save.load();
      Sfx.setMuted(Save.data.settings.muted);
      Voice.init();
      I18n.set(Save.data.settings.lang || I18n.detect());
      Assets.applySkin();
      Assets.preload(['bg/city.jpg', 'bg/battle.jpg', 'ui/dialog.webp', 'ui/panel.webp', 'fx/cutin.jpg', 'fx/insight.jpg', 'fx/flow.jpg', 'fx/eye_strip.jpg', 'fx/bolt.webp']);

      document.addEventListener('click', e => {
        const go = e.target.closest('[data-go]');
        if (!go) return;
        Sfx.unlock(); Sfx.click();
        const [name, arg] = go.dataset.go.split(':');
        if (typeof App[name] === 'function') App[name](arg);
      });
      document.addEventListener('change', e => {
        const sel = e.target.closest('[data-lang-select]');
        if (sel) App.setLang(sel.value);
      });
      App.title();
    },

    show(id) {
      for (const el of document.querySelectorAll('.screen')) el.classList.toggle('active', el.id === id);
    },

    /** switch language and redraw the current menu screen */
    setLang(lang) {
      Save.data.settings.lang = I18n.set(lang);
      Save.write();
      if (typeof App[App.menu] === 'function') App[App.menu]();
    },

    /* ---------------- title ---------------- */

    title() {
      if (App.vn) { App.vn.destroy(); App.vn = null; }
      App.menu = 'title';
      const tagline = T('title.tagline');
      $('screen-title').innerHTML = `
        <div class="title">
          ${STORM_BG}
          <div class="title-lang">${I18n.selectHtml()}</div>
          <div class="title-inner">
            <div class="title-jp" lang="ja">アカギ</div>
            <div class="title-sub-jp" lang="ja">闇に降り立った天才</div>
            ${tagline ? `<div class="title-en">${esc(tagline)}</div>` : ''}
            <div class="title-tag">${esc(T('title.tag'))}</div>
            <nav class="title-menu">
              <button data-go="storySelect">${esc(T('menu.story'))}</button>
              <button data-go="battleSelect">${esc(T('menu.battle'))}</button>
              <button data-go="howTo">${esc(T('menu.howto'))}</button>
            </nav>
          </div>
          <footer class="title-foot">${esc(T('title.foot'))}</footer>
        </div>`;
      Backgrounds.paint($('screen-title').querySelector('.bg-layer'), 'city');
      App.show('screen-title');
    },

    /* ---------------- story ---------------- */

    /** a chapter or stage written only in some languages so far says so in the others */
    langTag(item) {
      return item.langs && item.langs.indexOf(I18n.lang) < 0 ? `<span class="tag lang">${esc(T('tag.zhOnly'))}</span>` : '';
    },

    storySelect() {
      App.menu = 'storySelect';
      const cards = Story.chapters.map(c => {
        const done = !!Save.data.chapters[c.id];
        const state = (!c.available ? `<span class="tag locked">${esc(T('tag.soon'))}</span>`
          : done ? `<span class="tag done">${esc(T('tag.completed'))}</span>` : `<span class="tag open">${esc(T('tag.new'))}</span>`) + App.langTag(c);
        const banner = c.banner && Assets.has(c.banner) ? `<div class="sel-banner" style="background-image:url('${Assets.url(c.banner)}')"></div>` : '';
        return `
          <article class="sel-card ${c.available ? '' : 'is-locked'}">
            ${banner}
            <div class="sel-no">${esc(I18n.numberOf(c, 'chapter'))}</div>
            <h3>${esc(P(c.title))}</h3>
            <p>${esc(P(c.summary))}</p>
            <div class="sel-foot">${state}
              ${c.available ? `<button class="btn btn-primary" data-go="playChapter:${c.id}">${esc(T(done ? 'btn.readAgain' : 'btn.begin'))}</button>` : ''}
            </div>
          </article>`;
      }).join('');
      App.select(T('menu.story'), T('story.lead'), cards);
    },

    playChapter(id) {
      const chapter = Story.get(id);
      if (!chapter || !chapter.available) return;
      App.show('screen-vn');
      const vn = new VN($('screen-vn'), chapter, {
        onBattle: stageId => App.storyBattle(stageId),
        onEnd: cmd => {
          App.vn = null;
          if (cmd && cmd.completed) { Save.finishChapter(chapter.id); App.storySelect(); }
          else App.title();
        },
        onQuit: () => { App.vn = null; App.title(); },
      });
      App.vn = vn;
      vn.play();
    },

    storyBattle(stageId) {
      const stage = Stages.get(stageId);
      App.show('screen-battle');
      App.battle = new Battle($('screen-battle'), stage, { context: 'story' });
      return App.battle.run().then(res => {
        if (res.aborted) { App.title(); return new Promise(() => {}); }
        App.show('screen-vn');
        return res;
      });
    },

    /* ---------------- battle ---------------- */

    battleSelect() {
      App.menu = 'battleSelect';
      const cards = Stages.list.map(s => {
        const cleared = !!Save.data.cleared[s.id];
        const unlocked = Stages.isUnlocked(s.id, Save.data);
        let state, action = '';
        if (!s.available) state = `<span class="tag locked">${esc(T('tag.soon'))}</span>`;
        else if (cleared) state = `<span class="tag done">${esc(T('tag.cleared'))}</span>`;
        else if (unlocked) state = `<span class="tag open">${esc(T('tag.challenge'))}</span>`;
        else state = `<span class="tag locked">${esc(T('tag.locked'))}</span>`;
        state += App.langTag(s);
        if (s.available && unlocked) {
          action = `<button class="btn btn-primary" data-go="playStage:${s.id}">${esc(T(cleared ? 'btn.playAgain' : 'btn.challenge'))}</button>`;
        }
        const foe = s.portraits && Assets.avatar(String(s.portraits[1]).split(':')[0])
          ? `<div class="sel-foe">${Portraits.avatar(s.portraits[1])}</div>` : '';
        return `
          <article class="sel-card ${s.available && unlocked ? '' : 'is-locked'}">
            ${foe}
            <div class="sel-no">${esc(I18n.numberOf(s, 'stage'))}</div>
            <h3>${esc(P(s.title))}</h3>
            <div class="sel-vs">${esc(T('vs', { name: P(s.opponent) }))}</div>
            <p>${esc(s.blurb ? P(s.blurb) : T('stage.unavailable'))}</p>
            ${s.goal ? `<p class="sel-goal">◆ ${esc(P(s.goal.text))}</p>` : ''}
            <div class="sel-foot">${state}${action}</div>
          </article>`;
      }).join('');
      App.select(T('menu.battle'), T('battle.lead'), cards);
    },

    playStage(id) {
      const stage = Stages.get(id);
      if (!stage || !Stages.isUnlocked(id, Save.data)) return;
      App.show('screen-battle');
      App.battle = new Battle($('screen-battle'), stage, { context: 'battle' });
      App.battle.run().then(res => {
        if (res.choice === 'retry') App.playStage(id);
        else if (res.choice === 'next' && Stages.next(id)) App.playStage(Stages.next(id).id);
        else App.battleSelect();
      });
    },

    /* ---------------- shared ---------------- */

    select(title, lead, body) {
      $('screen-select').innerHTML = `
        <div class="select">
          <header class="select-head">
            <div class="select-bar">
              <button class="btn-ghost" data-go="title">${esc(T('nav.title'))}</button>
              ${I18n.selectHtml()}
            </div>
            <h2>${esc(title)}</h2>
            <p>${esc(lead)}</p>
          </header>
          <div class="sel-grid">${body}</div>
        </div>`;
      App.show('screen-select');
    },

    howTo() {
      App.menu = 'howTo';
      const t = s => Tiles.parse(s).map(x => TileView.type(x, 'xs')).join('');
      const page = Howto[I18n.lang] || Howto.en;
      App.select(T('menu.howto'), T('howto.lead'), `<article class="howto">${page(t)}</article>`);
    },
  };

  root.App = App;
  document.addEventListener('DOMContentLoaded', App.init);
})(window);
