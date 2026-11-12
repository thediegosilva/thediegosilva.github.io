import { Project, Skill, PillarCard, Site } from '../types';

export const personalInfo = {
  name: 'Diego Silva',
  role: 'Desenvolvedor Full-Stack',
  subrole: 'Desenvolvedor de Software',
  greeting: 'Olá, eu sou',
  shortBio: 'Transformo ideias em soluções digitais. Aqui você encontra meus principais projetos, minhas habilidades e um pouco sobre mim.',
  quote: 'Código não é apenas sobre máquinas, é sobre resolver problemas reais.',
  fullBio: [
    'Sou apaixonado por tecnologia e estou sempre buscando aprender algo novo. Gosto de construir projetos que resolvem problemas, seja no front-end, back-end ou em sistemas completos.',
    'Atualmente, estou focado em evoluir minhas habilidades em desenvolvimento web moderno com ecossistema React, TypeScript, Node.js, arquitetura de software, Linux e ferramentas de automação e produtividade.',
    'Acredito que a combinação de código limpo, interfaces agradáveis e uma mentalidade contínua de resolução de problemas é a chave para criar produtos digitais que realmente impactam pessoas e negócios.'
  ],
  social: {
    github: 'https://github.com/thediegosilva',
    linkedin: 'https://www.linkedin.com/in/thediegosilva',
    email: 'thediegosilva@engineer.com',
    whatsapp: '5521989139942', // DDI + DDD + número, só dígitos
    whatsappLabel: '(21) 98913-9942',
  },
  resumeUrl: '#',
  services: [
    { title: 'Desenvolvimento Web', desc: 'Aplicações responsivas, rápidas e modernas.' },
    { title: 'Aplicações Web e Mobile', desc: 'Experiências multiplataforma intuitivas.' },
    { title: 'Banco de Dados', desc: 'Modelagem eficiente e integrações seguras.' },
    { title: 'Soluções em Nuvem', desc: 'Deploy escalável e boas práticas DevOps.' },
    { title: 'Automação e Scripts', desc: 'Otimização de tarefas diárias e rotinas.' },
    { title: 'Segurança e Boas Práticas', desc: 'Código limpo, arquitetura sólida e privacidade.' },
  ]
};

/** Link do WhatsApp com mensagem pronta */
export const whatsappMessage = 'Olá, Diego! Vi seu portfólio e gostaria de conversar sobre um projeto. 🚀';
export const whatsappUrl = `https://wa.me/${personalInfo.social.whatsapp}?text=${encodeURIComponent(whatsappMessage)}`;

export const pillars: PillarCard[] = [
  {
    title: 'Cristão',
    subtitle: 'Fé, integridade e valores que guiam minha jornada diária',
    iconName: 'cross',
    accent: '#38bdf8'
  },
  {
    title: 'Academia',
    subtitle: 'Disciplina diária, foco constante e saúde para superar limites',
    iconName: 'dumbbell',
    accent: '#00d2ff'
  },
  {
    title: 'Tecnologia',
    subtitle: 'Curiosidade insaciável e paixão por inovação e código limpo',
    iconName: 'laptop',
    accent: '#38bdf8'
  },
  {
    title: 'Reservado',
    subtitle: 'Segurança, postura analítica e compromisso com privacidade',
    iconName: 'shield',
    accent: '#00d2ff'
  }
];

export const skills: Skill[] = [
  { name: 'HTML', category: 'frontend', icon: 'html', color: '#E44D26', level: 'Avançado' },
  { name: 'CSS', category: 'frontend', icon: 'css', color: '#1572B6', level: 'Avançado' },
  { name: 'JavaScript', category: 'frontend', icon: 'js', color: '#F7DF1E', level: 'Avançado' },
  { name: 'TypeScript', category: 'frontend', icon: 'ts', color: '#3178C6', level: 'Intermediário / Avançado' },
  { name: 'React', category: 'frontend', icon: 'react', color: '#61DAFB', level: 'Avançado' },
  { name: 'Node.js', category: 'backend', icon: 'node', color: '#339933', level: 'Intermediário' },
  { name: 'Python', category: 'backend', icon: 'python', color: '#3776AB', level: 'Intermediário' },
  { name: 'Linux', category: 'tools', icon: 'linux', color: '#FCC624', level: 'Intermediário / Avançado' },
  { name: 'Git', category: 'tools', icon: 'git', color: '#F05032', level: 'Avançado' },
  { name: 'Docker', category: 'devops', icon: 'docker', color: '#2496ED', level: 'Intermediário' },
];

