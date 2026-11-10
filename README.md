# Diego Silva — Portfólio

Portfólio pessoal em **React + TypeScript + Vite + Tailwind CSS + Framer Motion**, 100% estático e pronto para o **GitHub Pages**.

## Rodando localmente

```bash
npm install
npm run dev       # desenvolvimento em http://localhost:5173
npm run build     # gera a versão de produção em dist/
npm run preview   # serve o dist/ localmente
```

## Deploy no GitHub Pages

O workflow `.github/workflows/deploy.yml` faz o build e publica automaticamente a cada push na branch `main`.

1. Suba o projeto para um repositório no GitHub (ex.: `thediegosilva.github.io` ou `portfolio`).
2. No repositório: **Settings → Pages → Build and deployment → Source: GitHub Actions**.
3. Faça push na `main`. O link aparece na aba **Actions** quando o deploy terminar.

O `vite.config.ts` usa `base: './'` (caminhos relativos), então o site funciona tanto em
`usuario.github.io` quanto em `usuario.github.io/nome-do-repo/` sem nenhuma alteração.

## Estrutura

```
public/assets/
  hero-banner.webp        Banner de fundo do topo (desktop)
  hero-banner-sm.webp     Banner de fundo do topo (celular, mais leve)
  portrait.webp           Foto recortada, com fundo transparente (topo do site)
  foto-pdf.webp           Foto quadrada usada no PDF
  projects/               Capturas de tela dos projetos
src/
  data/portfolioData.ts   ← TODO o conteúdo (textos, links, projetos, skills)
  lib/effects.ts          Efeitos em Vanilla JS: scroll reveal (IntersectionObserver),
                          spotlight, botões magnéticos, tilt 3D e barra de progresso
  components/
    Background.tsx        Fundo dinâmico: aurora, grid em perspectiva e partículas (canvas)
    ProjectCard.tsx       Card único usado pelos 4 compartimentos de projetos
    ui/                   Primitivos reutilizáveis (Reveal, SectionHeader, Modal)
  sections/               Hero, Sobre, Projetos, Sites, Habilidades, Contato
  hooks/                  Seção ativa do menu e comportamento dos modais
  index.css               Glassmorphism, bordas luminosas, botões, animações e reveals
tailwind.config.js        Paleta, tipografia e sombras
```

## Como atualizar

**Adicionar/trocar um projeto:** edite o array `projects` em `src/data/portfolioData.ts`.
Todos os cards usam o mesmo componente, então basta preencher `title`, `description`, `tags` e `githubUrl`.
Para exibir uma captura de tela, salve a imagem em `public/assets/projects/` e informe
`image: './assets/projects/nome.webp'`. Sem imagem, o card mostra uma capa gerada automaticamente.

**Publicar um dos Sites (Pizzaria, Academia, E-commerce):** em `src/data/portfolioData.ts`, no array
`sites`, preencha `url` com o link do site. O card troca sozinho de "Em construção" para "Visitar site".
Para mostrar a prévia, salve uma captura em `public/assets/sites/` e informe `image: './assets/sites/nome.webp'`.

**PDF:** o botão "PDF" abre o documento com seus dados (gerado a partir de `portfolioData.ts`).
"Salvar em PDF" abre a impressão do navegador já formatada em fundo branco.

**Efeitos nos seus próprios elementos:** basta adicionar atributos no HTML/JSX:
`data-reveal` (aparece ao rolar), `data-spotlight` + classe `spotlight` (brilho seguindo o mouse),
`data-magnetic="0.3"` (atração magnética) e `data-tilt` (inclinação 3D). Para vidro, use as classes
`glass` / `glass-strong` e, para a borda em gradiente animada, `glow-border`.

**Trocar o banner ou a foto:** substitua os arquivos em `public/assets/` mantendo os mesmos nomes.
A foto deve ter fundo transparente; ela é ancorada à direita/base e recebe um degradê nas bordas.

## Formulário de contato

Como o GitHub Pages não executa código no servidor, o formulário abre o aplicativo de e-mail do
visitante com assunto e mensagem preenchidos (`mailto:`). Se quiser receber as mensagens direto,
sem depender do app de e-mail, dá para trocar por um serviço como Formspree ou Web3Forms
alterando apenas `handleSubmit` em `src/sections/ContactSection.tsx`.

## Área da equipe (Login)

O botão **Login** abre `src/components/LoginModal.tsx`, que leva à pasta do Google Drive
definida em `auth.teamUrl` (`src/data/portfolioData.ts`). Quem protege os materiais é o Drive:
deixe a pasta como **Restrito** e adicione o e-mail Google de cada membro em *Compartilhar*.
Nenhuma senha é digitada ou guardada neste site.
