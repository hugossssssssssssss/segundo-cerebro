import type { Settings } from "./settings";
import { ler, gravar } from "./github";

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

export const CAMINHO_MENU = ".klaus/menu.json";
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
      { id: "contatos", para: "/contatos", rotulo: "Árvore de Contatos", iconeNome: "FolderTree" },
      { id: "notas", para: "/notas", rotulo: "Notas", iconeNome: "FileText" },
      { id: "noticias", para: "/noticias", rotulo: "Notícias", iconeNome: "Newspaper" },
      { id: "lixeira", para: "/lixeira", rotulo: "Lixeira", iconeNome: "Trash2" },
    ],
  },
  {
    id: "criacao-ferramentas",
    titulo: "Criação & Ferramentas",
    itens: [
      { id: "grafo", para: "/grafo", rotulo: "Grafo de Links", iconeNome: "Network" },
      { id: "lousas", para: "/lousas", rotulo: "Lousas Visuais", iconeNome: "Layout" },
      { id: "referencias", para: "/referencias", rotulo: "Referências Visuais", iconeNome: "Image" },
      { id: "sons", para: "/sons", rotulo: "Sons de Foco", iconeNome: "Headphones" },
      { id: "jogos", para: "/jogos", rotulo: "Jogos", iconeNome: "Gamepad2" },
      { id: "pdf", para: "/pdf", rotulo: "Ferramentas PDF", iconeNome: "FileCheck" },
      { id: "conversor", para: "/conversor", rotulo: "Conversor", iconeNome: "RefreshCw" },
      { id: "it_tools", para: "/it-tools", rotulo: "IT-Tools", iconeNome: "Wrench" },
      { id: "livros", para: "/livros", rotulo: "Pesquisar Livros", iconeNome: "BookOpen" },
      { id: "testador_hardware", para: "/testador", rotulo: "Testador de Hardware", iconeNome: "Video" },
    ],
  },
  {
    id: "evolucao-ia",
    titulo: "Evolução & IA",
    itens: [
      { id: "pdi", para: "/pdi", rotulo: "Carreira (PDI)", iconeNome: "Target" },
      { id: "transcritor", para: "/transcritor", rotulo: "Transcrição de Áudio", iconeNome: "Mic" },
      { id: "chat", para: "/chat", rotulo: "Conversar", iconeNome: "MessageCircle" },
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
    if (!Array.isArray(parsed) || parsed.length === 0) {
      localStorage.removeItem(CHAVE_STORAGE_MENU);
      return GRUPOS_MENU_PADRAO;
    }

    const gruposValidos = parsed.filter((g) => g && typeof g === "object" && Array.isArray(g.itens));
    if (gruposValidos.length === 0) {
      localStorage.removeItem(CHAVE_STORAGE_MENU);
      return GRUPOS_MENU_PADRAO;
    }

    // Garantir que todos os itens das rotas padrões existam
    const mapaItensSalvos = new Map<string, ItemMenuPersonalizado>();
    for (const g of gruposValidos) {
      for (const item of g.itens) {
        if (item && typeof item === "object" && typeof item.para === "string" && item.para) {
          mapaItensSalvos.set(item.para, item);
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
  } catch (err) {
    console.error("[Klaus] Erro ao carregar menu personalizado, limpando chave em localStorage:", err);
    try {
      localStorage.removeItem(CHAVE_STORAGE_MENU);
    } catch {}
    return GRUPOS_MENU_PADRAO;
  }
}

let ultimoShaMenu: string | undefined = undefined;
let timerDebounceMenu: ReturnType<typeof setTimeout> | null = null;

export function registrarShaMenu(sha?: string): void {
  if (sha) ultimoShaMenu = sha;
}

export function obterShaMenu(): string | undefined {
  return ultimoShaMenu;
}

/**
 * Enfileira a persistência assíncrona do menu no repositório GitHub com debounce suave.
 */
export function agendarPersistenciaMenuRemoto(
  cfg: Settings,
  grupos: GrupoMenuPersonalizado[],
  delayMs = 1500,
): void {
  if (!cfg.githubToken || !cfg.repoOwner || !cfg.repoName) return;

  if (timerDebounceMenu) {
    clearTimeout(timerDebounceMenu);
  }

  timerDebounceMenu = setTimeout(async () => {
    timerDebounceMenu = null;
    try {
      const conteudo = JSON.stringify(grupos, null, 2);
      let shaFinal = ultimoShaMenu;
      if (!shaFinal) {
        try {
          const res = await ler(cfg, CAMINHO_MENU, { silenciar404: true });
          if (res?.sha) shaFinal = res.sha;
        } catch {}
      }
      const novoSha = await gravar(
        cfg,
        CAMINHO_MENU,
        conteudo,
        shaFinal,
        "config: atualizar preferências do menu personalizado",
      );
      if (novoSha) ultimoShaMenu = novoSha;
    } catch {
      // Falha silenciosa de rede mantém localStorage íntegro
    }
  }, delayMs);
}

/**
 * Carrega a configuração do menu salva no repositório GitHub e mescla com a local.
 */
export async function sincronizarMenuComGithub(
  cfg: Settings,
): Promise<{ sincronizado: boolean; grupos: GrupoMenuPersonalizado[] }> {
  const locais = carregarMenuPersonalizado();
  if (!cfg.githubToken || !cfg.repoOwner || !cfg.repoName) {
    return { sincronizado: false, grupos: locais };
  }

  try {
    const res = await ler(cfg, CAMINHO_MENU, { silenciar404: true });
    if (res?.texto) {
      registrarShaMenu(res.sha);
      const parsed = JSON.parse(res.texto);
      if (Array.isArray(parsed) && parsed.length > 0) {
        localStorage.setItem(CHAVE_STORAGE_MENU, JSON.stringify(parsed));
        window.dispatchEvent(new CustomEvent(EVENTO_MENU_ATUALIZADO));
        return { sincronizado: true, grupos: parsed };
      }
    } else if (locais && locais.length > 0) {
      // Se não existe remoto mas temos personalização local, envia para o GitHub
      agendarPersistenciaMenuRemoto(cfg, locais, 1000);
    }
  } catch {
    // Falha silenciosa
  }

  return { sincronizado: false, grupos: locais };
}

/**
 * Salva a nova configuração do menu no localStorage e dispara o evento de atualização.
 * Se houver configuração do GitHub, agenda também a sincronização remota.
 */
export function salvarMenuPersonalizado(
  grupos: GrupoMenuPersonalizado[],
  cfg?: Settings,
): boolean {
  try {
    const gruposLimpos = (grupos || [])
      .filter((g) => g && typeof g === "object")
      .map((g) => ({
        ...g,
        itens: (g.itens || []).filter((it) => it && typeof it === "object" && it.para),
      }));

    localStorage.setItem(CHAVE_STORAGE_MENU, JSON.stringify(gruposLimpos));
    window.dispatchEvent(new CustomEvent(EVENTO_MENU_ATUALIZADO));

    if (cfg) {
      agendarPersistenciaMenuRemoto(cfg, gruposLimpos);
    }

    return true;
  } catch (err) {
    console.error("Erro ao salvar menu personalizado:", err);
    return false;
  }
}

/**
 * Restaura o menu lateral para as configurações originais de fábrica.
 */
export function restaurarMenuPadrao(cfg?: Settings): boolean {
  try {
    localStorage.removeItem(CHAVE_STORAGE_MENU);
    window.dispatchEvent(new CustomEvent(EVENTO_MENU_ATUALIZADO));

    if (cfg) {
      agendarPersistenciaMenuRemoto(cfg, GRUPOS_MENU_PADRAO);
    }

    return true;
  } catch (err) {
    console.error("Erro ao restaurar menu padrão:", err);
    return false;
  }
}

/**
 * Obtém o rótulo atual de uma rota respeitando a personalização do menu feita pelo usuário.
 */
export function obterRotuloRota(rota: string): string {
  const rotaLimpa = rota.startsWith("/") ? rota : `/${rota}`;
  const rotaBase = rotaLimpa.split("?")[0].replace(/\/$/, "");
  const grupos = carregarMenuPersonalizado();
  
  for (const g of grupos) {
    for (const item of g.itens) {
      if (item.para === rotaBase || item.para === rotaLimpa) {
        return item.rotulo;
      }
    }
  }

  // Rotas especiais ou complementares
  const mapeamentoEspecial: Record<string, string> = {
    "": "Início",
    "/": "Início",
    "/home": "Início",
    "/inbox": "Caixa de Entrada",
    "/tarefas": "Tarefas",
    "/notas": "Notas",
    "/pdi": "Carreira (PDI)",
    "/configuracoes": "Ajustes",
    "/ajustes": "Ajustes",
    "/chat": "Conversar",
    "/referencias": "Referências Visuais",
    "/lousas": "Lousas Visuais",
    "/grafo": "Grafo de Links",
    "/contatos": "Árvore de Contatos",
    "/noticias": "Notícias",
    "/sons": "Sons de Foco",
    "/jogos": "Jogos",
    "/pdf": "Ferramentas PDF",
    "/conversor": "Conversor",
    "/livros": "Pesquisar Livros",
    "/testador": "Testador de Hardware",
    "/transcritor": "Transcrição de Áudio",
    "/boas-vindas": "Boas-vindas",
  };

  if (mapeamentoEspecial[rotaBase]) {
    return mapeamentoEspecial[rotaBase];
  }

  const semBarra = rotaBase.replace(/^\//, "");
  return semBarra ? semBarra.charAt(0).toUpperCase() + semBarra.slice(1) : "Início";
}

