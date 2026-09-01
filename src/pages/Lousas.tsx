import { useEffect, useState, useRef, useMemo, lazy, Suspense } from "react";
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
  Check,
  Link as LinkIcon,
  Download,
  LayoutGrid,
  List,
  Layers,
  MoreVertical,
} from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip } from "@/components/ui/tooltip";
import "@excalidraw/excalidraw/index.css";
import { lerConfig, configCompleta } from "@/lib/settings";
import { lerOuVazio } from "@/lib/github";
import { removerDoCacheLocal, type ItemRepo } from "@/lib/repo";
import { useItemRepo } from "@/lib/useItemRepo";
import { useSalvar } from "@/lib/useSalvar";
import { PASTAS } from "@/lib/tipos";
import { tituloProvavel, nomeLivre, escreverMarkdown, lerMarkdown } from "@/lib/markdown";
import { propagarRenomeacao } from "@/lib/links";
import { correspondeBusca, lerParametroAbrir } from "@/lib/utils";
import { Botao, Campo, Aviso, Vazio, Carregando, ModalConfirmacao } from "@/components/ui";
import { CabecalhoPagina } from "@/components/CabecalhoPagina";
import { BarraFerramentas } from "@/components/BarraFerramentas";
import { AlternadorVisao } from "@/components/AlternadorVisao";
import { SeloStatus } from "@/components/SeloStatus";
import { CartaoLousaVisual } from "@/components/CartaoLousaVisual";
import { toast } from "@/lib/toast";

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
  const { itens: lousas, carregando, erro: erroCarregar, recarregar } =
    useItemRepo(cfg, PASTA, (item) => item);

  // ── Salvamento ────────────────────────────────────────────────────────────
  const { salvarTexto, apagarItem, salvando, erro: erroSalvar } = useSalvar(cfg);

  // ── Estado da UI ──────────────────────────────────────────────────────────
  const [erroLocal, setErroLocal] = useState("");
  const [erroRenomeacao, setErroRenomeacao] = useState("");
  const erro = erroLocal || erroCarregar || erroSalvar;

  const [busca, setBusca] = useState("");
  const [modoVisao, setModoVisao] = useState<"grade" | "lista">(() => {
    const salvo = localStorage.getItem("klaus_modo_visao_lousas");
    return (salvo as "grade" | "lista") || "grade";
  });
  useEffect(() => {
    localStorage.setItem("klaus_modo_visao_lousas", modoVisao);
  }, [modoVisao]);

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
    setErroRenomeacao("");
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
              titulo = ((parsed as Record<string, unknown>).title as string) || ((parsed as Record<string, unknown>).titulo as string);
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
      const href = window.location.href;
      if (hash.includes("nova=true") || hash.includes("novo=true") || href.includes("nova=true") || href.includes("novo=true")) {
        window.history.replaceState(null, "", window.location.pathname + "#/lousas");
        novaLousa();
        return;
      }

      const caminhoAbrir = lerParametroAbrir(window.location);
      if (caminhoAbrir && lousas.length > 0) {
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
    setErroRenomeacao("");

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

      if (files && Object.keys(files).length > 0) {
        throw new Error(
          "O Klaus não suporta colar ou anexar imagens locais nas lousas para evitar lentidão de sincronismo e falha de salvamento no GitHub (limite de 5 MB). Por favor, remova as imagens locais antes de salvar."
        );
      }

      const elementosValidos = Array.isArray(elementsToSave)
        ? elementsToSave.filter((el: any) => !el.isDeleted)
        : [];

      const tituloLimpo = aberta.titulo.trim() || "Lousa Sem Título";

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

      const baseSucesso = `Lousa "${tituloLimpo}" salva com sucesso! (${elementosValidos.length} elementos gravados)`;
      toast(baseSucesso, { tipo: "sucesso" });

      if (aberta.tituloOriginal && aberta.tituloOriginal !== tituloLimpo) {
        try {
          const { atualizados, falhas } = await propagarRenomeacao(
            cfg,
            lousas,
            aberta.tituloOriginal,
            tituloLimpo,
          );

          if (falhas.length > 0) {
            setErroRenomeacao(
              `As menções a "${aberta.tituloOriginal}" foram atualizadas em ${atualizados} ` +
                `arquivo(s), mas ${falhas.length} falhou(aram): ${falhas.join(", ")}. ` +
                `Esses arquivos ainda apontam para o nome antigo — renomeie de novo para tentar outra vez.`,
            );
          } else if (atualizados > 0) {
            toast(
              `${baseSucesso} Menções atualizadas em ${atualizados} arquivo(s).`,
              { tipo: "sucesso" }
            );
          }
        } catch (e) {
          setErroRenomeacao(
            `A lousa foi salva, mas não foi possível atualizar as menções a ` +
              `"${aberta.tituloOriginal}" nos outros arquivos: ` +
              `${e instanceof Error ? e.message : String(e)}`,
          );
        }
      }

      recarregar();
    } catch {
      // erro já está em erroSalvar
    }
  }

  async function executarExclusao() {
    if (!lousaParaDeletar) return;
    const { caminho: alvoCaminho, sha: alvoSha } = lousaParaDeletar;
    setLousaParaDeletar(null);

    try {
      await apagarItem(alvoCaminho, alvoSha || "");
      removerDoCacheLocal(alvoCaminho);
      if (aberta && aberta.caminho === alvoCaminho) setAberta(null);
      recarregar();
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setErroLocal(msg);
      toast(`Erro ao excluir lousa no GitHub: ${msg}`, { tipo: "erro" });
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

  async function duplicarLousa(item: ItemRepo, e?: React.MouseEvent) {
    if (e) e.stopPropagation();
    try {
      const conteudo = item.texto || (await lerOuVazio(cfg, item.caminho, item.sha));
      const tituloOriginal = (item.doc.dados.titulo as string) || tituloProvavel(item.doc, item.nome);
      const novoTitulo = `${tituloOriginal} (Cópia)`;
      const novoCaminho = nomeLivre(PASTA, novoTitulo, lousas.map((a) => a.caminho));
      
      const docParsed = lerMarkdown(conteudo);
      const textoParaGravar = escreverMarkdown({
        dados: {
          ...docParsed.dados,
          titulo: novoTitulo,
          tipo: "lousa",
        },
        corpo: docParsed.corpo,
      });

      await salvarTexto(novoCaminho, textoParaGravar, undefined, `duplicar lousa: ${novoTitulo}`);
      recarregar();
      toast(`Lousa "${novoTitulo}" criada com sucesso!`, { tipo: "sucesso" });
    } catch (err: any) {
      toast(`Erro ao duplicar lousa: ${err?.message || err}`, { tipo: "erro" });
    }
  }

  // ── Lousas filtradas pela busca ───────────────────────────────────────────
  const visiveis = useMemo(() => {
    return lousas.filter((item) => {
      const titulo = (item.doc?.dados?.titulo as string) || tituloProvavel(item.doc, item.nome);
      return correspondeBusca(titulo, busca);
    });
  }, [lousas, busca]);

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

  // ── LOUSA ABERTA (CANVAS EXCALIDRAW) ───────────────────────────────────────
  if (aberta) {
    const totalElementosAtual = Array.isArray(aberta.dados?.elements)
      ? aberta.dados.elements.filter((el: any) => !el.isDeleted).length
      : 0;

    return (
      <div
        className={
          telaCheia
            ? "fixed inset-0 z-50 bg-background flex flex-col p-4 space-y-3"
            : "flex flex-col gap-4 h-[calc(100vh-120px)] w-full"
        }
      >
        {/* Barra Superior da Lousa Aberta com Divulgação Progressiva */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-card/90 backdrop-blur-md p-2.5 px-4 rounded-2xl border border-border/80 shadow-2xs">
          <div className="flex items-center gap-2 flex-1 max-w-lg min-w-0">
            <Tooltip conteudo="Voltar para a galeria de lousas" posicao="bottom">
              <Botao
                variante="fantasma"
                tamanho="icone"
                onClick={() => setAberta(null)}
                className="h-9 w-9 text-muted-foreground hover:text-foreground"
                aria-label="Voltar"
              >
                <ArrowLeft size={16} />
              </Botao>
            </Tooltip>

            <div className="h-5 w-px bg-border/60 mx-1 shrink-0" />

            <Campo
              value={aberta.titulo}
              onChange={(e) => setAberta({ ...aberta, titulo: e.target.value })}
              placeholder="Nome do Mapa Mental / Lousa"
              className="text-sm font-semibold flex-1 h-9"
            />
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Badge de contagem de elementos */}
            <span className="hidden sm:inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-xl bg-secondary text-muted-foreground border border-border/60">
              <Layers size={13} className="text-cyan-500" />
              {totalElementosAtual} {totalElementosAtual === 1 ? "elemento" : "elementos"}
            </span>

            <Tooltip conteudo={telaCheia ? "Sair da Tela Cheia" : "Tela Cheia"} posicao="bottom">
              <Botao
                variante="neutro"
                tamanho="icone"
                onClick={() => setTelaCheia(!telaCheia)}
                className="h-9 w-9"
                aria-label="Tela Cheia"
              >
                {telaCheia ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
              </Botao>
            </Tooltip>

            {aberta.caminho && (
              <Popover>
                <PopoverTrigger asChild>
                  <Botao
                    variante="neutro"
                    tamanho="icone"
                    className="h-9 w-9"
                    title="Mais opções da lousa"
                    aria-label="Mais opções"
                  >
                    <MoreVertical size={16} />
                  </Botao>
                </PopoverTrigger>
                <PopoverContent align="end" className="w-52 p-1.5 space-y-1">
                  <button
                    onClick={(e) => copiarWikilink(aberta.caminho, aberta.titulo, e)}
                    className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md text-xs text-left text-foreground hover:bg-accent transition-colors"
                  >
                    {copiadoId === aberta.caminho ? (
                      <Check size={14} className="text-emerald-500 shrink-0" />
                    ) : (
                      <LinkIcon size={14} className="opacity-70 shrink-0" />
                    )}
                    <span>{copiadoId === aberta.caminho ? "Copiado!" : "Copiar @Menção"}</span>
                  </button>

                  <button
                    onClick={async () => {
                      try {
                        const { exportToBlob } = await import("@excalidraw/excalidraw");
                        if (aberta?.dados?.elements) {
                          const blob = await exportToBlob({
                            elements: aberta.dados.elements,
                            appState: { exportBackground: true, viewBackgroundColor: ehModoEscuro ? "#181825" : "#ffffff" },
                            files: null,
                          });
                          const url = URL.createObjectURL(blob);
                          const a = document.createElement("a");
                          a.href = url;
                          a.download = `${aberta.titulo || "lousa"}.png`;
                          a.click();
                          URL.revokeObjectURL(url);
                          toast("Imagem PNG exportada com sucesso!", { tipo: "sucesso" });
                        }
                      } catch (e: any) {
                        toast(`Erro ao exportar PNG: ${e?.message || e}`, { tipo: "erro" });
                      }
                    }}
                    className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md text-xs text-left text-foreground hover:bg-accent transition-colors"
                  >
                    <Download size={14} className="opacity-70 shrink-0" />
                    <span>Exportar PNG</span>
                  </button>

                  <div className="my-1 border-t border-border/60" />

                  <button
                    onClick={() => setLousaParaDeletar({ caminho: aberta.caminho, sha: aberta.sha, titulo: aberta.titulo })}
                    className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md text-xs text-left text-destructive hover:bg-destructive/10 transition-colors"
                  >
                    <Trash2 size={14} className="shrink-0" />
                    <span>Apagar lousa</span>
                  </button>
                </PopoverContent>
              </Popover>
            )}

            <Botao variante="primario" tamanho="pequeno" onClick={salvar} disabled={salvando}>
              <Save size={15} />
              <span>{salvando ? "Salvando..." : "Salvar Lousa"}</span>
            </Botao>
          </div>
        </div>

        {erro && <Aviso tom="erro">{erro}</Aviso>}
        {erroRenomeacao && <Aviso tom="erro">{erroRenomeacao}</Aviso>}

        {/* Canvas do Excalidraw */}
        <div className="flex-1 w-full min-h-[500px] rounded-3xl overflow-hidden border border-border shadow-md bg-background relative">
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

  // ── LISTA DE LOUSAS (VISÃO GERAL) ──────────────────────────────────────────
  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <CabecalhoPagina
        titulo="Excalidraw (Mapas Mentais & Lousas)"
        descricao="Desenhe diagramas, mapas mentais e conecte aos seus projetos, notas e metas."
        icone={<Layout size={20} />}
        corIcone="bg-cyan-500/10 text-cyan-600 dark:text-cyan-400"
        badge={
          <SeloStatus
            rotulo={`${visiveis.length} ${visiveis.length === 1 ? "lousa" : "lousas"}`}
            tom="primario"
          />
        }
        acoes={
          <Botao variante="primario" onClick={novaLousa}>
            <Plus size={16} />
            <span>Nova Lousa</span>
          </Botao>
        }
      />

      {lousas.length > 0 && (
        <BarraFerramentas
          busca={busca}
          aoMudarBusca={setBusca}
          placeholderBusca="Buscar lousa ou mapa mental..."
          acoes={
            <AlternadorVisao<"grade" | "lista">
              valorAtivo={modoVisao}
              aoAlternar={setModoVisao}
              opcoes={[
                { id: "grade", rotulo: "Grade", icone: <LayoutGrid size={14} /> },
                { id: "lista", rotulo: "Lista", icone: <List size={14} /> },
              ]}
            />
          }
        />
      )}

      {erro && <Aviso tom="erro">{erro}</Aviso>}
      {erroRenomeacao && <Aviso tom="erro">{erroRenomeacao}</Aviso>}

      {carregando ? (
        <Carregando texto="Carregando suas lousas e mapas mentais..." />
      ) : lousas.length === 0 ? (
        <Vazio
          icone={<Layout size={24} />}
          titulo="Nenhuma lousa criada ainda"
          descricao="Crie seu primeiro mapa mental, fluxo ou diagrama visual no Excalidraw."
          acao={<Botao onClick={novaLousa}>Criar Primeira Lousa</Botao>}
        />
      ) : visiveis.length === 0 ? (
        <Vazio
          icone={<Layout size={24} />}
          titulo="Nenhuma lousa encontrada"
          descricao={`Nenhum mapa mental corresponde à busca por "${busca}".`}
        />
      ) : modoVisao === "grade" ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5 gap-4">
          {visiveis.map((item) => {
            const titulo = (item.doc.dados.titulo as string) || tituloProvavel(item.doc, item.nome);
            return (
              <CartaoLousaVisual
                key={item.caminho}
                item={item}
                titulo={titulo}
                visao="grade"
                onClick={() => abrir(item)}
                onEditar={() => abrir(item)}
                onDuplicar={(e) => duplicarLousa(item, e)}
                onExcluir={(e) => {
                  e.stopPropagation();
                  setLousaParaDeletar({ caminho: item.caminho, sha: item.sha, titulo });
                }}
                copiado={copiadoId === item.caminho}
                onCopiarMencao={(e) => copiarWikilink(item.caminho, titulo, e)}
              />
            );
          })}
        </div>
      ) : (
        <div className="flex flex-col gap-2.5">
          {visiveis.map((item) => {
            const titulo = (item.doc.dados.titulo as string) || tituloProvavel(item.doc, item.nome);
            return (
              <CartaoLousaVisual
                key={item.caminho}
                item={item}
                titulo={titulo}
                visao="lista"
                onClick={() => abrir(item)}
                onEditar={() => abrir(item)}
                onDuplicar={(e) => duplicarLousa(item, e)}
                onExcluir={(e) => {
                  e.stopPropagation();
                  setLousaParaDeletar({ caminho: item.caminho, sha: item.sha, titulo });
                }}
                copiado={copiadoId === item.caminho}
                onCopiarMencao={(e) => copiarWikilink(item.caminho, titulo, e)}
              />
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
