import type { Settings } from "./settings";
import { ler, gravar } from "./github";
import {
  carregarMenuPersonalizado,
  salvarMenuPersonalizado,
  CAMINHO_MENU,
  type GrupoMenuPersonalizado,
} from "./menuPersonalizado";
import {
  lerFavoritosLocal,
  salvarFavoritosLocal,
  CAMINHO_FAVORITOS,
  type FavoritoItem,
} from "./favoritos";
import {
  carregarConfigWidgetsLocal,
  salvarConfigWidgetsLocal,
  CAMINHO_WIDGETS,
} from "./widgetsHome";
import { type WidgetConfig } from "@/components/home/types";
import { lerTemaSalvo, aplicarTema, type Tema } from "./tema";


export const CAMINHO_PREFERENCIAS = ".klaus/preferencias.json";
export const CHAVE_STORAGE_PREFERENCIAS = "klaus_preferencias_gerais";
export const CHAVE_STORAGE_STATUS_SYNC = "klaus_sync_status_preferencias";
export const EVENTO_PREFERENCIAS_ATUALIZADAS = "klaus-preferencias-atualizadas";

export interface PreferenciasGerais {
  tema?: Tema;
  modoEdicaoHome?: boolean;
  noticiasModoExibicao?: string;
  noticiasCategoriasAtivas?: string[];
  noticiasFeedsCustom?: any[];
  favoritosBusca?: string[];
  atualizadoEm?: string;
}

export interface PreferenciasKlausConsolidadas {
  versaoSchema: 2;
  atualizadoEm: string;
  dispositivoOrigem?: string;
  favoritos: FavoritoItem[];
  menu: GrupoMenuPersonalizado[];
  widgets: WidgetConfig[];
  gerais: PreferenciasGerais;
}

export interface StatusSincronizacao {
  ultimaSincronizacao?: string;
  sucesso: boolean;
  emAndamento: boolean;
  erro?: string;
}

let ultimoShaPreferencias: string | undefined = undefined;
let timerDebouncePersistencia: ReturnType<typeof setTimeout> | null = null;
let sincronizacaoEmAndamento = false;

export function registrarShaPreferencias(sha?: string): void {
  if (sha) ultimoShaPreferencias = sha;
}

export function obterShaPreferencias(): string | undefined {
  return ultimoShaPreferencias;
}

/**
 * Lê todas as preferências gerais ativas no localStorage.
 */
export function lerPreferenciasGeraisLocal(): PreferenciasGerais {
  try {
    const tema = lerTemaSalvo();
    const modoEdicaoHome = localStorage.getItem("klaus_home_modo_edicao") === "true";
    const noticiasModoExibicao = localStorage.getItem("klaus_noticias_modo_exibicao") || undefined;
    
    let noticiasCategoriasAtivas: string[] | undefined;
    try {
      const cat = localStorage.getItem("klaus_noticias_categorias_ativas");
      if (cat) noticiasCategoriasAtivas = JSON.parse(cat);
    } catch {}

    let noticiasFeedsCustom: any[] | undefined;
    try {
      const feeds = localStorage.getItem("klaus_noticias_feeds_custom");
      if (feeds) noticiasFeedsCustom = JSON.parse(feeds);
    } catch {}

    let favoritosBusca: string[] | undefined;
    try {
      const favB = localStorage.getItem("klaus_favoritos_busca");
      if (favB) favoritosBusca = JSON.parse(favB);
    } catch {}

    return {
      tema,
      modoEdicaoHome,
      noticiasModoExibicao,
      noticiasCategoriasAtivas,
      noticiasFeedsCustom,
      favoritosBusca,
      atualizadoEm: new Date().toISOString(),
    };
  } catch {
    return { tema: "claro" };
  }
}

/**
 * Coleta o estado completo de todas as preferências do usuário no localStorage.
 */
export function lerTodasPreferenciasLocal(): PreferenciasKlausConsolidadas {
  return {
    versaoSchema: 2,
    atualizadoEm: new Date().toISOString(),
    favoritos: lerFavoritosLocal({ comPadrao: true }),
    menu: carregarMenuPersonalizado(),
    widgets: carregarConfigWidgetsLocal(),
    gerais: lerPreferenciasGeraisLocal(),
  };
}

