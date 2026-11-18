/*
 * The prologue - 序章·人血麻将 (Human-Blood Mahjong). It comes before Chapter 1 and is
 * meant for players who have never met the series: Akagi at nineteen, six hanchan of transparent
 * mahjong against Washizu Iwao, "the monster of Showa", with Akagi's own blood as the stake.
 *
 * It follows the "Washizu mahjong" arc of the anime (episodes 16-26: the stakes raised, the riichi
 * and the feed, the second river, the 5m ambush, the refused transfusions, the 1p trap, the basin
 * of blood) and then goes one hand past where the anime stops. Every decision that matters is the
 * player's, and each road the source did not take leads to an ending of its own:
 *
 *   结局·安然无恙  accept Washizu's stakes            结局·功亏一篑  take the transfusion
 *   结局·自投罗网  throw the 1p into the trap         结局·坐以待毙  keep the last 1p
 *   结局·见好就收  take the 300 million and leave
 *
 * Battles: 'ambush' (请君入瓮, South 1 of the first hanchan) and 'resolve' (人血麻将, the East
 * round of the fifth hanchan, 600cc from death). Same script format as chapter1.js; written in
 * Chinese first, like chapters 2 and 3 (Z(...), langs: ['zh']). The dialogue is an original
 * retelling: it follows the events of the source without reproducing its lines.
 */
