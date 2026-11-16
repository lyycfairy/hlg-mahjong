/*
 * Character voices.
 *
 * Every line a character speaks is a recorded clip in assets/voice (made by
 * tools/generate_voices.py with Microsoft Edge's neural voices, one cast per
 * language), looked up by speaker, language and the exact text of the line:
 *
 *   Voice.line('nangou', text)        play one line, stopping the previous one; resolves when it ends
 *   Voice.say([{ who, text }, ...])   several lines one after another (decision commentary)
 *   Voice.call('ryuzaki', 'riichi')   a shout at the table: riichi / pon / chi / ron / tsumo
 *   Voice.shout('akagi', 'insight')   a skill being fired
 *   Voice.preload(who, text)          fetch a clip ahead of time
 *   Voice.stop()
 *
 * 'guide' is the voice that reads the hand analysis aloud. A readout that was
 * not recorded (some depend on tiles that are random in a match) falls back to
 * the browser's own speech synthesis when the browser has a voice for the
 * language. Character lines without a recording are simply not spoken.
 * Voice off (remembered) or sound muted silences everything.
 */
(function (root) {
  'use strict';

  /** FNV-1a over UTF-16 code units - the file name of a line. tools/voice_lines.js uses this same function. */
  function hash(s) {
    let h = 0x811c9dc5;
    for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
    return ('0000000' + h.toString(16)).slice(-8);
  }

  const manifest = root.VoiceManifest || { files: {} };
  const LOCALE = { en: ['en-US', 'en-GB', 'en'], ja: ['ja-JP', 'ja'], zh: ['zh-CN', 'zh-Hans', 'cmn', 'zh'] };
  const synth = root.speechSynthesis || null;
  const lang = () => (root.I18n ? root.I18n.lang : 'en');
  const CACHE = 12;   // clips kept ready to play

  const Voice = {
    enabled: true,
    volume: 1,
    files: manifest.files || {},        // key -> length in milliseconds
    hash,
    _token: 0,
    _cur: null,                          // the line being played: { audio, end }
    _cache: new Map(),                   // key -> preloaded <audio>

    init() {
      const s = root.Save && root.Save.data.settings;
      Voice.enabled = !s || s.voice !== false;
      if (synth) { try { synth.getVoices(); } catch (e) { /* voices load lazily in some browsers */ } }
    },

    setEnabled(on) {
      Voice.enabled = !!on;
      if (root.Save) { root.Save.data.settings.voice = Voice.enabled; root.Save.write(); }
      if (!on) Voice.stop();
    },

    key(who, text, l) { return (l || lang()) + '/' + who + '/' + hash(String(text)); },
    has(who, text) { return !!who && !!Voice.files[Voice.key(who, text)]; },
    duration(who, text) { return Voice.files[Voice.key(who, text)] || 0; },
    url(key) { return 'assets/voice/' + key + '.mp3'; },
    active() { return Voice.enabled && !(root.Sfx && root.Sfx.muted); },
    /** are there recordings in the current language (or at least a browser voice)? */
    available() {
      const pfx = lang() + '/';
      return Object.keys(Voice.files).some(k => k.indexOf(pfx) === 0) || !!Voice.browserVoice();
    },

    /* ---- recorded clips ------------------------------------------- */

    _audio(key) {
      let a = Voice._cache.get(key);
      if (a) { Voice._cache.delete(key); return a; }
      a = new Audio(Voice.url(key));
      a.preload = 'auto';
      return a;
    },

    preload(who, text) {
      if (!Voice.active() || !Voice.has(who, text) || typeof Audio === 'undefined') return;
      const key = Voice.key(who, text);
      if (Voice._cache.has(key)) return;
      const a = new Audio(Voice.url(key));
      a.preload = 'auto';
      try { a.load(); } catch (e) { /* ignore */ }
      Voice._cache.set(key, a);
      while (Voice._cache.size > CACHE) Voice._cache.delete(Voice._cache.keys().next().value);
    },

    /** play a clip on the line channel; resolves when it ends, fails or is stopped */
    _playLine(key) {
      return new Promise(resolve => {
        if (typeof Audio === 'undefined') { resolve(); return; }
        const a = Voice._audio(key);
        a.volume = Voice.volume;
        let done = false;
        const end = () => { if (done) return; done = true; if (Voice._cur && Voice._cur.audio === a) Voice._cur = null; resolve(); };
        a.addEventListener('ended', end);
        a.addEventListener('error', end);
        Voice._cur = { audio: a, end };
        try { a.currentTime = 0; } catch (e) { /* not loaded yet */ }
        const p = a.play();
        if (p && p.catch) p.catch(end);
        // a stalled download must never hold the story up
        const ms = Voice.files[key];
        if (ms) setTimeout(end, ms + 4000);
      });
    },

    /** speak one character line, replacing whatever was being said; resolves to true if a clip played */
    line(who, text) {
      Voice.stop();
      if (!Voice.active() || !Voice.has(who, text)) return Promise.resolve(false);
      return Voice._playLine(Voice.key(who, text)).then(() => true);
    },

    /** speak several lines in turn: recorded clips, with the browser's voice for unrecorded readouts */
    async say(lines) {
      Voice.stop();
      if (!Voice.active()) return;
      const token = Voice._token;
      for (const l of [].concat(lines || [])) {
        if (token !== Voice._token) return;
        const text = typeof l === 'string' ? l : l.text;
        const who = (l && l.who) || 'guide';
        if (!text || /^[….\s—–]*$/.test(text)) continue;
        if (Voice.has(who, text)) await Voice._playLine(Voice.key(who, text));
        else if (who === 'guide') await Voice._speak(text);
      }
    },

    /** a call at the table; calls may overlap each other and never cut a line short */
    call(who, kind) {
      return Voice._oneShot(who, root.I18n.t('call.' + kind));
    },

    shout(who, skill) {
      return Voice._oneShot(who, root.I18n.t('shout.skill', { skill: root.I18n.t('skill.' + skill) }));
    },

    _oneShot(who, text) {
      if (!Voice.active() || !Voice.has(who, text) || typeof Audio === 'undefined') return;
      const a = Voice._audio(Voice.key(who, text));
      a.volume = Voice.volume;
      const p = a.play();
      if (p && p.catch) p.catch(() => {});
    },

    stop() {
      Voice._token++;
      if (Voice._cur) { const c = Voice._cur; Voice._cur = null; try { c.audio.pause(); } catch (e) { /* ignore */ } c.end(); }
      if (synth) { try { synth.cancel(); } catch (e) { /* ignore */ } }
    },

    /* ---- browser speech, for readouts nobody recorded ---------------- */

    browserVoice() {
      if (!synth || !root.SpeechSynthesisUtterance) return null;
      let voices = [];
      try { voices = synth.getVoices() || []; } catch (e) { return null; }
      for (const tag of LOCALE[lang()] || LOCALE.en) {
        const t = tag.toLowerCase();
        const v = voices.find(x => x.lang && x.lang.toLowerCase().replace('_', '-') === t) ||
          voices.find(x => x.lang && x.lang.toLowerCase().replace('_', '-').indexOf(t) === 0);
        if (v) return v;
      }
      return null;
    },

    clean(text) {
      return String(text).replace(/\*/g, '').replace(/[—–]+/g, ', ').replace(/…+/g, '… ').replace(/\s+/g, ' ').trim();
    },

    _speak(text) {
      const voice = Voice.browserVoice();
      if (!voice) return Promise.resolve();
      return new Promise(resolve => {
        const u = new root.SpeechSynthesisUtterance(Voice.clean(text));
        u.voice = voice; u.lang = voice.lang;
        let done = false;
        const end = () => { if (!done) { done = true; resolve(); } };
        u.onend = end; u.onerror = end;
        setTimeout(end, 2500 + text.length * 160);
        try { synth.speak(u); } catch (e) { end(); }
      });
    },
  };

  root.Voice = Voice;
})(typeof window !== 'undefined' ? window : globalThis);
