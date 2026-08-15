import { useEffect, useState, useRef, lazy, Suspense } from "react";
import type { ExcalidrawInitialDataState } from "@excalidraw/excalidraw/types";
import { Link } from "react-router-dom";
import {
  Plus,
  Layout,
  ArrowLeft,
  Save,
  Trash2,
  Maximize2,
  Minimize2,
  Copy,
  Check,
  Link as LinkIcon,
} from "lucide-react";
import "@excalidraw/excalidraw/index.css";
import { lerConfig, configCompleta } from "@/lib/settings";
import { lerOuVazio } from "@/lib/github";
import { removerDoCacheLocal, type ItemRepo } from "@/lib/repo";
import { useItemRepo } from "@/lib/useItemRepo";
import { useSalvar } from "@/lib/useSalvar";
import { PASTAS } from "@/lib/tipos";
import { tituloProvavel, nomeLivre, escreverMarkdown, lerMarkdown } from "@/lib/markdown";
import { propagarRenomeacao } from "@/lib/links";
import { Botao, Campo, Cartao, Aviso, Vazio, Carregando, ModalConfirmacao } from "@/components/ui";

const PASTA = PASTAS.lousas;

const ExcalidrawComp = lazy(() =>
  import("@excalidraw/excalidraw").then((m) => ({ default: m.Excalidraw })),
);

type DadosLousa = {
  title?: string;
  elements?: unknown[];
  appState?: Record<string, unknown>;
  files?: unknown;
};

type LousaAberta = {
  caminho: string;
  sha: string;
  titulo: string;
  tituloOriginal: string;
  dados: DadosLousa;
};

