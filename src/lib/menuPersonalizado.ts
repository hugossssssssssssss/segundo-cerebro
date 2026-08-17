export interface ItemMenuPersonalizado {
  id: string;
  para: string;
  rotulo: string;
  iconeNome: string;
  cor?: string;
  destaque?: boolean;
  oculto?: boolean;
}

export interface GrupoMenuPersonalizado {
  id: string;
  titulo: string;
  itens: ItemMenuPersonalizado[];
}

export interface PresetCor {
  nome: string;
  hex: string;
}

export const PRESETS_CORES_ICONE: PresetCor[] = [
  { nome: "Vermelho / Coral", hex: "#ef4444" },
  { nome: "Laranja / Âmbar", hex: "#f59e0b" },
  { nome: "Amarelo / Dourado", hex: "#eab308" },
  { nome: "Verde / Esmeralda", hex: "#10b981" },
  { nome: "Ciano / Turquesa", hex: "#06b6d4" },
  { nome: "Azul Elétrico", hex: "#3b82f6" },
  { nome: "Roxo / Violeta", hex: "#8b5cf6" },
  { nome: "Rosa / Magenta", hex: "#ec4899" },
  { nome: "Rosa Choque", hex: "#f43f5e" },
];

export const CHAVE_STORAGE_MENU = "klaus_menu_customizado";
export const EVENTO_MENU_ATUALIZADO = "menu-personalizado-atualizado";

export const GRUPOS_MENU_PADRAO: GrupoMenuPersonalizado[] = [
  {
    id: "dia-a-dia",
    titulo: "Dia a Dia",
    itens: [
      { id: "home", para: "/home", rotulo: "Início", iconeNome: "Home" },
      { id: "inbox", para: "/inbox", rotulo: "Caixa de Entrada", iconeNome: "Inbox" },
      { id: "tarefas", para: "/tarefas", rotulo: "Tarefas", iconeNome: "CheckSquare" },
      { id: "processos", para: "/processos", rotulo: "Processos", iconeNome: "GitMerge" },
      { id: "contatos", para: "/contatos", rotulo: "Árvore de Contatos", iconeNome: "FolderTree" },
      { id: "notas", para: "/notas", rotulo: "Notas", iconeNome: "FileText" },
      { id: "noticias", para: "/noticias", rotulo: "Notícias", iconeNome: "Newspaper" },
    ],
  },
  {
    id: "criacao-ferramentas",
    titulo: "Criação & Ferramentas",
    itens: [
      { id: "grafo", para: "/grafo", rotulo: "Grafo de Links", iconeNome: "Network", destaque: true },
      { id: "lousas", para: "/lousas", rotulo: "Lousas Visuais", iconeNome: "Layout" },
      { id: "referencias", para: "/referencias", rotulo: "Referências Visuais", iconeNome: "Image" },
      { id: "pdf", para: "/pdf", rotulo: "Ferramentas PDF", iconeNome: "FileCheck" },
      { id: "conversor", para: "/conversor", rotulo: "Conversor", iconeNome: "RefreshCw" },
    ],
  },
  {
    id: "evolucao-ia",
    titulo: "Evolução & IA",
    itens: [
      { id: "pdi", para: "/pdi", rotulo: "Carreira (PDI)", iconeNome: "Target" },
      { id: "transcritor", para: "/transcritor", rotulo: "Transcrição de Áudio", iconeNome: "Mic" },
      { id: "chat", para: "/chat", rotulo: "Conversar", iconeNome: "MessageCircle", destaque: true },
    ],
  },
];

/**
 * Carrega a configuração do menu salva no localStorage com tolerância total a dados corrompidos.
 */
