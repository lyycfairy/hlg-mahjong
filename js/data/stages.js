/*
 * Battle campaign. Each stage is a mahjong match with a clear condition.
 * The human always sits at seat 0 (bottom). Seat 1 is to the right and
 * plays next, seat 2 sits across, seat 3 is to the left.
 *
 *   scores       starting points per seat
 *   firstDealer  seat that deals the first hand of a wind round
 *   startWind / endWind   0 = East round, 1 = South round
 *   goal.check(final)     final = { scores, ranking, place } -> cleared?
 *   ai           one entry per seat (null for the human), see js/mahjong/ai.js:
 *                  style   'aggressor' | 'collaborator' | 'independent' | 'supporter' - chosen to fit the story
 *                          (a supporter is the partner of Washizu mahjong: `ally` is whom he plays for, `foe`
 *                          the enemy he gives nothing to, `feedDama` lets him feed a silent ready hand too)
 *                  level   0..1 playing strength
 *                  ally    (collaborator) the seat he plays for;  signal  how reliably they pass signals;
 *                          feed  how readily he gives a big hand to the ally
 *   skills       one entry per seat: { skill: 'insight' | 'flow' | ..., gauge: starting rage } or null
 *                (`watch` aims a skill at a seat: whom an Insight watches, whom Beat the Grass shakes);
 *                an Insight with watch: seat fires by itself and stops its owner dealing into that seat
 *                (js/mahjong/skills.js)
 *   opening      the match starts in the middle of its first hand, at a decision taken from
 *                the story. What the player chooses changes what follows:
 *                  scenario  the position (format: js/mahjong/scenario.js)
 *                  forced    seats whose first action is scripted ('drawn' = throw the drawn tile)
 *                  kind      'call'    - answer the first discard: options are 'ron' and 'pass'
 *                            'discard' - choose a discard: options name tiles ('2p', or '*' for the rest)
 *                  auto      the option the story takes for the player: a scripted event, with no
 *                            choice and no analysis panel (the option's note and after lines still play)
 *                  prelude   lines shown when the hand appears, before anything moves
 *                  intro     lines shown at the decision, before the choice
 *                  (any line may carry emo: 'preset' - the mood its recorded voice acts; see chapter1.js)
 *                  options   [{ id, label / tiles, note (commentary), after (lines), effects,
 *                              later (lines after the hand ends), laterEffects }]
 *                  effects   { grant: { seat, skill, gauge, watch } }   { gauge: { seat, set | add } }
 *                            { underrate: { seats, target } }    { sense: { seat, target } }
 *                            { steady: { seat } } (a shaken player holds firm)   { fire: { seat } }
 *                  when      on an option with `later` lines: play them if the hand ended in the player's
 *                            'win', a 'dealin' off him, or 'any' way (default: a win for 'ron', else a deal-in)
 *                  the opening itself may carry `effects` too: what the story has settled before the hand,
 *                  applied after the prelude. A 'scene' opening needs no `scenario` (a plain first hand).
 *
 *   hands        play only this many hands (the match ends after them)
 *   startKyoku   hand of the start wind to begin on (0 = the first; South 2 is startWind 1, startKyoku 1)
 *   langs        the languages a stage has been written in, when not all three (others show it in Chinese)
 *   label        shown instead of 'Stage n' (a prologue stage: 序章); free: true keeps it open and out of the
 *                unlock order
 *
 * The opening `kind` may also be 'scene': no decision - the prelude plays when the hand appears,
 * the intro when the player's first turn comes, and then the hand is played normally - or 'choice':
 * a plain decision from the story (options [{ id, label, desc, note, effects }]) shown before anyone
 * moves. An effect { fire: { seat } } sets that seat's skill off at once.
 *   pause        { seat, discards, react }: the hand stops once that seat has made that many discards (with
 *                react: true, only after the others have had their chance to win on the last one) (a scene
 *                takes over); the result is { type: 'pause', waits, yakuman } for goal.check
 *
 * Text is written as L(english, japanese, chinese), or Z(chinese) while a stage exists only in
 * Chinese. All of it is original to this project.
 */
