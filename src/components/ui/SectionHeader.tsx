import React from 'react';
import { Reveal } from './Reveal';
import { SplitWords } from './SplitText';

interface SectionHeaderProps {
  index: string;
  eyebrow: string;
  /** Título completo; `highlight` é o trecho final que recebe gradiente. */
  title: string;
  highlight?: string;
  description?: React.ReactNode;
  /** Conteúdo alinhado à direita no desktop (links, filtros...). */
  aside?: React.ReactNode;
}

export const SectionHeader: React.FC<SectionHeaderProps> = ({ index, eyebrow, title, highlight, description, aside }) => (
  <div className="mb-14 flex flex-col gap-8 md:mb-20 md:flex-row md:items-end md:justify-between">
    <div className="max-w-3xl">
      <Reveal>
        <p className="eyebrow">
          <span className="eyebrow-dot" />
          <span className="text-ink">{index}</span>
          <span className="text-ink-subtle">/</span>
          <span data-scramble="150">{eyebrow}</span>
        </p>
      </Reveal>
      <Reveal delay={0.05} className="reveal-words">
        <h2 className="mt-6 text-h2 font-semibold text-balance">
          <SplitWords text={title} highlight={highlight} />
        </h2>
      </Reveal>
      {description && (
        <Reveal delay={0.25}>
          <p className="mt-5 max-w-xl text-base leading-relaxed text-ink-muted text-pretty sm:text-lg">{description}</p>
        </Reveal>
      )}
    </div>
    {aside && (
      <Reveal delay={0.3} className="shrink-0">
        {aside}
      </Reveal>
    )}
  </div>
);