/**
 * Aplica as preferências gerais no localStorage e no DOM.
 */
export function aplicarPreferenciasGerais(prefs: PreferenciasGerais): void {
  if (!prefs || typeof prefs !== "object") return;

  try {
    if (prefs.tema) {
      aplicarTema(prefs.tema);
    }
    if (typeof prefs.modoEdicaoHome === "boolean") {
      localStorage.setItem("klaus_home_modo_edicao", String(prefs.modoEdicaoHome));
    }
    if (prefs.noticiasModoExibicao) {
      localStorage.setItem("klaus_noticias_modo_exibicao", prefs.noticiasModoExibicao);
    }
    if (Array.isArray(prefs.noticiasCategoriasAtivas)) {
      localStorage.setItem("klaus_noticias_categorias_ativas", JSON.stringify(prefs.noticiasCategoriasAtivas));
    }
    if (Array.isArray(prefs.noticiasFeedsCustom)) {
      localStorage.setItem("klaus_noticias_feeds_custom", JSON.stringify(prefs.noticiasFeedsCustom));
    }
    if (Array.isArray(prefs.favoritosBusca)) {
      localStorage.setItem("klaus_favoritos_busca", JSON.stringify(prefs.favoritosBusca));
    }

    window.dispatchEvent(new CustomEvent(EVENTO_PREFERENCIAS_ATUALIZADAS, { detail: prefs }));
  } catch (err) {
    console.error("[Klaus] Erro ao aplicar preferências gerais:", err);
  }
}

/**
 * Aplica todo o conjunto de preferências consolidadas no localStorage e notifica todos os componentes.
 */
export function aplicarTodasPreferenciasLocal(dados: Partial<PreferenciasKlausConsolidadas>): void {
  if (!dados || typeof dados !== "object") return;

  try {
    if (Array.isArray(dados.favoritos) && dados.favoritos.length > 0) {
      salvarFavoritosLocal(dados.favoritos);
    }
    if (Array.isArray(dados.menu) && dados.menu.length > 0) {
      salvarMenuPersonalizado(dados.menu);
    }
    if (Array.isArray(dados.widgets) && dados.widgets.length > 0) {
      salvarConfigWidgetsLocal(dados.widgets);
    }
    if (dados.gerais) {
      aplicarPreferenciasGerais(dados.gerais);
    }
  } catch (err) {
    console.error("[Klaus] Erro ao aplicar todas as preferências:", err);
  }
}

/**
 * Lê o status da última sincronização.
 */
export function obterStatusSincronizacao(): StatusSincronizacao {
  try {
    const salvo = localStorage.getItem(CHAVE_STORAGE_STATUS_SYNC);
    if (salvo) {
      return JSON.parse(salvo);
    }
  } catch {}
  return { sucesso: true, emAndamento: false };
}

function salvarStatusSincronizacao(status: StatusSincronizacao): void {
  try {
    localStorage.setItem(CHAVE_STORAGE_STATUS_SYNC, JSON.stringify(status));
  } catch {}
}

/**
 * Enfileira a gravação assíncrona consolidada no GitHub (.klaus/preferencias.json).
 */
export function agendarPersistenciaPreferenciasRemoto(
  cfg: Settings,
  _prefsIgnoradas?: any,
  delayMs = 1500,
): void {
  if (!cfg.githubToken || !cfg.repoOwner || !cfg.repoName) return;

  if (timerDebouncePersistencia) {
    clearTimeout(timerDebouncePersistencia);
  }

  timerDebouncePersistencia = setTimeout(async () => {
    timerDebouncePersistencia = null;
    try {
      const payload = lerTodasPreferenciasLocal();
      const conteudo = JSON.stringify(payload, null, 2);

      let shaFinal = ultimoShaPreferencias;
      if (!shaFinal) {
        try {
          const res = await ler(cfg, CAMINHO_PREFERENCIAS, { silenciar404: true });
          if (res?.sha) shaFinal = res.sha;
        } catch {}
      }

      const novoSha = await gravar(
        cfg,
        CAMINHO_PREFERENCIAS,
        conteudo,
        shaFinal,
        "config: sincronizar preferências consolidadas do usuário (favoritos, menu, widgets, tema)",
      );
      if (novoSha) {
        ultimoShaPreferencias = novoSha;
        salvarStatusSincronizacao({
          sucesso: true,
          emAndamento: false,
          ultimaSincronizacao: new Date().toISOString(),
        });
      }
    } catch (err: any) {
      salvarStatusSincronizacao({
        sucesso: false,
        emAndamento: false,
        erro: err?.message || "Falha ao gravar no GitHub",
      });
    }
  }, delayMs);
}

