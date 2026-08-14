import { Suspense, lazy, useCallback, useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  Plus,
  Timer,
  Trash2,
  Check,
  List,
  CalendarDays,
  ListTodo,
  Calendar,
  Tag,
  Square,
  PanelRight,
  Maximize2,
  X,
} from "lucide-react";
import { lerConfig, configCompleta } from "@/lib/settings";
import { ler, gravar, apagar } from "@/lib/github";
import { carregarRepo, daPasta, invalidarCache, type ItemRepo } from "@/lib/repo";
import { montarIndice, mencoesA } from "@/lib/links";
import { MencionadoEm } from "@/components/Links";
import { Subtarefas } from "@/components/Subtarefas";
import {
  lerMarkdown,
  escreverMarkdown,
  tituloProvavel,
  nomeLivre,
} from "@/lib/markdown";
import {
  comoTarefa,
  ordenar,
  urgencia,
  textoPrazo,
  registrarCiclo,
  minutosRegistrados,
  progressoSubtarefas,
  paraFrontmatter,
  ROTULO_STATUS,
  STATUS,
  type Tarefa,
  type Status,
} from "@/lib/tarefas";
import { Pomodoro } from "@/components/Pomodoro";
import { Calendario } from "@/components/Calendario";
import {
  Botao,
  Cartao,
  Selo,
  Aviso,
  Vazio,
  Carregando,
  ModalConfirmacao,
} from "@/components/ui";
import { cn } from "@/lib/utils";

const PASTA = "tarefas";

const CORES_URGENCIA = {
  atrasada: "perigo",
  hoje: "aviso",
  proxima: "primario",
  tranquila: "neutro",
  nenhuma: "neutro",
} as const;

const EditorPesado = lazy(() =>
  import("@/components/EditorNotion").then((m) => ({ default: m.EditorNotion })),
);
const PropriedadesPesadas = lazy(() =>
  import("@/components/PropriedadesNotion").then((m) => ({
    default: m.PropriedadesNotion,
  })),
);

function EditorNotion(props: React.ComponentProps<typeof EditorPesado>) {
  return (
    <Suspense
      fallback={
        <div className="animate-pulse p-4 text-sm text-muted-foreground">
          Carregando editor…
        </div>
      }
    >
      <EditorPesado {...props} />
    </Suspense>
  );
}

function PropriedadesNotion(
  props: React.ComponentProps<typeof PropriedadesPesadas>,
) {
  return (
    <Suspense fallback={<div className="h-16" />}>
      <PropriedadesPesadas {...props} />
    </Suspense>
  );
}

