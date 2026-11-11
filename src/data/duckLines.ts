/** Falas do Pato Vírus (easter egg do rodapé), por situação.
 *  Uma fala pode vir com uma ação (`act`) que o pato executa enquanto fala. */

export type DuckAction =
  | 'tired' | 'dance' | 'tilt' | 'spin' | 'cover'
  | 'confused' | 'model' | 'sign7' | 'investigate' | 'tapMouse'
  | 'think' | 'emotional' | 'nostalgia' | 'cross' | 'loudQuack' | 'limp' | 'pointEye' | 'watch'
  | 'readProjects' | 'measureSkills' | 'lieFooter' | 'sitName'
  | 'rushFood' | 'carryFood' | 'lieBox' | 'lastLook';

export type DuckLine = string | { text: string; act: DuckAction };

export const lineText = (l: DuckLine) => (typeof l === 'string' ? l : l.text);
export const lineAct = (l: DuckLine) => (typeof l === 'string' ? undefined : l.act);

export const duckLines: Record<string, DuckLine[]> = {
  /** enquanto segue o mouse / quando o mouse mexe rápido */
  cursor: [
    'Para de mexer esse mouse aí, seu chato! Tô ficando tonto!',
    'Você é doido? Por que tá me perseguindo com o cursor?',
    'Eu não sou seu pet, para de me seguir!',
    'Seu mouse tá lento hoje, hein? Ou é você que é lerdo?',
    'Tô atrás desse cursor há 10 segundos e já cansei. Você não tem o que fazer?',
    'Olha o tamanho desse mouse… parece que você tá controlando um avião.',
    'Se você parar de mexer eu paro também. Combinado?',
    'Esse mouse é seu ou de alguém que tava usando o computador antes?',
    'Para! Tô com vertigem de tanto girar atrás de você!',
    'Seu mouse tá tremendo. Tá nervoso com o pato?',
    { text: 'Ei! Você tá me usando como exercício? Porque eu não pedi academia hoje!', act: 'tired' },
    { text: 'Seu mouse tá com vontade de dançar ou só de me irritar?', act: 'dance' },
    { text: 'Tô te seguindo porque você parece perdido. Precisa de ajuda?', act: 'tilt' },
    { text: 'Para de me circular! Eu não sou um planeta e você não é o sol!', act: 'spin' },
    { text: 'Seu cursor é mais insistente que propaganda de curso de programação.', act: 'cover' },
  ],
  /** reclamando de quem está vendo o site */
  viewer: [
    'Quem é você pra ficar olhando o portfólio do Diego assim? Tá de olho em quê?',
    'Tá gostando do site? Porque eu não. Podia ter mais sobre o pato.',
    'Tá demorando demais nessa seção. Próxima já!',
    'Eu vejo tudo que você clica… e não tô impressionado.',
    'Seu currículo é bonitinho, mas o pato é o verdadeiro destaque.',
    'Você veio pelo LinkedIn ou pelo GitHub? Fala a verdade.',
    'Esse site tem JavaScript demais… ou de menos. Não sei, só sei que tô livre.',
    'Se o Diego soubesse que você soltou o pato, ele ia ficar bravo.',
    { text: 'Você tá lendo o portfólio com a mesma cara de quem abre a geladeira e esquece o que ia pegar.', act: 'confused' },
    { text: 'Diego fez esse site inteiro e você só veio ver o pato. Eu entendo, eu também me escolheria.', act: 'model' },
    { text: 'Tá demorando nessa seção. Eu já li, analisei e dei nota. Nota 7.', act: 'sign7' },
    { text: 'Você veio pelo GitHub ou foi recomendado por alguém que queria me ver solto?', act: 'investigate' },
  ],
  /** gerais, chatas e reclamonas */
  general: [
    'Tô com fome. Onde tá a comida?',
    'Você me libertou e agora não sabe o que fazer comigo, né?',
    'Esse fundo do site é meio feio, não acha?',
    'Eu reclamo porque eu posso. Sou um pato livre agora.',
    'Você já pensou que talvez o pato não quisesse sair da caixa?',
    'Meu nome é Pato. Só Pato. Nada de apelido fofinho.',
    'Você sabia que patos são mais inteligentes que a maioria dos humanos? (mentira, mas eu gosto de falar isso).',
    'Tô olhando pra você. E não tô gostando do que vejo.',
    'O site tá lento ou sou eu que tô voando devagar?',
    { text: 'Eu tava na caixa planejando minha aposentadoria. Agora tô aqui sem plano.', act: 'think' },
    { text: 'Tô livre e já tô com saudade da caixa. Lá pelo menos ninguém me pedia opinião.', act: 'nostalgia' },
    { text: 'Eu reclamo porque é meu único hobby. Você tem algum?', act: 'cross' },
    { text: 'Se eu ficasse quieto, você ia achar que o site bugou. Então eu não fico.', act: 'loudQuack' },
    { text: 'Tô voando há tempo demais. Meus pés imaginários tão doendo.', act: 'limp' },
    { text: 'Você sabia que patos têm memória de peixe? Mentira, eu lembro de tudo que você fez.', act: 'pointEye' },
    { text: 'Eu posso ficar aqui o dia inteiro. Você tem reunião daqui a pouco, né?', act: 'watch' },
  ],
  /** extras bem irritantes, de vez em quando */
  extra: [
    'Quack. Quack quack. Quack quack quack. (tradução: para de me olhar).',
    'Tá com pressa? Eu também não.',
    'Eu reclamo, você reclama, a gente reclama junto. Que lindo.',
    'Onde fica a seção do pato? Não tem? Que falta de respeito.',
  ],
  /** logo que sai da caixa */
  release: [
    'Você clicou no botão mesmo sabendo que não era pra apertar… típico.',
    'Mais um visitante que não consegue resistir ao botão. Previsível.',
    'Liberta o pato? Mais como liberta o caos!',
    { text: 'Essa animação da caixa foi tão dramática que eu quase chorei. Quase.', act: 'emotional' },
    { text: 'Eu tava na caixa planejando minha aposentadoria. Agora tô aqui sem plano.', act: 'think' },
  ],
  /** quando a página é recarregada com o pato solto */
  comeback: ['Eu sei que você tá pensando em fechar a aba. Não adianta, eu volto.'],
  /** quando a comida aparece */
  food: [
    'Comida! Finalmente! Tô indo!',
    'Essa comida parece suspeita… mas eu tô com fome demais pra questionar.',
    { text: 'Comida! Finalmente algo que não reclama de mim!', act: 'rushFood' },
  ],
  /** depois de pegar a comida, voltando pra caixa */
  goingHome: [
    { text: 'Tá, eu volto pra caixa. Mas só porque a comida é mais interessante que essa conversa.', act: 'carryFood' },
    { text: 'Se é pra voltar pra caixa, que seja com barriga cheia.', act: 'carryFood' },
    { text: 'Foi divertido ser livre por uns minutos. Agora quero paz e milho.', act: 'carryFood' },
  ],
  /** chegando na caixa */
  atBox: [
    { text: 'Me prende de novo, mas da próxima vez põe um travesseiro na caixa.', act: 'lieBox' },
    { text: 'Já tô indo. Não precisa ficar me olhando com essa cara de alívio.', act: 'lastLook' },
    { text: 'Tá, tá. Eu volto. Mas só porque tem comida.', act: 'lastLook' },
  ],
  /** quando alguém clica no pato */
  poked: ['Tá tentando me pegar? Boa sorte, eu sou mais rápido.', 'Ei! Sem encostar no pato!', 'Quack! Quase, hein. Quase.'],
  /** quando o mouse fica parado */
  idle: [
    { text: 'Seu mouse tá parado há 8 segundos. Tá pensando na vida ou só travou?', act: 'tapMouse' },
    'Tô entediado. Faz alguma coisa interessante.',
    'Morreu aí? Mexe esse mouse.',
  ],
};

