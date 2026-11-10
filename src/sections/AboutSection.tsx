import React from 'react';
import { Cloud, Cpu, Database, Dumbbell, Globe2, Laptop, Layers, Lock, Quote, ShieldCheck } from 'lucide-react';
import { personalInfo, pillars } from '../data/portfolioData';
import { Reveal } from '../components/ui/Reveal';
import { SectionHeader } from '../components/ui/SectionHeader';

type IconComponent = React.ComponentType<{ size?: number | string; className?: string }>;

const CrossIcon: IconComponent = ({ size = 20, className }) => (
  <svg width={size} height={size} className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" aria-hidden>
    <path d="M12 3v18M7 8h10" />
  </svg>
);

const PILLAR_ICONS: Record<string, IconComponent> = { cross: CrossIcon, dumbbell: Dumbbell, laptop: Laptop, shield: Lock };
const SERVICE_ICONS = [Globe2, Layers, Database, Cloud, Cpu, ShieldCheck];
const SPOTS = ['59 158 255', '139 92 246', '16 217 160', '34 211 238'];

export const AboutSection: React.FC = () => (
  <section id="sobre" className="section">
    <div className="container">
      <SectionHeader
        index="01"
        eyebrow="Sobre mim"
        title="Código limpo, interfaces claras e foco em problemas reais."
        highlight="foco em problemas reais."
      />

      <div className="grid gap-6 lg:grid-cols-12">
        {/* Biografia */}
        <Reveal className="lg:col-span-7">
          <div data-spotlight className="glass spotlight h-full rounded-[1.75rem] p-7 sm:p-10">
            <div className="relative z-[1] space-y-5 text-[17px] leading-[1.8] text-ink-muted">
              {personalInfo.fullBio.map((p, i) => (
                <p key={i} className={`text-pretty text-ink ${i === 0 ? 'text-lg sm:text-xl sm:leading-[1.7]' : ''}`}>
                  {p}
                </p>
              ))}
            </div>
            <figure className="relative z-[1] mt-10 flex gap-4 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5">
              <Quote size={20} className="shrink-0 text-neon-violet" />
              <blockquote className="font-display text-lg font-medium leading-snug text-ink">{personalInfo.quote}</blockquote>
            </figure>
          </div>
        </Reveal>

        {/* Pilares */}
        <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:col-span-5">
          {pillars.map((pillar, i) => {
            const Icon = PILLAR_ICONS[pillar.iconName] ?? Lock;
            return (
              <Reveal as="li" key={pillar.title} delay={0.08 * i}>
                <div
                  data-spotlight
                  style={{ '--spot': SPOTS[i % SPOTS.length] } as React.CSSProperties}
                  className="glass glow-border spotlight group h-full rounded-[1.5rem] p-6 transition-transform duration-500 ease-out-expo hover:-translate-y-1.5"
                >
                  <span className="relative z-[1] flex h-11 w-11 items-center justify-center rounded-2xl border border-[rgb(var(--spot)/0.4)] text-[rgb(var(--spot))] shadow-[0_0_20px_-4px_rgb(var(--spot)/0.7)] transition-all duration-500 [background:rgb(var(--spot)/0.12)] group-hover:scale-110 group-hover:text-white group-hover:[background:rgb(var(--spot)/0.35)]">
                    <Icon size={20} />
                  </span>
                  <h3 className="relative z-[1] mt-6 text-lg font-semibold tracking-tight">{pillar.title}</h3>
                  <p className="relative z-[1] mt-1.5 text-sm leading-relaxed text-ink-subtle">{pillar.subtitle}</p>
                </div>
              </Reveal>
            );
          })}
        </ul>
      </div>

      {/* Áreas de atuação */}
      <Reveal className="mt-24">
        <p className="eyebrow">
          <span className="eyebrow-dot" />
          Áreas de atuação
        </p>
      </Reveal>
      <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {personalInfo.services.map((service, i) => {
          const Icon = SERVICE_ICONS[i % SERVICE_ICONS.length];
          return (
            <Reveal as="li" key={service.title} delay={i * 0.06}>
              <div
                data-spotlight
                style={{ '--spot': SPOTS[i % SPOTS.length] } as React.CSSProperties}
                className="glass spotlight group flex h-full items-start gap-4 rounded-[1.5rem] p-6 transition-[transform,border-color] duration-500 ease-out-expo hover:-translate-y-1 hover:border-white/15"
              >
                <span className="relative z-[1] flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-[rgb(var(--spot))] ring-1 ring-[rgb(var(--spot)/0.4)] shadow-[0_0_18px_-4px_rgb(var(--spot)/0.7)] transition-all duration-500 [background:rgb(var(--spot)/0.12)] group-hover:scale-110">
                  <Icon size={18} />
                </span>
                <div className="relative z-[1]">
                  <h3 className="font-semibold tracking-tight">{service.title}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-ink-subtle">{service.desc}</p>
                </div>
              </div>
            </Reveal>
          );
        })}
      </ul>
    </div>
  </section>
);