/* Painel de Edição estilo Notion com suporte aos modos: Pop-up, Do Lado e Tela Cheia */
function PainelTarefaNotion({
  modoVisao,
  setModoVisao,
  editando,
  original,
  salvando,
  aoFechar,
  aoSalvar,
  aoSalvarAuto,
  aoRemover,
  setEditando,
  opcoesRelacionamento,
  mencoesDaTarefa,
  erro,
}: {
  modoVisao: "popup" | "lado" | "telacheia";
  setModoVisao: (m: "popup" | "lado" | "telacheia") => void;
  editando: Tarefa;
  original: Tarefa | null;
  salvando: boolean;
  aoFechar: () => void;
  aoSalvar: () => void;
  aoSalvarAuto?: (t: Tarefa) => void;
  aoRemover: () => void;
  setEditando: React.Dispatch<React.SetStateAction<Tarefa | null>>;
  opcoesRelacionamento: { titulo: string; caminho: string }[];
  mencoesDaTarefa: any[];
  erro?: string;
}) {
  const [confirmandoDescarte, setConfirmandoDescarte] = useState(false);
  const [confirmandoApagar, setConfirmandoApagar] = useState(false);

  const temMudancas =
    original !== null &&
    JSON.stringify(editando) !== JSON.stringify(original);

  const tentarFechar = useCallback(() => {
    if (temMudancas) {
      setConfirmandoDescarte(true);
      return;
    }
    aoFechar();
  }, [temMudancas, aoFechar]);

  useEffect(() => {
    const aoTeclar = (e: KeyboardEvent) => {
      if (e.key === "Escape") tentarFechar();
    };
    document.addEventListener("keydown", aoTeclar);
    const overflowAnterior = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", aoTeclar);
      document.body.style.overflow = overflowAnterior;
    };
  }, [tentarFechar]);

  // Cabeçalho com o seletor de modos estilo Notion
  const cabecalho = (
    <div className="flex shrink-0 items-center justify-between border-b border-border px-5 py-3.5 bg-card">
      <div className="flex items-center gap-2">
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          {editando.caminho ? "Tarefa" : "Nova tarefa"}
        </span>

        {/* Indicador visual de sincronização em tempo real */}
        <span className="text-[11px] font-medium ml-2 px-2 py-0.5 rounded-full bg-accent/60 flex items-center gap-1">
          {salvando ? (
            <span className="text-blue-500 animate-pulse">Sincronizando com GitHub...</span>
          ) : (
            <span className="text-emerald-600 dark:text-emerald-400">✓ Sincronizado</span>
          )}
        </span>
      </div>

      <div className="flex items-center gap-2">
        {/* Alternador de Modos de Visão estilo Notion */}
        <div className="flex items-center gap-0.5 rounded-lg border border-border/80 bg-muted/40 p-1">
          <button
            onClick={() => setModoVisao("popup")}
            className={cn(
              "p-1.5 rounded-md text-xs transition-colors flex items-center gap-1",
              modoVisao === "popup"
                ? "bg-background text-foreground shadow-xs font-semibold"
                : "text-muted-foreground hover:text-foreground"
            )}
            title="Abrir em Pop-up central"
          >
            <Square size={14} />
            <span className="hidden sm:inline">Pop-up</span>
          </button>

          <button
            onClick={() => setModoVisao("lado")}
            className={cn(
              "p-1.5 rounded-md text-xs transition-colors flex items-center gap-1",
              modoVisao === "lado"
                ? "bg-background text-foreground shadow-xs font-semibold"
                : "text-muted-foreground hover:text-foreground"
            )}
            title="Abrir no Painel Lateral (Do lado)"
          >
            <PanelRight size={14} />
            <span className="hidden sm:inline">Do Lado</span>
          </button>

          <button
            onClick={() => setModoVisao("telacheia")}
            className={cn(
              "p-1.5 rounded-md text-xs transition-colors flex items-center gap-1",
              modoVisao === "telacheia"
                ? "bg-background text-foreground shadow-xs font-semibold"
                : "text-muted-foreground hover:text-foreground"
            )}
            title="Abrir em Tela Cheia"
          >
            <Maximize2 size={14} />
            <span className="hidden sm:inline">Tela Cheia</span>
          </button>
        </div>

        <button
          onClick={tentarFechar}
          className="rounded-lg p-2 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
          title="Fechar (Esc)"
        >
          <X size={18} />
        </button>
      </div>
    </div>
  );

  const rodape = (
    <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-t border-border px-5 py-4 bg-card">
      <div>
        {editando.caminho && (
          <Botao variante="fantasma" onClick={() => setConfirmandoApagar(true)} className="text-destructive hover:bg-destructive/10">
            <Trash2 size={16} />
            <span>Apagar</span>
          </Botao>
        )}
      </div>

      <div className="flex items-center gap-2">
        <Botao variante="neutro" onClick={tentarFechar}>
          Cancelar
        </Botao>
        <Botao onClick={aoSalvar} disabled={salvando}>
          {salvando ? "Salvando…" : "Salvar"}
        </Botao>
      </div>
    </div>
  );

  const modaisConfirmacao = (
    <>
      <ModalConfirmacao
        aberto={confirmandoDescarte}
        titulo="Descartar alterações?"
        descricao="Você tem edições não salvas nesta tarefa. Se fechar agora, as alterações serão perdidas."
        textoConfirmar="Sim, descartar"
        textoCancelar="Continuar editando"
        varianteConfirmar="perigo"
        aoConfirmar={() => {
          setConfirmandoDescarte(false);
          aoFechar();
        }}
        aoCancelar={() => setConfirmandoDescarte(false)}
      />

      <ModalConfirmacao
        aberto={confirmandoApagar}
        titulo={`Apagar "${editando.titulo || "esta tarefa"}"?`}
        descricao="Tem certeza de que deseja apagar esta tarefa? Ela será excluída do repositório."
        textoConfirmar="Sim, apagar"
        textoCancelar="Cancelar"
        varianteConfirmar="perigo"
        aoConfirmar={() => {
          setConfirmandoApagar(false);
          aoRemover();
        }}
        aoCancelar={() => setConfirmandoApagar(false)}
      />
    </>
  );

  const conteudo = (
    <div className="space-y-6 max-w-4xl mx-auto w-full">
      {erro && <Aviso tom="erro">{erro}</Aviso>}

      <input
        type="text"
        value={editando.titulo}
        onChange={(e) => setEditando({ ...editando, titulo: e.target.value })}
        placeholder="Sem título"
        className="w-full text-2xl sm:text-3xl font-bold border-none outline-none bg-transparent placeholder:text-muted-foreground/30 focus:ring-0 px-0 pt-2"
        autoFocus
      />

      <div className="flex flex-col gap-2">
        <PropriedadesNotion
          dados={{
            ...editando.bruto,
            status: editando.status,
            prazo: editando.prazo,
            tags: editando.tags,
          }}
          corpoTexto={editando.corpo}
          onChange={(novosDados) => {
            const proxima = {
              ...editando,
              bruto: novosDados,
              status: (novosDados.status as Status) || editando.status,
              prazo: novosDados.prazo,
              tags: Array.isArray(novosDados.tags) ? novosDados.tags : editando.tags,
            };
            setEditando(proxima);
            if (editando.titulo.trim()) {
              aoSalvarAuto?.(proxima);
            }
          }}
          camposFixos={{
            status: { icone: <ListTodo className="h-4 w-4 opacity-50" />, tipo: "status" },
            prazo: { icone: <Calendar className="h-4 w-4 opacity-50" />, tipo: "data" },
            tags: { icone: <Tag className="h-4 w-4 opacity-50" />, tipo: "multiselect" }
          }}
          opcoesRelacionamento={opcoesRelacionamento}
        />
      </div>

      <hr className="border-border" />

      <div className="space-y-3">
        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Passos / Subtarefas
        </label>
        <Subtarefas
          corpo={editando.corpo}
          onChange={(novoCorpo) => {
            const proxima = { ...editando, corpo: novoCorpo };
            setEditando(proxima);
            if (editando.titulo.trim()) {
              aoSalvarAuto?.(proxima);
            }
          }}
        />
      </div>

      <hr className="border-border" />

      <div className="min-h-[250px]">
        <EditorNotion
          markdown={editando.corpo}
          onChange={(v) => setEditando({ ...editando, corpo: v })}
        />
      </div>

      {editando.caminho && (
        <div className="mt-8 border-t border-border pt-6">
          <MencionadoEm mencoes={mencoesDaTarefa} aoAbrir={() => {}} />
        </div>
      )}
    </div>
  );

  if (modoVisao === "lado") {
    return (
      <div
        className="fixed inset-0 z-50 flex justify-end bg-black/15 backdrop-blur-[1px] p-0 sm:p-3 transition-opacity"
        onClick={tentarFechar}
      >
        <div
          className="flex h-full w-full sm:w-[560px] md:w-[680px] lg:w-[760px] flex-col rounded-t-2xl sm:rounded-2xl border border-border bg-card shadow-2xl overflow-hidden animate-in slide-in-from-right duration-200"
          onClick={(e) => e.stopPropagation()}
        >
          {cabecalho}
          <div className="min-h-0 flex-1 overflow-y-auto px-6 py-6">{conteudo}</div>
          {rodape}
        </div>
        {modaisConfirmacao}
      </div>
    );
  }

  if (modoVisao === "telacheia") {
    return (
      <div
        className="fixed inset-0 z-50 flex flex-col bg-black/15 backdrop-blur-[1px] p-2 sm:p-4 animate-in fade-in duration-150"
        onClick={tentarFechar}
      >
        <div
          className="flex h-full w-full flex-col rounded-2xl sm:rounded-3xl border border-border bg-card shadow-2xl overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {cabecalho}
          <div className="min-h-0 flex-1 overflow-y-auto px-6 sm:px-12 py-8">{conteudo}</div>
          {rodape}
        </div>
        {modaisConfirmacao}
      </div>
    );
  }

  // Padrão: modo Pop-up central
  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/15 backdrop-blur-[1px] p-0 sm:p-4"
      onClick={tentarFechar}
    >
      <div
        className="flex max-h-[92dvh] w-full max-w-3xl flex-col rounded-t-2xl sm:rounded-2xl border border-border bg-card shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {cabecalho}
        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-6">{conteudo}</div>
        {rodape}
      </div>
      {modaisConfirmacao}
    </div>
  );
}

