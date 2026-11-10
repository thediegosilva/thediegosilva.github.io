import React from 'react';

/**
 * Títulos que se montam palavra por palavra. A animação dispara quando um
 * ancestral com [data-reveal] recebe .is-visible (ou dentro de .reveal-now).
 *
 * `highlight`: trecho final do texto que recebe o gradiente da marca.
 */
export const SplitWords: React.FC<{ text: string; highlight?: string; className?: string }> = ({ text, highlight, className }) => {
  const cut = highlight && text.endsWith(highlight) ? text.length - highlight.length : text.length;
  const words = [
    ...text.slice(0, cut).split(' ').filter(Boolean).map((w) => ({ w, hl: false })),
    ...(highlight ? highlight.split(' ').filter(Boolean).map((w) => ({ w, hl: true })) : []),
  ];

  return (
    <span className={className} aria-label={text}>
      {words.map(({ w, hl }, i) => (
        <React.Fragment key={i}>
          <span className="split-word" aria-hidden>
            <span className={`split-word-inner ${hl ? 'text-gradient' : ''}`} style={{ '--i': i } as React.CSSProperties}>
              {w}
            </span>
          </span>
          {i < words.length - 1 && ' '}
        </React.Fragment>
      ))}
    </span>
  );
};

/**
 * Letras que sobem uma a uma. Com `gradient`, cada letra mostra a sua
 * fatia do gradiente para o conjunto parecer contínuo.
 */
export const SplitChars: React.FC<{ text: string; offset?: number; gradient?: boolean; className?: string }> = ({
  text,
  offset = 0,
  gradient = false,
  className = '',
}) => {
  const chars = text.split('');
  return (
    <span className={`split-line ${className}`} aria-label={text}>
      {chars.map((ch, i) => (
        <span
          key={i}
          aria-hidden
          className={`split-char ${gradient ? 'split-char-gradient' : ''}`}
          style={{ '--i': i + offset, '--n': chars.length, '--k': i } as React.CSSProperties}
        >
          {ch === ' ' ? ' ' : ch}
        </span>
      ))}
    </span>
  );
};
