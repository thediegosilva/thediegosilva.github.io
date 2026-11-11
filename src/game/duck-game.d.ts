export type DuckGameResult = 'vitoria' | 'derrota' | 'saiu';
export interface ParallaxLayer { name: string; speed: number; image: string | null }
export const PARALLAX_LAYERS: ParallaxLayer[];
/** Inicia o minigame. Retorna uma função que encerra e limpa tudo. */
export function startDuckGame(opts?: { duckSpriteUrl?: string; onExit?: (result: DuckGameResult) => void }): (result?: DuckGameResult) => void;
