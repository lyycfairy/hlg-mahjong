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
 *                  style   'aggressor' | 'collaborator' | 'independent' - chosen to fit the story
 *                  level   0..1 playing strength
 *                  ally    (collaborator) the seat he plays for;  signal  how reliably they pass signals;
 *                          feed  how readily he gives a big hand to the ally
 *   skills       one entry per seat: { skill: 'insight' | 'flow', gauge: starting rage } or null;
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
 *
 *   hands        play only this many hands (the match ends after them)
 *   startKyoku   hand of the start wind to begin on (0 = the first; South 2 is startWind 1, startKyoku 1)
 *   langs        the languages a stage has been written in, when not all three (others show it in Chinese)
 *
 * The opening `kind` may also be 'scene': no decision - the prelude plays when the hand appears,
 * the intro when the player's first turn comes, and then the hand is played normally - or 'choice':
 * a plain decision from the story (options [{ id, label, desc, note, effects }]) shown before anyone
 * moves. An effect { fire: { seat } } sets that seat's skill off at once.
 *   pause        { seat, discards }: the hand stops once that seat has made that many discards (a scene
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
  };

  const STAGES = [
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
    {
      id: 'yagi',
      no: 4,
      title: L('The Substitute', '代打ち', '李代桃僵'),
      opponent: L('Yagi, the house professional', '代打ちの玄人・矢木', '职业代打·矢木'),
      blurb: L(
        'The yakuza send in a man who plays for a living. An East-round duel on even points.',
        'ヤクザが送り込んだのは、麻雀で飯を食う男。持ち点は同じ、東場一回の勝負。',
        '黑道派来了一个靠麻将吃饭的男人。点数相同，东场一战定胜负。'),
      names: [N.akagi, N.yagi, N.ryuzaki, N.thug],
      who: ['akagi', 'yagi', 'ryuzaki', 'thug'],
      portraits: ['akagi', 'yagi', 'ryuzaki', 'thug'],
      // the hired professional trusts nobody and plays his own game; Ryuzaki, who is paying
      // for him, feeds him; the thug just swings
      ai: [
        null,
        { style: 'independent', level: 0.88 },
        { style: 'collaborator', level: 0.8, ally: 1, signal: 0.4, feed: 0.1 },
        { style: 'aggressor', level: 0.6 },
      ],
      skills: [{ skill: 'insight', gauge: 60 }, { skill: 'insight', gauge: 0 }, null, { skill: 'flow', gauge: 0 }],
      opening: {
        scenario: {
          turn: 0, n: 8, dora: '9s',
          hands: { 0: '34578m2456p1167s', 1: '45699m13p234678s' },
          rivers: { 0: '1z9p3z9s6z1m7z2s', 1: '4z9p1s5z2m8m5p3z' },
          riichi: { 1: 6 },
          draws: ['8s'],
          avoid: '2p',
        },
        kind: 'discard',
        title: L('The professional\'s riichi', '玄人のリーチ', '职业高手的立直'),
        prelude: [
          { text: L(
            'East 1. Yagi had laid a tile sideways without raising his voice.',
            '東一局。矢木は声を張ることもなく、牌を横に置いていた。',
            '东一局。矢木连声音都没抬高，就把一张牌横着放了下去。') },
          { who: 'yagi', emo: 'smirk', face: 'smile', text: L(
            'Riichi. Take your time, boy.',
            'リーチ。ゆっくり考えな、坊や。',
            '立直。慢慢想吧，小弟弟。') },
        ],
        intro: [
          { who: 'nangou', emo: 'worried', face: 'worried', think: true, text: L(
            'A professional\'s riichi… and Akagi has just drawn into a ready hand of his own.',
            '玄人のリーチ……しかも赤木は、いまのツモで自分もテンパイだ。',
            '职业高手的立直……而赤木刚摸的这张，让他自己也听牌了。') },
          { text: L(
            'To be ready, the two of circles has to go.',
            'テンパイに取るには、二筒を切るしかない。',
            '要听牌，就必须打出二筒。') },
        ],
        notes: {
          '2p': [
            { who: 'nangou', emo: 'teach', face: 'resolve', text: L(
              'He threw the five of circles himself when he declared. The two is suji - a two-sided wait cannot hit it. It should be safe, and it makes you ready.',
              '奴はリーチのとき、自分で五筒を切ってる。二筒はスジだ——両面待ちには当たらない。通るはずだし、これでテンパイだ。',
              '他立直时自己打了五筒。二筒是筋牌——两面听不会和这张。应该能过，而且打了就听牌。') },
            { who: 'akagi', emo: 'cold', face: 'calm', think: true, text: L(
              '"Should be." That is exactly the word he wants me to lean on.',
              '「はず」……か。奴がオレに寄りかからせたいのは、まさにその言葉だ。',
              '“应该”……他想让我依靠的，正是这两个字。') },
          ],
          '1s': [
            { who: 'nangou', emo: 'worried', face: 'worried', text: L(
              'The one of bamboo - he discarded it himself, so it cannot deal in. But that is your dora pair. Throw it and this hand is worth nothing.',
              '一索か。奴自身が切ってるから、絶対に当たらない。だがそれはお前のドラの対子だ。切れば、この手の値打ちは消える。',
              '一索——他自己打过，绝对不会放铳。但那是你的宝牌对子。打掉它，这手牌就不值钱了。') },
          ],
          '*': [
            { who: 'nangou', emo: 'worried', face: 'worried', text: L(
              'That one breaks up the hand. If you are going to step back, at least make sure the tile is safe.',
              'それを切れば手が崩れる。下がるなら、せめて安全な牌で下がれ。',
              '打那张，手牌就散了。要退的话，至少得退在安全牌上。') },
          ],
        },
        options: [
          {
            id: 'trap', tiles: '2p',
            after: [
              { fx: 'clack', text: L(
                'The two of circles left his fingers.',
                '二筒が、指を離れた。',
                '二筒离开了他的手指。') },
            ],
            later: [
              { text: L(
                'Yagi\'s tiles came down: a closed wait on the two of circles - baited with the five he had thrown himself.',
                '矢木の手牌が倒された。二筒のカンチャン待ち——自分で切った五筒を餌にした罠だ。',
                '矢木的手牌倒了下来：嵌张听二筒——用他自己打出的五筒做的饵。') },
              { who: 'nangou', emo: 'shock', face: 'shock', text: L(
                'A suji trap…! He threw the five *so that* you would trust the two!',
                'スジ引っかけ……！　二筒を信用させる*ために*、五筒を切ったのか！',
                '筋牌陷阱……！他打五筒，*就是为了*让你相信二筒！') },
              { who: 'akagi', emo: 'amused', face: 'smirk', text: L(
                'I see. So that is how you think.',
                'なるほど。あんたは、そういう考え方をするんだ。',
                '原来如此。你是这样想事情的。') },
              { who: 'akagi', emo: 'cold', face: 'glare', think: true, text: L(
                'Then I only have to think one layer deeper than that.',
                'なら、その一枚奥を読めばいいだけのことだ。',
                '那我只要比这再多想一层就行了。') },
            ],
            laterEffects: [{ gauge: { seat: 0, set: 100 } }, { sense: { seat: 0, target: 1 } }],
          },
          {
            id: 'safe', tiles: '*',
            after: [
              { text: L(
                'The boy\'s hand stopped over the two of circles - and moved on to another tile.',
                '少年の手は二筒の上で止まり——別の牌へと移った。',
                '少年的手在二筒上方停住——然后移向了另一张牌。') },
              { who: 'yagi', emo: 'amused', face: 'focus', text: L(
                '…Hoh. You didn\'t bite.',
                '……ほう。食いつかなかったか。',
                '……哦。没上钩啊。') },
              { who: 'yagi', emo: 'cold', face: 'focus', think: true, text: L(
                'Not an amateur, then. Enough playing with him.',
                '素人じゃないな。遊びは、ここまでにしよう。',
                '看来不是外行。不陪他玩了。') },
            ],
            effects: [{ gauge: { seat: 1, add: 60 } }],
          },
        ],
      },
      scores: [25000, 25000, 25000, 25000],
      firstDealer: 3,
      startWind: 0,
      endWind: 0,
      goal: {
        text: L(
          'Finish the East round with more points than Yagi.',
          '東場終了時に、矢木より多くの点数を持っている。',
          '东场结束时，点数高于矢木。'),
        check: final => final.scores[0] > final.scores[1],
      },
      available: true,
    },
    {
      id: 'ichikawa', no: 5, available: false,
      title: L('The Blind Master', '盲目の達人', '盲眼高手'),
      opponent: L('Ichikawa', '市川', '市川'),
    },
    {
      id: 'urabe', no: 6, available: false,
      title: L('The Impostor\'s Table', 'ニセモノの卓', '冒牌货的牌桌'),
      opponent: L('Urabe', '浦部', '浦部'),
    },
    {
      id: 'washizu', no: 7, available: false,
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
