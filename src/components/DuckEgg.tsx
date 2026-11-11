import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { duckLines, duckSpots, lineAct, lineText, type DuckAction, type DuckLine } from '../data/duckLines';
import { DUCK_ANIMS, DUCK_CELL, DUCK_PROPS, DUCK_SHEET, PROP_CELL, type DuckProp } from '../data/duckSprites';

const SPRITE_URL = `${import.meta.env.BASE_URL}assets/pato/pato-sprites.png`;
type GameResult = 'vitoria' | 'derrota' | 'saiu';

/** escalada de raiva: 7 cliques no pato abrem o minigame */
const RAGE: DuckLine[] = [
  'Ei! Sem encostar no pato!',
  'Para. Agora.',
  'Tô ficando nervoso… muito nervoso.',
  '⚠ Último aviso de verdade.',
  'Você não sabe com quem tá mexendo.',
  'VOCÊ PEDIU.',
  'PREPARE-SE PRA BATALHA!',
];
const AFTER_GAME: Record<GameResult, DuckLine[]> = {
  vitoria: ['Ganhou de mim? Foi sorte. SORTE.', 'Tá. Você venceu. Não conta pra ninguém.'],
  derrota: ['Hahaha! Perdeu pro pato. Quack.', 'Volte quando souber pilotar.'],
  saiu: ['Fugiu, é? Covarde. Eu tava ganhando.', 'Apertou ESC? Clássico.'],
};
const PROPS_URL = `${import.meta.env.BASE_URL}assets/pato/pato-props.png`;

/**
 * Easter egg "Pato Vírus" (rodapé).
 * O pato NUNCA toma o cursor: ele não esconde, não trava e não move o mouse.
 * Quando segue o cursor, fica sempre a uma distância segura para não cobrir o que você aponta.
 */

type Phase = 'boxed' | 'opening' | 'free' | 'feeding' | 'closing';
const STORAGE_KEY = 'pato-livre';
const pick = <T,>(list: T[]) => list[Math.floor(Math.random() * list.length)];
const rand = (a: number, b: number) => a + Math.random() * (b - a);

const storage = {
  get: () => {
    try {
      return sessionStorage.getItem(STORAGE_KEY) === '1';
    } catch {
      return false;
    }
  },
  set: (free: boolean) => {
    try {
      if (free) sessionStorage.setItem(STORAGE_KEY, '1');
      else sessionStorage.removeItem(STORAGE_KEY);
    } catch {
      /* navegação privada: sem problema */
    }
  },
};

/* ------------------------------------------------------------------ */
/* Caixa                                                               */
/* ------------------------------------------------------------------ */

const BoxSvg: React.FC<{ open: boolean }> = ({ open }) => (
  <svg viewBox="0 0 140 112" className="pato-box__svg" aria-hidden>
    <g className={`pato-box__flap pato-box__flap--l ${open ? 'is-open' : ''}`}>
      <path d="M14 34h56l-6 -16H20z" fill="#b97a43" stroke="#7a4a22" strokeWidth="2" strokeLinejoin="round" />
    </g>
    <g className={`pato-box__flap pato-box__flap--r ${open ? 'is-open' : ''}`}>
      <path d="M70 34h56l-6 -16H76z" fill="#c4874e" stroke="#7a4a22" strokeWidth="2" strokeLinejoin="round" />
    </g>
    <rect x="16" y="30" width="108" height="10" fill="#3b220f" />
    <path d="M14 34h112v66a6 6 0 0 1-6 6H20a6 6 0 0 1-6-6z" fill="#d6995c" stroke="#7a4a22" strokeWidth="2" />
    <rect x="62" y="34" width="16" height="72" fill="#e9c08d" opacity="0.8" />
    <g fill="#c0262d" fontFamily="'JetBrains Mono', monospace" fontWeight="700" textAnchor="middle">
      <text x="70" y="66" fontSize="13">⚠ PATO</text>
      <text x="70" y="82" fontSize="8.5" letterSpacing="1">NÃO ABRA</text>
    </g>
    <path d="M24 92l8 6M108 92l-8 6" stroke="#7a4a22" strokeWidth="1.5" opacity="0.5" />
  </svg>
);

/* ------------------------------------------------------------------ */
/* Ações (cada fala pode vir com uma)                                  */
/* ------------------------------------------------------------------ */

const DUR: Record<DuckAction, number> = {
  tired: 3600, dance: 2200, tilt: 2700, spin: 1800, cover: 3000,
  confused: 2900, model: 2500, sign7: 2700, investigate: 2900, tapMouse: 3400,
  think: 3600, emotional: 2800, nostalgia: 2900, cross: 3300, loudQuack: 2100, limp: 3600, pointEye: 2700, watch: 2900,
  readProjects: 5500, measureSkills: 3400, lieFooter: 5200, sitName: 5200,
  rushFood: 60000, carryFood: 60000, lieBox: 1400, lastLook: 1200,
};

