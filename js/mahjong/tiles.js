/*
 * Tile basics.
 *
 * A "type" is 0..33:
 *   0-8   man (characters) 1-9
 *   9-17  pin (circles)    1-9
 *   18-26 sou (bamboo)     1-9
 *   27-30 winds  East South West North
 *   31-33 dragons White(haku) Green(hatsu) Red(chun)
 * A physical tile "id" is 0..135, and type = id >> 2.
 */
(function (root) {
  'use strict';

  const SUIT_LETTERS = ['m', 'p', 's', 'z'];
  const HONOR_NAMES = ['East', 'South', 'West', 'North', 'White', 'Green', 'Red'];
  const SUIT_NAMES = ['Man', 'Pin', 'Sou'];
  const WIND_NAMES = ['East', 'South', 'West', 'North'];

  const EAST = 27, SOUTH = 28, WEST = 29, NORTH = 30;
  const HAKU = 31, HATSU = 32, CHUN = 33;

  const Tiles = {
    EAST, SOUTH, WEST, NORTH, HAKU, HATSU, CHUN,
    WIND_NAMES,

    typeOf(id) { return id >> 2; },
    suit(t) { return t < 27 ? (t / 9) | 0 : 3; },
    /** 1..9 for suited tiles, 1..7 for honors */
    num(t) { return t < 27 ? (t % 9) + 1 : t - 26; },
    isHonor(t) { return t >= 27; },
    isWind(t) { return t >= 27 && t <= 30; },
    isDragon(t) { return t >= 31; },
    isTerminal(t) { return t < 27 && (t % 9 === 0 || t % 9 === 8); },
    isYaochu(t) { return t >= 27 || t % 9 === 0 || t % 9 === 8; },
    isSimple(t) { return t < 27 && t % 9 !== 0 && t % 9 !== 8; },

    /** short code such as "3m" or "7z" */
    code(t) { return Tiles.num(t) + SUIT_LETTERS[Tiles.suit(t)]; },

    /** human readable name such as "3 Man" or "East" */
    name(t) {
      if (t >= 27) return HONOR_NAMES[t - 27];
      return Tiles.num(t) + ' ' + SUIT_NAMES[Tiles.suit(t)];
    },

    /** parse "123m456p77z" into an array of types */
    parse(str) {
      const out = [];
      let pending = [];
      for (const ch of str.replace(/\s+/g, '')) {
        if (ch >= '0' && ch <= '9') {
          pending.push(+ch);
        } else {
          const s = SUIT_LETTERS.indexOf(ch);
          if (s < 0) throw new Error('bad tile string: ' + str);
          for (const n of pending) out.push(s === 3 ? 26 + n : s * 9 + n - 1);
          pending = [];
        }
      }
      if (pending.length) throw new Error('bad tile string: ' + str);
      return out;
    },

    /** format an array of types as a compact string */
    format(types) {
      const sorted = types.slice().sort((a, b) => a - b);
      let out = '';
      for (let s = 0; s < 4; s++) {
        const nums = sorted.filter(t => Tiles.suit(t) === s).map(t => Tiles.num(t));
        if (nums.length) out += nums.join('') + SUIT_LETTERS[s];
      }
      return out;
    },

    /** the dora designated by an indicator tile */
    doraOf(indicator) {
      if (indicator < 27) return ((indicator / 9) | 0) * 9 + ((indicator % 9) + 1) % 9;
      if (indicator <= 30) return 27 + ((indicator - 27 + 1) % 4);
      return 31 + ((indicator - 31 + 1) % 3);
    },

    /** counts[34] from an array of types */
    counts(types) {
      const c = new Array(34).fill(0);
      for (const t of types) c[t]++;
      return c;
    },

    /** a fresh, ordered set of the 136 tile ids */
    fullSet() {
      const a = new Array(136);
      for (let i = 0; i < 136; i++) a[i] = i;
      return a;
    },

    /** Fisher-Yates shuffle (in place) with a supplied rng() -> [0,1) */
    shuffle(arr, rng) {
      const r = rng || Math.random;
      for (let i = arr.length - 1; i > 0; i--) {
        const j = (r() * (i + 1)) | 0;
        const tmp = arr[i]; arr[i] = arr[j]; arr[j] = tmp;
      }
      return arr;
    },

    /** small deterministic rng for tests and replays */
    seededRng(seed) {
      let a = seed >>> 0;
      return function () {
        a = (a + 0x6D2B79F5) >>> 0;
        let t = a;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
      };
    },
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = Tiles;
  else root.Tiles = Tiles;
})(typeof window !== 'undefined' ? window : globalThis);
