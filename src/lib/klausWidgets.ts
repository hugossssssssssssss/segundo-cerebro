import type { Settings } from "./settings";
import { ler, gravar } from "./github";
import {
  type WidgetConfig,
  type InfoWidgetCatalogo,
  CONFIG_PADRAO_WIDGETS,
  CATALOGO_WIDGETS,
} from "@/components/home/types";
import {
  carregarMenuPersonalizado,
  type GrupoMenuPersonalizado,
  type ItemMenuPersonalizado,
} from "./klausMenu";
import { KLAUS_STORAGE, getKlausJson, setKlausJson } from "./klausStorage";
import { KLAUS_EVENTS, dispatchKlausEvent } from "./klausEvents";
import { verificarExtensaoInstalada } from "./klausExtensionCatalog";

export const CAMINHO_WIDGETS = ".klaus/widgets.json";
export const CHAVE_STORAGE_WIDGETS = KLAUS_STORAGE.WIDGETS_HOME;
export const EVENTO_WIDGETS_ATUALIZADOS = KLAUS_EVENTS.WIDGETS_CHANGE;

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
    const parsed = getKlausJson<WidgetConfig[]>(KLAUS_STORAGE.WIDGETS_HOME);
    if (!parsed || !Array.isArray(parsed) || parsed.length === 0) {
      return CONFIG_PADRAO_WIDGETS;
    }

    const validos = parsed.filter(
      (w) =>
        w &&
        typeof w === "object" &&
        typeof w.id === "string" &&
        typeof w.ativo === "boolean" &&
        estaWidgetDisponivel(w.id),
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
    setKlausJson(KLAUS_STORAGE.WIDGETS_HOME, novaConfig);
    dispatchKlausEvent(KLAUS_EVENTS.WIDGETS_CHANGE, novaConfig);
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

      // Mantém o arquivo consolidado .klaus/preferencias.json sincronizado
      import("./klausPreferences")
        .then((m) => m.agendarPersistenciaPreferenciasRemoto(cfg, null, 1000))
        .catch(() => {});
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
        setKlausJson(KLAUS_STORAGE.WIDGETS_HOME, parsed);
        dispatchKlausEvent(KLAUS_EVENTS.WIDGETS_CHANGE, parsed);
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

/**
 * Mapeia quais widgets dependem de extensões modulares baixadas no repositório.
 * Se o widget não estiver nesta lista, é considerado Core do Klaus e fica sempre disponível.
 */
export const MAPA_WIDGET_EXTENSAO: Record<string, string> = {
  baixador_midia: "baixador",
  conversor_arquivos: "conversor",
  ferramentas_pdf: "pdf",
  it_tools: "it_tools",
  transcritor_voz: "transcritor",
  sons_foco: "sons",
  hardware_test: "testador_hardware",
};

/**
 * Verifica se um widget está liberado para exibição.
 * Widgets de extensões só são permitidos se a extensão estiver baixada e instalada.
 */
export function estaWidgetDisponivel(widgetId: string): boolean {
  const idExtensao = MAPA_WIDGET_EXTENSAO[widgetId];
  if (!idExtensao) return true; // Widgets Core sempre disponíveis
  return verificarExtensaoInstalada(idExtensao);
}

/**
 * Mapeamento entre os IDs de cada Widget e o item/rota correspondente no Menu Lateral.
 */
export const MAPA_WIDGET_MENU: Record<string, { rota?: string; idMenu?: string }> = {
  foco_hoje: { rota: "/tarefas", idMenu: "tarefas" },
  notas_recentes: { rota: "/notas", idMenu: "notas" },
  referencias_mural: { rota: "/referencias", idMenu: "referencias" },
  metas_pdi: { rota: "/pdi", idMenu: "pdi" },
  lousas_recentes: { rota: "/lousas", idMenu: "lousas" },
  baixador_midia: { rota: "/baixador", idMenu: "baixador" },
  conversor_arquivos: { rota: "/conversor", idMenu: "conversor" },
  ferramentas_pdf: { rota: "/pdf", idMenu: "pdf" },
  it_tools: { rota: "/it-tools", idMenu: "it_tools" },
  transcritor_voz: { rota: "/transcritor", idMenu: "transcritor" },
  sons_foco: { rota: "/sons", idMenu: "sons" },
  hardware_test: { rota: "/testador", idMenu: "testador_hardware" },
  grafo_neural: { rota: "/grafo", idMenu: "grafo" },
  chat_ia: { rota: "/chat", idMenu: "chat" },
  calendario_home: { rota: "/tarefas", idMenu: "tarefas" },
};

/**
 * Retorna o catálogo de widgets aplicando os títulos, ícones e cores
 * personalizados pelo usuário no menu lateral ("Personalizar Menu"),
 * garantindo que apenas widgets do Core e de extensões instaladas sejam exibidos.
 */
export function obterCatalogoWidgetsPersonalizado(
  gruposMenu: GrupoMenuPersonalizado[] = carregarMenuPersonalizado()
): InfoWidgetCatalogo[] {
  const mapaMenuPorRota = new Map<string, ItemMenuPersonalizado>();
  const mapaMenuPorId = new Map<string, ItemMenuPersonalizado>();

  for (const g of gruposMenu) {
    for (const it of g.itens || []) {
      if (it?.para) mapaMenuPorRota.set(it.para.toLowerCase(), it);
      if (it?.id) mapaMenuPorId.set(it.id.toLowerCase(), it);
    }
  }

  // Filtra apenas widgets disponíveis (Core ou extensões baixadas)
  const disponiveis = CATALOGO_WIDGETS.filter((w) => estaWidgetDisponivel(w.id));

  return disponiveis.map((w) => {
    const rel = MAPA_WIDGET_MENU[w.id];
    if (!rel) return w;

    const custom =
      (rel.idMenu ? mapaMenuPorId.get(rel.idMenu.toLowerCase()) : undefined) ||
      (rel.rota ? mapaMenuPorRota.get(rel.rota.toLowerCase()) : undefined);

    if (!custom) return w;

    return {
      ...w,
      titulo: (custom.rotulo && custom.rotulo.trim()) ? custom.rotulo.trim() : w.titulo,
      icone: (custom.iconeNome && custom.iconeNome.trim()) ? custom.iconeNome.trim() : w.icone,
      cor: custom.cor,
    };
  });
}

/**
 * Obtém a informação de um widget específico com os nomes e ícones personalizados.
 */
export function obterInfoWidgetPersonalizado(
  widgetId: string,
  gruposMenu: GrupoMenuPersonalizado[] = carregarMenuPersonalizado()
): InfoWidgetCatalogo | undefined {
  const catalogo = obterCatalogoWidgetsPersonalizado(gruposMenu);
  return catalogo.find((w) => w.id === widgetId);
}

// ── Nomes Canônicos do Klaus SDK ─────────────────────────────────────────────
export const loadKlausWidgets = carregarConfigWidgetsLocal;
export const saveKlausWidgets = salvarConfigWidgetsLocal;
export const syncKlausWidgets = sincronizarWidgetsComGithub;
export const scheduleKlausWidgetsPersistence = agendarPersistenciaWidgetsRemoto;
export const getKlausCustomWidgetCatalog = obterCatalogoWidgetsPersonalizado;
