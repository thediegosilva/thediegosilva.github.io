/**
 * Efeitos de interface em Vanilla JS (sem re-render do React).
 *
 *  [data-reveal]     -> fade-up ao entrar na viewport (IntersectionObserver)
 *  [data-spotlight]  -> brilho radial que segue o cursor (CSS vars --mx / --my)
 *  [data-magnetic]   -> elemento é "atraído" levemente pelo cursor
 *  [data-tilt]       -> inclinação 3D sutil
 *  :root --cx/--cy   -> posição global do cursor (usada pelo fundo)
 *
 * Tudo é delegado no document, então funciona também para elementos
 * renderizados depois (modais, filtros etc.).
 */

const prefersReducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const finePointer = () => window.matchMedia('(hover: hover) and (pointer: fine)').matches;

/* ------------------------------------------------------------------ */
/* Scroll reveal                                                       */
/* ------------------------------------------------------------------ */
function initReveal() {
  const io = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          io.unobserve(entry.target);
        }
      }
    },
    { rootMargin: '0px 0px -10% 0px', threshold: 0.08 },
  );

  const observe = (root: ParentNode) =>
    root.querySelectorAll<HTMLElement>('[data-reveal]:not(.is-visible)').forEach((el) => io.observe(el));

  observe(document);

  // Observa elementos que entram no DOM depois (React, filtros, modais)
  const mo = new MutationObserver((mutations) => {
    for (const m of mutations) {
      m.addedNodes.forEach((node) => {
        if (!(node instanceof HTMLElement)) return;
        if (node.matches('[data-reveal]')) io.observe(node);
        observe(node);
      });
    }
  });
  mo.observe(document.body, { childList: true, subtree: true });

  return () => {
    io.disconnect();
    mo.disconnect();
  };
}

/* ------------------------------------------------------------------ */
/* Ponteiro: spotlight, magnético, tilt e cursor global                */
/* ------------------------------------------------------------------ */
function initPointer() {
  if (!finePointer()) return () => {};

  const root = document.documentElement;
  let frame = 0;
  let last: PointerEvent | null = null;
  let magneticEl: HTMLElement | null = null;
  let tiltEl: HTMLElement | null = null;

  const resetMagnetic = () => {
    if (magneticEl) magneticEl.style.transform = '';
    magneticEl = null;
  };
  const resetTilt = () => {
    if (tiltEl) tiltEl.style.transform = '';
    tiltEl = null;
  };

  const update = () => {
    frame = 0;
    const e = last;
    if (!e) return;
    const target = e.target as Element | null;

    root.style.setProperty('--cx', `${e.clientX}px`);
    root.style.setProperty('--cy', `${e.clientY}px`);

    // Spotlight (todos os ancestrais marcados recebem as coordenadas locais)
    let node = target?.closest<HTMLElement>('[data-spotlight]');
    while (node) {
      const r = node.getBoundingClientRect();
      node.style.setProperty('--mx', `${e.clientX - r.left}px`);
      node.style.setProperty('--my', `${e.clientY - r.top}px`);
      node = node.parentElement?.closest<HTMLElement>('[data-spotlight]') ?? null;
    }

    if (prefersReducedMotion()) return;

    // Magnético
    const mag = target?.closest<HTMLElement>('[data-magnetic]') ?? null;
    if (mag !== magneticEl) resetMagnetic();
    if (mag) {
      magneticEl = mag;
      const r = mag.getBoundingClientRect();
      const strength = Number(mag.dataset.magnetic) || 0.25;
      const dx = (e.clientX - (r.left + r.width / 2)) * strength;
      const dy = (e.clientY - (r.top + r.height / 2)) * strength;
      mag.style.transform = `translate3d(${dx}px, ${dy}px, 0)`;
    }

    // Tilt 3D
    const tilt = target?.closest<HTMLElement>('[data-tilt]') ?? null;
    if (tilt !== tiltEl) resetTilt();
    if (tilt) {
      tiltEl = tilt;
      const r = tilt.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width - 0.5;
      const py = (e.clientY - r.top) / r.height - 0.5;
      tilt.style.transform = `perspective(1000px) rotateX(${(-py * 5).toFixed(2)}deg) rotateY(${(px * 6).toFixed(2)}deg) translateY(-6px)`;
    }
  };

  const onMove = (e: PointerEvent) => {
    last = e;
    if (!frame) frame = requestAnimationFrame(update);
  };
  const onLeave = () => {
    resetMagnetic();
    resetTilt();
  };

  window.addEventListener('pointermove', onMove, { passive: true });
  document.addEventListener('pointerleave', onLeave);
  window.addEventListener('blur', onLeave);

  return () => {
    cancelAnimationFrame(frame);
    window.removeEventListener('pointermove', onMove);
    document.removeEventListener('pointerleave', onLeave);
    window.removeEventListener('blur', onLeave);
  };
}

