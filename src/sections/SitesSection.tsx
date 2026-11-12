import React from 'react';
import { ArrowUpRight, Dumbbell, Globe, Hammer, IceCreamCone, LucideIcon, Pizza, ShoppingBag } from 'lucide-react';
import { sites } from '../data/portfolioData';
import { Site } from '../types';
import { Reveal } from '../components/ui/Reveal';
import { SectionHeader } from '../components/ui/SectionHeader';

const ICONS: Record<string, LucideIcon> = {
  'ice-cream': IceCreamCone,
  pizza: Pizza,
  dumbbell: Dumbbell,
  'shopping-bag': ShoppingBag,
};

/** Cor de cada vaga (RGB para as CSS vars) */
const ACCENTS: Record<string, string> = {
  sorveteria: '247 56 121',
  pizzaria: '255 112 67',
  academia: '16 217 160',
  ecommerce: '217 70 239',
};

const host = (url: string) => url.replace(/^https?:\/\//, '').replace(/\/$/, '');

export const SitesSection: React.FC = () => (
  <section id="sites" className="section">
    <div className="pointer-events-none absolute inset-x-0 top-1/3 -z-10 mx-auto h-1/2 max-w-5xl rounded-full bg-neon-pink/10 blur-[130px]" />

    <div className="container">
      <SectionHeader
        index="03"
        eyebrow="Sites"
        title="Sites sob medida para negócios reais"
        highlight="negócios reais"
        description="Sites desenvolvidos para segmentos diferentes, cada um com identidade própria. Novos sites chegam em breve."
      />

      <ul className="grid gap-6 md:grid-cols-3">
        {sites.map((site, i) => (
          <Reveal as="li" key={site.id} delay={i * 0.12} className="h-full">
            <SiteCard site={site} accent={ACCENTS[site.id] ?? '59 158 255'} />
          </Reveal>
        ))}
      </ul>
    </div>
  </section>
);

const SiteCard: React.FC<{ site: Site; accent: string }> = ({ site, accent }) => {
  const Icon = ICONS[site.icon] ?? Globe;
  const live = Boolean(site.url);

  return (
    <article
      data-tilt
      data-spotlight
      style={{ '--spot': accent } as React.CSSProperties}
      className="glass glow-border spotlight group flex h-full flex-col rounded-[1.75rem] p-2 hover:shadow-[0_30px_80px_-30px_rgb(var(--spot)/0.6)]"
    >
      {/* Navegador */}
      <div className="relative overflow-hidden rounded-[1.35rem] border border-white/[0.07] bg-black/50">
        <div className="flex items-center gap-3 border-b border-white/[0.06] bg-white/[0.025] px-3.5 py-2.5">
          <span className="flex gap-1.5">
            <span className="h-2 w-2 rounded-full bg-[#ff5f57]/80" />
            <span className="h-2 w-2 rounded-full bg-[#febc2e]/80" />
            <span className="h-2 w-2 rounded-full bg-[#28c840]/80" />
          </span>
          <span className="flex min-w-0 flex-1 items-center justify-center gap-1.5 rounded-md bg-white/[0.04] px-2 py-1 font-mono text-[10px] text-ink-subtle">
            <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[rgb(var(--spot))] shadow-[0_0_6px_rgb(var(--spot))]" />
            <span className="truncate">{live ? host(site.url!) : `${site.id}.site`}</span>
          </span>
        </div>

        <div className="relative aspect-[16/11] overflow-hidden">
          {site.image ? (
            <img src={site.image} alt={`Prévia do site ${site.title}`} loading="lazy" className="h-full w-full object-cover object-top transition-transform duration-[1.2s] ease-out-expo group-hover:scale-105" />
          ) : (
            <>
              {/* Esqueleto do site "em construção" */}
              <div className="absolute inset-0 p-4 opacity-70">
                <div className="flex items-center justify-between">
                  <span className="h-2.5 w-14 rounded-full bg-white/10" />
                  <span className="flex gap-1.5">
                    <span className="h-2 w-6 rounded-full bg-white/[0.07]" />
                    <span className="h-2 w-6 rounded-full bg-white/[0.07]" />
                    <span className="h-2 w-6 rounded-full bg-[rgb(var(--spot)/0.4)]" />
                  </span>
                </div>
                <div className="mt-4 h-[42%] rounded-xl [background:linear-gradient(135deg,rgb(var(--spot)/0.28),rgba(255,255,255,0.03))]" />
                <div className="mt-3 grid grid-cols-3 gap-2">
                  <span className="h-10 rounded-lg bg-white/[0.06]" />
                  <span className="h-10 rounded-lg bg-white/[0.06]" />
                  <span className="h-10 rounded-lg bg-white/[0.06]" />
                </div>
              </div>
              <span className="skeleton-shine absolute inset-0" />

              {/* Ícone central */}
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="absolute h-24 w-24 animate-pulse-ring rounded-full border border-[rgb(var(--spot)/0.6)]" />
                <span className="relative flex h-20 w-20 items-center justify-center rounded-3xl border border-[rgb(var(--spot)/0.5)] text-[rgb(var(--spot))] shadow-[0_0_40px_-6px_rgb(var(--spot)/0.9)] backdrop-blur-md transition-transform duration-700 ease-out-expo [background:rgb(var(--spot)/0.15)] group-hover:rotate-6 group-hover:scale-110">
                  <Icon size={34} />
                </span>
              </div>

              {/* Progresso indeterminado */}
              <span className="absolute inset-x-0 bottom-0 h-0.5 overflow-hidden bg-white/5">
                <span className="build-bar absolute inset-y-0 w-1/3 bg-[rgb(var(--spot))] shadow-[0_0_10px_rgb(var(--spot))]" />
              </span>
            </>
          )}
        </div>
      </div>

      {/* Corpo */}
      <div className="relative z-[1] flex flex-1 flex-col px-4 pb-4 pt-6 sm:px-5">
        <div className="flex items-center justify-between gap-3">
          <span className="tag border-[rgb(var(--spot)/0.35)] text-ink [background:rgb(var(--spot)/0.1)]">{site.segment}</span>
          {!live && (
            <span className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.18em] text-[rgb(var(--spot))]">
              <Hammer size={12} /> Em breve
            </span>
          )}
        </div>
        <h3 className="mt-4 text-2xl font-semibold tracking-tight">{site.title}</h3>
        <p className="mt-2 text-sm leading-relaxed text-ink-muted">{site.description}</p>

        <div className="mt-auto pt-7">
          {live ? (
            <a href={site.url} target="_blank" rel="noopener noreferrer" className="btn-primary btn-sm group w-full" data-magnetic="0.15">
              <span>Visitar site</span>
              <ArrowUpRight size={15} className="arrow-nudge" />
            </a>
          ) : (
            <span className="flex h-10 w-full items-center justify-center gap-2 rounded-full border border-dashed border-[rgb(var(--spot)/0.4)] text-[13px] font-medium text-ink-muted">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[rgb(var(--spot))]" />
              Em construção
            </span>
          )}
        </div>
      </div>
    </article>
  );
};
