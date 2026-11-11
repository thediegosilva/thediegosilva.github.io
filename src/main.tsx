import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'

const rootEl = document.getElementById('root')!

// O HTML pré-renderizado (para buscadores) fica escondido e é substituído
// pelo app de verdade aqui, então a experiência do visitante não muda.
if (rootEl.hasAttribute('data-ssr')) {
  rootEl.replaceChildren()
  rootEl.removeAttribute('data-ssr')
}

ReactDOM.createRoot(rootEl).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
