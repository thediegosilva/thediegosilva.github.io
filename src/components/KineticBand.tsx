import React from 'react';
import { skills } from '../data/portfolioData';

/**
 * Duas faixas gigantes inclinadas com a stack, rolando em sentidos opostos:
 * uma sólida em gradiente e outra só em contorno.
 */
export const KineticBand: React.FC = () => {
  const names = skills.map((s) => s.name);
  const row = [...names, ...names];

  return (
    <div className="relative -my-10 overflow-hidden py-16 sm:-my-16 sm:py-24" aria-hidden>
      <div className="-rotate-[4deg] scale-110 border-y border-white/10 bg-gradient-to-r from-electric/[0.12] via-neon-violet/[0.15] to-neon-emerald/[0.12] py-4 backdrop-blur-sm sm:py-6">
        <div className="kinetic-row flex w-max items-center gap-10 whitespace-nowrap">
          {row.map((name, i) => (
            <span key={i} className="flex items-center gap-10 font-display text-4xl font-extrabold uppercase tracking-tight sm:text-7xl">
              <span className="text-gradient">{name}</span>
              <span className="text-2xl text-neon-cyan sm:text-4xl">✦</span>
            </span>
          ))}
        </div>
      </div>
      <div className="mt-3 rotate-[2deg] scale-110 py-2 sm:mt-5">
        <div className="kinetic-row reverse flex w-max items-center gap-10 whitespace-nowrap">
          {row.map((name, i) => (
            <span key={i} className="flex items-center gap-10 font-display text-4xl font-extrabold uppercase tracking-tight sm:text-7xl">
              <span className="kinetic-outline">{name}</span>
              <span className="h-3 w-3 rotate-45 bg-gradient-to-br from-electric to-neon-violet sm:h-4 sm:w-4" />
            </span>
          ))}
        </div>
      </div>
    </div>
  );
};