export default function Tarefas() {
  const cfg = lerConfig();
  const pronto = configCompleta(cfg);
  const location = useLocation();
  const navegar = useNavigate();

  const [tarefas, setTarefas] = useState<Tarefa[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");
  const [filtro, setFiltro] = useState<Status | "todas">("todas");
  const [editando, setEditando] = useState<Tarefa | null>(null);
  const [original, setOriginal] = useState<Tarefa | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [cronometrando, setCronometrando] = useState<Tarefa | null>(null);
  const [visao, setVisao] = useState<"lista" | "calendario">("lista");
  const [gravandoCaminho, setGravandoCaminho] = useState<string | null>(null);
  const [acervo, setAcervo] = useState<ItemRepo[]>([]);

  const [modoVisao, setModoVisao] = useState<"popup" | "lado" | "telacheia">(() => {
    const salvo = localStorage.getItem("tarefa-modo-visao");
    return (salvo as any) || "popup";
  });

  const alternarModoVisao = (novo: "popup" | "lado" | "telacheia") => {
    setModoVisao(novo);
    localStorage.setItem("tarefa-modo-visao", novo);
  };

  const carregar = useCallback(async () => {
    if (!pronto) {
      setCarregando(false);
      return;
    }
    setCarregando(true);
    setErro("");
    try {
      const todos = await carregarRepo(cfg, { memoria: 3000 });
      setAcervo(todos);
      const itens = daPasta(todos, PASTA);
      setTarefas(
        ordenar(
          itens.map((i) =>
            comoTarefa(i.doc, i.caminho, i.sha, tituloProvavel(i.doc, i.nome)),
          ),
        ),
      );
    } catch (e) {
      setErro(e instanceof Error ? e.message : String(e));
    } finally {
      setCarregando(false);
    }
  }, [pronto, cfg.repoOwner, cfg.repoName, cfg.githubToken, cfg.branch]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  // Abre item vindo por parâmetro de busca na URL
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const abrirCaminho = params.get("abrir");
    const criarNova = params.get("nova");

    if (criarNova === "true") {
      abrirNova();
    } else if (abrirCaminho && tarefas.length > 0 && (!editando || editando.caminho !== abrirCaminho)) {
      const alvo = tarefas.find((t) => t.caminho === abrirCaminho);
      const temMudanca =
        editando && JSON.stringify(editando) !== JSON.stringify(original);
      if (alvo && (!temMudanca || confirm("Você tem alterações não salvas. Descartar?"))) {
        setEditando(alvo);
        setOriginal(alvo);
      }
    }
  }, [location.search, tarefas]);

  const indice = useMemo(() => montarIndice(acervo), [acervo]);

  const mencoesDaTarefa = useMemo(
    () => (editando?.caminho ? mencoesA(editando.caminho, acervo, indice) : []),
    [editando?.caminho, acervo, indice],
  );
  
  const opcoesRelacionamento = useMemo(() => {
    return Array.from(indice.values()).map(a => ({
      titulo: a.titulo,
      caminho: a.caminho
    })).sort((a, b) => a.titulo.localeCompare(b.titulo));
  }, [indice]);

  async function gravarTarefa(t: Tarefa, mensagem?: string) {
    const texto = escreverMarkdown({
      dados: paraFrontmatter(t),
      corpo: t.corpo,
    });
    const caminho =
      t.caminho || nomeLivre(PASTA, t.titulo, tarefas.map((x) => x.caminho));
    const sha = await gravar(cfg, caminho, texto, t.sha || undefined, mensagem);
    invalidarCache();
    return { ...t, caminho, sha };
  }

  function fechar() {
    setEditando(null);
    setOriginal(null);
    navegar(location.pathname, { replace: true });
  }

  async function salvar(alvo?: Tarefa, fecharAoSalvar = true) {
    const t = alvo || editando;
    if (!t) return;
    if (!t.titulo.trim()) {
      setErro("A tarefa precisa de um título.");
      return;
    }
    setSalvando(true);
    setErro("");
    try {
      const salva = await gravarTarefa(t);
      setEditando(salva);
      setOriginal(salva);
      if (fecharAoSalvar) {
        fechar();
      }
      await carregar();
    } catch (e) {
      setErro(e instanceof Error ? e.message : String(e));
    } finally {
      setSalvando(false);
    }
  }

  async function alternarFeito(t: Tarefa) {
    if (gravandoCaminho === t.caminho) return;

    const novo: Tarefa = {
      ...t,
      status: t.status === "feito" ? "a-fazer" : "feito",
    };

    setGravandoCaminho(t.caminho);
    setTarefas((lista) => lista.map((x) => (x.caminho === t.caminho ? novo : x)));

    try {
      const salva = await gravarTarefa(
        novo,
        `${novo.status === "feito" ? "conclui" : "reabre"} ${t.titulo}`,
      );
      setTarefas((lista) =>
        lista.map((x) => (x.caminho === salva.caminho ? salva : x)),
      );
    } catch (e) {
      setErro(e instanceof Error ? e.message : String(e));
      setTarefas((lista) => lista.map((x) => (x.caminho === t.caminho ? t : x)));
    } finally {
      setGravandoCaminho(null);
    }
  }

  function abrir(t: Tarefa) {
    setEditando(t);
    setOriginal(t);
    navegar(`?abrir=${encodeURIComponent(t.caminho)}`, { replace: true });
  }

  function abrirNova() {
    const vazia: Tarefa = {
      bruto: {},
      caminho: "",
      sha: "",
      titulo: "",
      status: "a-fazer",
      tags: [],
      corpo: "",
    };
    setEditando(vazia);
    setOriginal(vazia);
  }

  async function remover(t: Tarefa) {
    try {
      await apagar(cfg, t.caminho, t.sha);
      invalidarCache();
      fechar();
      await carregar();
    } catch (e) {
      setErro(e instanceof Error ? e.message : String(e));
    }
  }

  const registrarTempo = useCallback(
    async (minutos: number) => {
      if (!cronometrando) return;
      try {
        const { texto, sha } = await ler(cfg, cronometrando.caminho);
        const doc = lerMarkdown(texto);
        const atual = comoTarefa(doc, cronometrando.caminho, sha, cronometrando.titulo);
        const atualizado = {
          ...atual,
          corpo: registrarCiclo(doc.corpo, minutos),
        };
        const salva = await gravarTarefa(atualizado, `+${minutos}min em ${cronometrando.titulo}`);
        setCronometrando(salva);
        await carregar();
      } catch (e) {
        setErro(e instanceof Error ? e.message : String(e));
      }
    },
    [cronometrando, cfg.repoOwner, cfg.repoName, cfg.githubToken],
  );

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

  const visiveis = ordenar(
    filtro === "todas" ? tarefas : tarefas.filter((t) => t.status === filtro),
  );
  const pendentes = tarefas.filter((t) => t.status !== "feito").length;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Tarefas</h1>
          {pendentes > 0 && (
            <p className="text-sm text-muted-foreground mt-0.5">
              {pendentes} pendente{pendentes > 1 ? "s" : ""}
            </p>
          )}
        </div>
        <Botao onClick={abrirNova}>
          <Plus size={16} />
          Nova
        </Botao>
      </div>

      {/* alterna lista / calendário */}
      <div className="flex gap-2">
        {([["lista", "Lista", List], ["calendario", "Calendário", CalendarDays]] as const).map(
          ([v, rotulo, Icone]) => (
            <button
              key={v}
              onClick={() => setVisao(v)}
              className={cn(
                "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
                visao === v
                  ? "bg-secondary text-secondary-foreground"
                  : "text-muted-foreground hover:bg-accent",
              )}
            >
              <Icone size={15} />
              {rotulo}
            </button>
          ),
        )}
      </div>

      {/* filtros */}
      <div className={cn("flex gap-2 overflow-x-auto pb-1", visao === "calendario" && "hidden")}>
        {(["todas", ...STATUS] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFiltro(f)}
            className={cn(
              "shrink-0 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
              filtro === f
                ? "bg-primary text-primary-foreground"
                : "bg-secondary text-secondary-foreground hover:bg-accent",
            )}
          >
            {f === "todas" ? "Todas" : ROTULO_STATUS[f]}
          </button>
        ))}
      </div>

      {erro && <Aviso tom="erro">{erro}</Aviso>}

      {carregando ? (
        <Carregando texto="Buscando suas tarefas…" />
      ) : visao === "calendario" ? (
        <Calendario tarefas={tarefas} aoAbrir={abrir} />
      ) : visiveis.length === 0 ? (
        <Vazio
          titulo={filtro === "todas" ? "Nenhuma tarefa ainda" : "Nada por aqui"}
          descricao={
            filtro === "todas"
              ? "Cada tarefa vira um arquivo .md no seu repositório."
              : undefined
          }
        />
      ) : (
        <div className="grid gap-2">
          {visiveis.map((t) => {
            const u = urgencia(t);
            const min = minutosRegistrados(t.corpo);
            const passos = progressoSubtarefas(t.corpo);

            return (
              <Cartao key={t.caminho} className="flex items-start gap-3 p-3.5 group">
                <button
                  onClick={() => alternarFeito(t)}
                  disabled={gravandoCaminho === t.caminho}
                  className="-m-2 shrink-0 p-2 disabled:opacity-60"
                  title={t.status === "feito" ? "Reabrir" : "Concluir"}
                  aria-label={t.status === "feito" ? "Reabrir tarefa" : "Concluir tarefa"}
                >
                  <span
                    className={cn(
                      "flex h-5 w-5 items-center justify-center rounded border-2 transition-colors",
                      t.status === "feito"
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border hover:border-primary",
                    )}
                  >
                    {t.status === "feito" && <Check size={13} strokeWidth={3} />}
                  </span>
                </button>

                <button
                  onClick={() => abrir(t)}
                  className="min-w-0 flex-1 text-left"
                >
                  <p
                    className={cn(
                      "font-medium",
                      t.status === "feito" && "text-muted-foreground line-through",
                    )}
                  >
                    {t.titulo}
                  </p>
                  <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                    {t.status === "fazendo" && (
                      <Selo tom="primario">Fazendo</Selo>
                    )}
                    {u !== "nenhuma" && (
                      <Selo tom={CORES_URGENCIA[u]}>{textoPrazo(t)}</Selo>
                    )}
                    {min > 0 && <Selo>🍅 {min}min</Selo>}
                    {passos.total > 0 && (
                      <Selo tom={passos.porcento === 100 ? "sucesso" : "neutro"}>
                        {passos.feitas}/{passos.total} passos
                      </Selo>
                    )}
                    {t.tags.map((tag) => (
                      <Selo key={tag}>#{tag}</Selo>
                    ))}
                  </div>
                </button>

                <div className="flex items-center gap-1">
                  {t.status !== "feito" && (
                    <Botao
                      variante="fantasma"
                      tamanho="icone"
                      onClick={() => setCronometrando(t)}
                      title="Iniciar pomodoro"
                    >
                      <Timer size={17} />
                    </Botao>
                  )}
                </div>
              </Cartao>
            );
          })}
        </div>
      )}

      {/* ------------------------------------------------------ edição estilo Notion */}
      {editando !== null && (
        <PainelTarefaNotion
          modoVisao={modoVisao}
          setModoVisao={alternarModoVisao}
          editando={editando}
          original={original}
          salvando={salvando}
          aoFechar={fechar}
          aoSalvar={salvar}
          aoSalvarAuto={(t) => salvar(t, false)}
          aoRemover={() => editando && remover(editando)}
          setEditando={setEditando}
          opcoesRelacionamento={opcoesRelacionamento}
          mencoesDaTarefa={mencoesDaTarefa}
          erro={erro}
        />
      )}

      {cronometrando && (
        <Pomodoro
          tarefa={cronometrando.titulo}
          aoConcluirCiclo={registrarTempo}
          aoFechar={() => setCronometrando(null)}
        />
      )}
    </div>
  );
}
