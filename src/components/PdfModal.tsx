import React from 'react';
import { Award, Code2, Download, FolderGit2, Github, Linkedin, LucideIcon, Mail, MapPin, Sparkles, Target } from 'lucide-react';
import { FaWhatsapp } from 'react-icons/fa';
import { personalInfo, pillars, projects, skills, whatsappUrl } from '../data/portfolioData';
import { Modal } from './ui/Modal';

interface PdfModalProps {
  onClose: () => void;
}

const SUMMARY =
  'Desenvolvedor Full-Stack apaixonado por transformar desafios complexos em sistemas modernos, ágeis e escaláveis. Experiência sólida no ecossistema JavaScript/TypeScript, construindo aplicações web ricas com React e backends eficientes com Node.js e Python. Familiaridade com ambiente Linux, automação de scripts, containers Docker e práticas de segurança de ponta.';

const COMPETENCIES = [
  'Desenvolvimento de SPAs e SSR de alta performance',
  'Criação de APIs RESTful estruturadas e seguras',
  'Ambiente Linux nativo, Shell Scripting e Docker',
  'UI/UX responsivo com Tailwind CSS e Design System',
];

/** Converte o nível textual em segmentos (de 5) para o medidor visual */
const levelToSegments = (level?: string) => {
  if (!level) return 3;
  if (level.includes('/')) return 4;
  if (level.startsWith('Avançado')) return 5;
  return 3;
};

const SectionTitle: React.FC<{ icon: LucideIcon; children: React.ReactNode }> = ({ icon: Icon, children }) => (
  <h3 className="mb-4 flex items-center gap-2.5 font-mono text-[11px] font-medium uppercase tracking-[0.2em] text-ink-muted">
    <span className="flex h-7 w-7 items-center justify-center rounded-lg text-neon-cyan [background:rgb(34_211_238/0.12)] print:hidden">
      <Icon size={14} />
    </span>
    {children}
    <span className="h-px flex-1 bg-gradient-to-r from-white/15 to-transparent" />
  </h3>
);

