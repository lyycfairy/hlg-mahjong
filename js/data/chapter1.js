/*
 * Story scripts, in English, Japanese and Chinese.
 *
 * The dialogue here is an original retelling written for this fan game -
 * it follows the events of the opening of "Akagi" but does not reproduce
 * the manga's or anime's text in any of the three languages.
 *
 * Every piece of text is written as L(english, japanese, chinese).
 *
 * Script commands (one object per step, keys may be combined):
 *   { card: L(...), sub: L(...) }            full-screen title card
 *   { bg: 'black' | 'city' | 'parlor' | 'doorway' | 'table' | 'pier' }
 *                                            change backdrop (js/assets.js lists them)
 *   { show: 'akagi', at: 'left|center|right', face: 'smirk' }
 *                                            bring a character on, or change the expression of one
 *                                            already on screen (faces are listed in characters.js)
 *   { hide: 'akagi' | 'all' }
 *   { text: L(...) }                         narration
 *   { who: 'nangou', text: L(...) }          spoken line; add face: '...' to change expression
 *   { who: 'nangou', think: true, text }     inner monologue
 *   emo: 'afraid'                          on a spoken line: the mood the recorded voice should act
 *                                            (presets in tools/generate_voices.py: cold, smirk, menace,
 *                                            worried, afraid, shock, joy, smug, mock, ...). The game ignores it.
 *   { fx: 'thunder' | 'zawa' | 'shake' | 'clack' }
 *   { choice: [{ text: L(...), goto }] }     { label: 'x' }   { goto: 'x' }
 *   { table: {...} }                         lay a mahjong table out behind the text: every pond, the
 *                                            dora and one player's hand (format below); { table: false }
 *                                            clears it. Add won: '8m' to show the hand won on that tile.
 *   { decide: { title, flag, notes, options } }
 *                                            a discard that matters: the hand on the table becomes
 *                                            clickable and each tile shows where it leads - ready or not,
 *                                            waits, value, danger - worked out by js/mahjong/analysis.js.
 *                                            notes   { '7p': [lines], '*': [lines] }  commentary per tile
 *                                                    (shown, and spoken by js/voice.js)
 *                                            options [{ id, tiles: '7p' | '*', goto }]  branch per tile
 *                                            flag    remembers the chosen option id for { branch }
 *   { battle: 'stageId', win: 'label', lose: 'label' }
 *                                            afterwards the flag 'opening' holds what the player chose
 *                                            at the stage's opening decision (see js/data/stages.js)
 *   { branch: 'flag', to: { value: 'label', '*': 'label' } }
 *   { end: true }
 * Use *asterisks* for emphasis inside text.
 *
 * A table: { me, dealer, roundWind, kyoku, dora, wall,
 *            seats: [{ who, name, score, hand, draw, river, riichi }] }
 * Tiles are written like '34567m234p4566s7p'; `river` is in the order discarded and `riichi`
 * is the index of the discard that declared it. Seat numbers match the battle screen (the
 * player's chair is 0). The engine checks every table (no tile more than four times).
 */
