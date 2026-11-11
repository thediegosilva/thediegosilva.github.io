import { renderToString } from 'react-dom/server';
import App from './App';

/** Usado só no build: gera o HTML do site para os buscadores lerem sem JavaScript. */
export function render(): string {
  return renderToString(<App />);
}
