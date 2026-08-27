import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  Plus,
  Columns3,
  CalendarDays,
  ListTodo,
  Calendar,
  Tag,
  Folder,
} from "lucide-react";
import { PainelNotionBase, type ModoVisaoNotion } from "@/components/PainelNotionBase";
import { lerConfig, configCompleta } from "@/lib/settings";
import { useItemRepo } from "@/lib/useItemRepo";
import { useSalvar } from "@/lib/useSalvar";
import { PASTAS } from "@/lib/tipos";
import { comoTarefa, tarefaParaArquivo } from "@/lib/entidades";
import { montarIndice, mencoesA, alvosUnicos } from "@/lib/links";
import {
  escreverMarkdown,
  tituloProvavel,
  nomeLivre,
} from "@/lib/markdown";
import {
  type Tarefa,
  type Status,
} from "@/lib/tarefas";
import { useCronometro } from "@/components/ContextoCronometro";
import { obterTodosModelos } from "@/lib/templates";
import { Timer } from "lucide-react";
import { Calendario } from "@/components/Calendario";
import { Quadro } from "@/components/Quadro";
import {
  Botao,
  Aviso,
  Vazio,
  Carregando,
} from "@/components/ui";
import { CabecalhoPagina } from "@/components/CabecalhoPagina";
import { BarraFerramentas } from "@/components/BarraFerramentas";
import { AlternadorVisao } from "@/components/AlternadorVisao";
import { cn, lerParametroAbrir, correspondeBusca } from "@/lib/utils";
import { useItemFlutuante } from "@/components/ItemFlutuanteContext";
import { BarraFiltrosAvancados, type FiltroDataPreset, filtrarPorDataPreset } from "@/components/BarraFiltrosAvancados";
import { toast } from "@/lib/toast";

