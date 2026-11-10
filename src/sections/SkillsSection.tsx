import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { IconType } from 'react-icons';
import { SiCss, SiDocker, SiGit, SiHtml5, SiJavascript, SiLinux, SiNodedotjs, SiPython, SiReact, SiTypescript } from 'react-icons/si';
import { Terminal } from 'lucide-react';
import { skills } from '../data/portfolioData';
import { Skill } from '../types';
import { SectionHeader } from '../components/ui/SectionHeader';
import { Reveal } from '../components/ui/Reveal';

const ICONS: Record<string, IconType> = {
  html: SiHtml5,
  css: SiCss,
  js: SiJavascript,
  ts: SiTypescript,
  react: SiReact,
  node: SiNodedotjs,
  python: SiPython,
  linux: SiLinux,
  git: SiGit,
  docker: SiDocker,
};

type Filter = 'all' | 'frontend' | 'backend' | 'tools';

const FILTERS: { id: Filter; label: string }[] = [
  { id: 'all', label: 'Todas' },
  { id: 'frontend', label: 'Front-end' },
  { id: 'backend', label: 'Back-end' },
  { id: 'tools', label: 'DevOps & CLI' },
];

const matches = (skill: Skill, filter: Filter) =>
  filter === 'all' || skill.category === filter || (filter === 'tools' && skill.category === 'devops');

/** "#61DAFB" -> "97 218 251" (formato usado pelas CSS vars) */
const hexToRgb = (hex: string) => {
  const n = parseInt(hex.replace('#', ''), 16);
  return `${(n >> 16) & 255} ${(n >> 8) & 255} ${n & 255}`;
};

export const SkillsSection: React.FC = () => {
  const [filter, setFilter] = useState<Filter>('all');

  return (
    <section id="habilidades" className="section">
      <div className="container">
        <SectionHeader
          index="04"
          eyebrow="Stack"
          title="Ferramentas do dia a dia"
          highlight="dia a dia"
          description="Tecnologias que uso para construir aplicações completas — da interface à infraestrutura."
          aside={
            <div role="tablist" aria-label="Filtrar habilidades" className="glass flex max-w-full gap-1 overflow-x-auto rounded-full p-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {FILTERS.map((f) => (
                <button
                  key={f.id}
                  role="tab"
                  aria-selected={filter === f.id}
                  onClick={() => setFilter(f.id)}
                  className={`relative whitespace-nowrap rounded-full px-4 py-2 text-[13px] font-medium transition-colors duration-300 ${
                    filter === f.id ? 'text-white' : 'text-ink-subtle hover:text-ink'
                  }`}
                >
                  {filter === f.id && (
                    <motion.span
                      layoutId="skill-filter"
                      className="absolute inset-0 rounded-full [background:var(--grad-brand)] shadow-[0_0_24px_-4px_rgb(139_92_246/0.8)]"
                      transition={{ type: 'spring', stiffness: 420, damping: 36 }}
                    />
                  )}
                  <span className="relative">{f.label}</span>
                </button>
              ))}
            </div>
          }
        />

        <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {skills.map((skill, i) => {
            const Icon = ICONS[skill.icon] ?? Terminal;
            const on = matches(skill, filter);
            return (
              <Reveal as="li" key={skill.name} delay={i * 0.04}>
                <div
                  data-spotlight
                  style={{ '--spot': hexToRgb(skill.color) } as React.CSSProperties}
                  className={`glass spotlight group relative flex h-full flex-col gap-8 overflow-hidden rounded-[1.5rem] p-5 transition-all duration-500 ease-out-expo [background:linear-gradient(160deg,rgb(var(--spot)/0.12),rgba(255,255,255,0.015)_55%)] hover:-translate-y-1.5 hover:border-[rgb(var(--spot)/0.5)] hover:shadow-[0_20px_50px_-20px_rgb(var(--spot)/0.6)] ${
                    on ? '' : 'pointer-events-none scale-[0.97] opacity-25 grayscale'
                  }`}
                >
                  <span className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-[rgb(var(--spot)/0.3)] opacity-60 blur-2xl transition-opacity duration-500 group-hover:opacity-100" />
                  <Icon
                    size={34}
                    className="relative z-[1] text-[rgb(var(--spot))] drop-shadow-[0_0_10px_rgb(var(--spot)/0.55)] transition-all duration-500 ease-out-expo group-hover:-rotate-6 group-hover:scale-125 group-hover:drop-shadow-[0_0_18px_rgb(var(--spot)/0.9)]"
                    aria-hidden
                  />
                  <div className="relative z-[1]">
                    <p className="font-display font-semibold tracking-tight">{skill.name}</p>
                    <p className="mt-1 font-mono text-[10px] uppercase tracking-wider text-ink-subtle">{skill.level}</p>
                  </div>
                </div>
              </Reveal>
            );
          })}
        </ul>
      </div>
    </section>
  );
};
