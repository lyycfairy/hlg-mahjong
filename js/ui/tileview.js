/*
 * Tile faces drawn as inline SVG (no image assets).
 * TileView.html(id, cls)  -> markup for a physical tile id
 * TileView.type(t, cls)   -> markup for a tile type
 * TileView.back(cls)      -> a face-down tile
 */
(function (root) {
  'use strict';

  const KANJI_NUM = ['一', '二', '三', '四', '五', '六', '七', '八', '九'];
  const HONOR_KANJI = ['東', '南', '西', '北', '', '發', '中'];
  const HONOR_HINT = ['E', 'S', 'W', 'N', '', '', ''];
  const BLUE = '#1d4f91', GREEN = '#1c7c3c', RED = '#b3261e', INK = '#1b1b1b';
  const KFONT = "'Yu Mincho','Hiragino Mincho ProN','Noto Serif CJK JP','Noto Serif JP','Songti SC','SimSun',serif";

  function dot(x, y, r, color) {
    return `<circle cx="${x}" cy="${y}" r="${r}" fill="#fff" stroke="${color}" stroke-width="${Math.max(1.6, r * 0.28)}"/>` +
           `<circle cx="${x}" cy="${y}" r="${r * 0.42}" fill="${color}"/>`;
  }

  function pin(n) {
    let s = '';
    const grid = (xs, ys, r, colorAt) => {
      ys.forEach((y, ri) => xs.forEach((x, ci) => { s += dot(x, y, r, colorAt(ri, ci)); }));
    };
    switch (n) {
      case 1:
        s += `<circle cx="30" cy="41" r="21" fill="#fff" stroke="${RED}" stroke-width="3"/>` +
             `<circle cx="30" cy="41" r="14" fill="none" stroke="${BLUE}" stroke-width="3"/>` +
             `<circle cx="30" cy="41" r="6.5" fill="${RED}"/>`;
        break;
      case 2: s += dot(30, 22, 12, GREEN) + dot(30, 60, 12, BLUE); break;
      case 3: s += dot(15, 17, 9.5, BLUE) + dot(30, 41, 9.5, RED) + dot(45, 65, 9.5, GREEN); break;
      case 4: grid([17, 43], [22, 60], 10.5, (r, c) => (r + c) % 2 ? GREEN : BLUE); break;
      case 5:
        grid([15, 45], [18, 64], 9.5, (r, c) => (r + c) % 2 ? GREEN : BLUE);
        s += dot(30, 41, 9.5, RED);
        break;
      case 6: grid([18, 42], [15, 41, 67], 9.5, r => r === 0 ? GREEN : RED); break;
      case 7:
        s += dot(14, 11, 7, GREEN) + dot(30, 20, 7, GREEN) + dot(46, 29, 7, GREEN);
        grid([18, 42], [49, 69], 8, () => RED);
        break;
      case 8: grid([18, 42], [12, 31, 51, 70], 8, () => BLUE); break;
      case 9: grid([13, 30, 47], [15, 41, 67], 8, r => [BLUE, RED, GREEN][r]); break;
    }
    return s;
  }

  function stick(x, y, h, color, rot) {
    const w = 7;
    const tr = rot ? ` transform="rotate(${rot} ${x} ${y + h / 2})"` : '';
    return `<g${tr}><rect x="${x - w / 2}" y="${y}" width="${w}" height="${h}" rx="3" fill="${color}"/>` +
           `<rect x="${x - w / 2}" y="${y + h / 2 - 1}" width="${w}" height="2" fill="#f4efe1"/></g>`;
  }

  function sou(n) {
    let s = '';
    const row = (xs, y, h, colorAt) => xs.forEach((x, i) => { s += stick(x, y, h, colorAt ? colorAt(i) : GREEN); });
    switch (n) {
      case 1: // a stylised bird perched on a single stalk
        s += `<rect x="27" y="44" width="6" height="30" rx="3" fill="${GREEN}"/>` +
             `<path d="M30 12 C44 14 48 30 40 42 C36 48 24 48 20 42 C12 30 16 14 30 12 Z" fill="${GREEN}"/>` +
             `<circle cx="30" cy="24" r="6.5" fill="${RED}"/>` +
             `<path d="M20 40 L10 54 M30 45 L30 58 M40 40 L50 54" stroke="${RED}" stroke-width="3" stroke-linecap="round"/>` +
             `<circle cx="30" cy="24" r="2" fill="#f4efe1"/>`;
        break;
      case 2: s += stick(30, 9, 28, GREEN) + stick(30, 45, 28, GREEN); break;
      case 3: s += stick(30, 9, 28, GREEN); row([17, 43], 45, 28); break;
      case 4: row([18, 42], 9, 28); row([18, 42], 45, 28); break;
      case 5:
        row([14, 46], 9, 28); row([14, 46], 45, 28);
        s += stick(30, 27, 28, RED);
        break;
      case 6: row([14, 30, 46], 9, 28); row([14, 30, 46], 45, 28); break;
      case 7:
        s += stick(30, 4, 22, RED);
        row([14, 30, 46], 30, 22); row([14, 30, 46], 56, 22);
        break;
      case 8:
        s += stick(11, 10, 26, GREEN, 0) + stick(23, 10, 26, GREEN, 22) + stick(37, 10, 26, GREEN, -22) + stick(49, 10, 26, GREEN, 0);
        s += stick(11, 46, 26, GREEN, 0) + stick(23, 46, 26, GREEN, -22) + stick(37, 46, 26, GREEN, 22) + stick(49, 46, 26, GREEN, 0);
        break;
      case 9:
        row([14, 30, 46], 5, 21, i => i === 1 ? RED : GREEN);
        row([14, 30, 46], 30.5, 21, i => i === 1 ? RED : GREEN);
        row([14, 30, 46], 56, 21, i => i === 1 ? RED : GREEN);
        break;
    }
    return s;
  }

  const hint = ch => `<text x="5" y="13" font-family="Arial,Helvetica,sans-serif" font-size="11" font-weight="700" fill="#6b6455">${ch}</text>`;

  const faceCache = {};
  function face(t) {
    if (faceCache[t]) return faceCache[t];
    let inner = '';
    if (t < 9) {
      inner = hint(t + 1) +
        `<text x="30" y="37" text-anchor="middle" font-family="${KFONT}" font-size="31" font-weight="700" fill="${INK}">${KANJI_NUM[t]}</text>` +
        `<text x="30" y="72" text-anchor="middle" font-family="${KFONT}" font-size="31" font-weight="700" fill="${RED}">萬</text>`;
    } else if (t < 18) {
      inner = pin(t - 8);
    } else if (t < 27) {
      inner = sou(t - 17);
    } else if (t === 31) {
      inner = `<rect x="10" y="12" width="40" height="58" rx="5" fill="none" stroke="${BLUE}" stroke-width="3.5"/>` +
              `<rect x="16" y="18" width="28" height="46" rx="3" fill="none" stroke="${BLUE}" stroke-width="1.2"/>`;
    } else {
      const k = t - 27;
      const color = t === 32 ? GREEN : t === 33 ? RED : INK;
      inner = (HONOR_HINT[k] ? hint(HONOR_HINT[k]) : '') +
        `<text x="30" y="58" text-anchor="middle" font-family="${KFONT}" font-size="46" font-weight="700" fill="${color}">${HONOR_KANJI[k]}</text>`;
    }
    // tile faces always use Japanese glyph forms, whatever the interface language
    const svg = `<svg viewBox="0 0 60 82" xmlns="http://www.w3.org/2000/svg" lang="ja" aria-hidden="true">${inner}</svg>`;
    faceCache[t] = svg;
    return svg;
  }

  function type(t, cls, attrs) {
    const label = root.I18n ? root.I18n.tileName(t) : (root.Tiles ? root.Tiles.name(t) : '');
    return `<span class="tile ${cls || ''}" data-type="${t}" title="${label}" ${attrs || ''}>${face(t)}</span>`;
  }

  /** set while a Washizu-mahjong table is on screen: three copies of every tile are glass */
  const state = { glass: false };
  const isGlass = id => state.glass && id % 4 !== 0;

  function html(id, cls) {
    return type(id >> 2, (cls || '') + (isGlass(id) ? ' glass' : ''), `data-id="${id}"`);
  }

  function back(cls) {
    return `<span class="tile back ${cls || ''}"></span>`;
  }

  root.TileView = { face, type, html, back, isGlass, setGlass: on => { state.glass = !!on; } };
})(window);
