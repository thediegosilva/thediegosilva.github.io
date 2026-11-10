import React from 'react';
import { ArrowUpRight, Check, Github } from 'lucide-react';
import { Project } from '../types';
import { Modal } from './ui/Modal';

interface ProjectModalProps {
  project: Project;
  onClose: () => void;
}

export const ProjectModal: React.FC<ProjectModalProps> = ({ project, onClose }) => {
  const hasLiveUrl = project.liveUrl && !project.liveUrl.startsWith('#') && project.liveUrl !== project.githubUrl;

  return (
    <Modal onClose={onClose} labelledBy="project-title" className="max-w-2xl">
      <div className="overflow-y-auto overscroll-contain">
        {project.image && (
          <img
            src={project.image}
            alt=""
            className="aspect-[16/9] w-full border-b border-line object-cover object-top"
            onError={(e) => (e.currentTarget.style.display = 'none')}
          />
        )}

        <div className="p-6 sm:p-10">
          <p className="eyebrow"><span className="eyebrow-dot" />Projeto</p>
          <h3 id="project-title" className="mt-5 pr-10 text-4xl font-semibold tracking-tight">
            {project.title}
          </h3>
          <p className="mt-4 leading-relaxed text-ink-muted text-pretty">{project.longDescription || project.description}</p>

          {project.highlights && project.highlights.length > 0 && (
            <div className="mt-8">
              <h4 className="font-mono text-[11px] uppercase tracking-[0.18em] text-ink-subtle">Destaques</h4>
              <ul className="mt-4 grid gap-x-6 gap-y-3 sm:grid-cols-2">
                {project.highlights.map((h) => (
                  <li key={h} className="flex items-start gap-2.5 text-sm text-ink-muted">
                    <Check size={16} className="mt-0.5 shrink-0 text-neon-emerald" />
                    {h}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="mt-8">
            <h4 className="font-mono text-[11px] uppercase tracking-[0.18em] text-ink-subtle">Stack</h4>
            <ul className="mt-4 flex flex-wrap gap-1.5">
              {project.tags.map((t) => (
                <li key={t} className="tag">
                  {t}
                </li>
              ))}
            </ul>
          </div>

          <div className="mt-10 flex flex-wrap gap-3 border-t border-line pt-6">
            {project.githubUrl && (
              <a href={project.githubUrl} target="_blank" rel="noopener noreferrer" className="btn-primary group">
                <Github size={16} />
                <span>Ver repositório</span>
                <ArrowUpRight size={15} className="arrow-nudge" />
              </a>
            )}
            {hasLiveUrl && (
              <a href={project.liveUrl} target="_blank" rel="noopener noreferrer" className="btn-glass glow-border group">
                <span>Demonstração</span>
                <ArrowUpRight size={15} className="arrow-nudge" />
              </a>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
};
