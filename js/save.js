/* Progress and settings, kept in localStorage. */
(function (root) {
  'use strict';
  const KEY = 'akagi-fan-game-save-v1';

  function blank() {
    return { cleared: {}, chapters: {}, settings: { fast: false, muted: false, lang: null, voice: true } };
  }

  const Save = {
    data: blank(),

    load() {
      try {
        const raw = root.localStorage.getItem(KEY);
        if (raw) {
          const d = JSON.parse(raw);
          const b = blank();
          Save.data = {
            cleared: Object.assign(b.cleared, d.cleared),
            chapters: Object.assign(b.chapters, d.chapters),
            settings: Object.assign(b.settings, d.settings),
          };
        }
      } catch (e) { Save.data = blank(); }
      return Save.data;
    },

    write() {
      try { root.localStorage.setItem(KEY, JSON.stringify(Save.data)); } catch (e) { /* private mode etc. */ }
    },

    clearStage(id) { Save.data.cleared[id] = true; Save.write(); },
    finishChapter(id) { Save.data.chapters[id] = true; Save.write(); },
    reset() { Save.data = blank(); Save.write(); },
  };

  root.Save = Save;
})(window);
