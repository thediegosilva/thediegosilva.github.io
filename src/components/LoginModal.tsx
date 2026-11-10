import React from 'react';
import { ArrowUpRight, Lock, ShieldAlert, ShieldCheck } from 'lucide-react';
import { auth } from '../data/portfolioData';
import { Modal } from './ui/Modal';

interface LoginModalProps {
  onClose: () => void;
}

/** Logo do Google (cores oficiais) */
const GoogleLogo: React.FC = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden>
    <path fill="#4285F4" d="M23.5 12.27c0-.85-.08-1.67-.22-2.45H12v4.64h6.45a5.52 5.52 0 0 1-2.4 3.62v3h3.88c2.27-2.09 3.57-5.17 3.57-8.81Z" />
    <path fill="#34A853" d="M12 24c3.24 0 5.96-1.07 7.94-2.91l-3.88-3c-1.07.72-2.45 1.15-4.06 1.15-3.12 0-5.77-2.11-6.71-4.95H1.28v3.1A12 12 0 0 0 12 24Z" />
    <path fill="#FBBC05" d="M5.29 14.29A7.2 7.2 0 0 1 4.91 12c0-.8.14-1.57.38-2.29v-3.1H1.28A12 12 0 0 0 0 12c0 1.94.46 3.77 1.28 5.39l4.01-3.1Z" />
    <path fill="#EA4335" d="M12 4.75c1.76 0 3.34.61 4.59 1.8l3.44-3.44C17.95 1.19 15.24 0 12 0A12 12 0 0 0 1.28 6.61l4.01 3.1C6.23 6.86 8.88 4.75 12 4.75Z" />
  </svg>
);

/**
 * Área da equipe. A autenticação é feita pelo Google: a pasta do Drive é
 * "Restrita" e só abre para as contas que o administrador adicionou.
 * Nenhuma senha é digitada ou guardada neste site.
 */
export const LoginModal: React.FC<LoginModalProps> = ({ onClose }) => (
  <Modal onClose={onClose} labelledBy="login-title" className="max-w-md">
    <div className="relative overflow-y-auto overscroll-contain">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-48 opacity-90 [background:radial-gradient(ellipse_at_50%_0%,rgb(139_92_246/0.45),transparent_65%),radial-gradient(ellipse_at_20%_10%,rgb(59_158_255/0.35),transparent_55%)]" />

      <div className="relative p-7 pt-10 sm:p-9 sm:pt-12">
        <div className="relative mx-auto flex h-16 w-16 items-center justify-center">
          <span className="absolute inset-0 animate-[spin-angle_5s_linear_infinite] rounded-2xl [background:conic-gradient(from_var(--angle),#3b9eff,#8b5cf6,#10d9a0,#22d3ee,#3b9eff)] shadow-[0_0_30px_-6px_rgb(139_92_246/0.9)]" />
          <span className="absolute inset-[2px] flex items-center justify-center rounded-[calc(1rem-2px)] bg-[#0b0a14] text-neon-cyan">
            <Lock size={24} />
          </span>
        </div>

        <h2 id="login-title" className="mt-6 text-center font-display text-2xl font-bold tracking-tight">
          Área da <span className="text-gradient">equipe</span>
        </h2>
        <p className="mt-2 text-center text-sm leading-relaxed text-ink-muted">
          Acesso restrito a membros autorizados. Entre com a conta Google cadastrada pelo administrador.
        </p>

        <a
          href={auth.teamUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={onClose}
          className="group mt-8 flex h-12 w-full items-center justify-center gap-3 rounded-full bg-white px-6 text-sm font-semibold text-[#1f1f1f] shadow-[0_10px_40px_-10px_rgb(59_158_255/0.6)] transition-transform duration-300 hover:-translate-y-0.5"
        >
          <GoogleLogo />
          Entrar com Google
          <ArrowUpRight size={16} className="text-[#5f6368] transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
        </a>

        <p className="mt-4 text-center text-xs leading-relaxed text-ink-subtle">
          Sua senha é digitada apenas no Google, nunca neste site. Contas não autorizadas verão a mensagem “Você precisa de permissão”.
        </p>

        {/* Aviso legal */}
        <div role="note" className="mt-6 rounded-2xl border border-[#ff9f43]/30 bg-[#ff9f43]/[0.08] p-4">
          <p className="flex items-center gap-2 font-mono text-[11px] font-medium uppercase tracking-[0.18em] text-[#ffb870]">
            <ShieldAlert size={14} /> Ambiente monitorado
          </p>
          <p className="mt-2 text-xs leading-relaxed text-[#f3d6bd]">
            O acesso a esta área é controlado e cada solicitação fica vinculada à conta Google utilizada. Tentativas de acesso não autorizado
            serão registradas e poderão ser reportadas às autoridades. Invadir dispositivo informático é crime previsto no art. 154-A do
            Código Penal (Lei 12.737/2012).
          </p>
        </div>

        <p className="mt-6 flex items-center justify-center gap-2 text-xs text-ink-subtle">
          <ShieldCheck size={14} className="text-neon-emerald" />
          Autenticação protegida pelo Google
        </p>
      </div>
    </div>
  </Modal>
);
