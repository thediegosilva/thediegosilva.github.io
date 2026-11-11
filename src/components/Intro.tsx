import React, { useEffect, useRef, useState } from 'react';
import { personalInfo } from '../data/portfolioData';

const DURATION = 1250; // contagem 0 -> 100 (ms); as metades se abrem logo depois (ver index.css)

/**
 * Abertura: contador + nome se montando, depois a tela se abre ao meio.
 * Só aparece quando o script do index.html adiciona a classe `has-intro`.
 * Clique em qualquer lugar para pular.
 */
export const Intro: React.FC = () => {
  const [visible, setVisible] = useState(
    () => typeof document !== 'undefined' && document.documentElement.classList.contains('has-intro'),
  );
  const counterRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!visible) return;
    document.body.style.overflow = 'hidden';
    const start = performance.now();
    let raf = 0;

    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / DURATION);
      const eased = 1 - Math.pow(1 - p, 3);
      if (counterRef.current) counterRef.current.textContent = String(Math.round(eased * 100)).padStart(3, '0');
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    const done = window.setTimeout(() => finish(), DURATION + 1000);
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(done);
      document.body.style.overflow = '';
    };
  }, [visible]);

  const finish = () => {
    document.documentElement.classList.remove('has-intro');
    document.body.style.overflow = '';
    setVisible(false);
  };

  if (!visible) return null;

  const letters = personalInfo.name.toUpperCase().split('');

  return (
    <div className="intro fixed inset-0 z-[100] cursor-pointer" onClick={finish} aria-hidden>
      <div className="intro-half intro-top" />
      <div className="intro-half intro-bottom" />

      <div className="intro-center absolute inset-0 flex flex-col items-center justify-center gap-6">
        <p className="flex font-display text-3xl font-bold tracking-[0.25em] sm:text-5xl">
          {letters.map((ch, i) => (
            <span key={i} className="intro-char" style={{ '--i': i } as React.CSSProperties}>
              {ch === ' ' ? ' ' : ch}
            </span>
          ))}
        </p>
        <div className="flex w-56 items-center gap-4 sm:w-72">
          <span className="relative h-px flex-1 overflow-hidden bg-white/10">
            <span className="intro-bar absolute inset-0" />
          </span>
          <span ref={counterRef} className="w-10 text-right font-mono text-xs tabular-nums text-ink-muted">
            000
          </span>
        </div>
        <p className="font-mono text-[10px] uppercase tracking-[0.4em] text-ink-subtle">Portfolio · {new Date().getFullYear()}</p>
      </div>
    </div>
  );
};
