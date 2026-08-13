import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Plus, Timer, Trash2, Check, List, CalendarDays } from "lucide-react";
import { lerConfig, configCompleta } from "@/lib/settings";
import { listar, ler, gravar, apagar } from "@/lib/github";
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
  // cópia de como a tarefa estava ao abrir, para detectar mudança não salva
  const [original, setOriginal] = useState<Tarefa | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [cronometrando, setCronometrando] = useState<Tarefa | null>(null);
  const [visao, setVisao] = useState<"lista" | "calendario">("lista");
  // caminho da tarefa cuja gravação está no ar — impede toque duplo
  const [gravandoCaminho, setGravandoCaminho] = useState<string | null>(null);

  /* ----------------------------------------------------------- carregar */

  const carregar = useCallback(async () => {
    if (!pronto) {
      setCarregando(false);
      return;
    }
    setCarregando(true);
    setErro("");
    try {
      const arquivos = (await listar(cfg, PASTA)).filter(
        (a) => !a.nome.startsWith("."),
      );
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
    const caminho =
      t.caminho || nomeLivre(PASTA, t.titulo, tarefas.map((x) => x.caminho));
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
      setOriginal(null);
      await carregar();
    } catch (e) {
      setErro(e instanceof Error ? e.message : String(e));
    } finally {
      setSalvando(false);
    }
  }

  /**
   * Marca feito/desfeito direto na lista.
   *
   * Três coisas deliberadas aqui:
   *
   * 1. **Não reordena na hora.** A ordenação joga "feito" para o fim; se a
   *    lista se reorganizasse a cada toque, a próxima tarefa saltaria para
   *    baixo do dedo e o toque seguinte cairia na errada. A ordem só muda
   *    quando você troca de filtro ou recarrega.
   * 2. **Não recarrega tudo.** Antes, um toque custava 1 gravação + 1 listagem
   *    + N leituras. Com 80 tarefas, 82 requisições para marcar uma caixinha.
   *    Agora o `sha` novo vem da própria resposta da gravação.
   * 3. **Ignora toque repetido** enquanto o anterior está no ar, senão o
   *    segundo vai com o `sha` velho e o GitHub recusa.
   */
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
      // guarda o sha novo para a próxima gravação não bater de frente
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

  /** Abre o modal guardando como o item estava, para detectar mudança. */
  function abrir(t: Tarefa) {
    setEditando(t);
    setOriginal(t);
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
    if (!confirm(`Apagar "${t.titulo}"?\n\nDá para recuperar pelo histórico do GitHub.`))
      return;
    try {
      await apagar(cfg, t.caminho, t.sha);
      setEditando(null);
      setOriginal(null);
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
        // relê a tarefa INTEIRA do arquivo, não só o corpo: se o prazo ou o
        // título mudaram no celular enquanto o timer rodava no Mac, gravar a
        // versão antiga aqui reverteria essa mudança sem ninguém perceber.
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

  // ordenar aqui (e não dentro de alternarFeito) mantém a linha parada
  // debaixo do dedo quando você marca uma caixinha
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
            return (
              <Cartao key={t.caminho} className="flex items-start gap-3 p-3.5">
                {/* -m-2 p-2: aumenta a área de toque para 36px sem mexer no layout */}
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
        temMudancas={
          editando !== null &&
          JSON.stringify(editando) !== JSON.stringify(original)
        }
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