(function (root) {
  'use strict';

  const L = (en, ja, zh) => ({ en, ja, zh });
  const Z = zh => ({ zh });          // written in Chinese first; the other languages come later

  const N = {
    akagi: L('Akagi', 'アカギ', '赤木'),
    ryuzaki: L('Ryuzaki', '竜崎', '龙崎'),
    thug: L('Thug', 'チンピラ', '打手'),
    lackey: L('Lackey', '子分', '跟班'),
    yagi: L('Yagi', '矢木', '矢木'),
    yasuoka: L('Yasuoka', '安岡', '安冈'),
    washizu: L('Washizu', '鷲巣', '鹫巢'),
    suzuki: L('Suzuki', '鈴木', '铃木'),
  };

  /*
   * The prologue (js/data/prologue.js): Washizu's mansion, 1965. Transparent tiles, two against two -
   * Akagi and his partner Yasuoka against Washizu and his man Suzuki - and between Akagi and Washizu
   * alone, 1,000 points are 100cc of Akagi's blood or a million of Washizu's yen.
   *   glass   every tile but one copy of each kind is glass: the other hands show through
   *   blood   { seat, from, cc, lethal, drawn }: what `seat` bleeds when `from` wins off him or by self-draw
   *   money   { seat, to, perPoint, funds }: what `seat` pays when `to` wins off him or by self-draw
   */
  const PROLOGUE = {
    no: 0, label: Z('序章'), free: true, langs: ['zh'], glass: true,
    names: [N.akagi, N.yasuoka, N.washizu, N.suzuki],
    who: ['akagi19', 'yasuoka', 'washizu', 'suzuki'],
    portraits: ['akagi19', 'yasuoka', 'washizu', 'suzuki'],
    // Two against two. Yasuoka plays Akagi's hand and Suzuki plays Washizu's - neither plays his own:
    // they hold what their man needs, pass him what he can pon, feed him on riichi or when the other
    // side presses, and give the enemy nothing. The monster himself swings for the kill.
    ai: [
      null,
      { style: 'supporter', level: 0.9, ally: 0, foe: 2 },
      { style: 'aggressor', level: 0.8 },
      { style: 'supporter', level: 0.9, ally: 2, foe: 0, feedDama: true },
    ],
  };

  const STAGES = [
    Object.assign({}, PROLOGUE, {
      id: 'ambush',
      title: Z('请君入瓮'),
      opponent: Z('鹫巢巌和他的部下铃木'),
      blurb: Z('第一个半庄，南一局。鹫巢只差一张就要立直，铃木手里早已备好了喂给他的牌。赤木手里，是一副五面听的好牌——'),
      blood: { seat: 0, from: 2, cc: 100, lethal: 2000, drawn: 400 },
      money: { seat: 2, to: 0, perPoint: 1000, funds: 500000000 },
      // Akagi may stake double on this hand; Suzuki throws Washizu his winning tile the moment he declares
      skills: [
        { skill: 'allin', gauge: 100 },
        null,
        { skill: 'fortune', gauge: 20 },
        { skill: 'collusion', watch: 2 },
      ],
      hands: 1,
      opening: {
        kind: 'discard',
        scenario: {
          // Akagi draws 5m into a five-sided wait on circles. Yasuoka throws what he draws; Washizu draws
          // the 3m he needs, throws 5m and declares riichi on 2s-5s (2s makes the 234 three-colour
          // straight) - and Suzuki is holding the 2s. Only a 5m single wait catches the riichi tile.
          // Every hand is fixed: Yasuoka's can call nothing Akagi might throw, so the draws stay in order.
          turn: 0, n: 5, dora: '5s',
          hands: { 0: '234m678s2345666p', 1: '118m779p46s23466z', 2: '245m234p34s678s88s', 3: '199m39p112s9s1577z' },
          opaque: { 0: '6p', 2: '8s', 3: '9m' },
          rivers: { 0: '9m1z8m2z9s', 1: '1z5z9m8p2p7s', 2: '1z9p4z7m1m3z', 3: '2z4z6z8p1p7s' },
          draws: ['5m', '9s', '3m'],
        },
        forced: [{ seat: 1, discard: 'drawn' }, { seat: 2, discard: '5m', riichi: true }],
        title: Z('五面听，还是单吊？'),
        prelude: [
          { text: Z('南一局。赤木摸进来的，是一张五万。') },
          { who: 'washizu', emo: 'smug', face: 'sneer', think: true, text: Z('再来一张……只要再来一张三万，就是立直。铃木手里有二索——一发、平和、三色，跳满到手。') },
        ],
        intro: [
          { who: 'ogi', emo: 'hope', face: 'calm', think: true, text: Z('打掉五万，就是一、二、四、五、七筒的五面听……这还用想吗？') },
          { who: 'akagi19', emo: 'cold', face: 'calm', think: true, text: Z('鹫巢的手，透过玻璃看得一清二楚：二四五万，三四索——只差一张三万。') },
          { who: 'akagi19', emo: 'cold', face: 'glare', think: true, text: Z('他摸到三万，立直时打出来的，一定是五万。') },
        ],
        notes: {
          '5m': [
            { who: 'ogi', emo: 'hope', face: 'calm', text: Z('五面听！五种牌，十几张，随便哪张都能和。这就对了。') },
            { who: 'akagi19', emo: 'cold', face: 'calm', think: true, text: Z('五面听……可这十几张牌，鹫巢一张都不会给我。而铃木只要一张二索，就能把他送到我够不着的地方。') },
          ],
          '2p': [
            { who: 'ogi', emo: 'shock', face: 'shock', text: Z('拆掉五面听，去单吊五万？！你疯了吗！') },
            { who: 'akagi19', emo: 'smirk', face: 'smirk', think: true, text: Z('鹫巢立直打出来的那张牌——就是我要的牌。请君入瓮。') },
          ],
          '5p': [
            { who: 'ogi', emo: 'shock', face: 'shock', text: Z('拆掉五面听，去单吊五万？！你疯了吗！') },
            { who: 'akagi19', emo: 'smirk', face: 'smirk', think: true, text: Z('鹫巢立直打出来的那张牌——就是我要的牌。请君入瓮。') },
          ],
          '*': [
            { who: 'ogi', emo: 'worried', face: 'tense', text: Z('那张一打，手就散了……鹫巢可马上就要立直了！') },
          ],
        },
        options: [
          {
            id: 'wide', tiles: '5m',
            after: [{ fx: 'clack', text: Z('五万离开了赤木的手指，横在牌河里，透亮。') }],
          },
          {
            id: 'ambush', tiles: '2p',
            after: [{ fx: 'clack', text: Z('赤木拆掉了五面听。留在手里的，只有一张孤零零的五万。') }],
          },
          {
            id: 'ambush', tiles: '5p',
            after: [{ fx: 'clack', text: Z('赤木拆掉了五面听。留在手里的，只有一张孤零零的五万。') }],
          },
          { id: 'other', tiles: '*' },
        ],
      },
      scores: [26000, 21000, 40000, 13000],          // as the story's East 4 leaves them
      firstDealer: 1,
      startWind: 1,
      startKyoku: 0,
      endWind: 1,
      goal: {
        text: Z('鹫巢立直的那一刻，直接和他打出的牌。'),
        check: final => (final.results || []).some(r => r.type === 'win' && r.winner === 0 && r.loser === 2),
      },
      available: true,
    }),
    Object.assign({}, PROLOGUE, {
      id: 'resolve',
      title: Z('人血麻将'),
      opponent: Z('鹫巢巌——“再抽六百cc，你就死了。”'),
      blurb: Z('第五个半庄。赤木身上已经抽走了一千四百cc，再被抽六百cc就是死。鹫巢押上了他最后的逃命钱。'),
      blood: { seat: 0, from: 2, cc: 100, lethal: 2000, drawn: 1400 },
      money: { seat: 2, to: 0, perPoint: 1000, funds: 286500000 },
      // both partners now feed on riichi; Washizu's luck is coming back to him
      skills: [
        { skill: 'allin', gauge: 50 },
        { skill: 'collusion', watch: 0 },
        { skill: 'fortune', gauge: 30 },
        { skill: 'collusion', watch: 2 },
      ],
      scores: [25000, 25000, 25000, 25000],
      firstDealer: 2,
      startWind: 0,
      endWind: 0,
      goal: {
        text: Z('活着打完东场，并且点数在鹫巢之上。'),
        check: final => !(final.blood && final.blood.dead) && final.scores[0] > final.scores[2],
      },
      available: true,
    }),
    {
      id: 'storm',
      no: 1,
      title: L('The Stormy Night', '嵐の夜', '暴风雨之夜'),
      opponent: L('Ryuzaki and his men', '竜崎とその手下', '龙崎和他的手下'),
      blurb: L(
        'Take over Nangou\'s seat for the South round. He is in last place, and his life is the stake.',
        '南場から、南郷に代わって卓につく。現在ラス目、賭けられているのは彼の命。',
        '从南场开始接替南乡上桌。他目前排在末位，赌注是他的性命。'),
      names: [N.akagi, N.ryuzaki, N.thug, N.lackey],
      who: ['akagi', 'ryuzaki', 'thug', 'lackey'],               // whose voice each seat speaks with
      portraits: ['akagi', 'ryuzaki', 'thug', 'thug:angry'],   // 'id' or 'id:expression'
      // Ryuzaki goes for the kill; his right-hand man plays for him; the hanger-on looks after himself
      ai: [
        null,
        { style: 'aggressor', level: 0.92 },
        { style: 'collaborator', level: 0.8, ally: 1, signal: 0.8 },
        { style: 'independent', level: 0.7 },
      ],
      // Akagi plays this one on nerve alone. Ryuzaki starts watching him after the first hand
      // (see laterEffects below): a watching Insight that keeps him from ever feeding Akagi a win.
      skills: [null, null, null, null],
      opening: {
        scenario: {
          turn: 3, n: 5, dora: '9m',
          hands: { 0: '234567m67p567s88s' },
          rivers: { 0: '4z1p9s2z5z' },
          draws: ['8p'],
          avoid: '5p8p',
        },
        forced: [{ seat: 3, discard: 'drawn' }],
        kind: 'call',
        auto: 'ron',          // as in the story: he takes the cheap win on the very first discard
        title: L('The first winning tile', '最初の当たり牌', '第一张和牌'),
        prelude: [
          { text: L(
            'South 1. Six turns in, the boy had not said a word - and his tiles had quietly come together.',
            '南一局。六巡目。少年は一言も発しないまま——その手は、静かにまとまっていた。',
            '南一局。第六巡。少年一句话也没说——手里的牌却已悄悄成形。') },
          { who: 'nangou', emo: 'shock', face: 'shock', think: true, text: L(
            'He is ready. Already? …And he never declared riichi. Does he even know he can?',
            'テンパイしてる。もう……？　それにリーチもかけていない。かけられると分かってるのか、こいつは。',
            '他听牌了。这么快？……而且没有立直。这小子到底知不知道自己可以立直？') },
        ],
        intro: [
          { fx: 'clack', text: L(
            'Then the lackey\'s discard hit the felt.',
            'そのとき、子分の捨て牌が卓を叩いた。',
            '就在这时，跟班打出的牌落在了桌上。') },
          { who: 'nangou', emo: 'urgent', face: 'shock', text: L(
            'That\'s it - that is your tile! Say it, Akagi. *Ron!*',
            'それだ……それがお前のアガリ牌だ！　言え、赤木。*ロン*だ！',
            '就是它——那是你的和牌！快喊，赤木。*荣*！') },
          { who: 'akagi', emo: 'flat', face: 'calm', text: L(
            '…The cheap side.',
            '……安目か。',
            '……是小的那一边。') },
        ],
        options: [
          {
            id: 'ron',
            label: L('Ron - take the win', 'ロン——アガる', '荣和——拿下这一局'),
            note: [
              { who: 'nangou', emo: 'pleading', face: 'worried', text: L(
                'Take it! A win is a win. Two thousand points, and their dealer turn is gone. Don\'t get greedy on your very first hand.',
                'アガれ！　アガリはアガリだ。二千点、それに奴らの親も流れる。最初の一局から欲をかくな。',
                '和吧！和了就是和了。两千点，还能把他们的庄打掉。第一局就别贪了。') },
            ],
            after: [
              { who: 'akagi', emo: 'flat', face: 'calm', text: L('Ron.', 'ロン。', '荣。') },
            ],
            later: [
              { text: L(
                'Two thousand points changed hands. The lackey clicked his tongue and paid.',
                '二千点が動いた。子分は舌打ちして、点棒を払った。',
                '两千点易手。跟班咂了下嘴，付了点棒。') },
              { who: 'ryuzaki', emo: 'wary', face: 'irritated', text: L(
                '…He was ready, and he sat there without a sound. No riichi. No tell. That is not beginner\'s luck.',
                '……テンパイしてやがったのに、音ひとつ立てなかった。リーチもなし、気配もなし。ありゃあ素人のまぐれじゃねえ。',
                '……他早就听牌了，却一点声息都没有。不立直，不露破绽。这可不是新手的运气。') },
              { who: 'ryuzaki', emo: 'threat', face: 'smug', text: L(
                'Fine. From here on I watch every tile that kid touches.',
                'いいだろう。ここからは、あのガキが触る牌を、一枚残らず見てやる。',
                '行。从现在起，那小鬼摸的每一张牌，我都要盯死。') },
            ],
            laterEffects: [{ grant: { seat: 1, skill: 'insight', gauge: 50, watch: 0 } }],
          },
        ],
      },
      scores: [22000, 29000, 25000, 24000],
      firstDealer: 2,
      startWind: 1,
      endWind: 1,
      goal: {
        text: L(
          'Finish the South round in 2nd place or better.',
          '南場終了時に2着以上になる。',
          '南场结束时取得第2名以上。'),
        check: final => final.place[0] <= 2,
      },
      available: true,
    },
    {
      id: 'swap',
      no: 2,
      langs: ['zh'],
      title: Z('瞒天过海'),
      opponent: Z('龙崎和他的手下——门外来了警察'),
      blurb: Z('赤木的第一个半庄，南二局。手里三副三元牌对子，别人打出的三元牌他一张也没碰。就在这时，警察找上了门。'),
      names: [N.akagi, N.ryuzaki, N.thug, N.lackey],
      who: ['akagi', 'ryuzaki', 'thug', 'lackey'],
      portraits: ['akagi', 'ryuzaki', 'thug', 'thug:angry'],
      ai: [
        null,
        { style: 'aggressor', level: 0.92 },
        { style: 'collaborator', level: 0.8, ally: 1, signal: 0.8 },
        { style: 'independent', level: 0.7 },
      ],
      // everyone is looking at the door: for this one turn nobody is watching the tiles
      skills: [{ skill: 'sleight', gauge: 100 }, null, null, null],
      hands: 1,
      pause: { seat: 0, discards: 1 },       // the police come in once he has thrown this tile
      opening: {
        kind: 'scene',
        scenario: {
          // the anime's hand: three dragon pairs, 8p, 2m, 3m and a single West - seven pairs, ready
          // on West. He let the red, the green and the white dragon go by; so are an 8p.
          turn: 0, n: 7, dora: '1p',
          hands: { 0: '2233m88p3556677z' },
          rivers: { 0: '1m9p4z2s1s9m8s' },
          discarded: { 1: '7z8p', 2: '6z', 3: '5z' },
          draws: ['9s'],
          avoid: '3z',
        },
        prelude: [
          { text: Z('南二局。门外忽然有人自称是警察——牌桌边的每一个人，都转过头去望着门口。') },
          { who: 'akagi', emo: 'cold', face: 'calm', think: true, text: Z('白板、发财、红中……手里各有一对，牌河里也各躺着一张。') },
        ],
        intro: [
          { who: 'akagi', emo: 'smirk', face: 'smirk', think: true, text: Z('现在，没有人在看牌。') },
          { note: Z('【移花接木】轮到你时，可以把手里的任意一张牌，与任意一家牌河里的一张牌互换。每换一次消耗四分之一的怒气——现在可以换四次。警察随时会进门：打出这一张牌之前，做成三倍役满的听牌（大三元＋四暗刻单骑）。') },
        ],
      },
      scores: [17800, 30200, 27000, 25000],    // the East round cost him 7,200
      firstDealer: 1,
      startWind: 1,
      startKyoku: 1,
      endWind: 1,
      goal: {
        text: Z('警察进门之前，用移花接木做成三倍役满的听牌：大三元＋四暗刻单骑。'),
        check: final => (final.results || []).some(r => r.type === 'pause' && r.seat === 0 && r.yakuman >= 3),
      },
      available: true,
    },
    {
      id: 'witness',
      no: 3,
      langs: ['zh'],
      title: Z('借刀杀人'),
      opponent: Z('龙崎和他的手下——刑警坐在一旁'),
      blurb: Z('不在场证明蒙混过关，牌局重新开始。牌河里少了那么多牌，只要有人稍一留神……'),
      names: [N.akagi, N.ryuzaki, N.thug, N.lackey],
      who: ['akagi', 'ryuzaki', 'thug', 'lackey'],
      portraits: ['akagi', 'ryuzaki', 'thug', 'thug:angry'],
      ai: [
        null,
        { style: 'aggressor', level: 1 },
        { style: 'collaborator', level: 0.8, ally: 1, signal: 0.8 },
        { style: 'independent', level: 0.7 },
      ],
      // Akagi: the moment of confusion. Ryuzaki: his eye on Akagi, since chapter 1. The round-glasses
      // man: one more look at the ponds and he will see that tiles have been switched.
      skills: [
        { skill: 'confusion', gauge: 100 },
        { skill: 'insight', gauge: 80, watch: 0 },
        { skill: 'notice', gauge: 96, watch: 0 },
        null,
      ],
      hands: 1,
      opening: {
        kind: 'choice',
        scenario: {
          // the same hand after the swap: Akagi waits on West alone; the 2m and 3m he slipped into
          // the ponds lie where the dragons and the 8p were. Ryuzaki draws 8s, which leaves his own
          // West the one useless tile in his hand.
          turn: 1, n: 7, dora: '1p',
          hands: { 0: '888p3555666777z', 1: '345m456p678s23s8s3z' },
          rivers: { 0: '1m9p4z2s1s9m8s9s', 1: '1z2m9s4s3m2z1p' },      // as the chapter 3 table shows them
          discarded: { 2: '2m', 3: '3m' },
          draws: ['8s'],
          avoid: '3z',
        },
        title: Z('重开牌局的时机'),
        intro: [
          { who: 'akagi', emo: 'flat', face: 'calm', text: Z('那么，我们继续吧。') },
          { who: 'nangou', emo: 'worried', face: 'worried', think: true, text: Z('牌河里少了那么多牌……只要谁稍微留神看一眼，马上就会露馅。') },
        ],
        options: [
          {
            id: 'now',
            label: Z('浑水摸鱼——现在就开局'),
            desc: Z('趁所有人的心思还在刑警身上，马上让牌局继续。'),
            note: [
              { who: 'nangou', emo: 'urgent', face: 'shock', think: true, text: Z('对……就是现在。大家的心思还没回到牌桌上——这是一片混乱的时刻。') },
            ],
            effects: [{ fire: { seat: 0 } }],
          },
          {
            id: 'wait',
            label: Z('等风头过去再说'),
            desc: Z('先让刑警的事平息下来，再慢慢地打。'),
            note: [
              { who: 'nangou', emo: 'alarm', face: 'shock', think: true, text: Z('不行……等大家回过神来，谁都会发现牌河不对劲！') },
            ],
            effects: [{ gauge: { seat: 1, set: 100 } }],
          },
        ],
      },
      scores: [17800, 30200, 27000, 25000],
      firstDealer: 1,
      startWind: 1,
      startKyoku: 1,
      endWind: 1,
      goal: {
        text: Z('趁大家还没回过神来，以三倍役满和牌：大三元＋四暗刻单骑。'),
        check: final => (final.results || []).some(r => r.type === 'win' && r.winner === 0 && r.score.yakuman >= 3),
      },
      available: true,
    },
    /*
     * Chapters 4-6 (js/data/chapter4.js) follow the anime's second episode: rounds six to eight of the
     * night. The hands the episode shows are played out in the chapters themselves; these three matches
     * are what lies between them.
     */
    {
      id: 'reading',
      no: 4,
      langs: ['zh'],
      title: Z('见微知著'),
      opponent: Z('龙崎和他的手下——第六回战'),
      blurb: Z('第六回战，南三局。龙崎落后六千六百点，一把满贯就能翻过来。可他一立直，就会低头确认自己听的牌——那一眼，赤木看得清清楚楚。'),
      names: [N.akagi, N.ryuzaki, N.thug, N.lackey],
      who: ['akagi', 'ryuzaki', 'thug', 'lackey'],
      portraits: ['akagi', 'ryuzaki', 'thug', 'thug:angry'],
      ai: [
        null,
        { style: 'aggressor', level: 0.95 },
        { style: 'collaborator', level: 0.8, ally: 1, signal: 0.6 },
        { style: 'independent', level: 0.7 },
      ],
      // Akagi: the ponds speak to him (Insight, full), and Ryuzaki's eyes give his riichi away (the
      // story effect `sense`, set by the opening). Ryuzaki has nothing left but his temper.
      skills: [{ skill: 'insight', gauge: 100 }, null, null, null],
      opening: {
        kind: 'scene',
        prelude: [
          { text: Z('南三局。赤木三万六千八百，龙崎三万零二百——相差六千六百点。') },
          { who: 'ryuzaki', emo: 'irritated', face: 'irritated', think: true, text: Z('六千六百点……一把满贯直击，就能翻过来。这两局，说什么也要拿下。') },
          { who: 'akagi', emo: 'cold', face: 'calm', think: true, text: Z('这个人一立直，就会低头看一眼自己的手牌。眼睛往哪边走，听的就是哪一门。') },
        ],
        effects: [{ sense: { seat: 0, target: 1 } }],
        intro: [
          { note: Z('【见微知著】龙崎一立直，他听的牌就会显示在他的名字旁边，你手里会放铳的牌也会标红。【洞若观火】怒气已满：发动后，这一局里所有对手的听牌都一览无余。') },
        ],
      },
      scores: [36800, 30200, 16000, 17000],     // as the chapter's South 2 leaves them
      firstDealer: 0,
      startWind: 1,
      startKyoku: 2,
      endWind: 1,
      goal: {
        text: Z('打完南场时，点数在龙崎之上。'),
        check: final => final.scores[0] > final.scores[1],
      },
      available: true,
    },
    {
      id: 'firewood',
      no: 5,
      langs: ['zh'],
      title: Z('釜底抽薪'),
      opponent: Z('龙崎和他的手下——矢木在一旁看着'),
      blurb: Z('第七回战，南三局。赤木领先两万三千点。对面要翻盘，只能做大牌——那就把他们要的牌，一张一张攥在自己手里。'),
      names: [N.akagi, N.ryuzaki, N.thug, N.lackey],
      who: ['akagi', 'ryuzaki', 'thug', 'lackey'],
      portraits: ['akagi', 'ryuzaki', 'thug', 'thug:angry'],
      ai: [
        null,
        { style: 'aggressor', level: 0.9 },
        { style: 'independent', level: 0.8 },       // the half-game has been given up: nobody feeds the boss any more
        { style: 'independent', level: 0.8 },
      ],
      // Akagi takes the tiles they need out of the wall; Ryuzaki, far behind, can only wait for his luck to turn
      skills: [{ skill: 'starve', gauge: 100 }, { skill: 'flow', gauge: 30 }, null, null],
      opening: {
        kind: 'scene',
        prelude: [
          { text: Z('南三局。赤木四万七千点，第二名的龙崎两万四千。') },
          { who: 'yagi', emo: 'cold', face: 'focus', think: true, text: Z('这个半庄已经没救了。我要看的，是这小鬼在领先的时候怎么打。') },
          { who: 'akagi', emo: 'cold', face: 'calm', think: true, text: Z('领先的时候，用不着自己和牌。让他们和不了，就够了。') },
        ],
        intro: [
          { note: Z('【釜底抽薪】怒气已满。发动后直到这一局结束：看穿所有对手；接下来摸的三张牌，是对手正在等的牌——抢在他们前面摸走；他们自己也再摸不到要和的那张。注意：摸来的牌打出去就会放铳，标红的牌要留在手里。') },
        ],
      },
      scores: [47000, 24000, 14000, 15000],
      firstDealer: 2,          // South 3 is Akagi's deal, South 4 Ryuzaki's
      startWind: 1,
      startKyoku: 2,
      endWind: 1,
      goal: {
        text: Z('一次也不放铳，并以头名打完南场。'),
        check: final => final.place[0] === 1 && !(final.results || []).some(r => r.type === 'win' && r.loser === 0),
      },
      available: true,
    },
    {
      id: 'yagi',
      no: 6,
      langs: ['zh'],
      title: Z('欲擒故纵'),
      opponent: Z('代打·矢木——差马：一根手指十万'),
      blurb: Z('第八回战，东一局。矢木抢先立直，要看的是赤木的反应。赤木也听牌了——可手指已经押在了桌上。'),
      names: [N.akagi, N.yagi, N.thug, N.lackey],
      who: ['akagi', 'yagi', 'thug', 'lackey'],
      portraits: ['akagi', 'yagi', 'thug', 'thug:angry'],
      // the hired man plays his own game; the two who stayed at the table play for him
      ai: [
        null,
        { style: 'independent', level: 0.9 },
        { style: 'collaborator', level: 0.8, ally: 1, signal: 0.6 },
        { style: 'independent', level: 0.7 },
      ],
      // Yagi's riichi is the stick in the grass: it goes off as the hand opens, and Akagi's Insight is
      // dark until he shows that it has not shaken him
      skills: [{ skill: 'insight', gauge: 100 }, { skill: 'probe', gauge: 100, watch: 0 }, null, null],
      hands: 1,
      opening: {
        kind: 'discard',
        scenario: {
          // the anime's hand. Yagi: 345m 234p 99p 3456s 8s, riichi on the closed 7s; his pond has the 7m he
          // threw on his second turn. Akagi (the dealer) draws 6p: throwing 6m leaves 4m-7m, the 9s and 4p
          // are safe and break the hand, the 7s deals in. Everybody's hand is fixed, so the draws stay in
          // order: the 4m comes to Akagi next turn.
          turn: 0, n: 7, dora: '1m',
          hands: { 0: '566m23445p78999s', 1: '345m234p99p34568s', 2: '1289m1178p12s336z', 3: '2278m6788p1267s7z' },
          rivers: { 0: '1p2z1m4z3z6z1s', 1: '7z7m6z4p9s3m4z', 2: '9p2z5z8s4z9m1z', 3: '9p1z9m3z5z2z1m' },
          riichi: { 1: 6 },
          draws: ['6p', '1z', '2z', '5z', '4m'],
        },
        forced: [{ seat: 1, discard: 'drawn' }, { seat: 2, discard: 'drawn' }, { seat: 3, discard: 'drawn' }],
        effects: [{ fire: { seat: 1 } }],
        title: Z('矢木的立直：信自己的读牌，还是退？'),
        prelude: [
          { text: Z('第八回战，东一局。矢木几乎没有停顿，就把一张牌横着放了下去。') },
          { who: 'yagi', emo: 'smirk', face: 'smile', text: Z('立直。') },
          { who: 'yasuoka', emo: 'wary', face: 'suspicious', think: true, text: Z('嵌张听牌就立直？照理该等它变成两面……这是抢跑。他要看的，是赤木的反应。') },
        ],
        intro: [
          { text: Z('赤木摸进了六筒。他也听牌了。') },
          { who: 'nangou', emo: 'worried', face: 'worried', think: true, text: Z('听牌是听牌了……可那是代打的立直，押着的是手指啊。') },
          { who: 'akagi', emo: 'cold', face: 'calm', think: true, text: Z('他的牌河里，七万是第二巡就打掉的。') },
        ],
        notes: {
          '6m': [
            { who: 'yasuoka', emo: 'wary', face: 'suspicious', think: true, text: Z('换作之前的赤木，会认定第二巡那张七万的周围是安全区，打出六万。可现在押上了东西——他还信得过自己的读牌吗？') },
            { who: 'akagi', emo: 'cold', face: 'glare', think: true, text: Z('七万那一带，他不要。六万过得去。') },
          ],
          '7s': [
            { who: 'nangou', emo: 'alarm', face: 'shock', text: Z('那张不行！索子的中张，矢木一张都还没打过！') },
          ],
          '9s': [
            { who: 'nangou', emo: 'pleading', face: 'worried', text: Z('九索是他自己打过的牌，绝对安全。押着手指呢，这里就退一步吧。') },
            { who: 'akagi', emo: 'cold', face: 'calm', think: true, text: Z('退了，手就散了。心往软弱的那一边流——他要看的，就是这个。') },
          ],
          '4p': [
            { who: 'nangou', emo: 'pleading', face: 'worried', text: Z('四筒是他自己打过的牌，绝对安全。押着手指呢，这里就退一步吧。') },
            { who: 'akagi', emo: 'cold', face: 'calm', think: true, text: Z('退了，手就散了。心往软弱的那一边流——他要看的，就是这个。') },
          ],
          '*': [
            { who: 'nangou', emo: 'worried', face: 'worried', text: Z('那张既不安全，又把听牌拆了……两头落空啊。') },
          ],
        },
        options: [
          {
            id: 'trust', tiles: '6m', when: 'win',
            after: [
              { fx: 'clack', text: Z('六万落在了牌河里。没有半点犹豫。') },
              { who: 'yagi', emo: 'wary', face: 'focus', think: true, text: Z('……连眼皮都没动一下。') },
            ],
            effects: [{ steady: { seat: 0 } }],
            later: [
              { who: 'yasuoka', emo: 'amused', face: 'wry', think: true, text: Z('不愧是从胆小鬼赛车里活下来的人。光是这干脆利落的一打，就已经是常人一辈子也到不了的地方。') },
              { text: Z('矢木想用压力把赤木压垮的算盘，完全落了空。') },
            ],
          },
          {
            id: 'deal', tiles: '7s',
            after: [{ fx: 'clack', text: Z('七索离开了赤木的手指。') }],
            later: [
              { who: 'yagi', emo: 'smug', face: 'smile', text: Z('嵌七索。小弟弟，一根手指可不便宜。') },
              { who: 'nangou', emo: 'gloomy', face: 'worried', think: true, text: Z('偏偏就是那一张……') },
            ],
          },
          {
            id: 'fold', tiles: '*',
            after: [
              { text: Z('赤木的手离开了听牌的形状。') },
              { who: 'yagi', emo: 'smug', face: 'smile', think: true, text: Z('退了。——到底还是个孩子。') },
            ],
          },
        ],
      },
      scores: [25000, 25000, 25000, 25000],
      firstDealer: 0,
      startWind: 0,
      endWind: 0,
      goal: {
        text: Z('不退、不放铳——拿下东一局。'),
        check: final => (final.results || []).some(r => r.type === 'win' && r.winner === 0),
      },
      available: true,
    },
    {
      id: 'ichikawa', no: 7, available: false,
      title: L('The Blind Master', '盲目の達人', '盲眼高手'),
      opponent: L('Ichikawa', '市川', '市川'),
    },
    {
      id: 'urabe', no: 8, available: false,
      title: L('The Impostor\'s Table', 'ニセモノの卓', '冒牌货的牌桌'),
      opponent: L('Urabe', '浦部', '浦部'),
    },
    {
      id: 'washizu', no: 9, available: false,
      title: L('The Transparent Tiles', '透明な牌', '透明的牌'),
      opponent: L('Washizu', '鷲巣', '鹫巢'),
    },
  ];

  const byId = {};
  STAGES.forEach(s => { byId[s.id] = s; });

  root.Stages = {
    list: STAGES,
    get: id => byId[id],
    /** a stage is unlocked when every earlier stage has been cleared */
    isUnlocked(id, save) {
      for (const s of STAGES) {
        if (s.id === id) return !!s.available;
        if (s.free) continue;                 // a prologue stage is always open and never in the way
        if (!save.cleared[s.id]) return false;
      }
      return false;
    },
    next(id) {
      const i = STAGES.findIndex(s => s.id === id);
      const n = STAGES[i + 1];
      return n && n.available ? n : null;
    },
  };
})(typeof window !== 'undefined' ? window : globalThis);