export default function Tarefas() {
  const cfg = lerConfig();
  const pronto = configCompleta(cfg);
  const location = useLocation();
  const navegar = useNavigate();
  const { abrirFlutuante, focarFlutuante } = useItemFlutuante();

  // ── Carregamento Recursivo (todas as subpastas de tarefas/) ───────────────
  const { itens: tarefas, acervo, carregando, erro: erroCarregar, recarregar } =
    useItemRepo(cfg, PASTAS.tarefas, (item) =>
      comoTarefa(item.doc, item.caminho, item.sha, tituloProvavel(item.doc, item.nome)),
      { recursivo: true }
    );

  // ── Salvamento ────────────────────────────────────────────────────────────
  const { salvarTexto, apagarItem, salvando, erro: erroSalvar, limparErro } = useSalvar(cfg);
  const [erroLocal, setErroLocal] = useState("");
  const erro = erroLocal || erroCarregar || erroSalvar;

  // ── Estado da UI ──────────────────────────────────────────────────────────
  const [busca, setBusca] = useState("");
  const [editando, setEditando] = useState<Tarefa | null>(null);
  const [original, setOriginal] = useState<Tarefa | null>(null);
  const { iniciar } = useCronometro();
  const modelosTarefa = useMemo(() => obterTodosModelos().filter((m) => m.categoria === "tarefa"), []);
  const [tagSelecionada, setTagSelecionada] = useState<string | null>(null);
  const [tagsFiltro, setTagsFiltro] = useState<string[]>([]);
  const [filtroDataTarefas, setFiltroDataTarefas] = useState<FiltroDataPreset>("qualquer");
  const [pastaSelecionada, setPastaSelecionada] = useState<string | null>(null);
  const [visao, setVisao] = useState<"quadro" | "calendario">(() => {
    const salvo = localStorage.getItem("tarefa-visao");
    return salvo === "calendario" ? salvo : "quadro";
  });
  const [gravandoCaminho, setGravandoCaminho] = useState<string | null>(null);
  const [modoVisao, setModoVisao] = useState<ModoVisaoNotion>(() => {
    const salvo = localStorage.getItem("tarefa-modo-visao");
    return salvo === "flutuante" ? "popup" : (salvo as ModoVisaoNotion) || "popup";
  });

  const alternarModoVisao = (novo: ModoVisaoNotion) => {
    setModoVisao(novo);
    localStorage.setItem("tarefa-modo-visao", novo);
  };

  // ── Pastas existentes para filtro e organização ────────────────────────────
  const pastasExistentes = useMemo(() => {
    const conjunto = new Set<string>();
    for (const t of tarefas) {
      const partes = t.caminho.split("/").slice(1, -1);
      if (partes.length > 0) {
        for (let i = 1; i <= partes.length; i++) {
          conjunto.add(partes.slice(0, i).join("/"));
        }
      }
    }
    return Array.from(conjunto).sort((a, b) => a.localeCompare(b));
  }, [tarefas]);

  // ── Tags para filtro ───────────────────────────────────────────────────────
  const todasTags = useMemo(() => {
    const conjunto = new Set<string>();
    for (const t of tarefas) {
      for (const tag of t.tags || []) conjunto.add(tag);
    }
    return Array.from(conjunto).sort();
  }, [tarefas]);

  // ── Relacionamentos ────────────────────────────────────────────────────────
  const indice = useMemo(() => montarIndice(acervo), [acervo]);
  const mencoesDaTarefa = useMemo(
    () => (editando?.caminho ? mencoesA(editando.caminho, acervo, indice) : []),
    [editando?.caminho, acervo, indice],
  );
  const opcoesRelacionamento = useMemo(() =>
    alvosUnicos(indice)
      .map(a => ({ titulo: a.titulo, caminho: a.caminho }))
      .sort((a, b) => a.titulo.localeCompare(b.titulo)),
    [indice],
  );

  // ── Abre item pela URL ─────────────────────────────────────────────────────
  const processouUrlRef = useRef<string | null>(null);
  useEffect(() => {
    const urlAtual = `${location.pathname}${location.search}${location.hash}`;
    const abrirCaminho = lerParametroAbrir(location);
    const params = new URLSearchParams(location.search);
    const criarNova = params.get("nova");

    if (processouUrlRef.current === urlAtual) return;

    if (criarNova === "true") {
      processouUrlRef.current = urlAtual;
      abrirNova();
    } else if (abrirCaminho && tarefas.length > 0) {
      if (focarFlutuante(abrirCaminho)) return;
      const alvo = tarefas.find((t) => t.caminho === abrirCaminho);
      if (alvo) {
        processouUrlRef.current = urlAtual;
        setEditando(alvo);
        setOriginal(alvo);
      }
    }
  }, [location.pathname, location.search, location.hash, tarefas.length > 0]);

  useEffect(() => {
    const aoAbrirItem = (e: Event) => {
      const detalhe = (e as CustomEvent)?.detail;
      const caminho = detalhe?.caminho;
      if (!caminho || !caminho.startsWith(`${PASTAS.tarefas}/`)) return;
      const alvo = tarefas.find((t) => t.caminho === caminho);
      if (alvo) {
        setEditando(alvo);
        setOriginal(alvo);
      }
    };
    window.addEventListener("klaus-abrir-item", aoAbrirItem);
    return () => window.removeEventListener("klaus-abrir-item", aoAbrirItem);
  }, [tarefas]);

  // ── Modo flutuante ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (modoVisao === "flutuante" && editando) {
      const tarefaOriginal = { ...editando };
      const dados = {
        status: tarefaOriginal.status,
        prazo: tarefaOriginal.prazo,
        tags: tarefaOriginal.tags,
        Pomodoro: tarefaOriginal.Pomodoro,
        ...tarefaOriginal.bruto
      };
      abrirFlutuante({
        id: tarefaOriginal.caminho,
        rotuloTipo: tarefaOriginal.caminho ? "Tarefa" : "Nova tarefa",
        titulo: tarefaOriginal.titulo,
        corpo: tarefaOriginal.corpo,
        dadosProps: dados,
        camposFixosProps: {
          status: { icone: <ListTodo className="h-4 w-4 opacity-50 text-blue-500" />, tipo: "status" },
          prazo: { icone: <Calendar className="h-4 w-4 opacity-50 text-rose-500" />, tipo: "data" },
          tags: { icone: <Tag className="h-4 w-4 opacity-50 text-amber-500" />, tipo: "multiselect" },
          Pomodoro: { icone: <Timer className="h-4 w-4 opacity-50 text-indigo-500" />, tipo: "numero" },
        },
        caminho: tarefaOriginal.caminho,
        sha: tarefaOriginal.sha,
        temMudancas: JSON.stringify(editando) !== JSON.stringify(original),
        salvando,
        erro,
        mencoes: mencoesDaTarefa,
        opcoesRelacionamento,
        aoSalvar: async (itemFlutuanteAtual) => {
          const titulo = itemFlutuanteAtual.titulo.trim() || "Sem título";
          const tarefaAtualizada: Tarefa = {
            caminho: itemFlutuanteAtual.caminho,
            sha: itemFlutuanteAtual.sha,
            bruto: itemFlutuanteAtual.dadosProps || {},
            titulo,
            status: (itemFlutuanteAtual.dadosProps.status as Status) || "a-fazer",
            prazo: itemFlutuanteAtual.dadosProps.prazo,
            tags: itemFlutuanteAtual.dadosProps.tags || [],
            Pomodoro: typeof itemFlutuanteAtual.dadosProps.Pomodoro === "number"
              ? itemFlutuanteAtual.dadosProps.Pomodoro
              : (itemFlutuanteAtual.dadosProps.Pomodoro ? Number(itemFlutuanteAtual.dadosProps.Pomodoro) : undefined),
            corpo: itemFlutuanteAtual.corpo,
          };
          await gravarTarefa(tarefaAtualizada);
          recarregar();
        },
        aoRemover: tarefaOriginal.caminho ? async () => {
          await apagarItem(tarefaOriginal.caminho, tarefaOriginal.sha);
          recarregar();
        } : undefined,
      });
      setEditando(null);
      setOriginal(null);
      setModoVisao("popup");
    }
  }, [modoVisao, editando]);

  // ── Gravação baixo nível (retorna tarefa atualizada com sha novo) ───────────
  async function gravarTarefa(t: Tarefa, mensagemCommit?: string): Promise<Tarefa> {
    const { dados, corpo } = tarefaParaArquivo(t);
    const texto = escreverMarkdown({ dados, corpo });
    const prefixo = pastaSelecionada ? `${PASTAS.tarefas}/${pastaSelecionada}` : PASTAS.tarefas;
    const caminho = t.caminho || nomeLivre(prefixo, t.titulo, tarefas.map((x) => x.caminho));
    const sha = await salvarTexto(caminho, texto, t.sha || undefined, mensagemCommit);
    return { ...t, caminho, sha };
  }

  // ── Ações ──────────────────────────────────────────────────────────────────

  function fechar() {
    setEditando(null);
    setOriginal(null);
    limparErro();
    setErroLocal("");
    navegar(location.pathname, { replace: true });
  }

  const { fecharFlutuante, estaAbertoFlutuante } = useItemFlutuante();

  function abrir(t: Tarefa) {
    if (estaAbertoFlutuante(t.caminho)) {
      fecharFlutuante();
    }
    if (editando && editando.caminho !== t.caminho) {
      const mudou = original !== null && JSON.stringify(editando) !== JSON.stringify(original);
      if (mudou) {
        salvar(editando).catch((err) => {
          toast(`Erro ao salvar alterações da tarefa anterior: ${err?.message || "Falha na gravação"}`, { tipo: "erro" });
        });
      }
    }
    setEditando(t);
    setOriginal(t);
    window.history.replaceState(null, "", `?abrir=${encodeURIComponent(t.caminho)}`);
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

  function criarComModelo(modeloId: string) {
    const m = modelosTarefa.find((x) => x.id === modeloId);
    if (!m) return;
    const nova: Tarefa = {
      bruto: { ...m.frontmatter },
      caminho: "",
      sha: "",
      titulo: m.titulo,
      status: (m.frontmatter.status as Status) || "a-fazer",
      tags: m.frontmatter.tags || [],
      corpo: m.corpoPadrao,
    };
    setEditando(nova);
    setOriginal(nova);
  }

  async function salvar(alvo?: Tarefa) {
    const t = alvo || editando;
    if (!t) return;
    if (!t.titulo.trim()) {
      setErroLocal("A tarefa precisa de um título.");
      return;
    }
    setErroLocal("");
    try {
      const salva = await gravarTarefa(t);
      setEditando((atual) => {
        if (atual && (atual.caminho === salva.caminho || !atual.caminho)) return salva;
        return atual;
      });
      setOriginal((orig) => {
        if (orig && (orig.caminho === salva.caminho || !orig.caminho)) return salva;
        return orig;
      });
      recarregar();
    } catch {
      // erro já está em erroSalvar via useSalvar
    }
  }

  async function remover(t: Tarefa) {
    await apagarItem(t.caminho, t.sha);
    fechar();
    recarregar();
  }

  /**
   * Troca o status de uma tarefa e grava.
   * A tela muda ANTES da gravação e volta atrás se der erro.
   */
  async function mudarStatus(t: Tarefa, novoStatus: Status) {
    if (gravandoCaminho === t.caminho || t.status === novoStatus) return;
    const novo: Tarefa = { ...t, status: novoStatus };
    setGravandoCaminho(t.caminho);
    const verbo = novoStatus === "feito" ? "conclui" : novoStatus === "fazendo" ? "comeca" : "reabre";
    try {
      await gravarTarefa(novo, `${verbo} ${t.titulo}`);
      recarregar();
    } catch (e) {
      setErroLocal(e instanceof Error ? e.message : String(e));
    } finally {
      setGravandoCaminho(null);
    }
  }

  // registrarTempo removido em favor da gestão global do cronômetro

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

  const tarefasExibidas = tarefas.filter((t) => {
    if (pastaSelecionada) {
      const prefixo = `${PASTAS.tarefas}/${pastaSelecionada}/`;
      if (!t.caminho.startsWith(prefixo)) return false;
    }
    // Filtro BarraFiltrosAvancados: tags (multiselect)
    if (tagsFiltro.length > 0) {
      if (!tagsFiltro.every((tag) => t.tags?.includes(tag))) return false;
    }
    // Filtro legado: tag única selecionada
    if (tagSelecionada && (!t.tags || !t.tags.includes(tagSelecionada))) {
      return false;
    }
    // Filtro de data
    if (filtroDataTarefas !== "qualquer" && !filtrarPorDataPreset(t.bruto || {}, filtroDataTarefas)) {
      return false;
    }
    if (busca.trim()) {
      return (
        correspondeBusca(t.titulo, busca) ||
        correspondeBusca(t.corpo, busca) ||
        t.tags.some((tag) => correspondeBusca(tag, busca))
      );
    }
    return true;
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <CabecalhoPagina
        titulo="Tarefas"
        descricao="Organize suas pendências, prazos e prioridades do dia a dia."
        icone={<ListTodo size={20} />}
        corIcone="bg-blue-500/10 text-blue-600 dark:text-blue-400"
        badge={undefined}
        acoes={
          <div className="flex items-center gap-2">
            {modelosTarefa.length > 0 && (
              <select
                onChange={(e) => {
                  criarComModelo(e.target.value);
                  e.target.value = "";
                }}
                defaultValue=""
                className="h-9 px-3 rounded-lg border border-input bg-card text-xs font-semibold hover:bg-accent hover:text-accent-foreground cursor-pointer focus:ring-1 focus:ring-primary focus:outline-none"
              >
                <option value="" disabled>Usar Modelo...</option>
                {modelosTarefa.map((m) => (
                  <option key={m.id} value={m.id}>{m.titulo}</option>
                ))}
              </select>
            )}
            <Botao onClick={abrirNova}>
              <Plus size={16} />
              Nova Tarefa
            </Botao>
          </div>
        }
      />

      <BarraFerramentas
        busca={busca}
        aoMudarBusca={setBusca}
        placeholderBusca="Buscar tarefa por título..."
        filtros={
          <BarraFiltrosAvancados
            todasTags={todasTags}
            tagsFiltro={tagsFiltro}
            aoMudarTags={(tags) => {
              setTagsFiltro(tags);
              setTagSelecionada(tags.length === 1 ? tags[0] : null);
            }}
            filtroData={filtroDataTarefas}
            aoMudarFiltroData={setFiltroDataTarefas}
          />
        }
        acoes={
          <AlternadorVisao
            valorAtivo={visao}
            aoAlternar={(v) => {
              const novaVisao = v as "quadro" | "calendario";
              setVisao(novaVisao);
              localStorage.setItem("tarefa-visao", novaVisao);
            }}
            opcoes={[
              { id: "quadro", rotulo: "Quadro (Kanban)", icone: <Columns3 size={15} /> },
              { id: "calendario", rotulo: "Calendário", icone: <CalendarDays size={15} /> },
            ]}
          />
        }
      />

      {/* Filtro por Pastas */}
      {pastasExistentes.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap py-1">
          <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
            <Folder size={12} /> Pastas:
          </span>
          <button
            onClick={() => setPastaSelecionada(null)}
            className={cn(
              "px-2.5 py-0.5 rounded-full text-xs font-medium transition-colors cursor-pointer flex items-center gap-1",
              pastaSelecionada === null
                ? "bg-primary text-primary-foreground font-semibold"
                : "bg-secondary/60 text-muted-foreground hover:bg-accent",
            )}
          >
            Todas ({tarefas.length})
          </button>
          {pastasExistentes.map((p) => {
            const total = tarefas.filter((t) => t.caminho.startsWith(`${PASTAS.tarefas}/${p}/`)).length;
            const nomeAmigavel = p.split("/").pop() || p;
            return (
              <button
                key={p}
                onClick={() => setPastaSelecionada(p === pastaSelecionada ? null : p)}
                className={cn(
                  "px-2.5 py-0.5 rounded-full text-xs font-medium transition-colors cursor-pointer flex items-center gap-1.5",
                  pastaSelecionada === p
                    ? "bg-primary text-primary-foreground font-semibold"
                    : "bg-secondary/60 text-muted-foreground hover:bg-accent",
                )}
              >
                <Folder size={12} className="shrink-0 opacity-80" />
                <span>{nomeAmigavel}</span>
                <span className="opacity-70 text-[11px]">({total})</span>
              </button>
            );
          })}
        </div>
      )}



      {erro && <Aviso tom="erro">{erro}</Aviso>}

      {carregando ? (
        <Carregando texto="Buscando suas tarefas…" />
      ) : visao === "quadro" ? (
        <Quadro
          tarefas={tarefasExibidas}
          aoAbrir={abrir}
          aoCronometrar={iniciar}
          aoMudarStatus={mudarStatus}
          gravandoCaminho={gravandoCaminho}
        />
      ) : (
        <Calendario tarefas={tarefasExibidas} aoAbrir={abrir} />
      )}

      {/* painel de edição */}
      {editando !== null && (
        <PainelNotionBase
          rotuloTipo={editando.caminho ? "Tarefa" : "Nova tarefa"}
          modoVisao={modoVisao}
          setModoVisao={alternarModoVisao}
          titulo={editando.titulo}
          setTitulo={(t) => setEditando({ ...editando, titulo: t })}
          corpo={editando.corpo}
          setCorpo={(c) => setEditando({ ...editando, corpo: c })}
          caminhoItem={editando.caminho}
          dadosProps={{
            ...editando.bruto,
            status: editando.status,
            prazo: editando.prazo,
            tags: editando.tags,
            Pomodoro: editando.Pomodoro,
          }}
          onChangeProps={(nProps) => {
            setEditando({
              ...editando,
              bruto: nProps,
              status: (nProps.status as Status) || editando.status,
              prazo: nProps.prazo as string | undefined,
              tags: Array.isArray(nProps.tags) ? nProps.tags as string[] : editando.tags,
              Pomodoro: typeof nProps.Pomodoro === "number"
                ? nProps.Pomodoro
                : (nProps.Pomodoro ? Number(nProps.Pomodoro) : undefined),
            });
          }}
          camposFixosProps={{
            status: { icone: <ListTodo className="h-4 w-4 opacity-50" />, tipo: "status" },
            prazo: { icone: <Calendar className="h-4 w-4 opacity-50" />, tipo: "data" },
            tags: { icone: <Tag className="h-4 w-4 opacity-50" />, tipo: "multiselect" },
            Pomodoro: { icone: <Timer className="h-4 w-4 opacity-50 text-indigo-500" />, tipo: "numero" },
          }}
          salvando={salvando}
          temMudancas={original !== null && JSON.stringify(editando) !== JSON.stringify(original)}
          aoFechar={fechar}
          aoSalvar={async () => { await salvar(editando); }}
          aoRemover={editando.caminho ? async () => { await remover(editando); } : undefined}
          erro={erro}
          mencoes={mencoesDaTarefa}
          opcoesRelacionamento={opcoesRelacionamento}
        />
      )}

      {/* O temporizador Pomodoro é agora renderizado globalmente via App.tsx */}
    </div>
  );
}
