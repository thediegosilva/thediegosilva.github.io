/**
 * DUCK GAME — Space Shooter escondido no portfólio (easter egg do Pato Vírus).
 *
 * Canvas API + Vanilla JS, sem bibliotecas. Este arquivo só é baixado quando o
 * visitante clica 7 vezes no pato (import dinâmico).
 *
 * Arquitetura
 *  - Game loop único com requestAnimationFrame e passo de tempo (dt) limitado.
 *  - Nenhum setInterval/setTimeout: todos os tempos (tiros, escudo, ondas) são
 *    contados dentro do loop, então parar o loop para tudo.
 *  - Todos os eventos usam o mesmo AbortController: `abort()` remove todos de uma vez.
 *  - Resolução interna baixa (pixel art de verdade) ampliada sem suavização.
 *  - Chefe com máquina de estados: tiro, escudo, investida (dash) e lacaios.
 *    Fase 1: Disco Voador do Pato. Fase 2: o disco explode e o pato volta na Moto-Turbina
 *    (aponta e atira lasers pelo dedo). Os 3 chefes são pixel art em camadas animadas.
 *    Fase 3: o pato cai sob explosões e se ergue o CRAZY BOSS — DOUTOR INSANO
 *    (olhos-laser, socos-foguete, esferas do núcleo do pato e inimigos grandes).
 *  - Música 8-bit e efeitos sintetizados (duck-audio.js), com botão de mudo.
 *  - O cursor do sistema nunca é escondido nem travado (vira uma mira).
 *
 * Uso: const stop = startDuckGame({ duckSpriteUrl, onExit(result) {} })
 */

import { createDuckAudio } from './duck-audio.js';
import { CRAZY_DATA } from './crazyboss-data.js';
import { BOSS1_DATA, BOSS2_DATA } from './boss-data.js';

/* =========================================================================
   Configuração
   ========================================================================= */
const H = 270; // altura interna; a largura acompanha a proporção da tela
const PLAYER_HP = 10;
const MECHA_HP = 170;
const DUCK_HP = 110;
const CRAZY_HP = 260;
const RECORD_KEY = 'pato-game-recorde';
const SOUND_KEY = 'pato-game-som';

/** Doutor Insano: folha crazyboss.png em camadas (gerada por scripts/make-crazyboss-sprite.py,
 *  que também escreve crazyboss-data.js com pivôs e pontos). O sprite já olha para a esquerda. */
const CRAZY = {
  ...CRAZY_DATA,
  idx: Object.fromEntries(CRAZY_DATA.frames.map((n, i) => [n, i])),
  lights: [[42, 87], [83, 106], [77, 112], [40, 94]],
};
/** Fases 1 e 2: folhas em camadas geradas por scripts/make-boss-sprites.py */
const indexed = (d) => ({ ...d, idx: Object.fromEntries(d.frames.map((n, i) => [n, i])) });
const SAUCER = indexed(BOSS1_DATA); // Disco Voador do Pato
const BIKE = indexed(BOSS2_DATA); // Pato na Moto-Turbina

/** para que lado cada peixe da arte olha (1 = direita, -1 = esquerda) */
const FISH_FACING = { fishA: 1, fishB: -1, fishC: 1 };

/** Parallax: 5 camadas. Para usar artes próprias (ex.: SKINWALKER), coloque a URL em `image`:
 *  a imagem é repetida na horizontal sem emenda. Sem imagem, usa o desenho provisório. */
export const PARALLAX_LAYERS = [
  { name: 'céu', speed: 4, image: null },
  { name: 'estrelas', speed: 12, image: null },
  { name: 'montanhas distantes', speed: 26, image: null },
  { name: 'cidade', speed: 52, image: null },
  { name: 'chão', speed: 110, image: null },
];

/** 5 cenários: a paleta do céu passa do 1 ao 5 e volta ao 1, em ciclo contínuo. */
const SCENES = [
  ['#120a2a', '#3a1450', '#7a2a6a'], // 1 crepúsculo roxo
  ['#061a2e', '#0d3b5c', '#1e7a8c'], // 2 oceano noturno
  ['#1a0a0a', '#4a1414', '#a8401e'], // 3 vulcânico
  ['#04140c', '#0e3a24', '#3a8a4a'], // 4 floresta tóxica
  ['#0a0a14', '#22224a', '#5a5aa8'], // 5 espaço profundo
];
const SCENE_TIME = 18; // segundos por cenário

/* =========================================================================
   Pixel art (matrizes -> canvas)
   ========================================================================= */
function sprite(rows, pal) {
  const w = Math.max(...rows.map((r) => r.length));
  const c = document.createElement('canvas');
  c.width = w;
  c.height = rows.length;
  const g = c.getContext('2d');
  rows.forEach((row, y) =>
    [...row].forEach((ch, x) => {
      if (pal[ch]) {
        g.fillStyle = pal[ch];
        g.fillRect(x, y, 1, 1);
      }
    }),
  );
  return c;
}

/** amplia um sprite por um fator inteiro, mantendo os pixels nítidos */
function upscale(src, k) {
  const c = document.createElement('canvas');
  c.width = src.width * k;
  c.height = src.height * k;
  const g = c.getContext('2d');
  g.imageSmoothingEnabled = false;
  g.drawImage(src, 0, 0, c.width, c.height);
  return c;
}

/** Nave do jogador, 18x11 (mesmo tamanho da anterior). Cada letra é uma cor de SHIP_PAL. */
const SHIP_ROWS = [
  '.oo.......oooo....',
  'oBRo.....oBRCCo...',
  'oBWRo...oBBLCCco..',
  '.oBRRoooKSSCCccco.',
  '..oWWWWWKKKwwwwWo.',
  'KGoWBYWWWWWWWRRBBo',
  'KGowWWWWRYEWWWWBBB',
  'KGoGgwwwbbbbbbbbo.',
  'oBBBBoRRRrbbbbbo..',
  'oBWBBoRrGGGGGo....',
  '.oRRo..oGGGo......',
];
const SHIP_PAL = {
  o: '#140c24', W: '#f4f6ff', w: '#c8d0e0', g: '#8a94b0', G: '#4a5068', B: '#2a5ad9', b: '#1a2f80',
  C: '#c8f4ff', c: '#5ab8f0', R: '#e0303a', r: '#9a1a2a', Y: '#ffd23f', S: '#f0b080', K: '#2a2a3a',
  L: '#7ee0ff', E: '#b6ff6a',
};
// piloto (capacete, óculos, rosto, jaqueta): no corpo da nave, o lugar dele vira vidro
const PILOT_AT = (x, y) => (y === 1 && x >= 10 && x <= 11) || (y === 2 && x >= 9 && x <= 11) || (y === 3 && x >= 8 && x <= 10);
const PILOT_GLASS = { 1: 'C', 2: 'C', 3: 'c' };
const SHIP = { cannon: [13, 9], exhausts: [5, 6, 7], lights: [[8, 6], [9, 6], [10, 6]], wingTip: [2, 10] };

const PAL = {
  o: '#140c24', w: '#ffffff', c: '#7ee0ff', C: '#3a8bd9', b: '#2a3a6a', g: '#9aa4c8', G: '#5a6488',
  y: '#ffd23f', Y: '#e8a816', O: '#ff8a1e', r: '#ff3b5c', R: '#a8142e', p: '#ff6ad5', P: '#b02a8a',
  k: '#5a2a12', K: '#3a180a', e: '#8a4a22', m: '#c8c8d8', M: '#7a7a90', l: '#b6ff6a', L: '#5ab82a',
};

function buildSprites() {
  const s = {
    // nave do jogador (arte de scripts/ref/hero-ship.jpg em 18x11): jato branco, azul e
    // vermelho, deriva com estrela, cabine de vidro, canhão por baixo. O piloto é uma
    // camada à parte (balança dentro da cabine) e as chamas são desenhadas no jogo.
    ship: sprite(SHIP_ROWS.map((r, y) => [...r].map((ch, x) => (PILOT_AT(x, y) ? PILOT_GLASS[y] ?? ch : ch)).join('')), SHIP_PAL),
    pilot: sprite(SHIP_ROWS.map((r, y) => [...r].map((ch, x) => (PILOT_AT(x, y) ? ch : '.')).join('')), SHIP_PAL),
    shot: sprite(['wccc', 'wccc'], PAL),
    egg: sprite(['.okko.', 'okeKko', 'okkkKo', 'okkkKo', 'okkKKo', '.oKKo.'], PAL),
    laser: sprite(['wpppPP'], PAL),
    minion: [
      sprite([
        '..gggg....',
        '.....G....',
        '..oyyyo...',
        '.oyyowyo..',
        'oOyyyyyy..',
        '.oyyyyyo..',
        '..oMMMo...',
        '.oMrMMMo..',
        '..oooo....',
      ], PAL),
      sprite([
        'gggg......',
        '.....G....',
        '..oyyyo...',
        '.oyyowyo..',
        'oOyyyyyy..',
        '.oyyyyyo..',
        '..oMMMo...',
        '.oMMMrMo..',
        '..oooo....',
      ], PAL),
    ],
  };
  // inimigos grandes da fase 3 (criações do Doutor Insano), desenhados em 2x
  const piranhaTop = [
    '.......oooooo.......',
    '.....ooMmmmmMoo..oo.',
    '...ooMmmmmmmmmMooMo.',
    '..oMmyymmmmmrmmMMMo.',
    '.oMmmyommmmrRrmMMo..',
  ];
  const piranhaBottom = [
    '.oMMmmmmmmmmmMMooMo.',
    '..ooMMMMMMMMMoo..oo.',
    '....ooooooooo.......',
  ];
  s.piranha = [
    upscale(sprite([...piranhaTop, 'owowowmmmmmmrmmMMo..', 'o..........ommMMMo..', 'owowowmmmmmmmmmMMMo.', ...piranhaBottom], PAL), 2),
    upscale(sprite([...piranhaTop, 'owowowmmmmmmrmmMMo..', 'ooooooommmmmmmmMMMo.', 'owowowmmmmmmmmmMMMo.', ...piranhaBottom], PAL), 2),
  ];
  const droneBody = [
    '.......oo.......',
    '.....ooMMoo.....',
    '...ooMmmmmMoo...',
    '..oMmmrrrrmmMo..',
    '.oMmmrRwwRrmmMo.',
    '.oMmmrRwwRrmmMo.',
    '..oMmmrrrrmmMo..',
    '...ooMMMMMMoo...',
    '...oMo.oo.oMo...',
    '..oMo..oo..oMo..',
    '..orr..oo..rro..',
  ];
  s.drone = [
    upscale(sprite(['ggggggg..ggggggg', ...droneBody], PAL), 2),
    upscale(sprite(['...gggggggggg...', ...droneBody], PAL), 2),
  ];
  // projéteis (desenhados pelo centro)
  s.orb = sprite(['..ooo..', '.oyyyo.', 'oywwyyo', 'oywyyyo', 'oyyyyOo', '.oyyOo.', '..ooo..'], PAL);
  s.orb2 = upscale(s.orb, 2);
  s.bubble = sprite(['.cccc.', 'cw...c', 'cw...c', 'c....c', 'c...Cc', '.CCCC.'], PAL);
  s.bolt = sprite(['.l.', 'lwl', '.l.'], PAL);
  s.eyeLaser = sprite(['wrrrRR'], PAL);
  // coração flutuante (+1 HP)
  s.heart = sprite([
    '.oo...oo.',
    'orrooorRo',
    'orwrrrrRo',
    'orrrrrrRo',
    '.orrrrRo.',
    '..orrRo..',
    '...oRo...',
    '....o....',
  ], { ...PAL, r: '#ff4f7a', R: '#c21f4a' });
  return s;
}

/* =========================================================================
   Utilidades
   ========================================================================= */
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const rand = (a, b) => a + Math.random() * (b - a);
const pick = (arr) => arr[(Math.random() * arr.length) | 0];
const hit = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
const lerpColor = (a, b, t) => {
  const pa = parseInt(a.slice(1), 16);
  const pb = parseInt(b.slice(1), 16);
  const ch = (s) => [(s >> 16) & 255, (s >> 8) & 255, s & 255];
  const [r1, g1, b1] = ch(pa);
  const [r2, g2, b2] = ch(pb);
  return `rgb(${Math.round(r1 + (r2 - r1) * t)},${Math.round(g1 + (g2 - g1) * t)},${Math.round(b1 + (b2 - b1) * t)})`;
};
const loadRecord = () => {
  try {
    return JSON.parse(localStorage.getItem(RECORD_KEY) || 'null') || { score: 0 };
  } catch {
    return { score: 0 };
  }
};
const saveRecord = (r) => {
  try {
    localStorage.setItem(RECORD_KEY, JSON.stringify(r));
  } catch {
    /* sem armazenamento: tudo bem */
  }
};

/* =========================================================================
   Jogo
   ========================================================================= */
