import React, { useState } from 'react';
import { ArrowUpRight, Github } from 'lucide-react';
import { Project } from '../types';

interface ProjectCardProps {
  project: Project;
  index: number;
  onOpen: (project: Project) => void;
}

/** Cor de destaque de cada compartimento (RGB, usada via CSS var --spot) */
const ACCENTS = ['59 158 255', '139 92 246', '16 217 160', '34 211 238'];

/** "~/repo" a partir da URL do projeto */
const repoPath = (url?: string) => `~/${url ? url.replace(/\/+$/, '').split('/').pop() : 'projeto'}`;

/**
 * Card de projeto — estrutura ÚNICA para todos os compartimentos.
 * Para adicionar/alterar um projeto basta editar `projects` em src/data/portfolioData.ts.
 */
export const ProjectCard: React.FC<ProjectCardProps> = ({ project, index, onOpen }) => {
  const number = String(index + 1).padStart(2, '0');
  const accent = ACCENTS[index % ACCENTS.length];

  return (
    <article
      data-tilt
      data-spotlight
      style={{ '--spot': accent } as React.CSSProperties}
      className="glass glow-border spotlight group flex h-full flex-col rounded-[1.75rem] p-2 hover:shadow-[0_30px_80px_-30px_rgb(var(--spot)/0.55)]"
    >
      {/* Janela / preview */}
      <button
        type="button"
        onClick={() => onOpen(project)}
        className="relative block overflow-hidden rounded-[1.35rem] border border-white/[0.07] bg-black/40 text-left"
        aria-label={`Ver detalhes de ${project.title}`}
      >
        {/* Barra de janela */}
        <span className="flex items-center gap-3 border-b border-white/[0.06] bg-white/[0.025] px-3.5 py-2.5">
          <span className="flex gap-1.5">
            <span className="h-2 w-2 rounded-full bg-[#ff5f57]/80 transition-colors duration-500 group-hover:bg-[#ff5f57]" />
            <span className="h-2 w-2 rounded-full bg-[#febc2e]/80 transition-colors duration-500 group-hover:bg-[#febc2e]" />
            <span className="h-2 w-2 rounded-full bg-[#28c840]/80 transition-colors duration-500 group-hover:bg-[#28c840]" />
          </span>
          <span className="flex min-w-0 flex-1 items-center justify-center rounded-md bg-white/[0.04] px-2 py-1 font-mono text-[10px] text-ink-subtle">
            <span className="truncate">{repoPath(project.githubUrl)}</span>
          </span>
          <span className="font-mono text-[10px] text-ink-subtle">{number}</span>
        </span>

        <span className="relative block aspect-[16/10] overflow-hidden">
          <ProjectCover project={project} />
        </span>
      </button>

      {/* Corpo */}
      <div className="relative z-[1] flex flex-1 flex-col px-4 pb-4 pt-6 sm:px-5">
        <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-ink-subtle">
          <span style={{ color: `rgb(${accent})` }}>●</span> Projeto {number}
        </p>

        <h3 className="mt-3 text-2xl font-semibold tracking-tight">
          <button type="button" onClick={() => onOpen(project)} className="text-left transition-colors duration-300 hover:text-white">
            {project.title}
          </button>
        </h3>

        <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-ink-muted">{project.description}</p>

        <ul className="mt-6 flex flex-wrap gap-1.5" aria-label="Tecnologias">
          {project.tags.map((tag) => (
            <li key={tag} className="tag border-[rgb(var(--spot)/0.28)] text-ink/90 [background:rgb(var(--spot)/0.08)] group-hover:border-[rgb(var(--spot)/0.55)]">
              {tag}
            </li>
          ))}
        </ul>

        <div className="mt-auto flex items-center justify-between gap-3 pt-7">
          <button
            type="button"
            onClick={() => onOpen(project)}
            data-magnetic="0.2"
            className="group/btn inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] py-2 pl-4 pr-3 text-sm font-medium text-ink transition-[border-color,background-color,box-shadow,transform] duration-500 ease-out-expo hover:border-white/25 hover:bg-white/[0.08] hover:shadow-[0_0_30px_-6px_rgb(var(--spot)/0.8)]"
          >
            Ver detalhes
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white/10 transition-transform duration-500 ease-out-expo group-hover/btn:rotate-45">
              <ArrowUpRight size={14} />
            </span>
          </button>

          {project.githubUrl && (
            <a
              href={project.githubUrl}
              target="_blank"
              rel="noopener noreferrer"
              data-magnetic="0.35"
              className="icon-btn h-10 w-10"
              aria-label={`Repositório de ${project.title} no GitHub`}
              title="Ver no GitHub"
            >
              <Github size={16} />
            </a>
          )}
        </div>
      </div>
    </article>
  );
};

/** Screenshot do projeto; sem imagem (ou se falhar), gera uma capa holográfica. */
const ProjectCover: React.FC<{ project: Project }> = ({ project }) => {
  const [failed, setFailed] = useState(false);

  if (project.image && !failed) {
    return (
      <>
        <img
          src={project.image}
          alt={`Captura de tela do projeto ${project.title}`}
          loading="lazy"
          decoding="async"
          onError={() => setFailed(true)}
          className="h-full w-full object-cover object-top transition-transform duration-[1.2s] ease-out-expo group-hover:scale-[1.06]"
        />
        <span className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
        <span className="pointer-events-none absolute inset-0 opacity-0 mix-blend-overlay transition-opacity duration-700 group-hover:opacity-100 [background:linear-gradient(120deg,transparent_30%,rgb(var(--spot)/0.45),transparent_70%)]" />
      </>
    );
  }

  return (
    <span className="absolute inset-0 flex items-center justify-center overflow-hidden bg-[#05050a]" aria-hidden>
      {/* Malha de gradiente */}
      <span className="absolute -left-1/4 -top-1/2 h-[150%] w-[80%] rounded-full opacity-60 blur-3xl transition-transform duration-[1.5s] ease-out-expo group-hover:translate-x-1/4 [background:radial-gradient(circle,rgb(var(--spot)/0.55),transparent_60%)]" />
      <span className="absolute -bottom-1/2 -right-1/4 h-[120%] w-[70%] rounded-full opacity-40 blur-3xl [background:radial-gradient(circle,rgb(139_92_246/0.5),transparent_60%)]" />
      {/* Grid */}
      <span className="absolute inset-0 opacity-40 [background-image:linear-gradient(to_right,rgba(255,255,255,0.07)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.07)_1px,transparent_1px)] [background-size:28px_28px] [mask-image:radial-gradient(ellipse_at_center,#000_20%,transparent_75%)]" />
      {/* Órbitas */}
      <span className="absolute h-44 w-44 animate-[spin_18s_linear_infinite] rounded-full border border-dashed border-white/10" />
      <span className="absolute h-28 w-28 animate-[spin_12s_linear_infinite_reverse] rounded-full border border-white/10">
        <span className="absolute -top-1 left-1/2 h-2 w-2 -translate-x-1/2 rounded-full bg-[rgb(var(--spot))] shadow-[0_0_14px_rgb(var(--spot))]" />
      </span>
      {/* Monograma */}
      <span className="text-chrome relative font-display text-6xl font-semibold tracking-tighter transition-transform duration-700 ease-out-expo group-hover:scale-110">
        {project.title.charAt(0)}
      </span>
      {/* Scanline */}
      <span className="pointer-events-none absolute inset-x-0 top-0 h-1/3 -translate-y-full bg-gradient-to-b from-transparent via-white/[0.06] to-transparent transition-transform duration-[1.4s] ease-out-expo group-hover:translate-y-[300%]" />
    </span>
  );
};
