import React from 'react';

interface RevealProps extends React.HTMLAttributes<HTMLElement> {
  children: React.ReactNode;
  /** Atraso em segundos (útil para escalonar itens de uma grade). */
  delay?: number;
  as?: 'div' | 'li' | 'article' | 'section' | 'p' | 'span';
  /** Anima no carregamento da página em vez de esperar o scroll (use no topo). */
  immediate?: boolean;
}

/**
 * Marca o elemento com [data-reveal]. O fade-up é feito por CSS e ativado
 * pelo IntersectionObserver em src/lib/effects.ts.
 */
export const Reveal: React.FC<RevealProps> = ({ children, delay = 0, as = 'div', immediate = false, style, className, ...rest }) => {
  const Component = as as React.ElementType;
  return (
    <Component
      {...(immediate ? {} : { 'data-reveal': '' })}
      className={immediate ? `reveal-now ${className ?? ''}` : className}
      style={{ ...style, '--delay': `${Math.round(delay * 1000)}ms` } as React.CSSProperties}
      {...rest}
    >
      {children}
    </Component>
  );
};