export default function Lousas() {
  const cfg = lerConfig();
  const pronto = configCompleta(cfg);

  // ── Carregamento ──────────────────────────────────────────────────────────
  // useItemRepo retorna ItemRepo[] — lousas têm tratamento especial de abertura
  // então não as convertemos aqui (a conversão acontece no `abrir`)
  const { itens: lousas, carregando, erro: erroCarregar, recarregar } =
    useItemRepo(cfg, PASTA, (item) => item);

  // ── Salvamento ────────────────────────────────────────────────────────────
  // Uma única instância: duas chamadas criariam dois estados `salvando`/`erro`
  // independentes, e o do apagar nunca chegaria à tela.
  const { salvarTexto, apagarItem, salvando, erro: erroSalvar } = useSalvar(cfg);

  // ── Estado da UI ──────────────────────────────────────────────────────────
  const [erroLocal, setErroLocal] = useState("");
  const [mensagemSucesso, setMensagemSucesso] = useState("");
  const erro = erroLocal || erroCarregar || erroSalvar;

  const [aberta, setAberta] = useState<LousaAberta | null>(null);
  const [copiadoId, setCopiadoId] = useState<string | null>(null);
  const [telaCheia, setTelaCheia] = useState(false);
  const [lousaParaDeletar, setLousaParaDeletar] = useState<{ caminho: string; sha: string; titulo: string } | null>(null);

  const [excalidrawAPI, setExcalidrawAPI] = useState<any>(null);
  const elementsRef = useRef<unknown[]>([]);
  const appStateRef = useRef<Record<string, unknown>>({});
  const filesRef = useRef<unknown>({});

  // ── Abre uma lousa (carrega JSON do corpo) ─────────────────────────────────
  async function abrir(item: ItemRepo) {
    setErroLocal("");
    setMensagemSucesso("");
    try {
      let conteudo = item.texto || "";
      if (!conteudo) {
        conteudo = await lerOuVazio(cfg, item.caminho, item.sha);
      }
      const docParsed = item.doc && item.doc.corpo ? item.doc : lerMarkdown(conteudo);
      let dados: DadosLousa = { elements: [] };
      let titulo = (item.doc.dados.titulo as string) || (docParsed.dados.titulo as string) || tituloProvavel(item.doc, item.nome);

      const textoCena = docParsed.corpo && docParsed.corpo.trim().startsWith("{")
        ? docParsed.corpo.trim()
        : (conteudo.trim().startsWith("{") ? conteudo.trim() : "");

      try {
        if (textoCena) {
          const parsed = JSON.parse(textoCena);
          if (Array.isArray(parsed)) {
            dados = { elements: parsed };
          } else if (parsed && typeof parsed === "object") {
            dados = parsed;
            if ((parsed as Record<string, unknown>).title || (parsed as Record<string, unknown>).titulo) {
              titulo = (parsed as Record<string, unknown>).title as string || (parsed as Record<string, unknown>).titulo as string;
            }
          }
        }
      } catch {
        dados = { elements: [] };
      }

      elementsRef.current = (dados.elements as unknown[]) || [];
      appStateRef.current = (dados.appState as Record<string, unknown>) || {};
      filesRef.current = dados.files || {};

      setAberta({
        caminho: item.caminho,
        sha: item.sha,
        titulo: titulo || "Lousa Sem Título",
        tituloOriginal: titulo || "Lousa Sem Título",
        dados,
      });
    } catch (e) {
      setErroLocal(e instanceof Error ? e.message : String(e));
    }
  }

  // ── Abertura automática via parâmetro de URL ───────────────────────────────
  useEffect(() => {
    function checarParametros() {
      const hash = window.location.hash;
      if (hash.includes("abrir=") && lousas.length > 0) {
        const urlParams = new URLSearchParams(hash.split("?")[1] || "");
        const caminhoAbrir = urlParams.get("abrir");
        if (caminhoAbrir) {
          const target = caminhoAbrir.toLowerCase().trim();
          const itemEncontrado = lousas.find((i) => {
            const t = ((i.doc.dados.titulo as string) || tituloProvavel(i.doc, i.nome)).toLowerCase().trim();
            const c = i.caminho.toLowerCase().trim();
            const base = i.nome.replace(/\.(md|json|excalidraw)$/i, "").toLowerCase().trim();
            return c === target || c.includes(target) || t === target || t.includes(target) || base === target;
          });
          if (itemEncontrado && (!aberta || aberta.caminho !== itemEncontrado.caminho)) {
            window.history.replaceState(null, "", window.location.pathname + "#/lousas");
            abrir(itemEncontrado);
          }
        }
      }
    }

    checarParametros();
    window.addEventListener("hashchange", checarParametros);
    return () => window.removeEventListener("hashchange", checarParametros);
  }, [lousas, aberta]);

  // ── Ações ──────────────────────────────────────────────────────────────────

  function novaLousa() {
    elementsRef.current = [];
    appStateRef.current = {};
    filesRef.current = {};
    setAberta({
      caminho: "",
      sha: "",
      titulo: "Novo Mapa Mental",
      tituloOriginal: "",
      dados: { elements: [] },
    });
  }

  async function salvar() {
    if (!aberta) return;
    setErroLocal("");
    setMensagemSucesso("");

    try {
      const apiElements = excalidrawAPI ? excalidrawAPI.getSceneElements() : null;
      let elementsToSave = (apiElements && apiElements.length > 0) ? apiElements : [];
      if (elementsToSave.length === 0 && elementsRef.current && elementsRef.current.length > 0) {
        elementsToSave = elementsRef.current;
      }
      if (elementsToSave.length === 0 && aberta.dados?.elements) {
        elementsToSave = aberta.dados.elements;
      }

      const currentAppState: Record<string, unknown> = excalidrawAPI
        ? (excalidrawAPI.getAppState() || {})
        : (appStateRef.current || {});
      const files = excalidrawAPI
        ? (excalidrawAPI.getFiles() || {})
        : (filesRef.current || {});

      const elementosValidos = Array.isArray(elementsToSave)
        ? elementsToSave.filter((el: any) => !el.isDeleted)
        : [];

      const tituloLimpo = aberta.titulo.trim() || "Lousa Sem Título";
      const ehModoEscuro = document.documentElement.classList.contains("dark");

      // Gera preview SVG
      let svgHtmlString = "";
      try {
        if (elementosValidos.length > 0) {
          const { exportToSvg } = await import("@excalidraw/excalidraw");
          const svgEl = await exportToSvg({
            elements: elementosValidos,
            appState: {
              ...currentAppState,
              exportWithDarkMode: ehModoEscuro,
              exportBackground: true,
              viewBackgroundColor: (currentAppState?.viewBackgroundColor as string) || (ehModoEscuro ? "#121212" : "#ffffff"),
            },
            files,
          });
          if (svgEl) {
            svgEl.setAttribute("width", "100%");
            svgEl.setAttribute("height", "100%");
            svgEl.style.maxWidth = "100%";
            svgEl.style.maxHeight = "100%";
            svgHtmlString = svgEl.outerHTML;
          }
        }
      } catch {
        // ignora erro ao gerar SVG
      }

      const dadosParaSalvar = {
        title: tituloLimpo,
        elements: elementosValidos,
        appState: {
          viewBackgroundColor: currentAppState.viewBackgroundColor || "#ffffff",
          gridSize: currentAppState.gridSize || null,
        },
        files,
      };

      const textoCena = JSON.stringify(dadosParaSalvar, null, 2);
      const textoParaGravar = escreverMarkdown({
        dados: {
          titulo: tituloLimpo,
          tipo: "lousa",
          svg: svgHtmlString,
        },
        corpo: textoCena,
      });

      const novoCaminho = aberta.caminho ||
        nomeLivre(PASTA, tituloLimpo, lousas.map((a) => a.caminho));

      const novaSha = await salvarTexto(
        novoCaminho,
        textoParaGravar,
        aberta.sha || undefined,
        `salvar lousa: ${tituloLimpo}`,
      );

      setAberta({
        caminho: novoCaminho,
        sha: novaSha,
        titulo: tituloLimpo,
        tituloOriginal: tituloLimpo,
        dados: dadosParaSalvar,
      });

      if (aberta.tituloOriginal && aberta.tituloOriginal !== tituloLimpo) {
        propagarRenomeacao(cfg, lousas, aberta.tituloOriginal, tituloLimpo).catch(() => {});
      }

      setMensagemSucesso(`Lousa "${tituloLimpo}" salva com sucesso! (${elementosValidos.length} elementos gravados)`);
      recarregar();
    } catch {
      // erro já está em erroSalvar
    }
  }

  async function executarExclusao() {
    if (!lousaParaDeletar) return;
    const { caminho: alvoCaminho, sha: alvoSha } = lousaParaDeletar;
    setLousaParaDeletar(null);

    // Remoção visual instantânea
    removerDoCacheLocal(alvoCaminho);
    if (aberta && aberta.caminho === alvoCaminho) setAberta(null);

    try {
      await apagarItem(alvoCaminho, alvoSha || "");
      recarregar();
    } catch (e) {
      setErroLocal(e instanceof Error ? e.message : String(e));
      recarregar();
    }
  }

  function copiarWikilink(caminho: string, titulo: string, e?: React.MouseEvent) {
    if (e) e.stopPropagation();
    const link = `@${titulo}`;
    navigator.clipboard.writeText(link);
    setCopiadoId(caminho);
    setTimeout(() => setCopiadoId(null), 2000);
  }

  // ── Sem configuração ────────────────────────────────────────────────────────
  if (!pronto) {
    return (
      <Vazio
        titulo="Falta conectar sua conta"
        descricao="Preencha sua conta do GitHub e o token na aba de Ajustes."
        acao={
          <Link to="/config">
            <Botao>Ir para Ajustes</Botao>
          </Link>
        }
      />
    );
  }

  const ehModoEscuro = document.documentElement.classList.contains("dark");

  if (aberta) {
    return (
      <div
        className={
          telaCheia
            ? "fixed inset-0 z-50 bg-background flex flex-col p-4 space-y-3"
            : "flex flex-col gap-4 h-[calc(100vh-120px)] w-full"
        }
      >
        {/* Barra Superior da Lousa Aberta */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/60 pb-3">
          <div className="flex items-center gap-2 flex-1 max-w-md">
            <Botao variante="fantasma" tamanho="pequeno" onClick={() => setAberta(null)}>
              <ArrowLeft size={16} />
              <span>Voltar</span>
            </Botao>
            <Campo
              value={aberta.titulo}
              onChange={(e) => setAberta({ ...aberta, titulo: e.target.value })}
              placeholder="Nome do Mapa Mental / Lousa"
              className="text-base font-semibold"
            />
          </div>

          <div className="flex items-center gap-2">
            {aberta.caminho && (
              <Botao
                variante="neutro"
                tamanho="pequeno"
                onClick={(e) => copiarWikilink(aberta.caminho, aberta.titulo, e)}
                className="flex items-center gap-1.5"
              >
                {copiadoId === aberta.caminho ? <Check size={14} /> : <LinkIcon size={14} />}
                <span>{copiadoId === aberta.caminho ? "Copiado!" : `Copiar @${aberta.titulo}`}</span>
              </Botao>
            )}

            <Botao
              variante="neutro"
              tamanho="pequeno"
              onClick={() => setTelaCheia(!telaCheia)}
              className="flex items-center gap-1.5"
            >
              {telaCheia ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
              <span>{telaCheia ? "Sair da Tela Cheia" : "Tela Cheia"}</span>
            </Botao>

            {aberta.caminho && (
              <Botao
                variante="fantasma"
                tamanho="icone"
                onClick={() => setLousaParaDeletar({ caminho: aberta.caminho, sha: aberta.sha, titulo: aberta.titulo })}
                title="Apagar lousa"
              >
                <Trash2 size={16} className="text-red-500" />
              </Botao>
            )}

            <Botao variante="primario" tamanho="pequeno" onClick={salvar} disabled={salvando}>
              <Save size={15} />
              <span>{salvando ? "Salvando..." : "Salvar Lousa"}</span>
            </Botao>
          </div>
        </div>

        {erro && <Aviso tom="erro">{erro}</Aviso>}
        {mensagemSucesso && <Aviso tom="sucesso">{mensagemSucesso}</Aviso>}

        {/* Canvas do Excalidraw */}
        <div className="flex-1 w-full min-h-[500px] rounded-2xl overflow-hidden border border-border shadow-md bg-background relative">
          <Suspense fallback={<Carregando texto="Carregando editor visual Excalidraw..." />}>
            <ExcalidrawComp
              key={aberta?.caminho ? `excalidraw-${aberta.caminho}` : "excalidraw-nova"}
              excalidrawAPI={(api: any) => setExcalidrawAPI(api)}
              theme={ehModoEscuro ? "dark" : "light"}
              onChange={(elements: any, appState: any, files: any) => {
                elementsRef.current = elements as unknown[];
                appStateRef.current = appState;
                filesRef.current = files;
              }}
              /*
               * A cena vem de um .md que pode ter sido editado à mão, então o
               * tipo interno é deliberadamente frouxo (`unknown`). Aqui é a
               * fronteira com a biblioteca: um cast só, explícito, em vez de
               * `any` espalhado pelo arquivo. O Excalidraw valida em runtime e
               * cai para uma cena vazia se o JSON não servir.
               */
              initialData={{
                elements: aberta.dados.elements ?? [],
                appState: {
                  ...(aberta.dados.appState ?? {}),
                  viewBackgroundColor:
                    (aberta.dados.appState?.viewBackgroundColor as string) ||
                    (ehModoEscuro ? "#121212" : "#ffffff"),
                  gridSize: aberta.dados.appState?.gridSize as number | undefined,
                  scrollX: (aberta.dados.appState?.scrollX as number) || 0,
                  scrollY: (aberta.dados.appState?.scrollY as number) || 0,
                  zoom: (aberta.dados.appState?.zoom as { value: number }) ?? { value: 1 },
                },
                files: aberta.dados.files ?? {},
              } as unknown as ExcalidrawInitialDataState}
              UIOptions={{
                canvasActions: {
                  changeViewBackgroundColor: true,
                  clearCanvas: true,
                  loadScene: true,
                  saveToActiveFile: true,
                  toggleTheme: true,
                },
              }}
            />
          </Suspense>
        </div>

        <ModalConfirmacao
          aberto={Boolean(lousaParaDeletar)}
          titulo={`Apagar "${lousaParaDeletar?.titulo || 'Lousa'}"?`}
          descricao="Esta ação apagará permanentemente este mapa mental do seu repositório. Deseja continuar?"
          textoConfirmar="Apagar Lousa"
          textoCancelar="Cancelar"
          varianteConfirmar="perigo"
          aoConfirmar={executarExclusao}
          aoCancelar={() => setLousaParaDeletar(null)}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between gap-3 border-b border-border/60 pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Layout size={20} />
            </div>
            Excalidraw (Mapas Mentais &amp; Lousas)
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Desenhe diagramas, mapas mentais e conecte aos seus projetos, notas e metas.
          </p>
        </div>
        <Botao variante="primario" onClick={novaLousa}>
          <Plus size={16} />
          <span>Nova Lousa</span>
        </Botao>
      </div>

      {erro && <Aviso tom="erro">{erro}</Aviso>}
      {mensagemSucesso && <Aviso tom="sucesso">{mensagemSucesso}</Aviso>}

      {carregando ? (
        <Carregando texto="Carregando suas lousas e mapas mentais..." />
      ) : lousas.length === 0 ? (
        <Vazio
          titulo="Nenhuma lousa criada ainda"
          descricao="Crie seu primeiro mapa mental ou diagrama visual."
          acao={<Botao onClick={novaLousa}>Criar Primeira Lousa</Botao>}
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {lousas.map((item) => {
            const titulo = (item.doc.dados.titulo as string) || tituloProvavel(item.doc, item.nome);
            return (
              <Cartao
                key={item.caminho}
                onClick={() => abrir(item)}
                className="group cursor-pointer p-4 hover:border-primary/50 transition-colors flex items-center justify-between gap-3 bg-card"
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="rounded-xl bg-primary/10 p-3 text-primary shrink-0">
                    <Layout size={22} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-sm text-foreground truncate">{titulo}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      Excalidraw • {item.caminho}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <Botao
                    variante="neutro"
                    tamanho="icone"
                    onClick={(e) => copiarWikilink(item.caminho, titulo, e)}
                    title="Copiar @nome para vincular em notas e metas"
                  >
                    {copiadoId === item.caminho ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
                  </Botao>
                  <Botao
                    variante="fantasma"
                    tamanho="icone"
                    onClick={(e) => {
                      e.stopPropagation();
                      setLousaParaDeletar({ caminho: item.caminho, sha: item.sha, titulo });
                    }}
                    title="Apagar lousa"
                    className="hover:bg-red-500/10 text-muted-foreground hover:text-red-500"
                  >
                    <Trash2 size={14} />
                  </Botao>
                </div>
              </Cartao>
            );
          })}
        </div>
      )}

      <ModalConfirmacao
        aberto={Boolean(lousaParaDeletar)}
        titulo={`Apagar "${lousaParaDeletar?.titulo || 'Lousa'}"?`}
        descricao="Esta ação apagará permanentemente este mapa mental do seu repositório. Deseja continuar?"
        textoConfirmar="Apagar Lousa"
        textoCancelar="Cancelar"
        varianteConfirmar="perigo"
        aoConfirmar={executarExclusao}
        aoCancelar={() => setLousaParaDeletar(null)}
      />
    </div>
  );
}
