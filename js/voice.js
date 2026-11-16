/*
 * Spoken commentary, using the browser's built-in speech synthesis.
 *
 *   Voice.say([{ who: 'nangou', text: '...' }, ...])   speak lines one after another
 *   Voice.stop()
 *   Voice.setEnabled(bool)        remembered in the save file (settings.voice)
 *   Voice.available()             is there a voice for the current language?
 *
 * The voice follows the game language (English, Japanese or Chinese). Which
 * voices exist depends on the browser and operating system; if none matches
 * the language, nothing is spoken and the text on screen carries the scene.
 * Sound muted means voice muted too.
 */
(function (root) {
  'use strict';

  const LOCALE = { en: ['en-US', 'en-GB', 'en'], ja: ['ja-JP', 'ja'], zh: ['zh-CN', 'zh-Hans', 'cmn', 'zh'] };
  // a little character in pitch and pace: [pitch, rate]
  const TONE = {
    akagi: [1.15, 0.95], nangou: [0.7, 1.0], ryuzaki: [0.55, 0.95], thug: [0.9, 1.1],
    yasuoka: [0.8, 0.95], yagi: [0.95, 0.92], narrator: [1.0, 1.0],
  };
  const synth = root.speechSynthesis || null;

  const Voice = {
    enabled: true,
    supported: !!(synth && root.SpeechSynthesisUtterance),
    _token: 0,

    init() {
      const s = root.Save && root.Save.data.settings;
      Voice.enabled = !s || s.voice !== false;
      // voices load asynchronously in some browsers; asking once wakes them up
      if (Voice.supported) { try { synth.getVoices(); } catch (e) { /* ignore */ } }
    },

    setEnabled(on) {
      Voice.enabled = !!on;
      if (root.Save) { root.Save.data.settings.voice = Voice.enabled; root.Save.write(); }
      if (!on) Voice.stop();
    },

    /** the installed voice that best fits the current game language, or null */
    pick() {
      if (!Voice.supported) return null;
      let voices = [];
      try { voices = synth.getVoices() || []; } catch (e) { return null; }
      const wanted = LOCALE[root.I18n ? root.I18n.lang : 'en'] || LOCALE.en;
      for (const tag of wanted) {
        const lower = tag.toLowerCase();
        const exact = voices.find(v => v.lang && v.lang.toLowerCase().replace('_', '-') === lower);
        if (exact) return exact;
        const loose = voices.find(v => v.lang && v.lang.toLowerCase().replace('_', '-').indexOf(lower) === 0);
        if (loose) return loose;
      }
      return null;
    },

    available() { return !!Voice.pick(); },
    active() { return Voice.supported && Voice.enabled && !(root.Sfx && root.Sfx.muted); },

    /** text as it should be read aloud: no emphasis marks, no decorative dashes */
    clean(text) {
      return String(text).replace(/\*/g, '').replace(/[—–]+/g, ', ').replace(/…+/g, '… ').replace(/\s+/g, ' ').trim();
    },

    /** speak a list of lines ({ who, text } or plain strings), replacing anything still being spoken */
    say(lines) {
      Voice.stop();
      if (!Voice.active()) return;
      const voice = Voice.pick();
      if (!voice) return;
      const token = ++Voice._token;
      for (const line of [].concat(lines || [])) {
        const text = Voice.clean(typeof line === 'string' ? line : line.text);
        if (!text || /^[….\s]*$/.test(text)) continue;
        const u = new root.SpeechSynthesisUtterance(text);
        const tone = TONE[(line && line.who) || 'narrator'] || TONE.narrator;
        u.voice = voice;
        u.lang = voice.lang;
        u.pitch = tone[0];
        u.rate = tone[1];
        u.onstart = () => { if (token !== Voice._token) synth.cancel(); };
        try { synth.speak(u); } catch (e) { /* speech is a nicety; never break the game for it */ }
      }
    },

    stop() {
      Voice._token++;
      if (Voice.supported) { try { synth.cancel(); } catch (e) { /* ignore */ } }
    },
  };

  root.Voice = Voice;
})(window);
