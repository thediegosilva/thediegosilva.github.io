export interface Project {
  id: string;
  title: string;
  description: string;
  longDescription?: string;
  /**
   * Caminho relativo a /public (ex.: './assets/projects/meu-projeto.webp').
   * Se a imagem não existir ou falhar ao carregar, o card exibe uma capa gerada automaticamente.
   */
  image?: string;
  tags: string[];
  liveUrl?: string;
  githubUrl?: string;
  featured?: boolean;
  highlights?: string[];
}

export interface Skill {
  name: string;
  category: 'frontend' | 'backend' | 'devops' | 'tools';
  icon: string;
  color: string;
  level?: string;
}

export interface PillarCard {
  title: string;
  subtitle: string;
  iconName: string;
  accent: string;
}

export interface Site {
  id: string;
  title: string;
  /** Segmento do site (ex.: Pizzaria) — aparece como etiqueta no card. */
  segment: string;
  description: string;
  /** Ícone do card: 'pizza' | 'dumbbell' | 'shopping-bag' */
  icon: string;
  /** Link do site publicado. Enquanto vazio, o card mostra "Em breve". */
  url?: string;
  /** Captura de tela (ex.: './assets/sites/pizzaria.webp'). */
  image?: string;
}
