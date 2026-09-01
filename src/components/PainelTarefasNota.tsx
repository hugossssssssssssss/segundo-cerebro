import { useState, useMemo, useCallback } from "react";
import {
  CheckSquare,
  Square,
  Plus,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  ListTodo,
  Timer,
} from "lucide-react";
import { cache, invalidarCache } from "@/lib/repo";
import { comoTarefa, tarefaParaArquivo } from "@/lib/entidades";
import { escreverMarkdown, nomeLivre, tituloProvavel } from "@/lib/markdown";
import { lerConfig } from "@/lib/settings";
import { useSalvar } from "@/lib/useSalvar";
import { dispararAtualizacaoAcervo } from "@/lib/eventos";
import { abrirItemSpa } from "@/components/PropriedadesNotion";
import { toast } from "@/lib/toast";
import { cn } from "@/lib/utils";
import type { Tarefa } from "@/lib/tipos";

interface PainelTarefasNotaProps {
  tituloNota: string;
  caminhoNota?: string;
  relacionamentos?: string[];
  aoAtualizar?: () => void;
}

export function PainelTarefasNota({
  tituloNota,
  caminhoNota,
  relacionamentos = [],
  aoAtualizar,
}: PainelTarefasNotaProps) {
  const [expandido, setExpandido] = useState(true);
  const [novaTarefaTexto, setNovaTarefaTexto] = useState("");
  const [salvandoNova, setSalvandoNova] = useState(false);
  const [tarefaEmMudanca, setTarefaEmMudanca] = useState<string | null>(null);

  const cfg = useMemo(() => lerConfig(), []);
  const { salvarTexto } = useSalvar(cfg);

  // Busca no cache todas as tarefas ligadas a esta nota
  const tarefasVinculadas = useMemo<Tarefa[]>(() => {
    if (!tituloNota && !caminhoNota) return [];
    if (!cache?.itens) return [];

    const normTitulo = tituloNota.toLowerCase().trim();
    const normCaminho = caminhoNota?.toLowerCase().trim() || "";
    const baseCaminho = caminhoNota
      ? caminhoNota.split("/").pop()?.replace(/\.md$/, "").toLowerCase().trim() || ""
      : "";

    const resultados: Tarefa[] = [];

    for (const item of cache.itens) {
      if (!item.caminho.startsWith("tarefas/")) continue;
      if (!item.caminho.endsWith(".md")) continue;

      const t = comoTarefa(
        item.doc,
        item.caminho,
        item.sha,
        tituloProvavel(item.doc, item.nome)
      );

      // Checa se a tarefa tem relacionamento com a nota atual
      const relsTarefa = (t.relacionamentos || []).map((r) =>
        r.replace(/^[@[]+/, "").replace(/\]\]$/, "").toLowerCase().trim()
      );

      const relacionadoPeloCampo = relsTarefa.some(
        (r) =>
          (normTitulo && (r === normTitulo || r.includes(normTitulo) || normTitulo.includes(r))) ||
          (normCaminho && r === normCaminho) ||
          (baseCaminho && r === baseCaminho)
      );

      // Checa se a nota atual lista essa tarefa em seus relacionamentos
      const normTituloTarefa = t.titulo.toLowerCase().trim();
      const normCaminhoTarefa = t.caminho.toLowerCase().trim();
      const baseCaminhoTarefa = t.caminho.split("/").pop()?.replace(/\.md$/, "").toLowerCase().trim() || "";

      const relacionadoPelaNota = relacionamentos.some((r) => {
        const limpo = r.replace(/^[@[]+/, "").replace(/\]\]$/, "").toLowerCase().trim();
        return (
          limpo === normTituloTarefa ||
          limpo === normCaminhoTarefa ||
          limpo === baseCaminhoTarefa
        );
      });

      // Checa se o corpo da tarefa cita a nota
      const corpoNorm = (t.corpo || "").toLowerCase();
      const citadoNoCorpo =
        normTitulo &&
        (corpoNorm.includes(`@${normTitulo}`) || corpoNorm.includes(`[[${normTitulo}]]`));

      if (relacionadoPeloCampo || relacionadoPelaNota || citadoNoCorpo) {
        resultados.push(t);
      }
    }

    // Ordena: pendentes primeiro, concluídas depois
    return resultados.sort((a, b) => {
      if (a.status === "feito" && b.status !== "feito") return 1;
      if (a.status !== "feito" && b.status === "feito") return -1;
      return a.titulo.localeCompare(b.titulo);
    });
  }, [tituloNota, caminhoNota, relacionamentos]);

  const concluidasCount = useMemo(
    () => tarefasVinculadas.filter((t) => t.status === "feito").length,
    [tarefasVinculadas]
  );

  // Alternar status da tarefa de forma instantânea
  const toggleStatusTarefa = useCallback(
    async (tarefa: Tarefa) => {
      const novoStatus = tarefa.status === "feito" ? "a-fazer" : "feito";
      setTarefaEmMudanca(tarefa.caminho);

      try {
        const tarefaAtualizada: Tarefa = {
          ...tarefa,
          status: novoStatus,
        };
        const { dados, corpo } = tarefaParaArquivo(tarefaAtualizada);
        const markdown = escreverMarkdown({ dados, corpo });

        await salvarTexto(
          tarefa.caminho,
          markdown,
          tarefa.sha,
          `status: ${novoStatus} (${tarefa.titulo})`
        );

        invalidarCache();
        dispararAtualizacaoAcervo();
        if (aoAtualizar) aoAtualizar();
        toast(
          novoStatus === "feito"
            ? `Tarefa "${tarefa.titulo}" concluída!`
            : `Tarefa "${tarefa.titulo}" reaberta!`
        );
      } catch (err: any) {
        toast(`Erro ao atualizar status: ${err?.message || err}`, { tipo: "erro" });
      } finally {
        setTarefaEmMudanca(null);
      }
    },
    [salvarTexto, aoAtualizar]
  );

  // Criar uma nova tarefa vinculada à nota
  const criarTarefaVinculada = useCallback(async () => {
    const texto = novaTarefaTexto.trim();
    if (!texto || salvandoNova) return;

    setSalvandoNova(true);
    try {
      const todosItens = cache?.itens || [];
      const caminhosExistentes = todosItens.map((i) => i.caminho);
      const caminhoNovo = nomeLivre("tarefas", texto, caminhosExistentes);

      const novaTarefa: Tarefa = {
        caminho: caminhoNovo,
        sha: "",
        bruto: {},
        titulo: texto,
        status: "a-fazer",
        tags: [],
        corpo: "",
        relacionamentos: tituloNota ? [`@${tituloNota}`] : [],
      };

      const { dados, corpo } = tarefaParaArquivo(novaTarefa);
      const markdown = escreverMarkdown({ dados, corpo });

      await salvarTexto(caminhoNovo, markdown, undefined, `criar tarefa: ${texto}`);
      invalidarCache();
      dispararAtualizacaoAcervo();
      setNovaTarefaTexto("");
      toast(`Tarefa criada e vinculada a "${tituloNota || "esta nota"}"!`);
      if (aoAtualizar) aoAtualizar();
    } catch (err: any) {
      toast(`Erro ao criar tarefa: ${err?.message || err}`, { tipo: "erro" });
    } finally {
      setSalvandoNova(false);
    }
  }, [novaTarefaTexto, salvandoNova, tituloNota, salvarTexto, aoAtualizar]);

  return (
    <div className="rounded-xl border border-border/70 bg-card/60 overflow-hidden transition-all shadow-xs">
      {/* Cabeçalho da Seção */}
      <div
        onClick={() => setExpandido(!expandido)}
        className="flex items-center justify-between px-3.5 py-2.5 bg-muted/30 hover:bg-muted/50 cursor-pointer select-none transition-colors border-b border-border/40"
      >
        <div className="flex items-center gap-2">
          {expandido ? (
            <ChevronDown size={14} className="text-muted-foreground" />
          ) : (
            <ChevronRight size={14} className="text-muted-foreground" />
          )}
          <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
            <ListTodo size={14} className="text-primary" />
            Tarefas deste Projeto / Nota
          </span>
          {tarefasVinculadas.length > 0 && (
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
              {concluidasCount}/{tarefasVinculadas.length}
            </span>
          )}
        </div>

        <span className="text-[11px] text-muted-foreground">
          {expandido ? "Ocultar" : "Expandir"}
        </span>
      </div>

      {/* Conteúdo Expansível */}
      {expandido && (
        <div className="p-3 space-y-2">
          {tarefasVinculadas.length === 0 ? (
            <p className="text-xs text-muted-foreground italic px-1 py-1">
              Nenhuma tarefa do Kanban vinculada a esta nota ainda.
            </p>
          ) : (
            <div className="space-y-1">
              {tarefasVinculadas.map((t) => {
                const feita = t.status === "feito";
                const carregandoItem = tarefaEmMudanca === t.caminho;

                return (
                  <div
                    key={t.caminho}
                    className={cn(
                      "group flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg transition-colors border border-transparent hover:border-border/60 hover:bg-accent/40",
                      feita && "opacity-60"
                    )}
                  >
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <button
                        type="button"
                        disabled={carregandoItem}
                        onClick={() => toggleStatusTarefa(t)}
                        className="text-muted-foreground hover:text-primary transition-colors cursor-pointer shrink-0 disabled:opacity-50"
                        title={feita ? "Reabrir tarefa" : "Concluir tarefa"}
                      >
                        {feita ? (
                          <CheckSquare size={16} className="text-emerald-500" />
                        ) : (
                          <Square size={16} />
                        )}
                      </button>

                      <span
                        className={cn(
                          "text-xs truncate transition-all",
                          feita ? "line-through text-muted-foreground" : "text-foreground font-medium"
                        )}
                      >
                        {t.titulo}
                      </span>
                    </div>

                    <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                      {t.Pomodoro ? (
                        <span className="text-[10px] text-muted-foreground flex items-center gap-0.5 px-1 py-0.5 rounded bg-muted/60">
                          <Timer size={10} />
                          {t.Pomodoro}
                        </span>
                      ) : null}
                      <button
                        type="button"
                        onClick={() => abrirItemSpa(t.caminho)}
                        className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                        title="Abrir no quadro de tarefas"
                      >
                        <ExternalLink size={12} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Campo de Adição Rápida */}
          <div className="flex items-center gap-2 pt-1 border-t border-border/30">
            <input
              type="text"
              value={novaTarefaTexto}
              onChange={(e) => setNovaTarefaTexto(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  criarTarefaVinculada();
                }
              }}
              placeholder="+ Adicionar tarefa a esta nota... (Pressione Enter)"
              disabled={salvandoNova}
              className="flex-1 bg-transparent text-xs text-foreground placeholder:text-muted-foreground/50 border-none outline-none px-2 py-1 focus:ring-0"
            />
            {novaTarefaTexto.trim() && (
              <button
                type="button"
                onClick={criarTarefaVinculada}
                disabled={salvandoNova}
                className="text-xs px-2.5 py-1 rounded-md bg-primary text-primary-foreground hover:opacity-90 transition-opacity flex items-center gap-1 font-medium cursor-pointer"
              >
                <Plus size={12} />
                <span>Adicionar</span>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
