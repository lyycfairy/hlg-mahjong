/*
 * Chapters 4 to 6 - rounds six to eight of the first night, after the anime's second episode
 * (data/videos/02.rmvb; plot summaries in data/texts/02-1.txt, 02-2.txt and 02-3.txt). Same script
 * format as chapter1.js; the hands are played out on the table with { move } and { focus }, as in the
 * prologue.
 *
 *   Chapter 4 · 见微知著 (From One Leaf, the Autumn)  Round six. The dora 5s thrown at Ryuzaki's riichi,
 *                       "the three voices of the discards", Ryuzaki's glance at his own tiles, and the
 *                       order to send for Yagi.                                      battle: 'reading'
 *   Chapter 5 · 釜底抽薪 (Pull the Firewood)          Round seven. Yagi arrives and watches; the pair of red
 *                       dragons thrown away to kill a Big Three Dragons, the 1,000-point win, the 8s held
 *                       back and drawn into a triplet, and the riichi that tells Yagi the boy is a
 *                       beginner after all.                                          battle: 'firewood'
 *   Chapter 6 · 欲擒故纵 (Let Go, to Catch)           Round eight. A finger for every 100,000 yen; Yagi's
 *                       riichi to see the boy flinch; the win Yagi lets go by; and the self-drawn mangan
 *                       Akagi does not declare.                                      battle: 'yagi'
 *
 * Written in Chinese first: Z(chinese) is a text that exists only in Chinese so far (I18n.pick shows it
 * in every language until the translations are added). The dialogue is an original retelling: it follows
 * the events of the source without reproducing its lines. Where the episode does not show a tile - who
 * deals into Ryuzaki in round six, the tile Yagi lets go by - the table fills it in; the summaries say
 * which parts those are.
 *
 * Every table with moves gives all four hands (the other three stand face down until the story looks
 * into one with { move: { seat, reveal: true } }); tests/story.test.js replays each of them.
 */
