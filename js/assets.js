/*
 * Generated artwork (see tools/generate_assets.py and GPT_IMAGE_GUIDE.md).
 *
 * assets/manifest.js lists the files that exist. Everything here degrades
 * gracefully: if a picture has not been generated, the game falls back to
 * its built-in vector art and CSS backdrops.
 *
 *   Assets.has('bg/parlor.jpg')        is the file available?
 *   Assets.url('bg/parlor.jpg')        path to use in src / url()
 *   Assets.portrait('akagi', 'smirk')  cut-out bust, or null
 *   Assets.avatar('akagi', 'smirk')    square face crop, or null
 *   Backgrounds.get('parlor')          { img, css, rain } for a story backdrop
 */
(function (root) {
  'use strict';

  // add ?noart=1 to the address to see the built-in fallback art instead of the paintings
  const disabled = /[?&]noart=1/.test(root.location ? root.location.search : '');
  const manifest = (!disabled && root.AssetManifest) || { files: {} };

  const Assets = {
    files: manifest.files || {},
    has(path) { return !!Assets.files[path]; },
    url(path) { return 'assets/' + path; },
    size(path) { return Assets.files[path] || null; },

    portrait(id, face) {
      const tries = [face && `portraits/${id}_${face}.webp`, Assets.defaultFace(id) && `portraits/${id}_${Assets.defaultFace(id)}.webp`];
      for (const p of tries) if (p && Assets.has(p)) return p;
      return null;
    },

    avatar(id, face) {
      const tries = [face && `portraits/${id}_${face}_face.webp`, Assets.defaultFace(id) && `portraits/${id}_${Assets.defaultFace(id)}_face.webp`];
      for (const p of tries) if (p && Assets.has(p)) return p;
      return null;
    },

    defaultFace(id) {
      const c = root.Characters && root.Characters[id];
      return c && c.faces ? c.faces[0] : null;
    },

    /**
     * Mark <html> with one class per available interface image
     * ("ui/dialog.webp" -> "has-ui-dialog") so the stylesheet can switch
     * from the plain CSS look to the painted one piece by piece.
     */
    applySkin() {
      const cls = root.document.documentElement.classList;
      for (const path of Object.keys(Assets.files)) {
        if (path.indexOf('portraits/') === 0) continue;
        cls.add('has-' + path.replace(/\.\w+$/, '').replace(/[^a-z0-9]+/gi, '-'));
      }
    },

    /** warm the browser cache so scene changes do not pop */
    preload(paths) {
      for (const p of paths) if (Assets.has(p)) { const im = new Image(); im.src = Assets.url(p); }
    },
  };

  /*
   * Story backdrops. `img` is the generated painting; `css` names the
   * built-in fallback look (see .bg-layer[data-bg=...] in style.css);
   * `rain` overlays the animated rain and plays the rain sound.
   */
  const BG = {
    black:   { css: 'black' },
    city:    { css: 'storm', img: 'bg/city.jpg', rain: true },
    storm:   { css: 'storm', img: 'bg/city.jpg', rain: true },   // older name, used by the title screen
    parlor:  { css: 'parlor', img: 'bg/parlor.jpg' },
    doorway: { css: 'parlor', img: 'bg/doorway.jpg', rain: true },
    table:   { css: 'parlor', img: 'bg/table.jpg' },
    pier:    { css: 'storm', img: 'bg/pier.jpg', rain: true },
  };

  const Backgrounds = {
    get(name) {
      const b = BG[name] || BG.black;
      return { name, css: b.css, rain: !!b.rain, img: b.img && Assets.has(b.img) ? Assets.url(b.img) : null };
    },
    /** apply a backdrop to a .bg-layer element */
    paint(el, name) {
      const b = Backgrounds.get(name);
      if (b.img) {
        el.dataset.bg = 'image';
        el.style.backgroundImage = `url("${b.img}")`;
      } else {
        el.dataset.bg = b.css;
        el.style.backgroundImage = '';
      }
      return b;
    },
    all() { return Object.keys(BG).map(k => BG[k].img).filter(Boolean); },
  };

  root.Assets = Assets;
  root.Backgrounds = Backgrounds;
})(window);
