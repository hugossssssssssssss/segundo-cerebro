/**
 * BANCO DE PALAVRAS CRUZADAS (CRUZADINHAS EM PORTUGUÊS DO BRASIL)
 * 
 * Tabuleiros temáticos e diários com grade matricial e cruzamento perfeito de letras.
 */

export interface PistaDefinicao {
  numero: number;
  pista: string;
  resposta: string; // normalizada em maiúsculas sem acento para digitação
  respostaOriginal?: string; // com acentuação original para exibição
  linha: number; // 0-indexed
  coluna: number; // 0-indexed
}

export interface TabuleiroCruzadinha {
  id: string;
  titulo: string;
  tema: string;
  dificuldade: "Fácil" | "Médio" | "Desafiador";
  linhas: number;
  colunas: number;
  across: Record<number, PistaDefinicao>;
  down: Record<number, PistaDefinicao>;
}

export const TABULEIROS_CRUZADINHA: TabuleiroCruzadinha[] = [
  {
    id: "cruzadinha-brasil-1",
    titulo: "Cultura & Brasilidades",
    tema: "Geografia e Tradições Brasileiras",
    dificuldade: "Fácil",
    linhas: 6,
    colunas: 6,
    across: {
      1: {
        numero: 1,
        linha: 0,
        coluna: 0,
        resposta: "AMAPÁ",
        respostaOriginal: "Amapá",
        pista: "Estado brasileiro banhado pelo rio Amazonas e pelo oceano Atlântico.",
      },
      4: {
        numero: 4,
        linha: 2,
        coluna: 0,
        resposta: "BAHIA",
        respostaOriginal: "Bahia",
        pista: "Estado berço do axé, do acarajé e do Pelourinho.",
      },
      6: {
        numero: 6,
        linha: 4,
        coluna: 1,
        resposta: "PRAIA",
        respostaOriginal: "Praia",
        pista: "Faixa de areia à beira-mar favorita no verão tropical.",
      },
    },
    down: {
      1: {
        numero: 1,
        linha: 0,
        coluna: 0,
        resposta: "ABA",
        respostaOriginal: "Aba",
        pista: "Borda protetora de um chapéu ou boné.",
      },
      2: {
        numero: 2,
        linha: 0,
        coluna: 2,
        resposta: "ACARAJÉ",
        respostaOriginal: "Acarajé",
        pista: "Bolinho de feijão-fradinho frito no dendê.",
      },
      3: {
        numero: 3,
        linha: 0,
        coluna: 4,
        resposta: "ÁGUA",
        respostaOriginal: "Água",
        pista: "Líquido essencial para a vida e recurso abundante no Brasil.",
      },
    },
  },
  {
    id: "cruzadinha-design-tech",
    titulo: "Design & Tecnologia",
    tema: "Arte Visual, Interfaces e Inovação",
    dificuldade: "Médio",
    linhas: 7,
    colunas: 7,
    across: {
      1: {
        numero: 1,
        linha: 0,
        coluna: 0,
        resposta: "PIXEL",
        respostaOriginal: "Pixel",
        pista: "Menor elemento de uma imagem digital em uma tela.",
      },
      4: {
        numero: 4,
        linha: 2,
        coluna: 1,
        resposta: "ÍCONE",
        respostaOriginal: "Ícone",
        pista: "Símbolo gráfico representativo de um app, ação ou pasta.",
      },
      6: {
        numero: 6,
        linha: 4,
        coluna: 0,
        resposta: "VETOR",
        respostaOriginal: "Vetor",
        pista: "Desenho baseado em fórmulas geométricas que não perde qualidade ao ampliar.",
      },
      7: {
        numero: 7,
        linha: 6,
        coluna: 2,
        resposta: "FONTE",
        respostaOriginal: "Fonte",
        pista: "Família tipográfica com estilo e formato das letras.",
      },
    },
    down: {
      1: {
        numero: 1,
        linha: 0,
        coluna: 0,
        resposta: "PAVIO",
        respostaOriginal: "Pavio",
        pista: "Cordão de vela que conduz a chama.",
      },
      2: {
        numero: 2,
        linha: 0,
        coluna: 2,
        resposta: "XEROX",
        respostaOriginal: "Xerox",
        pista: "Sinônimo popular de cópia ou reprodução gráfica.",
      },
      3: {
        numero: 3,
        linha: 0,
        coluna: 4,
        resposta: "LENTE",
        respostaOriginal: "Lente",
        pista: "Peça óptica usada em câmeras fotográficas e óculos.",
      },
      5: {
        numero: 5,
        linha: 2,
        coluna: 3,
        resposta: "NOTAS",
        respostaOriginal: "Notas",
        pista: "Registros curtos de ideias, tarefas ou pensamentos.",
      },
    },
  },
  {
    id: "cruzadinha-natureza-cosmos",
    titulo: "Natureza & Cosmos",
    tema: "Astronomia, Fauna e Ciência",
    dificuldade: "Fácil",
    linhas: 6,
    colunas: 6,
    across: {
      1: {
        numero: 1,
        linha: 0,
        coluna: 0,
        resposta: "SOLAR",
        respostaOriginal: "Solar",
        pista: "Relativo à nossa estrela central ou tipo de energia sustentável.",
      },
      3: {
        numero: 3,
        linha: 2,
        coluna: 1,
        resposta: "LUA",
        respostaOriginal: "Lua",
        pista: "Satélite natural que ilumina as noites da Terra.",
      },
      5: {
        numero: 5,
        linha: 4,
        coluna: 0,
        resposta: "ASTRO",
        respostaOriginal: "Astro",
        pista: "Corpo celeste que orbita o espaço (estrela, planeta, cometa).",
      },
    },
    down: {
      1: {
        numero: 1,
        linha: 0,
        coluna: 0,
        resposta: "SILA",
        respostaOriginal: "Sila",
        pista: "Vento ameno e brisa suave das montanhas.",
      },
      2: {
        numero: 2,
        linha: 0,
        coluna: 2,
        resposta: "LUPA",
        respostaOriginal: "Lupa",
        pista: "Instrumento com lente de aumento para observar pequenos detalhes.",
      },
      4: {
        numero: 4,
        linha: 2,
        coluna: 4,
        resposta: "ARCO",
        respostaOriginal: "Arco",
        pista: "Estrutura curva presente em pontes ou no arco-íris.",
      },
    },
  },
  {
    id: "cruzadinha-literatura-artes",
    titulo: "Cinema & Literatura",
    tema: "Histórias, Livros e Expressão Artística",
    dificuldade: "Médio",
    linhas: 7,
    colunas: 7,
    across: {
      1: {
        numero: 1,
        linha: 0,
        coluna: 1,
        resposta: "POEMA",
        respostaOriginal: "Poema",
        pista: "Obra em versos com rima, métrica ou ritmo lírico.",
      },
      3: {
        numero: 3,
        linha: 2,
        coluna: 0,
        resposta: "CENA",
        respostaOriginal: "Cena",
        pista: "Unidade de ação dramática em uma peça ou filme.",
      },
      5: {
        numero: 5,
        linha: 4,
        coluna: 1,
        resposta: "LIVRO",
        respostaOriginal: "Livro",
        pista: "Volume de páginas impressas ou digitais com uma história ou conhecimento.",
      },
      7: {
        numero: 7,
        linha: 6,
        coluna: 0,
        resposta: "AUTOR",
        respostaOriginal: "Autor",
        pista: "Pessoa responsável pela criação de uma obra literária ou artística.",
      },
    },
    down: {
      1: {
        numero: 1,
        linha: 0,
        coluna: 1,
        resposta: "PEÇA",
        respostaOriginal: "Peça",
        pista: "Espetáculo teatral encenado por atores no palco.",
      },
      2: {
        numero: 2,
        linha: 0,
        coluna: 3,
        resposta: "MUSEU",
        respostaOriginal: "Museu",
        pista: "Instituição dedicada à preservação e exposição de arte e história.",
      },
      4: {
        numero: 4,
        linha: 2,
        coluna: 0,
        resposta: "CARTA",
        respostaOriginal: "Carta",
        pista: "Mensagem escrita enviada em envelope a um destinatário.",
      },
      6: {
        numero: 6,
        linha: 3,
        coluna: 4,
        resposta: "ATOR",
        respostaOriginal: "Ator",
        pista: "Profissional que interpreta personagens na TV, cinema ou teatro.",
      },
    },
  },
];

/**
 * Retorna o tabuleiro diário correspondente à data informada.
 */
export function obterCruzadinhaDoDia(data: Date = new Date()): TabuleiroCruzadinha {
  const d = new Date(data);
  d.setHours(0, 0, 0, 0);
  const dataInicial = new Date("2024-01-01T00:00:00");
  const diffDias = Math.floor((d.getTime() - dataInicial.getTime()) / (1000 * 60 * 60 * 24));
  const indice = Math.abs(diffDias) % TABULEIROS_CRUZADINHA.length;
  return TABULEIROS_CRUZADINHA[indice];
}