export function startDuckGame({
  duckSpriteUrl,
  bossSpriteUrl = `${import.meta.env?.BASE_URL ?? './'}assets/pato/crazyboss.png`,
  musicUrl = `${import.meta.env?.BASE_URL ?? './'}assets/pato/night-shade.mp3`,
  onExit,
} = {}) {
  const ctrl = new AbortController();
  const on = (target, type, fn, opts = {}) => target.addEventListener(type, fn, { ...opts, signal: ctrl.signal });
  const html = document.documentElement;
  const appRoot = document.getElementById('root');
  const touch = matchMedia('(pointer: coarse)').matches;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- trava a página (e guarda como estava para devolver depois) ---------- */
  const saved = {
    htmlOverflow: html.style.overflow,
    bodyOverflow: document.body.style.overflow,
    rootFilter: appRoot?.style.filter ?? '',
    rootTransition: appRoot?.style.transition ?? '',
    rootPointer: appRoot?.style.pointerEvents ?? '',
    scrollY: window.scrollY,
    focus: document.activeElement,
  };
  html.style.overflow = 'hidden';
  document.body.style.overflow = 'hidden';
  if (appRoot) {
    appRoot.style.transition = 'filter 0.5s ease';
    appRoot.style.filter = 'blur(14px) saturate(0.7) brightness(0.7)';
    appRoot.style.pointerEvents = 'none';
  }
  html.classList.add('duck-game-on');
  // bloqueia rolagem por roda, toque e teclado enquanto o jogo roda
  const stopScroll = (e) => e.preventDefault();
  on(window, 'wheel', stopScroll, { passive: false });
  on(window, 'touchmove', stopScroll, { passive: false });

  /* ---------- DOM do jogo ---------- */
  const wrap = document.createElement('div');
  wrap.className = 'duck-game';
  wrap.setAttribute('role', 'application');
  wrap.setAttribute('aria-label', 'Minigame: batalha contra o Mecha Pato, o Pato e o Doutor Insano. Aperte Escape para sair e M para ligar ou desligar o som.');
  wrap.innerHTML = `
    <canvas class="duck-game__canvas"></canvas>
    <button type="button" class="duck-game__exit">ESC — Sair da Batalha</button>
    <button type="button" class="duck-game__sound" aria-pressed="true"></button>
    <div class="duck-game__end" hidden>
      <p class="duck-game__title"></p>
      <p class="duck-game__sub"></p>
      <p class="duck-game__stats"></p>
      <p class="duck-game__credit">♪ Música: “Night Shade” — Adhesive Wombat</p>
      <div class="duck-game__actions">
        <button type="button" data-again>Jogar de novo</button>
        <button type="button" data-leave>Sair</button>
      </div>
    </div>
    <p class="duck-game__hint">${touch ? 'Arraste o dedo para mover • tiro automático' : 'Mouse move a nave • clique ou Espaço atira • M som • ESC sai'}</p>
    <p class="duck-game__rotate">↻ Gire o celular para jogar melhor</p>`;
  document.body.appendChild(wrap);
  const canvas = wrap.querySelector('canvas');
  const g = canvas.getContext('2d');
  const exitBtn = wrap.querySelector('.duck-game__exit');
  const endBox = wrap.querySelector('.duck-game__end');
  const soundBtn = wrap.querySelector('.duck-game__sound');
  exitBtn.focus({ preventScroll: true });

  /* ---------- som (Web Audio sintetizado; preferência de mudo fica salva) ---------- */
  let soundOff = false;
  try {
    soundOff = localStorage.getItem(SOUND_KEY) === 'off';
  } catch {
    /* sem armazenamento */
  }
  const audio = createDuckAudio({ muted: soundOff, musicUrl });
  const sfx = (name, ...a) => audio?.play(name, ...a);
  const paintSound = () => {
    const off = !audio || audio.muted;
    soundBtn.textContent = off ? '♪ SOM: OFF' : '♪ SOM: ON';
    soundBtn.setAttribute('aria-pressed', String(!off));
    soundBtn.hidden = !audio;
  };
  const toggleSound = () => {
    if (!audio) return;
    audio.unlock();
    audio.setMuted(!audio.muted);
    try {
      localStorage.setItem(SOUND_KEY, audio.muted ? 'off' : 'on');
    } catch {
      /* sem armazenamento */
    }
    paintSound();
  };
  paintSound();

  const S = buildSprites();
  const crazyImg = new Image();
  crazyImg.src = bossSpriteUrl;
  const saucerImg = new Image();
  saucerImg.src = bossSpriteUrl.replace('crazyboss.png', 'boss1.png');
  const bikeImg = new Image();
  bikeImg.src = bossSpriteUrl.replace('crazyboss.png', 'boss2.png');
  const layerImgs = PARALLAX_LAYERS.map((l) => {
    if (!l.image) return null;
    const im = new Image();
    im.src = l.image;
    return im;
  });

  /* ---------- tamanho: altura fixa em pixels de jogo, largura acompanha a tela ---------- */
  let W = 480;
  let scale = 1;
  function resize() {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    W = clamp(Math.round((H * vw) / vh), 300, 720);
    scale = Math.min(vw / W, vh / H); // cabe inteiro na tela (celular em pé fica com faixas)
    canvas.width = W;
    canvas.height = H;
    canvas.style.width = `${Math.floor(W * scale)}px`;
    canvas.style.height = `${Math.floor(H * scale)}px`;
    g.imageSmoothingEnabled = false;
  }
  resize();
  on(window, 'resize', resize);

  /* ---------- entrada ---------- */
  const input = { x: W * 0.25, y: H / 2, firing: false, has: false };
  const toGame = (cx, cy) => {
    const r = canvas.getBoundingClientRect();
    return { x: ((cx - r.left) / r.width) * W, y: ((cy - r.top) / r.height) * H };
  };
  on(canvas, 'pointermove', (e) => {
    const p = toGame(e.clientX, e.clientY);
    input.x = p.x;
    input.y = touch ? p.y - 26 : p.y; // no celular, a nave fica acima do dedo
    input.has = true;
  });
  on(canvas, 'pointerdown', (e) => {
    audio?.unlock();
    const p = toGame(e.clientX, e.clientY);
    input.x = p.x;
    input.y = touch ? p.y - 26 : p.y;
    input.has = true;
    if (e.button === 0) input.firing = true;
  });
  on(window, 'pointerup', () => (input.firing = false));
  on(window, 'blur', () => (input.firing = false));
  on(canvas, 'contextmenu', (e) => e.preventDefault());
  on(window, 'keydown', (e) => {
    audio?.unlock();
    if (e.key === 'm' || e.key === 'M') {
      toggleSound();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      cleanup('saiu');
    } else if (e.code === 'Space') {
      e.preventDefault();
      input.firing = true;
    } else if (['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End'].includes(e.key)) {
      e.preventDefault();
    }
  });
  on(window, 'keyup', (e) => {
    if (e.code === 'Space') input.firing = false;
  });
  on(exitBtn, 'click', () => cleanup('saiu'));
  on(soundBtn, 'click', toggleSound);
  on(wrap.querySelector('[data-leave]'), 'click', () => cleanup(state.result || 'saiu'));
  on(wrap.querySelector('[data-again]'), 'click', () => {
    endBox.hidden = true;
    reset();
    audio?.startMusic();
    loopStart();
  });

  /* ---------- estado ---------- */
  let state;
  function reset() {
    state = {
      t: 0,
      result: null,
      score: 0,
      shake: 0,
      flash: 0,
      bgX: PARALLAX_LAYERS.map(() => 0),
      player: { x: W * 0.2, y: H / 2, hp: PLAYER_HP, inv: 1.5, cool: 0, vx: 0, vy: 0, bank: 0, muzzle: 0, recoil: 0, nod: 0, nodIn: 1.5, glint: 3 },
      shots: [],
      enemyShots: [],
      minions: [],
      bigs: [], // inimigos grandes (fase 3)
      bigTimer: 4,
      hearts: [], // corações flutuantes: pegar = +1 HP
      heartTimer: rand(9, 13),
      particles: [],
      texts: [],
      boss: newMecha(),
      phase: 1,
      transition: 0,
      cutscene: null, // queda do pato / surgimento e morte do Doutor Insano
      banner: null,
    };
    audio?.setLayer(1);
    input.x = W * 0.2;
    input.y = H / 2;
  }

  // vida comum aos chefes animados: piscadas, bico/maxilar, olhar, humor
  const lifeState = () => ({
    blink: 0, blinkIn: rand(1.2, 3), jaw: 0, jawT: 0, mood: 'grin', look: 0, lookY: 0,
    vy: 0, prevY: 0, tilt: 0, recoil: 0, headRot: 0, duckDy: 0, fanA: 0, emit: 0,
  });
  function newMecha() {
    return {
      kind: 'mecha', x: W + 40, y: H / 2 - SAUCER.h / 2, w: SAUCER.w, h: SAUCER.h, hp: MECHA_HP, max: MECHA_HP,
      st: 'enter', stT: 0, fire: 0, last: '', isShielded: false, dashY: 0, baseX: W - SAUCER.w - 10,
      bob: 0, hurt: 0, antA: 0, antV: 0, ...lifeState(),
    };
  }
  function newDuck(x, y) {
    return {
      kind: 'duck', x, y, w: BIKE.w, h: BIKE.h, hp: DUCK_HP, max: DUCK_HP,
      st: 'taunt', stT: 0, fire: 0, last: '', isShielded: false, baseX: W - BIKE.w - 8, ang: 0, hurt: 0, bob: 0,
      arm: 0, armKick: 0, tail: 0, ...lifeState(),
    };
  }

  function newCrazy() {
    return {
      kind: 'crazy', x: W - CRAZY.w - 6, y: H + 20, w: CRAZY.w, h: CRAZY.h, hp: CRAZY_HP, max: CRAZY_HP,
      st: 'rise', stT: 0, fire: 0, last: '', isShielded: false, baseX: W - CRAZY.w - 6, bob: 0, hurt: 0,
      // pose atual e alvo (suavizada a cada quadro): aquário, garra da frente, braço de trás, inclinação
      headRot: 0, armF: 0, armB: 0, lean: 0, pose: { headRot: 0, armF: 0, armB: 0, lean: 0 },
      // vida própria: respiração, rosto boiando, piscadas, maxilar, olhos seguindo a nave
      breath: 0, faceX: 0, faceY: 0, blink: 0, blinkIn: rand(1.5, 3.5), jaw: 0, jawT: 0, mood: 'grin',
      look: 0, twitch: 0, twitchIn: rand(2, 4), vy: 0, prevY: H + 20, recoil: 0,
      fish: CRAZY.frames.filter((n) => n.startsWith('fish')).map((n, i) => ({ n, t: rand(0, 9), sp: rand(0.5, 0.9), dir: i % 2 ? 1 : -1, ox: 0, oy: 0 })),
      beam: null, punches: 0, sub: '', emit: 0, eyeGlow: 0, coreGlow: 0,
      bubbles: Array.from({ length: 9 }, () => ({ x: rand(0, 1), y: rand(0, 1), v: rand(6, 14) })),
    };
  }

  /* ---------- efeitos ---------- */
  const boom = (x, y, n = 14, colors = ['#ffd23f', '#ff8a1e', '#ff3b5c', '#ffffff'], spd = 90) => {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const v = rand(spd * 0.3, spd);
      state.particles.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: rand(0.3, 0.8), max: 0.8, c: pick(colors), s: Math.random() < 0.3 ? 2 : 1 });
    }
  };
  const popText = (x, y, txt, c = '#ffffff', life = 1.2) => state.texts.push({ x, y, txt, c, life, max: life });
  const shake = (v) => (state.shake = reduced ? 0 : Math.max(state.shake, v));

  function hurtPlayer(dmg) {
    const p = state.player;
    if (p.inv > 0 || state.result) return;
    p.hp = Math.max(0, p.hp - dmg);
    p.inv = 1.1;
    sfx('playerHit');
    shake(4 + dmg * 2);
    state.flash = 0.25;
    boom(p.x + 9, p.y + 5, 10, ['#7ee0ff', '#ffffff', '#ff3b5c'], 70);
    popText(p.x + 4, p.y - 6, `-${dmg} HP`, '#ff3b5c');
    if (p.hp <= 0) endGame('derrota');
  }

  /* ---------- chefe: máquina de estados ---------- */
  const rage = (b) => 1 + (1 - b.hp / b.max) * 0.9; // fica mais rápido conforme apanha
  const playerCenter = () => ({ x: state.player.x + 9, y: state.player.y + 5 });

  function aimed(b, speed, spread = 0, sprite = 'egg', ox = 0, oy = 0) {
    const sx = b.x + ox;
    const sy = b.y + oy;
    const p = playerCenter();
    const a = Math.atan2(p.y - sy, p.x - sx) + spread;
    state.enemyShots.push({ x: sx, y: sy, vx: Math.cos(a) * speed, vy: Math.sin(a) * speed, sprite, w: sprite === 'laser' ? 6 : 6, h: sprite === 'laser' ? 1 : 6, ang: a });
  }

  function mechaNextState(b) {
    const options = ['shoot', 'shoot', 'shield', 'dash', 'minions'].filter((s) => s !== b.last || s === 'shoot');
    const next = pick(options);
    b.last = next;
    b.st = next;
    b.stT = 0;
    b.fire = 0;
    b.isShielded = next === 'shield';
    if (next === 'dash') {
      b.dashY = playerCenter().y - b.h / 2;
      sfx('dash');
    }
    if (next === 'minions') {
      sfx('minion');
      const n = Math.round(4 + 4 * (rage(b) - 1));
      for (let i = 0; i < n; i++) {
        state.minions.push({ x: b.x + rand(0, 20), y: clamp(b.y + rand(-50, 50), 20, H - 30), w: 9, h: 8, vx: -rand(55, 95) * rage(b), hp: 2, frame: Math.random() });
      }
      popText(b.x - 10, b.y - 10, 'LACAIOS!', '#ffd23f');
    }
    if (next === 'shield') {
      popText(b.x - 6, b.y - 10, 'ESCUDO!', '#7ee0ff');
      sfx('shield');
    }
  }

  function updateMecha(b, dt) {
    const r = rage(b);
    b.stT += dt;
    b.fire -= dt;
    b.hurt = Math.max(0, b.hurt - dt);
    b.bob += dt;
    const followY = (k) => {
      const target = clamp(playerCenter().y - b.h / 2 + Math.sin(b.bob * 1.7) * 40, 22, H - b.h - 8);
      b.y += (target - b.y) * Math.min(1, dt * k);
    };
    switch (b.st) {
      case 'enter':
        b.x += (b.baseX - b.x) * Math.min(1, dt * 2);
        if (b.stT > 1.6) mechaNextState(b);
        break;
      case 'shoot': // Estado 1: ovos de chocolate para a esquerda (rajadas mirando + leque)
        followY(1.4 * r);
        b.x += (b.baseX - b.x) * Math.min(1, dt * 3);
        if (b.fire <= 0) {
          const burst = Math.random() < 0.5;
          if (burst) {
            for (const s of [-0.18, 0, 0.18]) aimed(b, 150 * r, s, 'egg', ...SAUCER.cannon);
          } else {
            for (let i = -2; i <= 2; i++) state.enemyShots.push({ x: b.x + SAUCER.cannon[0], y: b.y + SAUCER.cannon[1], vx: -130 * r, vy: i * 28, sprite: 'egg', w: 6, h: 6 });
          }
          b.fire = 0.75 / r;
          sfx('egg');
        }
        if (b.stT > 3.2) mechaNextState(b);
        break;
      case 'shield': // Estado 2: escudo, tiros do jogador não causam dano
        followY(0.9 * r);
        if (b.fire <= 0) {
          aimed(b, 110 * r, rand(-0.1, 0.1), 'egg', ...SAUCER.cannon);
          b.fire = 0.55 / r;
          sfx('egg');
        }
        if (b.stT > 2.8) mechaNextState(b);
        break;
      case 'dash': // Estado 3: recua, avisa e cruza a tela em alta velocidade
        if (b.stT < 0.75) {
          b.x += (W - b.w - 4 - b.x) * Math.min(1, dt * 6);
          b.y += (b.dashY - b.y) * Math.min(1, dt * 8);
        } else if (b.stT < 0.75 + 1.4) {
          b.x -= (560 + 140 * (r - 1)) * dt;
          if (b.x < -b.w - 10) b.x = W + 20; // atravessou: volta pela direita
          if (hit(bossBox(b), playerBox())) hurtPlayer(3);
        } else {
          b.x += (b.baseX - b.x) * Math.min(1, dt * 4);
          if (b.stT > 2.9) mechaNextState(b);
        }
        break;
      case 'minions': // Estado 4: lacaios perseguem o Y do jogador
        followY(0.8);
        if (b.fire <= 0) {
          aimed(b, 120 * r, 0, 'egg', ...SAUCER.cannon);
          b.fire = 1.1 / r;
          sfx('egg');
        }
        if (b.stT > 2.4) mechaNextState(b);
        break;
    }
    animateSaucer(b, dt);
    // encostar no disco também machuca
    if (b.st !== 'dash' && hit(bossBox(b), playerBox())) hurtPlayer(2);
  }

  function duckNextState(b) {
    const options = ['triple', 'sweep', 'ring', 'charge', 'triple', 'minions'].filter((s) => s !== b.last);
    const next = pick(options);
    b.last = next;
    b.st = next;
    b.stT = 0;
    b.fire = 0;
    b.ang = Math.PI * 0.75;
    if (next === 'charge') {
      b.dashY = playerCenter().y - b.h / 2;
      sfx('dash');
    }
    if (next === 'minions') {
      sfx('minion');
      for (let i = 0; i < 5; i++) state.minions.push({ x: W + i * 14, y: rand(20, H - 30), w: 9, h: 8, vx: -rand(80, 120), hp: 1, frame: Math.random() });
    }
  }

  function updateDuck(b, dt) {
    const r = rage(b) * 1.15;
    b.stT += dt;
    b.fire -= dt;
    b.hurt = Math.max(0, b.hurt - dt);
    b.bob += dt;
    const sway = () => {
      const target = clamp(H / 2 + Math.sin(b.bob * 2.3) * (H * 0.36) - b.h / 2, 18, H - b.h - 10);
      b.y += (target - b.y) * Math.min(1, dt * 3);
      b.x += (b.baseX + Math.sin(b.bob * 1.3) * 14 - b.x) * Math.min(1, dt * 3);
    };
    const f = bikeFinger(b); // os lasers saem do dedo que aponta
    const muzzle = { ox: f.x - b.x, oy: f.y - b.y };
    switch (b.st) {
      case 'taunt':
        b.x += (b.baseX - b.x) * Math.min(1, dt * 2);
        if (b.stT > 1.8) duckNextState(b);
        break;
      case 'triple': // disparos finos em leque, rápidos
        sway();
        if (b.fire <= 0) {
          for (const s of [-0.22, -0.11, 0, 0.11, 0.22]) aimed(b, 230 * r, s, 'laser', muzzle.ox, muzzle.oy);
          b.fire = 0.42 / r;
          sfx('duckLaser');
        }
        if (b.stT > 3) duckNextState(b);
        break;
      case 'sweep': // rajada contínua que varre a tela
        sway();
        if (b.fire <= 0) {
          b.ang += 0.16;
          const a = Math.PI + Math.sin(b.ang) * 0.75;
          state.enemyShots.push({ x: b.x + muzzle.ox, y: b.y + muzzle.oy, vx: Math.cos(a) * 210 * r, vy: Math.sin(a) * 210 * r, sprite: 'laser', w: 6, h: 1, ang: a });
          b.fire = 0.045 / r;
          sfx('duckLaser');
        }
        if (b.stT > 2.6) duckNextState(b);
        break;
      case 'ring': // anel de disparos
        b.y += (H / 2 - b.h / 2 - b.y) * Math.min(1, dt * 2);
        if (b.fire <= 0) {
          const n = 18;
          const off = Math.random();
          for (let i = 0; i < n; i++) {
            const a = ((i + off) / n) * Math.PI * 2;
            state.enemyShots.push({ x: b.x + BIKE.w * 0.45, y: b.y + BIKE.h * 0.6, vx: Math.cos(a) * 120 * r, vy: Math.sin(a) * 120 * r, sprite: 'laser', w: 6, h: 1, ang: a });
          }
          b.fire = 0.7 / r;
          sfx('ring');
        }
        if (b.stT > 2.8) duckNextState(b);
        break;
      case 'charge': // investida rápida na altura do jogador
        if (b.stT < 0.5) {
          b.y += (b.dashY - b.y) * Math.min(1, dt * 10);
          b.x += (W - b.w - 6 - b.x) * Math.min(1, dt * 8);
        } else if (b.stT < 1.6) {
          b.x -= 640 * dt;
          if (b.x < -b.w - 10) b.x = W + 20;
          if (hit(bossBox(b), playerBox())) hurtPlayer(3);
        } else {
          b.x += (b.baseX - b.x) * Math.min(1, dt * 5);
          if (b.stT > 2.4) duckNextState(b);
        }
        break;
      case 'minions':
        sway();
        if (b.fire <= 0) {
          aimed(b, 200 * r, 0, 'laser', muzzle.ox, muzzle.oy);
          b.fire = 0.3 / r;
          sfx('duckLaser');
        }
        if (b.stT > 2.2) duckNextState(b);
        break;
    }
    animateBike(b, dt);
    if (b.st !== 'charge' && hit(bossBox(b), playerBox())) hurtPlayer(2);
  }

  /* ---------- Fases 1 e 2: vida dos pilotos (o mesmo cuidado do Doutor Insano) ---------- */
  // piscadas, bico abrindo conforme o humor e olhos seguindo a nave
  function animateLife(b, dt, eye) {
    b.blinkIn -= dt;
    if (b.blinkIn <= 0) {
      b.blink = 0.13;
      b.blinkIn = Math.random() < 0.25 ? 0.24 : rand(1.6, 4.2);
    }
    b.blink = Math.max(0, b.blink - dt);
    b.jawT += dt;
    if (b.hurt > 0) b.mood = 'hurt';
    const target = {
      grin: Math.sin(b.jawT * 2.3) > 0.88 ? 1 : 0,
      shout: b.fire > 0 && b.fire < 0.12 ? 2 : Math.sin(b.jawT * 9) > 0.3 ? 1 : 0, // grita a cada disparo
      laugh: Math.round(1 + Math.sin(b.jawT * 22)), // "QUA-QUA-QUA"
      scream: 2,
      grit: 0,
      hurt: 1,
    }[b.mood] ?? 0;
    b.jaw += (target - b.jaw) * Math.min(1, dt * 25);
    const p = playerCenter();
    const dx = p.x - eye.x;
    const dy = p.y - eye.y;
    b.look = Math.abs(dx) > Math.abs(dy) * 0.5 ? Math.sign(dx) : 0;
    b.lookY = Math.abs(dy) > 24 ? Math.sign(dy) : 0;
    b.vy = (b.y - b.prevY) / Math.max(dt, 1e-3);
    if (Math.abs(b.vy) > 900) b.vy = 0; // teleporte (dash voltando pela direita)
    b.prevY = b.y;
    b.recoil = Math.max(0, b.recoil - dt * 12);
    b.fanA += dt * 24;
  }

  // Boss 1: disco inclina com o movimento, antena com mola, pato balançando no banco
  function animateSaucer(b, dt) {
    const t = b.bob;
    b.mood = { enter: 'laugh', shoot: 'shout', shield: 'grit', dash: 'scream', minions: 'laugh' }[b.st] || 'grin';
    const wantTilt = clamp(b.vy * 0.0016, -0.12, 0.12) + (b.st === 'dash' && b.stT > 0.75 ? -0.14 : 0);
    b.tilt += (wantTilt - b.tilt) * Math.min(1, dt * 6);
    // antena: mola amortecida, chacoalha quando o disco acelera
    const acc = -b.vy * 0.02 - (b.st === 'dash' ? 4 : 0);
    b.antV += (-b.antA * 90 - b.antV * 5 + acc * 0.5) * dt;
    b.antA = clamp(b.antA + b.antV * dt, -0.5, 0.5);
    b.duckDy = Math.round(Math.sin(t * 2.6) * 0.9 + (b.mood === 'laugh' ? Math.sin(t * 20) * 0.6 : 0));
    const look = Math.atan2(playerCenter().y - (b.y + SAUCER.eye[1]), -200);
    b.headRot += ((b.mood === 'laugh' ? Math.sin(t * 18) * 0.08 : clamp(-(look + Math.PI) * 0.3, -0.12, 0.12) + Math.sin(t * 1.4) * 0.04) - b.headRot) * Math.min(1, dt * 6);
    animateLife(b, dt, { x: b.x + SAUCER.eye[0], y: b.y + SAUCER.eye[1] });
    // fumaça do motor de trás
    b.emit -= dt;
    if (b.emit <= 0) {
      b.emit = 0.06;
      state.particles.push({ x: b.x + SAUCER.exhaust[0] + 2, y: b.y + SAUCER.exhaust[1] + rand(-2, 2), vx: rand(30, 60), vy: rand(-12, 4), life: rand(0.6, 1.1), max: 1.1, c: pick(['#8a8aa0', '#6a6a80', '#b0b0c0']), s: pick([2, 3]), smoke: true });
    }
  }

  // Boss 2: moto inclina, pato se equilibra, braço mira na nave, rabo abana
  function bikeArmAngle(b) {
    // ângulo para o dedo apontar para a nave
    const [px, py] = BIKE.pivots.armPoint;
    const [fx, fy] = BIKE.finger;
    const base = Math.atan2(fy - py, fx - px);
    const p = playerCenter();
    const want = Math.atan2(p.y - (b.y + py), p.x - (b.x + px));
    let d = want - base;
    d = Math.atan2(Math.sin(d), Math.cos(d));
    return clamp(d, -0.7, 0.7);
  }
  function bikeFinger(b) {
    const [px, py] = BIKE.pivots.armPoint;
    const [fx, fy] = BIKE.finger;
    const a = b.arm - b.armKick;
    const c = Math.cos(a);
    const s2 = Math.sin(a);
    return {
      x: b.x + px + (fx - px) * c - (fy - py) * s2,
      y: b.y + py + b.duckDy + (fx - px) * s2 + (fy - py) * c,
    };
  }
  function animateBike(b, dt) {
    const t = b.bob;
    b.mood = { taunt: 'laugh', triple: 'shout', sweep: 'shout', ring: 'laugh', charge: 'scream', minions: 'laugh' }[b.st] || 'grin';
    const wantTilt = clamp(b.vy * 0.0015, -0.1, 0.1) + (b.st === 'charge' && b.stT > 0.5 && b.stT < 1.6 ? -0.16 : 0);
    b.tilt += (wantTilt - b.tilt) * Math.min(1, dt * 6);
    b.duckDy = Math.round(Math.sin(t * 3.2) * 1.1); // se equilibrando em cima da moto
    b.arm += (bikeArmAngle(b) - b.arm) * Math.min(1, dt * 7);
    b.armKick = Math.max(0, b.armKick - dt * 3);
    if (b.fire > 0 && b.fire < 0.05 && b.st !== 'ring' && b.st !== 'charge') b.armKick = 0.25; // coice do disparo
    b.tail = Math.sin(t * (b.mood === 'laugh' ? 16 : 7)) * 0.3;
    b.headRot += ((b.mood === 'laugh' ? Math.sin(t * 18) * 0.07 : Math.sin(t * 1.5) * 0.04) - b.headRot) * Math.min(1, dt * 6);
    animateLife(b, dt, { x: b.x + BIKE.eyes[1][0], y: b.y + BIKE.eyes[1][1] });
    b.emit -= dt;
    if (b.emit <= 0) {
      b.emit = 0.05;
      const [ex, ey] = pick(BIKE.exhausts);
      state.particles.push({ x: b.x + ex + 2, y: b.y + ey, vx: rand(40, 80), vy: rand(-18, 0), life: rand(0.6, 1.1), max: 1.1, c: pick(['#8a8aa0', '#6a6a80', '#b0b0c0']), s: pick([2, 3]), smoke: true });
      if (Math.random() < 0.5) state.particles.push({ x: b.x + ex + 2, y: b.y + ey, vx: rand(50, 110), vy: rand(-30, 30), life: 0.3, max: 0.3, c: pick(['#ffd23f', '#ff8a1e']), s: 1 });
    }
  }

  /* ---------- Fase 3: CRAZY BOSS — DOUTOR INSANO ---------- */
  // ponto do sprite (px do quadro) -> coordenada do jogo, com respiração, aquário e rosto
  function crazyPoint(b, [px, py], part = 'body') {
    let x = px;
    let y = py + (py < CRAZY.breathY ? b.breath : 0);
    if (part === 'head') {
      const [hx, hy] = CRAZY.pivots.head;
      const c = Math.cos(b.headRot);
      const s = Math.sin(b.headRot);
      const qx = px + b.faceX;
      const qy = py + b.faceY;
      x = hx + (qx - hx) * c - (qy - hy) * s;
      y = hy + (qx - hx) * s + (qy - hy) * c + b.breath;
    }
    return { x: b.x + x, y: b.y + crazyBob(b) + y };
  }
  const crazyBob = (b) => (b.st === 'punch' ? 0 : Math.round(Math.sin(b.bob * 1.8) * 3));
  // caixas: tronco + aquário (recebe tiros) e miolo (machuca ao encostar)
  const crazyHitBox = (b) => ({ x: b.x + 34, y: b.y + 6, w: 64, h: 140 });
  const crazyBodyBox = (b) => ({ x: b.x + 40, y: b.y + 24, w: 52, h: 120 });
  // garra da frente esticada para a esquerda (soco-foguete)
  const crazyFistBox = (b) => ({ x: b.x - 46, y: b.y + 92, w: 58, h: 28 });
  const bossBox = (b) =>
    b.kind === 'crazy'
      ? crazyHitBox(b)
      : b.kind === 'duck'
        ? { x: b.x + b.w * 0.11, y: b.y + b.h * 0.12, w: b.w * 0.81, h: b.h * 0.83 }
        : { x: b.x + b.w * 0.03, y: b.y + b.h * 0.06, w: b.w * 0.94, h: b.h * 0.9 };

  function spawnBig(type) {
    const y = rand(30, H - 60);
    if (type === 'piranha') {
      state.bigs.push({ type, x: W + 10, y, baseY: y, w: 40, h: 22, hp: 6, vx: -rand(38, 55), t: rand(0, 6), fire: rand(0.8, 1.4), frame: 0 });
    } else {
      state.bigs.push({ type, x: W + 10, y, w: 32, h: 24, hp: 9, tx: rand(W * 0.45, W * 0.68), t: 0, fire: 1.2, frame: 0, life: rand(8, 11) });
    }
    sfx('bigEnemy');
  }

  function crazyNextState(b) {
    const options = ['eyes', 'core', 'eyeBolts', 'punch', 'core', 'summon'].filter(
      (s) => s !== b.last && !(s === 'summon' && state.bigs.length >= 2),
    );
    const next = pick(options);
    b.last = next;
    b.st = next;
    b.stT = 0;
    b.fire = 0;
    b.sub = '';
    b.beam = null;
    const r = rage(b);
    if (next === 'eyes') {
      const e = crazyPoint(b, CRAZY.eyes[0], 'head');
      const p = playerCenter();
      b.beam = { on: false, ang: Math.atan2(p.y - e.y, p.x - e.x) + rand(-0.35, 0.35) };
      popText(b.x - 10, b.y + 20, 'OLHOS-LASER!', '#ff3b5c');
      sfx('eyeCharge');
    } else if (next === 'punch') {
      b.punches = r > 1.45 ? 3 : 2;
      b.sub = 'wind';
      popText(b.x - 14, b.y + 90, 'SOCO-FOGUETE!', '#ff8a1e');
      sfx('punchWind');
    } else if (next === 'core') {
      b.sub = pick(['spiral', 'rings', 'bigOrb']);
      popText(b.x + 20, b.y + 66, 'NÚCLEO DO PATO!', '#ffd23f');
    } else if (next === 'summon') {
      popText(b.x - 30, b.y + 30, 'VENHAM, CRIAÇÕES!', '#b6ff6a');
    }
  }

  /* vida do Doutor: tudo que se mexe sozinho, em qualquer estado (luta, entrada, morte) */
  function animateCrazy(b, dt) {
    const t = b.bob;
    // respiração: o tronco de cima (com braços e aquário) sobe 1-2 px e volta
    const breathSpeed = b.mood === 'laugh' || b.mood === 'scream' ? 3.2 : 1.5;
    b.breathT = (b.breathT || 0) + dt * breathSpeed;
    b.breath = -Math.round((Math.sin(b.breathT) + 1) * (b.mood === 'scream' ? 1.2 : 0.9));
    // rosto boiando dentro da água
    b.faceX = Math.round(Math.sin(t * 0.8) * 1.2);
    b.faceY = Math.round(Math.sin(t * 1.3 + 1) * 1.6);
    // olhos seguem a nave
    const e = crazyPoint(b, CRAZY.eyes[0], 'head');
    const p = playerCenter();
    const dx = p.x - e.x;
    const dy = p.y - e.y;
    b.look = Math.abs(dx) > Math.abs(dy) * 0.6 ? Math.sign(dx) : 0;
    b.lookY = Math.abs(dy) > 30 ? Math.sign(dy) : 0;
    // piscadas (às vezes duplas); com dor, aperta os olhos
    b.blinkIn -= dt;
    if (b.blinkIn <= 0) {
      b.blink = 0.14;
      b.blinkIn = Math.random() < 0.25 ? 0.25 : rand(1.8, 4.5);
    }
    b.blink = Math.max(0, b.blink - dt);
    // maxilar conforme o humor
    b.jawT += dt;
    const target = {
      grin: Math.sin(b.jawT * 2.1) > 0.85 ? 1 : 0, // resmunga de vez em quando
      laugh: Math.round(1.5 + Math.sin(b.jawT * 22) * 1.5), // "HA-HA-HA"
      scream: 3 + Math.round(Math.sin(b.jawT * 40)),
      grit: 0,
      hurt: 1,
    }[b.mood];
    b.jaw += (target - b.jaw) * Math.min(1, dt * 25);
    // bolhas saindo da boca quando ri ou grita
    if ((b.mood === 'laugh' || b.mood === 'scream') && Math.random() < dt * 6) {
      const bb = b.bubbles[(Math.random() * b.bubbles.length) | 0];
      const [tx, ty, tw, th] = CRAZY.tank;
      bb.x = (CRAZY.jaw[0] + CRAZY.jaw[2] / 2 + b.faceX - tx) / tw + rand(-0.05, 0.05);
      bb.y = (CRAZY.jawTop + b.faceY - ty) / th;
    }
    for (const bb of b.bubbles) {
      bb.y -= (bb.v / CRAZY.tank[3]) * dt;
      bb.x += Math.sin(t * 3 + bb.v) * 0.002;
      if (bb.y < 0) {
        bb.y = 1;
        bb.x = rand(0, 1);
      }
    }
    // peixes nadando de um lado para o outro dentro do aquário
    for (const f of b.fish) {
      f.t += dt * f.sp;
      const [, , fw] = CRAZY.fish[f.n];
      const span = (CRAZY.tank[2] - fw) * 0.42;
      const nx = Math.sin(f.t) * span;
      f.dir = nx < f.ox ? -1 : nx > f.ox ? 1 : f.dir;
      f.ox = nx;
      f.oy = Math.sin(f.t * 2.3) * 3;
    }
    // espasmos da garra (cientista maluco)
    b.twitchIn -= dt;
    if (b.twitchIn <= 0) {
      b.twitch = 0.18;
      b.twitchIn = rand(1.5, 3.5);
    }
    b.twitch = Math.max(0, b.twitch - dt);
    // velocidade vertical (inclina e muda a chama do propulsor)
    b.vy = (b.y - b.prevY) / Math.max(dt, 1e-3);
    b.prevY = b.y;
    b.recoil = Math.max(0, b.recoil - dt * 12);
  }

  function updateCrazy(b, dt) {
    const r = rage(b);
    const pose = b.pose;
    b.stT += dt;
    b.fire -= dt;
    b.hurt = Math.max(0, b.hurt - dt);
    b.bob += dt;
    b.eyeGlow = Math.max(0, b.eyeGlow - dt * 2);
    b.coreGlow = Math.max(0, b.coreGlow - dt * 2);
    // pose de descanso: garra gesticulando, braço de trás balançando, aquário oscilando
    pose.headRot = Math.sin(b.bob * 1.6) * 0.025;
    pose.armF = Math.sin(b.bob * 2.3) * 0.12 + Math.sin(b.bob * 5.1) * 0.04;
    pose.armB = Math.sin(b.bob * 1.7 + 1) * 0.08;
    pose.lean = 0;
    b.mood = 'grin';
    const hover = (k = 1) => {
      const target = clamp(playerCenter().y - 85 + Math.sin(b.bob * 0.9) * 50, -4, H - 160);
      b.y += (target - b.y) * Math.min(1, dt * k);
      b.x += (b.baseX + Math.sin(b.bob * 0.7) * 10 - b.x) * Math.min(1, dt * 2);
    };
    const orb = (x, y, a, v, big = false) =>
      state.enemyShots.push({ kind: big ? 'bigOrb' : 'orb', x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, t: 0 });

    // fumaça saindo das chaminés
    b.emit -= dt;
    if (b.emit <= 0) {
      b.emit = 0.07;
      for (const c of CRAZY.chimneys) {
        const p = crazyPoint(b, c);
        state.particles.push({ x: p.x + rand(-1, 1), y: p.y, vx: rand(-6, 6), vy: -rand(18, 30), life: rand(0.8, 1.4), max: 1.4, c: pick(['#8a8aa0', '#6a6a80', '#b0b0c0']), s: pick([2, 2, 3]), smoke: true });
      }
    }

    switch (b.st) {
      case 'taunt':
        hover(1);
        pose.armF = -0.45 + Math.sin(b.bob * 14) * 0.25; // sacode a garra rindo
        pose.armB = -0.5 + Math.sin(b.bob * 11) * 0.15;
        pose.headRot = Math.sin(b.bob * 18) * 0.04;
        b.mood = 'laugh';
        if (b.stT > 1.4) crazyNextState(b);
        break;

      case 'eyes': {
        // carrega (olhos acendendo) e dispara dois raios que perseguem a nave devagar
        hover(0.6);
        const beam = b.beam;
        const eyes = CRAZY.eyes.map((e) => crazyPoint(b, e, 'head'));
        const mid = { x: (eyes[0].x + eyes[1].x) / 2, y: (eyes[0].y + eyes[1].y) / 2 };
        const p = playerCenter();
        b.eyeGlow = 1;
        pose.headRot = -0.05;
        pose.armF = 0.35; // garra recolhida, concentrando
        pose.armB = -0.3;
        b.mood = beam.on ? 'scream' : 'grit';
        const chargeT = 0.85;
        const fireT = 1.7 + 0.4 * (r - 1);
        if (b.stT >= chargeT && !beam.on) {
          beam.on = true;
          sfx('eyeBeam', fireT);
          shake(3);
        }
        const want = Math.atan2(p.y - mid.y, p.x - mid.x);
        let diff = want - beam.ang;
        diff = Math.atan2(Math.sin(diff), Math.cos(diff));
        const turn = (beam.on ? 0.5 : 1.6) * r * dt;
        beam.ang += clamp(diff, -turn, turn);
        if (beam.on) {
          pose.headRot = -0.05 + rand(-0.02, 0.02); // tremendo com o recuo
          shake(1.2);
          const dx = Math.cos(beam.ang);
          const dy = Math.sin(beam.ang);
          for (const e of eyes) {
            const vx = p.x - e.x;
            const vy = p.y - e.y;
            const t = vx * dx + vy * dy;
            if (t > 0 && Math.abs(vx * dy - vy * dx) < 4) hurtPlayer(2);
          }
          if (Math.random() < 0.5) {
            // faíscas onde o raio bate na borda da tela
            const L = 700;
            const ex = clamp(mid.x + dx * L, 0, W);
            const ey = clamp(mid.y + dy * L, 0, H);
            boom(ex, ey, 2, ['#ff3b5c', '#ffffff', '#ff8a1e'], 60);
          }
        }
        if (b.stT > chargeT + fireT) {
          b.beam = null;
          crazyNextState(b);
        }
        break;
      }

      case 'eyeBolts': // rajadas rápidas, um olho de cada vez
        hover(1.2);
        b.eyeGlow = 0.7;
        b.mood = 'laugh';
        pose.armF = -0.2 + Math.sin(b.bob * 9) * 0.1;
        if (b.fire <= 0) {
          b.alt = !b.alt;
          const e = crazyPoint(b, CRAZY.eyes[b.alt ? 0 : 1], 'head');
          const p = playerCenter();
          const a = Math.atan2(p.y - e.y, p.x - e.x) + rand(-0.12, 0.12);
          state.enemyShots.push({ x: e.x, y: e.y, vx: Math.cos(a) * 250 * r, vy: Math.sin(a) * 250 * r, sprite: 'eyeLaser', w: 6, h: 1, ang: a });
          b.fire = 0.13 / r;
          sfx('eyeBolt');
        }
        if (b.stT > 2.4) crazyNextState(b);
        break;

      case 'core': {
        // o pato no núcleo do peito solta esferas
        hover(0.8);
        pose.armF = -0.55 + Math.sin(b.bob * 10) * 0.08; // abre os braços expondo o núcleo
        pose.armB = -0.95 + Math.sin(b.bob * 10 + 1) * 0.08;
        pose.lean = 0.04;
        b.mood = 'laugh';
        b.coreGlow = 1;
        const c = crazyPoint(b, CRAZY.core);
        if (b.sub === 'spiral' && b.fire <= 0) {
          b.spin = (b.spin || 0) + 0.32;
          for (const off of [0, Math.PI * 0.66, Math.PI * 1.33]) orb(c.x, c.y, b.spin + off, 95 * r);
          b.fire = 0.1 / r;
          sfx('orb');
        } else if (b.sub === 'rings' && b.fire <= 0) {
          const n = 16;
          const off = Math.random();
          for (let i = 0; i < n; i++) orb(c.x, c.y, ((i + off) / n) * Math.PI * 2, 85 * r);
          b.fire = 0.8 / r;
          sfx('ring');
          sfx('orb');
        } else if (b.sub === 'bigOrb' && b.fire <= 0) {
          const p = playerCenter();
          orb(c.x, c.y, Math.atan2(p.y - c.y, p.x - c.x) + rand(-0.25, 0.25), 75, true);
          b.fire = 0.9 / r;
          sfx('bigOrb');
        }
        if (b.stT > 3) crazyNextState(b);
        break;
      }

      case 'punch': {
        // soco-foguete: mira na altura da nave, avisa e cruza a tela com o braço esticado
        const fist = CRAZY.pivots.armFront[1]; // altura do punho esticado em relação ao topo do sprite
        if (b.sub === 'wind') {
          const ty = clamp(playerCenter().y - fist, -70, H - 150);
          b.dashY = ty;
          b.x += (W - b.w + 8 - b.x) * Math.min(1, dt * 5);
          b.y += (ty - b.y) * Math.min(1, dt * 7);
          pose.armF = 0.6; // puxa a garra para trás
          pose.armB = -0.4;
          pose.lean = 0.1;
          b.mood = 'grit';
          if (b.stT > 0.85 / Math.sqrt(r)) {
            b.sub = 'go';
            b.stT = 0;
            sfx('punch');
            shake(5);
          }
        } else if (b.sub === 'go') {
          pose.armF = -Math.PI / 2; // garra esticada apontando para a nave
          pose.armB = 0.5;
          pose.lean = -0.14;
          b.mood = 'scream';
          b.x -= (600 + 120 * (r - 1)) * dt;
          if (Math.random() < 0.8) {
            const f = crazyFistBox(b);
            state.particles.push({ x: f.x + f.w + 30, y: f.y + rand(4, f.h - 4), vx: rand(60, 120), vy: rand(-10, 10), life: 0.4, max: 0.4, c: pick(['#ff8a1e', '#ffd23f', '#ff3b5c']), s: 2 });
          }
          if (hit(crazyFistBox(b), playerBox()) || hit(crazyBodyBox(b), playerBox())) hurtPlayer(3);
          if (b.x < -b.w - 40) {
            b.x = W + 30;
            b.sub = 'back';
            b.stT = 0;
          }
        } else {
          pose.armF = -0.2;
          b.x += (b.baseX - b.x) * Math.min(1, dt * 4);
          b.y += (clamp(b.y, 4, H - b.h - 4) - b.y) * Math.min(1, dt * 4);
          if (Math.abs(b.x - b.baseX) < 6) {
            b.punches--;
            if (b.punches > 0) {
              b.sub = 'wind';
              b.stT = 0;
              sfx('punchWind');
            } else crazyNextState(b);
          }
        }
        break;
      }

      case 'summon': // levanta a garra e chama inimigos grandes + lacaios
        hover(0.8);
        pose.armF = -0.6 + Math.sin(b.bob * 16) * 0.2; // ergue a garra chamando as criações
        pose.armB = -0.7;
        pose.headRot = -0.04;
        b.mood = 'laugh';
        if (b.stT > 0.4 && !b.summoned) {
          b.summoned = true;
          spawnBig('piranha');
          if (state.bigs.length < 3) spawnBig('drone');
          for (let i = 0; i < 4; i++) state.minions.push({ x: W + i * 16, y: rand(20, H - 30), w: 9, h: 8, vx: -rand(80, 115), hp: 1, frame: Math.random() });
          sfx('minion');
        }
        if (b.stT > 1.6) {
          b.summoned = false;
          crazyNextState(b);
        }
        break;
    }

    // suaviza a pose (movimentos de pixel art com peso)
    const k = Math.min(1, dt * (b.st === 'punch' ? 14 : 8));
    b.headRot += (pose.headRot - b.headRot) * k;
    b.armF += (pose.armF - b.armF) * k;
    b.armB += (pose.armB - b.armB) * k;
    b.lean += (pose.lean - b.lean) * k;
    if (b.hurt > 0) b.mood = 'hurt';
    animateCrazy(b, dt);

    if (b.st !== 'punch' && hit(crazyBodyBox(b), playerBox())) hurtPlayer(2);

    // inimigos grandes chegam de tempos em tempos
    state.bigTimer -= dt;
    if (state.bigTimer <= 0) {
      state.bigTimer = rand(7, 10) / r;
      if (state.bigs.length < 2) spawnBig(pick(['piranha', 'drone']));
    }
  }

  function updateBigs(dt) {
    for (const e of state.bigs) {
      e.t += dt;
      e.frame += dt * 8;
      e.fire -= dt;
      e.hurt = Math.max(0, (e.hurt || 0) - dt);
      const p = playerCenter();
      if (e.type === 'piranha') {
        // nada em ondas e cospe bolhas
        e.x += e.vx * dt;
        e.y = clamp(e.baseY + Math.sin(e.t * 2.6) * 22, 18, H - e.h - 10);
        e.baseY += (p.y - e.h / 2 - e.baseY) * Math.min(1, dt * 0.35);
        if (e.fire <= 0 && e.x < W - 20) {
          for (const s of [-0.2, 0, 0.2]) {
            const a = Math.atan2(p.y - (e.y + 12), p.x - e.x) + s;
            state.enemyShots.push({ kind: 'bubble', x: e.x + 2, y: e.y + 12, vx: Math.cos(a) * 95, vy: Math.sin(a) * 95, t: rand(0, 6) });
          }
          e.fire = rand(1.5, 2.1);
          sfx('bubble');
        }
        if (e.x < -e.w - 10) e.dead = true;
      } else {
        // drone-garra: para numa posição, segue a nave na vertical e solta faíscas em leque
        e.life -= dt;
        const tx = e.life > 0 ? e.tx : -80;
        e.x += (tx - e.x) * Math.min(1, dt * (e.life > 0 ? 1.4 : 0.9));
        if (e.life <= 0) e.x -= 60 * dt;
        e.y += (clamp(p.y - e.h / 2 + Math.sin(e.t * 1.8) * 30, 18, H - e.h - 10) - e.y) * Math.min(1, dt * 1.2);
        if (e.fire <= 0 && e.life > 0) {
          for (const s of [-0.3, -0.1, 0.1, 0.3]) {
            const a = Math.atan2(p.y - (e.y + 12), p.x - (e.x + 6)) + s;
            state.enemyShots.push({ kind: 'bolt', x: e.x + 6, y: e.y + 12, vx: Math.cos(a) * 140, vy: Math.sin(a) * 140, t: 0 });
          }
          e.fire = 1.3;
          sfx('bolt');
        }
        if (e.x < -e.w - 10) e.dead = true;
      }
      if (!e.dead && hit(e, playerBox())) {
        e.dead = true;
        boom(e.x + e.w / 2, e.y + e.h / 2, 24, undefined, 110);
        sfx('pop');
        hurtPlayer(2);
      }
    }
    state.bigs = state.bigs.filter((e) => !e.dead);
  }

  /* ---------- corações flutuantes: vêm da direita balançando; pegar = +1 HP ---------- */
  function updateHearts(dt) {
    const p = state.player;
    if (!state.cutscene && !state.transition && !state.result) {
      state.heartTimer -= dt;
      if (state.heartTimer <= 0) {
        // aparecem mais vezes quando a nave está machucada
        state.heartTimer = p.hp <= 3 ? rand(6, 9) : p.hp < PLAYER_HP ? rand(10, 15) : rand(16, 22);
        const y = rand(30, H - 40);
        state.hearts.push({ x: W + 10, y, baseY: y, t: rand(0, 6), w: 9, h: 8 });
      }
    }
    // a nave inteira pega o coração (mais generoso que a caixa de dano)
    const grab = { x: p.x - 2, y: p.y - 2, w: 22, h: 15 };
    for (const h of state.hearts) {
      h.t += dt;
      h.x -= 34 * dt;
      h.y = h.baseY + Math.sin(h.t * 2.4) * 14;
      if (h.x < -12) h.dead = true;
      else if (!state.result && p.hp > 0 && hit(h, grab)) {
        h.dead = true;
        boom(h.x + 4, h.y + 4, 14, ['#ff4f7a', '#ffffff', '#ffb3c6'], 60);
        if (p.hp < PLAYER_HP) {
          p.hp += 1;
          popText(p.x - 4, p.y - 10, '+1 HP', '#ff4f7a');
        } else {
          state.score += 200; // vida cheia: vira pontos
          popText(p.x - 4, p.y - 10, '+200', '#ffd23f');
        }
        sfx('heart');
      }
    }
    state.hearts = state.hearts.filter((h) => !h.dead);
  }
  function drawHearts() {
    for (const h of state.hearts) {
      const pulse = 0.5 + 0.5 * Math.sin(h.t * 6);
      g.fillStyle = `rgba(255,79,122,${0.18 + 0.15 * pulse})`;
      g.beginPath();
      g.arc(Math.round(h.x + 4.5), Math.round(h.y + 4), 7 + pulse * 2, 0, Math.PI * 2);
      g.fill();
      drawSprite(S.heart, h.x, h.y);
      if (Math.floor(h.t * 4) % 3 === 0) {
        g.fillStyle = '#ffffff'; // brilho
        g.fillRect(Math.round(h.x + 8), Math.round(h.y - 1), 1, 1);
      }
    }
  }

  // área de colisão do jogador: só o miolo da nave (justo, estilo bullet hell)
  const playerBox = () => ({ x: state.player.x + 5, y: state.player.y + 3, w: 8, h: 5 });

  // caixas de colisão dos projéteis inimigos (ovo/laser: canto; os novos: centro)
  const SHOT_BOX = {
    egg: (s) => ({ x: s.x + 1, y: s.y + 1, w: 4, h: 4 }),
    laser: (s) => ({ x: s.x + 1, y: s.y, w: 4, h: 1 }),
    eyeLaser: (s) => ({ x: s.x + 1, y: s.y, w: 4, h: 1 }),
    orb: (s) => ({ x: s.x - 2, y: s.y - 2, w: 4, h: 4 }),
    bigOrb: (s) => ({ x: s.x - 5, y: s.y - 5, w: 10, h: 10 }),
    bubble: (s) => ({ x: s.x - 2, y: s.y - 2, w: 4, h: 4 }),
    bolt: (s) => ({ x: s.x - 1, y: s.y - 1, w: 2, h: 2 }),
  };

  /* ---------- cenas: queda do pato -> Doutor Insano se ergue / morte do Doutor ---------- */
  function updateCutscene(dt) {
    const cs = state.cutscene;
    cs.t += dt;
    if (cs.kind === 'duckFall') {
      const d = cs.duck;
      if (cs.t < 1.5) {
        // explosões em cima do pato
        d.hurt = Math.random() < 0.4 ? 0.05 : 0;
        d.x += rand(-1.5, 1.5);
        if (Math.random() < 0.5) boom(d.x + rand(0, d.w), d.y + rand(0, d.h), 8, undefined, 130);
        d.mood = 'scream';
        animateBike(d, dt);
        if (Math.random() < 0.14) sfx('explode');
        shake(3);
      } else if (cs.t < 3.1) {
        if (!d.falling) {
          d.falling = true;
          d.vy = -90;
          d.rot = 0;
          sfx('fall');
          popText(d.x - 10, d.y - 14, 'QUAAACK!', '#ffd23f', 1.4);
        }
        d.vy += 230 * dt;
        d.y += d.vy * dt;
        d.x -= 14 * dt;
        d.rot -= 7 * dt;
        if (Math.random() < 0.6) state.particles.push({ x: d.x + d.w / 2, y: d.y + d.h / 2, vx: rand(-10, 10), vy: -rand(10, 30), life: 0.8, max: 0.8, c: pick(['#6a6a80', '#8a8aa0']), s: 2, smoke: true });
      } else if (!cs.landed) {
        cs.landed = true;
        state.boss = null;
        boom(d.x + d.w / 2, H - 6, 80, undefined, 200);
        sfx('explode');
        shake(12);
        cs.crazy = newCrazy();
      }
      if (cs.t > 3.6 && !cs.rising) {
        cs.rising = true;
        state.boss = cs.crazy;
        sfx('rise');
        state.banner = { title: 'CRAZY BOSS', sub: 'DOUTOR INSANO', t: 0, life: 3.8 };
      }
      if (cs.rising) {
        const c = cs.crazy;
        const target = H / 2 - 82;
        c.y += (target - c.y) * Math.min(1, dt * 1.5);
        c.bob += dt;
        c.mood = cs.t > 6.1 ? 'laugh' : 'grit';
        c.armF += ((cs.t > 6.1 ? -0.5 + Math.sin(c.bob * 14) * 0.25 : 0.2) - c.armF) * Math.min(1, dt * 6);
        c.armB += ((cs.t > 6.1 ? -0.6 : 0.1) - c.armB) * Math.min(1, dt * 6);
        animateCrazy(c, dt);
        shake(cs.t < 6 ? 2.5 : 0);
        if (cs.t < 6 && Math.random() < 0.7) state.particles.push({ x: c.x + rand(10, c.w - 10), y: H - 4, vx: rand(-40, 40), vy: -rand(20, 70), life: 0.9, max: 0.9, c: pick(['#6a6a80', '#8a5a3a', '#b0b0c0']), s: 2, smoke: true });
      }
      if (cs.t > 6.1 && !cs.laughed) {
        cs.laughed = true;
        const c = cs.crazy;
        c.eyeGlow = 1;
        sfx('laugh');
        popText(c.x - 20, c.y + 6, 'MUAHAHAHA!', '#ff3b5c', 1.6);
        // conserto de emergência da nave para a última batalha
        const p = state.player;
        const healed = Math.min(PLAYER_HP, p.hp + 3) - p.hp;
        if (healed > 0) {
          p.hp += healed;
          popText(p.x - 8, p.y - 10, `REPARO +${healed} HP`, '#b6ff6a', 1.6);
          sfx('heal');
        }
      }
      if (cs.t > 7.3) {
        const c = cs.crazy;
        state.cutscene = null;
        state.phase = 3;
        audio?.setLayer(3);
        c.st = 'taunt';
        c.stT = 0;
        state.bigTimer = 5;
      }
    } else if (cs.kind === 'crazyDeath') {
      const b = cs.crazy;
      b.hurt = Math.random() < 0.4 ? 0.05 : 0;
      b.x += rand(-1.2, 1.2);
      b.armF += (-0.9 + Math.sin(cs.t * 25) * 0.3 - b.armF) * Math.min(1, dt * 8);
      b.armB += (-1.1 + Math.sin(cs.t * 21) * 0.3 - b.armB) * Math.min(1, dt * 8);
      b.headRot = Math.sin(cs.t * 30) * 0.05;
      b.mood = 'scream';
      animateCrazy(b, dt);
      if (Math.random() < 0.7) boom(b.x + rand(15, b.w - 15), b.y + rand(10, b.h - 10), 8, undefined, 140);
      if (Math.random() < 0.16) sfx('explode');
      shake(4);
      if (cs.t > 1.3 && !cs.shattered) {
        cs.shattered = true;
        b.broken = true;
        sfx('shatter');
        const [tx, ty, tw, th] = CRAZY.tank;
        for (let i = 0; i < 60; i++) {
          const a = rand(-Math.PI, 0);
          const v = rand(40, 160);
          state.particles.push({ x: b.x + tx + rand(0, tw), y: b.y + ty + rand(0, th), vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: rand(0.6, 1.2), max: 1.2, c: pick(['#7ee0ff', '#ffffff', '#3a8bd9']), s: pick([1, 2]), fall: true });
        }
      }
      if (cs.t > 1.3) b.y += 40 * dt; // afunda
      if (cs.t > 2.6 && !cs.done) {
        cs.done = true;
        boom(b.x + b.w / 2, b.y + b.h / 2, 120, undefined, 260);
        shake(16);
        sfx('explode');
        const p = state.player;
        state.score += 8000 + p.hp * 400 + Math.max(0, Math.round(420 - state.t)) * 20;
        state.boss = null;
        state.cutscene = null;
        endGame('vitoria');
      }
    }
  }

  /* ---------- atualização ---------- */
  function update(dt) {
    state.t += dt;
    const p = state.player;
    const b = state.boss;

    // parallax
    PARALLAX_LAYERS.forEach((l, i) => (state.bgX[i] = (state.bgX[i] + l.speed * dt) % 100000));

    // jogador segue o cursor exatamente (dentro da tela)
    const lastX = p.x;
    const lastY = p.y;
    p.x = clamp(input.x - 9, 2, W - 20);
    p.y = clamp(input.y - 5, 14, H - 12);
    // velocidade suavizada: inclina a nave e muda o tamanho das chamas
    p.vx += ((p.x - lastX) / dt - p.vx) * Math.min(1, dt * 10);
    p.vy += ((p.y - lastY) / dt - p.vy) * Math.min(1, dt * 10);
    p.bank += (clamp(p.vy * 0.0018, -0.22, 0.22) - p.bank) * Math.min(1, dt * 12);
    p.muzzle = Math.max(0, p.muzzle - dt);
    p.recoil = Math.max(0, p.recoil - dt * 14);
    // piloto: balança de vez em quando e se encolhe quando a nave leva dano
    p.nodIn -= dt;
    if (p.nodIn <= 0) {
      p.nod = 0.22;
      p.nodIn = rand(1.2, 3);
    }
    p.nod = Math.max(0, p.nod - dt);
    p.glint -= dt;
    if (p.glint < -0.5) p.glint = rand(2, 4); // reflexo correndo pelo vidro
    p.inv = Math.max(0, p.inv - dt);
    p.cool -= dt;
    const firing = input.firing || (touch && input.has);
    if (firing && p.cool <= 0 && !state.result && !state.transition && !state.cutscene) {
      state.shots.push({ x: p.x + SHIP.cannon[0], y: p.y + SHIP.cannon[1] - 1, w: 4, h: 2 });
      p.cool = 0.1;
      p.muzzle = 0.05; // clarão na boca do canhão
      p.recoil = 1;
      sfx('shoot');
    }

    // tiros do jogador
    for (let i = state.shots.length - 1; i >= 0; i--) {
      const s = state.shots[i];
      s.x += 420 * dt;
      let gone = s.x > W + 10;
      if (!gone && b && !state.transition && !state.cutscene && hit(s, bossBox(b))) {
        gone = true;
        if (b.isShielded) {
          boom(s.x, s.y, 3, ['#7ee0ff', '#ffffff'], 40);
          sfx('shield');
        } else {
          b.hp -= 1;
          b.hurt = 0.06;
          b.recoil = 1;
          state.score += 10;
          boom(s.x, s.y, 2, ['#ffffff', '#ffd23f'], 30);
          sfx('hit');
          if (b.hp <= 0) bossDown();
        }
      }
      if (!gone) {
        for (const e of state.bigs) {
          if (hit(s, e)) {
            gone = true;
            e.hp -= 1;
            e.hurt = 0.06;
            sfx('hit');
            if (e.hp <= 0 && !e.dead) {
              e.dead = true;
              state.score += 300;
              boom(e.x + e.w / 2, e.y + e.h / 2, 26, undefined, 110);
              popText(e.x, e.y - 6, '+300', '#ffd23f', 0.9);
              sfx('explode');
            }
            break;
          }
        }
      }
      if (!gone) {
        for (const m of state.minions) {
          if (hit(s, m)) {
            gone = true;
            m.hp -= 1;
            if (m.hp <= 0) {
              m.dead = true;
              state.score += 50;
              boom(m.x + 4, m.y + 4, 10, undefined, 60);
              sfx('pop');
            }
            break;
          }
        }
      }
      if (gone) state.shots.splice(i, 1);
    }

    // chefe
    if (b && !state.transition && !state.cutscene) ({ mecha: updateMecha, duck: updateDuck, crazy: updateCrazy })[b.kind](b, dt);
    if (state.cutscene) updateCutscene(dt);
    updateBigs(dt);
    updateHearts(dt);
    if (state.banner) {
      state.banner.t += dt;
      if (state.banner.t > state.banner.life) state.banner = null;
    }

    // transição: mecha explode, o pato sai na prancha
    if (state.transition) {
      state.transition -= dt;
      b.hurt = Math.random() < 0.35 ? 0.05 : 0; // pisca enquanto explode
      b.x += rand(-1.5, 1.5);
      b.y += 6 * dt; // vai afundando
      if (Math.random() < 0.6) boom(b.x + rand(0, b.w), b.y + rand(0, b.h), 6, undefined, 120);
      if (Math.random() < 0.12) sfx('explode');
      shake(3);
      if (state.transition <= 0) {
        boom(b.x + b.w / 2, b.y + b.h / 2, 90, undefined, 220);
        shake(14);
        state.transition = 0;
        state.boss = newDuck(b.x + 6, clamp(b.y - 30, 10, H - BIKE.h - 10));
        state.phase = 2;
        audio?.setLayer(2);
        sfx('explode');
        popText(state.boss.x - 40, state.boss.y - 14, 'AGORA É PESSOAL!', '#ffd23f', 2);
      }
    }

    // lacaios: perseguem o Y do jogador e explodem ao encostar
    for (const m of state.minions) {
      m.x += m.vx * dt;
      m.y += (playerCenter().y - 4 - m.y) * Math.min(1, dt * 1.8);
      m.frame += dt * 10;
      if (!m.dead && hit(m, playerBox())) {
        m.dead = true;
        boom(m.x + 4, m.y + 4, 12, undefined, 80);
        sfx('pop');
        hurtPlayer(1);
      }
      if (m.x < -20) m.dead = true;
    }
    state.minions = state.minions.filter((m) => !m.dead);

    // tiros inimigos
    const pb = playerBox();
    for (let i = state.enemyShots.length - 1; i >= 0; i--) {
      const s = state.enemyShots[i];
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      if (s.kind) s.t += dt;
      if (s.kind === 'bubble') s.y += Math.sin(s.t * 9) * 22 * dt; // bolha balança
      if (s.kind === 'bigOrb' && s.t > 1.1) {
        // esfera grande explode em 10 menores
        const off = Math.random();
        for (let k = 0; k < 10; k++) {
          const a = ((k + off) / 10) * Math.PI * 2;
          state.enemyShots.push({ kind: 'orb', x: s.x, y: s.y, vx: Math.cos(a) * 90, vy: Math.sin(a) * 90, t: 0 });
        }
        boom(s.x, s.y, 10, ['#ffd23f', '#ff6ad5', '#ffffff'], 70);
        sfx('orb');
        state.enemyShots.splice(i, 1);
        continue;
      }
      const box = SHOT_BOX[s.kind || s.sprite](s);
      if (hit(box, pb)) {
        state.enemyShots.splice(i, 1);
        hurtPlayer(1);
        continue;
      }
      if (s.x < -12 || s.x > W + 12 || s.y < -12 || s.y > H + 12) state.enemyShots.splice(i, 1);
    }

    // partículas e textos
    for (const pt of state.particles) {
      pt.x += pt.vx * dt;
      pt.y += pt.vy * dt;
      if (pt.fall) pt.vy += 260 * dt; // cacos e água caem
      else if (!pt.smoke) {
        pt.vx *= 0.96;
        pt.vy *= 0.96;
      }
      pt.life -= dt;
    }
    state.particles = state.particles.filter((pt) => pt.life > 0);
    for (const tx of state.texts) {
      tx.y -= 14 * dt;
      tx.life -= dt;
    }
    state.texts = state.texts.filter((tx) => tx.life > 0);
    state.shake = Math.max(0, state.shake - dt * 18);
    state.flash = Math.max(0, state.flash - dt);
  }

  function bossDown() {
    const b = state.boss;
    if (b.kind === 'mecha') {
      state.score += 2000;
      state.transition = 2.2;
      state.enemyShots = [];
      state.minions.forEach((m) => boom(m.x, m.y, 6));
      state.minions = [];
      popText(b.x - 20, b.y - 12, 'DISCO DESTRUÍDO!', '#ff8a1e', 2);
      shake(10);
    } else if (b.kind === 'duck') {
      // o pato leva uma chuva de explosões e cai... e o Doutor Insano se ergue
      boom(b.x + 12, b.y + 12, 60, undefined, 160);
      shake(12);
      sfx('explode');
      state.score += 3000;
      popText(b.x - 20, b.y - 12, 'PATO DERRUBADO!', '#ff8a1e', 2);
      clearArena();
      state.cutscene = { kind: 'duckFall', t: 0, duck: b };
    } else {
      sfx('explode');
      popText(b.x, b.y - 4, 'NÃÃÃÃO! MEU AQUÁRIO!', '#7ee0ff', 2.2);
      clearArena();
      b.beam = null;
      state.cutscene = { kind: 'crazyDeath', t: 0, crazy: b };
    }
  }
  function clearArena() {
    state.enemyShots = [];
    state.minions.forEach((m) => boom(m.x, m.y, 6));
    state.bigs.forEach((e) => boom(e.x + e.w / 2, e.y + e.h / 2, 16, undefined, 100));
    state.minions = [];
    state.bigs = [];
  }

  /* ---------- desenho ---------- */
  function drawBackground() {
    // cenários 1→5→1: céu muda de paleta continuamente
    const total = SCENES.length * SCENE_TIME;
    const tt = (state.t % total) / SCENE_TIME;
    const i = Math.floor(tt);
    const k = tt - i;
    const A = SCENES[i];
    const B = SCENES[(i + 1) % SCENES.length];
    const mix = k > 0.8 ? (k - 0.8) / 0.2 : 0;
    const sky = g.createLinearGradient(0, 0, 0, H);
    sky.addColorStop(0, lerpColor(A[0], B[0], mix));
    sky.addColorStop(0.6, lerpColor(A[1], B[1], mix));
    sky.addColorStop(1, lerpColor(A[2], B[2], mix));
    g.globalAlpha = 0.9; // deixa o portfólio desfocado aparecer de leve atrás (vidro)
    g.fillStyle = sky;
    g.fillRect(0, 0, W, H);
    g.globalAlpha = 1;

    PARALLAX_LAYERS.forEach((layer, li) => {
      const x = state.bgX[li];
      const img = layerImgs[li];
      if (img && img.complete && img.naturalWidth) {
        const iw = (img.naturalWidth * H) / img.naturalHeight;
        for (let ox = -(x % iw); ox < W; ox += iw) g.drawImage(img, ox, 0, iw, H);
        return;
      }
      drawLayer(li, x);
    });
  }

  // desenhos provisórios das camadas (trocáveis por imagens)
  function drawLayer(li, x) {
    if (li === 0) {
      // sol/lua distante
      g.fillStyle = 'rgba(255,220,180,0.18)';
      g.beginPath();
      g.arc(W * 0.7 - (x % (W + 80)) * 0.2, 60, 26, 0, Math.PI * 2);
      g.fill();
    } else if (li === 1) {
      for (let i = 0; i < 60; i++) {
        const sx = (i * 37 - x) % (W + 40);
        const px = sx < 0 ? sx + W + 40 : sx;
        const py = (i * 53) % (H * 0.6);
        g.fillStyle = i % 7 === 0 ? '#ffffff' : 'rgba(255,255,255,0.5)';
        g.fillRect(Math.round(px), py, 1, 1);
      }
    } else if (li === 2) {
      g.fillStyle = 'rgba(40,20,70,0.85)';
      tileShapes(x, 160, (ox) => {
        g.beginPath();
        g.moveTo(ox, H * 0.72);
        g.lineTo(ox + 50, H * 0.42);
        g.lineTo(ox + 90, H * 0.6);
        g.lineTo(ox + 120, H * 0.38);
        g.lineTo(ox + 160, H * 0.72);
        g.fill();
      });
    } else if (li === 3) {
      g.fillStyle = 'rgba(20,10,40,0.92)';
      tileShapes(x, 120, (ox) => {
        g.fillRect(ox + 4, H * 0.62, 18, H);
        g.fillRect(ox + 26, H * 0.55, 14, H);
        g.fillRect(ox + 44, H * 0.66, 22, H);
        g.fillRect(ox + 72, H * 0.5, 12, H);
        g.fillRect(ox + 90, H * 0.6, 24, H);
        g.fillStyle = 'rgba(255,210,63,0.5)';
        g.fillRect(ox + 30, H * 0.6, 2, 2);
        g.fillRect(ox + 76, H * 0.56, 2, 2);
        g.fillRect(ox + 96, H * 0.66, 2, 2);
        g.fillStyle = 'rgba(20,10,40,0.92)';
      });
    } else {
      g.fillStyle = '#0c0618';
      g.fillRect(0, H - 14, W, 14);
      g.fillStyle = '#2a1450';
      tileShapes(x, 24, (ox) => g.fillRect(ox, H - 14, 12, 2));
    }
  }
  function tileShapes(x, period, draw) {
    for (let ox = -(x % period); ox < W + period; ox += period) draw(Math.round(ox));
  }

  function drawSprite(img, x, y, flipX = false) {
    if (!flipX) return g.drawImage(img, Math.round(x), Math.round(y));
    g.save();
    g.translate(Math.round(x) + img.width, Math.round(y));
    g.scale(-1, 1);
    g.drawImage(img, 0, 0);
    g.restore();
  }

  function drawBoss(b) {
    const hurt = b.hurt > 0;
    if (b.kind === 'mecha') {
      // aviso do dash: faixa vermelha na altura do ataque
      if (b.st === 'dash' && b.stT < 0.75) {
        g.fillStyle = `rgba(255,59,92,${0.15 + 0.15 * Math.sin(state.t * 40)})`;
        g.fillRect(0, b.dashY, W, b.h);
        g.fillStyle = '#ff3b5c';
        g.font = 'bold 10px monospace';
        g.fillText('!!', 8, b.dashY + b.h / 2 + 4);
      }
      drawSaucer(b);
      if (b.isShielded) {
        g.strokeStyle = `rgba(126,224,255,${0.6 + 0.3 * Math.sin(state.t * 20)})`;
        g.lineWidth = 2;
        g.beginPath();
        g.ellipse(b.x + b.w / 2, b.y + b.h / 2, b.w * 0.58, b.h * 0.6, 0, 0, Math.PI * 2);
        g.stroke();
        g.fillStyle = 'rgba(126,224,255,0.12)';
        g.fill();
      }
    } else if (b.kind === 'crazy') {
      drawCrazy(b);
    } else {
      drawBike(b);
    }
  }

  // desenha uma camada da folha (opcionalmente girando num pivô)
  function sheetPart(img, D, name, x, y, pivot = null, ang = 0) {
    const i = D.idx[name];
    if (!pivot || !ang) return g.drawImage(img, i * D.w, 0, D.w, D.h, x, y, D.w, D.h);
    g.save();
    g.translate(x + pivot[0], y + pivot[1]);
    g.rotate(ang);
    g.drawImage(img, i * D.w, 0, D.w, D.h, -pivot[0], -pivot[1], D.w, D.h);
    g.restore();
  }
  // bico/maxilar abrindo: fresta escura + parte de baixo deslocada
  function drawJaw(img, D, x, y, open) {
    const o = Math.round(open);
    if (o > 0) {
      const [jx, jy, jw] = D.jaw;
      g.fillStyle = '#4a1608';
      g.fillRect(x + jx + 1, y + jy - 1, jw - 2, o + 1);
    }
    sheetPart(img, D, 'jaw', x, y + o);
  }
  // ponto do desenho atual -> pixel exato da tela (com giros/inclinações aplicados)
  const screenPt = (x, y) => {
    const p = g.getTransform().transformPoint({ x, y });
    return { x: Math.round(p.x), y: Math.round(p.y) };
  };
  // desenha sem giro: retângulos girados ficam borrados (antialias), olhos precisam ser nítidos
  const crisp = (fn) => {
    g.save();
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.filter = 'none';
    fn();
    g.restore();
  };
  // olho em pixel art (em coordenadas de tela): branco, pupila olhando para a nave, piscada
  function drawEye(b, x, y, size, lid = '#e8a816') {
    const n = size * 2 + 1;
    const x0 = x - size;
    const y0 = y - size;
    if (b.blink > 0 || b.mood === 'hurt') {
      g.fillStyle = lid;
      g.fillRect(x0, y0, n, n);
      g.fillStyle = '#140c24';
      g.fillRect(x0, y, n, 1);
      return;
    }
    g.fillStyle = '#ffffff';
    g.fillRect(x0, y0, n, n);
    g.fillStyle = '#140c24';
    // pupila: 1x2 no olho pequeno, 2x2 no grande, sempre dentro do branco
    const pw = size;
    const px = clamp(x - Math.floor(pw / 2) + b.look * size, x0, x0 + n - pw);
    const py = clamp(y - 1 + b.lookY, y0, y0 + n - 2);
    g.fillRect(px, py, pw, 2);
  }
  // hélice girando (espiral de raios dentro de uma elipse)
  function drawFan(cx, cy, rx, ry, a) {
    g.strokeStyle = 'rgba(20,12,36,0.75)';
    g.lineWidth = 1;
    g.beginPath();
    for (let k = 0; k < 6; k++) {
      const aa = a + (k * Math.PI) / 3;
      g.moveTo(cx, cy);
      g.lineTo(cx + Math.cos(aa) * rx, cy + Math.sin(aa) * ry);
    }
    g.stroke();
  }
  // chama de motor apontando para a direita (para trás)
  function drawJet(x, y, len, half) {
    for (let j = -half; j <= half; j++) {
      const edge = Math.abs(j) / Math.max(1, half);
      const L = Math.max(1, Math.round(len * (1 - edge * 0.6) + rand(-2, 2)));
      for (let i = 0; i < L; i++) {
        const k = i / L;
        g.fillStyle = edge < 0.35 && k < 0.4 ? '#ffffff' : k < 0.65 ? '#ffd23f' : k < 0.88 ? '#ff8a1e' : 'rgba(255,59,92,0.6)';
        g.fillRect(x + i, y + j, 1, 1);
      }
    }
  }

  /* Boss 1 — Disco Voador do Pato */
  function drawSaucer(b) {
    if (!(saucerImg.complete && saucerImg.naturalWidth)) return;
    const D = SAUCER;
    const x = Math.round(b.x + b.recoil);
    const y = Math.round(b.y + Math.sin(b.bob * 2.2) * 2);
    g.save();
    g.translate(x + D.w / 2, y + D.h / 2);
    g.rotate(b.tilt + Math.sin(b.bob * 1.3) * 0.02);
    g.translate(-(x + D.w / 2), -(y + D.h / 2));
    const boost = b.st === 'dash' && b.stT > 0.75 ? 2.2 : 1;
    drawJet(x + D.exhaust[0] - 1, y + D.exhaust[1], (6 + Math.random() * 3) * boost, 2);
    if (b.hurt > 0) g.filter = 'brightness(2.6)';
    sheetPart(saucerImg, D, 'hull', x, y);
    // pato no banco (corpo balança, cabeça vira para a nave)
    const dy = b.duckDy;
    sheetPart(saucerImg, D, 'duckBody', x, y + dy);
    g.save();
    g.translate(x + D.pivots.head[0], y + D.pivots.head[1] + dy);
    g.rotate(b.headRot);
    g.translate(-(x + D.pivots.head[0]), -(y + D.pivots.head[1]));
    sheetPart(saucerImg, D, 'duckHead', x, y);
    drawJaw(saucerImg, D, x, y, b.jaw);
    const eye = screenPt(x + D.eye[0] + 0.5, y + D.eye[1] + 0.5);
    g.restore();
    sheetPart(saucerImg, D, 'rim', x, y);
    sheetPart(saucerImg, D, 'antenna', x, y, D.pivots.antenna, b.antA);
    g.filter = 'none';
    crisp(() => drawEye(b, eye.x, eye.y, 1));
    drawFan(x + D.fan[0], y + D.fan[1], D.fanR, D.fanR, b.fanA);
    // luzes do casco piscando em sequência
    D.lights.forEach(([lx, ly], i) => {
      if (Math.floor(state.t * 4 + i * 0.7) % 3 === 0) {
        g.fillStyle = i % 2 ? '#ff3b5c' : '#b6ff6a';
        g.fillRect(x + lx - 1, y + ly - 1, 2, 2);
      }
    });
    // ponta da antena pisca
    if (Math.floor(state.t * 2) % 2) {
      const [ax, ay] = D.pivots.antenna;
      const L = (18 * D.w) / 140; // comprimento da antena
      const tip = { x: ax + Math.sin(b.antA) * L, y: ay - Math.cos(b.antA) * L };
      g.fillStyle = 'rgba(255,59,92,0.5)';
      g.fillRect(Math.round(x + tip.x) - 2, Math.round(y + tip.y) - 2, 4, 4);
    }
    g.restore();
  }

  /* Boss 2 — Pato na Moto-Turbina (também desenha a queda girando antes da fase 3) */
  function drawBike(b) {
    if (!(bikeImg.complete && bikeImg.naturalWidth)) return;
    const D = BIKE;
    const x = Math.round(b.x + b.recoil);
    const y = Math.round(b.y + (b.falling ? 0 : Math.sin(b.bob * 2.4) * 2));
    g.save();
    g.translate(x + D.w / 2, y + D.h / 2);
    g.rotate(b.falling ? b.rot : b.tilt + Math.sin(b.bob * 1.1) * 0.02);
    g.translate(-(x + D.w / 2), -(y + D.h / 2));
    // aviso da investida
    if (b.st === 'charge' && b.stT < 0.5 && !b.falling) {
      g.fillStyle = `rgba(255,59,92,${0.12 + 0.12 * Math.sin(state.t * 40)})`;
      g.fillRect(-W, b.dashY + 20, W * 3, D.h - 40);
    }
    const boost = b.st === 'charge' && b.stT > 0.5 && b.stT < 1.6 ? 2 : 1;
    if (!b.falling) for (const [ex, ey] of D.exhausts) drawJet(x + ex - 1, y + ey, (5 + Math.random() * 3) * boost, 2);
    if (b.hurt > 0) g.filter = 'brightness(2.6)';
    sheetPart(bikeImg, D, 'vehicle', x, y);
    const dy = b.duckDy;
    sheetPart(bikeImg, D, 'tail', x, y + dy, D.pivots.tail, b.tail);
    sheetPart(bikeImg, D, 'duckBody', x, y + dy);
    g.save();
    g.translate(x + D.pivots.head[0], y + D.pivots.head[1] + dy);
    g.rotate(b.headRot);
    g.translate(-(x + D.pivots.head[0]), -(y + D.pivots.head[1]));
    sheetPart(bikeImg, D, 'duckHead', x, y);
    drawJaw(bikeImg, D, x, y, b.jaw);
    const eyes = D.eyes.map(([ex, ey]) => screenPt(x + ex + 0.5, y + ey + 0.5));
    crisp(() => {
      drawEye(b, eyes[0].x, eyes[0].y, 1);
      drawEye(b, eyes[1].x, eyes[1].y, 2);
    });
    g.restore();
    // braço que aponta: mira na nave e dá coice a cada disparo
    sheetPart(bikeImg, D, 'armPoint', x, y + dy, D.pivots.armPoint, b.arm - b.armKick);
    g.filter = 'none';
    drawFan(x + D.fan[0], y + D.fan[1], D.fanR[0], D.fanR[1], b.fanA);
    // brilho na ponta do dedo enquanto atira
    if (b.mood === 'shout' && !b.falling) {
      const f = bikeFinger(b);
      g.fillStyle = `rgba(255,106,213,${0.4 + 0.3 * Math.sin(state.t * 40)})`;
      g.fillRect(Math.round(f.x) - 2 + (x - Math.round(b.x)), Math.round(f.y) - 2 + (y - Math.round(b.y)), 4, 4);
    }
    D.lights.forEach(([lx, ly], i) => {
      if (Math.floor(state.t * 4 + i * 0.9) % 3 === 0) {
        g.fillStyle = i % 3 === 1 ? '#ff3b5c' : '#b6ff6a';
        g.fillRect(x + lx - 1, y + ly - 1, 2, 2);
      }
    });
    g.restore();
  }

  /* Doutor Insano: boneco em camadas (propulsor, tronco que respira, braços com pivô,
     aquário com rosto boiando, peixes, maxilar, olhos que seguem a nave) */
  function drawCrazy(b) {
    if (!(crazyImg.complete && crazyImg.naturalWidth)) return;
    const { w, h, idx } = CRAZY;
    const x = Math.round(b.x + b.recoil);
    const y = Math.round(b.y + crazyBob(b));
    const br = b.breath;
    const layer = (name, dx = 0, dy = 0) => g.drawImage(crazyImg, idx[name] * w, 0, w, h, x + dx, y + dy, w, h);
    const limb = (name, [px, py], ang, dy = 0) => {
      g.save();
      g.translate(x + px, y + py + dy);
      if (ang) g.rotate(ang);
      g.drawImage(crazyImg, idx[name] * w, 0, w, h, -px, -py, w, h);
      g.restore();
    };

    // aviso do soco-foguete: faixa na altura do corpo e linha forte na do punho
    if (b.st === 'punch' && b.sub === 'wind') {
      const a = 0.12 + 0.1 * Math.sin(state.t * 40);
      g.fillStyle = `rgba(255,59,92,${a})`;
      g.fillRect(0, b.dashY + 22, W, 116);
      g.fillStyle = `rgba(255,138,30,${a + 0.15})`;
      g.fillRect(0, b.dashY + 100, W, 24);
      g.fillStyle = '#ff3b5c';
      g.font = 'bold 10px monospace';
      g.fillText('!!', 8, b.dashY + 108);
    }

    // olhos-laser: mira (carregando) e raios (disparando)
    if (b.beam) {
      const eyes = CRAZY.eyes.map((e) => crazyPoint(b, e, 'head'));
      const dx = Math.cos(b.beam.ang);
      const dy = Math.sin(b.beam.ang);
      const L = 800;
      for (const e of eyes) {
        if (!b.beam.on) {
          g.strokeStyle = `rgba(255,59,92,${0.35 + 0.3 * Math.sin(state.t * 50)})`;
          g.lineWidth = 1;
          g.setLineDash([4, 3]);
          g.beginPath();
          g.moveTo(e.x, e.y);
          g.lineTo(e.x + dx * L, e.y + dy * L);
          g.stroke();
          g.setLineDash([]);
        } else {
          const wob = Math.sin(state.t * 60);
          for (const [lw, c] of [[7 + wob, 'rgba(255,59,92,0.35)'], [4, '#ff3b5c'], [1.5, '#ffffff']]) {
            g.strokeStyle = c;
            g.lineWidth = lw;
            g.beginPath();
            g.moveTo(e.x, e.y);
            g.lineTo(e.x + dx * L, e.y + dy * L);
            g.stroke();
          }
        }
      }
    }

    g.save();
    if (b.lean || b.vy) {
      // inclina o corpo inteiro a partir do propulsor (e um pouco conforme sobe/desce)
      const lean = b.lean + clamp(b.vy * 0.0009, -0.06, 0.06);
      g.translate(x + w / 2, y + CRAZY.waist);
      g.rotate(lean);
      g.translate(-(x + w / 2), -(y + CRAZY.waist));
    }

    // chama do propulsor (atrás de tudo): núcleo branco, plasma ciano, borda azul
    const [fx, fy] = CRAZY.thruster;
    const power = clamp(1 - b.vy * 0.006, 0.5, 2.2) * (b.st === 'punch' && b.sub === 'go' ? 0.6 : 1);
    for (let i = -7; i <= 7; i++) {
      const edge = Math.abs(i) / 7;
      const len = Math.max(1, Math.round((17 - edge * 12) * power + rand(-2, 2)));
      for (let j = 0; j < len; j++) {
        const k = j / len;
        g.fillStyle = edge < 0.3 && k < 0.45 ? '#ffffff' : edge < 0.65 && k < 0.75 ? '#7ee0ff' : k < 0.9 ? '#3a8bd9' : 'rgba(58,139,217,0.5)';
        g.fillRect(x + fx + i, y + fy + j, 1, 1);
      }
    }
    if (Math.random() < 0.5) {
      // faíscas de plasma soltas
      const pt = crazyPoint(b, [fx + rand(-5, 5), fy + 4]);
      state.particles.push({ x: pt.x, y: pt.y, vx: rand(-15, 15), vy: rand(40, 90), life: 0.35, max: 0.35, c: pick(['#7ee0ff', '#ffffff', '#3a8bd9']), s: 1 });
    }
    g.fillStyle = `rgba(126,224,255,${0.12 + Math.random() * 0.08})`;
    g.beginPath();
    g.ellipse(x + fx, y + fy + 6, 13, 9 * power, 0, 0, Math.PI * 2);
    g.fill();

    if (b.hurt > 0) g.filter = 'brightness(2.6)';
    layer('lower');
    layer('thruster');
    limb('armBack', CRAZY.pivots.armBack, b.armB, br);
    layer('upper', 0, br);

    // aquário (com tudo que está dentro) gira junto, a partir da base do vidro
    const [hx, hy] = CRAZY.pivots.head;
    g.save();
    g.translate(x + hx, y + hy + br);
    g.rotate(b.headRot);
    g.translate(-(x + hx), -(y + hy));
    layer('tank');
    const [tx, ty, tw, th] = CRAZY.tank;
    g.save();
    g.beginPath();
    g.rect(x + tx, y + ty, tw, th); // nada sai do vidro
    g.clip();
    // peixes
    for (const f of b.fish) {
      const [bx, by, bw, bh] = CRAZY.fish[f.n];
      const cx = x + bx + bw / 2 + Math.round(f.ox);
      const cy = y + by + bh / 2 + Math.round(f.oy);
      g.save();
      g.translate(Math.round(cx), Math.round(cy));
      // o sprite original nada para um lado; vira quando muda de direção
      if (f.dir !== FISH_FACING[f.n]) g.scale(-1, 1);
      g.drawImage(crazyImg, idx[f.n] * w + bx, by, bw, bh, -Math.round(bw / 2), -Math.round(bh / 2), bw, bh);
      g.restore();
    }
    // rosto boiando + maxilar
    const fx2 = x + b.faceX;
    const fy2 = y + b.faceY;
    g.drawImage(crazyImg, idx.head * w, 0, w, h, fx2, fy2, w, h);
    const jaw = Math.round(b.jaw);
    if (jaw > 0) {
      const [jx, jy, jw] = CRAZY.jaw;
      g.fillStyle = '#2a0b12'; // boca aberta
      g.fillRect(fx2 + jx + 3, fy2 + jy - 1, jw - 6, jaw + 1);
      g.fillStyle = '#7a1e2a'; // língua
      g.fillRect(fx2 + jx + 6, fy2 + jy + jaw - 1, jw - 12, 1);
    }
    g.drawImage(crazyImg, idx.jaw * w, 0, w, h, fx2, fy2 + jaw, w, h);
    // olhos: brancos arregalados, pupilas seguindo a nave, piscadas e olhar de dor
    const squint = b.blink > 0 || b.mood === 'hurt';
    const eyePts = CRAZY.eyes.map(([ex, ey]) => screenPt(fx2 + ex + 0.5, fy2 + ey + 0.5));
    g.save();
    g.setTransform(1, 0, 0, 1, 0, 0);
    for (const { x: X, y: Y } of eyePts) {
      if (squint) {
        g.fillStyle = '#b07a58';
        g.fillRect(X - 2, Y - 1, 5, 2);
        g.fillStyle = '#2a140e';
        g.fillRect(X - 2, Y, 5, 1);
      } else {
        g.fillStyle = '#f4f0e6';
        g.fillRect(X - 2, Y - 1, 5, 2);
        g.fillStyle = b.eyeGlow > 0.3 ? '#ff3b5c' : '#140c10';
        g.fillRect(X + b.look - (b.look < 0 ? 1 : 0), Y - 1 + (b.lookY > 0 ? 1 : 0), 2, b.lookY ? 1 : 2);
      }
    }
    g.restore();
    // bolhas
    if (!b.broken) {
      for (const bb of b.bubbles) {
        g.fillStyle = 'rgba(220,250,255,0.85)';
        g.fillRect(Math.round(x + tx + bb.x * tw), Math.round(y + ty + bb.y * th), 1, 1);
      }
    }
    g.restore(); // fim do recorte do vidro
    // rachaduras no vidro quando está quase derrotado
    if (b.hp / b.max < 0.35 || b.broken) {
      g.strokeStyle = 'rgba(255,255,255,0.8)';
      g.lineWidth = 1;
      g.beginPath();
      g.moveTo(x + tx + 6, y + ty + 4);
      g.lineTo(x + tx + 12, y + ty + 14);
      g.lineTo(x + tx + 9, y + ty + 22);
      g.moveTo(x + tx + 12, y + ty + 14);
      g.lineTo(x + tx + 20, y + ty + 17);
      if (b.hp / b.max < 0.18 || b.broken) {
        g.moveTo(x + tx + tw - 4, y + ty + 30);
        g.lineTo(x + tx + tw - 12, y + ty + 36);
        g.lineTo(x + tx + tw - 10, y + ty + 44);
        g.moveTo(x + tx + tw - 12, y + ty + 36);
        g.lineTo(x + tx + tw - 20, y + ty + 34);
      }
      g.stroke();
    }
    // olhos brilhando (laser) por cima das lentes
    if (b.eyeGlow > 0) {
      for (const [ex, ey] of CRAZY.eyes) {
        g.fillStyle = `rgba(255,59,92,${0.4 * b.eyeGlow})`;
        g.fillRect(fx2 + ex - 4, fy2 + ey - 3, 9, 6);
      }
    }
    g.restore(); // fim do giro do aquário

    // garra da frente por cima de tudo (com espasmos)
    limb('armFront', CRAZY.pivots.armFront, b.armF + (b.twitch > 0 ? Math.sin(b.twitch * 90) * 0.12 : 0), br);
    g.filter = 'none';

    // núcleo do pato pulsando + luzes do painel piscando
    const [cx, cy] = CRAZY.core;
    const pulse = 0.5 + 0.5 * Math.sin(state.t * (b.coreGlow ? 18 : 4));
    g.fillStyle = `rgba(255,210,63,${0.15 + 0.35 * pulse * Math.max(0.3, b.coreGlow)})`;
    g.beginPath();
    g.arc(x + cx, y + cy + br, 7 + 3 * pulse * b.coreGlow, 0, Math.PI * 2);
    g.fill();
    CRAZY.lights.forEach(([lx, ly], i) => {
      if (Math.floor(state.t * 3 + i * 1.3) % 3 === 0) {
        g.fillStyle = i % 2 ? '#b6ff6a' : '#ff3b5c';
        g.fillRect(x + lx - 1, y + ly - 1 + br, 2, 2);
      }
    });
    g.restore();
  }

  function drawBigs() {
    for (const e of state.bigs) {
      const img = (e.type === 'piranha' ? S.piranha : S.drone)[Math.floor(e.frame) % 2];
      if (e.hurt > 0) g.filter = 'brightness(3)';
      drawSprite(img, e.x, e.y);
      g.filter = 'none';
    }
  }

  function drawBanner() {
    const bn = state.banner;
    if (!bn) return;
    const a = Math.min(1, bn.t * 3, (bn.life - bn.t) * 2);
    g.globalAlpha = a;
    g.fillStyle = 'rgba(10,4,20,0.65)';
    g.fillRect(0, H * 0.3, W, 50);
    g.fillStyle = '#ff3b5c';
    g.fillRect(0, H * 0.3, W, 2);
    g.fillRect(0, H * 0.3 + 48, W, 2);
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.font = 'bold 22px monospace';
    const wobble = Math.round(Math.sin(bn.t * 30) * (bn.t < 0.6 ? 2 : 0));
    g.fillStyle = '#140c24';
    g.fillText(bn.title, W / 2 + 2, H * 0.3 + 19 + 2);
    g.fillStyle = '#ffd23f';
    g.fillText(bn.title, W / 2 + wobble, H * 0.3 + 19);
    g.font = 'bold 10px monospace';
    g.fillStyle = '#ff6ad5';
    g.fillText(`— ${bn.sub} —`, W / 2, H * 0.3 + 38);
    g.textAlign = 'start';
    g.textBaseline = 'alphabetic';
    g.globalAlpha = 1;
  }

  /* nave do jogador: chamas azuis pulsando, inclinação, piloto, luzes, clarão do canhão */
  function drawShip(p) {
    const x = Math.round(p.x);
    const y = Math.round(p.y);
    g.save();
    g.translate(x, y);
    // inclinação em pixel art (sem girar, que borraria): subindo, a metade da frente
    // sobe 1 px; descendo, desce 1 px
    const tilt = p.bank > 0.08 ? 1 : p.bank < -0.08 ? -1 : 0;
    // chamas dos 3 motores (maiores acelerando para a frente, menores recuando)
    const power = clamp(1 + p.vx * 0.004, 0.45, 1.9);
    SHIP.exhausts.forEach((row, i) => {
      const len = Math.max(1, Math.round((i === 2 ? 3 : 5) * power + rand(-1, 1.4)));
      for (let k = 0; k < len; k++) {
        const t = k / len;
        g.fillStyle = t < 0.3 ? '#ffffff' : t < 0.6 ? '#7ee0ff' : t < 0.85 ? '#3a8bd9' : 'rgba(42,90,217,0.6)';
        g.fillRect(-1 - k, row, 1, 1);
        if (k > 0 && k < len - 1 && Math.random() < 0.35) {
          g.fillStyle = 'rgba(126,224,255,0.55)'; // franja da chama
          g.fillRect(-1 - k, row + (Math.random() < 0.5 ? -1 : 1), 1, 1);
        }
      }
    });
    const rx = -Math.round(p.recoil);
    g.drawImage(S.ship, 0, 0, 9, 11, rx, 0, 9, 11); // metade de trás
    g.drawImage(S.ship, 9, 0, 9, 11, rx + 9, tilt, 9, 11); // metade da frente
    // piloto: se abaixa no dano e balança a cabeça de vez em quando
    const pdy = (p.inv > 0.8 ? 1 : p.nod > 0 ? 1 : 0) + tilt;
    g.drawImage(S.pilot, rx, pdy);
    g.translate(0, tilt); // o que vem a seguir está na metade da frente
    // reflexo correndo pelo vidro da cabine
    if (p.glint > -0.5 && p.glint < 0) {
      const gx = 12 + Math.round((p.glint + 0.5) * 8);
      g.fillStyle = '#ffffff';
      g.fillRect(gx, 2 + Math.max(0, gx - 14), 1, 1);
    }
    // luzes do painel em sequência + ponta da asa piscando
    const li = Math.floor(state.t * 6) % 3;
    const [lx, ly] = SHIP.lights[li];
    g.fillStyle = '#ffffff';
    g.fillRect(lx, ly - (lx < 9 ? tilt : 0), 1, 1);
    if (Math.floor(state.t * 2) % 2) {
      g.fillStyle = '#ff3b5c';
      g.fillRect(SHIP.wingTip[0], SHIP.wingTip[1] - tilt, 1, 1); // ponta da asa (metade de trás)
    }
    // clarão do canhão
    if (p.muzzle > 0) {
      const [cx, cy] = SHIP.cannon;
      g.fillStyle = '#ffffff';
      g.fillRect(cx, cy - 1, 2, 1);
      g.fillStyle = '#ffd23f';
      g.fillRect(cx + 2, cy - 1, 1, 1);
      g.fillRect(cx + 1, cy - 2, 1, 1);
      g.fillRect(cx + 1, cy, 1, 1);
    }
    g.restore();
    // fumaça quando a nave está quase destruída
    if (p.hp <= 3 && Math.random() < 0.3) {
      state.particles.push({ x: p.x + 4, y: p.y + 4, vx: -rand(20, 40), vy: -rand(5, 15), life: 0.7, max: 0.7, c: pick(['#6a6a80', '#8a8aa0', '#4a4a5a']), s: 2, smoke: true });
    }
  }

  function drawHUD() {
    const p = state.player;
    const b = state.boss;
    g.font = 'bold 7px monospace';
    g.textBaseline = 'top';
    // vida do jogador: 10 blocos estilo arcade
    g.fillStyle = '#ffffff';
    g.fillText('HP', 6, 6);
    for (let i = 0; i < PLAYER_HP; i++) {
      g.fillStyle = '#140c24';
      g.fillRect(20 + i * 9, 5, 8, 8);
      g.fillStyle = i < p.hp ? (p.hp <= 3 ? '#ff3b5c' : '#7ee0ff') : '#2a1d40';
      g.fillRect(21 + i * 9, 6, 6, 6);
    }
    // vida do chefe
    if (b) {
      const bw = Math.min(180, W * 0.38);
      const x = W - bw - 8;
      g.fillStyle = '#ffffff';
      const name = { mecha: 'DISCO VOADOR DO PATO', duck: 'PATO NA MOTO-TURBINA', crazy: 'CRAZY BOSS — DR. INSANO' }[b.kind];
      g.fillText(name, x, 4);
      g.fillStyle = '#140c24';
      g.fillRect(x, 13, bw, 6);
      g.fillStyle = b.isShielded ? '#7ee0ff' : { mecha: '#ff8a1e', duck: '#ff3b5c', crazy: '#ff6ad5' }[b.kind];
      g.fillRect(x + 1, 14, Math.max(0, (bw - 2) * (b.hp / b.max)), 4);
    }
    g.fillStyle = '#ffd23f';
    const sc = `${state.score}`.padStart(6, '0');
    g.fillText(sc, W / 2 - sc.length * 2.2, 6);
    g.fillStyle = 'rgba(255,255,255,0.5)';
    g.fillText(`FASE ${state.phase}/3`, W / 2 - 14, 15);
  }

  function draw() {
    g.save();
    if (state.shake) g.translate(Math.round(rand(-state.shake, state.shake)), Math.round(rand(-state.shake, state.shake)));
    drawBackground();

    const b = state.boss;
    if (b) drawBoss(b);

    for (const m of state.minions) drawSprite(S.minion[Math.floor(m.frame) % 2], m.x, m.y);
    drawBigs();
    drawHearts();

    for (const s of state.enemyShots) {
      if (s.kind) {
        // projéteis desenhados pelo centro (esferas, bolhas, faíscas)
        const img = { orb: S.orb, bigOrb: S.orb2, bubble: S.bubble, bolt: S.bolt }[s.kind];
        if (s.kind === 'orb' || s.kind === 'bigOrb') {
          const rr = s.kind === 'bigOrb' ? 9 + Math.sin(s.t * 20) * 2 : 5;
          g.fillStyle = 'rgba(255,138,30,0.3)';
          g.beginPath();
          g.arc(Math.round(s.x), Math.round(s.y), rr, 0, Math.PI * 2);
          g.fill();
        }
        drawSprite(img, s.x - img.width / 2, s.y - img.height / 2);
      } else if (s.sprite === 'laser' || s.sprite === 'eyeLaser') {
        g.save();
        g.translate(Math.round(s.x + 3), Math.round(s.y));
        g.rotate(s.ang ?? Math.PI);
        g.scale(-1, 1);
        g.drawImage(S[s.sprite], -3, 0);
        g.restore();
      } else drawSprite(S.egg, s.x, s.y);
    }
    for (const s of state.shots) drawSprite(S.shot, s.x, s.y);

    const p = state.player;
    if (!(p.inv > 0 && Math.floor(state.t * 20) % 2) && p.hp > 0) {
      drawShip(p);
    }

    for (const pt of state.particles) {
      g.globalAlpha = Math.max(0, pt.life / pt.max);
      g.fillStyle = pt.c;
      g.fillRect(Math.round(pt.x), Math.round(pt.y), pt.s, pt.s);
    }
    g.globalAlpha = 1;
    g.font = 'bold 8px monospace';
    for (const tx of state.texts) {
      g.globalAlpha = Math.min(1, tx.life / tx.max * 2);
      g.fillStyle = '#140c24';
      g.fillText(tx.txt, Math.round(tx.x) + 1, Math.round(tx.y) + 1);
      g.fillStyle = tx.c;
      g.fillText(tx.txt, Math.round(tx.x), Math.round(tx.y));
    }
    g.globalAlpha = 1;
    g.restore();
    drawBanner();

    if (state.flash) {
      g.fillStyle = `rgba(255,59,92,${state.flash})`;
      g.fillRect(0, 0, W, H);
    }
    drawHUD();
  }

  /* ---------- fim de jogo ---------- */
  function endGame(result) {
    if (state.result) return;
    state.result = result;
    const record = loadRecord();
    const isRecord = state.score > (record.score || 0);
    if (isRecord) saveRecord({ score: state.score, date: Date.now() });
    // mostra mais alguns quadros da explosão antes do placar
    state.endIn = 1.2;
    audio?.stopMusic(0.5);
    sfx(result === 'vitoria' ? 'victory' : 'defeat');
    endBox.querySelector('.duck-game__title').textContent = result === 'vitoria' ? 'VITÓRIA!' : 'GAME OVER';
    endBox.querySelector('.duck-game__sub').textContent =
      result === 'vitoria'
        ? 'Impossível… o Doutor Insano caiu e o pato perdeu. Ele vai negar isso pra sempre.'
        : pick(['Quack quack. Perdeu pro pato.', 'Tenta de novo. Ou não. O pato não liga.', 'Seu recorde é bonitinho. O meu é infinito.']);
    endBox.querySelector('.duck-game__stats').textContent =
      `Pontos: ${state.score}  •  Tempo: ${Math.round(state.t)}s  •  ${isRecord ? 'NOVO RECORDE!' : `Recorde: ${Math.max(record.score || 0, state.score)}`}`;
    endBox.dataset.result = result;
  }

  /* ---------- loop ---------- */
  // passo de tempo fixo: a lógica sempre avança em passos de 1/60 s (vários por quadro
  // se o aparelho estiver lento). Velocidade igual em qualquer máquina e colisões precisas.
  const STEP = 1 / 60;
  const MAX_STEPS = 8;
  let raf = 0;
  let last = 0;
  let acc = 0;
  let running = false;
  function frame(now) {
    if (!running) return;
    raf = requestAnimationFrame(frame);
    audio?.tick(); // agenda as próximas notas da música
    const elapsed = Math.max(0, Math.min(0.25, (now - (last || now)) / 1000)); // aba que travou não "pula" o jogo
    last = now;
    acc += elapsed;
    let steps = 0;
    if (state.result) {
      state.endIn -= elapsed;
      while (acc >= STEP && steps++ < MAX_STEPS) {
        update(STEP * 0.35); // câmera lenta no fim
        acc -= STEP;
      }
      draw();
      if (state.endIn <= 0) {
        running = false;
        cancelAnimationFrame(raf);
        endBox.hidden = false;
        endBox.querySelector('[data-again]').focus({ preventScroll: true });
      }
      return;
    }
    while (acc >= STEP && steps++ < MAX_STEPS) {
      update(STEP);
      acc -= STEP;
    }
    if (steps > MAX_STEPS) acc = 0; // aparelho muito lento: descarta o atraso em vez de acumular
    draw();
  }
  function loopStart() {
    if (running) return;
    running = true;
    last = 0;
    acc = 0;
    raf = requestAnimationFrame(frame);
  }
  // aba escondida = pausa; voltar = continua sem "pular" o tempo
  on(document, 'visibilitychange', () => {
    if (document.hidden) {
      running = false;
      cancelAnimationFrame(raf);
      audio?.pause();
    } else {
      audio?.resume();
      if (!state.result && endBox.hidden) loopStart();
    }
  });

  /* ---------- limpeza total ---------- */
  let cleaned = false;
  function cleanup(result) {
    if (cleaned) return;
    cleaned = true;
    running = false;
    cancelAnimationFrame(raf);
    ctrl.abort(); // remove TODOS os listeners registrados pelo jogo
    audio?.close(); // encerra o som (música e efeitos param na hora)
    wrap.remove();
    html.style.overflow = saved.htmlOverflow;
    document.body.style.overflow = saved.bodyOverflow;
    html.classList.remove('duck-game-on');
    if (appRoot) {
      appRoot.style.filter = saved.rootFilter;
      appRoot.style.pointerEvents = saved.rootPointer;
      appRoot.style.transition = saved.rootTransition;
    }
    window.scrollTo(0, saved.scrollY);
    if (saved.focus && typeof saved.focus.focus === 'function') saved.focus.focus({ preventScroll: true });
    onExit?.(result);
  }

  reset();
  audio?.startMusic();
  loopStart();
  if (import.meta.env?.DEV) window.__duckGame = { get state() { return state; }, audio, crazyNext: (st) => { const b = state.boss; for (let i = 0; i < 60; i++) { b.last = ""; crazyNextState(b); if (!st || b.st === st) break; } } };
  return cleanup;
}
