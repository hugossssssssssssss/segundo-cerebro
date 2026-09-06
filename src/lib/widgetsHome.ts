import type { Settings } from "./settings";
import { ler, gravar } from "./github";
import { type WidgetConfig, CONFIG_PADRAO_WIDGETS } from "@/components/home/types";

export const CAMINHO_WIDGETS = ".klaus/widgets.json";
export const CHAVE_STORAGE_WIDGETS = "klaus_home_bento_config_v3";
export const EVENTO_WIDGETS_ATUALIZADOS = "klaus-widgets-atualizados";

let ultimoShaWidgets: string | undefined = undefined;
let timerDebounceWidgets: ReturnType<typeof setTimeout> | null = null;

export function registrarShaWidgets(sha?: string): void {
  if (sha) ultimoShaWidgets = sha;
}

export function obterShaWidgets(): string | undefined {
  return ultimoShaWidgets;
}

/**
 * Carrega a configuração dos widgets da Home salva no localStorage.
 */
export function carregarConfigWidgetsLocal(): WidgetConfig[] {
  try {
    const salvo = localStorage.getItem(CHAVE_STORAGE_WIDGETS);
    if (!salvo) return CONFIG_PADRAO_WIDGETS;

    const parsed = JSON.parse(salvo);
    if (!Array.isArray(parsed) || parsed.length === 0) {
      return CONFIG_PADRAO_WIDGETS;
    }

    const validos = parsed.filter(
      (w) => w && typeof w === "object" && typeof w.id === "string" && typeof w.ativo === "boolean",
    );

    return validos.length > 0 ? validos : CONFIG_PADRAO_WIDGETS;
  } catch {
    return CONFIG_PADRAO_WIDGETS;
  }
}

/**
 * Salva a configuração de widgets no localStorage e emite evento para a UI.
 */
export function salvarConfigWidgetsLocal(novaConfig: WidgetConfig[]): void {
  try {
    localStorage.setItem(CHAVE_STORAGE_WIDGETS, JSON.stringify(novaConfig));
    window.dispatchEvent(
      new CustomEvent(EVENTO_WIDGETS_ATUALIZADOS, { detail: novaConfig }),
    );
  } catch (err) {
    console.error("[Klaus] Erro ao salvar widgets no localStorage:", err);
  }
}

/**
 * Enfileira a persistência assíncrona dos widgets no repositório GitHub com debounce.
 */
export function agendarPersistenciaWidgetsRemoto(
  cfg: Settings,
  config: WidgetConfig[],
  delayMs = 1200,
): void {
  if (!cfg.githubToken || !cfg.repoOwner || !cfg.repoName) return;

  if (timerDebounceWidgets) {
    clearTimeout(timerDebounceWidgets);
  }

  timerDebounceWidgets = setTimeout(async () => {
    timerDebounceWidgets = null;
    try {
      const conteudo = JSON.stringify(config, null, 2);
      let shaFinal = ultimoShaWidgets;
      if (!shaFinal) {
        try {
          const res = await ler(cfg, CAMINHO_WIDGETS, { silenciar404: true });
          if (res?.sha) shaFinal = res.sha;
        } catch {}
      }
      const novoSha = await gravar(
        cfg,
        CAMINHO_WIDGETS,
        conteudo,
        shaFinal,
        "config: atualizar layout de widgets da Home",
      );
      if (novoSha) ultimoShaWidgets = novoSha;
    } catch {
      // Falha silenciosa de rede mantém localStorage íntegro
    }
  }, delayMs);
}

/**
 * Carrega a configuração de widgets do repositório GitHub e sincroniza com o localStorage.
 */
export async function sincronizarWidgetsComGithub(
  cfg: Settings,
): Promise<{ sincronizado: boolean; config: WidgetConfig[] }> {
  const locais = carregarConfigWidgetsLocal();
  if (!cfg.githubToken || !cfg.repoOwner || !cfg.repoName) {
    return { sincronizado: false, config: locais };
  }

  try {
    const res = await ler(cfg, CAMINHO_WIDGETS, { silenciar404: true });
    if (res?.texto) {
      registrarShaWidgets(res.sha);
      const parsed = JSON.parse(res.texto);
      if (Array.isArray(parsed) && parsed.length > 0) {
        localStorage.setItem(CHAVE_STORAGE_WIDGETS, JSON.stringify(parsed));
        window.dispatchEvent(
          new CustomEvent(EVENTO_WIDGETS_ATUALIZADOS, { detail: parsed }),
        );
        return { sincronizado: true, config: parsed };
      }
    } else if (locais && locais.length > 0) {
      // Se não existe remoto, envia a configuração atual para o GitHub
      agendarPersistenciaWidgetsRemoto(cfg, locais, 1000);
    }
  } catch {
    // Falha silenciosa de rede
  }

  return { sincronizado: false, config: locais };
}
