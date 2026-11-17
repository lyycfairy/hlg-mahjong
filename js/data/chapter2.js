/*
 * Chapter 2 - Sleight of Hand (掉包). Same script format as chapter1.js.
 *
 * Written in Chinese first: Z(chinese) is a text that exists only in Chinese so far (I18n.pick shows
 * it in every language until the translations are added - turn each Z('…') into L(en, ja, zh) then,
 * and drop `langs`). Like chapter 1, the text is an original retelling: it follows the events of the
 * source (the police at the door in South 2, the yakuman built from the ponds, Nangou's alibi,
 * Yasuoka staying to watch, Ryuzaki swallowing his pride and calling Yagi) without its dialogue.
 */
(function (root) {
  'use strict';
  const L = (en, ja, zh) => ({ en, ja, zh });
  const Z = zh => ({ zh });

  const chapter2 = {
    id: 'ch2',
    no: 2,
    langs: ['zh'],
    title: Z('掉包'),
    summary: Z('刑警闯进了麻将馆，所有人都望向门口。就在这一刻，少年的手动了。'),
    available: true,
    banner: 'bg/parlor.jpg',
    script: [
      { bg: 'black' },
      { card: Z('第二章'), sub: Z('掉包') },

      /* ------------------------------------------------ the police at the door */
      { bg: 'doorway' },
      { show: 'yasuoka', at: 'right', face: 'suspicious' },
      { text: Z('刑警安冈站在门口，身后还跟着两名部下。') },
      { text: Z('在这里赌钱是犯法的。牌桌边的每一个人都僵在椅子上，谁也不敢先开口。') },
      { hide: 'all' },
      { bg: 'parlor' },
      { show: 'nangou', at: 'left', face: 'shock' },
      { who: 'nangou', emo: 'afraid', think: true, text: Z('偏偏是这个时候……他要找的少年，就坐在我的位子上。') },
      { text: Z('第二场，南二局。牌局停在了半途。') },
      { text: Z('赤木的手牌是七对子，早已听牌。白板、发财、红中，各有一对。') },
      { who: 'nangou', emo: 'worried', think: true, text: Z('三元牌的对子凑齐了三副，这可是大三元的种子……可别人打出三元牌的时候，他一张都没有碰。') },
      { show: 'akagi', at: 'center', face: 'calm' },
      { text: Z('所有人的目光都钉在门口。只有赤木，低头看着牌河。') },

      { label: 'battle' },
      { hide: 'all' },
      { battle: 'swap', win: 'win', lose: 'lose' },

      /* ------------------------------------------------ the moment passed */
      { label: 'lose' },
      { bg: 'parlor' },
      { text: Z('门口的骚动平息了，众人的目光又回到了牌桌上。那样的机会，不会再来第二次。') },
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
      { text: Z('大三元。四暗刻单骑。') },
      { text: Z('三倍役满。') },
      { show: 'thug', at: 'left', face: 'stunned' },
      { who: 'thug', emo: 'shock', text: Z('这、这不可能！刚才牌河里明明还躺着白板、发财、红中——') },
      { show: 'ryuzaki', at: 'right', face: 'irritated' },
      { who: 'ryuzaki', emo: 'menace', text: Z('……你这小鬼。') },
      { text: Z('龙崎的手已经伸了出去，却在半空中停住了。') },
      { text: Z('门口站着刑警。在这里掀桌子，就等于当着警察的面承认，这是一场赌局。') },
      { text: Z('谁都看得出这是出千，可谁也不能把它说出口。') },

      /* ------------------------------------------------ the bargain */
      { hide: 'all' },
      { show: 'nangou', at: 'left', face: 'shock' },
      { show: 'akagi', at: 'center', face: 'calm' },
      { who: 'akagi', emo: 'flat', text: Z('大叔。这手牌，算你的。') },
      { who: 'akagi', emo: 'cold', text: Z('作为交换，帮我圆个谎。') },
      { who: 'nangou', emo: 'gloomy', think: true, text: Z('这一手，能救我的命。可只要我说错一个字，这孩子就完了。') },
      { show: 'yasuoka', at: 'right', face: 'wry' },
      { who: 'yasuoka', emo: 'sly', text: Z('那么——这孩子，是跟谁来的？') },
      { show: 'nangou', face: 'resolve' },
      { who: 'nangou', emo: 'resolve', text: Z('……跟我来的。他是我亲戚家的孩子，今晚一直在这儿陪着我，哪儿也没去过。') },
      { show: 'yasuoka', face: 'suspicious' },
      { who: 'yasuoka', emo: 'wary', text: Z('哦？是吗。') },
      { text: Z('安冈的目光从南乡身上移开，落在赤木面前那手牌上。他什么都看明白了。') },
      { show: 'yasuoka', face: 'wry' },
      { who: 'yasuoka', emo: 'amused', think: true, text: Z('当着刑警的面出千……还出得这么明目张胆。有意思。') },
      { who: 'yasuoka', emo: 'command', text: Z('你们先回去吧。看来是我搞错了。') },
      { text: Z('两名部下面面相觑，还是转身走了。安冈却拉过一把椅子，在牌桌旁坐了下来。') },
      { who: 'yasuoka', emo: 'sly', text: Z('我就在这儿看一会儿。各位不介意吧？') },

      /* ------------------------------------------------ the night goes on */
      { hide: 'all' },
      { bg: 'table' },
      { text: Z('牌局继续。第三场，第四场……') },
      { text: Z('赤木没有再输过一场。龙崎面前的点棒，一场比一场少。') },
      { text: Z('第七场打到一半，龙崎终于放下了手里的牌。') },
      { bg: 'parlor' },
      { show: 'ryuzaki', at: 'right', face: 'irritated' },
      { who: 'ryuzaki', emo: 'command', text: Z('……来人，给矢木打电话。') },
      { show: 'thug', at: 'left', face: 'stunned' },
      { who: 'thug', emo: 'shock', text: Z('大、大哥？可您之前不是说——') },
      { who: 'ryuzaki', emo: 'irritated', text: Z('少废话！快去！') },
      { text: Z('龙崎咬着牙，把面子咽了下去。') },
      { hide: 'all' },
      { show: 'yasuoka', at: 'right', face: 'wry' },
      { text: Z('安冈点起一支烟，靠在椅背上，像是在等一出好戏开场。') },
      { show: 'akagi', at: 'center', face: 'smirk' },
      { text: Z('赤木什么也没说。他只是把面前的牌，一张一张码齐。') },
      { hide: 'all' },
      { bg: 'black' },
      { card: Z('未完待续'), sub: Z('第三章·代打') },
      { end: true, completed: true },
    ],
  };

  const chapter3 = {
    id: 'ch3',
    no: 3,
    title: L('The Substitute', '代打ち', '代打'),
    summary: L(
      'The yakuza send for a man who plays for a living.',
      'ヤクザが呼んだのは、麻雀で飯を食う男。',
      '黑道请来了一个靠麻将吃饭的男人。'),
    available: false,
    script: [],
  };

  root.Story.add(chapter2, chapter3);
})(window);
