/*
 * Cast list and portraits.
 * The portraits shown in the game are generated paintings (assets/portraits,
 * made by tools/generate_assets.py). The SVG busts below are the built-in
 * fallback used when a painting is missing. Either way the designs are
 * original - no artwork from the manga or anime is used.
 */
(function (root) {
  'use strict';

  const L = (en, ja, zh) => ({ en, ja, zh });

  // `faces` are the expressions painted for each character (the first is the default).
  // They correspond to assets/portraits/<id>_<face>.webp - see tools/generate_assets.py.
  const Characters = {
    akagi:   { name: L('Akagi', 'アカギ', '赤木'),   color: '#e6edf5', faces: ['calm', 'smirk', 'glare'] },
    nangou:  { name: L('Nangou', '南郷', '南乡'),    color: '#e0b77c', faces: ['worried', 'shock', 'resolve'] },
    ryuzaki: { name: L('Ryuzaki', '竜崎', '龙崎'),   color: '#e2574c', faces: ['smug', 'irritated', 'laugh'] },
    thug:    { name: L('Thug', 'チンピラ', '打手'),  color: '#9ea6ae', faces: ['sneer', 'angry', 'stunned'] },
    yasuoka: { name: L('Yasuoka', '安岡', '安冈'),   color: '#c9b37a', faces: ['wry', 'suspicious', 'neutral'] },
    yagi:    { name: L('Yagi', '矢木', '矢木'),      color: '#8fc1a9', faces: ['smile', 'focus', 'rattled'] },
    // the prologue, six years later (1965): `voice` says whose recordings a character speaks with
    akagi19: { name: L('Akagi', 'アカギ', '赤木'),   color: '#e6edf5', faces: ['calm', 'smirk', 'glare'], voice: 'akagi' },
    washizu: { name: L('Washizu', '鷲巣', '鹫巢'),   color: '#d6c27a', faces: ['sneer', 'rage', 'manic'] },
    ogi:     { name: L('Ogi', '仰木', '仰木'),       color: '#c98a6b', faces: ['calm', 'tense', 'shock'] },
    suzuki:  { name: L('Suzuki', '鈴木', '铃木'),    color: '#e8e8e8', faces: ['blank', 'tense', 'nod'] },
  };

  /* shared anatomy -------------------------------------------------- */

  function torso(w, coat, coatDark, shirt, extra) {
    const l = 150 - w, r = 150 + w;
    return `
      <path d="M${l} 420 C${l} 345 ${l + 34} 314 116 298 L184 298 C${r - 34} 314 ${r} 345 ${r} 420 Z" fill="${coat}"/>
      <path d="M150 300 L184 298 C${r - 34} 314 ${r} 345 ${r} 420 L150 420 Z" fill="${coatDark}" opacity=".55"/>
      <path d="M124 298 L150 352 L176 298 Z" fill="${shirt}"/>
      ${extra || ''}`;
  }

  function head(skin, shade, wide) {
    const k = wide || 0;
    const xr = 196 + k;
    const jaw = `L${192 + k} 222 L${174 + k / 2} 252 L150 264`;
    return `
      <path d="M133 246 L133 300 L150 318 L167 300 L167 246 Z" fill="${shade}"/>
      <path d="M${104 - k} 168 C${104 - k} 116 ${xr} 116 ${xr} 168 ${jaw} L${126 - k / 2} 252 L${108 - k} 222 Z" fill="${skin}"/>
      <path d="M150 129 C${(150 + xr) / 2} 129 ${xr} 142 ${xr} 168 ${jaw} Z" fill="${shade}" opacity=".6"/>
      <path d="M150 204 L144 226 L152 228" fill="none" stroke="${shade}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>`;
  }

  function frame(inner) {
    return `<svg viewBox="0 0 300 420" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">${inner}</svg>`;
  }

  /* the cast -------------------------------------------------------- */

  const draw = {
    akagi() {
      return frame(`
        ${torso(96, '#cfd7df', '#8793a0', '#c9a98c',
          '<path d="M124 298 L106 332 L132 322 Z M176 298 L194 332 L168 322 Z" fill="#eef2f6"/>')}
        ${head('#e3cdb6', '#a88f7c')}
        <path d="M100 196 L94 152 L82 130 L102 134 L98 100 L119 120 L123 82 L142 110 L156 76 L165 110 L188 86 L187 120 L210 106 L201 140 L217 150 L203 166 L205 198 L194 172 L185 152 L174 182 L162 150 L151 186 L140 152 L129 182 L120 154 L108 176 Z" fill="#f1f4f8"/>
        <path d="M156 76 L165 110 L188 86 L187 120 L210 106 L201 140 L217 150 L203 166 L205 198 L194 172 L185 152 L174 182 L162 150 Z" fill="#b9c4d0" opacity=".7"/>
        <path d="M116 198 L141 193 L140 200 Z" fill="#15171a"/>
        <path d="M184 198 L159 193 L160 200 Z" fill="#15171a"/>
        <path d="M114 189 L142 186 M186 189 L158 186" stroke="#3a3f46" stroke-width="2.5" stroke-linecap="round"/>
        <path d="M138 240 L160 240 L166 236" fill="none" stroke="#5b4a40" stroke-width="2.5" stroke-linecap="round"/>
        <path d="M112 150 L110 176 M196 160 L197 184 M150 330 L150 344" stroke="#9fd0ff" stroke-width="2" stroke-linecap="round" opacity=".7"/>
      `, '#bcd3ee');
    },

    nangou() {
      return frame(`
        ${torso(116, '#4a382a', '#241a12', '#d8d2c4',
          '<path d="M143 304 L157 304 L162 350 L150 362 L138 350 Z" fill="#6e2a22"/>')}
        ${head('#d7b594', '#9a7a5e', 8)}
        <path d="M94 176 C86 112 214 112 206 176 L200 150 C182 132 118 132 100 150 Z" fill="#26211d"/>
        <ellipse cx="127" cy="199" rx="7.5" ry="4.2" fill="#efe8dc"/><ellipse cx="173" cy="199" rx="7.5" ry="4.2" fill="#d9d0c2"/>
        <circle cx="128" cy="199.5" r="3" fill="#1a1a1a"/><circle cx="172" cy="199.5" r="3" fill="#1a1a1a"/>
        <path d="M118 208 C124 211 131 211 136 208 M164 208 C169 211 176 211 182 208" fill="none" stroke="#9a7a5e" stroke-width="1.6"/>
        <path d="M112 186 L138 178 M188 186 L162 178" stroke="#26211d" stroke-width="5" stroke-linecap="round"/>
        <path d="M136 244 C144 238 156 238 164 244" fill="none" stroke="#5b4034" stroke-width="3" stroke-linecap="round"/>
        <path d="M120 236 l2 2 M128 248 l2 2 M172 248 l2 2 M180 236 l2 2 M150 256 l2 2 M138 254 l2 2 M162 254 l2 2" stroke="#6f5847" stroke-width="2" stroke-linecap="round"/>
        <path d="M214 170 q7 12 0 17 q-7 -5 0 -17 Z M222 204 q5 9 0 13 q-5 -4 0 -13 Z M84 190 q6 10 0 15 q-6 -5 0 -15 Z" fill="#9fd0ff" opacity=".85"/>
      `, '#f0c27a');
    },

    ryuzaki() {
      return frame(`
        ${torso(128, '#2b2433', '#120f17', '#e9e4da',
          '<path d="M143 304 L157 304 L163 356 L150 368 L137 356 Z" fill="#a3231b"/>' +
          '<path d="M60 420 L72 350 M92 420 L98 336 M208 420 L202 336 M240 420 L228 350" stroke="#4a4058" stroke-width="2"/>')}
        ${head('#cfae90', '#8c6f58', 4)}
        <path d="M98 176 C88 100 212 100 202 176 L199 148 C182 120 122 118 102 150 Z" fill="#17161a"/>
        <path d="M112 132 C132 116 168 116 190 134" fill="none" stroke="#3b3942" stroke-width="3" stroke-linecap="round"/>
        <rect x="108" y="186" width="38" height="19" rx="6" fill="#0c0c0f"/><rect x="154" y="186" width="38" height="19" rx="6" fill="#0c0c0f"/>
        <path d="M146 193 L154 193 M108 192 L100 188 M192 192 L200 188" stroke="#0c0c0f" stroke-width="3"/>
        <path d="M114 191 L126 189 M160 191 L172 189" stroke="#6d7684" stroke-width="2" stroke-linecap="round"/>
        <path d="M134 242 L160 244 L170 238" fill="none" stroke="#4d372c" stroke-width="3" stroke-linecap="round"/>
        <path d="M166 243 L204 236" stroke="#efe9dc" stroke-width="5" stroke-linecap="round"/>
        <circle cx="205" cy="236" r="3.2" fill="#ff7a3c"/>
        <path d="M208 228 C218 212 204 202 216 186 C224 174 214 164 222 152" fill="none" stroke="#c9ccd2" stroke-width="2" stroke-linecap="round" opacity=".45"/>
      `, '#d0483c');
    },

    thug() {
      return frame(`
        ${torso(112, '#22262b', '#0f1114', '#3d1f22',
          '<path d="M124 298 L110 326 L134 318 Z M176 298 L190 326 L166 318 Z" fill="#2f353c"/>')}
        ${head('#c9a686', '#84684f', 2)}
        <path d="M101 170 C100 112 200 112 199 170 L195 152 C180 138 120 138 105 152 Z" fill="#1b1b1e"/>
        <path d="M114 190 L142 198 M186 190 L158 198" stroke="#1b1b1e" stroke-width="5" stroke-linecap="round"/>
        <path d="M118 201 L140 204 L139 208 L120 206 Z M182 201 L160 204 L161 208 L180 206 Z" fill="#131416"/>
        <path d="M134 246 C142 240 158 240 166 246" fill="none" stroke="#4a342a" stroke-width="3" stroke-linecap="round"/>
        <path d="M176 212 L190 240 M180 222 L186 219 M183 230 L189 227" stroke="#7b4a3f" stroke-width="2" stroke-linecap="round"/>
      `, '#8a97a6');
    },

    yasuoka() {
      return frame(`
        ${torso(120, '#8c7a57', '#4d4230', '#e6e0d2',
          '<path d="M144 304 L156 304 L160 350 L150 360 L140 350 Z" fill="#2d3a4a"/>' +
          '<path d="M124 298 L96 346 L132 330 Z M176 298 L204 346 L168 330 Z" fill="#a08c66"/>')}
        ${head('#d2b092', '#8f7259', 3)}
        <ellipse cx="150" cy="156" rx="84" ry="13" fill="#3b3426"/>
        <path d="M104 154 C100 92 200 92 196 154 Z" fill="#4a4230"/>
        <path d="M104 146 L196 146 L196 154 L104 154 Z" fill="#221d14"/>
        <path d="M118 200 L140 200 M160 200 L182 200" stroke="#1d1a17" stroke-width="4" stroke-linecap="round"/>
        <path d="M116 208 C124 212 134 212 142 208 M158 208 C166 212 176 212 184 208" fill="none" stroke="#8f7259" stroke-width="2"/>
        <path d="M134 244 L166 242" stroke="#553e31" stroke-width="3" stroke-linecap="round"/>
      `, '#d9c58c');
    },

    yagi() {
      return frame(`
        ${torso(108, '#5c6670', '#2c3238', '#ece8de',
          '<path d="M144 304 L156 304 L161 352 L150 362 L139 352 Z" fill="#20463a"/>')}
        ${head('#d9bd9f', '#96795f')}
        <path d="M100 178 C92 108 206 106 200 176 L196 150 C176 150 150 142 132 126 C124 140 112 150 104 152 Z" fill="#1c1a1b"/>
        <path d="M116 197 C124 191 134 191 142 197 M158 197 C166 191 176 191 184 197" fill="none" stroke="#17181a" stroke-width="3.5" stroke-linecap="round"/>
        <path d="M114 186 L142 184 M186 186 L158 184" stroke="#1c1a1b" stroke-width="3" stroke-linecap="round"/>
        <path d="M132 240 C142 250 160 250 170 238" fill="none" stroke="#5a4236" stroke-width="3" stroke-linecap="round"/>
      `, '#8fc1a9');
    },
  };

  const cache = {};
  const Portraits = {
    /** full bust */
    svg(id) {
      if (!cache[id]) cache[id] = (draw[id] || draw.thug)();
      return cache[id];
    },
    /** head-and-shoulders crop for small avatars */
    face(id) {
      return Portraits.svg(id).replace('viewBox="0 0 300 420"', 'viewBox="60 70 180 180"');
    },

    /**
     * Story portrait: the painted cut-out when it has been generated,
     * otherwise the built-in vector bust. `face` is an expression name.
     */
    html(id, face) {
      const path = root.Assets && root.Assets.portrait(id, face);
      if (path) return `<img class="portrait-img" src="${root.Assets.url(path)}" alt="" draggable="false">`;
      return Portraits.svg(id);
    },

    /** Small round avatar for the mahjong table. Accepts "id" or "id:face". */
    avatar(spec) {
      const [id, face] = String(spec).split(':');
      const path = root.Assets && root.Assets.avatar(id, face);
      if (path) return `<img class="avatar-img" src="${root.Assets.url(path)}" alt="" draggable="false">`;
      return Portraits.face(id);
    },
  };

  root.Characters = Characters;
  root.Portraits = Portraits;
})(window);