/* ------------------------------------------------------------------ */
/* Progresso de rolagem (barra no topo)                                */
/* ------------------------------------------------------------------ */
function initScrollProgress() {
  const root = document.documentElement;
  let frame = 0;
  const update = () => {
    frame = 0;
    const max = root.scrollHeight - window.innerHeight;
    root.style.setProperty('--scroll', String(max > 0 ? window.scrollY / max : 0));
  };
  const onScroll = () => {
    if (!frame) frame = requestAnimationFrame(update);
  };
  update();
  window.addEventListener('scroll', onScroll, { passive: true });
  return () => window.removeEventListener('scroll', onScroll);
}

/* ------------------------------------------------------------------ */
/* Texto "decodificando" ([data-scramble])                             */
/* ------------------------------------------------------------------ */
const GLYPHS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#%&*+=<>/\\_';

function scramble(el: HTMLElement) {
  const final = el.dataset.text ?? el.textContent ?? '';
  el.dataset.text = final;
  const duration = Number(el.dataset.scrambleDuration) || 900;
  const start = performance.now();

  const tick = (now: number) => {
    const p = Math.min(1, (now - start) / duration);
    const revealed = Math.floor(p * final.length);
    let out = '';
    for (let i = 0; i < final.length; i++) {
      const ch = final[i];
      out += i < revealed || ch === ' ' ? ch : GLYPHS[(Math.random() * GLYPHS.length) | 0];
    }
    el.textContent = out;
    if (p < 1) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

function initScramble() {
  if (prefersReducedMotion()) return () => {};
  const introMs = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--intro')) * 1000 || 0;

  const io = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        const el = entry.target as HTMLElement;
        io.unobserve(el);
        const delay = (Number(el.dataset.scramble) || 0) + (el.closest('#inicio') ? introMs : 0);
        setTimeout(() => scramble(el), delay);
      }
    },
    { rootMargin: '0px 0px -10% 0px' },
  );
  document.querySelectorAll<HTMLElement>('[data-scramble]').forEach((el) => io.observe(el));
  return () => io.disconnect();
}

/* ------------------------------------------------------------------ */
/* Parallax simples ([data-parallax="0.3"])                            */
/* ------------------------------------------------------------------ */
function initParallax() {
  if (prefersReducedMotion()) return () => {};
  const els = Array.from(document.querySelectorAll<HTMLElement>('[data-parallax]'));
  if (!els.length) return () => {};
  let frame = 0;
  const update = () => {
    frame = 0;
    const y = window.scrollY;
    if (y > window.innerHeight * 1.5) return; // só no topo
    for (const el of els) el.style.translate = `0 ${(y * Number(el.dataset.parallax)).toFixed(1)}px`;
  };
  const onScroll = () => {
    if (!frame) frame = requestAnimationFrame(update);
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  return () => window.removeEventListener('scroll', onScroll);
}

export function initEffects() {
  const cleanups = [initReveal(), initPointer(), initScrollProgress(), initScramble(), initParallax()];
  return () => cleanups.forEach((fn) => fn());
}
