import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  Plus,
  Columns3,
  CalendarDays,
  ListTodo,
  Calendar,
  Tag,
} from "lucide-react";
import { PainelNotionBase, type ModoVisaoNotion } from "@/components/PainelNotionBase";
import { lerConfig, configCompleta } from "@/lib/settings";
import { ler } from "@/lib/github";
import { useItemRepo } from "@/lib/useItemRepo";
import { useSalvar } from "@/lib/useSalvar";
import { PASTAS } from "@/lib/tipos";
import { comoTarefa, tarefaParaArquivo } from "@/lib/entidades";
import { montarIndice, mencoesA, alvosUnicos } from "@/lib/links";
import {
  lerMarkdown,
  escreverMarkdown,
  tituloProvavel,
  nomeLivre,
} from "@/lib/markdown";
import {
  registrarCiclo,
  type Tarefa,
  type Status,
} from "@/lib/tarefas";
import { Pomodoro } from "@/components/Pomodoro";
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
import { toast } from "@/lib/toast";

export default function Tarefas() {
  const cfg = lerConfig();
  const pronto = configCompleta(cfg);
  const location = useLocation();
  const navegar = useNavigate();
  const { abrirFlutuante, focarFlutuante } = useItemFlutuante();

  // ── Carregamento ──────────────────────────────────────────────────────────
  const { itens: tarefas, acervo, carregando, erro: erroCarregar, recarregar } =
    useItemRepo(cfg, PASTAS.tarefas, (item) =>
      comoTarefa(item.doc, item.caminho, item.sha, tituloProvavel(item.doc, item.nome)),
    );

  // ── Salvamento ────────────────────────────────────────────────────────────
  const { salvarTexto, apagarItem, salvando, erro: erroSalvar, limparErro } = useSalvar(cfg);
  const [erroLocal, setErroLocal] = useState("");
  const erro = erroLocal || erroCarregar || erroSalvar;

  // ── Estado da UI ──────────────────────────────────────────────────────────
  const [busca, setBusca] = useState("");
  const [editando, setEditando] = useState<Tarefa | null>(null);
  const [original, setOriginal] = useState<Tarefa | null>(null);
  const [cronometrando, setCronometrando] = useState<Tarefa | null>(null);
  const [tagSelecionada, setTagSelecionada] = useState<string | null>(null);
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

  // ── Modo flutuante ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (modoVisao === "flutuante" && editando) {
      const tarefaOriginal = { ...editando };
      const dados = { status: tarefaOriginal.status, prazo: tarefaOriginal.prazo, tags: tarefaOriginal.tags, ...tarefaOriginal.bruto };
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
    const caminho = t.caminho || nomeLivre(PASTAS.tarefas, t.titulo, tarefas.map((x) => x.caminho));
    const sha = await salvarTexto(caminho, texto, t.sha || undefined, mensagemCommit);
    return { ...t, caminho, sha };
  }

  // ── Ações ──────────────────────────────────────────────────────────────────

  function fechar() {
    if (editando) {
      const mudou = original !== null && JSON.stringify(editando) !== JSON.stringify(original);
      if (mudou && editando.titulo.trim()) {
        const tSalvar = { ...editando };
        salvar(tSalvar).catch((err) => {
          toast(`Erro ao salvar tarefa: ${err?.message || "Falha na gravação"}`, { tipo: "erro" });
        });
      }
    }
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

  const registrarTempo = useCallback(
    async (minutos: number) => {
      if (!cronometrando) return;
      try {
        const { texto, sha } = await ler(cfg, cronometrando.caminho);
        const doc = lerMarkdown(texto);
        const atual = comoTarefa(doc, cronometrando.caminho, sha, cronometrando.titulo);
        const atualizado = { ...atual, corpo: registrarCiclo(doc.corpo, minutos) };
        const salva = await gravarTarefa(atualizado, `+${minutos}min em ${cronometrando.titulo}`);
        setCronometrando(salva);
        recarregar();
      } catch (e) {
        setErroLocal(e instanceof Error ? e.message : String(e));
      }
    },
    [cronometrando, cfg.repoOwner, cfg.repoName, cfg.githubToken],
  );

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
    if (tagSelecionada && (!t.tags || !t.tags.includes(tagSelecionada))) {
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
          <Botao onClick={abrirNova}>
            <Plus size={16} />
            Nova Tarefa
          </Botao>
        }
      />

      <BarraFerramentas
        busca={busca}
        aoMudarBusca={setBusca}
        placeholderBusca="Buscar tarefa por título..."
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

      {/* Filtro por Tags */}
      {todasTags.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap py-1">
          <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
            <Tag size={12} /> Tags:
          </span>
          <button
            onClick={() => setTagSelecionada(null)}
            className={cn(
              "px-2.5 py-0.5 rounded-full text-xs font-medium transition-colors cursor-pointer",
              tagSelecionada === null
                ? "bg-primary text-primary-foreground font-semibold"
                : "bg-secondary/60 text-muted-foreground hover:bg-accent",
            )}
          >
            Todas
          </button>
          {todasTags.map((t) => (
            <button
              key={t}
              onClick={() => setTagSelecionada(t === tagSelecionada ? null : t)}
              className={cn(
                "px-2.5 py-0.5 rounded-full text-xs font-medium transition-colors cursor-pointer",
                tagSelecionada === t
                  ? "bg-primary text-primary-foreground font-semibold"
                  : "bg-secondary/60 text-muted-foreground hover:bg-accent",
              )}
            >
              #{t}
            </button>
          ))}
        </div>
      )}

      {erro && <Aviso tom="erro">{erro}</Aviso>}

      {carregando ? (
        <Carregando texto="Buscando suas tarefas…" />
      ) : visao === "quadro" ? (
        <Quadro
          tarefas={tarefasExibidas}
          aoAbrir={abrir}
          aoCronometrar={setCronometrando}
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
          }}
          onChangeProps={(nProps) => {
            setEditando({
              ...editando,
              bruto: nProps,
              status: (nProps.status as Status) || editando.status,
              prazo: nProps.prazo as string | undefined,
              tags: Array.isArray(nProps.tags) ? nProps.tags as string[] : editando.tags,
            });
          }}
          camposFixosProps={{
            status: { icone: <ListTodo className="h-4 w-4 opacity-50" />, tipo: "status" },
            prazo: { icone: <Calendar className="h-4 w-4 opacity-50" />, tipo: "data" },
            tags: { icone: <Tag className="h-4 w-4 opacity-50" />, tipo: "multiselect" },
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
