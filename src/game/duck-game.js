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
 *    Fase 2: o mecha explode e o pato sai na prancha voadora.
 *  - O cursor do sistema nunca é escondido nem travado (vira uma mira).
 *
 * Uso: const stop = startDuckGame({ duckSpriteUrl, onExit(result) {} })
 */

/* =========================================================================
   Configuração
   ========================================================================= */
const H = 270; // altura interna; a largura acompanha a proporção da tela
const PLAYER_HP = 10;
const MECHA_HP = 170;
const DUCK_HP = 110;
const RECORD_KEY = 'pato-game-recorde';

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

const PAL = {
  o: '#140c24', w: '#ffffff', c: '#7ee0ff', C: '#3a8bd9', b: '#2a3a6a', g: '#9aa4c8', G: '#5a6488',
  y: '#ffd23f', Y: '#e8a816', O: '#ff8a1e', r: '#ff3b5c', R: '#a8142e', p: '#ff6ad5', P: '#b02a8a',
  k: '#5a2a12', K: '#3a180a', e: '#8a4a22', m: '#c8c8d8', M: '#7a7a90', l: '#b6ff6a', L: '#5ab82a',
};

function buildSprites() {
  const s = {
    ship: sprite([
      '....oooo..........',
      '...occcco.........',
      '..occwccooooo.....',
      'oobbbbbbbbbbbbo...',
      'oCCCCCCCCCCCCCCoo.',
      'orrCcccccccccCCCCo',
      'oCCCCCCCCCCCCCCoo.',
      'oobbbbbbbbbbbbo...',
      '..occCccooooo.....',
      '...occcco.........',
      '....oooo..........',
    ], PAL),
    flame: [
      sprite(['.oo', 'oyO', 'OOy', 'oyO', '.oo'], PAL),
      sprite(['..oo', 'oyyO', 'yOOy', 'oyyO', '..oo'], PAL),
    ],
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
    // Mecha Pato (olhando para a esquerda): cabine de vidro com o pato dentro
    mecha: sprite([
      '..............oooooooooo..........',
      '............oocccccccccoo.........',
      '...........occwyyyyyycccco........',
      '..........occyyyyyyyyyccccoo......',
      '.........occyowyyyyyyyycccco......',
      '........oOOOyyyyyyyyyyyycccco.....',
      '.......oOOOOyyyyyyyyyyyyccccoo....',
      '........oOOOyyyyyyyyyyyycccccoo...',
      '.........occyyyyyyyyyycccccmmmo...',
      '..........occccccccccccccmmmmmmo..',
      '...oooooooommmmmmmmmmmmmmmmmMMMMo.',
      '..oMMMMMMMmmmmmmmmmmmmmmmmmmmMMMMo',
      '.oMrrMMMMMmmmrrmmmmmmmmmmmmmmMMMMo',
      'ommmmmmmmmmmmrrmmmmmmmmmmmmmmMMMMo',
      'oMMMMMMMMMmmmmmmmmMMMMmmmmmmmMMMo.',
      '.oooooooooommmmmmMMMMMMmmmmmMMMo..',
      '...........oMMMMMMMMMMMMMMMMMMo...',
      '...........oMMMMmmmmmmmmMMMMMo....',
      '..........oMMMMooooooooooMMMMo....',
      '..........oMMMo..........oMMMo....',
      '.........oMMMo............oMMMo...',
      '.........orrro............orrro...',
      '........oooooo............oooooo..',
    ], PAL),
    board: sprite([
      '..oooooooooooooooooooooooo..',
      '.opppppppppppppppppppppppPo.',
      'oPPPPPPPPPPPPPPPPPPPPPPPPPPo',
      '.oooooooooooooooooooooooooo.',
    ], PAL),
  };
  s.mecha2 = upscale(s.mecha, 2);
  s.board2 = upscale(s.board, 2);
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
export function startDuckGame({ duckSpriteUrl, onExit } = {}) {
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
  wrap.setAttribute('aria-label', 'Minigame: batalha contra o Mecha Pato. Aperte Escape para sair.');
  wrap.innerHTML = `
    <canvas class="duck-game__canvas"></canvas>
    <button type="button" class="duck-game__exit">ESC — Sair da Batalha</button>
    <div class="duck-game__end" hidden>
      <p class="duck-game__title"></p>
      <p class="duck-game__sub"></p>
      <p class="duck-game__stats"></p>
      <div class="duck-game__actions">
        <button type="button" data-again>Jogar de novo</button>
        <button type="button" data-leave>Sair</button>
      </div>
    </div>
    <p class="duck-game__hint">${touch ? 'Arraste o dedo para mover • tiro automático' : 'Mouse move a nave • clique ou Espaço atira • ESC sai'}</p>
    <p class="duck-game__rotate">↻ Gire o celular para jogar melhor</p>`;
  document.body.appendChild(wrap);
  const canvas = wrap.querySelector('canvas');
  const g = canvas.getContext('2d');
  const exitBtn = wrap.querySelector('.duck-game__exit');
  const endBox = wrap.querySelector('.duck-game__end');
  exitBtn.focus({ preventScroll: true });

  const S = buildSprites();
  const duckImg = new Image();
  if (duckSpriteUrl) duckImg.src = duckSpriteUrl;
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
    if (e.key === 'Escape') {
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
  on(wrap.querySelector('[data-leave]'), 'click', () => cleanup(state.result || 'saiu'));
  on(wrap.querySelector('[data-again]'), 'click', () => {
    endBox.hidden = true;
    reset();
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
      player: { x: W * 0.2, y: H / 2, hp: PLAYER_HP, inv: 1.5, cool: 0 },
      shots: [],
      enemyShots: [],
      minions: [],
      particles: [],
      texts: [],
      boss: newMecha(),
      phase: 1,
      transition: 0,
    };
    input.x = W * 0.2;
    input.y = H / 2;
  }

  function newMecha() {
    return {
      kind: 'mecha', x: W + 40, y: H / 2 - 24, w: 68, h: 46, hp: MECHA_HP, max: MECHA_HP,
      st: 'enter', stT: 0, fire: 0, last: '', isShielded: false, dashY: 0, baseX: W - 90,
      bob: 0, hurt: 0,
    };
  }
  function newDuck(x, y) {
    return {
      kind: 'duck', x, y, w: 40, h: 44, hp: DUCK_HP, max: DUCK_HP,
      st: 'taunt', stT: 0, fire: 0, last: '', isShielded: false, baseX: W - 70, ang: 0, hurt: 0, bob: 0,
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
    if (next === 'dash') b.dashY = playerCenter().y - b.h / 2;
    if (next === 'minions') {
      const n = Math.round(4 + 4 * (rage(b) - 1));
      for (let i = 0; i < n; i++) {
        state.minions.push({ x: b.x + rand(0, 20), y: clamp(b.y + rand(-50, 50), 20, H - 30), w: 9, h: 8, vx: -rand(55, 95) * rage(b), hp: 2, frame: Math.random() });
      }
      popText(b.x - 10, b.y - 10, 'LACAIOS!', '#ffd23f');
    }
    if (next === 'shield') popText(b.x - 6, b.y - 10, 'ESCUDO!', '#7ee0ff');
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
            for (const s of [-0.18, 0, 0.18]) aimed(b, 150 * r, s, 'egg', 4, 26);
          } else {
            for (let i = -2; i <= 2; i++) state.enemyShots.push({ x: b.x + 4, y: b.y + 26, vx: -130 * r, vy: i * 28, sprite: 'egg', w: 6, h: 6 });
          }
          b.fire = 0.75 / r;
        }
        if (b.stT > 3.2) mechaNextState(b);
        break;
      case 'shield': // Estado 2: escudo, tiros do jogador não causam dano
        followY(0.9 * r);
        if (b.fire <= 0) {
          aimed(b, 110 * r, rand(-0.1, 0.1), 'egg', 4, 26);
          b.fire = 0.55 / r;
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
          if (hit(b, playerBox())) hurtPlayer(3);
        } else {
          b.x += (b.baseX - b.x) * Math.min(1, dt * 4);
          if (b.stT > 2.9) mechaNextState(b);
        }
        break;
      case 'minions': // Estado 4: lacaios perseguem o Y do jogador
        followY(0.8);
        if (b.fire <= 0) {
          aimed(b, 120 * r, 0, 'egg', 4, 26);
          b.fire = 1.1 / r;
        }
        if (b.stT > 2.4) mechaNextState(b);
        break;
    }
    // encostar no mecha também machuca
    if (b.st !== 'dash' && hit(b, playerBox())) hurtPlayer(2);
  }

  function duckNextState(b) {
    const options = ['triple', 'sweep', 'ring', 'charge', 'triple', 'minions'].filter((s) => s !== b.last);
    const next = pick(options);
    b.last = next;
    b.st = next;
    b.stT = 0;
    b.fire = 0;
    b.ang = Math.PI * 0.75;
    if (next === 'charge') b.dashY = playerCenter().y - b.h / 2;
    if (next === 'minions') {
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
    const muzzle = { ox: 0, oy: 16 };
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
        }
        if (b.stT > 3) duckNextState(b);
        break;
      case 'sweep': // rajada contínua que varre a tela
        sway();
        if (b.fire <= 0) {
          b.ang += 0.16;
          const a = Math.PI + Math.sin(b.ang) * 0.75;
          state.enemyShots.push({ x: b.x, y: b.y + 16, vx: Math.cos(a) * 210 * r, vy: Math.sin(a) * 210 * r, sprite: 'laser', w: 6, h: 1, ang: a });
          b.fire = 0.045 / r;
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
            state.enemyShots.push({ x: b.x + 18, y: b.y + 20, vx: Math.cos(a) * 120 * r, vy: Math.sin(a) * 120 * r, sprite: 'laser', w: 6, h: 1, ang: a });
          }
          b.fire = 0.7 / r;
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
          if (hit(b, playerBox())) hurtPlayer(3);
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
        }
        if (b.stT > 2.2) duckNextState(b);
        break;
    }
    if (b.st !== 'charge' && hit(b, playerBox())) hurtPlayer(2);
  }

  // área de colisão do jogador: só o miolo da nave (justo, estilo bullet hell)
  const playerBox = () => ({ x: state.player.x + 5, y: state.player.y + 3, w: 8, h: 5 });

  /* ---------- atualização ---------- */
  function update(dt) {
    state.t += dt;
    const p = state.player;
    const b = state.boss;

    // parallax
    PARALLAX_LAYERS.forEach((l, i) => (state.bgX[i] = (state.bgX[i] + l.speed * dt) % 100000));

    // jogador segue o cursor exatamente (dentro da tela)
    p.x = clamp(input.x - 9, 2, W - 20);
    p.y = clamp(input.y - 5, 14, H - 12);
    p.inv = Math.max(0, p.inv - dt);
    p.cool -= dt;
    const firing = input.firing || (touch && input.has);
    if (firing && p.cool <= 0 && !state.result && !state.transition) {
      state.shots.push({ x: p.x + 16, y: p.y + 4, w: 4, h: 2 });
      p.cool = 0.1;
    }

    // tiros do jogador
    for (let i = state.shots.length - 1; i >= 0; i--) {
      const s = state.shots[i];
      s.x += 420 * dt;
      let gone = s.x > W + 10;
      if (!gone && b && !state.transition && hit(s, b)) {
        gone = true;
        if (b.isShielded) {
          boom(s.x, s.y, 3, ['#7ee0ff', '#ffffff'], 40);
        } else {
          b.hp -= 1;
          b.hurt = 0.06;
          state.score += 10;
          boom(s.x, s.y, 2, ['#ffffff', '#ffd23f'], 30);
          if (b.hp <= 0) bossDown();
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
            }
            break;
          }
        }
      }
      if (gone) state.shots.splice(i, 1);
    }

    // chefe
    if (b && !state.transition) (b.kind === 'mecha' ? updateMecha : updateDuck)(b, dt);

    // transição: mecha explode, o pato sai na prancha
    if (state.transition) {
      state.transition -= dt;
      b.hurt = Math.random() < 0.35 ? 0.05 : 0; // pisca enquanto explode
      b.x += rand(-1.5, 1.5);
      b.y += 6 * dt; // vai afundando
      if (Math.random() < 0.6) boom(b.x + rand(0, b.w), b.y + rand(0, b.h), 6, undefined, 120);
      shake(3);
      if (state.transition <= 0) {
        boom(b.x + b.w / 2, b.y + b.h / 2, 90, undefined, 220);
        shake(14);
        state.transition = 0;
        state.boss = newDuck(b.x + 14, b.y);
        state.phase = 2;
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
      const box = s.sprite === 'laser' ? { x: s.x + 1, y: s.y, w: 4, h: 1 } : { x: s.x + 1, y: s.y + 1, w: 4, h: 4 };
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
      pt.vx *= 0.96;
      pt.vy *= 0.96;
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
      popText(b.x - 20, b.y - 12, 'MECHA DESTRUÍDO!', '#ff8a1e', 2);
      shake(10);
    } else {
      boom(b.x + 12, b.y + 12, 60, undefined, 160);
      shake(12);
      state.score += 5000 + state.player.hp * 300 + Math.max(0, Math.round(300 - state.t)) * 20;
      endGame('vitoria');
    }
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
      if (hurt) g.filter = 'brightness(3)';
      drawSprite(S.mecha2, b.x, b.y + Math.sin(b.bob * 6) * 1);
      g.filter = 'none';
      if (b.isShielded) {
        g.strokeStyle = `rgba(126,224,255,${0.6 + 0.3 * Math.sin(state.t * 20)})`;
        g.lineWidth = 2;
        g.beginPath();
        g.ellipse(b.x + b.w / 2, b.y + b.h / 2, b.w * 0.75, b.h * 0.85, 0, 0, Math.PI * 2);
        g.stroke();
        g.fillStyle = 'rgba(126,224,255,0.12)';
        g.fill();
      }
    } else {
      // pato na prancha voadora (sprite do próprio site, olhando para a esquerda)
      const y = b.y + Math.sin(b.bob * 5) * 2;
      g.globalAlpha = 0.6 + 0.4 * Math.sin(state.t * 30);
      g.fillStyle = '#ff6ad5';
      g.fillRect(b.x + 4, y + 50, 40, 3);
      g.globalAlpha = 1;
      drawSprite(S.board2, b.x - 6, y + 40);
      if (duckImg.complete && duckImg.naturalWidth) {
        if (hurt) g.filter = 'brightness(3)';
        const col = b.st === 'taunt' ? 10 + (Math.floor(state.t * 7) % 2) : 0;
        g.drawImage(duckImg, col * 32, 4 * 32, 32, 32, Math.round(b.x - 12), Math.round(y - 20), 64, 64);
        g.filter = 'none';
      }
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
      const name = b.kind === 'mecha' ? 'MECHA PATO' : 'PATO (FURIOSO)';
      g.fillText(name, x, 4);
      g.fillStyle = '#140c24';
      g.fillRect(x, 13, bw, 6);
      g.fillStyle = b.isShielded ? '#7ee0ff' : b.kind === 'mecha' ? '#ff8a1e' : '#ff3b5c';
      g.fillRect(x + 1, 14, Math.max(0, (bw - 2) * (b.hp / b.max)), 4);
    }
    g.fillStyle = '#ffd23f';
    const sc = `${state.score}`.padStart(6, '0');
    g.fillText(sc, W / 2 - sc.length * 2.2, 6);
    g.fillStyle = 'rgba(255,255,255,0.5)';
    g.fillText(`FASE ${state.phase}/2`, W / 2 - 14, 15);
  }

  function draw() {
    g.save();
    if (state.shake) g.translate(Math.round(rand(-state.shake, state.shake)), Math.round(rand(-state.shake, state.shake)));
    drawBackground();

    const b = state.boss;
    if (b) drawBoss(b);

    for (const m of state.minions) drawSprite(S.minion[Math.floor(m.frame) % 2], m.x, m.y);

    for (const s of state.enemyShots) {
      if (s.sprite === 'laser') {
        g.save();
        g.translate(Math.round(s.x + 3), Math.round(s.y));
        g.rotate(s.ang ?? Math.PI);
        g.scale(-1, 1);
        g.drawImage(S.laser, -3, 0);
        g.restore();
      } else drawSprite(S.egg, s.x, s.y);
    }
    for (const s of state.shots) drawSprite(S.shot, s.x, s.y);

    const p = state.player;
    if (!(p.inv > 0 && Math.floor(state.t * 20) % 2) && p.hp > 0) {
      drawSprite(S.flame[Math.floor(state.t * 16) % 2], p.x - 3, p.y + 3);
      drawSprite(S.ship, p.x, p.y);
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
    endBox.querySelector('.duck-game__title').textContent = result === 'vitoria' ? 'VITÓRIA!' : 'GAME OVER';
    endBox.querySelector('.duck-game__sub').textContent =
      result === 'vitoria'
        ? 'Impossível… o pato perdeu. Ele vai negar isso pra sempre.'
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
    } else if (!state.result && endBox.hidden) loopStart();
  });

  /* ---------- limpeza total ---------- */
  let cleaned = false;
  function cleanup(result) {
    if (cleaned) return;
    cleaned = true;
    running = false;
    cancelAnimationFrame(raf);
    ctrl.abort(); // remove TODOS os listeners registrados pelo jogo
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
  loopStart();
  if (import.meta.env?.DEV) window.__duckGame = { get state() { return state; } };
  return cleanup;
}
