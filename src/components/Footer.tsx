import React from 'react';
import { ArrowUp } from 'lucide-react';
import { personalInfo, whatsappUrl } from '../data/portfolioData';
import { DuckEgg } from './DuckEgg';

export const Footer: React.FC = () => (
  <footer className="relative overflow-hidden border-t border-white/[0.06]">
    <div className="container pt-16">
      {/* Assinatura gigante */}
      <p
        data-reveal=""
        className="select-none text-center font-display text-[clamp(3rem,15vw,13rem)] font-bold leading-[0.85] tracking-[-0.06em]"
        style={{
          backgroundImage: 'linear-gradient(180deg, rgba(255,255,255,0.14), rgba(255,255,255,0))',
          WebkitBackgroundClip: 'text',
          backgroundClip: 'text',
          color: 'transparent',
        }}
        aria-hidden
      >
        {personalInfo.name}
      </p>
      {/* Easter egg: Pato Vírus */}
      <DuckEgg />
      <div className="flex flex-col items-center justify-between gap-6 border-t border-white/[0.06] py-8 text-sm text-ink-subtle sm:flex-row">
        <p>
          © {new Date().getFullYear()} {personalInfo.name}. Todos os direitos reservados.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-3">
          <a href={personalInfo.social.github} target="_blank" rel="noopener noreferrer" className="transition-colors hover:text-white">GitHub</a>
          <a href={personalInfo.social.linkedin} target="_blank" rel="noopener noreferrer" className="transition-colors hover:text-white">LinkedIn</a>
          <a href={whatsappUrl} target="_blank" rel="noopener noreferrer" className="transition-colors hover:text-[#25D366]">WhatsApp</a>
          <a href="#inicio" className="icon-btn h-10 w-10" data-magnetic="0.4" aria-label="Voltar ao topo">
            <ArrowUp size={16} />
          </a>
        </div>
      </div>
    </div>
  </footer>
);
