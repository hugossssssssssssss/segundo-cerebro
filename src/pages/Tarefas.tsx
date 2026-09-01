import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  Plus,
  Columns3,
  CalendarDays,
  ListTodo,
  Calendar,
  Tag,
  Folder,
  LayoutGrid,
} from "lucide-react";
import { PainelNotionBase, type ModoVisaoNotion } from "@/components/PainelNotionBase";
import { lerConfig, configCompleta } from "@/lib/settings";
import { useItemRepo } from "@/lib/useItemRepo";
import { useSalvar } from "@/lib/useSalvar";
import { PASTAS } from "@/lib/tipos";
import { comoTarefa, tarefaParaArquivo } from "@/lib/entidades";
import { montarIndice, mencoesA, alvosUnicos } from "@/lib/links";
import { invalidarCache } from "@/lib/repo";
import { dispararAtualizacaoAcervo } from "@/lib/eventos";
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
import { Timer } from "lucide-react";
import { Calendario } from "@/components/Calendario";
import { Quadro } from "@/components/Quadro";
import {
  Botao,
  Aviso,
  Vazio,
  Carregando,
  ModalConfirmacao,
} from "@/components/ui";
import { CabecalhoPagina } from "@/components/CabecalhoPagina";
import { BarraFerramentas } from "@/components/BarraFerramentas";
import { AlternadorVisao } from "@/components/AlternadorVisao";
import { cn, lerParametroAbrir, correspondeBusca } from "@/lib/utils";
import { useItemFlutuante } from "@/components/ItemFlutuanteContext";
import { BarraFiltrosAvancados, filtrarItensPorRegras, type DefinicaoPropriedade, type RegraFiltro } from "@/components/BarraFiltrosAvancados";
import { DropdownNovoViaModelo } from "@/components/DropdownNovoViaModelo";
import { ModalVincularPDI } from "@/components/ModalVincularPDI";
import { toast } from "@/lib/toast";
import { urgencia } from "@/lib/tarefas";