export function carregarMenuPersonalizado(): GrupoMenuPersonalizado[] {
  try {
    const salvo = localStorage.getItem(CHAVE_STORAGE_MENU);
    if (!salvo) return GRUPOS_MENU_PADRAO;

    const parsed = JSON.parse(salvo);
    if (!Array.isArray(parsed) || parsed.length === 0) return GRUPOS_MENU_PADRAO;

    const gruposValidos = parsed.filter((g) => g && typeof g === "object");
    if (gruposValidos.length === 0) return GRUPOS_MENU_PADRAO;

    // Garantir que todos os itens das rotas padrões existam
    const mapaItensSalvos = new Map<string, ItemMenuPersonalizado>();
    for (const g of gruposValidos) {
      if (Array.isArray(g.itens)) {
        for (const item of g.itens) {
          if (item && typeof item === "object" && typeof item.para === "string" && item.para) {
            mapaItensSalvos.set(item.para, item);
          }
        }
      }
    }

    // Recriar ou atualizar os grupos salvos
    const gruposResultantes: GrupoMenuPersonalizado[] = gruposValidos.map((g: any, idxGrupo: number) => {
      const padraoEquiv = GRUPOS_MENU_PADRAO[idxGrupo] || GRUPOS_MENU_PADRAO[0];
      const itensArray = Array.isArray(g.itens) ? g.itens : [];
      return {
        id: typeof g.id === "string" && g.id ? g.id : `grupo-${idxGrupo}`,
        titulo: typeof g.titulo === "string" && g.titulo.trim() ? g.titulo.trim() : padraoEquiv.titulo,
        itens: itensArray
          .filter((it: any) => it && typeof it === "object" && typeof it.para === "string" && it.para)
          .map((it: any) => ({
            id: typeof it.id === "string" && it.id ? it.id : String(it.para).replace("/", ""),
            para: String(it.para),
            rotulo: typeof it.rotulo === "string" && it.rotulo.trim() ? it.rotulo.trim() : "Sem Nome",
            iconeNome: typeof it.iconeNome === "string" && it.iconeNome.trim() ? it.iconeNome.trim() : "HelpCircle",
            cor: typeof it.cor === "string" ? it.cor : undefined,
            destaque: Boolean(it.destaque),
            oculto: Boolean(it.oculto),
          })),
      };
    });

    if (gruposResultantes.length === 0) return GRUPOS_MENU_PADRAO;

    // Se houver algum item do padrão que não está nos salvos, adiciona no final do primeiro grupo
    for (const gPadrao of GRUPOS_MENU_PADRAO) {
      for (const itemPadrao of gPadrao.itens) {
        if (!mapaItensSalvos.has(itemPadrao.para)) {
          if (!Array.isArray(gruposResultantes[0].itens)) {
            gruposResultantes[0].itens = [];
          }
          gruposResultantes[0].itens.push({ ...itemPadrao });
        }
      }
    }

    return gruposResultantes;
  } catch {
    return GRUPOS_MENU_PADRAO;
  }
}

/**
 * Salva a nova configuração do menu no localStorage e dispara o evento de atualização.
 */
export function salvarMenuPersonalizado(grupos: GrupoMenuPersonalizado[]): void {
  try {
    const gruposLimpos = (grupos || [])
      .filter((g) => g && typeof g === "object")
      .map((g) => ({
        ...g,
        itens: (g.itens || []).filter((it) => it && typeof it === "object" && it.para),
      }));

    localStorage.setItem(CHAVE_STORAGE_MENU, JSON.stringify(gruposLimpos));
    window.dispatchEvent(new CustomEvent(EVENTO_MENU_ATUALIZADO));
  } catch (err) {
    console.error("Erro ao salvar menu personalizado:", err);
  }
}

/**
 * Restaura o menu lateral para as configurações originais de fábrica.
 */
export function restaurarMenuPadrao(): void {
  try {
    localStorage.removeItem(CHAVE_STORAGE_MENU);
    window.dispatchEvent(new CustomEvent(EVENTO_MENU_ATUALIZADO));
  } catch (err) {
    console.error("Erro ao restaurar menu padrão:", err);
  }
}
