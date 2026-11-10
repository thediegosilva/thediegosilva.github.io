import React from 'react';
import { motion } from 'framer-motion';
import { X } from 'lucide-react';
import { useModalBehavior } from '../../hooks/useModalBehavior';

interface ModalProps {
  onClose: () => void;
  labelledBy: string;
  children: React.ReactNode;
  className?: string;
}

/**
 * Casca de modal acessível. Renderize dentro de <AnimatePresence> para
 * que a animação de saída funcione.
 */
export const Modal: React.FC<ModalProps> = ({ onClose, labelledBy, children, className = '' }) => {
  useModalBehavior(true, onClose);

  return (
    <div className="modal-root fixed inset-0 z-[60] flex items-end justify-center sm:items-center sm:p-6">
      <motion.div
        className="absolute inset-0 bg-black/75 backdrop-blur-xl"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.25 }}
        onClick={onClose}
        aria-hidden
      />
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        className={`relative flex max-h-[92svh] w-full flex-col overflow-hidden glass-strong ![background:linear-gradient(180deg,#0e0d18,#07070c)] rounded-t-[2rem] shadow-[0_40px_120px_-30px_rgb(139_92_246/0.5)] sm:max-h-[88vh] sm:rounded-[2rem] ${className}`}
        initial={{ opacity: 0, y: 32, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 24, scale: 0.98 }}
        transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
      >
        <button onClick={onClose} className="icon-btn absolute right-4 top-4 z-10 bg-black/50" aria-label="Fechar">
          <X size={18} />
        </button>
        {children}
      </motion.div>
    </div>
  );
};