(function (root) {
  'use strict';
  const L = (en, ja, zh) => ({ en, ja, zh });
  const Z = zh => ({ zh });
  const THUG = L('Thug', 'チンピラ', '打手');
  const LACKEY = L('Lackey', '子分', '跟班');

  // Akagi, Ryuzaki, the thug and the lackey - the seats of chapters 1 to 3
  const seats = (a, r, t, l) => [
    Object.assign({ who: 'akagi' }, a),
    Object.assign({ who: 'ryuzaki' }, r),
    Object.assign({ who: 'thug', name: THUG }, t),
    Object.assign({ who: 'thug', name: LACKEY }, l),
  ];
  // round eight: Yagi sits where Ryuzaki sat
  const seatsYagi = (a, y, t, l) => [
    Object.assign({ who: 'akagi' }, a),
    Object.assign({ who: 'yagi' }, y),
    Object.assign({ who: 'thug', name: THUG }, t),
    Object.assign({ who: 'thug', name: LACKEY }, l),
  ];
  // a tile drawn and thrown straight back
  const pass = (seat, tile) => [{ seat, draw: tile }, { seat, discard: tile }];
  const AGAIN = label => ({ choice: [
    { text: Z('回到那一刻'), goto: label },
    { text: Z('返回标题画面'), goto: 'quit' },
  ] });

  /* ================================================================== chapter 4 */

  /*
   * Round six, South 2 (Ryuzaki deals), as the anime shows it: Ryuzaki's pond is South, red, 6s, 8m, 9p,
   * 1m, 4m and a 1s thrown as drawn; he is about to declare. Akagi holds 2m and three 3m, and the dora 5s.
   * Ryuzaki waits on 2m-5m.
   */
  const T_URA = {
    me: 0, dealer: 1, roundWind: 1, kyoku: 1, dora: '4s', wall: 38,
    seats: seats(
      { score: 36800, hand: '2333m45678p5789s', river: '1z2p1s4z9m1p6z2s' },
      { score: 27300, hand: '34678m4456778p3z', river: '2z7z6s8m9p1m4m1s' },
      { score: 18900, hand: '11789m123p2244s6z', river: '9s1z8s3z5z2z9p1s' },
      { score: 17000, hand: '9m1134p66s112577z', river: '4z9s3z2p8p1m7s2s' }),
  };
  // the same hand at Akagi's turn: Ryuzaki has declared, the other two have followed with safe tiles
  const T_URA_AT = {
    me: 0, dealer: 1, roundWind: 1, kyoku: 1, dora: '4s', wall: 34,
    seats: seats(
      { score: 36800, hand: '2333m45678p5789s', draw: '9p', river: '1z2p1s4z9m1p6z2s' },
      { score: 26300, hand: '34678m44567789p', river: '2z7z6s8m9p1m4m1s3z', riichi: 8 },
      { score: 18900, hand: '11789m123p2244s6z', river: '9s1z8s3z5z2z9p1s3s' },
      { score: 17000, hand: '9m1134p66s112577z', river: '4z9s3z2p8p1m7s2s6z' }),
  };
  // the two hands Akagi lays out for the detective: an 8m thrown from where it floats alone ...
  const T_LEC1 = {
    me: 0, dealer: 0, roundWind: 0, kyoku: 0, dora: '',
    seats: seats({ hand: '2348m677p136789s', draw: '2s' }, {}, {}, {}),
  };
  // ... and a 7p thrown out of a shape that hangs together
  const T_LEC2 = {
    me: 0, dealer: 0, roundWind: 0, kyoku: 0, dora: '',
    seats: seats({ hand: '234m677p1236789s', draw: '6s', river: '8m' }, {}, {}, {}),
  };

  const chapter4 = {
    id: 'ch4',
    no: 4,
    langs: ['zh'],
    title: Z('见微知著'),
    summary: Z('见微知著：看到一点苗头，就知道事情的全貌。一张打得太早的六索，立直后的一个眼神——少年从舍牌里听见了别人听不见的声音。'),
    available: true,
    banner: 'bg/table.jpg',
    script: [
      { bg: 'black' },
      { card: Z('第四章'), sub: Z('见微知著') },

      /* ------------------------------------------------ round six */
      { bg: 'parlor' },
      { text: Z('第六回战。赤木上桌之后的第二个半庄。') },
      { show: 'ryuzaki', at: 'right', face: 'irritated' },
      { who: 'ryuzaki', emo: 'command', text: Z('立直！') },
      { text: Z('赤木看也不看，把一张谁都不敢碰的牌扔进了牌河。没有人倒牌。') },
      { hide: 'ryuzaki' },
      { show: 'yasuoka', at: 'right', face: 'suspicious' },
      { who: 'yasuoka', emo: 'sly', think: true, text: Z('怎么看，都是个彻头彻尾的外行。连对面都开始起疑了——') },
      { who: 'yasuoka', emo: 'wary', think: true, text: Z('什么牌都敢打，却偏偏一次铳都不放。是直觉，还是看穿了什么……我说不上来。') },
      { who: 'yasuoka', emo: 'sly', think: true, text: Z('不过有一点错不了。昨晚那件事的正主，就是这个小鬼。') },
      { hide: 'all' },

      /* ------------------------------------------------ South 2: the dora */
      { table: T_URA },
      { text: Z('南二局。龙崎坐庄。') },
      { move: [{ seat: 1, draw: '9p' }, { seat: 1, discard: '3z', riichi: true }] },
      { who: 'ryuzaki', emo: 'threat', text: Z('再来——立直。') },
      { move: [].concat(pass(2, '3s'), pass(3, '6z')) },
      { text: Z('打手和跟班都老老实实地跟了安全牌。然后——轮到赤木。') },
      { move: { seat: 0, draw: '9p' } },
      { show: 'nangou', at: 'left', face: 'worried' },
      { who: 'nangou', emo: 'worried', think: true, text: Z('上一局他随手打出去的也是险牌……过是过了，可这小鬼怎么能这么不当回事？') },
      { focus: { seat: 0, hand: '5s' }, who: 'nangou', emo: 'teach', think: true, text: Z('这手牌，最想打的是五索。打掉它，听牌的形状最宽。') },
      { focus: { seat: 1, river: '6s' }, who: 'nangou', emo: 'worried', think: true, text: Z('可龙崎早早就打过六索。四索六索的嵌张，摸进三索，就会拆掉六索，改听二索、五索——早打六索的人，二五索最危险。这叫里筋。') },
      { focus: { seat: 0, hand: '5s' }, who: 'nangou', emo: 'alarm', think: true, text: Z('更何况，五索还是宝牌！') },
      { focus: { seat: 0, hand: '2m3m' }, who: 'nangou', emo: 'resolve', think: true, text: Z('这里该借手里那三张三万的“壁”，打二万。三万被自己占了三张，他很难凑出三四万的两面。') },
      { focus: { seat: 0, hand: '5s' }, text: Z('赤木的手，却伸向了五索。') },
      { who: 'nangou', emo: 'alarm', face: 'shock', text: Z('等、等一下！') },
      { who: 'nangou', emo: 'urgent', text: Z('让你读牌河是强人所难，可那张也太离谱了！') },
      { show: 'akagi', at: 'center', face: 'calm' },
      { who: 'akagi', emo: 'flat', text: Z('这张，有那么危险吗？') },
      { who: 'nangou', emo: 'teach', text: Z('那是龙崎的里筋！更何况，五索是宝牌！') },
      { who: 'akagi', emo: 'flat', text: Z('宝牌？') },
      { who: 'nangou', emo: 'teach', text: Z('就是拿在手里，能让牌变大的牌！') },
      { who: 'akagi', emo: 'flat', text: Z('头一回听说。') },
      { who: 'akagi', emo: 'cold', text: Z('……不过，那种事无所谓。') },
      { hide: 'akagi' },

      { label: 'ura' },
      { table: T_URA_AT },
      { decide: {
        title: Z('龙崎的立直：打哪一张？'),
        flag: 'ura',
        apply: true,
        notes: {
          '5s': [
            { who: 'nangou', emo: 'alarm', face: 'shock', text: Z('里筋，还是宝牌——最不能打的就是这一张！') },
            { who: 'akagi', emo: 'cold', face: 'calm', think: true, text: Z('六索出得太早。索子，他一张也不要。') },
          ],
          '2m': [
            { who: 'nangou', emo: 'hope', face: 'resolve', text: Z('对，借三万的壁打二万。宝牌留在手里，改成单吊五索。') },
            { who: 'akagi', emo: 'cold', face: 'glare', think: true, text: Z('一万他留到了第六巡，紧跟着又打了四万。……这里最紧。') },
          ],
          '*': [
            { who: 'nangou', emo: 'worried', face: 'worried', text: Z('那一张，把好好的听牌拆散了啊……') },
          ],
        },
        options: [
          { id: 'read', tiles: '5s', goto: 'ura_pass' },
          { id: 'wall', tiles: '2m', goto: 'ura_deal' },
          { id: 'other', tiles: '*', goto: 'ura_other' },
        ],
      } },

      /* ---- the wall of 3m */
      { label: 'ura_deal' },
      { text: Z('二万落在了牌河里。') },
      { move: { seat: 1, ron: '2m', from: 0 } },
      { who: 'ryuzaki', emo: 'mock', face: 'laugh', text: Z('荣！立直、一发、平和——五千八！') },
      { who: 'nangou', emo: 'shock', face: 'shock', think: true, text: Z('二、二万？！他手里明明还有一张三万……壁，根本就不是壁！') },
      { text: Z('——但那一刻，并不是这样过去的。') },
      AGAIN('ura'),

      { label: 'ura_other' },
      { text: Z('——那一刻，赤木打出去的并不是这一张。') },
      { goto: 'ura' },

      /* ---- the dora goes through */
      { label: 'ura_pass' },
      { fx: 'clack' },
      { text: Z('宝牌五索，落在了牌河里。没有人倒牌。') },
      { show: 'akagi', at: 'center', face: 'calm' },
      { who: 'akagi', emo: 'flat', text: Z('看，过了。') },
      { who: 'nangou', emo: 'irritated', face: 'worried', text: Z('混账！这回是过了，可照你这种打法，早晚——') },
      { hide: 'akagi' },
      { move: [].concat(pass(1, '4z'), pass(2, '5m'), [{ seat: 1, ron: '5m', from: 2 }]) },
      { who: 'ryuzaki', emo: 'irritated', face: 'irritated', text: Z('……荣。立直、平和，两千九。') },
      { focus: { seat: 1, hand: '3m4m' }, text: Z('龙崎倒下的手牌，最左边是三万和四万。他听的，是二万和五万。') },
      { who: 'nangou', emo: 'shock', face: 'shock', think: true, text: Z('二五万……我让他打的那张二万，正是铳牌？！') },
      { show: 'akagi', at: 'center', face: 'smirk' },
      { who: 'akagi', emo: 'cold', text: Z('果然。我就觉得，这里最紧。') },
      { who: 'nangou', emo: 'shock', text: Z('为什么……你怎么会知道？') },
      { who: 'akagi', emo: 'flat', text: Z('听见声音了。') },
      { who: 'akagi', emo: 'cold', face: 'glare', text: Z('大家都被杂音搅乱了耳朵，所以听不见。我听得见——舍牌的三种声音。') },
      { table: false },
      { hide: 'all' },

      { label: 'battle' },
      { battle: 'reading', win: 'win', lose: 'lose' },

      { label: 'lose' },
      { bg: 'parlor' },
      { text: Z('龙崎的点棒越过了赤木。照这样下去，头名又要回到他的手里。') },
      { text: Z('——但那一夜，并不是这样过去的。') },
      { choice: [
        { text: Z('再打一次'), goto: 'battle' },
        { text: Z('返回标题画面'), goto: 'quit' },
      ] },
      { label: 'quit' },
      { end: true, completed: false },

      /* ------------------------------------------------ send for Yagi */
      { label: 'win' },
      { bg: 'parlor' },
      { text: Z('第六回战结束。龙崎又一次丢掉了头名。') },
      { text: Z('南乡的账面回到了正四十九。还剩两回战。') },
      { show: 'ryuzaki', at: 'right', face: 'irritated' },
      { fx: 'shake' },
      { who: 'ryuzaki', emo: 'irritated', text: Z('荒唐！居然栽在这么个毛头小鬼手里！') },
      { who: 'ryuzaki', emo: 'wary', think: true, text: Z('照这样下去，那个废物欠的三百万，就得由我来背……') },
      { show: 'thug', at: 'left', face: 'stunned' },
      { who: 'ryuzaki', emo: 'command', text: Z('把矢木叫来！——头号的矢木！') },
      { who: 'thug', emo: 'urgent', text: Z('是、是！') },
      { hide: 'all' },

      /* ------------------------------------------------ the break: three kinds of discards */
      { text: Z('休息的时候。') },
      { show: 'yasuoka', at: 'right', face: 'wry' },
      { show: 'akagi', at: 'center', face: 'calm' },
      { who: 'yasuoka', emo: 'sly', text: Z('我是怎么都想不通。学麻将才几个钟头的你，对着那个龙崎，一次铳都没放，还拿了头名。') },
      { who: 'yasuoka', emo: 'amused', text: Z('讲给我听听吧。你现在看到的，到底是什么？') },
      { who: 'akagi', emo: 'flat', text: Z('刑警先生。比如这样一手牌，你打哪张？') },
      { table: T_LEC1 },
      { choice: [
        { text: Z('打八万'), goto: 'lec1' },
        { text: Z('打一索'), goto: 'lec1_no' },
      ] },
      { label: 'lec1_no' },
      { who: 'yasuoka', emo: 'flat', think: true, text: Z('不对，一索摸进二索，已经和三索连成了一组。孤零零浮着的，是八万。') },
      { label: 'lec1' },
      { focus: { seat: 0, hand: '8m' }, who: 'yasuoka', emo: 'flat', text: Z('八万吧。') },
      { move: { seat: 0, discard: '8m' } },
      { who: 'akagi', emo: 'flat', text: Z('那，把牌理成这样呢？') },
      { table: T_LEC2 },
      { focus: { seat: 0, hand: '6p7p' }, who: 'yasuoka', emo: 'flat', text: Z('打七筒。') },
      { move: { seat: 0, discard: '7p' } },
      { who: 'akagi', emo: 'cold', text: Z('刑警先生。这张七筒，和刚才那张八万——差别在哪里，你看得出来吗？') },
      { choice: [
        { text: Z('八万的周围没有听牌，七筒的周围有'), goto: 'lec2' },
        { text: Z('都是随手扔掉的废牌，没有差别'), goto: 'lec2_no' },
      ] },
      { label: 'lec2_no' },
      { who: 'akagi', emo: 'flat', text: Z('看上去是这样。可它们说的话，正好相反。') },
      { label: 'lec2' },
      { focus: { seat: 0, river: '8m' }, who: 'akagi', emo: 'cold', text: Z('从孤零零的形状里扔出来的八万——它的周围，没有听牌。') },
      { focus: [{ seat: 0, river: '7p' }, { seat: 0, hand: '6p7p' }], who: 'akagi', emo: 'cold', text: Z('从连着的形状里拆出来的七筒——它的周围，就有听牌。是危险的牌。') },
      { focus: false, who: 'akagi', emo: 'flat', text: Z('舍牌，大致就这两种。安全区，或者危险区。') },
      { who: 'akagi', emo: 'flat', text: Z('实际打起来，还有一种哪边都说不上的牌，像杂音一样。把它也算上，一共三种。') },
      { who: 'akagi', emo: 'cold', text: Z('用这三种，所有的舍牌都说得通。') },

      { table: T_URA_AT },
      { who: 'akagi', emo: 'flat', text: Z('还记得这副牌河吗？') },
      { who: 'yasuoka', emo: 'wary', text: Z('这是……你打宝牌的那一局，龙崎的舍牌。') },
      { who: 'akagi', emo: 'cold', text: Z('南乡先生拦我。可我当时觉得，那张五索根本就是一条大路。') },
      { focus: { seat: 1, river: '6s' }, who: 'akagi', emo: 'cold', text: Z('六索出得太早。对他来说，它比后面才打的八万、九筒还没用——它的周围，没有牌。') },
      { focus: { seat: 1, river: '1s' }, who: 'akagi', emo: 'cold', text: Z('就算有，也只可能在二索、三索一带。可第八巡那张摸切的一索，把这点可能也抹掉了。索子，全灭。') },
      { focus: [{ seat: 1, river: '6s' }, { seat: 0, hand: '5s' }], who: 'akagi', emo: 'flat', text: Z('所以六索的周围是安全区。五索，过得去。') },
      { focus: { seat: 1, river: '1m4m' }, who: 'akagi', emo: 'cold', text: Z('反过来——这张一万，他一直留到第六巡。紧跟着，又打了四万。') },
      { focus: [{ seat: 1, river: '1m4m' }, { seat: 0, hand: '2m' }], who: 'akagi', emo: 'cold', text: Z('合在一起看，本命就是二五万，跑不了。这张一万，是典型的危险区。') },
      { focus: false, who: 'yasuoka', emo: 'wary', think: true, text: Z('杂音……杂音啊。') },
      { who: 'akagi', emo: 'flat', text: Z('还有。龙崎有个小毛病。') },
      { who: 'yasuoka', emo: 'wary', text: Z('毛病？') },
      { who: 'akagi', emo: 'cold', text: Z('那一局，他喊完立直，低头看了一眼手牌。视线，跑到了最左边。') },
      { move: { seat: 1, reveal: true } },
      { focus: { seat: 1, hand: '3m4m' }, who: 'akagi', emo: 'cold', text: Z('最左边——是万子。他在确认自己听的牌。') },
      { who: 'akagi', emo: 'smirk', face: 'smirk', text: Z('那一瞬间，筒子的听牌也没了。只剩万子。二五万。') },
      { table: false },
      { hide: 'akagi' },
      { show: 'yasuoka', face: 'suspicious' },
      { who: 'yasuoka', emo: 'afraid', think: true, text: Z('怪物……学麻将才几个钟头，就把舍牌这东西剥了个精光。再加上这双眼睛。') },
      { who: 'yasuoka', emo: 'wary', think: true, text: Z('龙崎已经不是对手了。早就被甩得连影子都看不见了。') },
      { hide: 'all' },
      { show: 'akagi', at: 'center', face: 'glare' },
      { text: Z('天才，觉醒了自己的资质。') },
      { hide: 'all' },
      { bg: 'black' },
      { card: Z('未完待续'), sub: Z('第五章·釜底抽薪') },
      { end: true, completed: true },
    ],
  };

  /* ================================================================== chapter 5 */

  /*
   * Round seven, South 1 (the thug deals; nothing has been thrown yet). Ryuzaki holds a pair of whites,
   * a pair of greens and one red; Akagi one red, and he draws the second.
   */
  const T_CHUN = {
    me: 0, dealer: 2, roundWind: 1, kyoku: 0, dora: '2z', wall: 70,
    seats: seats(
      { score: 43000, hand: '34m3467p34579s17z' },
      { score: 21000, hand: '89m114p238s55667z' },
      { score: 18500, hand: '12699m3589p168s4z' },
      { score: 17500, hand: '4578m5569p2269s1z' }),
  };
  /*
   * South 2 (the lackey deals), the eighth turn. The lackey is ready and silent on the closed 8s:
   * terminals in every set and a 789 three-colour straight. Akagi, one away, draws an 8s.
   */
  const T_EIGHT = {
    me: 0, dealer: 3, roundWind: 1, kyoku: 1, dora: '4z', wall: 41,
    seats: seats(
      { score: 44000, hand: '34m44566p555678s', river: '1z9m2z1p9p4z6z' },
      { score: 21000, hand: '2267m2288p1124s7z', river: '9s1z3z5z6z9m1m' },
      { score: 17500, hand: '4558m3579p3349s2z', river: '1z4z7z1p7s6z5z' },
      { score: 17500, hand: '123789m11789p79s', river: '3z5m2s3s4z4p6s3p' }),
  };

  const chapter5 = {
    id: 'ch5',
    no: 5,
    langs: ['zh'],
    title: Z('釜底抽薪'),
    summary: Z('釜底抽薪：从锅底把柴火抽掉。代打矢木到了，却只是站在一旁看。少年拆掉红中的对子，攥住别人要和的八索——对面的大牌，一副一副地凉了下去。'),
    available: true,
    banner: 'bg/parlor.jpg',
    script: [
      { bg: 'black' },
      { card: Z('第五章'), sub: Z('釜底抽薪') },

      /* ------------------------------------------------ round seven; Yagi arrives */
      { bg: 'parlor' },
      { text: Z('第七回战——赤木上桌之后的第三个半庄。') },
      { show: 'nangou', at: 'left', face: 'worried' },
      { who: 'nangou', emo: 'pleading', think: true, text: Z('拜托了，赤木。就趁着这股势头，一口气拿下来……') },
      { text: Z('祈祷也许是应验了。东场打完，赤木领先第二名的龙崎两万两千点。') },
      { text: Z('眼看这一个半庄也要分出胜负——门开了。') },
      { hide: 'all' },
      { bg: 'doorway' },
      { show: 'yagi', at: 'right', face: 'smile' },
      { text: Z('进来的，是一个穿紫色外套的男人。') },
      { hide: 'all' },
      { bg: 'parlor' },
      { show: 'ryuzaki', at: 'left', face: 'laugh' },
      { who: 'ryuzaki', emo: 'relief', text: Z('矢木！可把你等来了。') },
      { show: 'yagi', at: 'right', face: 'smile' },
      { who: 'yagi', emo: 'amused', text: Z('龙崎先生。听说您打得有点吃力？') },
      { who: 'yagi', emo: 'flat', text: Z('刚才那小鬼的起手牌，我不小心瞧见了，这一局不能上。从下一局开始，行吗？') },
      { who: 'ryuzaki', emo: 'command', face: 'smug', text: Z('就这么办。') },
      { who: 'yagi', emo: 'smug', text: Z('没什么。南场还原封不动地留着呢——这个半庄，我也替您捡回来。') },
      { text: Z('这时候的矢木，眼里根本没有赤木。也难怪——对手不过是个初中生。') },
      { text: Z('可这份轻视，很快就得改过来。') },
      { hide: 'all' },

      /* ------------------------------------------------ South 1: the pair of red dragons */
      { label: 'chun' },
      { table: T_CHUN },
      { text: Z('南一局。打手坐庄，第一打是白板。') },
      { move: [{ seat: 2, draw: '5z' }, { seat: 2, discard: '5z' }, { seat: 1, pon: '5z', from: 2 }, { seat: 1, discard: '8s' }] },
      { show: 'yasuoka', at: 'right', face: 'suspicious' },
      { who: 'yasuoka', emo: 'wary', think: true, text: Z('第一张就碰。抢速度吗？') },
      { hide: 'all' },
      { move: [].concat(pass(2, '9s'), pass(3, '4z'), [{ seat: 0, draw: '7z' }]) },
      { focus: { seat: 0, hand: '7z' }, text: Z('赤木的第一摸，是红中。手里本来就有一张——成了对子。') },
      { show: 'nangou', at: 'left', face: 'resolve' },
      { focus: { seat: 0, hand: '7z' }, who: 'nangou', emo: 'hope', think: true, text: Z('走运！领先的时候，要的就是早和。红中的对子，正是一张特快车票！') },
      { who: 'akagi', emo: 'cold', think: true, text: Z('……白板，只碰了一声。') },
      { decide: {
        title: Z('第一摸：红中成了对子'),
        flag: 'chun',
        apply: true,
        notes: {
          '7z': [
            { who: 'nangou', emo: 'alarm', face: 'shock', text: Z('拆掉刚成的对子？！那可是早和的特快车票啊！') },
            { who: 'akagi', emo: 'cold', face: 'glare', think: true, text: Z('这对红中，现在还打得出去。等他手里也凑成一对——就再也打不出去了。') },
          ],
          '*': [
            { who: 'nangou', emo: 'hope', face: 'resolve', text: Z('对，红中留着。碰出来就是一番，赶紧和掉，把这个半庄结束。') },
            { who: 'akagi', emo: 'cold', face: 'calm', think: true, text: Z('他只碰了一张白板。……可那股味道，是三元牌的味道。') },
          ],
        },
        options: [
          { id: 'drop', tiles: '7z', goto: 'chun_drop' },
          { id: 'keep', tiles: '*', goto: 'chun_keep' },
        ],
      } },

      /* ---- the express ticket */
      { label: 'chun_keep' },
      { text: Z('赤木留下了红中的对子。') },
      { move: [].concat([{ seat: 1, draw: '4s' }, { seat: 1, discard: '4p' }], pass(2, '2z'), pass(3, '1m'), pass(0, '8p')) },
      { text: Z('一巡，又一巡。红中始终没有人打出来。') },
      { move: [].concat([{ seat: 1, draw: '6z' }, { seat: 1, discard: '9m' }], pass(2, '1s'), pass(3, '2z'), pass(0, '7s'),
        [{ seat: 1, draw: '7z' }, { seat: 1, discard: '8m' }], pass(2, '3z'), pass(3, '9s')) },
      { who: 'nangou', emo: 'worried', face: 'worried', think: true, text: Z('怎么回事……另外两张红中，一张都不出来。这对子反倒把手卡死了。') },
      { text: Z('要往前走，就只能把它拆掉。') },
      { move: [{ seat: 0, draw: '1p' }, { seat: 0, discard: '7z' }, { seat: 1, ron: '7z', from: 0 }] },
      { who: 'ryuzaki', emo: 'joy', face: 'laugh', text: Z('荣——！白、发、中，大三元！三万两千点！') },
      { fx: 'zawa' },
      { who: 'nangou', emo: 'afraid', face: 'shock', think: true, text: Z('役、役满……两万两千点的领先，一把就翻了过去……') },
      { text: Z('——但那一刻，并不是这样过去的。') },
      AGAIN('chun'),

      /* ---- the red dragons go, one after the other */
      { label: 'chun_drop' },
      { who: 'nangou', emo: 'shock', face: 'shock', think: true, text: Z('拆、拆掉了？！刚成的对子啊！') },
      { move: [].concat([{ seat: 1, draw: '4s' }, { seat: 1, discard: '4p' }], pass(2, '2z'), pass(3, '1m'), [{ seat: 0, draw: '8p' }, { seat: 0, discard: '7z' }]) },
      { fx: 'zawa' },
      { text: Z('下一巡——又是红中。刚到手的对子，被他一张接一张地拆了。看的人全都呆住了。') },
      { hide: 'all' },
      { move: { seat: 1, draw: '6z' } },
      { show: 'ryuzaki', at: 'right', face: 'irritated' },
      { who: 'ryuzaki', emo: 'irritated', think: true, text: Z('红中现了两张……手里这一张，留着也凑不成刻子了。') },
      { move: [].concat([{ seat: 1, discard: '7z' }], pass(2, '1s'), pass(3, '2z'), [{ seat: 0, draw: '7s' }, { seat: 0, discard: '1z' }, { seat: 1, draw: '7z' }]) },
      { who: 'ryuzaki', emo: 'shock', think: true, text: Z('红中？！偏偏在这个时候……') },
      { move: { seat: 1, discard: '7z' } },
      { who: 'ryuzaki', emo: 'gloomy', think: true, text: Z('糟了……要是刚才没打那一张——') },
      { hide: 'all' },
      { move: { seat: 1, reveal: true } },
      { focus: { seat: 1, hand: '6z' }, text: Z('龙崎的手里：碰出来的白板，三张发财。要是红中再凑成一对，就是只差一步的大三元。') },
      { show: 'yasuoka', at: 'right', face: 'suspicious' },
      { who: 'yasuoka', emo: 'wary', think: true, text: Z('只凭一声“碰白”，就闻出了三元牌的味道……') },
      { who: 'yasuoka', emo: 'sly', think: true, text: Z('看上去是胡来的拆对子，却把龙崎的大三元掐死在了摇篮里。这小鬼对危险，有一种野兽般的嗅觉。') },
      { who: 'akagi', emo: 'cold', think: true, text: Z('火烧得再旺，把柴抽走，锅也就凉了。') },
      { hide: 'all' },

      /* ---- the 1,000-point win */
      { move: [].concat(pass(2, '3z'), pass(3, '9s'), pass(0, '1p'), pass(1, '3z')) },
      { focus: { seat: 0, hand: '3m4m3p4p3s4s5s' }, text: Z('几巡之后，赤木的手牌成了三色同顺的一向听。') },
      { show: 'nangou', at: 'left', face: 'resolve' },
      { focus: { seat: 0, hand: '3m4m3p4p3s4s5s' }, who: 'nangou', emo: 'hope', think: true, text: Z('三四万、三四筒、三四五索……三色！再进两张，就是一手大牌！') },
      { who: 'akagi', emo: 'cold', think: true, text: Z('龙崎已经听牌了。那两张，等不到。') },
      { move: [].concat(pass(2, '9p'), [{ seat: 3, draw: '2p' }, { seat: 3, discard: '2p' }]) },
      { who: 'akagi', emo: 'flat', text: Z('吃。') },
      { move: [{ seat: 0, chi: '234p', from: 3 }, { seat: 0, discard: '9s' }] },
      { who: 'nangou', emo: 'shock', face: 'shock', think: true, text: Z('吃二筒？！那三色不就没了吗！') },
      { move: [].concat(pass(1, '1s'), pass(2, '5m'), [{ seat: 0, ron: '5m', from: 2 }]) },
      { who: 'akagi', emo: 'flat', text: Z('荣。断幺九，一千点。') },
      { hide: 'all' },
      { show: 'yasuoka', at: 'right', face: 'wry' },
      { who: 'yasuoka', emo: 'amused', think: true, text: Z('出手快。见切，更是一流。') },
      { who: 'yasuoka', emo: 'sly', think: true, text: Z('换成凡人，对三色多少有点舍不得。这小鬼却清楚得很——那一点舍不得，会把自己拖累成什么样。') },
      { who: 'yasuoka', emo: 'wary', think: true, text: Z('这是感度的差距。一边端着带瞄准镜的步枪，一边举着粗制滥造的土枪——龙崎只有被一枪撂倒的份。') },
      { table: false },
      { hide: 'all' },

      /* ------------------------------------------------ "let this one go" */
      { show: 'ryuzaki', at: 'left', face: 'irritated' },
      { show: 'yagi', at: 'right', face: 'focus' },
      { who: 'yagi', emo: 'flat', text: Z('龙崎先生。这个半庄，放掉吧。') },
      { who: 'ryuzaki', emo: 'irritated', text: Z('你说什么？') },
      { who: 'yagi', emo: 'teach', text: Z('差了两万三千点，又已经是南场。要从这里翻盘，得打得相当乱来才行。') },
      { who: 'yagi', emo: 'wary', text: Z('再说，那个小鬼相当难缠。听说是个新手——可这反倒更叫人发毛，摸不透底细。') },
      { who: 'yagi', emo: 'flat', text: Z('别小看他为好。这个半庄，稳妥的做法是放掉。') },
      { hide: 'all' },
      { show: 'yasuoka', at: 'right', face: 'suspicious' },
      { who: 'yasuoka', emo: 'wary', think: true, text: Z('原来如此，这人不是蠢货。一眼就看穿了那小鬼的才能。') },
      { who: 'yasuoka', emo: 'sly', think: true, text: Z('对手是个初中生。换了别人，这种时候难免想逞一逞威风——他忍住了。比龙崎，高出一截。') },
      { hide: 'all' },

      /* ------------------------------------------------ South 2: the 8s */
      { label: 'eight' },
      { table: T_EIGHT },
      { text: Z('南二局。跟班坐庄，已经是第八巡。赤木一向听。') },
      { move: { seat: 0, draw: '8s' } },
      { focus: { seat: 0, hand: '8s' }, text: Z('赤木摸进了一张八索。五索的暗刻，六七八索的顺子——这张八索，是手里唯一浮着的牌。') },
      { move: { seat: 3, reveal: true } },
      { focus: { seat: 3, hand: '7s9s' }, text: Z('而他的上家，坐庄的跟班，已经悄悄听牌了：纯全带幺九，三色同顺。嵌张，八索。') },
      { show: 'yagi', at: 'right', face: 'focus' },
      { focus: { seat: 3, river: '2s3s6s' }, who: 'yagi', emo: 'flat', think: true, text: Z('上家那副牌河，净是中张。这种局面，手里最没用的八索被打出来，一点都不奇怪。') },
      { hide: 'all' },
      { decide: {
        title: Z('第八巡：浮着的八索'),
        flag: 'eight',
        apply: true,
        notes: {
          '8s': [
            { who: 'nangou', emo: 'hope', face: 'resolve', text: Z('八索没用，打掉就是。五索的暗刻可不能拆。') },
            { who: 'akagi', emo: 'cold', face: 'glare', think: true, text: Z('上家的牌河里，二索、三索、六索……中张一张接一张。他要的，是两头的牌。') },
          ],
          '5s': [
            { who: 'nangou', emo: 'alarm', face: 'shock', text: Z('拆暗刻？！留着那张没用的八索干什么！') },
            { who: 'akagi', emo: 'cold', face: 'calm', think: true, text: Z('这张八索，不能给他。') },
          ],
          '*': [
            { who: 'nangou', emo: 'worried', face: 'worried', text: Z('那一张打出去，手就退了一步……') },
          ],
        },
        options: [
          { id: 'hold', tiles: '5s', goto: 'eight_hold' },
          { id: 'deal', tiles: '8s', goto: 'eight_deal' },
          { id: 'other', tiles: '*', goto: 'eight_other' },
        ],
      } },

      { label: 'eight_deal' },
      { text: Z('八索落在了牌河里。') },
      { move: { seat: 3, ron: '8s', from: 0 } },
      { fx: 'zawa' },
      { text: Z('跟班推倒了手牌：纯全带幺九、三色同顺——庄家的满贯，一万两千点。') },
      { who: 'nangou', emo: 'afraid', face: 'shock', think: true, text: Z('一、一万二……领先的两万三千点，一把就去了一半！') },
      { text: Z('——但那一刻，并不是这样过去的。') },
      AGAIN('eight'),

      { label: 'eight_other' },
      { text: Z('——那一刻，赤木打出去的并不是这一张。') },
      { goto: 'eight' },

      { label: 'eight_hold' },
      { text: Z('赤木打出去的，是五索。现成的暗刻，被他拆了。') },
      { show: 'yagi', at: 'right', face: 'rattled' },
      { who: 'yagi', emo: 'shock', think: true, text: Z('为什么躲得开八索？分明是认定八索危险，才改打五索的。') },
      { who: 'yagi', emo: 'wary', think: true, text: Z('这小鬼眼里，到底看见了什么？') },
      { move: [].concat(pass(1, '9p'), pass(2, '2z'), pass(3, '6z'), [{ seat: 0, draw: '8s' }]) },
      { fx: 'zawa' },
      { focus: { seat: 0, hand: '8s' }, text: Z('下一巡——又是八索。八索，暗刻。') },
      { who: 'yagi', emo: 'wary', think: true, text: Z('像把牌看穿了一样的读牌，再加上这种强运……') },
      { focus: [{ seat: 0, hand: '8s' }, { seat: 3, hand: '7s9s' }], text: Z('上家要和的八索，被他整个攥死在了手心里。') },
      { move: [].concat([{ seat: 0, discard: '5s' }], pass(1, '3z'), pass(2, '1s'), pass(3, '5z'), [{ seat: 0, draw: '4p' }]) },
      { who: 'akagi', emo: 'flat', text: Z('立直。') },
      { move: { seat: 0, discard: '6p', riichi: true } },
      { text: Z('听二万、五万。站在后面的安冈什么也没察觉，南乡当然也没有。') },
      { text: Z('然而——矢木像被电了一下。') },
      { focus: [{ seat: 0, hand: '4p' }, { seat: 0, river: '6p' }], who: 'yagi', emo: 'wary', think: true, text: Z('打六筒立直？……不对。') },
      { focus: { seat: 0, hand: '4p5p' }, who: 'yagi', emo: 'teach', think: true, text: Z('这个形状，该打的是五筒。留下三张四筒的暗刻，再摸到四筒就能开暗杠——岭上牌、杠宝牌，都是白拿的好处。这里除了五筒，没有别的打法。') },
      { who: 'yagi', emo: 'flat', think: true, text: Z('他为什么不这么打？') },
      { who: 'yagi', emo: 'smirk', think: true, text: Z('……是了。他多半以为，立直之后就不能杠了。') },
      { show: 'yagi', face: 'smile' },
      { who: 'yagi', emo: 'smug', think: true, text: Z('果然还是个新手。——能赢。') },
      { who: 'yagi', emo: 'menace', think: true, text: Z('抓住这个破绽，把他的麻将搅得七零八落。平衡一旦打破，越是才气过人的家伙，垮得越快。') },
      { table: false },
      { hide: 'all' },

      { label: 'battle' },
      { battle: 'firewood', win: 'win', lose: 'lose' },

      { label: 'lose' },
      { bg: 'parlor' },
      { text: Z('两万三千点的领先，就这样被一口一口地啃掉了。') },
      { text: Z('——但那一夜，并不是这样过去的。') },
      { choice: [
        { text: Z('再打一次'), goto: 'battle' },
        { text: Z('返回标题画面'), goto: 'quit' },
      ] },
      { label: 'quit' },
      { end: true, completed: false },

      { label: 'win' },
      { bg: 'parlor' },
      { text: Z('第七回战，赤木大胜。') },
      { text: Z('只要再拿一次头名，南乡的欠债就全部还清，这场牌局也就到头了。') },
      { show: 'nangou', at: 'left', face: 'resolve' },
      { who: 'nangou', emo: 'hope', think: true, text: Z('还差一次……只差一次了！') },
      { show: 'yagi', at: 'right', face: 'smile' },
      { text: Z('矢木站了起来，朝龙崎的座位走了过去。') },
      { hide: 'all' },
      { bg: 'black' },
      { card: Z('未完待续'), sub: Z('第六章·欲擒故纵') },
      { end: true, completed: true },
    ],
  };

  /* ================================================================== chapter 6 */

  /*
   * Round eight, East 1 (Akagi deals), the seventh turn: Yagi is about to draw the 8s and declare on the
   * closed 7s. After these moves the table is the opening of the match 'yagi' (js/data/stages.js).
   */
  const T_YAGI = {
    me: 0, dealer: 0, roundWind: 0, kyoku: 0, dora: '1m', wall: 45,
    seats: seatsYagi(
      { score: 25000, hand: '566m23445p78999s', river: '1p2z1m4z3z6z1s' },
      { score: 25000, hand: '345m234p99p3456s4z', river: '7z7m6z4p9s3m' },
      { score: 25000, hand: '1289m1178p12s336z', river: '9p2z5z8s4z9m' },
      { score: 25000, hand: '2278m6788p1267s7z', river: '9p1z9m3z5z2z' }),
  };
  /*
   * East 1, one honba, the tenth turn. Yagi is ready and silent on 2m-5m - a pinfu worth a thousand
   * points. Akagi draws 6p and throws the 2m. (The episode does not show which tile it was.)
   */
  const T_HONBA = {
    me: 0, dealer: 0, roundWind: 0, kyoku: 0, honba: 1, dora: '3z', wall: 34,
    seats: seatsYagi(
      { score: 28100, hand: '2m334456p778899s', river: '7z1z9m6z3m1s9p4s7m' },
      { score: 23300, hand: '34m56799p345789s', river: '2575z6m3p8m4p5s' },
      { score: 24300, hand: '12257m189p23s344z', river: '577z11p1622z' },
      { score: 24300, hand: '134455m38p1466s4z', river: '13z9s412z98m1s' }),
  };
  // the fifteenth turn of the same hand: Akagi waits on 2p-5p, and the 5p makes two double runs
  const T_FIFTEEN = {
    me: 0, dealer: 0, roundWind: 0, kyoku: 0, honba: 1, dora: '3z', wall: 14,
    seats: seatsYagi(
      { score: 28100, hand: '3344566p778899s', river: '7z1z9m6z3m1s9p4s7m2m5z2s8m1m' },
      { score: 23300, hand: '34m56799p345789s', river: '2575z6m3p8m4p53s8p2s6m6s' },
      { score: 24300, hand: '12257m189p23s344z', river: '577z11p1622z1p976m7p' },
      { score: 24300, hand: '134455m38p1466s4z', river: '13z9s412z98m1s1m5s7p4s4m' }),
  };

  const chapter6 = {
    id: 'ch6',
    no: 6,
    langs: ['zh'],
    title: Z('欲擒故纵'),
    summary: Z('欲擒故纵：想捉住他，先故意放开他。矢木坐上了牌桌，赌注里多了手指。他放过一把到手的和牌，只为在少年心里埋下一个疑问——而第十五巡，少年也放过了一手满贯。'),
    available: true,
    banner: 'bg/table.jpg',
    script: [
      { bg: 'black' },
      { card: Z('第六章'), sub: Z('欲擒故纵') },

      /* ------------------------------------------------ a finger for every hundred thousand */
      { bg: 'parlor' },
      { show: 'ryuzaki', at: 'left', face: 'irritated' },
      { who: 'ryuzaki', emo: 'worried', text: Z('……真的没问题吗？') },
      { show: 'yagi', at: 'right', face: 'smile' },
      { who: 'yagi', emo: 'smug', text: Z('交给我吧。') },
      { text: Z('矢木在龙崎的位子上坐了下来。') },
      { hide: 'ryuzaki' },
      { show: 'akagi', at: 'center', face: 'calm' },
      { who: 'yagi', emo: 'flat', text: Z('不过小弟弟，我对你有一个要求。') },
      { who: 'yagi', emo: 'sly', text: Z('你不觉得，这场牌局不公平吗？') },
      { who: 'akagi', emo: 'flat', text: Z('不公平？') },
      { who: 'yagi', emo: 'teach', text: Z('你想想。跟你打的龙崎先生，输了要赔一大笔钱。替他上场的我，要是输给你这种外行，在这一行里也就混不下去了。') },
      { who: 'yagi', emo: 'mock', text: Z('可你呢？输了，倒霉的只有这位南乡老板。你什么都不会失去。') },
      { who: 'akagi', emo: 'flat', text: Z('你想说什么？') },
      { show: 'yagi', face: 'focus' },
      { who: 'yagi', emo: 'menace', text: Z('很简单。跟我握“差马”——你我两个人单比名次，一个半庄，十万。') },
      { who: 'yagi', emo: 'smirk', text: Z('当然，现在的你拿不出这笔钱。所以到时候，拿别的东西来抵也行。') },
      { who: 'akagi', emo: 'flat', text: Z('别的东西？') },
      { fx: 'thunder' },
      { who: 'yagi', emo: 'menace', text: Z('一根手指，算十万。我收。') },
      { show: 'nangou', at: 'left', face: 'shock' },
      { who: 'nangou', emo: 'alarm', text: Z('你、你这人——') },

      { label: 'bet' },
      { choice: [
        { text: Z('“行啊。只要一样就行。”'), goto: 'bet_yes' },
        { text: Z('“我没有钱。这个赌，我接不了。”'), goto: 'bet_no' },
      ] },
      { label: 'bet_no' },
      { who: 'yagi', emo: 'mock', face: 'smile', text: Z('怕了？那也行——现在就从这张桌子上下去，让南乡老板自己来打。') },
      { who: 'nangou', emo: 'afraid', think: true, text: Z('我上去……对着这个代打？那跟送死有什么两样……') },
      { text: Z('——但那一夜，赤木并没有退。') },
      { goto: 'bet' },

      { label: 'bet_yes' },
      { who: 'akagi', emo: 'flat', text: Z('行啊。只要一样就行。') },
      { who: 'yagi', emo: 'wary', face: 'focus', text: Z('一样？') },
      { who: 'akagi', emo: 'cold', text: Z('你也挺可疑的。看着可不像身上带着那么多钱的人。') },
      { who: 'akagi', emo: 'smirk', face: 'smirk', text: Z('你要是付不出来，也拿同样的东西来抵——那我没意见。') },
      { show: 'yagi', face: 'rattled' },
      { who: 'yagi', emo: 'irritated', think: true, text: Z('这小鬼……') },
      { show: 'yagi', face: 'focus' },
      { who: 'yagi', emo: 'threat', text: Z('当然，我接了。你刚才这句话，可要记牢。') },
      { hide: 'nangou' },
      { show: 'yasuoka', at: 'left', face: 'wry' },
      { who: 'yasuoka', emo: 'amused', think: true, text: Z('打错算盘了。那本来是恐吓——开一个吓人的价，逼他动摇，再把他压垮。') },
      { who: 'yasuoka', emo: 'sly', think: true, text: Z('结果被这小鬼轻描淡写地顶了回去。胆子真不小。') },
      { hide: 'all' },

      /* ------------------------------------------------ what a stake does */
      { bg: 'black' },
      { text: Z('赌博这东西，有没有押上东西，胜负的性质截然不同。') },
      { text: Z('什么都没押的时候，决定胜负的是感觉和专注力。') },
      { text: Z('可一旦押上了东西，光有这些，绝对赢不了。对手的牌读得再准，自己信不过这份读法，就毫无意义。') },
      { text: Z('没有把自己的命运整个押上去的器量，也毫无意义。——被拷问的，是相信自己的那颗心。') },

      /* ------------------------------------------------ round eight, East 1 */
      { bg: 'parlor' },
      { table: T_YAGI },
      { text: Z('第八回战，东一局。赤木坐庄。第七巡——') },
      { move: [{ seat: 1, draw: '8s' }, { seat: 1, discard: '4z', riichi: true }] },
      { text: Z('矢木摸进一张牌，几乎没有停顿，就把手里的北风横着放了下去。') },
      { move: [].concat(pass(2, '1z'), pass(3, '1m'), [{ seat: 0, draw: '6p' }]) },
      { focus: { seat: 0, hand: '6p' }, text: Z('轮到赤木。摸进来的，是六筒。') },
      { table: false },

      { label: 'battle' },
      { battle: 'yagi', win: 'win', lose: 'lose' },

      { label: 'lose' },
      { bg: 'parlor' },
      { text: Z('手指押在桌上的时候，人的心会自己往软的地方流。') },
      { text: Z('——但那一刻，赤木的心并没有流过去。') },
      AGAIN('battle'),
      { label: 'quit' },
      { end: true, completed: false },

      /* ------------------------------------------------ the win Yagi lets go by */
      { label: 'win' },
      { bg: 'parlor' },
      { text: Z('东一局，赤木自摸。矢木想用压力把他压垮的算盘，落了个空。') },
      { text: Z('赤木茂最厉害的地方，正是这一点：敢把一切押在自己的判断上。那是一颗不会动摇的心。') },
      { text: Z('眼看牌势就要一路倒向赤木——') },
      { table: T_HONBA },
      { text: Z('东一局，一本场。第十巡。') },
      { move: [{ seat: 0, draw: '6p' }, { seat: 0, discard: '2m' }] },
      { focus: { seat: 0, river: '2m' }, text: Z('赤木听牌了，打出去的是二万。') },
      { move: { seat: 1, reveal: true } },
      { show: 'thug', at: 'left', face: 'stunned' },
      { focus: [{ seat: 1, hand: '3m4m' }, { seat: 0, river: '2m' }], who: 'thug', emo: 'shock', think: true, text: Z('那、那不是矢木先生要的牌吗？！三四万的两面，二万正好——') },
      { focus: [{ seat: 1, hand: '3m4m' }, { seat: 0, river: '2m' }], text: Z('矢木没有倒牌。眉毛都没动一下，伸手去摸下一张。') },
      { move: [].concat(pass(1, '3s'), pass(2, '1p'), pass(3, '1m')) },
      { hide: 'thug' },
      { show: 'ryuzaki', at: 'left', face: 'irritated' },
      { who: 'ryuzaki', emo: 'alarm', think: true, text: Z('怎么回事……为什么不和，矢木！') },
      { hide: 'ryuzaki' },
      { show: 'yagi', at: 'right', face: 'focus' },
      { who: 'yagi', emo: 'cold', think: true, text: Z('这就是我的计策。这种垃圾一样的小牌，不和也罢。') },
      { who: 'yagi', emo: 'flat', think: true, text: Z('我不和，这个东一局多半会被他拿走。——这就够了。') },
      { who: 'yagi', emo: 'sly', think: true, text: Z('他捡走点棒的同时，心里会落下一个疑问：自己的读牌，是不是出了差错。') },
      { who: 'yagi', emo: 'menace', think: true, text: Z('这点疑心，日后会像打在肚子上的拳头一样慢慢发作。到了后半、压力更大的时候，他就会犹豫——十有八九，会滑向软弱的那一打。') },
      { who: 'yagi', emo: 'cold', think: true, text: Z('而在分量重的胜负里，要命的正是那一打。') },
      { show: 'yagi', face: 'smile' },
      { who: 'yagi', emo: 'smug', think: true, text: Z('我是在这个世界里活下来的人。求生的路数，跟你们不一样。——那张网，你已经有一半落进去了。') },
      { hide: 'all' },

      /* ------------------------------------------------ the fifteenth turn */
      { table: T_FIFTEEN },
      { text: Z('然而，第十五巡——') },
      { move: { seat: 0, draw: '5p' } },
      { show: 'nangou', at: 'left', face: 'resolve' },
      { focus: { seat: 0, hand: '5p' }, who: 'nangou', emo: 'joy', think: true, text: Z('来了！五筒——二杯口、平和、自摸，满贯！') },
      { text: Z('可是，赤木没有倒牌。') },
      { who: 'nangou', emo: 'shock', face: 'shock', think: true, text: Z('……不和？为什么？') },
      { show: 'yagi', at: 'right', face: 'rattled' },
      { who: 'yagi', emo: 'wary', think: true, text: Z('这家伙……难道说——') },
      { table: false },
      { hide: 'all' },
      { show: 'akagi', at: 'center', face: 'glare' },
      { text: Z('不会动摇的心，与深不见底的网。') },
      { text: Z('黎明之前，无声的死斗还在继续。') },
      { hide: 'all' },
      { bg: 'black' },
      { card: Z('未完待续'), sub: Z('传说之夜，仍在继续') },
      { end: true, completed: true },
    ],
  };

  const chapter7 = {
    id: 'ch7',
    no: 7,
    title: L('The Heretic\'s Scheme', '異端の策略', '异端之策'),
    summary: L(
      'The mangan he did not take - and what he took instead.',
      'アガらなかった満貫。その代わりに、彼が取りに行ったもの。',
      '没有和下去的那一手满贯——少年要拿的，是别的东西。'),
    available: false,
    script: [],
  };

  root.Story.add(chapter4, chapter5, chapter6, chapter7);
})(window);
