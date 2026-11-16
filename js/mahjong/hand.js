/*
 * Hand analysis: winning-shape decomposition, shanten, waits.
 * All functions work on counts[34] of the CONCEALED tiles plus the number
 * of melds already called (each call removes three tiles from the hand).
 */
(function (root) {
  'use strict';

  const YAOCHU = [0, 8, 9, 17, 18, 26, 27, 28, 29, 30, 31, 32, 33];

  /* ---------- winning shapes ---------- */

  /**
   * All ways to split the concealed tiles into (sets + one pair).
   * Returns [{ pair, sets: [{ k: 'seq'|'tri', t }] }].
   */
  function decompose(counts) {
    const results = [];
    const c = counts.slice();
    const sets = [];

    function rec(start) {
      let i = start;
      while (i < 34 && c[i] === 0) i++;
      if (i >= 34) { results.push(sets.slice()); return; }
      if (c[i] >= 3) {
        c[i] -= 3; sets.push({ k: 'tri', t: i });
        rec(i);
        sets.pop(); c[i] += 3;
      }
      if (i < 27 && i % 9 <= 6 && c[i + 1] > 0 && c[i + 2] > 0) {
        c[i]--; c[i + 1]--; c[i + 2]--; sets.push({ k: 'seq', t: i });
        rec(i);
        sets.pop(); c[i]++; c[i + 1]++; c[i + 2]++;
      }
    }

    const out = [];
    for (let p = 0; p < 34; p++) {
      if (c[p] < 2) continue;
      c[p] -= 2;
      results.length = 0;
      rec(0);
      for (const s of results) out.push({ pair: p, sets: s });
      c[p] += 2;
    }
    return out;
  }

  function isChiitoi(counts) {
    let pairs = 0;
    for (let i = 0; i < 34; i++) {
      if (counts[i] === 2) pairs++;
      else if (counts[i] !== 0) return false;
    }
    return pairs === 7;
  }

  function isKokushi(counts) {
    let total = 0, pair = false;
    for (let i = 0; i < 34; i++) total += counts[i];
    if (total !== 14) return false;
    for (const t of YAOCHU) {
      if (counts[t] === 0) return false;
      if (counts[t] === 2) pair = true;
    }
    let yao = 0;
    for (const t of YAOCHU) yao += counts[t];
    return pair && yao === 14;
  }

  /** true if the concealed tiles (3n+2 of them) complete a hand */
  function isAgari(counts, meldCount) {
    if (!meldCount) {
      if (isChiitoi(counts) || isKokushi(counts)) return true;
    }
    return hasStandardForm(counts);
  }

  function hasStandardForm(counts) {
    const c = counts.slice();
    function rec(start) {
      let i = start;
      while (i < 34 && c[i] === 0) i++;
      if (i >= 34) return true;
      if (c[i] >= 3) {
        c[i] -= 3;
        const ok = rec(i);
        c[i] += 3;
        if (ok) return true;
      }
      if (i < 27 && i % 9 <= 6 && c[i + 1] > 0 && c[i + 2] > 0) {
        c[i]--; c[i + 1]--; c[i + 2]--;
        const ok = rec(i);
        c[i]++; c[i + 1]++; c[i + 2]++;
        if (ok) return true;
      }
      return false;
    }
    for (let p = 0; p < 34; p++) {
      if (c[p] < 2) continue;
      c[p] -= 2;
      const ok = rec(0);
      c[p] += 2;
      if (ok) return true;
    }
    return false;
  }

  /** tile types that would complete a 3n+1 tile hand */
  function waits(counts, meldCount) {
    const out = [];
    for (let t = 0; t < 34; t++) {
      if (counts[t] >= 4) continue;
      counts[t]++;
      if (isAgari(counts, meldCount)) out.push(t);
      counts[t]--;
    }
    return out;
  }

  /* ---------- shanten ---------- */

  const suitCache = new Map();

  /** res[m] = most partial sets alongside exactly m complete sets (-1: impossible) */
  function suitSearch(a) {
    const res = [-1, -1, -1, -1, -1];
    function dfs(start, m, t) {
      let i = start;
      while (i < 9 && a[i] === 0) i++;
      if (i >= 9) { if (m <= 4 && t > res[m]) res[m] = t; return; }
      if (a[i] >= 3) { a[i] -= 3; dfs(i, m + 1, t); a[i] += 3; }
      if (i <= 6 && a[i + 1] > 0 && a[i + 2] > 0) {
        a[i]--; a[i + 1]--; a[i + 2]--; dfs(i, m + 1, t); a[i]++; a[i + 1]++; a[i + 2]++;
      }
      if (a[i] >= 2) { a[i] -= 2; dfs(i, m, t + 1); a[i] += 2; }
      if (i <= 7 && a[i + 1] > 0) { a[i]--; a[i + 1]--; dfs(i, m, t + 1); a[i]++; a[i + 1]++; }
      if (i <= 6 && a[i + 2] > 0) { a[i]--; a[i + 2]--; dfs(i, m, t + 1); a[i]++; a[i + 2]++; }
      a[i]--; dfs(i, m, t); a[i]++;
    }
    dfs(0, 0, 0);
    return res;
  }

  /**
   * Cached analysis of one suit:
   *   plain[m]  best partial count with m sets
   *   head[m]   the same after setting one pair of this suit aside as the head
   */
  function suitBest(c, offset) {
    let key = 0;
    for (let i = 0; i < 9; i++) key = key * 5 + c[offset + i];
    const hit = suitCache.get(key);
    if (hit) return hit;
    const a = c.slice(offset, offset + 9);
    const plain = suitSearch(a);
    const head = [-1, -1, -1, -1, -1];
    for (let i = 0; i < 9; i++) {
      if (a[i] < 2) continue;
      a[i] -= 2;
      const r = suitSearch(a);
      a[i] += 2;
      for (let m = 0; m <= 4; m++) if (r[m] > head[m]) head[m] = r[m];
    }
    const out = { plain, head };
    suitCache.set(key, out);
    return out;
  }

  function shantenStandard(counts, meldCount) {
    // no[m] / yes[m]: best partial count with m sets, without / with a head pair
    let no = [-1, -1, -1, -1, -1], yes = [-1, -1, -1, -1, -1];
    no[Math.min(meldCount || 0, 4)] = 0;

    for (let s = 0; s < 3; s++) {
      const r = suitBest(counts, s * 9);
      const n2 = [-1, -1, -1, -1, -1], y2 = [-1, -1, -1, -1, -1];
      for (let m = 0; m <= 4; m++) {
        for (let k = 0; m + k <= 4; k++) {
          if (no[m] >= 0) {
            if (r.plain[k] >= 0 && no[m] + r.plain[k] > n2[m + k]) n2[m + k] = no[m] + r.plain[k];
            if (r.head[k] >= 0 && no[m] + r.head[k] > y2[m + k]) y2[m + k] = no[m] + r.head[k];
          }
          if (yes[m] >= 0 && r.plain[k] >= 0 && yes[m] + r.plain[k] > y2[m + k]) y2[m + k] = yes[m] + r.plain[k];
        }
      }
      no = n2; yes = y2;
    }

    // honors: a triplet is a set, a pair is a partial set (or the head)
    let hm = 0, ht = 0;
    for (let i = 27; i < 34; i++) {
      if (counts[i] >= 3) hm++;
      else if (counts[i] === 2) ht++;
    }

    let best = 8;
    const consider = (sets, part, head) => {
      if (sets > 4) return;
      if (sets + part > 4) part = 4 - sets;
      const sh = 8 - 2 * sets - part - head;
      if (sh < best) best = sh;
    };
    for (let m = 0; m <= 4; m++) {
      for (let useM = 0; useM <= hm; useM++) {
        const spare = hm - useM; // unused triplets still hold a pair
        if (no[m] >= 0) {
          consider(m + useM, no[m] + ht + spare, 0);
          if (ht > 0) consider(m + useM, no[m] + ht - 1 + spare, 1);    // an honor pair as head
          if (spare > 0) consider(m + useM, no[m] + ht + spare - 1, 1); // split a triplet for the head
        }
        if (yes[m] >= 0) consider(m + useM, yes[m] + ht + spare, 1);
      }
    }
    return best;
  }

  function shantenChiitoi(counts) {
    let pairs = 0, kinds = 0;
    for (let i = 0; i < 34; i++) {
      if (counts[i] >= 1) kinds++;
      if (counts[i] >= 2) pairs++;
    }
    return 6 - pairs + Math.max(0, 7 - kinds);
  }

  function shantenKokushi(counts) {
    let kinds = 0, pair = 0;
    for (const t of YAOCHU) {
      if (counts[t] >= 1) kinds++;
      if (counts[t] >= 2) pair = 1;
    }
    return 13 - kinds - pair;
  }

  /**
   * Shanten number: -1 complete, 0 tenpai, 1 one-away...
   * Works for 3n+1 and 3n+2 tile hands.
   */
  function shanten(counts, meldCount) {
    let best = shantenStandard(counts, meldCount || 0);
    if (!meldCount) {
      const c = shantenChiitoi(counts);
      if (c < best) best = c;
      const k = shantenKokushi(counts);
      if (k < best) best = k;
    }
    return best;
  }

  const Hand = {
    YAOCHU,
    decompose, isChiitoi, isKokushi, isAgari, waits,
    shanten, shantenStandard, shantenChiitoi, shantenKokushi,
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = Hand;
  else root.Hand = Hand;
})(typeof window !== 'undefined' ? window : globalThis);
