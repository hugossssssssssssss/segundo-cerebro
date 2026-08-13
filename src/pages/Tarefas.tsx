import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Plus, Timer, Trash2, Check } from "lucide-react";
import { lerConfig, configCompleta } from "@/lib/settings";
import { listar, ler, gravar, apagar } from "@/lib/github";
import {
  lerMarkdown,
  escreverMarkdown,
  tituloProvavel,
  nomeDeArquivo,
} from "@/lib/markdown";
import {
  comoTarefa,
  ordenar,
  urgencia,
  textoPrazo,
  registrarCiclo,
  minutosRegistrados,
  paraFrontmatter,
  ROTULO_STATUS,
  STATUS,
  type Tarefa,
  type Status,
} from "@/lib/tarefas";
import { Pomodoro } from "@/components/Pomodoro";
import {
  Botao,
  Campo,
  Cartao,
  Selo,
  Aviso,
  Vazio,
  Carregando,
  Modal,
  Rotulo,
  AreaTexto,
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

export default function Tarefas() {
  const cfg = lerConfig();
  const pronto = configCompleta(cfg);

  const [tarefas, setTarefas] = useState<Tarefa[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");
  const [filtro, setFiltro] = useState<Status | "todas">("todas");
  const [editando, setEditando] = useState<Tarefa | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [cronometrando, setCronometrando] = useState<Tarefa | null>(null);

  /* ----------------------------------------------------------- carregar */

  const carregar = useCallback(async () => {
    if (!pronto) {
      setCarregando(false);
      return;
    }
    setCarregando(true);
    setErro("");
    try {
      const arquivos = await listar(cfg, PASTA);
      const lidas = await Promise.all(
        arquivos.map(async (a) => {
          const { texto, sha } = await ler(cfg, a.caminho);
          const doc = lerMarkdown(texto);
          return comoTarefa(doc, a.caminho, sha, tituloProvavel(doc, a.nome));
        }),
      );
      setTarefas(ordenar(lidas));
    } catch (e) {
      setErro(e instanceof Error ? e.message : String(e));
    } finally {
      setCarregando(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pronto, cfg.repoOwner, cfg.repoName, cfg.githubToken, cfg.branch]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  /* -------------------------------------------------------------- ações */

  async function gravarTarefa(t: Tarefa, mensagem?: string) {
    const texto = escreverMarkdown({
      dados: paraFrontmatter(t),
      corpo: t.corpo,
    });
    const caminho = t.caminho || `${PASTA}/${nomeDeArquivo(t.titulo)}`;
    const sha = await gravar(cfg, caminho, texto, t.sha || undefined, mensagem);
    return { ...t, caminho, sha };
  }

  async function salvar() {
    if (!editando) return;
    if (!editando.titulo.trim()) {
      setErro("A tarefa precisa de um título.");
      return;
    }
    setSalvando(true);
    setErro("");
    try {
      await gravarTarefa(editando);
      setEditando(null);
      await carregar();
    } catch (e) {
      setErro(e instanceof Error ? e.message : String(e));
    } finally {
      setSalvando(false);
    }
  }

  /** Marca feito/desfeito direto na lista, sem abrir a tarefa. */
  async function alternarFeito(t: Tarefa) {
    const novo: Tarefa = {
      ...t,
      status: t.status === "feito" ? "a-fazer" : "feito",
    };
    // Atualiza a tela antes da rede responder — desmarcar e esperar 2s é ruim
    setTarefas((lista) => ordenar(lista.map((x) => (x.caminho === t.caminho ? novo : x))));
    try {
      await gravarTarefa(novo, `${novo.status === "feito" ? "conclui" : "reabre"} ${t.titulo}`);
      await carregar();
    } catch (e) {
      setErro(e instanceof Error ? e.message : String(e));
      await carregar(); // desfaz o otimismo se deu errado
    }
  }

  async function remover(t: Tarefa) {
    if (!confirm(`Apagar "${t.titulo}"?\n\nDá para recuperar pelo histórico do GitHub.`))
      return;
    try {
      await apagar(cfg, t.caminho, t.sha);
      setEditando(null);
      await carregar();
    } catch (e) {
      setErro(e instanceof Error ? e.message : String(e));
    }
  }

  /** Um ciclo de pomodoro terminou: registra o tempo no arquivo da tarefa. */
  const registrarTempo = useCallback(
    async (minutos: number) => {
      if (!cronometrando) return;
      try {
        // relê antes de gravar, para não sobrescrever edição feita nesse meio-tempo
        const { texto, sha } = await ler(cfg, cronometrando.caminho);
        const doc = lerMarkdown(texto);
        const atualizado = {
          ...cronometrando,
          sha,
          corpo: registrarCiclo(doc.corpo, minutos),
        };
        const salva = await gravarTarefa(atualizado, `+${minutos}min em ${cronometrando.titulo}`);
        setCronometrando(salva);
        await carregar();
      } catch (e) {
        setErro(e instanceof Error ? e.message : String(e));
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [cronometrando, cfg.repoOwner, cfg.repoName, cfg.githubToken],
  );

  /* --------------------------------------------------------- sem config */

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

  const visiveis =
    filtro === "todas" ? tarefas : tarefas.filter((t) => t.status === filtro);
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
        <Botao
          onClick={() =>
            setEditando({
              caminho: "",
              sha: "",
              titulo: "",
              status: "a-fazer",
              tags: [],
              corpo: "",
            })
          }
        >
          <Plus size={16} />
          Nova
        </Botao>
      </div>

      {/* filtros */}
      <div className="flex gap-2 overflow-x-auto pb-1">
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
            return (
              <Cartao key={t.caminho} className="flex items-start gap-3 p-3.5">
                <button
                  onClick={() => alternarFeito(t)}
                  className={cn(
                    "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border-2 transition-colors",
                    t.status === "feito"
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border hover:border-primary",
                  )}
                  title={t.status === "feito" ? "Reabrir" : "Concluir"}
                >
                  {t.status === "feito" && <Check size={13} strokeWidth={3} />}
                </button>

                <button
                  onClick={() => setEditando(t)}
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
                    {t.tags.map((tag) => (
                      <Selo key={tag}>#{tag}</Selo>
                    ))}
                  </div>
                </button>

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
              </Cartao>
            );
          })}
        </div>
      )}

      {/* ------------------------------------------------------ edição */}
      <Modal
        aberto={editando !== null}
        aoFechar={() => setEditando(null)}
        titulo={editando?.caminho ? "Editar tarefa" : "Nova tarefa"}
        rodape={
          <>
            {editando?.caminho && (
              <Botao variante="fantasma" onClick={() => editando && remover(editando)}>
                <Trash2 size={16} />
                Apagar
              </Botao>
            )}
            <Botao variante="neutro" onClick={() => setEditando(null)}>
              Cancelar
            </Botao>
            <Botao onClick={salvar} disabled={salvando}>
              {salvando ? "Salvando…" : "Salvar"}
            </Botao>
          </>
        }
      >
        {editando && (
          <div className="space-y-4">
            <div>
              <Rotulo>Título</Rotulo>
              <Campo
                value={editando.titulo}
                onChange={(e) =>
                  setEditando({ ...editando, titulo: e.target.value })
                }
                placeholder="O que precisa ser feito?"
                autoFocus
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Rotulo>Situação</Rotulo>
                <select
                  value={editando.status}
                  onChange={(e) =>
                    setEditando({
                      ...editando,
                      status: e.target.value as Status,
                    })
                  }
                  className="flex h-11 w-full rounded-lg border border-input bg-card px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {STATUS.map((s) => (
                    <option key={s} value={s}>
                      {ROTULO_STATUS[s]}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Rotulo>Prazo</Rotulo>
                <Campo
                  type="date"
                  value={editando.prazo ?? ""}
                  onChange={(e) =>
                    setEditando({
                      ...editando,
                      prazo: e.target.value || undefined,
                    })
                  }
                />
              </div>
            </div>

            <div>
              <Rotulo dica="Separe por vírgula.">Tags</Rotulo>
              <Campo
                value={editando.tags.join(", ")}
                onChange={(e) =>
                  setEditando({
                    ...editando,
                    tags: e.target.value
                      .split(",")
                      .map((s) => s.trim())
                      .filter(Boolean),
                  })
                }
                placeholder="design, cliente"
              />
            </div>

            <div>
              <Rotulo>Anotações</Rotulo>
              <AreaTexto
                value={editando.corpo}
                onChange={(e) =>
                  setEditando({ ...editando, corpo: e.target.value })
                }
                placeholder="Detalhes, links, o que for útil…"
                className="min-h-32"
              />
            </div>
          </div>
        )}
      </Modal>

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
