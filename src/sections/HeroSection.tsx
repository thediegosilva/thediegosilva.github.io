import React from 'react';
import { ArrowDown, FileDown, Github, Linkedin, Mail } from 'lucide-react';
import { FaWhatsapp } from 'react-icons/fa';
import { personalInfo, skills, whatsappUrl } from '../data/portfolioData';
import { Reveal } from '../components/ui/Reveal';
import { SplitChars } from '../components/ui/SplitText';
import { HeroAmbient } from '../components/HeroAmbient';

interface HeroSectionProps {
  onOpenPdf: () => void;
}


/**
 * Topo do site — camadas (de trás para frente):
 *   1. Banner de fundo   -> public/assets/hero-banner.webp (+ versão -sm)
 *   2. Halo luminoso
 *   3. Foto recortada    -> public/assets/portrait.webp (fundo transparente)
 *   4. Conteúdo
 */
export const HeroSection: React.FC<HeroSectionProps> = ({ onOpenPdf }) => {
  const [firstName, ...rest] = personalInfo.name.split(' ');
  const lastName = rest.join(' ');

  return (
    <section id="inicio" className="relative isolate flex min-h-[100svh] flex-col overflow-hidden [--ph:min(40svh,23rem)] sm:[--ph:min(42svh,26rem)]">
      {/* 1. Banner */}
      <picture className="hero-banner absolute inset-0 -z-20">
        <source media="(max-width: 767px)" srcSet="./assets/hero-banner-sm.webp" />
        <img src="./assets/hero-banner.webp" alt="" className="hero-kenburns h-full w-full object-cover object-[65%_center] opacity-70 mix-blend-screen" />
      </picture>
      <HeroAmbient />
      <div className="absolute inset-0 -z-10 bg-gradient-to-r from-obsidian via-obsidian/30 to-transparent wide:via-obsidian/70" />
      <div className="absolute inset-x-0 bottom-0 -z-10 h-1/2 bg-gradient-to-t from-obsidian via-obsidian/70 to-transparent" />

      {/* 2. Halo */}
      <div className="hero-halo pointer-events-none absolute -z-10 left-1/2 top-[calc(var(--nav-h)+2rem)] -ml-[30vmin] h-[60vmin] w-[60vmin] rounded-full opacity-70 blur-[80px] wide:left-auto wide:ml-0 wide:right-[4%] wide:top-[18%] [background:conic-gradient(from_180deg,rgb(59_158_255/0.6),rgb(139_92_246/0.6),rgb(16_217_160/0.4),rgb(59_158_255/0.6))] wide-lg:right-[10%]" />

      {/* 3. Foto */}
      <img
        src="./assets/portrait.webp"
        alt={`Foto de ${personalInfo.name}`}
        width={977}
        height={869}
        className="hero-portrait mask-portrait pointer-events-none absolute -z-10 select-none w-auto max-w-none
          left-1/2 top-[var(--nav-h)] -ml-[calc(var(--ph)*0.53)] h-[var(--ph)]
          wide:left-auto wide:top-auto wide:bottom-0 wide:right-[-6%] wide:ml-0 wide:h-[min(68svh,58vw)]
          wide-lg:right-0 wide-lg:h-[min(90svh,880px)]"
      />

      {/* Varredura de energia (uma vez, na montagem) */}
      <div className="hero-scan pointer-events-none absolute inset-x-0 top-0 -z-[5] h-px" />

      {/* Cantoneiras HUD */}
      <div className="pointer-events-none absolute inset-4 -z-[5] hidden sm:block lg:inset-8" aria-hidden>
        <span className="hud hud-tl" />
        <span className="hud hud-tr" />
        <span className="hud hud-bl" />
        <span className="hud hud-br" />
      </div>

      {/* 4. Conteúdo */}
      <div className="container flex flex-1 flex-col justify-start pb-12 pt-[calc(var(--nav-h)+var(--ph)+0.75rem)] wide:justify-center wide:pb-14 wide:pt-[calc(var(--nav-h)+1.5rem)]">
        <div className="hero-copy mx-auto max-w-2xl text-center wide:mr-0 wide:ml-[clamp(0px,(100vw_-_1000px)*0.32,7.5rem)] wide:max-w-[48%] wide:text-left xl:max-w-2xl">
          <Reveal immediate delay={0.75}>
            <p className="eyebrow hero-tight">
              <span className="relative flex h-2 w-2">
                <span className="animate-pulse-ring absolute inline-flex h-full w-full rounded-full bg-neon-emerald" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-neon-emerald shadow-[0_0_10px_#10d9a0]" />
              </span>
              <span data-scramble="850">Disponível para novos projetos</span>
            </p>
          </Reveal>

          <h1 className="mt-5 whitespace-nowrap text-[clamp(2.25rem,12.5vw,5.75rem)] font-bold leading-[0.92] tracking-[-0.055em] sm:mt-7 wide:whitespace-normal wide:text-mega">
            <SplitChars text={firstName} offset={14} className="text-chrome-chars" />
            {/* Telas em pé: mesma linha · telas deitadas: quebra de linha */}
            <span className="wide:hidden"> </span>
            <br className="hidden wide:inline" />
            <SplitChars text={lastName} offset={14 + firstName.length} gradient />
          </h1>

          <Reveal immediate delay={1.25}>
            <p className="hero-tight mt-5 flex items-center justify-center gap-3 font-mono text-xs uppercase tracking-[0.2em] sm:tracking-[0.28em] text-ink-muted sm:mt-7 sm:text-[13px] wide:justify-start">
              <span className="h-px w-6 shrink-0 bg-gradient-to-r from-neon-cyan sm:w-10 to-transparent" />
              <span data-scramble="1300" data-scramble-duration="1100">
                {personalInfo.role}
              </span>
              <span className="h-px w-6 shrink-0 bg-gradient-to-l from-neon-cyan to-transparent sm:w-10 wide:hidden" />
            </p>
          </Reveal>

          <Reveal immediate delay={1.35}>
            <p className="mx-auto mt-4 max-w-lg text-[15px] leading-relaxed text-ink-muted text-pretty sm:mt-5 sm:text-lg wide:mx-0">{personalInfo.shortBio}</p>
          </Reveal>

          <Reveal immediate delay={1.45} className="mt-7 flex flex-wrap items-center justify-center gap-3 sm:mt-10 wide:justify-start">
            <a href="#projetos" className="btn-primary group" data-magnetic="0.3">
              <span>Ver projetos</span>
              <ArrowDown size={16} className="transition-transform duration-300 group-hover:translate-y-0.5" />
            </a>
            <button onClick={onOpenPdf} className="btn-glass glow-border" data-magnetic="0.3">
              <FileDown size={16} />
              <span>PDF</span>
            </button>
          </Reveal>

          <Reveal immediate delay={1.55} className="mt-7 flex items-center justify-center gap-2 sm:mt-10 wide:justify-start">
            <a href={personalInfo.social.github} target="_blank" rel="noopener noreferrer" className="icon-btn" data-magnetic="0.4" aria-label="GitHub">
              <Github size={17} />
            </a>
            <a href={personalInfo.social.linkedin} target="_blank" rel="noopener noreferrer" className="icon-btn" data-magnetic="0.4" aria-label="LinkedIn">
              <Linkedin size={17} />
            </a>
            <a href={whatsappUrl} target="_blank" rel="noopener noreferrer" className="icon-btn hover:!text-[#25D366]" data-magnetic="0.4" aria-label="WhatsApp">
              <FaWhatsapp size={17} />
            </a>
            <a href={`mailto:${personalInfo.social.email}`} className="icon-btn" data-magnetic="0.4" aria-label="E-mail">
              <Mail size={17} />
            </a>
            <span className="ml-3 hidden font-mono text-xs text-ink-subtle sm:block">Brasil · Remoto</span>
          </Reveal>
        </div>
      </div>

      {/* Marquee da stack */}
      <Reveal immediate delay={1.7} className="marquee relative border-y border-white/[0.06] bg-white/[0.02] py-5 backdrop-blur-md">
        <div className="marquee-track flex w-max gap-12 whitespace-nowrap">
          {[...skills, ...skills].map((s, i) => (
            <span key={i} className="flex items-center gap-12 font-display text-lg font-medium tracking-tight text-ink-muted">
              {s.name}
              <span className="h-1.5 w-1.5 rotate-45 bg-gradient-to-br from-electric to-neon-violet" />
            </span>
          ))}
        </div>
      </Reveal>
    </section>
  );
};