/**
 * Sincroniza todas as preferências com o GitHub.
 * 1. Busca em paralelo tanto o arquivo consolidado .klaus/preferencias.json
 *    quanto os arquivos específicos (.klaus/favoritos.json, .klaus/menu.json, .klaus/widgets.json).
 * 2. Faz uma reconciliação inteligente para NUNCA perder atalhos de favoritos, ordem de menu ou widgets customizados.
 * 3. Aplica localmente no localStorage e notifica todos os componentes visualmente.
 * 4. Mantém a nuvem 100% atualizada e alinhada.
 */
export async function sincronizarTudoComGithub(
  cfg: Settings,
  opcoes: { forcarEnvioLocal?: boolean } = {},
): Promise<{ sucesso: boolean; mensagem?: string }> {
  if (!cfg.githubToken || !cfg.repoOwner || !cfg.repoName) {
    return { sucesso: false, mensagem: "Configurações do GitHub incompletas." };
  }

  if (sincronizacaoEmAndamento) {
    return { sucesso: true, mensagem: "Sincronização já em andamento." };
  }

  sincronizacaoEmAndamento = true;
  salvarStatusSincronizacao({ sucesso: true, emAndamento: true });

  try {
    if (opcoes.forcarEnvioLocal) {
      const payload = lerTodasPreferenciasLocal();
      const conteudo = JSON.stringify(payload, null, 2);
      let shaFinal = ultimoShaPreferencias;
      if (!shaFinal) {
        try {
          const res = await ler(cfg, CAMINHO_PREFERENCIAS, { silenciar404: true });
          if (res?.sha) shaFinal = res.sha;
        } catch {}
      }
      const novoSha = await gravar(
        cfg,
        CAMINHO_PREFERENCIAS,
        conteudo,
        shaFinal,
        "config: envio forçado de preferências locais para a nuvem",
      );
      if (novoSha) ultimoShaPreferencias = novoSha;
      const agora = new Date().toISOString();
      salvarStatusSincronizacao({ sucesso: true, emAndamento: false, ultimaSincronizacao: agora });
      return { sucesso: true, mensagem: "Preferências locais enviadas com sucesso para o GitHub!" };
    }

    // Busca remota em paralelo de todas as fontes de preferências
    const [resPrefs, resFav, resMenu, resWid] = await Promise.all([
      ler(cfg, CAMINHO_PREFERENCIAS, { silenciar404: true }).catch(() => null),
      ler(cfg, CAMINHO_FAVORITOS, { silenciar404: true }).catch(() => null),
      ler(cfg, CAMINHO_MENU, { silenciar404: true }).catch(() => null),
      ler(cfg, CAMINHO_WIDGETS, { silenciar404: true }).catch(() => null),
    ]);

    let prefsConsolidadas: Partial<PreferenciasKlausConsolidadas> | null = null;
    if (resPrefs?.texto) {
      registrarShaPreferencias(resPrefs.sha);
      try {
        const parsed = JSON.parse(resPrefs.texto);
        if (parsed && typeof parsed === "object") {
          prefsConsolidadas = parsed;
        }
      } catch {}
    }

    // 1. Extrair e validar Favoritos Remotos
    let favoritosRemotos: FavoritoItem[] | undefined;
    if (resFav?.texto) {
      try {
        const parsed = JSON.parse(resFav.texto);
        if (Array.isArray(parsed) && parsed.length > 0) {
          favoritosRemotos = parsed.filter(
            (it) => it && typeof it === "object" && typeof it.url === "string",
          );
        }
      } catch {}
    }

    // 2. Extrair e validar Menu Remoto
    let menuRemoto: GrupoMenuPersonalizado[] | undefined;
    if (resMenu?.texto) {
      try {
        const parsed = JSON.parse(resMenu.texto);
        if (Array.isArray(parsed) && parsed.length > 0) {
          menuRemoto = parsed.filter(
            (g) => g && typeof g === "object" && Array.isArray(g.itens),
          );
        }
      } catch {}
    }

    // 3. Extrair e validar Widgets Remotos
    let widgetsRemotos: WidgetConfig[] | undefined;
    if (resWid?.texto) {
      try {
        const parsed = JSON.parse(resWid.texto);
        if (Array.isArray(parsed) && parsed.length > 0) {
          widgetsRemotos = parsed.filter(
            (w) => w && typeof w === "object" && typeof w.id === "string",
          );
        }
      } catch {}
    }

    // Reconciliação inteligente:
    // Favoritos: se temos favoritos no arquivo específico .klaus/favoritos.json ou no consolidador
    const favsDoConsolidado = Array.isArray(prefsConsolidadas?.favoritos)
      ? prefsConsolidadas.favoritos.filter((it) => it && typeof it === "object" && typeof it.url === "string")
      : [];

    let favoritosFinais: FavoritoItem[] | undefined;
    if (favoritosRemotos && favoritosRemotos.length > 0 && favsDoConsolidado.length > 0) {
      // Mesclagem por ID para não perder nenhum favorito
      const mapa = new Map<string, FavoritoItem>();
      for (const f of favsDoConsolidado) mapa.set(f.id, f);
      for (const f of favoritosRemotos) mapa.set(f.id, f);
      favoritosFinais = Array.from(mapa.values());
    } else if (favoritosRemotos && favoritosRemotos.length > 0) {
      favoritosFinais = favoritosRemotos;
    } else if (favsDoConsolidado.length > 0) {
      favoritosFinais = favsDoConsolidado;
    }

    // Menu: escolhe a versão que contém personalizações
    const menuDoConsolidado = Array.isArray(prefsConsolidadas?.menu) && prefsConsolidadas.menu.length > 0
      ? prefsConsolidadas.menu
      : undefined;
    const menuFinal = menuRemoto || menuDoConsolidado;

    // Widgets
    const widgetsDoConsolidado = Array.isArray(prefsConsolidadas?.widgets) && prefsConsolidadas.widgets.length > 0
      ? prefsConsolidadas.widgets
      : undefined;
    const widgetsFinais = widgetsRemotos || widgetsDoConsolidado;

    // Gerais (tema, etc.)
    const geraisFinais = prefsConsolidadas?.gerais;

    const locais = lerTodasPreferenciasLocal();
    const resultadoConsolidado: PreferenciasKlausConsolidadas = {
      versaoSchema: 2,
      atualizadoEm: new Date().toISOString(),
      favoritos: favoritosFinais || locais.favoritos,
      menu: menuFinal || locais.menu,
      widgets: widgetsFinais || locais.widgets,
      gerais: geraisFinais || locais.gerais,
    };

    // Aplica no localStorage e dispara eventos para a interface se atualizar na hora
    aplicarTodasPreferenciasLocal(resultadoConsolidado);

    // Se houve dados encontrados ou reconciliação, garante persistência no arquivo unificado
    if (favoritosFinais || menuFinal || widgetsFinais || geraisFinais) {
      agendarPersistenciaPreferenciasRemoto(cfg, null, 1000);
    }

    const agora = new Date().toISOString();
    salvarStatusSincronizacao({ sucesso: true, emAndamento: false, ultimaSincronizacao: agora });
    return { sucesso: true, mensagem: "Preferências sincronizadas com sucesso!" };
  } catch (err: any) {
    salvarStatusSincronizacao({
      sucesso: false,
      emAndamento: false,
      erro: err?.message || "Erro durante a sincronização",
    });
    return { sucesso: false, mensagem: err?.message || "Erro durante a sincronização" };
  } finally {
    sincronizacaoEmAndamento = false;
  }
}