(function (root) {
  'use strict';
  const Z = zh => ({ zh });

  /*
   * Tables. Washizu mahjong: three copies of every tile are glass, so the other hands show through;
   * `opaque` lists the tiles of a hand that are the one opaque copy of their kind.
   * Seats: Akagi 0, Yasuoka 1 (his partner), Washizu 2 (across), Suzuki 3 (Washizu's partner).
   */
  const seats = (a, y, w, s) => [
    Object.assign({ who: 'akagi19' }, a),
    Object.assign({ who: 'yasuoka' }, y),
    Object.assign({ who: 'washizu' }, w),
    Object.assign({ who: 'suzuki' }, s),
  ];

  // East 1 of the first hanchan, before anyone has moved: what a glass table looks like
  const T_RULES = {
    me: 0, dealer: 1, roundWind: 0, kyoku: 0, dora: '4p', wall: 70, glass: true,
    seats: seats(
      { score: 25000, hand: '1199m3457p678s25z', opaque: '9m' },
      { score: 25000, hand: '234m669p3458s177z', opaque: '6p' },
      { score: 25000, hand: '5678m12p1199s346z', opaque: '1s' },
      { score: 25000, hand: '2468m3689p257s14z', opaque: '8p' }),
  };

  /*
   * The hands the story plays out on the table, move by move ({ move } in the script). Each table is
   * the position just before the first move; tests/story.test.js replays every one of them and checks
   * that no tile is used a fifth time, that every winning hand is complete, and what it is worth.
   */

  // First hanchan, East 3 (Suzuki deals): Washizu, half his hand opaque, declares riichi; Suzuki feeds at once
  const T_FEED = {
    me: 0, dealer: 3, roundWind: 0, kyoku: 2, dora: '7p', wall: 46, glass: true,
    seats: seats(
      { score: 30000, hand: '345m246p33678s77z', opaque: '6p7z', river: '9s1p2z9m1z8p' },
      { score: 23000, hand: '68m5577p2289s446z', opaque: '7p', river: '4z3z1s9p6z5z' },
      { score: 24000, hand: '234567m345889p6s', opaque: '3m6m4p8p6s', river: '1z9m2z1s9s' },
      { score: 23000, hand: '117899m12p57s225z', river: '3z9p1z6z9s8s' }),
  };

  // East 4 (Akagi deals): Washizu is ready on 4p-7p but silent - Suzuki holds none of his tiles, so
  // Suzuki's glass hand is a "second river": the 7s, 8s and 5p in it are safe
  const T_RIVER2 = {
    me: 0, dealer: 0, roundWind: 0, kyoku: 3, dora: '5s', wall: 46, glass: true,
    seats: seats(
      { score: 30000, hand: '6667789m234p478s', opaque: '9m', river: '1z9p3z1s2z' },
      { score: 23000, hand: '123m1168p299s127z', river: '4z9m3z8p6z' },
      { score: 32000, hand: '234567m56p34566s', opaque: '5p6s', river: '1z9s2z9p8p' },
      { score: 15000, hand: '119m599p178s3445z', river: '6z2p7z3p4m' }),
  };

  // South 2 (Washizu deals): Akagi, ready on 5p-8p behind an opaque 5s, lets Yasuoka's 8p go by
  const T_PASS = {
    me: 0, dealer: 2, roundWind: 1, kyoku: 1, dora: '1p', wall: 40, glass: true,
    seats: seats(
      { score: 28600, hand: '2267p345s777z', melds: ['333z'], opaque: '5s', river: '6z1z2m8m4z1s3s' },
      { score: 21000, hand: '45699m13p678s255z', river: '1m7z9p2s4m2m' },
      { score: 37400, hand: '234678m6789p578s', opaque: '7m', river: '1z9m4z1p2z1s9s' },
      { score: 13000, hand: '1159m13p669s1266z', river: '4z9p2z6z5z3m1s' }),
  };

  // South 4, the last hand (Akagi deals, 6,800 behind): Washizu has just thrown 4m
  const T_LAST = {
    me: 0, dealer: 0, roundWind: 1, kyoku: 3, dora: '3s', wall: 44, glass: true,
    seats: seats(
      { score: 34600, hand: '11667m4p4s113477z', opaque: '4p3z4z', river: '2z9s1p5z8p2s7s' },
      { score: 17000, hand: '1258m369p2589s17z', river: '3z4z1s2p9m6s' },
      { score: 41400, hand: '6m4456p34567s666z', opaque: '4s6z', river: '1z9m1p2z8m4m' },
      { score: 7000, hand: '59m1157p199s2355z', river: '4z6z8p1s2p3m' }),
  };

  // Second hanchan, the last hand (Akagi deals, Washizu 9,200 behind): the dora West is Washizu's wind.
  // Both wait on the same closed 2m - and Akagi draws 5p
  const T_SWITCH = {
    me: 0, dealer: 0, roundWind: 1, kyoku: 3, dora: '2z', wall: 30, glass: true,
    seats: seats(
      { score: 38600, hand: '11233456m44455p', opaque: '4p', river: '9s1z9p2z4z2s8s7z3z' },
      { score: 17000, hand: '588m6p1235577s15z', river: '9m1p4z2z9p1s7z6m2p' },
      { score: 29400, hand: '13m33z', opaque: '3z', melds: ['666z', '111p', '789p'], river: '2s9s4z8s1s3p5z9m7s' },
      { score: 15000, hand: '379m236p44689s34z', river: '1z2z7z9p1m5z8m6m1s' }),
  };

  /*
   * The 1p trap: East 2 of the third hanchan, Washizu deals. Suzuki's kan turned up a 1s indicator,
   * which makes Washizu's three 2s dora 3, and Washizu declared riichi: four sets through the glass
   * and one opaque tile - a single wait on the opaque 1p. Suzuki holds a 1p and has not fed it,
   * so by the "second river" the 1p looks safe. Akagi has just drawn 5s: throwing the 1p would
   * make him ready.
   */
  const T_TRAP1 = {
    me: 0, dealer: 2, roundWind: 0, kyoku: 1, dora: '8m1s', wall: 38, glass: true,
    seats: seats(
      { score: 24000, hand: '234m1567p34s99s66z', draw: '5s', opaque: '6z', river: '9m1z3z8p7s' },
      { score: 26000, hand: '345m789m48p459s77z', opaque: '4p', river: '1m2z6s7p9p' },
      { score: 26000, hand: '345m678m456p222s1p', opaque: '1p', river: '1z9s2z3p5z2p', riichi: 5 },
      { score: 23000, hand: '3m1p99p888s556s', melds: ['4444z'], river: '3z1m5z6m7s3s' }),
  };
  // two turns later: Suzuki has his second kan (dora 6) and Washizu is about to draw the fourth 2s
  const T_KAN2 = {
    me: 0, dealer: 2, roundWind: 0, kyoku: 1, dora: '8m1s1s', wall: 28, glass: true,
    seats: seats(
      { score: 24000, hand: '34m567p345s1p99s66z', opaque: '6z', river: '9m1z3z8p7s2m2z5z' },
      { score: 26000, hand: '345m789m45s9s6z777z', river: '1m2z6s7p9p4p8p' },
      { score: 26000, hand: '345m678m456p222s1p', opaque: '1p', river: '1z9s2z3p5z2p7m6m', riichi: 5 },
      { score: 23000, hand: '3m1p99p556s', melds: ['4444z', '8888s'], river: '3z1m5z6m7s3s9m1s' }),
  };
  /*
   * The moment itself (what T_KAN2 becomes once its moves are played; the tests check they agree):
   * three 1s indicators, dora 12, a dealer yakuman. Yasuoka drew the last 1p - all four are in sight
   * now - and waits on it with red dragon and dora; the calls have kept Washizu and Suzuki from
   * drawing. Akagi has just called again and must discard.
   */
  const T_TRAP2 = {
    me: 0, dealer: 2, roundWind: 0, kyoku: 1, dora: '8m1s1s1s', wall: 24, glass: true,
    seats: seats(
      { score: 24000, hand: '34m567p45s1p', melds: ['666z', '999s'], river: '9m1z3z8p7s2m2z5z1m' },
      { score: 26000, hand: '345m789m1p777z', melds: ['345s'], river: '1m2z6s7p9p4p8p' },
      { score: 26000, hand: '345m678m456p1p', melds: ['2222s'], opaque: '1p', river: '1z9s2z3p5z2p7m6m4m', riichi: 5 },
      { score: 23000, hand: '3m1p99p556s', melds: ['4444z', '8888s'], river: '3z1m5z6m7s3s9m1s6p' }),
  };

  // Third hanchan, East 3 (Suzuki deals): Akagi waits on an opaque West; Washizu holds the other three
  const T_WEST = {
    me: 0, dealer: 3, roundWind: 0, kyoku: 2, dora: '7s', wall: 40, glass: true,
    seats: seats(
      { score: 31000, hand: '345m444p678s3z', opaque: '3z', melds: ['222z'], river: '9p1z7z6z2s3p' },
      { score: 24000, hand: '199m2288p129s157z', river: '4z5z6p9s1z3s' },
      { score: 26000, hand: '3445566m5s67s333z', river: '1z9p4z1s9m' },
      { score: 19000, hand: '1278m79p1134s446z', river: '9s2z5z1p9m6z' }),
  };

  // Later in the third hanchan (Yasuoka deals): Akagi's 5p-6p show through the glass - a 4p-7p wait for all to see
  const T_KING = {
    me: 0, dealer: 1, roundWind: 1, kyoku: 0, dora: '4s', wall: 42, glass: true,
    seats: seats(
      { score: 36000, hand: '234m56p34567888s', opaque: '3m', river: '9m1p2z7z9p1z' },
      { score: 22000, hand: '79m123699p14557z', river: '9s1z3z2z8m6z4z' },
      { score: 24000, hand: '123456789m4p8p99s', opaque: '2m', river: '1z4z5z3z1p2z' },
      { score: 18000, hand: '158m12p1179s2366z', river: '4z9p7z1s3z6z' }),
  };

  // the ledger at the points the story can return to: blood drawn, Washizu's funds, Akagi's winnings
  const LEDGER = {
    start:  { blood: 0, lethal: 2000, funds: 500000000, won: 0 },
    ambush: { blood: 400, funds: 500000000, won: 0 },
    first:  { blood: 600, funds: 447500000, won: 52500000 },         // the first hanchan settled: 52.5 million
    second: { blood: 1100, funds: 381500000, won: 118500000 },        // the second: 66 million more
    fourth: { blood: 1400, funds: 186500000, won: 313500000 },        // after four hanchan
    fifth:  { blood: 1400, funds: 286500000, won: 313500000 },        // Washizu adds his last 100 million
  };
  const pass = (seat, tile) => [{ seat, draw: tile }, { seat, discard: tile }];      // draw a tile and throw it

  const AGAIN = label => ({ choice: [
    { text: Z('回到那一刻'), goto: label },
    { text: Z('返回标题画面'), goto: 'quit' },
  ] });

  const prologue = {
    id: 'prologue',
    no: 0,
    label: Z('序章'),
    langs: ['zh'],
    title: Z('人血麻将'),
    summary: Z('昭和四十年，暴雨之夜。十九岁的赤木茂坐上了“昭和的怪物”鹫巢巌的牌桌：麻将牌是透明的，赌注是人的血——他自己的血。抽满两千cc，就是死。'),
    available: true,
    banner: 'bg/washizu.jpg',
    script: [
      { bg: 'black' },
      { card: Z('序章'), sub: Z('人血麻将') },

      /* ------------------------------------------------ cold open: the rack fills as the count goes up */
      { bg: 'blood' },
      { rack: 0 },
      { rack: 100, text: Z('一百。') },
      { rack: 200, text: Z('两百。') },
      { rack: 300, text: Z('三百……') },
      { text: Z('透明的量筒里，暗红色的液体一格一格地往上涨。') },
      { rack: 400, text: Z('那是一个活人的血。四根量筒，一共两千cc——全部抽满，那个人就会死。') },
      { text: Z('针头还扎在青年的手臂上。他的脸白得像纸，眼睛却一眨也不眨。') },
      { who: 'akagi19', emo: 'flat', text: Z('……下一局。') },
      { rack: false },
      { hide: 'all' },
      { bg: 'black' },
      { card: Z('昭和四十年，夏'), sub: Z('暴雨之夜') },

      /* ------------------------------------------------ the monster's mansion */
      { bg: 'mansion' },
      { fx: 'thunder' },
      { text: Z('东京郊外，山丘上有一座巨大的洋馆。') },
      { text: Z('这些年，有不少年轻人走进过这扇铁门。走出来的，一个也没有。') },
      { text: Z('洋馆的主人名叫鹫巢巌，七十五岁。') },
      { text: Z('战后，他在幕后操纵着这个国家的政界、财界和警界。知道这个名字的人，都叫他“昭和的怪物”。') },
      { text: Z('他的消遣，是用钱买来年轻人，和他们打麻将。赌的是他们的血——一直赌到死为止。') },
      { text: Z('为了把那些死掉的人从世上抹干净，他花掉了大半家产。剩下的，只有五亿日元。') },

      { bg: 'washizu' },
      { text: Z('洋馆深处，一间四壁镶着木板的牌室。') },
      { show: 'washizu', at: 'right', face: 'sneer' },
      { who: 'washizu', emo: 'smug', text: Z('仰木。这回你又给我送来一只什么样的羊羔？') },
      { show: 'ogi', at: 'left', face: 'calm' },
      { who: 'ogi', emo: 'flat', text: Z('鹫巢先生，今晚不是来送羊羔的。') },
      { who: 'ogi', emo: 'flat', think: true, text: Z('这些年，替这个老怪物找“羊羔”的人，就是我。他们一个接一个，全都死在了这张桌上。') },
      { who: 'ogi', emo: 'resolve', think: true, text: Z('可是今晚，我要的是他剩下的全部家产。') },
      { show: 'akagi19', at: 'center', face: 'calm' },
      { text: Z('一个白发的青年，双手插在口袋里，站在灯光照不到的地方。') },
      { text: Z('十九岁。赤木茂。') },
      { text: Z('在这个国家的地下世界，这个名字早已成了一个传说。') },
      { who: 'washizu', emo: 'mock', text: Z('哼……就是这个小鬼？看着一阵风就能吹倒。') },
      { who: 'akagi19', emo: 'flat', text: Z('规矩是什么。说吧。') },

      /* ------------------------------------------------ the rules */
      { hide: 'all' },
      { table: T_RULES },
      { text: Z('桌上的麻将牌，是玻璃做的。') },
      { text: Z('同一种牌有四张：三张透明，只有一张是普通的、看不透的牌。对手手里的牌，大半都看得一清二楚。') },
      { text: Z('没有牌山。四个人都戴着黑手套，轮流把手伸进桌子中央的洞里摸牌。') },
      { text: Z('二对二。赤木和他的搭档安冈，对鹫巢和他的部下铃木。搭档之间，可以互相喂牌。') },
      { who: 'yasuoka', emo: 'sly', text: Z('好久不见啊，赤木。') },
      { text: Z('安冈——当年那个在暴雨夜里找上门来的刑警。如今，他是赤木在牌桌上的搭档。') },
      { text: Z('坐在鹫巢下家的，是一个穿白西装、戴深色眼镜的男人。鹫巢的部下，铃木。') },
      { who: 'suzuki', emo: 'flat', text: Z('……请多指教。') },
      { table: false },
      { bg: 'blood' },
      { rack: 0 },
      { text: Z('赌注，只算在赤木和鹫巢两个人之间。') },
      { text: Z('鹫巢赌的是钱。赤木赌的，是血。') },
      { text: Z('鹫巢自摸，或者直接和赤木打出的牌——赤木输给他多少点，就当场从手臂上抽多少血。') },
      { rack: 500, text: Z('一根量筒，五百cc。') },
      { rack: 1500, text: Z('抽到一千五百cc，三根全满，人就进入危险区。') },
      { rack: 2000, text: Z('四根全满，两千cc——必死无疑。') },
      { rack: 0, text: Z('一共打六个半庄。每个半庄结束时，两人还要按点差和名次再结算一次。') },
      { rack: false },

      /* ------------------------------------------------ the stakes */
      { label: 'stakes' },
      { stakes: false },
      { rack: false },
      { bg: 'washizu' },
      { show: 'washizu', at: 'right', face: 'sneer' },
      { show: 'akagi19', at: 'center', face: 'calm' },
      { show: 'ogi', at: 'left', face: 'calm' },
      { who: 'washizu', emo: 'smug', text: Z('你的两千cc血，对我的两千万日元。') },
      { who: 'washizu', emo: 'smug', text: Z('按二十万点换算——你要输掉整整二十万点，才会被抽干。怎么样？够宽厚吧。') },
      { who: 'ogi', emo: 'worried', face: 'tense', think: true, text: Z('二十万点……打上一整夜也未必输得掉。对赤木来说，这已经是能活着走出去的条件了。') },
      { who: 'ogi', emo: 'gloomy', think: true, text: Z('可是这样一来，就算赢上一整夜，也碰不到老怪物的五亿……') },
      { text: Z('赤木低头看着桌上透明的牌，很久没有说话。') },
      { choice: [
        { text: Z('“好。就按你说的来。”'), goto: 'stakes_safe' },
        { text: Z('“把位数改一改。”'), goto: 'stakes_raise' },
      ] },

      /* ---- ending: safe and sound */
      { label: 'stakes_safe' },
      { who: 'akagi19', emo: 'flat', text: Z('好。就按你说的来。') },
      { who: 'washizu', emo: 'mock', text: Z('……哼。原来也是个惜命的。') },
      { hide: 'all' },
      { bg: 'black' },
      { text: Z('牌局不温不火地进行着。') },
      { text: Z('赤木打得很稳。他赢了，又赢了。量筒里的血，始终没有涨过一格。') },
      { text: Z('天亮的时候，鹫巢让人送来了两千万日元。对他来说，不过是零钱。') },
      { bg: 'mansion' },
      { show: 'ogi', at: 'left', face: 'tense' },
      { who: 'ogi', emo: 'gloomy', text: Z('……就这样？我们就带着这点钱回去？') },
      { show: 'akagi19', at: 'center', face: 'calm' },
      { who: 'akagi19', emo: 'gloomy', text: Z('嗯。就这样。') },
      { who: 'akagi19', emo: 'cold', think: true, text: Z('不赌命的赌博，算什么赌博。') },
      { hide: 'all' },
      { text: Z('那一夜之后，再也没有人提起那个白发青年的名字。') },
      { text: Z('鹫巢巌又活了很多年，又买来了很多年轻人的血。') },
      { bg: 'black' },
      { card: Z('结局·安然无恙'), sub: Z('平平安安地活下来——赤木茂，从来不是为了这个上桌的。') },
      AGAIN('stakes'),

      /* ---- "change the digits" */
      { label: 'stakes_raise' },
      { show: 'akagi19', face: 'smirk' },
      { who: 'akagi19', emo: 'smirk', text: Z('把位数改一改吧。') },
      { who: 'washizu', emo: 'wary', text: Z('……什么？') },
      { who: 'akagi19', emo: 'cold', text: Z('二十万点太多了。去掉一个零——两万点。一千点，就是一百cc。') },
      { who: 'akagi19', emo: 'cold', text: Z('你那边也一样：一千点，一百万日元。') },
      { fx: 'zawa' },
      { show: 'ogi', face: 'shock' },
      { who: 'ogi', emo: 'shock', think: true, text: Z('他疯了吗？！自己的命，一下子贱卖了十倍——输两万点，就是死！') },
      { who: 'akagi19', emo: 'smirk', text: Z('照你的价码，我赢上一整夜，也只能拿走你的零头。照我的——五十万点，就是你的全部家产。') },
      { show: 'washizu', face: 'rage' },
      { who: 'washizu', emo: 'irritated', text: Z('小鬼……你以为我付不起？') },
      { show: 'ogi', face: 'calm' },
      { who: 'ogi', emo: 'resolve', text: Z('鹫巢先生。这些年为了收拾那些尸体，您花了多少钱，我心里有数。') },
      { who: 'ogi', emo: 'cold', text: Z('您手里剩下的，正好是五亿。') },
      { who: 'washizu', emo: 'threat', text: Z('仰木……！') },
      { who: 'washizu', emo: 'menace', text: Z('好。那你也押上点什么——你的一条胳膊。这小鬼要是死在桌上，你的胳膊就归我。') },
      { who: 'washizu', emo: 'command', text: Z('还有：打完两个半庄之后，要不要继续，由我一个人说了算。') },
      { show: 'ogi', face: 'tense' },
      { who: 'ogi', emo: 'worried', think: true, text: Z('一条胳膊……还有中途喊停的权利……') },
      { who: 'ogi', emo: 'resolve', text: Z('……好。我答应。') },
      { show: 'akagi19', face: 'glare' },
      { who: 'akagi19', emo: 'cold', text: Z('那个权利，会变成你的坟墓。') },
      { show: 'washizu', face: 'manic' },
      { who: 'washizu', emo: 'mock', text: Z('哈哈哈哈！好！我会一滴一滴地，把你的血全部抽干！') },
      { stakes: LEDGER.start, text: Z('两千cc的血，对五亿日元。从这一刻起，它们被摆上了同一张牌桌。') },
      { hide: 'all' },
      { bg: 'black' },
      { card: Z('第一个半庄') },

      /* ------------------------------------------------ East 3: the riichi and the feed */
      { bg: 'washizu' },
      { table: T_FEED },
      { text: Z('东三局，第六巡。') },
      { focus: { seat: 2, opaque: true }, who: 'ogi', emo: 'worried', think: true, text: Z('鹫巢手里看不透的牌，有五张之多……这样根本读不出他在等什么。') },
      { move: [{ seat: 2, draw: '4s', opaque: true }, { seat: 2, discard: '9p', riichi: true }] },
      { who: 'washizu', emo: 'menace', text: Z('立直。') },
      { focus: { seat: 3, hand: '5s' }, text: Z('下一巡。铃木一言不发，从手里抽出了一张五索。') },
      { move: [{ seat: 3, draw: '4z' }, { seat: 3, discard: '5s' }, { seat: 2, ron: '5s', from: 3 }] },
      { fx: 'zawa' },
      { who: 'washizu', emo: 'smug', text: Z('荣！立直一发，断幺，宝牌二——满贯！') },
      { who: 'ogi', emo: 'worried', think: true, text: Z('立直之后，搭档马上喂牌……这就是二对二。只要鹫巢一听牌，铃木随时都能把和牌送到他手里。') },
      { who: 'akagi19', emo: 'cold', think: true, text: Z('铃木放的铳，抽不到我的血。可照这样和下去，他的点数只会越来越高。') },
      { who: 'akagi19', emo: 'cold', think: true, text: Z('立直，然后喂牌——这套把戏只有一个破绽。立直的那张牌，得先打得出来才行。') },

      /* ------------------------------------------------ East 4: the second river, and the first blood */
      { table: T_RIVER2 },
      { text: Z('东四局，赤木坐庄。这一次，鹫巢没有立直。') },
      { focus: { seat: 2, hand: '6p6s' }, who: 'ogi', emo: 'worried', think: true, text: Z('宝牌是六索。鹫巢手里浮着一张六索、一张六筒——四七索、五八索、四七筒、五八筒，哪一张都可能放铳……') },
      { who: 'akagi19', emo: 'cold', think: true, text: Z('鹫巢已经听牌了。可他没有立直。') },
      { focus: { seat: 3, hand: '7s8s5p' }, who: 'akagi19', emo: 'cold', think: true, text: Z('因为铃木手里，没有他要的牌。有的话，他早就立直，让铃木喂了。') },
      { focus: { seat: 3, hand: '7s8s5p' }, who: 'akagi19', emo: 'smirk', think: true, text: Z('也就是说——铃木那手透明的牌，就是第二条牌河。他拿着的牌，全都是安全的。') },
      { move: [{ seat: 0, draw: '5s' }, { seat: 0, discard: '7s' }] },
      { who: 'ogi', emo: 'shock', think: true, text: Z('七索？！紧挨着宝牌的牌，他连想都不想就打了？') },
      { move: [].concat(pass(1, '5z'), pass(2, '1p'), pass(3, '7z'), [{ seat: 0, draw: '6s' }, { seat: 0, discard: '8s' }]) },
      { text: Z('八索，也通过了。赤木听牌——五八万。') },
      { move: [].concat(pass(1, '2s'), pass(2, '9m'), pass(3, '6z'), pass(0, '5p')) },
      { text: Z('摸到五筒，照打不误。又通过了。') },
      { who: 'washizu', emo: 'wary', think: true, text: Z('这小鬼……把铃木的手牌当成牌河来读？他就不怕，这是我布下的饵？') },
      { move: [].concat(pass(1, '4z'), [{ seat: 2, draw: '7p' }, { seat: 2, tsumo: '7p' }]) },
      { who: 'washizu', emo: 'smug', text: Z('自摸。断幺，平和，宝牌二——满贯。') },
      { text: Z('赤木读得一张不差。输掉的，只是摸牌的先后。庄家赤木，要付四千点。') },
      { table: false },
      { bg: 'blood' },
      { rack: true },
      { text: Z('第一次抽血。针头，扎进了赤木的手臂。') },
      { bleed: 400 },
      { text: Z('四百cc。第一根量筒，眼看就要满了。') },
      { who: 'washizu', emo: 'joy', text: Z('好颜色……年轻人的血，就是好看。') },
      { who: 'akagi19', emo: 'flat', text: Z('……下一局。') },

      /* ------------------------------------------------ South 1: the ambush */
      { label: 'ambush' },
      { stakes: LEDGER.ambush },
      { rack: false },
      { table: false },
      { hide: 'all' },
      { bg: 'washizu' },
      { text: Z('南一局。赤木二万六千点，鹫巢四万点。') },
      { battle: 'ambush', win: 'ambush_win', lose: 'ambush_lose', skip: 'ambush_skip' },

      { label: 'ambush_lose' },
      { bg: 'washizu' },
      { show: 'washizu', at: 'right', face: 'manic' },
      { who: 'washizu', emo: 'smug', text: Z('立直一发，平和，断幺，三色——跳满！') },
      { show: 'ogi', at: 'left', face: 'shock' },
      { who: 'ogi', emo: 'afraid', think: true, text: Z('差距一下子拉开到了两万六……半庄结束时还落在鹫巢后面的话，一结算，赤木的血会被一口气抽干。') },
      { hide: 'all' },
      { text: Z('——但那一局，并不是这样打的。') },
      { choice: [
        { text: Z('回到那一局'), goto: 'ambush' },
        { text: Z('跳过，按原作的走向看下去'), goto: 'ambush_skip' },
        { text: Z('返回标题画面'), goto: 'quit' },
      ] },
      { label: 'ambush_skip' },
      { pay: 2600000 },

      { label: 'ambush_win' },
      { bg: 'washizu' },
      { fx: 'zawa' },
      { text: Z('鹫巢横着放下的那张五万，还没有离开他的指尖——') },
      { show: 'akagi19', at: 'center', face: 'smirk' },
      { who: 'akagi19', emo: 'flat', text: Z('荣。') },
      { show: 'ogi', at: 'left', face: 'shock' },
      { who: 'ogi', emo: 'shock', think: true, text: Z('五万单吊……他拆掉了五面听，就为了等这一张？！') },
      { who: 'ogi', emo: 'shock', think: true, text: Z('鹫巢一立直，铃木就会把二索喂过去。一发、三色、跳满——那样的话，差距就再也追不回来了。') },
      { who: 'ogi', emo: 'afraid', think: true, text: Z('所以他抢在立直成立之前，截下了宣言立直的那张牌……') },
      { show: 'washizu', at: 'right', face: 'manic' },
      { text: Z('鹫巢愣了一下。然后，他笑了。') },
      { who: 'washizu', emo: 'joy', text: Z('哈……哈哈哈哈！好！就是要这样！') },
      { who: 'washizu', emo: 'menace', text: Z('挣扎吧，小鬼！再多挣扎一点！越是拼命挣扎的猎物，吃起来才越香！') },

      /* ------------------------------------------------ South 2: the 8p he lets go by */
      { hide: 'all' },
      { table: T_PASS },
      { text: Z('南二局，鹫巢坐庄。赤木二万八千六，鹫巢三万七千四——差八千八。') },
      { focus: { seat: 0, hand: '6p7p' }, who: 'akagi19', emo: 'cold', think: true, text: Z('中，西，宝牌二。听五八筒。') },
      { move: { seat: 1, draw: '8p', focus: { seat: 1, hand: '8p' } } },
      { who: 'yasuoka', emo: 'hope', think: true, text: Z('八筒！这张打过去就是满贯，八千点——鹫巢的庄也就断了！') },
      { move: { seat: 1, discard: '8p' } },
      { text: Z('赤木没有倒牌。') },
      { who: 'ogi', emo: 'shock', think: true, text: Z('为什么不和？！') },
      { who: 'akagi19', emo: 'cold', think: true, text: Z('和安冈的八千点，还差八百。要翻过去，得让坐庄的鹫巢自己掏四千——只有自摸。') },
      { focus: { seat: 0, hand: '3s4s5s' }, who: 'akagi19', emo: 'smirk', think: true, text: Z('而且，八筒我没有和。在鹫巢眼里，我手里那张看不透的牌，就不会是索子——他会认定，我等的是二五索。') },
      { move: { seat: 2, draw: '9p', focus: { seat: 2, hand: '5s' } } },
      { who: 'washizu', emo: 'irritated', think: true, text: Z('打掉五索就听牌，铃木马上就能喂……可这张五索，偏偏是那小鬼的铳牌！') },
      { move: { seat: 2, discard: '8s' } },
      { text: Z('鹫巢拆掉了自己的牌。一张根本不存在的危险牌，把他的手整个冻住了。') },
      { move: [].concat(pass(3, '3z'), pass(0, '9s'), pass(1, '5m'), pass(2, '1z'), pass(3, '4z'), [{ seat: 0, draw: '8p' }, { seat: 0, tsumo: '8p' }]) },
      { who: 'akagi19', emo: 'smirk', text: Z('自摸。中，西，宝牌二——满贯。') },
      { pay: 4000000, text: Z('庄家鹫巢付四千点——四百万日元，当场点清。赤木反超三千二。') },

      /* ------------------------------------------------ South 3: he sees it, and loses anyway */
      { table: false },
      { bg: 'blood' },
      { rack: true },
      { text: Z('南三局。赤木摸到一张牌：只要打出手里浮着的那张一筒，就是三面听。') },
      { who: 'akagi19', emo: 'cold', think: true, text: Z('鹫巢等的，就是这张一筒。') },
      { text: Z('赤木没有打一筒，拆掉了听牌。他读对了——可鹫巢随即改听立直，一发自摸。') },
      { who: 'washizu', emo: 'mock', text: Z('看穿了又怎么样？看穿了，也照样会输。这就是麻将！') },
      { bleed: 200 },
      { text: Z('又是两百cc。六百——第一根量筒满了，第二根也见了红。') },
      { rack: false },

      /* ------------------------------------------------ South 4: three pons on a hand that is not ready */
      { bg: 'washizu' },
      { table: T_LAST },
      { text: Z('南四局，最后一局。赤木三万四千六，鹫巢四万一千四——差六千八。这一局和不了，半庄一结算，赤木就死。') },
      { focus: { seat: 0, hand: '1m1z7z' }, who: 'ogi', emo: 'worried', think: true, text: Z('东、中、一万，三副对子。安冈手里正好各有一张，想碰随时能碰……可他为什么一直不动？') },
      { focus: { seat: 2, river: '4m' }, text: Z('这时，鹫巢打出了一张四万。') },
      { who: 'akagi19', emo: 'cold', think: true, text: Z('就是现在。') },
      { move: [{ seat: 1, draw: '9p' }, { seat: 1, discard: '1z' }, { seat: 0, pon: '1z', from: 1 }, { seat: 0, discard: '3z', opaque: true }] },
      { move: [{ seat: 1, draw: '2z' }, { seat: 1, discard: '7z' }, { seat: 0, pon: '7z', from: 1 }, { seat: 0, discard: '4z', opaque: true }] },
      { move: [{ seat: 1, draw: '5z' }, { seat: 1, discard: '1m' }, { seat: 0, pon: '1m', from: 1 }, { seat: 0, discard: '4s' }] },
      { fx: 'zawa' },
      { text: Z('碰，碰，碰。转眼之间，赤木亮出了三副牌。') },
      { focus: { seat: 2, hand: '6m' }, who: 'washizu', emo: 'wary', think: true, text: Z('三副露，手里剩下的全是万子……混一色，听牌了？我这张六万——') },
      { focus: { seat: 2, hand: '6m' }, who: 'akagi19', emo: 'cold', think: true, text: Z('他先打了四万，手里就只剩一张六万。我等的就是这个：现在这张六万，在他眼里是全场最危险的牌。') },
      { move: [].concat(pass(1, '4m'), [{ seat: 2, draw: '8s', focus: { seat: 2, hand: '6m' } }]) },
      { text: Z('鹫巢摸进八索。打掉六万，他就听四七筒——铃木手里的七筒，马上就会喂过来。') },
      { text: Z('鹫巢捏起了六万。……又放了回去。') },
      { move: { seat: 2, discard: '6p' } },
      { focus: { seat: 0, hand: '6m7m4p' }, who: 'akagi19', emo: 'smirk', think: true, text: Z('其实我根本没有听牌。六万，七万，还有一张谁也看不透的四筒——离听牌，还差着一张。') },
      { who: 'ogi', emo: 'afraid', think: true, text: Z('没听牌的虚张声势……鹫巢要是不信邪，打出那张六万，赤木当场就死了！') },
      { move: [].concat(pass(3, '8m'), [{ seat: 0, draw: '3p', focus: { seat: 0, hand: '3p' } }]) },
      { move: { seat: 0, discard: '7m' } },
      { text: Z('赤木摸进三筒，打出七万。三筒，加上那张看不透的四筒——听二五筒。') },
      { who: 'washizu', emo: 'wary', think: true, text: Z('打七万？那刚才果然没听牌。现在呢……二五筒？试一试就知道了。') },
      { move: [].concat(pass(1, '3m'), pass(2, '9m'), [{ seat: 3, draw: '6s' }, { seat: 3, discard: '5p' }]) },
      { text: Z('铃木打出了五筒。替鹫巢“试毒”的一张。') },
      { who: 'ogi', emo: 'urgent', think: true, text: Z('是和牌！和了就能连庄，就能活下去——') },
      { text: Z('赤木纹丝不动。') },
      { who: 'akagi19', emo: 'cold', think: true, text: Z('和铃木，只有三千九，还差两千九。能翻盘的，只有鹫巢自己打出来的那一张。') },
      { who: 'akagi19', emo: 'cold', think: true, text: Z('五筒过了，他就会相信五筒是安全的。') },
      { move: [].concat(pass(0, '4z'), pass(1, '5s'), [{ seat: 2, draw: '7m', focus: { seat: 2, hand: '5p' } }]) },
      { who: 'washizu', emo: 'smug', think: true, text: Z('七万！打掉五筒，就是五八万听牌。五筒刚才已经通过了——能赢我的人，根本不存在！') },
      { move: [{ seat: 2, discard: '5p' }, { seat: 0, ron: '5p', from: 2 }] },
      { who: 'akagi19', emo: 'flat', text: Z('荣。') },
      { pay: 3900000, text: Z('东、中，三千九百点，直击。赤木以一千点之差，拿下了第一个半庄。') },
      { who: 'washizu', emo: 'shock', think: true, text: Z('放过了能保命的那一张……这小鬼，不想活了吗？') },

      /* ------------------------------------------------ the transfusion */
      { label: 'settle' },
      { table: false },
      { hide: 'all' },
      { bg: 'blood' },
      { rack: true },
      { stakes: LEDGER.first, tween: true, text: Z('结算。这一个半庄，赤木从鹫巢手里赢走了五千二百五十万日元。') },
      { text: Z('黑衣的男人们按规矩备好了针管：从奖金里扣下六百万，就能把抽走的六百cc血补回去。') },
      { who: 'ogi', emo: 'urgent', face: 'tense', text: Z('快补上吧，赤木。带着六百cc的亏空进下一个半庄，被鹫巢直击一次满贯，就是一千四百cc了！') },
      { choice: [
        { text: Z('补回六百cc'), goto: 'transfuse' },
        { text: Z('“多余。全部换成钱。”'), goto: 'refuse' },
      ] },

      /* ---- ending: so close */
      { label: 'transfuse' },
      { who: 'akagi19', emo: 'flat', text: Z('……也好。补上吧。') },
      { who: 'ogi', emo: 'relief', face: 'calm', text: Z('这就对了。') },
      { transfuse: 600, cost: 6000000 },
      { text: Z('六百cc的血，又流回了赤木的身体。量筒空了。') },
      { text: Z('第二个半庄，赤木打得滴水不漏。量筒里的血，再也没有涨到危险的地方。') },
      { rack: false },
      { bg: 'washizu' },
      { show: 'washizu', at: 'right', face: 'sneer' },
      { text: Z('第二个半庄结束。鹫巢靠在椅背上，盯着那个空空的量筒，看了很久。') },
      { who: 'washizu', emo: 'cold', text: Z('……没意思。') },
      { who: 'washizu', emo: 'command', text: Z('今晚到此为止。') },
      { show: 'ogi', at: 'left', face: 'shock' },
      { who: 'ogi', emo: 'shock', text: Z('什……！还有四个半庄——') },
      { who: 'washizu', emo: 'smug', text: Z('两个半庄之后要不要继续，由我说了算。这是你亲口答应的，仰木。') },
      { who: 'washizu', emo: 'mock', text: Z('离死还远着的猎物，我没兴趣陪他玩。') },
      { show: 'akagi19', at: 'center', face: 'calm' },
      { who: 'akagi19', emo: 'gloomy', think: true, text: Z('……是我亲手给了他停下来的理由。') },
      { who: 'akagi19', emo: 'cold', think: true, text: Z('要让他一直觉得“再推一把就能杀死我”。只有这份希望，才能把那个老怪物钉在桌子上。') },
      { hide: 'all' },
      { bg: 'mansion' },
      { text: Z('雨停了。几千万日元装在箱子里，五亿的大门在他们身后关上了。') },
      { bg: 'black' },
      { card: Z('结局·功亏一篑'), sub: Z('堆到九仞高的山，只差最后一筐土。——活得太安稳的猎物，留不住猎人。') },
      AGAIN('settle'),

      /* ---- "all of it in cash" */
      { label: 'refuse' },
      { who: 'akagi19', emo: 'cold', face: 'glare', text: Z('多余。全部换成钱。') },
      { who: 'ogi', emo: 'shock', face: 'shock', text: Z('你说什么？！') },
      { who: 'yasuoka', emo: 'alarm', face: 'suspicious', text: Z('赤木，你脑子没坏吧？那可是你自己的血！') },
      { who: 'akagi19', emo: 'cold', text: Z('鹫巢那家伙，得一直觉得“再推一把就能杀死我”才行。') },
      { who: 'akagi19', emo: 'cold', text: Z('只要这份希望还在，他就会一直坐在桌前，一直输钱。') },
      { who: 'akagi19', emo: 'smirk', face: 'smirk', text: Z('轻易就会死——这样才刚好。') },

      /* ------------------------------------------------ the second hanchan */
      { rack: false },
      { hide: 'all' },
      { bg: 'black' },
      { card: Z('第二个半庄') },
      { bg: 'blood' },
      { rack: true },
      { text: Z('东场，鹫巢大杀四方。自摸，再自摸。') },
      { bleed: 500 },
      { text: Z('一千一百cc——已经超过了致死量的一半。') },
      { pay: 12000000, text: Z('南一局，赤木终于跳满直击了鹫巢：一千二百万日元。这笔钱，足够把抽走的血全部买回来。') },
      { who: 'akagi19', emo: 'flat', face: 'calm', text: Z('不要。') },
      { who: 'akagi19', emo: 'cold', text: Z('现在要的是钱。只有这样，才能杀死鹫巢。') },
      { rack: false },

      /* ---- the last hand: a riichi nobody would declare */
      { bg: 'washizu' },
      { table: T_SWITCH },
      { text: Z('第二个半庄，最后一局。鹫巢落后九千二百点。') },
      { text: Z('宝牌是西风——正好是鹫巢的自风。他已经碰了发财和一筒，吃了七八九筒。') },
      { focus: { seat: 2, hand: '1m3m3z', opaque: true }, who: 'ogi', emo: 'worried', think: true, text: Z('他手里剩下一万、三万，和一对西风——嵌二万。自摸，或者直击赤木，就翻盘了。') },
      { focus: { seat: 0, hand: '1m3m' }, text: Z('赤木也听牌了。等的是同一张：嵌二万。') },
      { move: { seat: 0, draw: '5p', focus: { seat: 0, hand: '5p' } } },
      { text: Z('这时，赤木摸进了一张五筒。') },
      { who: 'ogi', emo: 'teach', think: true, text: Z('打五筒，还是嵌二万。打三万，是一四七万的三面听。不管选哪个，都该默听才对——') },
      { move: { seat: 0, discard: '1m', riichi: true } },
      { who: 'akagi19', emo: 'flat', text: Z('立直。') },
      { focus: { seat: 0, hand: '3m6m' }, text: Z('打一万，立直。听的是三六万——所有选择里，最让人想不到的一种。') },
      { who: 'ogi', emo: 'shock', think: true, text: Z('立直？！这一根立直棒，等于把鹫巢翻盘的门槛降到了满贯——铃木喂一张就够了！') },
      { who: 'washizu', emo: 'smug', think: true, text: Z('小鬼急了。满贯就够的话——碰铃木的西风，发、西、宝牌三。剩下的单吊，让铃木喂。') },
      { move: [].concat(pass(1, '7m'), pass(2, '6p'), [{ seat: 3, draw: '5z' }, { seat: 3, discard: '3z' }, { seat: 2, pon: '3z', from: 3 }]) },
      { text: Z('铃木打出西风。鹫巢，碰。') },
      { focus: [{ seat: 0, river: '1m' }, { seat: 2, hand: '1m3m' }], who: 'washizu', emo: 'smug', think: true, text: Z('手里剩一万和三万。一万是那小鬼立直时自己打过的牌，绝对安全——打一万，单吊三万。铃木手里，正好有三万。') },
      { move: { seat: 2, discard: '1m' } },
      { who: 'akagi19', emo: 'cold', think: true, text: Z('我先打一万，他就会放心地打一万，留下三万。') },
      { who: 'akagi19', emo: 'cold', think: true, text: Z('要是我听的是一四七万，他这张一万就放铳了。所以他绝不会想到——我等的，是三六万。') },
      { focus: { seat: 3, hand: '3m' }, text: Z('铃木的手，伸向了三万。') },
      { move: [{ seat: 3, draw: '7s' }, { seat: 3, discard: '3m' }] },
      { who: 'washizu', emo: 'joy', text: Z('荣——') },
      { move: { seat: 0, ron: '3m', from: 3 } },
      { who: 'akagi19', emo: 'smirk', text: Z('荣。……可惜了。') },
      { text: Z('同一张牌有两个人要和的时候，只算按顺序离打牌的人最近的那一家——这叫截和。从铃木数起，赤木在鹫巢前面。') },
      { text: Z('喂给鹫巢的那张三万，被赤木截了下来。立直，两千点——第二个半庄，到此为止。') },
      { who: 'washizu', emo: 'irritated', text: Z('你……你这小鬼——！') },
      { who: 'akagi19', emo: 'cold', text: Z('看得见的人，也可以挑着给别人看。') },
      { stakes: LEDGER.second, tween: true, text: Z('第二个半庄结算：六千六百万日元。两个半庄下来，鹫巢已经输掉了一亿一千八百五十万。') },

      /* ------------------------------------------------ the third hanchan: the 1p trap */
      { table: false },
      { hide: 'all' },
      { bg: 'black' },
      { card: Z('第三个半庄'), sub: Z('东二局') },
      { label: 'trap' },
      { stakes: LEDGER.second },
      { rack: false },
      { bg: 'washizu' },
      { table: T_TRAP1 },
      { text: Z('东二局，鹫巢坐庄。') },
      { focus: { seat: 2, hand: '2s' }, text: Z('铃木开了一个杠。翻出来的新宝牌指示牌是一索——鹫巢手里的三张二索，一下子成了宝牌三。') },
      { who: 'washizu', emo: 'menace', text: Z('立直。') },
      { text: Z('庄家立直，宝牌三。被直击就是一万二千点——一千二百cc。') },
      { text: Z('赤木身上已经抽走了一千一百cc。一千一百，加一千二百……') },
      { who: 'ogi', emo: 'afraid', think: true, text: Z('两千三百cc。放铳，就是死。') },
      { focus: { seat: 2, opaque: true }, text: Z('鹫巢透明的手牌里，四组面子清清楚楚。看不透的，只有一张——那就是他单吊的牌。') },
      { focus: { seat: 0, hand: '1p' }, who: 'akagi19', emo: 'cold', think: true, text: Z('打一筒，就能听牌。') },
      { focus: { seat: 3, hand: '1p' }, who: 'ogi', emo: 'hope', think: true, text: Z('铃木手里有一筒。鹫巢立直之后，他一向是马上喂牌的——可他一直没打。') },
      { focus: { seat: 3, hand: '1p' }, who: 'ogi', emo: 'hope', think: true, text: Z('也就是说，一筒不是鹫巢要的牌。第二条牌河，是这么说的。') },
      { decide: {
        title: Z('鹫巢的立直：单吊一张看不透的牌'),
        flag: 'trap',
        apply: true,
        notes: {
          '1p': [
            { who: 'ogi', emo: 'hope', face: 'calm', text: Z('一筒，铃木手里有，却没有喂——第二条牌河说它是安全的。打了还能听牌。') },
            { who: 'akagi19', emo: 'cold', face: 'calm', think: true, text: Z('第二条牌河……教会我们读它的，是谁？') },
          ],
          '*': [
            { who: 'akagi19', emo: 'cold', face: 'glare', think: true, text: Z('鹫巢立直之后，铃木一张牌都没有喂过。一次都没有。') },
            { who: 'akagi19', emo: 'cold', face: 'glare', think: true, text: Z('不是不能喂。是鹫巢不让他喂。') },
          ],
        },
        options: [
          { id: 'deal', tiles: '1p', goto: 'trap_dead' },
          { id: 'hold', tiles: '*', goto: 'trap_hold' },
        ],
      } },

      /* ---- ending: into the net */
      { label: 'trap_dead' },
      { text: Z('一筒离开了赤木的手指。') },
      { move: { seat: 2, ron: '1p', from: 0 } },
      { who: 'washizu', emo: 'joy', text: Z('荣——！！') },
      { fx: 'zawa' },
      { text: Z('鹫巢推倒了手牌。那张看不透的牌翻了过来——是一筒。') },
      { who: 'washizu', emo: 'mock', text: Z('哈哈哈哈！是我不让铃木喂的！就是要让你们以为，一筒是安全的！') },
      { who: 'washizu', emo: 'menace', text: Z('第二条牌河？那是我教给你们读的东西。教的人，当然知道怎么拿它骗人！') },
      { table: false },
      { hide: 'all' },
      { bg: 'blood' },
      { rack: true },
      { text: Z('庄家立直，宝牌三。一万二千点——一千二百cc。') },
      { bleed: 1200 },
      { rack: false },
      { bg: 'black' },
      { text: Z('赤木茂，十九岁。死在了一张他以为自己看透了的牌上。') },
      { card: Z('结局·自投罗网'), sub: Z('自己钻进别人张好的网里。——看得见的牌，也会说谎。') },
      AGAIN('trap'),

      /* ---- he keeps the 1p */
      { label: 'trap_hold' },
      { text: Z('赤木把一筒留在了手里，拆掉了听牌。') },
      { who: 'washizu', emo: 'irritated', think: true, text: Z('……没上钩？') },
      { move: [{ seat: 1, draw: '7z' }, { seat: 1, discard: '4p' }].concat(pass(2, '7m'), [{ seat: 3, draw: '8s', focus: { seat: 3, hand: '8s' } }]) },
      { move: [{ seat: 3, kan: '8s' }, { dora: '1s' }] },
      { focus: { seat: 2, hand: '2s' }, text: Z('铃木又开了一个杠。翻出来的宝牌指示牌——又是一索。鹫巢的三张二索，变成了宝牌六。') },
      { move: pass(3, '9m') },
      { focus: { seat: 3, hand: '1p' }, text: Z('铃木的手指，碰了碰那张一筒。') },
      { who: 'washizu', emo: 'threat', text: Z('不准喂！') },
      { who: 'washizu', emo: 'menace', text: Z('从别人那里捡来的和牌，有什么意思？我要自己摸！我要亲眼看着这小鬼发抖！') },
      { table: T_KAN2 },
      { text: Z('两巡之后。鹫巢的手，从桌子中央的洞里抽了出来——') },
      { move: { seat: 2, draw: '2s', focus: { seat: 2, hand: '2s' } } },
      { text: Z('第四张二索。') },
      { who: 'washizu', emo: 'joy', text: Z('杠！') },
      { move: [{ seat: 2, kan: '2s' }, { dora: '1s' }] },
      { fx: 'thunder' },
      { move: pass(2, '4m') },
      { text: Z('岭上牌，不是一筒。可新翻开的宝牌指示牌——还是一索。') },
      { text: Z('四张二索，乘以三张一索指示牌。宝牌十二。') },
      { text: Z('立直加宝牌十二，数役满。庄家役满——自摸的话，每家一万六千点。') },
      { who: 'ogi', emo: 'afraid', think: true, text: Z('一千六百cc……加上已经抽走的一千一百，两千七百。只要他摸到一筒，赤木就死了。') },
      { focus: { seat: 3, hand: '1p' }, who: 'suzuki', emo: 'worried', text: Z('鹫巢大人……请和我的一筒吧。役满，四万八千点，这个半庄就定了。') },
      { who: 'washizu', emo: 'irritated', text: Z('闭嘴！') },
      { who: 'washizu', emo: 'menace', text: Z('要杀一个疯子，就得比他更疯。我要自摸。我要用这只手，把他的血抽干！') },
      { move: [].concat(pass(3, '6p'), pass(0, '1m'), [{ seat: 1, draw: '1p', focus: { seat: 1, hand: '1p' } }]) },
      { text: Z('然后，安冈摸到了最后一张一筒。') },
      { focus: [{ seat: 0, hand: '1p' }, { seat: 1, hand: '1p' }, { seat: 3, hand: '1p' }, { seat: 2, opaque: true }],
        who: 'yasuoka', emo: 'wary', think: true, text: Z('一筒……四张里的最后一张。洞里，再也没有一筒了。') },
      { who: 'yasuoka', emo: 'resolve', think: true, text: Z('鹫巢自摸不了了。可只要轮到铃木，他就会把一筒喂出去——这回，鹫巢一定会和。') },
      { move: [{ seat: 1, discard: '6z' }, { seat: 0, pon: '6z', from: 1 }] },
      { text: Z('安冈打出发财。赤木：碰。——轮次，跳过了鹫巢和铃木。') },
      { move: [{ seat: 0, discard: '3s' }, { seat: 1, chi: '345s', from: 0 }, { seat: 1, discard: '9s' }, { seat: 0, pon: '9s', from: 1 }] },
      { text: Z('赤木打，安冈吃；安冈打，赤木再碰。鹫巢和铃木，连摸牌的机会都没有。') },

      { label: 'last1p' },
      { stakes: LEDGER.second },
      { rack: false },
      { bg: 'washizu' },
      { table: T_TRAP2 },
      { text: Z('赤木又碰了一手。现在，他必须打出一张牌。') },
      { focus: { seat: 0, hand: '1p' }, text: Z('他的手，停在了那张一筒上。') },
      { focus: { seat: 0, hand: '1p' }, who: 'washizu', emo: 'menace', think: true, text: Z('打啊……打出来啊……！') },
      { who: 'ogi', emo: 'afraid', think: true, text: Z('那是鹫巢的役满牌！打出去，就是四万八千点——四千八百cc！') },
      { focus: { seat: 1, hand: '1p' }, text: Z('安冈透明的手牌里，单吊的也是一筒。') },
      { text: Z('同一张牌有两个人要和的时候，只算按顺序离打牌的人最近的那一家。从赤木数起，下一个是安冈，然后才是鹫巢。') },
      { choice: [
        { text: Z('打出一筒'), goto: 'last1p_cut' },
        { text: Z('扣住一筒，打三万'), goto: 'last1p_hold' },
      ] },

      /* ---- ending: waiting for death */
      { label: 'last1p_hold' },
      { move: { seat: 0, discard: '3m' } },
      { text: Z('赤木打出了三万。') },
      { text: Z('没有人能碰这张牌。连续的鸣牌，在这里断了。') },
      { move: [].concat(pass(1, '2p'), pass(2, '8m')) },
      { text: Z('鹫巢摸牌，打牌。然后——轮到了铃木。') },
      { who: 'washizu', emo: 'cold', text: Z('……一筒，四张全都看得见了啊。') },
      { who: 'washizu', emo: 'command', text: Z('铃木。喂过来。') },
      { who: 'suzuki', emo: 'flat', text: Z('是。') },
      { move: [{ seat: 3, draw: '2z' }, { seat: 3, discard: '1p' }, { seat: 2, ron: '1p', from: 3, limit: 'kazoe' }] },      // riichi and twelve dora: the engine does not score a kan hand
      { fx: 'zawa' },
      { who: 'washizu', emo: 'joy', text: Z('荣！立直，宝牌十二——役满，四万八千点！') },
      { text: Z('放铳的是铃木。赤木一滴血也没有被抽。') },
      { text: Z('可是第三个半庄的胜负，就此定了。') },
      { table: false },
      { hide: 'all' },
      { bg: 'blood' },
      { rack: true },
      { text: Z('半庄结束，结算。鹫巢第一，赤木远远落在后面——点差、首位奖、名次的差额加在一起，远远超过了两万点。') },
      { bleed: 900 },
      { rack: false },
      { bg: 'black' },
      { text: Z('那张一筒，到最后都还握在赤木的手里。') },
      { card: Z('结局·坐以待毙'), sub: Z('坐着等死。——不敢把命押上去的人，最后连命也保不住。') },
      AGAIN('last1p'),

      /* ---- he throws it */
      { label: 'last1p_cut' },
      { move: { seat: 0, discard: '1p' } },
      { text: Z('一筒，落进了牌河。') },
      { who: 'washizu', emo: 'joy', text: Z('荣——！！') },
      { move: { seat: 1, ron: '1p', from: 0 } },
      { who: 'yasuoka', emo: 'resolve', text: Z('荣。') },
      { fx: 'zawa' },
      { text: Z('两个声音几乎同时响起。') },
      { text: Z('安冈推倒了手牌：中，宝牌一。单吊一筒，两千点。') },
      { text: Z('从赤木数起，安冈在鹫巢前面。——截和。') },
      { table: false },
      { show: 'washizu', at: 'right', face: 'rage' },
      { who: 'washizu', emo: 'shock', text: Z('什……什么？！') },
      { text: Z('四万八千点的役满，被两千点的小牌截走了。') },
      { who: 'washizu', emo: 'irritated', text: Z('安冈……你这条狗！') },
      { fx: 'shake', text: Z('鹫巢扑过去，一把揪住了安冈的衣领。') },
      { show: 'akagi19', at: 'center', face: 'glare' },
      { who: 'akagi19', emo: 'cold', text: Z('鹫巢。你的鼻子变钝了。') },
      { who: 'akagi19', emo: 'cold', text: Z('你在害怕。一个怕死的老人，穿着一身用钱做的戏服——不过是一只发了疯的老鼠。') },
      { who: 'washizu', emo: 'threat', text: Z('你说……什么……！') },

      /* ---- East 3: the tile he thinks is safest */
      { hide: 'all' },
      { table: T_WEST },
      { text: Z('东三局。赤木碰了南风，打出三筒——听牌。他等的那张牌，谁也看不透。') },
      { move: { seat: 2, draw: '8s', focus: { seat: 2, hand: '5s3m' } } },
      { who: 'washizu', emo: 'afraid', think: true, text: Z('打五索，或者打三万，我就听牌。可这两张……怎么看，都像那小鬼要的牌。') },
      { focus: { seat: 2, hand: '3z' }, who: 'washizu', emo: 'wary', think: true, text: Z('西风。三张都在我手里，外面只剩一张——最安全的，就是它。') },
      { focus: { seat: 0, hand: '3z' }, who: 'akagi19', emo: 'cold', think: true, text: Z('吓破了胆的人，不敢打显眼的危险牌。他会打一张“自己觉得最安全”的牌。') },
      { focus: { seat: 0, hand: '3z' }, who: 'akagi19', emo: 'smirk', think: true, text: Z('所以，我等的就是那一张。') },
      { move: [{ seat: 2, discard: '3z' }, { seat: 0, ron: '3z', from: 2 }] },
      { who: 'akagi19', emo: 'smirk', text: Z('荣。西风单吊。') },
      { pay: 2000000, who: 'akagi19', emo: 'mock', text: Z('胆子比我想的还小啊。') },

      /* ---- "I am the king" */
      { table: T_KING },
      { text: Z('同一个半庄，南场。') },
      { focus: [{ seat: 0, hand: '5p6p' }], text: Z('赤木手里的五筒、六筒，透过玻璃看得一清二楚。他等的是四七筒——谁都看得出来。') },
      { move: { seat: 2, draw: '8p', focus: { seat: 2, hand: '4p' } } },
      { text: Z('鹫巢只要打出四筒，就听牌。他几次捏起那张四筒，又放下。') },
      { who: 'akagi19', emo: 'mock', text: Z('怕了？') },
      { who: 'akagi19', emo: 'cold', text: Z('你越怕，手就越乱。所以我才打得中。') },
      { who: 'washizu', emo: 'threat', text: Z('害怕？我？') },
      { who: 'washizu', emo: 'menace', text: Z('我是王。王，用不着躲！') },
      { move: [{ seat: 2, discard: '4p' }, { seat: 0, ron: '4p', from: 2 }] },
      { who: 'akagi19', emo: 'flat', text: Z('荣。') },
      { pay: 3900000, text: Z('明知道是铳牌，他还是打了出来。断幺，平和，宝牌一——三千九百点。') },

      /* ------------------------------------------------ the fourth hanchan */
      { table: false },
      { hide: 'all' },
      { bg: 'black' },
      { card: Z('第四个半庄') },
      { bg: 'blood' },
      { rack: true },
      { text: Z('第三个半庄，第四个半庄。鹫巢连一次像样的反击都没有。') },
      { text: Z('赤木一次也没有放铳给他。被抽走的血，全是鹫巢自摸时摊到的那一份。') },
      { bleed: 300 },
      { text: Z('一千四百cc。第三根量筒，眼看就要满了——再往后，就是最后一根。') },
      { stakes: LEDGER.fourth, tween: true, text: Z('四个半庄打完，鹫巢已经输掉了三亿一千三百五十万日元。') },

      /* ------------------------------------------------ the basin */
      { label: 'basin' },
      { stakes: LEDGER.fourth },
      { rack: false },
      { bg: 'washizu' },
      { show: 'washizu', at: 'right', face: 'sneer' },
      { text: Z('鹫巢身后的人，脸色全变了。') },
      { text: Z('照约定，两个半庄之后，鹫巢随时可以喊停。再打下去，老怪物的家产会被赤木一口一口吃光。') },
      { who: 'washizu', emo: 'cold', text: Z('……今晚，就到这里吧。') },
      { show: 'ogi', at: 'left', face: 'calm' },
      { who: 'ogi', emo: 'relief', think: true, text: Z('三亿多……够了，足够了。赤木还活着，我的胳膊也还在。') },
      { show: 'akagi19', at: 'center', face: 'calm' },
      { choice: [
        { text: Z('收下这三亿，起身离开'), goto: 'leave' },
        { text: Z('“还没完。”'), goto: 'pour' },
      ] },

      /* ---- ending: quit while ahead */
      { label: 'leave' },
      { who: 'akagi19', emo: 'flat', text: Z('……是吗。那就到这里吧。') },
      { hide: 'all' },
      { bg: 'mansion' },
      { text: Z('天边泛白的时候，赤木走出了那扇铁门。') },
      { text: Z('三亿日元。对任何一个赌徒来说，这都是一辈子的胜利。') },
      { show: 'ogi', at: 'left', face: 'calm' },
      { who: 'ogi', emo: 'joy', text: Z('赤木，干得漂亮。') },
      { show: 'akagi19', at: 'center', face: 'calm' },
      { text: Z('赤木没有回头。') },
      { who: 'akagi19', emo: 'gloomy', think: true, text: Z('那个老人，还剩最后一口气。我把他留在了那里。') },
      { hide: 'all' },
      { text: Z('几年后，鹫巢巌死在了自己的床上。') },
      { text: Z('人们说，赤木茂从那以后，再也没有遇到过一场像那一夜那样的赌局。') },
      { bg: 'black' },
      { card: Z('结局·见好就收'), sub: Z('看到好处就收手。——那是聪明人的选择，却不是赤木茂的。') },
      AGAIN('basin'),

      /* ---- the blood in the basin */
      { label: 'pour' },
      { show: 'akagi19', face: 'glare' },
      { who: 'akagi19', emo: 'cold', text: Z('还没完。') },
      { hide: 'all' },
      { bg: 'basin' },
      { text: Z('赤木站起来，拿起装着自己的血的量筒——') },
      { text: Z('一根，又一根，全部倒进了一只白色的脸盆里。') },
      { text: Z('然后，他把烟灰缸里的烟头，一个一个丢了进去。') },
      { fx: 'shake' },
      { show: 'washizu', at: 'right', face: 'rage' },
      { who: 'washizu', emo: 'shock', text: Z('你……你在干什么！') },
      { show: 'akagi19', at: 'center', face: 'glare' },
      { who: 'akagi19', emo: 'cold', text: Z('这些血，已经是废物了。') },
      { who: 'akagi19', emo: 'cold', text: Z('被抽走的东西，回不来。死掉的东西——就是零。') },
      { show: 'akagi19', face: 'smirk' },
      { who: 'akagi19', emo: 'smirk', text: Z('你输掉的那三亿，也一样。') },
      { who: 'akagi19', emo: 'cold', text: Z('想拿回来，就只能接着打。') },
      { who: 'washizu', emo: 'irritated', text: Z('……好。那你先给我三百cc，就当是续局的代价。') },
      { who: 'akagi19', emo: 'cold', text: Z('不给。') },
      { who: 'akagi19', emo: 'cold', text: Z('我的命，你得用自己的手来拿。') },
      { hide: 'all' },
      { bg: 'washizu' },
      { stakes: LEDGER.fifth, tween: true, text: Z('鹫巢让人拿来了一只箱子。里面，是他为逃亡准备的最后一亿日元。') },
      { show: 'washizu', at: 'right', face: 'manic' },
      { who: 'washizu', emo: 'menace', text: Z('再抽六百cc。') },
      { who: 'washizu', emo: 'threat', text: Z('两千cc就是死。没有例外。') },
      { who: 'washizu', emo: 'menace', text: Z('开始吧——赤木茂。') },
      { hide: 'all' },
      { bg: 'black' },
      { card: Z('第五个半庄') },

      /* ------------------------------------------------ the fifth hanchan */
      { label: 'final' },
      { stakes: LEDGER.fifth },
      { battle: 'resolve', win: 'final_win', lose: 'final_lose', skip: 'final_win' },

      { label: 'final_lose' },
      { bg: 'blood' },
      { text: Z('量筒里的血，一格一格地涨上去——') },
      { text: Z('——但传说，并不是这样写的。') },
      { choice: [
        { text: Z('再打一次第五个半庄'), goto: 'final' },
        { text: Z('跳过，看结局'), goto: 'final_win' },
        { text: Z('返回标题画面'), goto: 'quit' },
      ] },

      { label: 'final_win' },
      { bg: 'washizu' },
      { text: Z('东场打完了。赤木还活着。') },
      { show: 'washizu', at: 'right', face: 'rage' },
      { text: Z('鹫巢的手在发抖。分不清是愤怒，还是恐惧。') },
      { show: 'akagi19', at: 'center', face: 'calm' },
      { who: 'akagi19', emo: 'flat', text: Z('继续吧。南场。') },
      { hide: 'all' },
      { stakes: false },
      { bg: 'mansion' },
      { fx: 'thunder' },
      { text: Z('雨还在下。这一夜，还远远没有结束。') },
      { text: Z('把自己的血押上牌桌，还嫌赌注不够大的男人——赤木茂。') },
      { text: Z('他的传说，要从更早的另一个暴雨之夜说起。') },
      { text: Z('那一年，他十三岁。') },
      { bg: 'black' },
      { card: Z('序章·完'), sub: Z('第一章·暴风雨之夜') },
      { end: true, completed: true },

      { label: 'quit' },
      { end: true, completed: false },
    ],
  };

  root.Story.add(prologue);
})(window);