/** cabeça do pato dentro do quadro 32x32, por direção (E, SE, S, SO, O, NO, N, NE) */
const HEAD_X = [21, 19, 16, 13, 11, 13, 16, 19];
const DIR = { E: 0, SE: 1, S: 2, SW: 3, W: 4, NW: 5, N: 6, NE: 7 } as const;

type PropPlace = 'above' | 'side' | 'eye' | 'hand';
interface Frame {
  col?: number;
  dir?: number;
  hold?: boolean;
  target?: { x: number; y: number } | null;
  speedMult?: number;
  noPersonal?: boolean;
  hop?: number;
  prop?: [DuckProp, PropPlace, string?] | null;
  shout?: string | null;
  limp?: boolean;
}

/* ------------------------------------------------------------------ */
/* O pato solto (camada fixa por cima da página)                       */
/* ------------------------------------------------------------------ */

interface LayerProps {
  phase: Phase;
  firstLine: DuckLine;
  boxRef: React.RefObject<HTMLDivElement>;
  onHome: () => void;
  onStartGame: () => void;
  gameOn: boolean;
  gameResult: { r: GameResult; n: number } | null;
}

type Mode = 'follow' | 'wander' | 'visit' | 'dodge' | 'food' | 'home';

const DuckLayer: React.FC<LayerProps> = ({ phase, firstLine, boxRef, onHome, onStartGame, gameOn, gameResult }) => {
  const duckRef = useRef<HTMLDivElement>(null);
  const spriteRef = useRef<HTMLDivElement>(null);
  const propRef = useRef<HTMLDivElement>(null);
  const shoutRef = useRef<HTMLDivElement>(null);
  const bubbleRef = useRef<HTMLDivElement>(null);
  const foodRef = useRef<HTMLDivElement>(null);
  const engine = useRef<{ feed: () => void; poke: () => void; afterGame: (r: GameResult) => void } | null>(null);
  const onHomeRef = useRef(onHome);
  onHomeRef.current = onHome;
  const onStartGameRef = useRef(onStartGame);
  onStartGameRef.current = onStartGame;
  const gameOnRef = useRef(gameOn);
  gameOnRef.current = gameOn;

  useEffect(() => {
    const duck = duckRef.current!;
    const sprite = spriteRef.current!;
    const propEl = propRef.current!;
    const shoutEl = shoutRef.current!;
    const bubble = bubbleRef.current!;
    const food = foodRef.current!;
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const small = () => window.innerWidth < 640;
    const half = () => (small() ? 24 : 34);
    const sc = () => (small() ? 2 : 3);

    const b = boxRef.current?.getBoundingClientRect();
    const start = b ? { x: b.left + b.width / 2, y: b.top + b.height * 0.3 } : { x: window.innerWidth / 2, y: window.innerHeight - 120 };
    const s = {
      x: start.x, y: start.y, vx: 0, vy: 0, dir: 2 as number,
      mode: 'wander' as Mode,
      target: { x: start.x + rand(-120, 120), y: Math.max(90, start.y - 220) },
      spot: null as Element | null,
      modeUntil: performance.now() + 5500,
      nextLine: performance.now() + 7000,
      bubbleUntil: 0,
      quackUntil: 0,
      pointer: null as null | { x: number; y: number },
      pdx: 0,
      lastMove: performance.now(),
      fastHits: 0,
      lastCursorLine: 0,
      idleSaid: false,
      foodPos: null as null | { x: number; y: number },
      stage: 'free' as 'free' | 'toFood' | 'pecking' | 'carry' | 'atBox' | 'done',
      animT: 0,
      blinkAt: performance.now() + 2500,
      act: null as null | { id: DuckAction; t0: number; until: number; anchor?: { x: number; y: number } },
      propKey: '',
      pokes: 0,
      pokeAt: 0,
      starting: false,
      dodgeReadyAt: 0,
    };

    /* ---------- fala (+ ação) ---------- */
    const startAct = (id: DuckAction) => {
      const now = performance.now();
      s.act = { id, t0: now, until: now + DUR[id], anchor: { x: s.x, y: s.y } };
    };
    const say = (line: DuckLine) => {
      const text = lineText(line);
      bubble.textContent = text;
      bubble.classList.add('is-on');
      const now = performance.now();
      s.quackUntil = now + 1200;
      s.bubbleUntil = now + Math.min(6500, 2600 + text.length * 38);
      s.nextLine = now + rand(7500, 11500);
      const act = reduced ? undefined : lineAct(line);
      if (act) startAct(act);
    };
    say(firstLine);

    /* ---------- comportamento ---------- */
    const randomPoint = () => ({ x: rand(70, window.innerWidth - 70), y: rand(110, window.innerHeight - 90) });
    const inView = (el: Element | null) => {
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return r.bottom > 80 && r.top < window.innerHeight - 40 && r.width > 0 ? r : null;
    };
    const visibleSpots = () => duckSpots.map((sp) => ({ sp, el: document.querySelector(sp.selector) })).filter(({ el }) => inView(el));

    const chooseMode = () => {
      const now = performance.now();
      const roll = Math.random();
      if (roll < 0.38 && s.pointer) {
        s.mode = 'follow';
        s.modeUntil = now + rand(4500, 8000);
      } else if (roll < 0.74) {
        const spots = visibleSpots();
        if (spots.length) {
          const { sp, el } = pick(spots);
          s.mode = 'visit';
          s.spot = el;
          s.modeUntil = now + rand(5500, 8500);
          say(pick(sp.lines));
          return;
        }
        s.mode = 'wander';
        s.modeUntil = now + rand(4000, 7000);
      } else {
        s.mode = 'wander';
        s.modeUntil = now + rand(4000, 7000);
      }
      s.target = randomPoint();
    };

    const boxMouth = () => {
      const br = boxRef.current?.getBoundingClientRect();
      return br ? { x: br.left + br.width / 2, y: br.top + br.height * 0.28 } : { x: window.innerWidth / 2, y: window.innerHeight + 80 };
    };

    const baseTarget = (): { x: number; y: number } => {
      switch (s.mode) {
        case 'follow': {
          if (!s.pointer) return s.target;
          const dx = s.x - s.pointer.x;
          const dy = s.y - s.pointer.y;
          const d = Math.hypot(dx, dy) || 1;
          const keep = small() ? 70 : 95;
          if (d <= keep + 6) return { x: s.x, y: s.y };
          return { x: s.pointer.x + (dx / d) * keep, y: s.pointer.y + (dy / d) * keep };
        }
        case 'visit': {
          const r = s.spot?.getBoundingClientRect();
          if (!r || r.bottom < 60 || r.top > window.innerHeight) return s.target;
          return { x: r.left + Math.min(r.width, 420) * 0.6, y: r.top - half() + 6 };
        }
        case 'food':
          return s.foodPos ?? s.target;
        case 'home':
          return boxMouth();
        default:
          return s.target;
      }
    };

    const dirTo = (ax: number, ay: number) => ((Math.round(Math.atan2(ay, ax) / (Math.PI / 4)) % 8) + 8) % 8;
    const faceSide = (x: number) => (x >= s.x ? DIR.E : DIR.W);
    const loop = (anim: readonly number[], fps: number, t: number) => anim[Math.floor(t * fps) % anim.length];

    /** o que a ação atual manda fazer neste quadro */
    const actFrame = (now: number): Frame | null => {
      const a = s.act;
      if (!a) return null;
      const t = (now - a.t0) / 1000;
      const near = (p: { x: number; y: number }, d = 14) => Math.hypot(p.x - s.x, p.y - s.y) < d;
      switch (a.id) {
        case 'tired':
          return { col: loop(DUCK_ANIMS.tired, 3, t), speedMult: 0.35, prop: ['sweat', 'side', 'drip'] };
        case 'dance': {
          s.x += s.pdx * 0.5;
          return {
            col: loop(DUCK_ANIMS.walk, 12, t), hold: true, hop: -Math.abs(Math.sin(t * 13)) * 9,
            dir: Math.sin(t * 6.5) > 0 ? DIR.E : DIR.W, prop: ['note', 'above', 'bob'],
          };
        }
        case 'tilt':
          return { col: DUCK_ANIMS.tilt[0], hold: true, dir: s.pointer ? faceSide(s.pointer.x) : s.dir, prop: ['question', 'above', 'bob'] };
        case 'spin': {
          const away = s.pointer ? { x: s.x + (s.x - s.pointer.x) * 0.15, y: s.y + (s.y - s.pointer.y) * 0.15 } : null;
          return { col: loop(DUCK_ANIMS.walk, 14, t), dir: Math.floor(t * 16) % 8, target: away, speedMult: 0.5 };
        }
        case 'cover':
          return { col: loop(DUCK_ANIMS.cover, 6, t), speedMult: 0.8 };
        case 'confused':
          return { col: DUCK_ANIMS.tilt[0], hold: true, dir: DIR.S, hop: Math.sin(t * 3) * 3, prop: ['question', 'above', 'bob'] };
        case 'model':
          return { col: DUCK_ANIMS.model[0], hold: true, dir: t < 1.2 ? DIR.S : DIR.SE, prop: t > 0.5 ? ['sparkle', 'eye', 'flash'] : null };
        case 'sign7':
          return { col: DUCK_ANIMS.pointUp[0], hold: true, dir: DIR.S, prop: t < DUR.sign7 / 1000 - 0.6 ? ['sign7', 'hand', 'pop'] : ['sign7', 'hand', 'vanish'] };
        case 'investigate':
          return {
            col: Math.floor(t * 2) % 2 ? DUCK_ANIMS.pointDown[0] : DUCK_ANIMS.pointUp[0], hold: true, dir: DIR.S,
            prop: ['magnifier', 'side', 'bob'],
          };
        case 'tapMouse': {
          if (!s.pointer) return { col: DUCK_ANIMS.idle[0], hold: true };
          const side = s.x <= s.pointer.x ? -1 : 1;
          const spot = { x: s.pointer.x + side * 46, y: s.pointer.y + 6 };
          const there = near(spot, 20);
          return {
            target: spot, noPersonal: true, speedMult: 1.4,
            col: there ? loop(DUCK_ANIMS.tap, 5, t) : undefined,
            dir: there ? faceSide(s.pointer.x) : undefined,
          };
        }
        case 'think':
          return { col: DUCK_ANIMS.think[0], hold: true, dir: DIR.SE, prop: ['dots', 'above', 'bob'] };
        case 'emotional':
          return t < 1.7
            ? { col: DUCK_ANIMS.cry[0], hold: true, dir: DIR.S, prop: ['tear', 'eye', 'drip'] }
            : { col: DUCK_ANIMS.idle[0], hold: true, dir: DIR.S, prop: ['exclaim', 'above', 'pop'] };
        case 'nostalgia': {
          const m = boxMouth();
          return { col: DUCK_ANIMS.idle[t % 1.6 < 0.15 ? 2 : 0], hold: true, dir: dirTo(m.x - s.x, m.y - s.y), prop: ['heart', 'above', 'bob'] };
        }
        case 'cross':
          return { col: DUCK_ANIMS.cross[0], hold: true, dir: DIR.S, prop: t > 1 ? ['dots', 'above', 'bob'] : null };
        case 'loudQuack':
          return t < 0.9
            ? { col: DUCK_ANIMS.loud[0], hold: true, dir: DIR.S, shout: 'QUACK!', hop: Math.sin(t * 40) * 2 }
            : { col: DUCK_ANIMS.idle[2], hold: true, dir: DIR.S, shout: null };
        case 'limp':
          return { col: loop(DUCK_ANIMS.walk, 4, t), speedMult: 0.45, limp: true, hop: Math.floor(t * 4) % 2 ? -5 : 0 };
        case 'pointEye':
          return { col: Math.floor(t / 0.75) % 2 ? DUCK_ANIMS.pointEye[0] : DUCK_ANIMS.pointFwd[0], hold: true, dir: DIR.S };
        case 'watch':
          return { col: DUCK_ANIMS.watch[0], hold: true, dir: DIR.SE, prop: t > 1.2 ? ['exclaim', 'above', 'pop'] : null };
        case 'readProjects': {
          const r = inView(document.querySelector('#projetos .grid') ?? document.querySelector('#projetos'));
          if (!r) return null;
          const k = Math.min(1, t / (DUR.readProjects / 1000));
          const spot = { x: r.left + 40 + (r.width - 80) * k, y: Math.max(90, r.top - half() + 4) };
          return near(spot, 60)
            ? { target: spot, col: loop(DUCK_ANIMS.walk, 4, t), dir: Math.floor(t * 2.2) % 2 ? DIR.SE : DIR.E, prop: ['magnifier', 'side', 'bob'] }
            : { target: spot, speedMult: 2.4 };
        }
        case 'measureSkills': {
          const r = inView(document.querySelector('#habilidades h2'));
          if (!r) return null;
          const spot = { x: r.left + Math.min(r.width, 380) / 2, y: r.top - half() + 2 };
          return near(spot, 24) ? { target: spot, col: DUCK_ANIMS.measure[0], dir: DIR.S } : { target: spot, speedMult: 2.4 };
        }
        case 'lieFooter': {
          const r = inView(document.querySelector('footer'));
          if (!r) return null;
          const spot = { x: r.left + r.width * 0.3, y: Math.min(window.innerHeight - 40, r.bottom - 90) };
          return near(spot, 24) ? { target: spot, col: DUCK_ANIMS.lie[0], dir: DIR.E, prop: ['zzz', 'above', 'bob'] } : { target: spot, speedMult: 2.4 };
        }
        case 'sitName': {
          const r = inView(document.querySelector('#inicio h1')) ?? inView(document.querySelector('footer p[aria-hidden]'));
          if (!r) return null;
          const spot = { x: r.left + Math.min(r.width, 520) * 0.55, y: r.top - half() + 14 };
          return near(spot, 24) ? { target: spot, col: loop(DUCK_ANIMS.sit, 3, t), dir: DIR.S } : { target: spot, speedMult: 2.4 };
        }
        case 'rushFood':
          return { col: loop(DUCK_ANIMS.fly, 16, t), speedMult: 2 };
        case 'carryFood':
          return { col: loop(DUCK_ANIMS.carry, 12, t), shout: 'nhac nhac' };
        case 'lieBox':
          return { col: DUCK_ANIMS.lie[0], hold: true, dir: DIR.E, prop: ['zzz', 'above', 'bob'] };
        case 'lastLook':
          return { col: DUCK_ANIMS.idle[t > 0.6 && t < 0.75 ? 2 : 0], hold: true, dir: DIR.S };
      }
      return null;
    };

    const speedFor = () => {
      switch (s.mode) {
        case 'follow': return 0.05;
        case 'visit': return 0.04;
        case 'dodge': return 0.12;
        case 'food': return 0.06;
        case 'home': return 0.07;
        default: return 0.025;
      }
    };

    /* ---------- objetos e textos em cima do pato ---------- */
    const setProp = (p: Frame['prop'], dir: number) => {
      const key = p ? `${p[0]}|${p[1]}|${p[2] ?? ''}|${dir}` : '';
      if (key === s.propKey) return;
      s.propKey = key;
      if (!p) {
        propEl.className = 'pato__prop';
        return;
      }
      const [name, place, anim] = p;
      const k = sc();
      const hx = HEAD_X[dir];
      const right = dir === DIR.E || dir === DIR.SE || dir === DIR.NE;
      const pos = {
        above: [hx - 8, -9],
        side: [right ? hx + 3 : hx - 19, -3],
        eye: [hx - 7 + (right ? 3 : dir === DIR.S || dir === DIR.N ? 0 : -3), 0],
        hand: [hx + 3, -8],
      }[place];
      propEl.style.backgroundImage = `url(${PROPS_URL})`;
      propEl.style.width = `${PROP_CELL * k}px`;
      propEl.style.height = `${PROP_CELL * k}px`;
      propEl.style.backgroundSize = `${Object.keys(DUCK_PROPS).length * PROP_CELL * k}px ${PROP_CELL * k}px`;
      propEl.style.backgroundPosition = `-${DUCK_PROPS[name] * PROP_CELL * k}px 0`;
      propEl.style.left = `${pos[0] * k}px`;
      propEl.style.top = `${pos[1] * k}px`;
      propEl.className = `pato__prop is-on ${anim ? `is-${anim}` : ''}`;
    };
    const setShout = (text: string | null | undefined) => {
      if (text) {
        if (shoutEl.textContent !== text) shoutEl.textContent = text;
        shoutEl.classList.add('is-on');
      } else shoutEl.classList.remove('is-on');
    };

    /* ---------- entradas (sem nunca mexer no cursor) ---------- */
    let lastPt = { x: 0, y: 0, t: 0 };
    const onMove = (e: PointerEvent) => {
      const now = performance.now();
      if (s.pointer) s.pdx += e.clientX - s.pointer.x;
      s.pointer = { x: e.clientX, y: e.clientY };
      s.lastMove = now;
      s.idleSaid = false;
      if (lastPt.t) {
        const v = Math.hypot(e.clientX - lastPt.x, e.clientY - lastPt.y) / Math.max(1, now - lastPt.t);
        s.fastHits = v > 1.5 ? s.fastHits + 1 : Math.max(0, s.fastHits - 0.5);
        if (s.fastHits > 6 && now - s.lastCursorLine > 8000 && s.stage === 'free' && !s.act) {
          s.lastCursorLine = now;
          s.fastHits = 0;
          say(pick(duckLines.cursor));
          s.mode = 'follow';
          s.modeUntil = now + 6000;
        }
      }
      lastPt = { x: e.clientX, y: e.clientY, t: now };
    };
    window.addEventListener('pointermove', onMove, { passive: true });
    window.addEventListener('pointerdown', onMove as EventListener, { passive: true });

    /* ---------- ações vindas de fora ---------- */
    engine.current = {
      feed() {
        if (s.stage !== 'free') return;
        s.stage = 'toFood';
        s.act = null;
        const m = boxMouth();
        const side = s.x < m.x ? -1 : 1;
        s.foodPos = {
          x: Math.min(window.innerWidth - 50, Math.max(50, m.x + side * rand(140, 220))),
          y: Math.min(window.innerHeight - 70, Math.max(110, m.y - rand(40, 110))),
        };
        food.style.transform = `translate(${s.foodPos.x}px, ${s.foodPos.y}px)`;
        food.classList.add('is-on');
        s.mode = 'food';
        say(pick(duckLines.food));
      },
      poke() {
        if (s.stage !== 'free' || gameOnRef.current || s.starting) return;
        const now = performance.now();
        s.act = null;
        // escalada de raiva: a partir do 1º clique ele para de fugir; no 7º, abre o jogo
        if (now - s.pokeAt > 4000) s.pokes = 0;
        s.pokes += 1;
        s.pokeAt = now;
        say(RAGE[Math.min(s.pokes, RAGE.length) - 1]);
        for (let i = 1; i <= 7; i++) duck.classList.remove(`is-angry-${i}`);
        duck.classList.add(`is-angry-${Math.min(s.pokes, 6)}`, 'is-poked');
        setTimeout(() => duck.classList.remove('is-poked'), 400);
        if (s.pokes === 6) {
          document.documentElement.classList.add('pato-quake');
          setTimeout(() => document.documentElement.classList.remove('pato-quake'), 700);
        }
        if (s.pokes >= 7) {
          s.pokes = 0;
          s.starting = true; // ignora toques enquanto o jogo carrega
          for (let i = 1; i <= 7; i++) duck.classList.remove(`is-angry-${i}`);
          setTimeout(() => onStartGameRef.current(), 450);
        }
      },
      afterGame(r) {
        s.pokes = 0;
        s.starting = false;
        for (let i = 1; i <= 7; i++) duck.classList.remove(`is-angry-${i}`);
        s.lastMove = performance.now();
        say(pick(AFTER_GAME[r]));
        s.modeUntil = performance.now() + 4500; // deixa o comentário do resultado aparecer
      },
    };

    // gatilho de teste (só no modo de desenvolvimento; não vai para o site publicado)
    if (import.meta.env.DEV) {
      (window as unknown as { __pato?: unknown }).__pato = {
        say: (line: DuckLine) => say(line),
        state: () => ({ x: s.x, y: s.y, dir: s.dir, act: s.act?.id ?? null, stage: s.stage, mode: s.mode }),
      };
    }

    /* ---------- laço principal ---------- */
    let raf = 0;
    let last = performance.now();
    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      // o 1º quadro pode vir com horário anterior ao da criação: nunca deixa o passo ficar negativo
      const dt = Math.max(0, Math.min(48, now - last)) / 16.67;
      last = now;
      if (s.stage === 'done' || gameOnRef.current) return;
      const angry = s.pokes > 0 && now - s.pokeAt < 4000;
      if (s.pokes > 0 && !angry) {
        s.pokes = 0;
        for (let i = 1; i <= 7; i++) duck.classList.remove(`is-angry-${i}`);
      }

      // ação atual (some quando acaba o tempo)
      if (s.act && now > s.act.until) s.act = null;
      let af = actFrame(now);
      if (s.act && !af) s.act = null; // ação sem onde acontecer (ex.: seção fora da tela)
      if (angry) af = { hold: true, noPersonal: true, dir: DIR.S, col: s.pokes >= 4 ? DUCK_ANIMS.loud[0] : DUCK_ANIMS.cross[0], hop: s.pokes >= 3 ? Math.sin(now / 30) * 1.5 : 0 };

      if (s.stage === 'free' && !s.act && !angry && now > s.modeUntil) chooseMode();
      if (s.mode === 'wander' && Math.hypot(s.target.x - s.x, s.target.y - s.y) < 12 && s.stage === 'free') s.target = randomPoint();

      let t = af?.target ?? (af?.hold ? { x: s.x, y: s.y } : baseTarget());

      // espaço pessoal: se o cursor chega perto, o pato se afasta (nunca fica embaixo do ponteiro)
      // depois de fugir, ele fica 2,5 s sem fugir de novo: quem persegue consegue pegá-lo
      if (s.pointer && s.stage === 'free' && !af?.noPersonal && now > s.dodgeReadyAt) {
        const px = s.x - s.pointer.x;
        const py = s.y - s.pointer.y;
        const pd = Math.hypot(px, py) || 1;
        const personal = small() ? 64 : 84;
        if (pd < personal) {
          const push = personal + 40;
          t = {
            x: Math.min(window.innerWidth - half(), Math.max(half(), s.pointer.x + (px / pd) * push)),
            y: Math.min(window.innerHeight - half(), Math.max(70, s.pointer.y + (py / pd) * push)),
          };
          s.act = null;
          af = null;
          if (s.mode !== 'dodge') {
            s.dodgeReadyAt = now + 900 + 2500;
            s.mode = 'dodge';
            s.target = t;
            s.modeUntil = now + 900;
          }
        }
      }

      const k = 1 - Math.pow(1 - Math.min(0.5, speedFor() * (af?.speedMult ?? 1)), dt);
      let nvx = (t.x - s.x) * k;
      let nvy = (t.y - s.y) * k;
      const max = (s.mode === 'dodge' || s.mode === 'home' ? 22 : 12) * dt * Math.max(1, af?.speedMult ?? 1);
      const sp = Math.hypot(nvx, nvy);
      if (sp > max && sp > 0) {
        nvx = (nvx / sp) * max;
        nvy = (nvy / sp) * max;
      }
      s.vx = nvx;
      s.vy = nvy;
      s.x += nvx;
      s.y += nvy;
      s.pdx = 0;
      if (s.mode !== 'home') {
        s.x = Math.min(window.innerWidth - half(), Math.max(half(), s.x));
        s.y = Math.min(window.innerHeight - half(), Math.max(70, s.y));
      }

      // direção e animação
      const speed = Math.hypot(s.vx, s.vy) / dt;
      if (af?.dir !== undefined) s.dir = af.dir;
      else if (speed > 0.35) s.dir = dirTo(s.vx, s.vy);
      else if (s.mode === 'follow' && s.pointer) s.dir = dirTo(s.pointer.x - s.x, s.pointer.y - s.y);

      s.animT += (dt * 16.67) / 1000;
      let col: number;
      if (af?.col !== undefined) col = af.col;
      else if (s.stage === 'pecking') col = loop(DUCK_ANIMS.eat, 7, s.animT);
      else if (speed > 4.5) col = loop(DUCK_ANIMS.fly, 12, s.animT);
      else if (speed > 0.35) col = DUCK_ANIMS.walk[Math.floor(s.animT * (6 + speed * 1.5)) % 4];
      else if (now < s.quackUntil) col = loop(DUCK_ANIMS.quack, 7, s.animT);
      else {
        if (now > s.blinkAt + 140) s.blinkAt = now + rand(2000, 4500);
        col = now > s.blinkAt ? DUCK_ANIMS.idle[2] : DUCK_ANIMS.idle[Math.floor(s.animT * 1.6) % 2];
      }
      const px = DUCK_CELL * sc();
      sprite.style.backgroundSize = `${DUCK_SHEET.w * sc()}px ${DUCK_SHEET.h * sc()}px`;
      sprite.style.backgroundPosition = `-${col * px}px -${s.dir * px}px`;
      duck.classList.toggle('is-limp', !!af?.limp);
      duck.style.transform = `translate(${s.x}px, ${s.y + (af?.hop ?? 0)}px)`;
      setProp(af?.prop ?? null, s.dir);
      setShout(af?.shout);

      // balão acima do pato, sempre dentro da tela
      const bw = bubble.offsetWidth;
      const bh = bubble.offsetHeight;
      const bx = Math.min(window.innerWidth - bw - 10, Math.max(10, s.x - bw / 2));
      const topThing = (af?.prop && (af.prop[1] === 'above' || af.prop[1] === 'hand')) || af?.shout ? PROP_CELL * sc() + 6 : 0;
      const gap = 30 + topThing;
      const above = s.y - half() - bh - gap > 10;
      const by = above ? s.y - half() - bh - gap : s.y + half() + 12;
      bubble.style.transform = `translate(${bx}px, ${by}px)`;
      bubble.style.setProperty('--tail', `${Math.min(bw - 18, Math.max(18, s.x - bx))}px`);
      bubble.classList.toggle('is-below', !above);
      if (now > s.bubbleUntil) bubble.classList.remove('is-on');

      // falas periódicas
      if (s.stage === 'free' && !s.act && !angry && now > s.nextLine) {
        const pool =
          s.mode === 'follow' ? (Math.random() < 0.65 ? duckLines.cursor : duckLines.viewer)
          : Math.random() < 0.15 ? duckLines.extra
          : Math.random() < 0.5 ? duckLines.viewer : duckLines.general;
        say(pick(pool));
      }
      // mouse parado há 8 s
      if (s.stage === 'free' && !s.act && !s.idleSaid && now - s.lastMove > 8000) {
        s.idleSaid = true;
        say(s.pointer ? duckLines.idle[0] : pick(duckLines.idle.slice(1)));
      }

      // comida: chega, bica, pega no bico e volta pra caixa
      if (s.stage === 'toFood' && s.foodPos && Math.hypot(s.foodPos.x - s.x, s.foodPos.y - s.y) < 16) {
        s.stage = 'pecking';
        s.act = null;
        setTimeout(() => {
          food.classList.remove('is-on');
          s.stage = 'carry';
          s.mode = 'home';
          say(pick(duckLines.goingHome));
        }, 700);
      }
      if (s.stage === 'carry') {
        const h = boxMouth();
        if (Math.hypot(h.x - s.x, h.y - s.y) < 12) {
          s.stage = 'atBox';
          s.x = h.x;
          s.y = h.y;
          const line = pick(duckLines.atBox);
          say(line);
          const wait = DUR[lineAct(line) ?? 'lastLook'];
          setTimeout(() => {
            s.stage = 'done';
            s.act = null;
            setProp(null, s.dir);
            setShout(null);
            duck.classList.add('is-entering');
            bubble.classList.remove('is-on');
            setTimeout(() => onHomeRef.current(), 520);
          }, wait + 200);
        }
      }
    };
    raf = requestAnimationFrame(frame);
    const onVis = () => {
      if (document.hidden) cancelAnimationFrame(raf);
      else {
        last = performance.now();
        raf = requestAnimationFrame(frame);
      }
    };
    document.addEventListener('visibilitychange', onVis);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerdown', onMove as EventListener);
      document.removeEventListener('visibilitychange', onVis);
      engine.current = null;
    };
    // o laço é criado uma vez por soltura do pato
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (phase === 'feeding') engine.current?.feed();
  }, [phase]);

  useEffect(() => {
    if (gameResult) engine.current?.afterGame(gameResult.r);
  }, [gameResult]);

  return (
    <div aria-hidden className={`pato-layer ${gameOn ? 'is-hidden' : ''}`}>
      <div ref={foodRef} className="pato-food">🌽</div>
      <div ref={bubbleRef} className="pato-bubble" />
      <div
        ref={duckRef}
        className="pato"
        onPointerDown={(e) => {
          e.stopPropagation();
          engine.current?.poke();
        }}
      >
        <div className="pato__body">
          <div ref={spriteRef} className="pato__sprite" style={{ backgroundImage: `url(${SPRITE_URL})` }} />
          <div ref={propRef} className="pato__prop" />
          <div ref={shoutRef} className="pato__shout" />
        </div>
      </div>
    </div>
  );
};

