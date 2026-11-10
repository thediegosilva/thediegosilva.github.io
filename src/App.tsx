import { useCallback, useEffect, useState } from 'react';
import { AnimatePresence, MotionConfig } from 'framer-motion';
import { Background } from './components/Background';
import { Intro } from './components/Intro';
import { KineticBand } from './components/KineticBand';
import { Navbar } from './components/Navbar';
import { initEffects } from './lib/effects';
import { Footer } from './components/Footer';
import { ProjectModal } from './components/ProjectModal';
import { PdfModal } from './components/PdfModal';
import { LoginModal } from './components/LoginModal';
import { HeroSection } from './sections/HeroSection';
import { AboutSection } from './sections/AboutSection';
import { ProjectsSection } from './sections/ProjectsSection';
import { SkillsSection } from './sections/SkillsSection';
import { SitesSection } from './sections/SitesSection';
import { ContactSection } from './sections/ContactSection';
import { Project } from './types';

export function App() {
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [pdfOpen, setPdfOpen] = useState(false);

  const openPdf = useCallback(() => setPdfOpen(true), []);
  const closePdf = useCallback(() => setPdfOpen(false), []);
  const [loginOpen, setLoginOpen] = useState(false);
  const openLogin = useCallback(() => setLoginOpen(true), []);
  const closeLogin = useCallback(() => setLoginOpen(false), []);
  const closeProject = useCallback(() => setSelectedProject(null), []);

  // Scroll reveal, spotlight, botões magnéticos e tilt (Vanilla JS)
  useEffect(() => initEffects(), []);

  return (
    <MotionConfig reducedMotion="user">
      <a href="#sobre" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[70] focus:rounded-full focus:bg-white focus:px-4 focus:py-2 focus:text-black">
        Pular para o conteúdo
      </a>

      <Intro />
      <Background />
      <Navbar onOpenPdf={openPdf} onOpenLogin={openLogin} />

      <main>
        <HeroSection onOpenPdf={openPdf} />
        <AboutSection />
        <KineticBand />
        <ProjectsSection onSelectProject={setSelectedProject} />
        <SitesSection />
        <SkillsSection />
        <ContactSection />
      </main>

      <Footer />

      <AnimatePresence>
        {selectedProject && <ProjectModal key={selectedProject.id} project={selectedProject} onClose={closeProject} />}
      </AnimatePresence>
      <AnimatePresence>{pdfOpen && <PdfModal onClose={closePdf} />}</AnimatePresence>
      <AnimatePresence>{loginOpen && <LoginModal onClose={closeLogin} />}</AnimatePresence>
    </MotionConfig>
  );
}

export default App;