export const projects: Project[] = [
  // Compartimento 1 — projeto principal
  {
    id: 'horizons-crm',
    title: 'Horizons CRM',
    description: 'CRM comercial multiempresa (SaaS) para pequenas empresas: clientes, pedidos, estoque, financeiro e relatórios em um só lugar.',
    longDescription: 'Aplicação full-stack de ponta a ponta para gestão comercial. Cada empresa opera em um ambiente isolado, convida a equipe com papéis e permissões distintos e acompanha vendas, estoque e fluxo de caixa em um dashboard alimentado diretamente pelo banco de dados. API REST com regras de negócio reais, validação compartilhada entre front e back, testes automatizados e infraestrutura com Docker e CI.',
    image: './assets/projects/horizons-crm.webp',
    tags: ['Next.js', 'React', 'TypeScript', 'Express', 'Prisma', 'PostgreSQL', 'Docker'],
    githubUrl: 'https://github.com/thediegosilva/horizons-crm',
    featured: true,
    highlights: ['Isolamento multiempresa', 'Papéis e permissões (RBAC)', 'Pedidos com controle de estoque', 'Financeiro e fluxo de caixa', 'Relatórios com exportação CSV', 'Testes automatizados e CI']
  },
  {
    id: 'climaapp',
    title: 'ClimaApp',
    description: 'Aplicativo de previsão do tempo com busca por cidades em tempo real e integração com APIs meteorológicas.',
    longDescription: 'Interface moderna que consulta previsões do tempo mundiais, com geolocalização automática, gráficos de temperatura hora a hora, sensação térmica e índice UV.',
    image: './assets/projects/climaapp.png',
    tags: ['JavaScript', 'API', 'CSS', 'React'],
    liveUrl: 'https://climaapp-demo.vercel.app',
    githubUrl: 'https://github.com/thediegosilva/climaapp',
    featured: true,
    highlights: ['Geolocalização precisa', 'Previsão de 7 dias', 'Ícones climáticos reativos', 'Detecção de fuso horário']
  },
  {
    id: 'devtools',
    title: 'DevTools',
    description: 'Conjunto de scripts e ferramentas para automatizar tarefas do dia a dia no ambiente Linux.',
    longDescription: 'Suíte de scripts shell/bash e utilitários CLI desenvolvidos para turbinar o fluxo de trabalho de desenvolvedores em distribuições Linux, incluindo backups automáticos, configuração de ambiente e monitoramento.',
    image: './assets/projects/devtools.png',
    tags: ['Bash', 'Linux', 'Shell', 'Python'],
    liveUrl: 'https://github.com/thediegosilva/devtools',
    githubUrl: 'https://github.com/thediegosilva/devtools',
    featured: true,
    highlights: ['CLI interativo', 'Automação de dotfiles', 'Monitoramento de recursos', 'Execução agendada via Cron']
  },
  {
    id: 'portfolio',
    title: 'Portfólio',
    description: 'Este site! Um portfólio pessoal e moderno para mostrar meus projetos, habilidades e contatos.',
    longDescription: 'Desenvolvido do zero com React, TypeScript, Tailwind CSS e Framer Motion. Apresenta tema escuro de alto padrão, efeitos luminosos de neon azul/ciano, design responsivo fluido e microinterações imersivas.',
    image: './assets/projects/portfolio.png',
    tags: ['React', 'TypeScript', 'Tailwind', 'Framer Motion'],
    liveUrl: 'https://thediegosilva.github.io',
    githubUrl: 'https://github.com/thediegosilva/thediegosilva.github.io',
    featured: true,
    highlights: ['Design Dark Neon exclusivo', 'Animações fluidas 60fps', 'Totalmente responsivo', 'Acessibilidade e SEO']
  }
];

/**
 * Vagas de Sites. Quando um site ficar pronto, preencha `url` (e opcionalmente
 * `image`) e o card troca automaticamente de "Em breve" para "Visitar site".
 */
export const sites: Site[] = [
  {
    id: 'sorveteria',
    title: 'Sorveteria Gelatto',
    segment: 'Gastronomia',
    description: 'Site de sorveteria com motion design: vídeos que giram com o scroll, cardápio, unidades e pedido.',
    icon: 'ice-cream',
    url: 'https://gelattosorvetes.netlify.app',
    image: './assets/sites/sorveteria.webp',
  },
  {
    id: 'academia',
    title: 'Academia',
    segment: 'Fitness',
    description: 'Site para academia com modalidades, planos, horários e contato.',
    icon: 'dumbbell',
  },
  {
    id: 'ecommerce',
    title: 'E-commerce',
    segment: 'Loja virtual',
    description: 'Loja virtual com vitrine de produtos, carrinho e finalização de compra.',
    icon: 'shopping-bag',
  },
];

/**
 * Área da equipe. Quem protege os materiais é o Google Drive: deixe a pasta
 * como "Restrito" e adicione o e-mail de cada membro em Compartilhar.
 */
export const auth = {
  teamUrl: 'https://drive.google.com/drive/folders/13LGwaViDHUplxTLsleYHJhacfCdwLThb',
};
