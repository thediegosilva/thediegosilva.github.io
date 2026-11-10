import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { FileDown, Github, Linkedin, LogIn, Menu, X } from 'lucide-react';
import { personalInfo } from '../data/portfolioData';
import { useActiveSection } from '../hooks/useActiveSection';

const NAV_LINKS = [
  { label: 'Sobre', id: 'sobre' },
  { label: 'Projetos', id: 'projetos' },
  { label: 'Habilidades', id: 'habilidades' },
  { label: 'Contato', id: 'contato' },
  { label: 'Sites', id: 'sites' },
];
const SECTION_IDS = ['inicio', ...NAV_LINKS.map((l) => l.id)];

interface NavbarProps {
  onOpenPdf: () => void;
  onOpenLogin: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onOpenPdf, onOpenLogin }) => {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const active = useActiveSection(SECTION_IDS);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 768px)');
    const onChange = () => mq.matches && setOpen(false);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  return (
    <header className="fixed inset-x-0 top-0 z-50">
      {/* Progresso de rolagem */}
      <div className="scroll-progress absolute inset-x-0 top-0 h-[2px]" />

      <div className={`container transition-[padding] duration-500 ease-out-expo ${scrolled ? 'pt-3' : 'pt-5'}`}>
        <div
          className={`flex h-14 items-center justify-between rounded-full pl-2 pr-2 transition-all duration-500 ease-out-expo ${
            scrolled || open ? 'glass-strong !bg-[rgba(8,8,14,0.86)]' : 'border border-transparent'
          }`}
        >
          <a href="#inicio" className="group flex items-center gap-2.5 rounded-full py-1 pl-1 pr-3" onClick={() => setOpen(false)}>
            <span className="relative">
              <img src="./assets/logo.jpg" alt="" className="h-9 w-9 rounded-full ring-1 ring-white/15 transition-transform duration-500 ease-out-expo group-hover:scale-110" />
              <span className="absolute inset-0 rounded-full opacity-0 shadow-[0_0_20px_rgb(59_158_255/0.8)] transition-opacity duration-500 group-hover:opacity-100" />
            </span>
            <span className="whitespace-nowrap font-display text-[15px] font-semibold tracking-tight">{personalInfo.name}</span>
          </a>

          <nav className="hidden items-center gap-1 rounded-full border border-white/[0.06] bg-white/[0.02] p-1 md:flex" aria-label="Principal">
            {NAV_LINKS.map((link) => (
              <a
                key={link.id}
                href={`#${link.id}`}
                className={`relative rounded-full px-3 py-1.5 text-sm lg:px-4 transition-colors duration-300 ${
                  active === link.id ? 'text-white' : 'text-ink-subtle hover:text-ink'
                }`}
              >
                {active === link.id && (
                  <motion.span
                    layoutId="nav-pill"
                    className="absolute inset-0 rounded-full border border-white/10 bg-white/[0.08] shadow-[0_0_20px_-4px_rgb(59_158_255/0.6)]"
                    transition={{ type: 'spring', stiffness: 400, damping: 34 }}
                  />
                )}
                <span className="relative">{link.label}</span>
              </a>
            ))}
          </nav>

          <div className="hidden items-center gap-1.5 md:flex">
            <a href={personalInfo.social.github} target="_blank" rel="noopener noreferrer" className="icon-btn hidden h-10 w-10 border-transparent bg-transparent lg:inline-flex" data-magnetic="0.4" aria-label="GitHub">
              <Github size={17} />
            </a>
            <a href={personalInfo.social.linkedin} target="_blank" rel="noopener noreferrer" className="icon-btn hidden h-10 w-10 border-transparent bg-transparent lg:inline-flex" data-magnetic="0.4" aria-label="LinkedIn">
              <Linkedin size={17} />
            </a>
            <button onClick={onOpenPdf} className="btn-primary btn-sm" data-magnetic="0.25">
              <FileDown size={15} />
              <span>PDF</span>
            </button>
            <button onClick={onOpenLogin} className="btn-glass btn-sm w-10 !px-0 lg:w-auto lg:!px-4" data-magnetic="0.25" aria-label="Login da equipe">
              <LogIn size={15} />
              <span className="hidden lg:inline">Login</span>
            </button>
          </div>

          <button onClick={() => setOpen((v) => !v)} className="icon-btn h-10 w-10 md:hidden" aria-label={open ? 'Fechar menu' : 'Abrir menu'} aria-expanded={open}>
            {open ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>

        <AnimatePresence>
          {open && (
            <motion.nav
              initial={{ opacity: 0, y: -10, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.98 }}
              transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
              className="glass-strong mt-2 rounded-3xl p-3 md:hidden"
              aria-label="Menu mobile"
            >
              {NAV_LINKS.map((link, i) => (
                <motion.a
                  key={link.id}
                  href={`#${link.id}`}
                  onClick={() => setOpen(false)}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.05 * i + 0.05 }}
                  className="flex items-center justify-between rounded-2xl px-4 py-4 font-display text-xl font-medium tracking-tight hover:bg-white/[0.05]"
                >
                  {link.label}
                  <span className="font-mono text-xs text-ink-subtle">0{i + 1}</span>
                </motion.a>
              ))}
              <div className="mt-2 flex items-center gap-2 border-t border-white/[0.06] px-1 pt-3">
                <button
                  onClick={() => {
                    setOpen(false);
                    onOpenPdf();
                  }}
                  className="btn-primary flex-1"
                >
                  <FileDown size={16} />
                  <span>PDF</span>
                </button>
                <button
                  onClick={() => {
                    setOpen(false);
                    onOpenLogin();
                  }}
                  className="btn-glass flex-1"
                >
                  <LogIn size={16} />
                  <span>Login</span>
                </button>
                <a href={personalInfo.social.github} target="_blank" rel="noopener noreferrer" className="icon-btn h-12 w-12" aria-label="GitHub">
                  <Github size={18} />
                </a>
                <a href={personalInfo.social.linkedin} target="_blank" rel="noopener noreferrer" className="icon-btn h-12 w-12" aria-label="LinkedIn">
                  <Linkedin size={18} />
                </a>
              </div>
            </motion.nav>
          )}
        </AnimatePresence>
      </div>
    </header>
  );
};
