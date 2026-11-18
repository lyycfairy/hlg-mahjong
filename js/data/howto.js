/*
 * "How to Play" page, one version per language.
 * Each entry is a function of t(), which turns a tile string such as
 * "345m" into tile markup.
 */
(function (root) {
  'use strict';

  const Howto = {
    en: t => `
      <h3>The goal</h3>
      <p>Riichi mahjong, four players. Build a hand of <b>four sets and a pair</b>. A set is a run of three in one suit
      ${t('345m')} or three identical tiles ${t('777p')}; a pair is two identical tiles ${t('11z')}.</p>
      <p>Each turn you draw a tile and discard one — click a tile in your hand to throw it. When you are one tile away you are <b>tenpai</b>;
      the game marks discards that leave you tenpai and shows what you are waiting on.</p>

      <h3>Winning</h3>
      <p><b>Tsumo</b> — you draw the winning tile yourself; everyone pays. <b>Ron</b> — an opponent discards it; they alone pay.
      The buttons appear when a win is possible.</p>
      <p>A hand needs at least one <b>yaku</b> (scoring pattern). The easy ones:</p>
      <ul>
        <li><b>Riichi</b> — with a concealed hand at tenpai, press Riichi, pay 1,000 and lock your hand. Any win now counts.</li>
        <li><b>Tanyao</b> — no 1s, 9s or honor tiles anywhere in the hand.</li>
        <li><b>Yakuhai</b> — a triplet of dragons ${t('567z')}, of the round wind, or of your own seat wind.</li>
        <li><b>Menzen tsumo</b> — win by self-draw without having called any tiles.</li>
        <li><b>Pinfu, flushes, straights, seven pairs…</b> — and the rest of the standard yaku, up to yakuman.</li>
      </ul>

      <h3>Calling tiles</h3>
      <p><b>Pon</b> takes any player's discard to make a triplet. <b>Chi</b> takes a discard from the player on your <i>left</i> to make a run.
      Calling is fast, but an open hand cannot declare riichi — make sure it still has a yaku.</p>
      <p><b>Furiten</b> — if you have discarded any tile you could win on, you cannot call ron (tsumo is still allowed).</p>

      <h3>Skills and the rage gauge</h3>
      <p>Anyone at the table who owns a skill - you, and some opponents - also has a <b>rage gauge</b>. It fills when its owner draws,
      calls a tile, declares riichi, wins a hand or gets hit. When yours is full, a skill button appears on your turn; using it empties the gauge.</p>
      <ul>
        <li><b>Insight</b> (Akagi) - for the rest of the hand you see who is ready and on which tiles, and every tile in your hand that would deal in glows red.</li>
        <li><b>The Flow</b> - the next three draws are the best tiles left in the wall.</li>
      </ul>
      <p>When an opponent fires Insight, he reads <i>your</i> hand until the hand ends: he will not deal in to you, so win by your own draw - or wait it out.</p>

      <h3>The opening decision</h3>
      <p>Each stage opens in the middle of its first hand, at a decision taken from the story - call the win or let it go, throw this tile or that one.
      The panel shows where each choice leads: ready or not, the waits and how many are left, what the hand pays, and how dangerous the tile is.
      A commentary goes with it, read aloud - the analysis by a guide, the advice by the characters themselves.
      What you choose changes the rest of the match - an opponent may gain a skill, or stop taking you seriously.</p>

      <h3>Voices</h3>
      <p>Every character line is voiced in all three languages, and each character has a voice of his own, chosen for his age and manner -
      the boy's is light and flat, Ryuzaki's deep and slow. At the table the players call their riichi, pon, chi, ron and tsumo aloud.
      <b>Voice</b> in the story's toolbar and at the table turns voices off; <b>Sound: Off</b> silences everything.
      In the backlog, ▶ plays a line again.</p>

      <h3>Who you are playing</h3>
      <ul>
        <li><b>Aggressor</b> - attacks: pushes his own hand, declares riichi, and is slow to fold.</li>
        <li><b>Collaborator</b> - plays for a team-mate: feeds him tiles, never wins off him, and will deal in on purpose to end your attack.</li>
        <li><b>Independent</b> - plays his own game by the numbers: attacks when it pays, folds when it does not.</li>
      </ul>
      <p>The briefing before each stage says who is which.</p>

      <h3>House rules</h3>
      <p>No red fives and no kan (not implemented yet). One winner per discard: the player closest in turn order.
      The dealer stays on after winning or when tenpai at an exhaustive draw.</p>`,

    ja: t => `
      <h3>目的</h3>
      <p>四人打ちのリーチ麻雀です。<b>面子（メンツ）四つと雀頭（ジャントウ）ひとつ</b>の形を作ればアガリ。
      面子は、同じ種類で数が三つ続いた順子 ${t('345m')} か、同じ牌三枚の刻子 ${t('777p')}。雀頭は同じ牌二枚 ${t('11z')} です。</p>
      <p>自分の番では牌を一枚ツモり、一枚捨てます——手牌をクリックすると、その牌を切ります。あと一枚でアガれる状態が<b>テンパイ</b>。
      切ればテンパイになる牌には印がつき、待ち牌も表示されます。</p>

      <h3>アガリ</h3>
      <p><b>ツモ</b>——アガリ牌を自分で引く。全員が支払います。<b>ロン</b>——相手がアガリ牌を捨てる。捨てた人がひとりで支払います。
      アガれる時はボタンが表示されます。</p>
      <p>アガるには最低ひとつ<b>役</b>が必要です。作りやすい役：</p>
      <ul>
        <li><b>リーチ（立直）</b>——鳴かずにテンパイしたら「リーチ」を押し、1,000点を出して手を固定します。以後はどんなアガリでも成立します。</li>
        <li><b>タンヤオ（断么九）</b>——一・九・字牌を一枚も使わない手。</li>
        <li><b>役牌</b>——三元牌 ${t('567z')}、場風、自風のいずれかを三枚そろえる。</li>
        <li><b>門前清自摸和</b>——鳴かずにツモでアガる。</li>
        <li><b>平和・染め手・一気通貫・七対子……</b>——そのほかの一般的な役も、役満までひと通り対応しています。</li>
      </ul>

      <h3>鳴き</h3>
      <p><b>ポン</b>は誰の捨て牌でも取って刻子にできます。<b>チー</b>は<i>左隣</i>の人の捨て牌を取って順子にします。
      鳴けば手は早くなりますが、リーチはできなくなります——役が残っているか確認しましょう。</p>
      <p><b>フリテン</b>——自分のアガリ牌を一枚でも捨てていると、ロンはできません（ツモは可能）。</p>

      <h3>スキルと怒気ゲージ</h3>
      <p>スキルを持つ者——あなたと、一部の相手——には<b>怒気ゲージ</b>があります。ツモる、鳴く、リーチをかける、アガる、振り込む——そのたびに溜まっていきます。
      自分のゲージが満タンになると、自分の番にスキルのボタンが現れます。使うとゲージは空になります。</p>
      <ul>
        <li><b>看破</b>（アカギ）——その局のあいだ、誰がテンパイで何を待っているかが見え、手牌の当たり牌が赤く光ります。</li>
        <li><b>流れ</b>——次の三回のツモが、山に残る最良の牌になります。</li>
      </ul>
      <p>相手が看破を使うと、その局が終わるまで<i>あなたの</i>手牌が読まれます。相手からのロンは期待できません——ツモでアガるか、やり過ごしましょう。</p>

      <h3>開局の決断</h3>
      <p>各ステージは、最初の局の途中——物語の決断の場面から始まります。アガるか見逃すか、どの牌を切るか。
      パネルには、それぞれの選択の行き先が示されます。テンパイかどうか、待ちと残り枚数、打点、そしてその牌の危険度です。
      解説は文字で表示され、読み上げられます——分析はナレーターが、助言は登場人物自身の声で。
      選んだ道によって、その後の対局が変わります——相手がスキルを身につけることもあれば、こちらを甘く見ることもあります。</p>

      <h3>ボイス</h3>
      <p>登場人物のセリフは三言語すべてで音声つきです。声は一人ひとり違い、年齢と人柄に合わせて選んでいます——少年は軽く平板に、竜崎は低く、ゆっくりと。
      卓では、リーチ・ポン・チー・ロン・ツモも声に出して宣言します。
      ストーリーのツールバーと卓上の<b>音声</b>ボタンで声をオフにでき、<b>サウンド：オフ</b>ですべての音が止まります。
      バックログの ▶ で、そのセリフをもう一度聞けます。</p>

      <h3>相手のタイプ</h3>
      <ul>
        <li><b>攻撃型</b>——攻めます。自分の手を押し、リーチをかけ、なかなかオリません。</li>
        <li><b>連携型</b>——仲間のために打ちます。牌を流し、仲間からはアガらず、こちらの攻めを止めるためならわざと振り込みます。</li>
        <li><b>単独型</b>——自分の麻雀を数字どおりに打ちます。得なら攻め、損ならオリます。</li>
      </ul>
      <p>誰がどのタイプかは、各ステージ開始前の説明に書かれています。</p>

      <h3>採用ルール</h3>
      <p>赤ドラなし、カンなし（未実装）。ダブロンなし（頭ハネ）。親は、アガるか、流局時にテンパイしていれば連荘します。</p>`,

    zh: t => `
      <h3>目标</h3>
      <p>四人立直麻将（日本麻将）。凑出<b>四组面子加一对雀头</b>即可和牌。
      面子是同一花色的三张连牌（顺子）${t('345m')}，或三张相同的牌（刻子）${t('777p')}；雀头是两张相同的牌 ${t('11z')}。</p>
      <p>轮到自己时摸一张牌，再打出一张——点击手牌即可打出。只差一张就能和的状态叫<b>听牌</b>；
      游戏会标出打出后即可听牌的牌，并显示你在等哪些牌。</p>

      <h3>和牌</h3>
      <p><b>自摸</b>——自己摸到和牌，其余三家都要支付。<b>荣和</b>——对手打出你的和牌，由打出的人单独支付。
      可以和牌时会出现按钮。</p>
      <p>和牌至少需要一个<b>役</b>。容易做的役：</p>
      <ul>
        <li><b>立直</b>——门前清（没有鸣牌）听牌时，按“立直”，支付1,000点并固定手牌。之后无论怎样和牌都成立。</li>
        <li><b>断幺九</b>——手牌中完全没有一、九和字牌。</li>
        <li><b>役牌</b>——三张相同的三元牌 ${t('567z')}、场风牌或自风牌。</li>
        <li><b>门前清自摸和</b>——没有鸣牌并自摸和牌。</li>
        <li><b>平和、混一色／清一色、一气通贯、七对子……</b>——其余常见的役直到役满，均已支持。</li>
      </ul>

      <h3>鸣牌</h3>
      <p><b>碰</b>可以拿任意一家打出的牌凑成刻子。<b>吃</b>只能拿<i>左手边</i>那家打出的牌凑成顺子。
      鸣牌更快，但之后不能立直——要确认手牌仍然有役。</p>
      <p><b>振听</b>——只要打出过自己能和的牌，就不能荣和（仍可自摸）。</p>

      <h3>技能与怒气槽</h3>
      <p>拥有技能的人——你，以及部分对手——都有一条<b>怒气槽</b>。摸牌、鸣牌、立直、和牌、放铳，都会让它积累。
      自己的怒气槽蓄满后，轮到你时会出现技能按钮；发动后怒气槽清空。</p>
      <ul>
        <li><b>洞若观火</b>（看事物像看火一样清楚）——在这一局内，可以看到谁在听牌、听什么牌，自己手里会放铳的牌会发出红光。</li>
        <li><b>时来运转</b>（时机一到，运气倒向自己）——接下来的三次摸牌，都会是牌山里最好的牌。</li>
        <li><b>移花接木</b>（暗中调换，以假乱真）——把手里的任意一张牌与任意一家牌河里的一张牌互换，每次消耗四分之一的怒气。</li>
        <li><b>浑水摸鱼</b>（趁着混乱捞取好处）——直到你的下一巡，对手全员思考停滞：不提防你、不能发动技能。</li>
        <li><b>明察秋毫</b>（连最细微的地方都看得清）——对手的技能：蓄满时自动发动，识破被调换的牌，这一局作废。</li>
      </ul>
      <p>对手发动洞若观火时，直到这一局结束，<i>你的</i>手牌都会被看穿：别指望他放铳——靠自摸和牌，或者熬过这一局。</p>

      <h3>开局的抉择</h3>
      <p>每一关都从第一局的中途开始——从故事里的一个抉择开始：和，还是放过？打这张，还是那张？
      面板会显示每个选择的走向：是否听牌、听哪些牌还剩几张、打点多少，以及这张牌有多危险。
      解说会以文字显示并朗读出来——分析由旁白朗读，建议则由角色亲口说出。
      你的选择会改变之后的对局——对手可能学会技能，也可能不再把你放在眼里。</p>

      <h3>配音</h3>
      <p>角色的每一句台词在三种语言中都有配音，而且每个角色的声音都不同，按年龄和性格挑选——少年的声音轻而平淡，龙崎的声音低沉而缓慢。
      牌桌上，立直、碰、吃、荣和、自摸也都会喊出声来。
      故事工具栏和牌桌上的<b>语音</b>按钮可以关闭配音；<b>音效：关</b>会让所有声音静音。
      在对话记录里点 ▶ 可以重听那句台词。</p>

      <h3>对手的类型</h3>
      <ul>
        <li><b>进攻型</b>——主攻：硬推自己的牌，积极立直，轻易不弃和。</li>
        <li><b>协作型</b>——为同伴而打：给同伴喂牌，绝不和同伴的牌，必要时会故意放铳来打断你的进攻。</li>
        <li><b>独立型</b>——按数字打自己的牌：划算就攻，不划算就守。</li>
      </ul>
      <p>每一关开始前的说明会告诉你谁是哪一种。</p>

      <h3>本作规则</h3>
      <p>无赤宝牌，无杠（尚未实现）。一张牌只有一人能荣和（头跳）。庄家和牌，或流局时听牌，则连庄。</p>`,
  };

  root.Howto = Howto;
})(window);
