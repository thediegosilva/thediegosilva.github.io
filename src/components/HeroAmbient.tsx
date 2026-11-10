import React from 'react';

/** Pseudo-aleatório determinístico (mesmo resultado a cada render) */
const rand = (seed: number) => {
  const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};

const BEAMS = Array.from({ length: 9 }, (_, i) => ({
  left: `${38 + rand(i) * 60}%`,
  height: `${18 + rand(i + 20) * 30}%`,
  duration: `${4 + rand(i + 40) * 5}s`,
  delay: `${-rand(i + 60) * 8}s`,
  hue: i % 3,
}));

const EMBERS = Array.from({ length: 26 }, (_, i) => ({
  left: `${rand(i + 100) * 100}%`,
  size: `${2 + rand(i + 130) * 3}px`,
  duration: `${9 + rand(i + 160) * 10}s`,
  delay: `${-rand(i + 190) * 18}s`,
  drift: `${(rand(i + 220) - 0.5) * 120}px`,
  hue: i % 3,
}));

const COLORS = ['34 211 238', '139 92 246', '16 217 160'];

/**
 * Vida no fundo do topo (só CSS, sem custo de JS por frame):
 * feixes de dados subindo, partículas de energia e um pulso de brilho.
 */
export const HeroAmbient: React.FC = () => (
  <div className="hero-ambient pointer-events-none absolute inset-0 -z-[15] overflow-hidden" aria-hidden>
    <div className="hero-breath absolute inset-0" />
    {BEAMS.map((b, i) => (
      <span
        key={`b${i}`}
        className="hero-beam absolute bottom-0 w-px"
        style={{ left: b.left, height: b.height, animationDuration: b.duration, animationDelay: b.delay, '--c': COLORS[b.hue] } as React.CSSProperties}
      />
    ))}
    {EMBERS.map((e, i) => (
      <span
        key={`e${i}`}
        className="hero-ember absolute bottom-0 rounded-full"
        style={
          {
            left: e.left,
            width: e.size,
            height: e.size,
            animationDuration: e.duration,
            animationDelay: e.delay,
            '--drift': e.drift,
            '--c': COLORS[e.hue],
          } as React.CSSProperties
        }
      />
    ))}
  </div>
);
