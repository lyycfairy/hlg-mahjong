/*
 * Chapters 2 and 3 - the rest of the first night, after the anime's first episode
 * (data/videos/01.mp4; plot summaries in data/texts/01-2.md and 01-3.md). Same script format as
 * chapter1.js.
 *
 *   Chapter 2 · 瞒天过海 (Deceive the Heavens)  Akagi's first hanchan: the dragon pairs he lets go by in
 *                                       South 2, the police at the door, the tiles swapped out of the
 *                                       ponds, and the deal with Nangou.             battle: 'swap'
 *   Chapter 3 · 借刀杀人 (A Borrowed Knife)    Yasuoka, the alibi, the restart in the confusion, Ryuzaki's
 *                                       West and the triple yakuman; Ryuzaki refuses to send for Yagi;
 *                                       the detective stays.                         battle: 'witness'
 *
 * Written in Chinese first: Z(chinese) is a text that exists only in Chinese so far (I18n.pick shows
 * it in every language until the translations are added - turn each Z('…') into L(en, ja, zh) then,
 * and drop `langs`). Like chapter 1, the dialogue is an original retelling: it follows the events of
 * the source without reproducing its lines.
 */
(function (root) {
  'use strict';
  const L = (en, ja, zh) => ({ en, ja, zh });
  const Z = zh => ({ zh });
  const THUG = L('Thug', 'チンピラ', '打手');
  const LACKEY = L('Lackey', '子分', '跟班');

  /*
   * South 2 of Akagi's first hanchan (the anime's hand). The thug deals. Akagi holds three dragon pairs,
   * 8p, 2m, 3m and a single West - seven pairs, ready on West - and every dragon that was thrown went
   * by: the red and an 8p are in Ryuzaki's pond, the green in the thug's, the white in the lackey's.
   */
  const table = (akagi, ryuzaki, thug, lackey) => ({
    me: 0, dealer: 2, roundWind: 1, kyoku: 1, dora: '1p', wall: 41,
    seats: [
      Object.assign({ who: 'akagi', score: 17800 }, akagi),
      Object.assign({ who: 'ryuzaki', score: 30200 }, ryuzaki),
      Object.assign({ who: 'thug', name: THUG, score: 27000 }, thug),
      Object.assign({ who: 'thug', name: LACKEY, score: 25000 }, lackey),
    ],
  });
  const T_DRAGONS = table(
    { hand: '2233m88p3556677z', river: '1m9p4z2s1s9m8s' },
    { river: '1z7z9s4s8p2z1p' }, { river: '9m6z1z3p7s4z2p9p' }, { river: '2z5z9s1m6s8m4p7m' });
  // a moment later: the dragons and the 8p are in his hand, his 2m and 3m lie where they were
  const T_SWAPPED = table(
    { hand: '888p3555666777z', river: '1m9p4z2s1s9m8s9s' },
    { river: '1z2m9s4s3m2z1p' }, { river: '9m2m1z3p7s4z2p9p' }, { river: '2z3m9s1m6s8m4p7m' });

  const chapter2 = {
    id: 'ch2',
    no: 2,
    langs: ['zh'],
    title: Z('瞒天过海'),
    summary: Z('瞒天过海：当着众人的眼睛做手脚。赤木的第一个半庄。南二局，警察找上门来，所有人都望向门口——就在这一刻，少年的手动了。'),
    available: true,
    banner: 'bg/parlor.jpg',
    script: [
      { bg: 'black' },
      { card: Z('第二章'), sub: Z('瞒天过海') },

      /* ------------------------------------------------ the first hanchan */
      { bg: 'parlor' },
      { text: Z('赤木的第一个完整的半庄。') },
      { text: Z('上桌之前，他只被草草讲过一遍规则，役一个也不认识。麻将是怎么回事，他是在一局一局的实战里慢慢摸清的——') },
      { text: Z('四组面子加一个雀头；比的是谁快，也比点数的大小；尽量不鸣牌，自己把牌做出来；白板、发财、红中凑齐三张就能成役；还有一种由七个对子组成的怪形状，叫七对子。') },
      { text: Z('东场打完，赤木输了七千二百点。没放过铳，也没和过一把——平平无奇。') },
      { text: Z('日后被人称作天才的那种东西，此刻还看不出一丝影子。') },

      /* ------------------------------------------------ South 2: three dragon pairs */
      { table: T_DRAGONS },
      { text: Z('南二局。') },
      { show: 'nangou', at: 'left', face: 'shock' },
      { who: 'nangou', emo: 'shock', think: true, text: Z('白板、发财、红中……三副三元牌，全是对子！') },
      { who: 'nangou', emo: 'hope', think: true, text: Z('只要把它们变成刻子，就是大三元。这是能一口气翻盘的牌！') },
      { text: Z('龙崎打出了第一张红中。赤木只是看着，没有碰。') },
      { text: Z('接着是发财，然后是白板。赤木依旧一动不动。') },
      { who: 'nangou', emo: 'alarm', think: true, text: Z('为什么不碰？难道他要做七对子？这手牌非鸣不可啊！') },
      { who: 'nangou', emo: 'gloomy', think: true, text: Z('就算不知道大三元这个役，三元牌凑成刻子能把牌做大，这点道理总该懂吧……把一切押在这种小鬼身上，我真是昏了头。下一个半庄，还是我自己来。') },

      /* ------------------------------------------------ the police at the door */
      { table: false },
      { hide: 'all' },
      { text: Z('楼梯上传来了脚步声。') },
      { show: 'ryuzaki', at: 'right', face: 'irritated' },
      { who: 'ryuzaki', emo: 'irritated', text: Z('这么晚了，谁啊？') },
      { hide: 'all' },
      { bg: 'doorway' },
      { show: 'yasuoka', at: 'right', face: 'neutral' },
      { who: 'yasuoka', emo: 'flat', text: Z('深夜打扰了。我们是警察。') },
      { who: 'yasuoka', emo: 'sly', text: Z('昨晚出了点事——两伙不良少年之间的冲突。') },
      { hide: 'all' },
      { bg: 'pier' },
      { who: 'yasuoka', emo: 'sly', text: Z('就是所谓的“胆小鬼赛车”：两辆车全速冲向悬崖，谁先踩刹车，谁就输。') },
      { who: 'yasuoka', emo: 'flat', text: Z('结果两辆都没刹住，一起冲进了海里。一个重伤，被送进了医院；另一个掉进海里之后，自己游走了。') },
      { bg: 'doorway' },
      { show: 'yasuoka', at: 'right', face: 'suspicious' },
      { who: 'yasuoka', emo: 'sly', text: Z('有消息说，那家伙逃进了这一带。所以我们来挨家打听打听。') },
      { text: Z('牌桌边的每一个人，都转过头去望着门口。') },

      { label: 'battle' },
      { hide: 'all' },
      { battle: 'swap', win: 'win', lose: 'lose' },

      /* ------------------------------------------------ the moment passed */
      { label: 'lose' },
      { bg: 'parlor' },
      { text: Z('门外的脚步越来越近。等警察推门进来，那样的机会就再也不会有了。') },
      { text: Z('——但那一刻，并不是这样过去的。') },
      { choice: [
        { text: Z('回到那一刻'), goto: 'battle' },
        { text: Z('返回标题画面'), goto: 'quit' },
      ] },
      { label: 'quit' },
      { end: true, completed: false },

      /* ------------------------------------------------ the deal */
      { label: 'win' },
      { bg: 'parlor' },
      { show: 'thug', at: 'left', face: 'stunned' },
      { who: 'thug', emo: 'shock', text: Z('胆小鬼赛车的幸存者……难怪这小鬼胆子这么大。') },
      { who: 'thug', emo: 'worried', text: Z('大哥，怎么办？') },
      { show: 'ryuzaki', at: 'right', face: 'irritated' },
      { who: 'ryuzaki', emo: 'command', text: Z('把他们打发走。在这种地方被条子看见脸，对咱们也是麻烦。') },
      { hide: 'all' },
      { show: 'nangou', at: 'left', face: 'worried' },
      { show: 'akagi', at: 'center', face: 'calm' },
      { who: 'akagi', emo: 'flat', text: Z('南乡先生。要不要做个交易？') },
      { who: 'nangou', emo: 'shock', text: Z('……啊？') },
      { who: 'akagi', emo: 'cold', text: Z('警察是有了线索才找上门的，不会就这么走。用不了一分钟，他们就会进来。') },
      { who: 'akagi', emo: 'cold', text: Z('到时候，你跟我对好口供——替我证明我在哪儿、我是谁。就这些。') },
      { who: 'nangou', emo: 'irritated', text: Z('你这小鬼，说得倒轻巧……我凭什么要为你做到这一步？') },
      { who: 'nangou', emo: 'resolve', text: Z('交易这种东西，得两边手里都有货，才谈得成。') },
      { show: 'akagi', face: 'smirk' },
      { who: 'akagi', emo: 'smirk', text: Z('货，我有。') },
      { table: T_SWAPPED },
      { fx: 'zawa' },
      { text: Z('白板、发财、红中，各三张。八筒三张。还有一张西风。') },
      { text: Z('四暗刻·大三元——单吊西风。') },
      { who: 'nangou', emo: 'shock', think: true, text: Z('不可能……这手牌，刚才明明还是七对子——') },
      { who: 'nangou', emo: 'shock', think: true, text: Z('是牌河。就在所有人都望着门口的那一刻，他从牌河里把牌换了过来。') },
      { who: 'nangou', emo: 'afraid', think: true, text: Z('警察就在门外。本该最心惊胆战的人，偏偏是他……这小鬼的神经，根本不是常人的神经。') },
      { who: 'nangou', emo: 'gloomy', think: true, text: Z('可要是他把这手牌拆了，我翻盘的机会也就跟着没了。') },
      { show: 'nangou', face: 'resolve' },
      { who: 'nangou', emo: 'resolve', text: Z('……好吧，小鬼。我现在没有挑三拣四的余地。随你吧。') },
      { table: false },
      { hide: 'all' },
      { bg: 'black' },
      { card: Z('未完待续'), sub: Z('第三章·借刀杀人') },
      { end: true, completed: true },
    ],
  };

  const chapter3 = {
    id: 'ch3',
    no: 3,
    langs: ['zh'],
    title: Z('借刀杀人'),
    summary: Z('借刀杀人：借别人的手，成自己的事。刑警走进了麻将馆。一个谎，一张西风，一手三倍役满——赤木让警察当了这一局的见证人。'),
    available: true,
    banner: 'bg/doorway.jpg',
    script: [
      { bg: 'black' },
      { card: Z('第三章'), sub: Z('借刀杀人') },

      /* ------------------------------------------------ the detective */
      { bg: 'parlor' },
      { text: Z('门被推开了。进来的是一个穿方格外套的男人。') },
      { show: 'yasuoka', at: 'right', face: 'wry' },
      { who: 'yasuoka', emo: 'sly', text: Z('真是让人好找……要找的小鬼，原来在这儿。') },
      { show: 'akagi', at: 'center', face: 'calm' },
      { show: 'yasuoka', face: 'suspicious' },
      { who: 'yasuoka', emo: 'sly', text: Z('小子，刚才的话你都听见了吧？那个幸存者——就是你吧。') },
      { show: 'nangou', at: 'left', face: 'worried' },
      { who: 'nangou', emo: 'resolve', text: Z('刑警先生，您搞错了。这孩子是我哥哥家的，因为一些缘故，暂时由我照看。') },
      { who: 'nangou', emo: 'resolve', text: Z('他从昨天傍晚六点起，就一直在这家麻将馆，跟我们在一起。——对吧，龙崎先生？') },
      { hide: 'yasuoka' },
      { show: 'ryuzaki', at: 'right', face: 'irritated' },
      { who: 'ryuzaki', emo: 'irritated', text: Z('……啊，没错。') },
      { who: 'nangou', emo: 'worried', think: true, text: Z('警察插手，对龙崎也一样是麻烦。他只能配合。') },
      { hide: 'ryuzaki' },
      { show: 'yasuoka', at: 'right', face: 'suspicious' },
      { who: 'yasuoka', emo: 'wary', text: Z('可是有人看见了。而且楼梯上还有脚印——湿漉漉的，多半就是这小鬼的。') },
      { who: 'akagi', emo: 'flat', text: Z('那是刚才叔叔让我去买烟时留下的。') },
      { who: 'yasuoka', emo: 'wary', text: Z('这么深更半夜？') },
      { who: 'akagi', emo: 'flat', text: Z('嗯。我也说这个时候买不到，可叔叔非要我去……他输得厉害，正上火呢。') },
      { who: 'nangou', emo: 'urgent', text: Z('啊、啊，没错。') },
      { who: 'akagi', emo: 'cold', text: Z('再说了，刑警先生。干了那种事的人，会在这里悠哉悠哉地打麻将吗？') },
      { who: 'akagi', emo: 'cold', text: Z('就算真在打，这里的人又凭什么要包庇他？一点好处都没有。') },
      { show: 'yasuoka', face: 'wry' },
      { who: 'yasuoka', emo: 'amused', text: Z('……原来如此。') },

      { label: 'battle' },
      { hide: 'all' },
      { battle: 'witness', win: 'win', lose: 'lose' },

      /* ------------------------------------------------ seen through */
      { label: 'lose' },
      { bg: 'parlor' },
      { text: Z('有人多看了一眼牌河。那一瞬间，赤木做的手脚全都暴露在了灯光下。') },
      { text: Z('——但那一刻，并不是这样过去的。') },
      { choice: [
        { text: Z('回到那一刻'), goto: 'battle' },
        { text: Z('返回标题画面'), goto: 'quit' },
      ] },
      { label: 'quit' },
      { end: true, completed: false },

      /* ------------------------------------------------ the triple yakuman */
      { label: 'win' },
      { bg: 'parlor' },
      { fx: 'zawa' },
      { text: Z('龙崎打出的那张西风，还没在桌上放稳——') },
      { text: Z('四暗刻·大三元。') },
      { show: 'thug', at: 'left', face: 'angry' },
      { text: Z('打手一把揪住了赤木的衣领。') },
      { who: 'thug', emo: 'irritated', text: Z('你、你这算什么！') },
      { show: 'ryuzaki', at: 'right', face: 'irritated' },
      { who: 'ryuzaki', emo: 'command', text: Z('够了。') },
      { hide: 'thug' },
      { show: 'nangou', at: 'left', face: 'shock' },
      { who: 'nangou', emo: 'shock', think: true, text: Z('连这一步都算好了……这小鬼是个怪物。根本不是一个初中生想得出来的事。') },
      { who: 'nangou', emo: 'worried', think: true, text: Z('谁都看得出这是出千。换作平时，黑道绝不会认账，哪怕动手也要把这一局搅黄。') },
      { who: 'nangou', emo: 'shock', think: true, text: Z('所以他才让警察留在这里——让刑警来当这一局的见证人。') },
      { hide: 'nangou' },
      { show: 'thug', at: 'left', face: 'stunned' },
      { who: 'thug', emo: 'worried', text: Z('大哥，就这么算了？') },
      { show: 'ryuzaki', face: 'smug' },
      { who: 'ryuzaki', emo: 'smug', text: Z('没什么算不算的。被人算计了，只能怪自己蠢。') },
      { who: 'ryuzaki', emo: 'threat', text: Z('不过小鬼，这种事只准有一次。') },
      { who: 'ryuzaki', emo: 'menace', text: Z('下次再被我当场抓住，在这一行里是要剁手指的。哭也好，喊也好，谁都别想求饶——我还从来没放过谁。') },
      { who: 'ryuzaki', emo: 'menace', text: Z('敢拿黑道开涮，就是这世上最重的罪，没有半点商量的余地。') },

      /* ------------------------------------------------ not Yagi */
      { hide: 'all' },
      { text: Z('休息室里。') },
      { show: 'thug', at: 'left', face: 'sneer' },
      { show: 'ryuzaki', at: 'right', face: 'irritated' },
      { who: 'thug', emo: 'worried', text: Z('那小鬼真邪门……自从他掺和进来，对面已经连赢两场了。') },
      { who: 'thug', emo: 'worried', text: Z('要不，把矢木先生叫来？') },
      { who: 'ryuzaki', emo: 'wary', text: Z('矢木？咱们养着的那个代打？') },
      { who: 'thug', emo: 'flat', text: Z('是。') },
      { fx: 'shake' },
      { show: 'thug', face: 'stunned' },
      { text: Z('龙崎一把揪住他的后脑，狠狠按在了桌上。') },
      { who: 'ryuzaki', emo: 'irritated', text: Z('睡糊涂了吗？对付一个外行小鬼还要请帮手——你还要不要脸？') },
      { who: 'ryuzaki', emo: 'threat', text: Z('他不过是会出千而已。那种把戏，我不会让他再得逞第二次。') },
      { who: 'ryuzaki', emo: 'smug', face: 'smug', text: Z('一个外行，到现在都没放过铳，这才叫怪事。这种运气撑不了多久——他的好运，到此为止了。') },

      /* ------------------------------------------------ the detective stays */
      { hide: 'all' },
      { bg: 'doorway' },
      { text: Z('同来的警员戴上了帽子：“警部，您还要留在这儿吗？”') },
      { show: 'yasuoka', at: 'right', face: 'wry' },
      { who: 'yasuoka', emo: 'flat', text: Z('嗯，雨下得这么大。我再坐一会儿，你们先回去吧。') },
      { who: 'yasuoka', emo: 'sly', text: Z('不介意吧，南乡先生？') },
      { show: 'nangou', at: 'left', face: 'worried' },
      { who: 'nangou', emo: 'worried', text: Z('啊、啊……当然。') },
      { show: 'yasuoka', face: 'suspicious' },
      { who: 'yasuoka', emo: 'sly', think: true, text: Z('不管他们怎么编，我要找的，始终是那个小鬼。这里的空气，比任何人的话都说得更清楚。') },
      { hide: 'all' },
      { bg: 'parlor' },
      { show: 'akagi', at: 'center', face: 'glare' },
      { text: Z('降临于黑暗的天才，赤木茂。') },
      { text: Z('他的眼底，是一片望不见底的黑暗。') },
      { text: Z('——传说，从这一夜开始。') },
      { hide: 'all' },
      { bg: 'black' },
      { card: Z('未完待续'), sub: Z('第四章·见微知著') },
      { end: true, completed: true },
    ],
  };

  root.Story.add(chapter2, chapter3);
})(window);
