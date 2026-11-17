/*
 * Yaku evaluation, fu and point calculation (riichi rules, no red fives,
 * no kan - this is the 1958 back-room table).
 *
 * Yaku.evaluate(ctx) -> null when the hand has no yaku, otherwise
 *   { yaku:[{id, name, han}|{id, name, yakuman}], han, fu, yakuman, dora, ura, base, limit, limitId }
 *   (`id` / `limitId` are stable keys for translation; `name` / `limit` are the English labels)
 *
 * ctx = {
 *   concealed: [types]        concealed tiles INCLUDING the winning tile
 *   melds: [{ type:'chi'|'pon', tiles:[types] }]
 *   winTile, tsumo,
 *   riichi, doubleRiichi, ippatsu, haitei, houtei, tenhou, chiihou,
 *   seatWind, roundWind,      tile types 27..30
 *   doraIndicators: [types], uraIndicators: [types]
 * }
 */
(function (root) {
  'use strict';
  const isNode = typeof module !== 'undefined' && module.exports;
  const Tiles = isNode ? require('./tiles.js') : root.Tiles;
  const Hand = isNode ? require('./hand.js') : root.Hand;

  const GREEN = new Set([19, 20, 21, 23, 25, 32]);
  const WIND_LABEL = ['East', 'South', 'West', 'North'];

  function ceil10(n) { return Math.ceil(n / 10) * 10; }
  function ceil100(n) { return Math.ceil(n / 100) * 100; }

  function baseFrom(han, fu, yakuman) {
    if (yakuman) return { base: 8000 * yakuman, limit: yakuman > 1 ? yakuman + 'x Yakuman' : 'Yakuman', limitId: 'yakuman' };
    if (han >= 13) return { base: 8000, limit: 'Kazoe Yakuman', limitId: 'kazoe' };
    if (han >= 11) return { base: 6000, limit: 'Sanbaiman', limitId: 'sanbaiman' };
    if (han >= 8) return { base: 4000, limit: 'Baiman', limitId: 'baiman' };
    if (han >= 6) return { base: 3000, limit: 'Haneman', limitId: 'haneman' };
    if (han >= 5) return { base: 2000, limit: 'Mangan', limitId: 'mangan' };
    const b = fu * Math.pow(2, han + 2);
    if (b >= 2000) return { base: 2000, limit: 'Mangan', limitId: 'mangan' };
    return { base: b, limit: '', limitId: '' };
  }

  /**
   * Who pays what.
   * Returns { total, ron } for ron, or { total, fromDealer, fromOthers } for tsumo
   * (for a dealer tsumo fromDealer is 0 and everyone pays fromOthers).
   */
  function payments(base, winnerIsDealer, tsumo, honba) {
    honba = honba || 0;
    if (!tsumo) {
      const ron = ceil100(base * (winnerIsDealer ? 6 : 4)) + 300 * honba;
      return { total: ron, ron };
    }
    if (winnerIsDealer) {
      const each = ceil100(base * 2) + 100 * honba;
      return { total: each * 3, fromDealer: 0, fromOthers: each };
    }
    const d = ceil100(base * 2) + 100 * honba;
    const o = ceil100(base) + 100 * honba;
    return { total: d + o * 2, fromDealer: d, fromOthers: o };
  }

  function situational(ctx, menzen) {
    const y = [];
    if (ctx.doubleRiichi) y.push({ id: 'double_riichi', name: 'Double Riichi', han: 2 });
    else if (ctx.riichi) y.push({ id: 'riichi', name: 'Riichi', han: 1 });
    if (ctx.ippatsu && (ctx.riichi || ctx.doubleRiichi)) y.push({ id: 'ippatsu', name: 'Ippatsu', han: 1 });
    if (ctx.tsumo && menzen) y.push({ id: 'tsumo', name: 'Menzen Tsumo', han: 1 });
    if (ctx.haitei) y.push({ id: 'haitei', name: 'Haitei (Last-Tile Draw)', han: 1 });
    if (ctx.houtei) y.push({ id: 'houtei', name: 'Houtei (Last-Tile Ron)', han: 1 });
    return y;
  }

  function evaluate(ctx) {
    const melds = ctx.melds || [];
    const menzen = melds.length === 0;
    const concealed = ctx.concealed;
    const counts = Tiles.counts(concealed);
    let allTiles = concealed.slice();
    for (const m of melds) allTiles = allTiles.concat(m.tiles);
    const allCounts = Tiles.counts(allTiles);

    // whole-hand properties
    const suits = new Set();
    let hasHonor = false, allYaochu = true, noYaochu = true, allGreen = true;
    for (const t of allTiles) {
      if (t >= 27) hasHonor = true; else suits.add(Tiles.suit(t));
      if (Tiles.isYaochu(t)) noYaochu = false; else allYaochu = false;
      if (!GREEN.has(t)) allGreen = false;
    }
    const oneSuit = suits.size === 1;
    const allHonor = suits.size === 0;
    const allTerminal = allYaochu && !hasHonor;

    const firstTurnYakuman = [];
    if (ctx.tenhou) firstTurnYakuman.push({ id: 'tenhou', name: 'Tenhou (Heavenly Hand)', yakuman: 1 });
    if (ctx.chiihou) firstTurnYakuman.push({ id: 'chiihou', name: 'Chiihou (Earthly Hand)', yakuman: 1 });

    const candidates = [];

    /* ---- kokushi ---- */
    if (menzen && Hand.isKokushi(counts)) {
      candidates.push({ yaku: [{ id: 'kokushi', name: 'Kokushi Musou (Thirteen Orphans)', yakuman: 1 }].concat(firstTurnYakuman), fu: 30 });
    }

    /* ---- seven pairs ---- */
    if (menzen && Hand.isChiitoi(counts)) {
      if (allHonor) {
        candidates.push({ yaku: [{ id: 'tsuuiisou', name: 'Tsuuiisou (All Honors)', yakuman: 1 }].concat(firstTurnYakuman), fu: 25 });
      } else if (firstTurnYakuman.length) {
        candidates.push({ yaku: firstTurnYakuman.slice(), fu: 25 });
      } else {
        const y = situational(ctx, menzen);
        y.push({ id: 'chiitoi', name: 'Chiitoitsu (Seven Pairs)', han: 2 });
        if (noYaochu) y.push({ id: 'tanyao', name: 'Tanyao (All Simples)', han: 1 });
        if (allYaochu) y.push({ id: 'honroutou', name: 'Honroutou', han: 2 });
        if (oneSuit && hasHonor) y.push({ id: 'honitsu', name: 'Honitsu (Half Flush)', han: 3 });
        if (oneSuit && !hasHonor) y.push({ id: 'chinitsu', name: 'Chinitsu (Full Flush)', han: 6 });
        candidates.push({ yaku: y, fu: 25 });
      }
    }

    /* ---- standard hands ---- */
    const openSets = melds.map(m => ({
      k: m.type === 'chi' ? 'seq' : 'tri',
      t: Math.min.apply(null, m.tiles),
      open: true,
    }));

    for (const d of Hand.decompose(counts)) {
      // where could the winning tile sit?
      const placements = [];
      if (d.pair === ctx.winTile) placements.push({ kind: 'tanki', idx: -1 });
      const seen = new Set();
      d.sets.forEach((s, idx) => {
        const key = s.k + s.t;
        if (seen.has(key)) return;
        if (s.k === 'tri' && s.t === ctx.winTile) {
          seen.add(key); placements.push({ kind: 'shanpon', idx });
        } else if (s.k === 'seq' && ctx.winTile >= s.t && ctx.winTile <= s.t + 2) {
          seen.add(key);
          const pos = ctx.winTile - s.t;
          let kind = 'ryanmen';
          if (pos === 1) kind = 'kanchan';
          else if (pos === 0 && s.t % 9 === 6) kind = 'penchan';
          else if (pos === 2 && s.t % 9 === 0) kind = 'penchan';
          placements.push({ kind, idx });
        }
      });

      for (const pl of placements) {
        const sets = d.sets.map((s, idx) => ({
          k: s.k, t: s.t,
          // a triplet finished by ron counts as an open triplet
          open: !ctx.tsumo && pl.kind === 'shanpon' && idx === pl.idx,
          melded: false,
        })).concat(openSets.map(s => ({ k: s.k, t: s.t, open: true, melded: true })));

        candidates.push(evalStandard(sets, d.pair, pl.kind));
      }
    }

    function evalStandard(sets, pair, wait) {
      const tris = sets.filter(s => s.k === 'tri');
      const seqs = sets.filter(s => s.k === 'seq');
      const concealedTris = tris.filter(s => !s.open).length;
      const hasTri = t => tris.some(s => s.t === t);
      const hasSeq = t => seqs.some(s => s.t === t);

      /* yakuman */
      const ym = [];
      // waiting on the pair (tanki) is the hardest form, and counts double
      if (menzen && concealedTris === 4) {
        ym.push(wait === 'tanki'
          ? { id: 'suuankou_tanki', name: 'Suuankou Tanki (Four Concealed Triplets, Single Wait)', yakuman: 2 }
          : { id: 'suuankou', name: 'Suuankou (Four Concealed Triplets)', yakuman: 1 });
      }
      if (hasTri(31) && hasTri(32) && hasTri(33)) ym.push({ id: 'daisangen', name: 'Daisangen (Big Three Dragons)', yakuman: 1 });
      const windTris = [27, 28, 29, 30].filter(hasTri).length;
      if (windTris === 4) ym.push({ id: 'daisuushii', name: 'Daisuushii (Big Four Winds)', yakuman: 1 });
      else if (windTris === 3 && Tiles.isWind(pair)) ym.push({ id: 'shousuushii', name: 'Shousuushii (Little Four Winds)', yakuman: 1 });
      if (allHonor) ym.push({ id: 'tsuuiisou', name: 'Tsuuiisou (All Honors)', yakuman: 1 });
      if (allTerminal) ym.push({ id: 'chinroutou', name: 'Chinroutou (All Terminals)', yakuman: 1 });
      if (allGreen) ym.push({ id: 'ryuuiisou', name: 'Ryuuiisou (All Green)', yakuman: 1 });
      if (menzen && oneSuit && !hasHonor) {
        const s = [...suits][0] * 9;
        const need = [3, 1, 1, 1, 1, 1, 1, 1, 3];
        if (need.every((n, i) => counts[s + i] >= n)) ym.push({ id: 'chuuren', name: 'Chuuren Poutou (Nine Gates)', yakuman: 1 });
      }
      for (const f of firstTurnYakuman) ym.push(f);
      if (ym.length) return { yaku: ym, fu: 30 };

      /* regular yaku */
      const y = situational(ctx, menzen);
      const pairIsValue = Tiles.isDragon(pair) || pair === ctx.seatWind || pair === ctx.roundWind;
      const pinfu = menzen && tris.length === 0 && !pairIsValue && wait === 'ryanmen';

      if (noYaochu) y.push({ id: 'tanyao', name: 'Tanyao (All Simples)', han: 1 });
      if (pinfu) y.push({ id: 'pinfu', name: 'Pinfu', han: 1 });

      if (menzen) {
        const seqCount = {};
        for (const s of seqs) seqCount[s.t] = (seqCount[s.t] || 0) + 1;
        let dup = 0;
        for (const k in seqCount) dup += Math.floor(seqCount[k] / 2);
        if (dup >= 2) y.push({ id: 'ryanpeikou', name: 'Ryanpeikou (Twice Double Sequences)', han: 3 });
        else if (dup === 1) y.push({ id: 'iipeikou', name: 'Iipeikou (Double Sequence)', han: 1 });
      }

      if (hasTri(31)) y.push({ id: 'yakuhai_haku', name: 'Yakuhai: White Dragon', han: 1 });
      if (hasTri(32)) y.push({ id: 'yakuhai_hatsu', name: 'Yakuhai: Green Dragon', han: 1 });
      if (hasTri(33)) y.push({ id: 'yakuhai_chun', name: 'Yakuhai: Red Dragon', han: 1 });
      if (hasTri(ctx.seatWind)) y.push({ id: 'yakuhai_seat', wind: ctx.seatWind - 27, name: 'Yakuhai: Seat Wind (' + WIND_LABEL[ctx.seatWind - 27] + ')', han: 1 });
      if (hasTri(ctx.roundWind)) y.push({ id: 'yakuhai_round', wind: ctx.roundWind - 27, name: 'Yakuhai: Round Wind (' + WIND_LABEL[ctx.roundWind - 27] + ')', han: 1 });

      for (let n = 0; n < 7; n++) {
        if (hasSeq(n) && hasSeq(n + 9) && hasSeq(n + 18)) {
          y.push({ id: 'sanshoku', name: 'Sanshoku Doujun (Three Colour Straight)', han: menzen ? 2 : 1 });
          break;
        }
      }
      for (let s = 0; s < 27; s += 9) {
        if (hasSeq(s) && hasSeq(s + 3) && hasSeq(s + 6)) {
          y.push({ id: 'ittsu', name: 'Ittsu (Pure Straight)', han: menzen ? 2 : 1 });
          break;
        }
      }
      for (let n = 0; n < 9; n++) {
        if (hasTri(n) && hasTri(n + 9) && hasTri(n + 18)) {
          y.push({ id: 'sanshoku_doukou', name: 'Sanshoku Doukou (Three Colour Triplets)', han: 2 });
          break;
        }
      }

      if (tris.length === 4) y.push({ id: 'toitoi', name: 'Toitoi (All Triplets)', han: 2 });
      if (concealedTris === 3) y.push({ id: 'sanankou', name: 'Sanankou (Three Concealed Triplets)', han: 2 });

      const dragonTris = [31, 32, 33].filter(hasTri).length;
      if (dragonTris === 2 && Tiles.isDragon(pair)) y.push({ id: 'shousangen', name: 'Shousangen (Little Three Dragons)', han: 2 });

      if (allYaochu) {
        y.push({ id: 'honroutou', name: 'Honroutou', han: 2 });
      } else if (seqs.length > 0) {
        const everySetOuter = sets.every(s => s.k === 'tri' ? Tiles.isYaochu(s.t) : (s.t % 9 === 0 || s.t % 9 === 6));
        if (everySetOuter && Tiles.isYaochu(pair)) {
          if (hasHonor) y.push({ id: 'chanta', name: 'Chanta (Outside Hand)', han: menzen ? 2 : 1 });
          else y.push({ id: 'junchan', name: 'Junchan (Terminals in All Sets)', han: menzen ? 3 : 2 });
        }
      }

      if (oneSuit && hasHonor) y.push({ id: 'honitsu', name: 'Honitsu (Half Flush)', han: menzen ? 3 : 2 });
      if (oneSuit && !hasHonor) y.push({ id: 'chinitsu', name: 'Chinitsu (Full Flush)', han: menzen ? 6 : 5 });

      /* fu */
      let fu;
      if (pinfu) {
        fu = ctx.tsumo ? 20 : 30;
      } else {
        fu = 20;
        if (menzen && !ctx.tsumo) fu += 10;
        if (ctx.tsumo) fu += 2;
        for (const s of tris) {
          let f = Tiles.isYaochu(s.t) ? 8 : 4;
          if (s.open) f /= 2;
          fu += f;
        }
        if (Tiles.isDragon(pair)) fu += 2;
        if (pair === ctx.seatWind) fu += 2;
        if (pair === ctx.roundWind) fu += 2;
        if (wait === 'kanchan' || wait === 'penchan' || wait === 'tanki') fu += 2;
        fu = ceil10(fu);
        if (!menzen && fu < 30) fu = 30;
      }
      return { yaku: y, fu };
    }

    /* ---- pick the most valuable reading ---- */
    let dora = 0, ura = 0;
    for (const ind of ctx.doraIndicators || []) dora += allCounts[Tiles.doraOf(ind)];
    if (ctx.riichi || ctx.doubleRiichi) {
      for (const ind of ctx.uraIndicators || []) ura += allCounts[Tiles.doraOf(ind)];
    }

    let best = null;
    for (const c of candidates) {
      let yakuman = 0, han = 0;
      for (const y of c.yaku) { if (y.yakuman) yakuman += y.yakuman; else han += y.han; }
      if (!yakuman && han === 0) continue; // dora alone is not a yaku
      const yaku = c.yaku.slice();
      if (!yakuman) {
        if (dora) yaku.push({ id: 'dora', name: 'Dora', han: dora });
        if (ura) yaku.push({ id: 'ura', name: 'Ura Dora', han: ura });
        han += dora + ura;
      }
      const b = baseFrom(han, c.fu, yakuman);
      const res = { yaku, han, fu: c.fu, yakuman, dora, ura, base: b.base, limit: b.limit, limitId: b.limitId };
      if (!best || res.base > best.base || (res.base === best.base && res.han > best.han)) best = res;
    }
    return best;
  }

  const Yaku = { evaluate, payments, baseFrom, ceil100 };

  if (isNode) module.exports = Yaku;
  else root.Yaku = Yaku;
})(typeof window !== 'undefined' ? window : globalThis);
