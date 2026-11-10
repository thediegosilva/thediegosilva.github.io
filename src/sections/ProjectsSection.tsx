import React from 'react';
import { ArrowUpRight } from 'lucide-react';
import { personalInfo, projects } from '../data/portfolioData';
import { Project } from '../types';
import { ProjectCard } from '../components/ProjectCard';
import { Reveal } from '../components/ui/Reveal';
import { SectionHeader } from '../components/ui/SectionHeader';

interface ProjectsSectionProps {
  onSelectProject: (project: Project) => void;
}

export const ProjectsSection: React.FC<ProjectsSectionProps> = ({ onSelectProject }) => (
  <section id="projetos" className="section">
    {/* Luz ambiente da seção */}
    <div className="pointer-events-none absolute inset-x-0 top-1/4 -z-10 mx-auto h-[60%] max-w-5xl rounded-full bg-neon-violet/10 blur-[120px]" />

    <div className="container">
      <SectionHeader
        index="02"
        eyebrow="Projetos"
        title="Trabalhos selecionados"
        highlight="selecionados"
        description="Alguns dos projetos que desenvolvi e que mostram um pouco do meu trabalho."
        aside={
          <a href={personalInfo.social.github} target="_blank" rel="noopener noreferrer" className="btn-glass glow-border btn-sm group" data-magnetic="0.3">
            <span>Ver todos no GitHub</span>
            <ArrowUpRight size={16} className="arrow-nudge" />
          </a>
        }
      />

      {/* Grade de 4 compartimentos — todos usam o mesmo <ProjectCard /> */}
      <ul className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
        {projects.map((project, i) => (
          <Reveal as="li" key={project.id} delay={i * 0.1} className="h-full">
            <ProjectCard project={project} index={i} onOpen={onSelectProject} />
          </Reveal>
        ))}
      </ul>
    </div>
  </section>
);