(function (root) {
  'use strict';

  const L = (en, ja, zh) => ({ en, ja, zh });
  const DOTS = L('…', '……', '……');

  /*
   * East 4, the last hand before Akagi sits down. Ryuzaki is the dealer and has
   * just declared riichi; Nangou, in the chair Akagi will take, draws the tile
   * that makes him ready - if he throws the seven of circles.
   * The scores are the ones that leave the table at 22,000 / 29,000 / 25,000 /
   * 24,000 once this hand is won, which is where Stage 1 starts.
   */
  const THUG = L('Thug', 'チンピラ', '打手');
  const LACKEY = L('Lackey', '子分', '跟班');
  const table = (nangou, ryuzaki, thug, lackey, wall) => ({
    me: 0, dealer: 1, roundWind: 0, kyoku: 3, dora: '5s', wall,
    seats: [
      Object.assign({ who: 'nangou' }, nangou),
      Object.assign({ who: 'ryuzaki', riichi: 8, score: 35000 }, ryuzaki),
      Object.assign({ who: 'thug', name: THUG, score: 28000 }, thug),
      Object.assign({ who: 'thug', name: LACKEY, score: 27000 }, lackey),
    ],
  });
  // Nangou has drawn the three of bamboo
  const T_DRAW = table(
    { hand: '34567m234p4566s7p', draw: '3s', river: '1z9p3z1s6z9m2z1m', score: 9000 },
    { river: '4z1s9m5z3m8s1p2s9s' }, { river: '9p1z7z1m9s2z8p1s5z' }, { river: '1z3z9m1p6z9p2z8s7z' }, 34);
  // the seven of circles is on the table, sideways
  const T_PUSH = table(
    { hand: '34567m234p34566s', river: '1z9p3z1s6z9m2z1m7p', riichi: 8, score: 8000 },
    { river: '4z1s9m5z3m8s1p2s9s' }, { river: '9p1z7z1m9s2z8p1s5z' }, { river: '1z3z9m1p6z9p2z8s7z' }, 34);
  // two turns later
  const T_WIN = table(
    { hand: '34567m234p34566s', river: '1z9p3z1s6z9m2z1m7p9s', riichi: 8, score: 8000 },
    { river: '4z1s9m5z3m8s1p2s9s6z4s' }, { river: '9p1z7z1m9s2z8p1s5z3p6p' }, { river: '1z3z9m1p6z9p2z8s7z4z7s' }, 26);

  const chapter1 = {
    id: 'ch1',
    no: 1,
    title: L('The Stormy Night', '嵐の夜', '暴风雨之夜'),
    summary: L(
      '1958. A man gambles his life in a back-room mahjong game - and a boy walks in from the rain.',
      '昭和三十三年。雀荘の奥で命を賭ける男のもとへ、雨の中から少年が現れる。',
      '1958年。一个男人在麻将馆的里屋赌上了性命——这时，一个少年从雨中走了进来。'),
    available: true,
    banner: 'bg/doorway.jpg',   // picture shown on the chapter card
    script: [
      { bg: 'black' },
      { card: L('Chapter 1', '第一章', '第一章'), sub: L('The Stormy Night', '嵐の夜', '暴风雨之夜') },

      /* ------------------------------------------------ the storm */
      { bg: 'city', fx: 'thunder' },
      { text: L(
        '1958. Thirteen years since the war ended.',
        '昭和三十三年。終戦から十三年。',
        '1958年。战争结束已有十三年。') },
      { text: L(
        'The country was climbing back onto its feet. But in the cracks where the light never reached, another Japan went on breathing.',
        'この国は、ようやく立ち直ろうとしていた。だが光の届かない裂け目では、もうひとつの日本が息づいていた。',
        '这个国家正重新站起来。但在光照不到的缝隙里，另一个日本仍在呼吸。') },
      { text: L(
        'That night, a storm was tearing at the city.',
        'その夜、嵐が街を引き裂いていた。',
        '那一夜，暴风雨撕扯着整座城市。') },
      { text: L(
        'And in the back room of a cramped mahjong parlor, a man was gambling with the only thing he had left.',
        '狭い雀荘の奥の一室で、ひとりの男が、残された最後のものを賭けていた。',
        '在一家狭小麻将馆的里屋，一个男人正押上他仅剩的东西。') },

      /* ------------------------------------------------ the back room */
      { bg: 'parlor', show: 'nangou', at: 'left', face: 'worried' },
      { who: 'nangou', emo: 'gloomy', think: true, text: L(
        'Three million yen.',
        '三百万円。',
        '三百万日元。') },
      { who: 'nangou', emo: 'gloomy', think: true, text: L(
        'That is what I owe these people. More than I could earn in ten lifetimes of honest work.',
        'それが、この連中への借金だ。まっとうに働いたんじゃ、十回生まれ変わっても返せやしない。',
        '这就是我欠这帮人的债。老老实实干活，十辈子也挣不来。') },
      { who: 'nangou', emo: 'gloomy', think: true, text: L(
        'So tonight I put up the one stake I still had. Win, and the debt disappears. Lose… and my life insurance pays it for me.',
        'だから今夜、最後に残った賭け金を張った。勝てば借金は帳消し。負ければ……生命保険が、代わりに払ってくれる。',
        '所以今晚，我押上了最后的赌注。赢了，债务一笔勾销。输了……就由我的人寿保险来替我还。') },
      { show: 'ryuzaki', at: 'right', face: 'smug' },
      { who: 'ryuzaki', emo: 'smug', text: L(
        'Your discard, Nangou. Don\'t keep us waiting. The night isn\'t getting any younger — and neither are you.',
        'あんたの番だぜ、南郷さん。待たせるなよ。夜は短い……あんたの残り時間もな。',
        '该你打了，南乡。别让我们等。夜不长了——你剩下的时间也一样。') },
      { hide: 'ryuzaki' },
      { bg: 'table' },
      { who: 'nangou', emo: 'gloomy', think: true, text: L(
        'Hand after hand, and I haven\'t won anything worth counting. The points are bleeding out of me.',
        '何局打っても、まともなアガリひとつない。点棒が、血のように流れ出ていく。',
        '一局接一局，连一把像样的牌都没和过。点棒像血一样往外流。') },
      { who: 'nangou', emo: 'pleading', think: true, text: L(
        'The flow. Something has to change the flow. Anything. Otherwise—',
        '流れだ。何かが、この流れを変えてくれなきゃ。何でもいい。でなければ——',
        '是牌运的流向。必须有什么来改变这个流向。什么都好。否则——') },
      { fx: 'zawa' },
      { text: L(
        'Tile by tile, the wall grew shorter. So did the time he had left.',
        '一枚、また一枚と、牌山は短くなっていく。男に残された時間も、同じように。',
        '一张又一张，牌山越来越短。他剩下的时间，也是如此。') },
      { who: 'nangou', emo: 'pleading', think: true, text: L(
        'Please. Anything at all.',
        '頼む。何でもいいんだ。',
        '求求了。什么都行。') },

      /* ------------------------------------------------ the door */
      { fx: 'thunder' },
      { hide: 'all' },
      { bg: 'doorway' },
      { text: L(
        'The door opened.',
        '扉が、開いた。',
        '门，开了。') },
      { show: 'akagi', at: 'center', face: 'calm' },
      { text: L(
        'A boy stood in the doorway, soaked to the skin, water pooling around his shoes. He could not have been older than thirteen.',
        '戸口に、少年が立っていた。全身ずぶ濡れで、足もとには水たまりができている。どう見ても、十三より上ではない。',
        '门口站着一个少年，浑身湿透，脚边积了一滩水。怎么看，也不会超过十三岁。') },
      { show: 'thug', at: 'right', face: 'sneer' },
      { who: 'thug', emo: 'irritated', text: L(
        'Hey. Who let a kid in here? This isn\'t a candy shop. Get lost.',
        'おい。誰だ、ガキを入れたのは。ここは駄菓子屋じゃねえぞ。失せな。',
        '喂。谁把小鬼放进来的？这儿可不是糖果铺。滚。') },
      { who: 'akagi', text: DOTS },
      { text: L(
        'The boy did not flinch. He looked over the room — the men, the money, the tiles — the way one looks at the weather.',
        '少年は、たじろがなかった。男たちを、金を、牌を——まるで天気でも眺めるように、部屋を見渡した。',
        '少年没有退缩。他扫视着屋子——那些男人、钱、麻将牌——就像在看天气一样。') },
      { text: L(
        'His clothes smelled of the sea, not of rain.',
        'その服からは、雨ではなく、潮の匂いがした。',
        '他的衣服上不是雨水的味道，而是海水的气息。') },
      { hide: 'thug' },
      { show: 'nangou', at: 'left', face: 'shock' },
      { who: 'nangou', emo: 'shock', think: true, text: L(
        'A child? On a night like this? …No. Wait.',
        '子供……？　こんな夜に？　……いや、待て。',
        '小孩？在这样的夜里？……不，等等。') },
      { who: 'nangou', emo: 'hope', think: true, text: L(
        'I begged for something to change. And the door opened.',
        '俺は、何かが変わってくれと願った。そして、扉が開いた。',
        '我祈求有什么能改变这一切。然后，门就开了。') },
      { who: 'nangou', emo: 'urgent', face: 'resolve', text: L(
        'He\'s with me! I — I told him to come. He runs errands for me.',
        'そ、そいつは俺の連れだ！　俺が……俺が呼んだんだ。使い走りをさせてる小僧でね。',
        '他是我的人！是、是我叫他来的。平时帮我跑腿的小子。') },
      { show: 'ryuzaki', at: 'right', face: 'irritated' },
      { who: 'ryuzaki', emo: 'wary', text: L(
        'Errands. In this storm.',
        '使い走り、ね。この嵐の中を。',
        '跑腿。在这种暴风雨里。') },
      { who: 'ryuzaki', emo: 'threat', face: 'smug', text: L(
        '…Fine. He sits behind you and keeps his mouth shut. Anything funny, and you both leave by the window.',
        '……まあいい。後ろに座らせて、口は閉じさせとけ。妙な真似をしたら、二人まとめて窓から出てってもらうぜ。',
        '……行吧。让他坐你后面，把嘴闭上。敢耍花样，你们俩就一起从窗户出去。') },
      { hide: 'ryuzaki' },

      /* ------------------------------------------------ the boy behind the chair */
      { bg: 'parlor' },
      { who: 'nangou', emo: 'worried', face: 'worried', text: L(
        'Kid. What\'s your name?',
        '坊主。名前は？',
        '小子。你叫什么名字？') },
      { who: 'akagi', emo: 'flat', text: L(
        'Akagi. Akagi Shigeru.',
        '赤木。赤木しげる。',
        '赤木。赤木茂。') },
      { who: 'nangou', emo: 'worried', text: L(
        'Where did you come from, on a night like this?',
        'こんな夜に、どこから来たんだ？',
        '这样的夜里，你是从哪儿来的？') },
      { who: 'akagi', emo: 'flat', text: L(
        'The sea.',
        '海から。',
        '海里。') },
      { who: 'nangou', emo: 'shock', think: true, text: L(
        'The sea…? He isn\'t joking. Something is missing in this boy — the part that knows how to be afraid.',
        '海から……？　冗談を言ってる目じゃない。このガキには、何かが欠けている——怖がるという部分が。',
        '海里……？他不是在开玩笑。这孩子身上少了点什么——少了懂得害怕的那一部分。') },
      { who: 'akagi', emo: 'flat', text: L(
        'Old man. What are you playing for?',
        'おじさん。何を賭けてるの？',
        '大叔。你们在赌什么？') },
      { who: 'nangou', emo: 'gloomy', text: L(
        '…My life.',
        '……俺の、命だ。',
        '……我的命。') },
      { who: 'akagi', emo: 'amused', face: 'smirk', text: L(
        'Hm. Then it\'s worth watching.',
        'ふうん。なら、見る価値はあるね。',
        '哦。那就值得一看了。') },

      /* ------------------------------------------------ the dangerous tile */
      { hide: 'all' },
      { card: L('East 4', '東四局', '东四局'), sub: L('Nangou · last place', '南郷・ラス目', '南乡·末位') },
      { bg: 'table' },
      { text: L(
        'The game went on. And then, for the first time that night, Nangou picked up a hand worth winning.',
        '勝負は続いた。そしてその夜はじめて、南郷のもとに、勝負になる手が入った。',
        '牌局继续。然后，那一夜第一次，南乡摸到了一手值得一搏的牌。') },
      { table: T_DRAW },
      { who: 'ryuzaki', emo: 'smug', face: 'smug', text: L(
        'Riichi. Dealer\'s riichi, Nangou. Try not to faint.',
        'リーチ。親のリーチだぜ、南郷さん。気絶するなよ。',
        '立直。庄家的立直哦，南乡。可别吓晕了。') },
      { who: 'nangou', emo: 'urgent', face: 'worried', think: true, text: L(
        'And now, of all times, it comes - the three of bamboo. Throw the seven of circles and I am ready. A mangan at the very least.',
        'よりによって今、来やがった——三索。七筒を切ればテンパイだ。安く見ても満貫はある。',
        '偏偏是这个时候，它来了——三索。打出七筒我就听牌。最少也是满贯。') },
      { who: 'nangou', emo: 'afraid', think: true, text: L(
        'But the seven of circles… nobody has thrown one all night. If it deals into the dealer with nine thousand points left, it is over. I am dead - *really* dead.',
        'だが七筒は……今夜、まだ誰も切っていない。残り九千点で親に振り込めば終わりだ。俺は死ぬ——*本当に*、死ぬ。',
        '可是七筒……今晚还没有人打过。只剩九千点，要是放铳给庄家，就全完了。我会死——*真的*会死。') },
      { who: 'nangou', emo: 'gloomy', think: true, text: L(
        'Or fold. The three of characters is safe - he threw it himself. Live to see one more hand.',
        'それともオリるか。三萬なら安全だ——奴が自分で切っている。生き延びて、次の一局を待つ。',
        '还是弃和吧。三万是安全的——他自己打过。活下来，再等下一局。') },

      { decide: {
        title: L('Nangou\'s discard', '南郷の一打', '南乡的这一打'),
        flag: 'nangou',
        notes: {
          '7p': [
            { who: 'nangou', emo: 'urgent', face: 'worried', think: true, text: L(
              'Ready, on three different tiles - with riichi it is a mangan. But this is the one tile on the table I cannot read.',
              '切ればテンパイ、三面待ち。リーチをかければ満貫だ。だが卓の上でただ一枚、読めないのがこの牌だ。',
              '打了就听牌，三面听。立直就是满贯。可这偏偏是桌上唯一一张我看不透的牌。') },
          ],
          '3m': [
            { who: 'nangou', emo: 'gloomy', face: 'worried', think: true, text: L(
              'He threw it himself, so it cannot deal in. The hand steps back from ready - but I am still breathing.',
              '奴が自分で切った牌だ、絶対に当たらない。テンパイからは一歩下がる——だが、息はしていられる。',
              '这是他自己打过的牌，绝对不会放铳。离听牌退了一步——但我还能喘气。') },
          ],
          '6m': [
            { who: 'nangou', emo: 'worried', face: 'worried', think: true, text: L(
              'He has thrown the three and the nine, so the six is suji. Fairly safe - not certain. And the hand goes backwards.',
              '三萬と九萬が切れているから、六萬はスジだ。まあ安全——絶対じゃない。それに手は後退する。',
              '三万和九万他都打过，所以六万是筋牌。还算安全——但不是绝对。而且手牌会后退。') },
          ],
          '6s': [
            { who: 'nangou', emo: 'shock', face: 'shock', think: true, text: L(
              'The dora pair?! Throw away the only thing that makes this hand worth anything - and it is not even safe.',
              'ドラの対子を！？　この手の値打ちそのものを捨てて——しかも安全ですらない。',
              '拆宝牌的对子？！把这手牌唯一值钱的东西扔掉——而且它连安全都算不上。') },
          ],
          '*': [
            { who: 'nangou', emo: 'worried', face: 'worried', think: true, text: L(
              'That only breaks up the hand. If I am going to step back, it should at least be onto a tile I know is safe.',
              'それじゃ手が崩れるだけだ。下がるなら、せめて確実に通る牌で下がるべきだろう。',
              '那样只会把手牌拆散。要退的话，至少也该退在确定安全的牌上。') },
          ],
        },
        options: [
          { id: 'push', tiles: '7p', goto: 'push' },
          { id: 'fold', tiles: '*', goto: 'fold' },
        ],
      } },

      /* ---- the player reached for a retreat: the boy speaks up ---- */
      { label: 'fold' },
      { text: L(
        'His fingers closed around the tile that would let him run.',
        '指が、逃げるための牌をつまんだ。',
        '他的手指捏住了那张能让他逃走的牌。') },
      { table: false },
      { show: 'nangou', at: 'left', face: 'worried' },
      { show: 'akagi', at: 'center', face: 'calm' },
      { who: 'akagi', emo: 'flat', text: L(
        'Old man.',
        'おじさん。',
        '大叔。') },
      { who: 'akagi', emo: 'cold', face: 'glare', text: L(
        'You\'re already dead. Had you noticed?',
        'あんた、もう死んでるよ。気づいてた？',
        '你已经死了。你发现了吗？') },
      { fx: 'shake' },
      { who: 'nangou', emo: 'shock', face: 'shock', text: L(
        'W-what did you say?',
        'な、何だと……？',
        '你、你说什么？') },

      { choice: [
        { text: L(
          '"There is a cliff behind you. And you keep stepping back."',
          '「背中は崖だ。なのに、後ずさりを続けてる」',
          '“你背后就是悬崖。可你还在一步步往后退。”'), goto: 'cliff' },
        { text: L(
          '"That tile won\'t save you. It only kills you slower."',
          '「その牌じゃ助からない。ゆっくり死ぬだけだ」',
          '“那张牌救不了你。只会让你死得慢一点。”'), goto: 'slower' },
      ] },

      { label: 'cliff' },
      { who: 'akagi', emo: 'cold', text: L(
        'There is a cliff at your back. And all night long, you have been stepping backward.',
        'あんたの背中は崖だ。なのに一晩じゅう、後ろへ後ろへと下がり続けてる。',
        '你背后就是悬崖。可这一整夜，你都在一步步往后退。') },
      { goto: 'after_choice' },

      { label: 'slower' },
      { who: 'akagi', emo: 'menace', text: L(
        'That tile won\'t save you. It only kills you slower. One hand later, you will be standing right here again — with less.',
        'その牌じゃ助からない。ゆっくり死ぬだけだ。一局あとには、また同じ場所に立ってる——もっと少ない点棒でね。',
        '那张牌救不了你。只会让你死得慢一点。再过一局，你还是站在同一个地方——只是手里的点棒更少了。') },

      { label: 'after_choice' },
      { who: 'akagi', emo: 'cold', face: 'calm', text: L(
        'You\'ve been running since before I came in. Everyone at this table can smell it. That is why they keep winning.',
        'オレが来る前から、あんたはずっと逃げてた。この卓の全員が、その匂いを嗅ぎつけてる。だから連中が勝ち続けるんだ。',
        '从我进来之前，你就一直在逃。这桌上的每个人都闻得出来。所以赢的才一直是他们。') },
      { who: 'akagi', emo: 'smirk', face: 'smirk', text: L(
        'If you are going to fall anyway — fall *forward*.',
        'どうせ落ちるなら——*前に*落ちなよ。',
        '反正都是要掉下去——那就*往前*掉。') },
      { who: 'nangou', emo: 'shock', think: true, text: L(
        'This boy doesn\'t know the first thing about mahjong. He can\'t. And yet—',
        'このガキは、麻雀のイロハも知らないはずだ。知ってるわけがない。なのに——',
        '这小子连麻将的皮毛都不懂。不可能懂。可是——') },
      { who: 'nangou', emo: 'resolve', think: true, face: 'resolve', text: L(
        'He\'s right. Folding only buys me one more hand of dying.',
        'こいつの言う通りだ。オリたところで、死ぬまでの一局が延びるだけだ。',
        '他说得对。弃和，只不过是多换来一局等死的时间。') },
      { text: L(
        'Nangou put the tile back. His hand shook as he lifted the seven of circles.',
        '南郷は牌を戻した。七筒を持ち上げる手が、震えていた。',
        '南乡把牌放了回去。拿起七筒时，他的手在发抖。') },
      { goto: 'thrown' },

      /* ---- the player pushed without being told ---- */
      { label: 'push' },
      { table: false },
      { show: 'nangou', at: 'left', face: 'resolve' },
      { who: 'nangou', emo: 'resolve', think: true, text: L(
        'No. If I run now, I only die one hand later. All night I have been stepping backward - and there is a cliff behind me.',
        '駄目だ。ここで逃げても、死ぬのが一局延びるだけだ。俺は一晩じゅう後ずさりしてきた——その背中は、もう崖だ。',
        '不行。现在逃了，也只是晚一局死。这一整夜我都在往后退——可我背后就是悬崖。') },
      { show: 'akagi', at: 'center', face: 'smirk' },
      { who: 'akagi', emo: 'amused', text: L(
        '…Hm. So there is still some life in that back, old man.',
        '……ふうん。その背中、まだ生きてるんだね、おじさん。',
        '……哦。大叔，你那后背还没死透嘛。') },
      { who: 'nangou', emo: 'shock', think: true, face: 'shock', text: L(
        'The boy… he has been watching my hands the whole time.',
        'このガキ……ずっと、俺の手もとを見ていたのか。',
        '这小子……一直在盯着我的手。') },
      { text: L(
        'His hand shook as he lifted the seven of circles.',
        '七筒を持ち上げる手が、震えていた。',
        '拿起七筒时，他的手在发抖。') },

      /* ---- the tile goes out ---- */
      { label: 'thrown' },
      { fx: 'zawa' },
      { hide: 'all' },
      { table: T_PUSH, fx: 'clack' },
      { who: 'nangou', emo: 'resolve', face: 'resolve', text: L(
        '…Riichi!',
        '……リーチだ！',
        '……立直！') },
      { who: 'ryuzaki', face: 'irritated', text: DOTS },
      { text: L(
        'Silence. No call. The tile went through.',
        '沈黙。発声はない。牌は、通った。',
        '一片寂静。没有人出声。牌，过了。') },
      { text: L(
        'Two turns later, the tile Nangou needed slid from the wall into his hand.',
        '二巡後。南郷の欲しかった牌が、山から手の中へ滑り込んだ。',
        '两巡之后，南乡要的那张牌，从牌山滑进了他的手里。') },
      { table: T_WIN, won: '8m', fx: 'clack' },
      { who: 'nangou', emo: 'joy', face: 'shock', text: L(
        'Ts— tsumo! *Tsumo!*',
        'ツ……ツモ！　*ツモだ！*',
        '自、自摸！*自摸！*') },
      { text: L(
        'Riichi, tsumo, all simples, pinfu, two dora. A haneman - twelve thousand points, half of it out of the dealer\'s pocket.',
        'リーチ、ツモ、タンヤオ、ピンフ、ドラ二。跳満——一万二千点。その半分は、親の懐から出ていく。',
        '立直、自摸、断幺九、平和、宝牌二。跳满——一万二千点，其中一半出自庄家的腰包。') },
      { table: false },
      { show: 'thug', at: 'right', face: 'angry' },
      { who: 'thug', emo: 'irritated', text: L(
        'Tch. The corpse twitched.',
        'チッ。死体がピクリと動きやがった。',
        '啧。尸体还抽了一下。') },
      { hide: 'thug' },

      /* ------------------------------------------------ changing seats */
      { bg: 'parlor' },
      { who: 'nangou', emo: 'hope', think: true, face: 'worried', text: L(
        'It went through. For the first time tonight, the current turned.',
        '通った。今夜はじめて、流れが変わった。',
        '过了。今晚第一次，流向变了。') },
      { who: 'nangou', emo: 'hope', think: true, text: L(
        'That wasn\'t me. That was him. From the moment he walked in—',
        '俺の力じゃない。こいつだ。こいつが入ってきた、あの瞬間から——',
        '那不是我。是他。从他走进来的那一刻起——') },
      { show: 'akagi', at: 'center', face: 'calm' },
      { who: 'nangou', emo: 'resolve', face: 'resolve', text: L(
        'Akagi. Have you ever played mahjong?',
        '赤木。麻雀を打ったことはあるか？',
        '赤木。你打过麻将吗？') },
      { who: 'akagi', emo: 'flat', text: L(
        'Never.',
        '一度も。',
        '从没打过。') },
      { who: 'nangou', emo: 'hope', text: L(
        '…Do you want to?',
        '……打ってみる気は、あるか？',
        '……想打吗？') },
      { show: 'ryuzaki', at: 'right', face: 'laugh' },
      { who: 'ryuzaki', emo: 'mock', text: L(
        'Hah! What is this? Handing your life to a schoolboy, Nangou?',
        'ハッ！　何の冗談だ？　自分の命を、小僧に預けようってのか、南郷さんよ。',
        '哈！这算什么？把自己的命交给一个学生娃吗，南乡？') },
      { who: 'ryuzaki', emo: 'smug', face: 'smug', text: L(
        'Suit yourself. Change seats if you like. A debt is a debt, whoever loses it.',
        '好きにしな。席を替わりたきゃ替わればいい。誰が負けようが、借金は借金だ。',
        '随你便。想换人就换。不管是谁输的，债就是债。') },
      { hide: 'ryuzaki' },
      { who: 'nangou', emo: 'urgent', text: L(
        'Listen closely. I\'ll teach you the rules. We have five minutes.',
        'よく聞け。ルールを教える。時間は五分だ。',
        '听好了。我教你规则。只有五分钟。') },

      { choice: [
        { text: L('Listen to Nangou\'s explanation', '南郷の説明を聞く', '听南乡讲解规则'), goto: 'rules' },
        { text: L('Skip — I already know how to play', 'スキップ——ルールはもう知っている', '跳过——我已经会打了'), goto: 'briefing' },
      ] },

      { label: 'rules' },
      { bg: 'table' },
      { who: 'nangou', emo: 'teach', text: L(
        'You hold thirteen tiles. Every turn you draw one and throw one away. That\'s the whole rhythm of it.',
        '手牌は十三枚。自分の番が来たら一枚ツモって、一枚捨てる。基本はその繰り返しだ。',
        '手牌是十三张。轮到你时摸一张，再打出一张。整个节奏就是这样。') },
      { who: 'nangou', emo: 'teach', text: L(
        'To win you need four sets of three, plus one pair. A set is three in a row in the same suit — or three of the same tile.',
        'アガるには、三枚一組の面子が四つと、同じ牌二枚の雀頭がひとつ要る。面子は、同じ種類で数が三つ続いたものか、同じ牌三枚だ。',
        '要和牌，需要四组三张的面子，加上一对雀头。面子是同一花色的三张连牌——或者三张相同的牌。') },
      { who: 'nangou', emo: 'teach', text: L(
        'When you\'re one tile short, you\'re *tenpai*. Draw the last tile yourself and call *tsumo*. If someone else throws it, call *ron* — and he alone pays.',
        'あと一枚でアガれる形が*テンパイ*だ。最後の一枚を自分で引いたら*ツモ*。他人が捨てたら*ロン*——その時は、捨てた奴がひとりで払う。',
        '只差一张就能和的状态叫*听牌*。自己摸到最后一张，就喊*自摸*。别人打出来，就喊*荣*——这时由打出那张牌的人一个人付。') },
      { who: 'nangou', emo: 'teach', text: L(
        'But a finished shape isn\'t enough. The hand needs at least one *yaku* — a scoring pattern. No yaku, no win.',
        'ただし、形ができただけじゃ駄目だ。手には最低ひとつ、*役*が要る。役がなきゃアガれない。',
        '但光凑成牌型还不够。手牌里至少要有一个*役*——也就是和牌的番种。没有役，就不能和。') },
      { who: 'nangou', emo: 'teach', text: L(
        'The simplest is *riichi*. If you haven\'t called anyone\'s tiles and you\'re tenpai, stake a thousand points and declare it. After that you can\'t change your hand — but any win counts.',
        '一番簡単なのは*リーチ*だ。誰の牌も鳴かずにテンパイしたら、千点を出して宣言する。その後は手を変えられないが、アガればそれが役になる。',
        '最简单的是*立直*。没有鸣过别人的牌、又听牌了，就押上一千点宣告立直。之后不能再换牌——但只要和了就算数。') },
      { who: 'nangou', emo: 'teach', text: L(
        'Other easy ones: a hand with no ones, nines or honor tiles. Or a triplet of dragons, or of your own wind.',
        '他に簡単なのは、一・九・字牌を一枚も使わない手。それから、三元牌か自分の風牌を三枚そろえる手だ。',
        '其他简单的：手牌里完全没有一、九和字牌。或者有三张相同的三元牌，或三张自己的风牌。') },
      { who: 'nangou', emo: 'teach', text: L(
        'You can take a discard to finish a set — *pon* for three of a kind, *chi* for a run, from the player on your left. It\'s faster. But an open hand can\'t riichi, so make sure you still have a yaku.',
        '他人の捨て牌をもらって面子を作ることもできる。同じ牌三枚なら*ポン*、数の並びなら*チー*——チーは左隣の奴からだけだ。手は早くなる。だが鳴いた手はリーチできない。役が残るかどうか、よく確かめろ。',
        '也可以拿别人打出的牌来凑面子——三张相同的叫*碰*，顺子叫*吃*，吃只能吃左手边那家的牌。这样更快。但鸣过牌就不能立直了，所以要确认自己还有役。') },
      { who: 'nangou', emo: 'teach', text: L(
        'One last thing. If you\'ve ever discarded a tile you could win on, you can\'t call ron at all. That\'s *furiten*. Watch your own discards.',
        '最後にもうひとつ。自分のアガリ牌を一度でも捨てていたら、ロンは一切できない。*フリテン*ってやつだ。自分の捨て牌には気をつけろ。',
        '最后一点。如果你打出过自己能和的牌，就完全不能荣和了。这叫*振听*。留心自己打过的牌。') },
      { who: 'akagi', emo: 'flat', text: L(
        'Is that everything?',
        'それで全部？',
        '就这些？') },
      { who: 'nangou', emo: 'shock', face: 'shock', text: L(
        'Everything? That\'s barely the beginning! People study this game for twenty years and still—',
        '全部だと？　まだ入り口にも立っちゃいない！　二十年打ち続けても、まだ分からんという連中が——',
        '就这些？这才刚入门！有人钻研了二十年，都还——') },
      { who: 'akagi', emo: 'cold', text: L(
        'It\'s enough.',
        '十分だよ。',
        '够了。') },
      { who: 'akagi', emo: 'menace', face: 'glare', text: L(
        'I don\'t need to know the game. I only need to see when a man is waiting.',
        'ゲームを知る必要はない。相手が待ってるかどうか、それが見えればいい。',
        '我不需要懂这个游戏。只要看得出一个人什么时候在等牌，就够了。') },
      { text: L(
        'RAGE AND SKILLS - Some players carry a skill and a rage gauge, which fills as they draw, call, win or get hit. A full gauge fires the skill. Tonight Akagi has none: only his eyes, and his nerve.',
        '【怒気とスキル】スキルと怒気ゲージを持つ打ち手がいる。ゲージはツモる、鳴く、アガる、振り込む——そのたびに溜まり、満タンになるとスキルが発動する。今夜のアカギには、それがない。あるのは、その目と度胸だけだ。',
        '【怒气与技能】有些牌手身怀技能和怒气槽。摸牌、鸣牌、和牌、放铳——每一次都会积累怒气，蓄满时技能就会发动。今晚的赤木没有技能，他只有一双眼睛和一副胆量。') },
      { text: L(
        'The men across the table are another matter. Give Ryuzaki a reason, and he will start keeping a gauge of his own.',
        'だが、卓の向こうの男たちは別だ。竜崎に理由を与えれば、あの男は自分のゲージを燃やしはじめる。',
        '但牌桌对面的人就不一样了。只要给龙崎一个理由，他就会燃起自己的怒气槽。') },

      { label: 'briefing' },
      { bg: 'parlor' },
      { show: 'nangou', at: 'left', face: 'worried' },
      { show: 'akagi', at: 'center', face: 'calm' },
      { who: 'nangou', emo: 'teach', text: L(
        'We\'re going into the South round. Four hands left, a few more if the dealer keeps winning.',
        'これから南場に入る。残りは四局。親が連荘すれば、もう少し延びる。',
        '接下来进入南场。还剩四局，庄家连庄的话会再多几局。') },
      { who: 'nangou', emo: 'worried', text: L(
        'I\'m in last place. Climb to second or better by the end, and I walk out of here alive. Anything less…',
        '俺はいまラス目だ。終わった時に二着以上なら、生きてここを出られる。それより下なら……',
        '我现在是末位。结束时爬到第二名以上，我就能活着走出去。要是做不到……') },
      { who: 'nangou', emo: 'teach', text: L(
        'Watch the three of them. Ryuzaki only knows how to attack - he will push every hand he has. The one with the scar plays for him: he feeds him tiles and will never take a win off him.',
        'あの三人をよく見ておけ。竜崎は攻めることしか知らん——手が入れば必ず押してくる。傷のある男は竜崎のために打つ。牌を流してやり、竜崎からは決してアガらない。',
        '看好那三个人。龙崎只会进攻——有牌就一定会硬推。脸上带疤的那个是替他打的：会给他喂牌，绝不会和他的牌。') },
      { who: 'nangou', emo: 'teach', text: L(
        'The third only looks after his own skin. He is the weak one.',
        '三人目は、自分の身しか考えていない。あいつが一番弱い。',
        '第三个只顾自己保命。他是最弱的一个。') },
      { who: 'akagi', emo: 'flat', text: L(
        'Second.',
        '二着、ね。',
        '第二名。') },
      { who: 'akagi', emo: 'smirk', face: 'smirk', text: L(
        '…Fine. For a start.',
        '……いいよ。手はじめにはね。',
        '……行。先从这儿开始。') },
      { who: 'akagi', emo: 'cold', text: L(
        'Move over, old man.',
        'どいてよ、おじさん。',
        '让开吧，大叔。') },

      { label: 'battle' },
      { hide: 'all' },
      { battle: 'storm', win: 'win', lose: 'lose' },

      /* ------------------------------------------------ defeat */
      { label: 'lose' },
      { bg: 'parlor' },
      { text: L(
        'The final scores were read out. They were not enough.',
        '最終の点数が読み上げられた。届かなかった。',
        '最终点数念了出来。还是不够。') },
      { show: 'ryuzaki', at: 'right', face: 'laugh' },
      { who: 'ryuzaki', emo: 'smug', text: L(
        'That\'s that, Nangou. You had a good run, for a dead man.',
        'これで終いだ、南郷さん。死人にしちゃあ、よく粘ったよ。',
        '到此为止了，南乡。以一个死人来说，你撑得够久了。') },
      { hide: 'ryuzaki' },
      { text: L(
        '— But that is not how this night went.',
        '——だが、この夜の結末は、そうではなかった。',
        '——但是，这一夜并不是这样结束的。') },
      { choice: [
        { text: L('Sit down at the table again', 'もう一度、卓につく', '再次坐上牌桌'), goto: 'battle' },
        { text: L('Return to the title screen', 'タイトルに戻る', '返回标题画面'), goto: 'quit' },
      ] },

      { label: 'quit' },
      { end: true, completed: false },

      /* ------------------------------------------------ victory */
      { label: 'win' },
      { bg: 'parlor' },
      { text: L(
        'The last hand ended. The scores were counted twice. They did not change.',
        '最後の一局が終わった。点棒は二度、数え直された。結果は変わらなかった。',
        '最后一局结束了。点数清点了两遍。结果没有变。') },
      { show: 'thug', at: 'right', face: 'stunned' },
      { who: 'thug', emo: 'shock', text: L(
        'This — this can\'t be right. He learned the rules an hour ago!',
        'こ、こんな馬鹿な……！　こいつ、一時間前にルールを覚えたばかりだぞ！',
        '这、这不可能……！这小子一个小时前才学会规则！') },
      { branch: 'opening', to: { ron: 'win_ron', '*': 'win_common' } },

      /* he took the cheap win in the first hand */
      { label: 'win_ron' },
      { hide: 'thug' },
      { show: 'ryuzaki', at: 'right', face: 'irritated' },
      { who: 'ryuzaki', emo: 'wary', text: L(
        'From the very first hand he took exactly what was put in front of him. No greed. No fear. I watched every tile he touched, and I still never saw the bottom of him.',
        '最初の一局から、こいつは目の前に出たものを、きっちり取りやがった。欲もなければ、怯えもない。触る牌を残らず見てたってのに、とうとう底が見えなかった。',
        '从第一局起，他就只拿摆在眼前的东西。不贪，也不怕。他摸的每一张牌我都盯着，可到最后也没看见他的底。') },
      { goto: 'win_common' },

      { label: 'win_common' },
      { hide: 'all' },
      { show: 'nangou', at: 'left', face: 'shock' },
      { who: 'nangou', emo: 'relief', text: L(
        'We did it… Akagi, we actually—',
        'やった……赤木、俺たち、本当に——',
        '成功了……赤木，我们真的——') },
      { show: 'akagi', at: 'center', face: 'calm' },
      { who: 'akagi', emo: 'cold', text: L(
        'It isn\'t over.',
        'まだ終わってないよ。',
        '还没结束。') },
      { who: 'akagi', emo: 'cold', text: L(
        'They haven\'t paid yet. Men like these don\'t lose just because the game says so.',
        '連中はまだ払ってない。こういう人間は、勝負に負けたくらいじゃ、負けを認めない。',
        '他们还没付钱。这种人，不会因为牌局输了就认输。') },
      { show: 'ryuzaki', at: 'right', face: 'irritated' },
      { who: 'ryuzaki', emo: 'irritated', text: L(
        '…Sharp kid.',
        '……切れるガキだ。',
        '……脑子挺灵的小鬼。') },
      { who: 'ryuzaki', emo: 'command', face: 'smug', text: L(
        'One more game. Sit down.',
        'もう一回戦だ。座れ。',
        '再来一场。坐下。') },
      { hide: 'all' },
      { text: L(
        'The next hanchan began. Outside, the storm showed no sign of letting up.',
        '次の半荘が始まった。外の嵐は、まだやむ気配がない。',
        '下一个半庄开始了。窗外的暴风雨，丝毫没有停歇的意思。') },
      { bg: 'black' },
      { card: L('To be continued', 'つづく', '未完待续'), sub: L('Chapter 2 · Deceive the Heavens', '第二章・瞞天過海', '第二章·瞒天过海') },
      { end: true, completed: true },
    ],
  };

  // later chapters live in their own files (chapter2.js ...) and add themselves with Story.add
  root.Story = {
    chapters: [chapter1],
    get(id) { return this.chapters.find(c => c.id === id); },
    add(...chapters) { this.chapters.push(...chapters); this.chapters.sort((a, b) => a.no - b.no); },   // a prologue is no 0
  };
})(window);
