import type { Settings } from "./settings";
import { ler, gravar } from "./github";
import { sincronizarMenuComGithub } from "./menuPersonalizado";
import { carregarFavoritos } from "./favoritos";
import { sincronizarWidgetsComGithub } from "./widgetsHome";
import { lerTemaSalvo, aplicarTema, type Tema } from "./tema";

export const CAMINHO_PREFERENCIAS = ".klaus/preferencias.json";
export const CHAVE_STORAGE_PREFERENCIAS = "klaus_preferencias_gerais";
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

let ultimoShaPreferencias: string | undefined = undefined;
let timerDebouncePreferencias: ReturnType<typeof setTimeout> | null = null;

export function registrarShaPreferencias(sha?: string): void {
  if (sha) ultimoShaPreferencias = sha;
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
 * Aplica as preferências no localStorage e nos componentes do sistema.
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
 * Enfileira a gravação de preferências gerais no GitHub (.klaus/preferencias.json).
 */
export function agendarPersistenciaPreferenciasRemoto(
  cfg: Settings,
  prefs?: PreferenciasGerais,
  delayMs = 1500,
): void {
  if (!cfg.githubToken || !cfg.repoOwner || !cfg.repoName) return;

  if (timerDebouncePreferencias) {
    clearTimeout(timerDebouncePreferencias);
  }

  const prefsParaSalvar = prefs || lerPreferenciasGeraisLocal();

  timerDebouncePreferencias = setTimeout(async () => {
    timerDebouncePreferencias = null;
    try {
      const conteudo = JSON.stringify(prefsParaSalvar, null, 2);
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
        "config: atualizar preferências gerais do usuário",
      );
      if (novoSha) ultimoShaPreferencias = novoSha;
    } catch {
      // Falha silenciosa
    }
  }, delayMs);
}

/**
 * Sincroniza preferências gerais com o repositório GitHub.
 */
export async function sincronizarPreferenciasComGithub(
  cfg: Settings,
): Promise<{ sincronizado: boolean; prefs: PreferenciasGerais }> {
  const locais = lerPreferenciasGeraisLocal();
  if (!cfg.githubToken || !cfg.repoOwner || !cfg.repoName) {
    return { sincronizado: false, prefs: locais };
  }

  try {
    const res = await ler(cfg, CAMINHO_PREFERENCIAS, { silenciar404: true });
    if (res?.texto) {
      registrarShaPreferencias(res.sha);
      const parsed = JSON.parse(res.texto);
      if (parsed && typeof parsed === "object") {
        aplicarPreferenciasGerais(parsed);
        return { sincronizado: true, prefs: parsed };
      }
    } else {
      // Se não existe remoto, envia as configurações locais
      agendarPersistenciaPreferenciasRemoto(cfg, locais, 1000);
    }
  } catch {
    // Falha silenciosa
  }

  return { sincronizado: false, prefs: locais };
}

/**
 * Sincroniza absolutamente TODAS as personalizações do usuário com o repositório GitHub:
 * 1. Barra de Favoritos (.klaus/favoritos.json)
 * 2. Personalização do Menu Lateral (.klaus/menu.json)
 * 3. Layout e Widgets da Home (.klaus/widgets.json)
 * 4. Preferências Gerais (.klaus/preferencias.json)
 */
export async function sincronizarTudoComGithub(cfg: Settings): Promise<void> {
  if (!cfg.githubToken || !cfg.repoOwner || !cfg.repoName) return;

  try {
    await Promise.allSettled([
      carregarFavoritos(cfg),
      sincronizarMenuComGithub(cfg),
      sincronizarWidgetsComGithub(cfg),
      sincronizarPreferenciasComGithub(cfg),
    ]);
  } catch (err) {
    console.error("[Klaus] Erro na sincronização global de preferências:", err);
  }
}
