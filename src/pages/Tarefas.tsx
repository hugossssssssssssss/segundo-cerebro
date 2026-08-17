import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  Plus,
  Timer,
  List,
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
  ordenar,
  urgencia,
  textoPrazo,
  registrarCiclo,
  minutosRegistrados,
  progressoSubtarefas,
  STATUS,
  ROTULO_STATUS,
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
import { SeloStatus } from "@/components/SeloStatus";
import { CartaoItem } from "@/components/CartaoItem";
import { cn, lerParametroAbrir, correspondeBusca } from "@/lib/utils";
import { useItemFlutuante } from "@/components/ItemFlutuanteContext";
import { toast } from "@/lib/toast";

const CORES_URGENCIA = {
  atrasada: "perigo",
  hoje: "aviso",
  proxima: "primario",
  tranquila: "neutro",
  nenhuma: "neutro",
} as const;

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
  const [filtro, setFiltro] = useState<Status | "todas">("todas");
  const [editando, setEditando] = useState<Tarefa | null>(null);
  const [original, setOriginal] = useState<Tarefa | null>(null);
  const [cronometrando, setCronometrando] = useState<Tarefa | null>(null);
  const [visao, setVisao] = useState<"lista" | "quadro" | "calendario">(() => {
    const salvo = localStorage.getItem("tarefa-visao");
    return salvo === "quadro" || salvo === "calendario" ? salvo : "lista";
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

  const visiveis = ordenar(
    (filtro === "todas" ? tarefas : tarefas.filter((t) => t.status === filtro))
      .filter((t) =>
        correspondeBusca(t.titulo, busca) ||
        correspondeBusca(t.corpo, busca) ||
        t.tags.some((tag) => correspondeBusca(tag, busca))
      )
  );
  const pendentes = tarefas.filter((t) => t.status !== "feito").length;

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <CabecalhoPagina
        titulo="Tarefas"
        descricao="Organize suas pendências, prazos e prioridades do dia a dia."
        icone={<ListTodo size={20} />}
        corIcone="bg-blue-500/10 text-blue-600 dark:text-blue-400"
        badge={
          pendentes > 0 ? (
            <span className="rounded-full bg-amber-500/15 px-2.5 py-0.5 text-xs font-bold text-amber-600 dark:text-amber-400">
              {pendentes} {pendentes === 1 ? "pendente" : "pendentes"}
            </span>
          ) : undefined
        }
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
              setVisao(v);
              localStorage.setItem("tarefa-visao", v);
            }}
            opcoes={[
              { id: "lista", rotulo: "Lista", icone: <List size={15} /> },
              { id: "quadro", rotulo: "Quadro", icone: <Columns3 size={15} /> },
              { id: "calendario", rotulo: "Calendário", icone: <CalendarDays size={15} /> },
            ]}
          />
        }
      />

      {/* filtros — no quadro não fazem sentido: as colunas JÁ são o filtro */}
      <div
        className={cn(
          "flex gap-2 overflow-x-auto pb-1",
          visao !== "lista" && "hidden",
        )}
      >
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
      ) : visao === "quadro" ? (
        <Quadro
          tarefas={tarefas}
          aoAbrir={abrir}
          aoCronometrar={setCronometrando}
          aoMudarStatus={mudarStatus}
          gravandoCaminho={gravandoCaminho}
        />
      ) : visao === "calendario" ? (
        <Calendario tarefas={tarefas} aoAbrir={abrir} />
      ) : visiveis.length === 0 ? (
        <Vazio
          icone={<ListTodo size={24} />}
          titulo={filtro === "todas" ? "Nenhuma tarefa criada ainda" : "Nenhuma tarefa encontrada"}
          descricao={
            filtro === "todas"
              ? "Cada tarefa vira um arquivo .md no seu repositório — com suporte a prazos e Pomodoro."
              : `Nenhuma tarefa com o filtro atual "${ROTULO_STATUS[filtro as Status]}".`
          }
        />
      ) : (
        <div className="grid gap-2.5">
          {visiveis.map((t) => {
            const u = urgencia(t);
            const min = minutosRegistrados(t.corpo);
            const passos = progressoSubtarefas(t.corpo);
            const tomUrgencia = CORES_URGENCIA[u];

            return (
              <CartaoItem
                key={t.caminho}
                icone={<ListTodo size={18} />}
                titulo={
                  <span className={cn(t.status === "feito" && "line-through text-muted-foreground")}>
                    {t.titulo}
                  </span>
                }
                badge={
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {t.status === "fazendo" && (
                      <SeloStatus rotulo="Fazendo" tom="primario" />
                    )}
                    {t.status === "feito" && (
                      <SeloStatus rotulo="Concluída" tom="sucesso" />
                    )}
                    {u !== "nenhuma" && (
                      <SeloStatus rotulo={textoPrazo(t)} tom={tomUrgencia as any} />
                    )}
                    {min > 0 && <SeloStatus rotulo={`🍅 ${min}min`} tom="neutro" comPonto={false} />}
                    {passos.total > 0 && (
                      <SeloStatus
                        rotulo={`${passos.feitas}/${passos.total} passos`}
                        tom={passos.porcento === 100 ? "sucesso" : "neutro"}
                        comPonto={false}
                      />
                    )}
                  </div>
                }
                tags={t.tags}
                acoes={
                  t.status !== "feito" ? (
                    <Botao
                      variante="fantasma"
                      tamanho="icone"
                      onClick={(e) => {
                        e.stopPropagation();
                        setCronometrando(t);
                      }}
                      title="Iniciar Pomodoro"
                    >
                      <Timer size={17} />
                    </Botao>
                  ) : undefined
                }
                onClick={() => abrir(t)}
              />
            );
          })}
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
