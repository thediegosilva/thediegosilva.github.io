import React, { useState } from 'react';
import { ArrowUpRight, Check, Copy, Github, Linkedin, Mail, Send } from 'lucide-react';
import { FaWhatsapp } from 'react-icons/fa';
import { personalInfo, whatsappUrl } from '../data/portfolioData';
import { Reveal } from '../components/ui/Reveal';
import { SplitWords } from '../components/ui/SplitText';

const CHANNELS = [
  { label: 'WhatsApp', value: personalInfo.social.whatsappLabel, href: whatsappUrl, icon: FaWhatsapp, spot: '37 211 102' },
  { label: 'LinkedIn', value: 'in/thediegosilva', href: personalInfo.social.linkedin, icon: Linkedin, spot: '59 158 255' },
  { label: 'GitHub', value: '@thediegosilva', href: personalInfo.social.github, icon: Github, spot: '139 92 246' },
];

/**
 * Formulário 100% estático (compatível com GitHub Pages): ao enviar, abre o
 * aplicativo de e-mail do visitante com assunto e mensagem já preenchidos.
 */
export const ContactSection: React.FC = () => {
  const [form, setForm] = useState({ name: '', email: '', message: '' });
  const [copied, setCopied] = useState(false);

  const update = (field: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [field]: e.target.value }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const subject = `Contato pelo portfólio — ${form.name}`;
    const body = `${form.message}\n\n—\n${form.name}\n${form.email}`;
    window.location.href = `mailto:${personalInfo.social.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };

  const copyEmail = async () => {
    try {
      await navigator.clipboard.writeText(personalInfo.social.email);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      window.location.href = `mailto:${personalInfo.social.email}`;
    }
  };

  return (
    <section id="contato" className="section">
      <div className="pointer-events-none absolute inset-x-0 bottom-0 -z-10 mx-auto h-2/3 max-w-4xl rounded-full bg-electric/10 blur-[130px]" />

      <div className="container">
        <div className="grid gap-10 lg:grid-cols-12 lg:gap-14">
          {/* Texto e canais */}
          <div className="min-w-0 lg:col-span-5">
            <Reveal>
              <p className="eyebrow">
                <span className="eyebrow-dot" />
                <span className="text-ink">05</span>
                <span className="text-ink-subtle">/</span>
                <span data-scramble="150">Contato</span>
              </p>
            </Reveal>
            <Reveal delay={0.05} className="reveal-words">
              <h2 className="mt-6 text-h2 font-semibold">
                <SplitWords text="Vamos conversar?" highlight="conversar?" />
              </h2>
            </Reveal>
            <Reveal delay={0.16}>
              <p className="mt-6 max-w-md text-lg leading-relaxed text-ink-muted text-pretty">
                Se você tem um projeto em mente, uma oportunidade ou apenas quer trocar uma ideia sobre tecnologia, fique à vontade para entrar em contato.
              </p>
            </Reveal>

            <div className="mt-10 space-y-3">
              <Reveal delay={0.2}>
                <div data-spotlight className="glass spotlight flex items-center justify-between gap-4 rounded-2xl p-4">
                  <a href={`mailto:${personalInfo.social.email}`} className="group relative z-[1] flex min-w-0 items-center gap-4">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-electric to-neon-violet shadow-[0_0_24px_-4px_rgb(59_158_255/0.8)]">
                      <Mail size={18} />
                    </span>
                    <span className="min-w-0">
                      <span className="block font-mono text-[10px] uppercase tracking-[0.16em] text-ink-subtle">E-mail</span>
                      <span className="block truncate font-medium transition-colors group-hover:text-white">{personalInfo.social.email}</span>
                    </span>
                  </a>
                  <button onClick={copyEmail} className="icon-btn relative z-[1] h-10 w-10 shrink-0" aria-label="Copiar e-mail" title={copied ? 'Copiado!' : 'Copiar e-mail'}>
                    {copied ? <Check size={15} className="text-neon-emerald" /> : <Copy size={15} />}
                  </button>
                </div>
              </Reveal>

              {CHANNELS.map(({ label, value, href, icon: Icon, spot }, i) => (
                <Reveal key={label} delay={0.26 + i * 0.06}>
                  <a
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    data-spotlight
                    style={{ '--spot': spot } as React.CSSProperties}
                    className="glass spotlight group flex items-center justify-between gap-4 rounded-2xl p-4 transition-[transform,border-color] duration-500 ease-out-expo hover:translate-x-1 hover:border-white/15"
                  >
                    <span className="relative z-[1] flex items-center gap-4">
                      <span className="flex h-11 w-11 items-center justify-center rounded-xl border border-[rgb(var(--spot)/0.4)] text-[rgb(var(--spot))] shadow-[0_0_18px_-4px_rgb(var(--spot)/0.7)] transition-all duration-500 [background:rgb(var(--spot)/0.12)] group-hover:scale-110 group-hover:text-white">
                        <Icon size={18} />
                      </span>
                      <span>
                        <span className="block font-mono text-[10px] uppercase tracking-[0.16em] text-ink-subtle">{label}</span>
                        <span className="block font-medium">{value}</span>
                      </span>
                    </span>
                    <ArrowUpRight size={18} className="arrow-nudge relative z-[1] text-ink-subtle group-hover:text-white" />
                  </a>
                </Reveal>
              ))}
            </div>
          </div>

          {/* Formulário */}
          <Reveal delay={0.12} className="min-w-0 lg:col-span-7">
            <form onSubmit={handleSubmit} data-spotlight className="glass glow-border glow-border-on spotlight space-y-5 rounded-[2rem] p-6 sm:p-10">
              <div className="relative z-[1] flex items-center justify-between border-b border-white/[0.06] pb-5">
                <span className="flex gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]" />
                  <span className="h-2.5 w-2.5 rounded-full bg-[#febc2e]" />
                  <span className="h-2.5 w-2.5 rounded-full bg-[#28c840]" />
                </span>
                <span className="font-mono text-[11px] text-ink-subtle">nova-mensagem.txt</span>
              </div>
              <div className="relative z-[1] grid gap-5 sm:grid-cols-2">
                <div>
                  <label htmlFor="c-name" className="field-label">Seu nome</label>
                  <input id="c-name" required autoComplete="name" value={form.name} onChange={update('name')} className="field" placeholder="Como posso te chamar?" />
                </div>
                <div>
                  <label htmlFor="c-email" className="field-label">Seu e-mail</label>
                  <input id="c-email" type="email" required autoComplete="email" value={form.email} onChange={update('email')} className="field" placeholder="voce@empresa.com" />
                </div>
              </div>
              <div className="relative z-[1]">
                <label htmlFor="c-msg" className="field-label">Mensagem</label>
                <textarea id="c-msg" required rows={6} value={form.message} onChange={update('message')} className="field resize-none" placeholder="Conte um pouco sobre o projeto ou a oportunidade…" />
              </div>
              <div className="relative z-[1] flex flex-col-reverse items-start gap-4 pt-2 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs text-ink-subtle">Abre seu aplicativo de e-mail com a mensagem pronta.</p>
                <button type="submit" className="btn-primary group w-full sm:w-auto" data-magnetic="0.25">
                  <span>Enviar mensagem</span>
                  <Send size={15} className="transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                </button>
              </div>
            </form>
          </Reveal>
        </div>
      </div>
    </section>
  );
};