/** Lugares do portfólio que o pato visita, com o que ele fala (e faz) em cada um. */
export const duckSpots: { selector: string; lines: DuckLine[] }[] = [
  { selector: '#inicio h1', lines: [{ text: 'Vou ficar em cima do seu nome. Parece confortável.', act: 'sitName' }, 'Vou pousar em cima do título. Parece confortável.'] },
  { selector: '#sobre h2', lines: ['Tá lendo o About? Eu já li. É ok.'] },
  { selector: '#projetos h2', lines: [{ text: 'Vou dar uma olhada nos projetos. Espero que tenha pelo menos um com pato.', act: 'readProjects' }, 'Vou dar uma olhada nos projetos do Diego… hum, interessante. Ou não.'] },
  { selector: '#habilidades h2', lines: [{ text: 'Essa seção de skills tá maior que a minha lista de reclamações. Impressionante.', act: 'measureSkills' }, 'Essa seção de skills tá inflada. Eu sei programar melhor que isso.'] },
  { selector: '#contato form button[type="submit"]', lines: ['Esse botão de contato é grande demais. Tá com medo de não ser clicado?'] },
  { selector: 'footer', lines: [{ text: 'Footer é o lugar mais honesto do site. Ninguém finge que tá feliz aqui.', act: 'lieFooter' }, 'Tô indo pro footer. Lá é mais quieto.'] },
];