/* ------------------------------------------------------------------ */
/* Botão + caixa (no rodapé)                                           */
/* ------------------------------------------------------------------ */

export const DuckEgg: React.FC = () => {
  const [phase, setPhase] = useState<Phase>('boxed');
  const [firstLine, setFirstLine] = useState<DuckLine>('');
  const [mounted, setMounted] = useState(false);
  const [status, setStatus] = useState('');
  const [gameOn, setGameOn] = useState(false);
  const [gameResult, setGameResult] = useState<{ r: GameResult; n: number } | null>(null);
  const stopGame = useRef<(() => void) | null>(null);
  const boxRef = useRef<HTMLDivElement>(null);

  // o jogo (duck-game.js) só é baixado aqui, no 7º clique
  const startGame = useCallback(() => {
    if (stopGame.current) return;
    setGameOn(true);
    setStatus('Minigame aberto. Aperte Escape para sair.');
    import('../game/duck-game.js')
      .then(({ startDuckGame }) => {
        stopGame.current = startDuckGame({
          duckSpriteUrl: SPRITE_URL,
          onExit: (r) => {
            stopGame.current = null;
            setGameOn(false);
            setGameResult({ r, n: Date.now() });
            setStatus('Minigame encerrado.');
          },
        });
      })
      .catch(() => {
        // sem internet / falha ao baixar o jogo: o pato volta ao normal
        setGameOn(false);
        setGameResult({ r: 'saiu', n: Date.now() });
      });
  }, []);
  useEffect(() => () => stopGame.current?.(), []);

  // se a página foi recarregada com o pato solto, ele volta ("não adianta, eu volto")
  useEffect(() => {
    setMounted(true);
    if (storage.get()) {
      setFirstLine(pick(duckLines.comeback));
      setPhase('free');
    }
  }, []);

  const release = useCallback(() => {
    setPhase('opening');
    setStatus('O pato foi solto.');
    setTimeout(() => {
      setFirstLine(pick(duckLines.release));
      setPhase('free');
      storage.set(true);
    }, 950);
  }, []);

  const capture = useCallback(() => {
    setPhase('feeding');
    setStatus('Comida servida. O pato está voltando para a caixa.');
  }, []);

  const onHome = useCallback(() => {
    setPhase('closing');
    storage.set(false);
    setTimeout(() => {
      setPhase('boxed');
      setStatus('O pato está de volta na caixa.');
    }, 650);
  }, []);

  const free = phase === 'free' || phase === 'feeding';
  const busy = phase === 'opening' || phase === 'feeding' || phase === 'closing';
  const lidOpen = phase !== 'boxed' && phase !== 'closing';

  return (
    <div className="pato-egg flex flex-col items-center gap-5 py-10">
      <div ref={boxRef} className={`pato-box ${phase === 'opening' ? 'is-shaking' : ''} ${phase === 'closing' ? 'is-gulp' : ''}`}>
        <BoxSvg open={lidOpen} />
      </div>
      <button type="button" onClick={free ? capture : release} disabled={busy || gameOn} className={`pato-btn ${free ? 'pato-btn--catch' : ''}`}>
        {free ? (phase === 'feeding' ? 'Servindo milho…' : 'Aperte para prender o pato') : 'Não aperte esse botão!'}
      </button>
      <p className="sr-only" role="status" aria-live="polite">{status}</p>
      {mounted && free && createPortal(<DuckLayer phase={phase} firstLine={firstLine} boxRef={boxRef} onHome={onHome} onStartGame={startGame} gameOn={gameOn} gameResult={gameResult} />, document.body)}
    </div>
  );
};
