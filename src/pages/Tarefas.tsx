import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  Plus,
  Timer,
  Check,
  List,
  Columns3,
  CalendarDays,
  ListTodo,
  Calendar,
  Tag,
} from "lucide-react";
import { PainelNotionBase, type ModoVisaoNotion } from "@/components/PainelNotionBase";
import { lerConfig, configCompleta } from "@/lib/settings";
import { ler, gravar, apagar } from "@/lib/github";
import { carregarRepo, daPasta, invalidarCache, atualizarCacheLocal, type ItemRepo } from "@/lib/repo";
import { montarIndice, mencoesA } from "@/lib/links";
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
import { Quadro } from "@/components/Quadro";
import {
  Botao,
  Cartao,
  Selo,
  Aviso,
  Vazio,
  Carregando,
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



/* Painel de Edição estilo Notion com suporte aos 4 modos: Pop-up, Do Lado, Tela Cheia e Flutuante */
export function PainelTarefaNotion({
  modoVisao,
  setModoVisao,
  editando,
  original,
  salvando,
  aoFechar,
  aoSalvar,
  aoRemover,
  setEditando,
  opcoesRelacionamento,
  mencoesDaTarefa,
  erro,
}: {
  modoVisao: ModoVisaoNotion;
  setModoVisao: (m: ModoVisaoNotion) => void;
  editando: Tarefa;
  original: Tarefa | null;
  salvando: boolean;
  aoFechar: () => void;
  aoSalvar: (t: Tarefa, fechar?: boolean) => void;
  aoRemover: () => void;
  setEditando: React.Dispatch<React.SetStateAction<Tarefa | null>>;
  opcoesRelacionamento: { titulo: string; caminho: string }[];
  mencoesDaTarefa: any[];
  erro?: string;
}) {
  const temMudancas =
    original !== null &&
    JSON.stringify(editando) !== JSON.stringify(original);

  return (
    <PainelNotionBase
      rotuloTipo={editando.caminho ? "Tarefa" : "Nova tarefa"}
      modoVisao={modoVisao}
      setModoVisao={setModoVisao}
      titulo={editando.titulo}
      setTitulo={(t) => setEditando({ ...editando, titulo: t })}
      corpo={editando.corpo}
      setCorpo={(c) => setEditando({ ...editando, corpo: c })}
      dadosProps={{
        ...editando.bruto,
        status: editando.status,
        prazo: editando.prazo,
        tags: editando.tags,
      }}
      onChangeProps={(novosDados) => {
        setEditando({
          ...editando,
          bruto: novosDados,
          status: (novosDados.status as Status) || editando.status,
          prazo: novosDados.prazo,
          tags: Array.isArray(novosDados.tags) ? novosDados.tags : editando.tags,
        });
      }}
      camposFixosProps={{
        status: { icone: <ListTodo className="h-4 w-4 opacity-50" />, tipo: "status" },
        prazo: { icone: <Calendar className="h-4 w-4 opacity-50" />, tipo: "data" },
        tags: { icone: <Tag className="h-4 w-4 opacity-50" />, tipo: "multiselect" },
      }}
      salvando={salvando}
      temMudancas={temMudancas}
      aoFechar={aoFechar}
      aoSalvar={async (fechar) => { await aoSalvar(editando, fechar); }}
      aoRemover={editando.caminho ? async () => { aoRemover(); } : undefined}
      erro={erro}
      mencoes={mencoesDaTarefa}
      opcoesRelacionamento={opcoesRelacionamento}
    />
  );
}

import { useItemFlutuante } from "@/components/ItemFlutuanteContext";

export default function Tarefas() {
  const cfg = lerConfig();
  const pronto = configCompleta(cfg);
  const location = useLocation();
  const navegar = useNavigate();
  const { abrirFlutuante, focarFlutuante } = useItemFlutuante();

  const [tarefas, setTarefas] = useState<Tarefa[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");
  const [filtro, setFiltro] = useState<Status | "todas">("todas");
  const [editando, setEditando] = useState<Tarefa | null>(null);
  const [original, setOriginal] = useState<Tarefa | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [cronometrando, setCronometrando] = useState<Tarefa | null>(null);
  // a visão escolhida fica guardada: quem gosta de quadro quer quadro sempre
  const [visao, setVisao] = useState<"lista" | "quadro" | "calendario">(() => {
    const salvo = localStorage.getItem("tarefa-visao");
    return salvo === "quadro" || salvo === "calendario" ? salvo : "lista";
  });
  const [gravandoCaminho, setGravandoCaminho] = useState<string | null>(null);
  const [acervo, setAcervo] = useState<ItemRepo[]>([]);

  const [modoVisao, setModoVisao] = useState<ModoVisaoNotion>(() => {
    const salvo = localStorage.getItem("tarefa-modo-visao");
    return (salvo as any) || "popup";
  });

  const alternarModoVisao = (novo: ModoVisaoNotion) => {
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
    const docAtualizado = lerMarkdown(texto);
    atualizarCacheLocal(caminho, texto, docAtualizado, t.sha || undefined);
    const sha = await gravar(cfg, caminho, texto, t.sha || undefined, mensagem);
    atualizarCacheLocal(caminho, texto, docAtualizado, sha);
    invalidarCache();
    return { ...t, caminho, sha };
  }

  function fechar() {
    setEditando(null);
    setOriginal(null);
    navegar(location.pathname, { replace: true });
  }

  // Quando o usuário clica no modo flutuante, transfere para o provedor global que flutua pelo app inteiro
  useEffect(() => {
    if (modoVisao === "flutuante" && editando) {
      abrirFlutuante({
        id: editando.caminho,
        rotuloTipo: editando.caminho ? "Tarefa" : "Nova tarefa",
        titulo: editando.titulo,
        corpo: editando.corpo,
        dadosProps: paraFrontmatter(editando),
        camposFixosProps: {
          status: { icone: <ListTodo className="h-4 w-4 opacity-50 text-blue-500" />, tipo: "status" },
          prazo: { icone: <Calendar className="h-4 w-4 opacity-50 text-rose-500" />, tipo: "data" },
          tags: { icone: <Tag className="h-4 w-4 opacity-50 text-amber-500" />, tipo: "multiselect" },
        },
        caminho: editando.caminho,
        sha: editando.sha,
        temMudancas: JSON.stringify(editando) !== JSON.stringify(original),
        salvando,
        erro,
        mencoes: mencoesDaTarefa,
        opcoesRelacionamento,
        setTitulo: (t) => setEditando((cur) => cur ? { ...cur, titulo: t } : null),
        setCorpo: (c) => setEditando((cur) => cur ? { ...cur, corpo: c } : null),
        onChangeProps: (nProps) => setEditando((cur) => cur ? comoTarefa({ dados: nProps, corpo: cur.corpo }, cur.caminho, cur.sha, cur.titulo) : null),
        aoSalvar: async (item, fecharAoSalvar) => {
          await salvar({ ...editando, titulo: item.titulo, corpo: item.corpo }, fecharAoSalvar);
        },
        aoRemover: editando.caminho ? async () => { await remover(editando); } : undefined,
      });
      setEditando(null);
      setOriginal(null);
      setModoVisao("popup");
    }
  }, [modoVisao, editando]);

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
      setEditando((atual) => (atual ? { ...atual, sha: salva.sha, caminho: salva.caminho } : salva));
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

  /**
   * Troca o status de uma tarefa e grava.
   *
   * É o caminho comum da caixinha da lista e do arrastar no quadro. Três
   * coisas deliberadas, herdadas da versão que só marcava feito:
   *
   * 1. **A tela muda antes da gravação** e volta atrás se der erro. Esperar o
   *    GitHub responder para o cartão sair do lugar deixava o arrasto com
   *    cara de travado.
   * 2. **Não recarrega tudo.** O `sha` novo vem da própria resposta.
   * 3. **Ignora toque repetido** enquanto o anterior está no ar, senão o
   *    segundo vai com o `sha` velho e o GitHub recusa.
   */
  async function mudarStatus(t: Tarefa, novoStatus: Status) {
    if (gravandoCaminho === t.caminho || t.status === novoStatus) return;

    const novo: Tarefa = { ...t, status: novoStatus };

    setGravandoCaminho(t.caminho);
    setTarefas((lista) => lista.map((x) => (x.caminho === t.caminho ? novo : x)));

    const verbo =
      novoStatus === "feito"
        ? "conclui"
        : novoStatus === "fazendo"
          ? "comeca"
          : "reabre";

    try {
      const salva = await gravarTarefa(novo, `${verbo} ${t.titulo}`);
      setTarefas((lista) =>
        lista.map((x) => (x.caminho === salva.caminho ? salva : x)),
      );
    } catch (e) {
      setErro(e instanceof Error ? e.message : String(e));
      // desfaz só esta linha, sem recarregar a lista inteira
      setTarefas((lista) => lista.map((x) => (x.caminho === t.caminho ? t : x)));
    } finally {
      setGravandoCaminho(null);
    }
  }

  function alternarFeito(t: Tarefa) {
    return mudarStatus(t, t.status === "feito" ? "a-fazer" : "feito");
  }

  function abrir(t: Tarefa) {
    if (focarFlutuante(t.caminho)) return;
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

      {/* alterna lista / quadro / calendário */}
      <div className="flex gap-2">
        {(
          [
            ["lista", "Lista", List],
            ["quadro", "Quadro", Columns3],
            ["calendario", "Calendário", CalendarDays],
          ] as const
        ).map(
          ([v, rotulo, Icone]) => (
            <button
              key={v}
              onClick={() => {
                setVisao(v);
                localStorage.setItem("tarefa-visao", v);
              }}
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