type ModoVisaoTela = "quadro" | "calendario" | "hibrido";

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
  const [regrasFiltro, setRegrasFiltro] = useState<RegraFiltro[]>([]);
  type FiltroRapidoTarefa = "todas" | "urgentes" | "hoje" | "atrasadas" | "sem_prazo";
  const [filtroRapido, setFiltroRapido] = useState<FiltroRapidoTarefa>("todas");
  const [tarefaParaPDI, setTarefaParaPDI] = useState<Tarefa | null>(null);
  const [tarefaParaExcluir, setTarefaParaExcluir] = useState<Tarefa | null>(null);
  const [pastaSelecionada, setPastaSelecionada] = useState<string | null>(null);
  const [selecionadas, setSelecionadas] = useState<Set<string>>(new Set());

  const alternarSelecao = (caminho: string) => {
    setSelecionadas((prev) => {
      const novo = new Set(prev);
      if (novo.has(caminho)) novo.delete(caminho);
      else novo.add(caminho);
      return novo;
    });
  };

  const limparSelecao = () => setSelecionadas(new Set());

  const [visao, setVisao] = useState<ModoVisaoTela>(() => {
    const salvo = localStorage.getItem("tarefa-visao");
    return (salvo as ModoVisaoTela) || "quadro";
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
  }, [location.pathname, location.search, location.hash, tarefas, focarFlutuante]);

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

  // Reset de filtros locais ao mudar de rota
  useEffect(() => {
    setRegrasFiltro([]);
    setPastaSelecionada(null);
  }, [location.pathname]);

  // ── Gravação baixo nível (retorna tarefa atualizada com sha novo) ───────────
  async function gravarTarefa(t: Tarefa, mensagemCommit?: string): Promise<Tarefa> {
    const titulo = t.titulo?.trim() || "Sem título";
    const tarefaComTitulo = { ...t, titulo };
    const { dados, corpo } = tarefaParaArquivo(tarefaComTitulo);
    const texto = escreverMarkdown({ dados, corpo });
    const prefixo = pastaSelecionada ? `${PASTAS.tarefas}/${pastaSelecionada}` : PASTAS.tarefas;
    const caminho = t.caminho || nomeLivre(prefixo, titulo, tarefas.map((x) => x.caminho));
    const sha = await salvarTexto(caminho, texto, t.sha || undefined, mensagemCommit);
    return { ...tarefaComTitulo, caminho, sha };
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
        salvar(editando).catch(() => {});
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

  function criarComModelo(m: any) {
    if (!m) return;
    const nova: Tarefa = {
      bruto: { ...m.frontmatter },
      caminho: "",
      sha: "",
      titulo: m.titulo || "Nova Tarefa",
      status: (m.frontmatter?.status as Status) || "a-fazer",
      tags: m.frontmatter?.tags || [],
      corpo: m.corpoPadrao || "",
    };
    setEditando(nova);
    setOriginal(nova);
  }

  async function salvar(alvo?: Tarefa) {
    const t = alvo || editando;
    if (!t) return;
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
      // erro gerenciado por useSalvar
    }
  }

  async function remover(t: Tarefa) {
    await apagarItem(t.caminho, t.sha);
    fechar();
    recarregar();
  }

  async function criarTarefaRapida(status: Status, titulo: string) {
    if (!titulo.trim()) return;
    const nova: Tarefa = {
      bruto: {},
      caminho: "",
      sha: "",
      titulo: titulo.trim(),
      status,
      tags: [],
      corpo: "",
    };
    try {
      await gravarTarefa(nova, `cria ${titulo.trim()}`);
      recarregar();
      toast(`Tarefa "${titulo.trim()}" criada!`);
    } catch (e: any) {
      toast(`Erro ao criar tarefa: ${e?.message || e}`, { tipo: "erro" });
    }
  }

  async function adiarPrazo(t: Tarefa, dias: number) {
    const dataBase = t.prazo ? new Date(t.prazo + "T12:00:00") : new Date();
    dataBase.setDate(dataBase.getDate() + dias);
    const iso = dataBase.toISOString().split("T")[0];
    const nova: Tarefa = {
      ...t,
      prazo: iso,
      bruto: { ...t.bruto, prazo: iso },
    };
    try {
      await gravarTarefa(nova, `prazo: ${iso} (${t.titulo})`);
      recarregar();
      toast(`Prazo de "${t.titulo}" adiado para ${iso}!`);
    } catch (e: any) {
      toast(`Erro ao adiar prazo: ${e?.message || e}`, { tipo: "erro" });
    }
  }

  async function duplicarTarefa(t: Tarefa) {
    const novoTitulo = `Cópia de ${t.titulo}`;
    const nova: Tarefa = {
      ...t,
      caminho: "",
      sha: "",
      titulo: novoTitulo,
    };
    try {
      await gravarTarefa(nova, `duplicar ${t.titulo}`);
      recarregar();
      toast(`Tarefa duplicada com sucesso!`);
    } catch (e: any) {
      toast(`Erro ao duplicar tarefa: ${e?.message || e}`, { tipo: "erro" });
    }
  }

  async function confirmarRemoverTarefa() {
    if (!tarefaParaExcluir) return;
    try {
      await apagarItem(tarefaParaExcluir.caminho, tarefaParaExcluir.sha);
      setTarefaParaExcluir(null);
      if (editando?.caminho === tarefaParaExcluir.caminho) {
        fechar();
      }
      recarregar();
      toast(`Tarefa excluída!`);
    } catch (e: any) {
      toast(`Erro ao excluir tarefa: ${e?.message || e}`, { tipo: "erro" });
    }
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

  const propriedadesDisponiveis = useMemo<DefinicaoPropriedade[]>(() => {
    return [
      { id: "titulo", rotulo: "Título / Nome", tipo: "texto" },
      { id: "status", rotulo: "Status", tipo: "status", opcoes: ["a-fazer", "fazendo", "feito"] },
      { id: "tags", rotulo: "Tags", tipo: "tags", opcoes: todasTags },
      { id: "prazo", rotulo: "Prazo", tipo: "data" },
      { id: "criado_em", rotulo: "Criado em", tipo: "data" },
      { id: "atualizado_em", rotulo: "Última edição em", tipo: "data" },
      { id: "pomodoro", rotulo: "Pomodoro / Esforço", tipo: "numero" },
    ];
  }, [todasTags]);

  const tarefasExibidas = useMemo(() => {
    let lista = tarefas.filter((t) => {
      if (pastaSelecionada) {
        const prefixo = `${PASTAS.tarefas}/${pastaSelecionada}/`;
        if (!t.caminho.startsWith(prefixo)) return false;
      }
      if (busca.trim()) {
        const atendeBusca =
          correspondeBusca(t.titulo, busca) ||
          correspondeBusca(t.corpo, busca) ||
          t.tags.some((tag) => correspondeBusca(tag, busca));
        if (!atendeBusca) return false;
      }
      if (filtroRapido === "hoje") {
        const u = urgencia(t);
        if (u !== "hoje") return false;
      } else if (filtroRapido === "atrasadas") {
        const u = urgencia(t);
        if (u !== "atrasada") return false;
      } else if (filtroRapido === "urgentes") {
        const u = urgencia(t);
        if (u !== "atrasada" && u !== "hoje" && u !== "proxima") return false;
      } else if (filtroRapido === "sem_prazo") {
        if (t.prazo) return false;
      }
      return true;
    });

    lista = filtrarItensPorRegras(lista, regrasFiltro, (item, propId) => {
      if (propId === "titulo" || propId === "nome") return item.titulo;
      if (propId === "status") return item.status;
      if (propId === "tags") return item.tags || [];
      if (propId === "prazo") return item.prazo;
      if (propId === "criado_em") return item.bruto?.criado || item.bruto?.criado_em;
      if (propId === "atualizado_em") return item.bruto?.atualizado || item.bruto?.atualizado_em;
      if (propId === "pomodoro") return item.Pomodoro || item.bruto?.pomodoro;
      return (item as any)[propId] || item.bruto?.[propId];
    });

    return lista;
  }, [tarefas, pastaSelecionada, busca, regrasFiltro, filtroRapido]);

  // ── Sem configuração ────────────────────────────────────────────────────────
  if (!pronto) {
    return (
      <Vazio
        icone={<ListTodo size={24} />}
        titulo="Tarefas do seu repositório"
        descricao="Conecte seu repositório do GitHub em Ajustes para ver e gerenciar suas tarefas aqui."
        acao={
          <Botao variante="primario" onClick={() => navegar("/configuracoes")}>
            Ir para Ajustes
          </Botao>
        }
      />
    );
  }

  /** Ações em Lote para tarefas selecionadas */
  async function concluirSelecionadas() {
    const alvos = tarefas.filter((t) => selecionadas.has(t.caminho));
    if (alvos.length === 0) return;
    limparSelecao();
    try {
      for (const t of alvos) {
        const atualizada: Tarefa = { ...t, status: "feito" };
        const { dados, corpo } = tarefaParaArquivo(atualizada);
        const md = escreverMarkdown({ dados, corpo });
        await salvarTexto(t.caminho, md, t.sha, `conclui lote ${t.titulo}`);
      }
      invalidarCache();
      dispararAtualizacaoAcervo();
      recarregar();
      toast(`${alvos.length} tarefa(s) concluída(s)!`);
    } catch (err: any) {
      toast(`Erro ao concluir tarefas: ${err?.message || err}`, { tipo: "erro" });
    }
  }

  async function adiarSelecionadas(dias: number) {
    const alvos = tarefas.filter((t) => selecionadas.has(t.caminho));
    if (alvos.length === 0) return;
    limparSelecao();
    try {
      const dataBase = new Date();
      dataBase.setDate(dataBase.getDate() + dias);
      const iso = dataBase.toISOString().split("T")[0];
      for (const t of alvos) {
        const atualizada: Tarefa = { ...t, prazo: iso, bruto: { ...t.bruto, prazo: iso } };
        const { dados, corpo } = tarefaParaArquivo(atualizada);
        const md = escreverMarkdown({ dados, corpo });
        await salvarTexto(t.caminho, md, t.sha, `prazo lote ${iso}`);
      }
      invalidarCache();
      dispararAtualizacaoAcervo();
      recarregar();
      toast(`${alvos.length} tarefa(s) reagendada(s) para ${iso}!`);
    } catch (err: any) {
      toast(`Erro ao reagendar tarefas: ${err?.message || err}`, { tipo: "erro" });
    }
  }

  async function excluirSelecionadas() {
    const alvos = tarefas.filter((t) => selecionadas.has(t.caminho));
    if (alvos.length === 0) return;
    if (!confirm(`Deseja realmente excluir ${alvos.length} tarefa(s) selecionada(s)?`)) return;
    limparSelecao();
    try {
      for (const t of alvos) {
        await apagarItem(t.caminho, t.sha);
      }
      invalidarCache();
      dispararAtualizacaoAcervo();
      recarregar();
      toast(`${alvos.length} tarefa(s) excluída(s)!`);
    } catch (err: any) {
      toast(`Erro ao excluir tarefas: ${err?.message || err}`, { tipo: "erro" });
    }
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <CabecalhoPagina
        titulo="Tarefas e Metas"
        descricao="Gerencie seu fluxo diário, prazos e prioridades de trabalho."
        icone={<ListTodo size={20} />}
        corIcone="bg-primary/10 text-primary"
        acoes={
          <DropdownNovoViaModelo
            rotuloPrincipal="Nova Tarefa"
            iconePrincipal={<Plus size={15} />}
            aoCriarNovo={abrirNova}
            categoria="tarefa"
            aoCriarComTemplate={criarComModelo}
          />
        }
      />

      <BarraFerramentas
        busca={busca}
        aoMudarBusca={setBusca}
        placeholderBusca="Buscar tarefa por título..."
        filtros={
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1 bg-secondary/50 p-0.5 rounded-xl border border-border/60">
              {(
                [
                  { id: "todas", rotulo: "Todas" },
                  { id: "hoje", rotulo: "📅 Hoje" },
                  { id: "urgentes", rotulo: "🔥 Urgentes" },
                  { id: "atrasadas", rotulo: "⚠️ Atrasadas" },
                  { id: "sem_prazo", rotulo: "Sem Prazo" },
                ] as const
              ).map((op) => (
                <button
                  key={op.id}
                  type="button"
                  onClick={() => setFiltroRapido(op.id)}
                  className={cn(
                    "text-xs px-2.5 py-1 rounded-lg transition-all font-medium cursor-pointer",
                    filtroRapido === op.id
                      ? "bg-primary text-primary-foreground font-semibold shadow-2xs"
                      : "text-muted-foreground hover:text-foreground hover:bg-accent/60"
                  )}
                >
                  {op.rotulo}
                </button>
              ))}
            </div>

            <BarraFiltrosAvancados
              propriedadesDisponiveis={propriedadesDisponiveis}
              regras={regrasFiltro}
              aoMudarRegras={setRegrasFiltro}
            />
          </div>
        }
        acoes={
          <AlternadorVisao
            valorAtivo={visao}
            aoAlternar={(v) => {
              const novaVisao = v as ModoVisaoTela;
              setVisao(novaVisao);
              localStorage.setItem("tarefa-visao", novaVisao);
            }}
            opcoes={[
              { id: "quadro", rotulo: "Quadro", icone: <Columns3 size={15} /> },
              { id: "calendario", rotulo: "Calendário", icone: <CalendarDays size={15} /> },
              { id: "hibrido", rotulo: "Quadro + Agenda", icone: <LayoutGrid size={15} /> },
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
          aoCriarRapido={criarTarefaRapida}
          aoAdiarPrazo={adiarPrazo}
          aoDuplicar={duplicarTarefa}
          aoExcluir={(t) => setTarefaParaExcluir(t)}
          aoRegistrarEntregaPDI={(t) => setTarefaParaPDI(t)}
          gravandoCaminho={gravandoCaminho}
          selecionadas={selecionadas}
          aoToggleSelecionar={alternarSelecao}
        />
      ) : visao === "calendario" ? (
        <Calendario
          tarefas={tarefasExibidas}
          aoAbrir={abrir}
          aoAlternarStatus={(t) => mudarStatus(t, t.status === "feito" ? "a-fazer" : "feito")}
          aoAdiarPrazo={adiarPrazo}
          aoDuplicar={duplicarTarefa}
          aoExcluir={(t) => setTarefaParaExcluir(t)}
        />
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 items-start">
          <div className="xl:col-span-2">
            <Quadro
              tarefas={tarefasExibidas}
              aoAbrir={abrir}
              aoCronometrar={iniciar}
              aoMudarStatus={mudarStatus}
              aoCriarRapido={criarTarefaRapida}
              aoAdiarPrazo={adiarPrazo}
              aoDuplicar={duplicarTarefa}
              aoExcluir={(t) => setTarefaParaExcluir(t)}
              aoRegistrarEntregaPDI={(t) => setTarefaParaPDI(t)}
              gravandoCaminho={gravandoCaminho}
              selecionadas={selecionadas}
              aoToggleSelecionar={alternarSelecao}
            />
          </div>
          <div className="xl:col-span-1 border border-border/80 rounded-2xl p-2 bg-card/40 shadow-xs">
            <Calendario
              tarefas={tarefasExibidas}
              aoAbrir={abrir}
              aoAlternarStatus={(t) => mudarStatus(t, t.status === "feito" ? "a-fazer" : "feito")}
              aoAdiarPrazo={adiarPrazo}
              aoDuplicar={duplicarTarefa}
              aoExcluir={(t) => setTarefaParaExcluir(t)}
            />
          </div>
        </div>
      )}

      {/* Barra Flutuante de Ações em Lote */}
      {selecionadas.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 rounded-2xl border border-border bg-card/95 backdrop-blur-md px-4 py-2.5 shadow-2xl animate-in slide-in-from-bottom duration-200">
          <span className="text-xs font-bold text-foreground">
            {selecionadas.size} selecionada{selecionadas.size > 1 ? "s" : ""}
          </span>
          <div className="h-4 w-px bg-border mx-1" />
          <Botao tamanho="pequeno" variante="neutro" onClick={() => adiarSelecionadas(0)}>
            Hoje
          </Botao>
          <Botao tamanho="pequeno" variante="neutro" onClick={() => adiarSelecionadas(1)}>
            Amanhã
          </Botao>
          <Botao tamanho="pequeno" onClick={concluirSelecionadas}>
            Concluir
          </Botao>
          <Botao tamanho="pequeno" variante="perigo" onClick={excluirSelecionadas}>
            Excluir
          </Botao>
          <button
            onClick={limparSelecao}
            className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent text-xs font-semibold ml-1 cursor-pointer"
            title="Limpar seleção"
          >
            ✕
          </button>
        </div>
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
          erro={erroSalvar}
          mencoes={mencoesDaTarefa}
          opcoesRelacionamento={opcoesRelacionamento}
        />
      )}

      {/* Modal de confirmação de exclusão rápida */}
      {tarefaParaExcluir && (
        <ModalConfirmacao
          aberto={true}
          titulo="Excluir tarefa"
          descricao={`Tem certeza que deseja excluir a tarefa "${tarefaParaExcluir.titulo}"? Esta ação removerá o arquivo do repositório.`}
          textoConfirmar="Sim, excluir"
          varianteConfirmar="perigo"
          aoConfirmar={confirmarRemoverTarefa}
          aoCancelar={() => setTarefaParaExcluir(null)}
        />
      )}

      {/* Modal de registrar como entrega no PDI */}
      {tarefaParaPDI && (
        <ModalVincularPDI
          tarefa={tarefaParaPDI}
          aberto={true}
          aoFechar={() => setTarefaParaPDI(null)}
          aoSucesso={() => {
            setTarefaParaPDI(null);
            recarregar();
          }}
        />
      )}
      {/* O temporizador Pomodoro é agora renderizado globalmente via App.tsx */}
    </div>
  );
}