/** Documento em PDF. "Salvar em PDF" usa a impressão do navegador (só este conteúdo é impresso — ver index.css). */
export const PdfModal: React.FC<PdfModalProps> = ({ onClose }) => (
  <Modal onClose={onClose} labelledBy="pdf-title" className="max-w-5xl">
    <div className="print-area overflow-y-auto overscroll-contain">
      {/* ===== Cabeçalho ===== */}
      <header className="relative overflow-hidden border-b border-white/[0.07]">
        <div className="absolute inset-0 opacity-90 [background:radial-gradient(ellipse_at_85%_20%,rgb(139_92_246/0.45),transparent_55%),radial-gradient(ellipse_at_10%_120%,rgb(59_158_255/0.4),transparent_55%),radial-gradient(ellipse_at_60%_100%,rgb(16_217_160/0.2),transparent_50%)] print:hidden" />
        <div className="absolute inset-0 opacity-30 [background-image:linear-gradient(to_right,rgba(255,255,255,0.06)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.06)_1px,transparent_1px)] [background-size:32px_32px] [mask-image:linear-gradient(to_bottom,#000,transparent)] print:hidden" />

        <div className="pdf-head relative flex flex-col gap-8 p-7 pt-10 sm:flex-row sm:items-end sm:p-10">
          {/* Foto */}
          <div className="relative h-32 w-32 shrink-0 sm:h-40 sm:w-40">
            <div className="absolute inset-0 animate-[spin-angle_5s_linear_infinite] rounded-[2rem] shadow-[0_0_40px_-8px_rgb(139_92_246/0.8)] [background:conic-gradient(from_var(--angle),#3b9eff,#8b5cf6,#10d9a0,#22d3ee,#3b9eff)] print:hidden" />
            <div className="absolute inset-[2px] overflow-hidden rounded-[calc(2rem-2px)] bg-gradient-to-b from-[#1b1840] to-[#070712]">
              <img src="./assets/foto-pdf.webp" alt={personalInfo.name} className="h-full w-full object-cover object-[45%_30%]" />
            </div>
          </div>

          <div className="min-w-0 flex-1">
            <p className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-black/30 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.2em] text-ink-muted backdrop-blur-md">
              <span className="h-1.5 w-1.5 rounded-full bg-neon-emerald shadow-[0_0_8px_#10d9a0]" />
              Disponível para novos projetos
            </p>
            <h2 id="pdf-title" className="mt-4 font-display text-4xl font-bold tracking-tight sm:text-6xl">
              <span className="text-chrome">{personalInfo.name.split(' ')[0]} </span>
              <span className="text-gradient">{personalInfo.name.split(' ').slice(1).join(' ')}</span>
            </h2>
            <p className="mt-2 text-lg text-ink-muted">Desenvolvedor Full-Stack · Software Engineer</p>

            <ul className="mt-6 flex flex-wrap gap-2 text-[13px]">
              {[
                { icon: Mail, label: personalInfo.social.email, href: `mailto:${personalInfo.social.email}` },
                { icon: FaWhatsapp, label: personalInfo.social.whatsappLabel, href: whatsappUrl },
                { icon: Github, label: 'github.com/thediegosilva', href: personalInfo.social.github },
                { icon: Linkedin, label: 'in/thediegosilva', href: personalInfo.social.linkedin },
                { icon: MapPin, label: 'Brasil · Remoto ou presencial' },
              ].map(({ icon: Icon, label, href }) => {
                const content = (
                  <>
                    <Icon size={14} className="text-neon-cyan" />
                    {label}
                  </>
                );
                return (
                  <li key={label}>
                    {href ? (
                      <a href={href} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/30 px-3 py-1.5 backdrop-blur-md transition-colors hover:border-white/25">
                        {content}
                      </a>
                    ) : (
                      <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/30 px-3 py-1.5 backdrop-blur-md">{content}</span>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      </header>

      {/* ===== Corpo ===== */}
      <div className="pdf-body grid gap-10 p-7 sm:p-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
        {/* Coluna lateral */}
        <aside className="space-y-10">
          <section>
            <SectionTitle icon={Code2}>Stack</SectionTitle>
            <ul className="space-y-3.5">
              {skills.map((s) => {
                const filled = levelToSegments(s.level);
                return (
                  <li key={s.name}>
                    <div className="flex items-baseline justify-between gap-2 text-sm">
                      <span className="font-medium">{s.name}</span>
                      <span className="truncate font-mono text-[10px] uppercase tracking-wider text-ink-subtle">{s.level}</span>
                    </div>
                    <div className="mt-1.5 flex gap-1">
                      {Array.from({ length: 5 }, (_, k) => (
                        <span
                          key={k}
                          className="h-1.5 flex-1 rounded-full"
                          style={{
                            background: k < filled ? s.color : 'rgba(255,255,255,0.08)',
                            boxShadow: k < filled ? `0 0 8px ${s.color}66` : undefined,
                          }}
                        />
                      ))}
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>

          <section>
            <SectionTitle icon={Target}>Pilares</SectionTitle>
            <ul className="space-y-3">
              {pillars.map((p) => (
                <li key={p.title} className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-4">
                  <p className="font-semibold">{p.title}</p>
                  <p className="mt-1 text-xs leading-relaxed text-ink-subtle">{p.subtitle}</p>
                </li>
              ))}
            </ul>
          </section>
        </aside>

        {/* Coluna principal */}
        <main className="space-y-10">
          <section>
            <SectionTitle icon={Sparkles}>Resumo profissional</SectionTitle>
            <p className="text-[15px] leading-[1.8] text-ink-muted">{SUMMARY}</p>
            <blockquote className="mt-5 border-l-2 border-neon-violet pl-4 font-display text-lg font-medium text-ink">“{personalInfo.quote}”</blockquote>
          </section>

          <section>
            <SectionTitle icon={Award}>Competências</SectionTitle>
            <ul className="grid gap-3 sm:grid-cols-2">
              {COMPETENCIES.map((c, i) => (
                <li key={c} className="flex gap-3 rounded-2xl border border-white/[0.07] bg-white/[0.02] p-4 text-sm leading-relaxed text-ink-muted">
                  <span className="font-mono text-xs text-gradient">{String(i + 1).padStart(2, '0')}</span>
                  {c}
                </li>
              ))}
            </ul>
          </section>

          <section>
            <SectionTitle icon={FolderGit2}>Projetos</SectionTitle>
            <ol className="relative space-y-6 border-l border-white/10 pl-6">
              {projects.map((p, i) => (
                <li key={p.id} className="relative">
                  <span
                    className="absolute -left-[31px] top-1.5 h-2.5 w-2.5 rounded-full ring-4 ring-canvas-raised"
                    style={{ background: ['#3b9eff', '#8b5cf6', '#10d9a0', '#22d3ee'][i % 4] }}
                  />
                  <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                    <p className="font-display text-lg font-semibold">{p.title}</p>
                    {p.githubUrl && (
                      <a href={p.githubUrl} target="_blank" rel="noopener noreferrer" className="font-mono text-[11px] text-ink-subtle hover:text-ink">
                        {p.githubUrl.replace(/^https?:\/\//, '')}
                      </a>
                    )}
                  </div>
                  <p className="mt-1 text-sm leading-relaxed text-ink-muted">{p.description}</p>
                  <p className="mt-2 font-mono text-[11px] text-ink-subtle">{p.tags.join(' · ')}</p>
                </li>
              ))}
            </ol>
          </section>

          <section>
            <SectionTitle icon={Target}>Áreas de atuação</SectionTitle>
            <ul className="flex flex-wrap gap-2">
              {personalInfo.services.map((s) => (
                <li key={s.title} className="tag text-ink">
                  {s.title}
                </li>
              ))}
            </ul>
          </section>
        </main>
      </div>

      {/* ===== Ações ===== */}
      <div className="sticky bottom-0 flex items-center justify-between gap-4 border-t border-white/[0.07] bg-[rgba(8,8,14,0.9)] px-7 py-4 backdrop-blur-xl sm:px-10 print:hidden">
        <p className="hidden text-xs text-ink-subtle sm:block">Na janela que abrir, escolha “Salvar como PDF”.</p>
        <div className="flex w-full gap-2 sm:w-auto">
          <button onClick={onClose} className="btn-glass btn-sm flex-1 sm:flex-none">
            <span>Fechar</span>
          </button>
          <button onClick={() => window.print()} className="btn-primary btn-sm flex-1 sm:flex-none" data-magnetic="0.2">
            <Download size={15} />
            <span>Salvar em PDF</span>
          </button>
        </div>
      </div>
    </div>
  </Modal>
);
