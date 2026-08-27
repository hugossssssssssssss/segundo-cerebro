import { useEffect, useMemo, useState, useCallback } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  CheckSquare,
  FileText,
  Target,
  Sparkles,
  Bell,
  Check,
  AlertCircle,
} from "lucide-react";
import { lerConfig, configCompleta } from "@/lib/settings";
import { carregarRepo, type ItemRepo, invalidarCache } from "@/lib/repo";
import { useSalvar } from "@/lib/useSalvar";
import { lerMarkdown, escreverMarkdown, tituloProvavel, nomeLivre } from "@/lib/markdown";
import { toast } from "@/lib/toast";
import { ModalLembrete } from "@/components/ModalLembrete";
import { PainelNotionBase, type ModoVisaoNotion } from "@/components/PainelNotionBase";
import { Carregando } from "@/components/ui";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { format, startOfWeek, endOfWeek, addDays, addWeeks, subWeeks, isSameDay } from "date-fns";
import { ptBR } from "date-fns/locale";

export interface CompromissoSemana {
  id: string;
  tipo: "tarefa" | "nota" | "meta" | "entrega" | "lembrete";
  titulo: string;
  dataIso: string; // YYYY-MM-DD
  hora?: string;
  caminho: string;
  sha: string;
  corpo: string;
  dados: Record<string, any>;
  concluido?: boolean;
  atrasado?: boolean;
}

export default function Inbox() {
  const cfg = lerConfig();
  const pronto = configCompleta(cfg);
  const { salvarTexto } = useSalvar(cfg);

  const [carregando, setCarregando] = useState(true);
  const [acervo, setAcervo] = useState<ItemRepo[]>([]);
  const [dataReferencia, setDataReferencia] = useState<Date>(new Date());
  const [modalNovoAberto, setModalNovoAberto] = useState(false);

  // Estado do Painel Notion para abrir e editar qualquer documento
  const [itemAberto, setItemAberto] = useState<CompromissoSemana | null>(null);
  const [modoVisaoNotion, setModoVisaoNotion] = useState<ModoVisaoNotion>("lado");
  const [tituloEditor, setTituloEditor] = useState("");
  const [corpoEditor, setCorpoEditor] = useState("");
  const [dadosPropsEditor, setDadosPropsEditor] = useState<Record<string, any>>({});
  const [salvandoItem, setSalvandoItem] = useState(false);
  const [temMudancasItem, setTemMudancasItem] = useState(false);

  // Carrega repositório
  const carregar = useCallback(async () => {
    if (!pronto) return;
    try {
      setCarregando(true);
      const todos = await carregarRepo(cfg);
      setAcervo(todos);
    } catch {
      // Erro tratado silenciosamente
    } finally {
      setCarregando(false);
    }
  }, [pronto, cfg.repoOwner, cfg.repoName, cfg.githubToken, cfg.branch]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  // ── Compilação Abrangente de Todos os Compromissos ────────────────────────
  const todosCompromissos = useMemo<CompromissoSemana[]>(() => {
    const hojeStr = new Date().toISOString().split("T")[0];
    const lista: CompromissoSemana[] = [];

    for (const item of acervo) {
      if (!item.texto) continue;
      const doc = lerMarkdown(item.texto);
      const tituloDoc = tituloProvavel(doc, item.nome);
      const dados = doc.dados || {};

      // 1. Tarefas (tarefas/)
      if (item.caminho.startsWith("tarefas/")) {
        const prazo = (dados.prazo as string) || (dados.data_fim as string) || (dados.data_inicio as string);
        if (prazo && typeof prazo === "string") {
          const dataIso = prazo.slice(0, 10);
          const concluido = dados.status === "feito";
          const atrasado = !concluido && dataIso < hojeStr;

          lista.push({
            id: `tarefa-${item.caminho}`,
            tipo: "tarefa",
            titulo: tituloDoc,
            dataIso,
            caminho: item.caminho,
            sha: item.sha,
            corpo: doc.corpo,
            dados,
            concluido,
            atrasado,
          });
        }
      }

      // 2. Metas do PDI (pdi/metas/)
      else if (item.caminho.startsWith("pdi/metas/")) {
        const prazo = dados.prazo as string;
        if (prazo && typeof prazo === "string") {
          const dataIso = prazo.slice(0, 10);
          const concluido = dados.status === "concluida";
          const atrasado = !concluido && dataIso < hojeStr;

          lista.push({
            id: `meta-${item.caminho}`,
            tipo: "meta",
            titulo: `Meta: ${tituloDoc}`,
            dataIso,
            caminho: item.caminho,
            sha: item.sha,
            corpo: doc.corpo,
            dados,
            concluido,
            atrasado,
          });
        }
      }

      // 3. Entregas do PDI (pdi/entregas/)
      else if (item.caminho.startsWith("pdi/entregas/")) {
        const data = dados.data as string;
        if (data && typeof data === "string") {
          const dataIso = data.slice(0, 10);
          lista.push({
            id: `entrega-${item.caminho}`,
            tipo: "entrega",
            titulo: `Entrega: ${tituloDoc}`,
            dataIso,
            caminho: item.caminho,
            sha: item.sha,
            corpo: doc.corpo,
            dados,
            concluido: true,
          });
        }
      }

      // 4. Notas com Data/Compromisso (notas/)
      else if (item.caminho.startsWith("notas/")) {
        const dataNota = (dados.data as string) || (dados.prazo as string) || (dados.data_reuniao as string);
        if (dataNota && typeof dataNota === "string" && /^\d{4}-\d{2}-\d{2}/.test(dataNota)) {
          const dataIso = dataNota.slice(0, 10);
          lista.push({
            id: `nota-${item.caminho}`,
            tipo: "nota",
            titulo: tituloDoc,
            dataIso,
            caminho: item.caminho,
            sha: item.sha,
            corpo: doc.corpo,
            dados,
          });
        }
      }

      // 5. Lembretes inline no texto [⏰ Lembrete: Título | Data]
      const matches = item.texto.matchAll(/\[⏰\s*Lembrete:\s*([^|]+)\|\s*([\d\s\-\:T]+)\]/gi);
      for (const m of matches) {
        const tit = m[1]?.trim();
        const dh = m[2]?.trim();
        if (tit && dh) {
          const partes = dh.split(" ");
          const dataIso = partes[0] || "";
          const hora = partes[1] || "";

          if (/^\d{4}-\d{2}-\d{2}/.test(dataIso)) {
            lista.push({
              id: `lembrete-${item.caminho}-${tit}`,
              tipo: "lembrete",
              titulo: `Lembrete: ${tit}`,
              dataIso,
              hora,
              caminho: item.caminho,
              sha: item.sha,
              corpo: doc.corpo,
              dados,
              atrasado: dataIso < hojeStr,
            });
          }
        }
      }
    }

    return lista;
  }, [acervo]);

  // ── Dias da Semana Atual (Segunda a Domingo) ──────────────────────────────
  const inicioSemana = useMemo(() => {
    return startOfWeek(dataReferencia, { weekStartsOn: 1 }); // Começa na segunda-feira
  }, [dataReferencia]);

  const diasDaSemana = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => addDays(inicioSemana, i));
  }, [inicioSemana]);

  const fimSemana = useMemo(() => {
    return endOfWeek(dataReferencia, { weekStartsOn: 1 });
  }, [dataReferencia]);

  // Intervalo formatado: DD/MM/AAAA - DD/MM/AAAA
  const intervaloSemanaFormatado = useMemo(() => {
    const dInicio = format(inicioSemana, "dd/MM/yyyy");
    const dFim = format(fimSemana, "dd/MM/yyyy");
    return `${dInicio} – ${dFim}`;
  }, [inicioSemana, fimSemana]);

  // Compromissos Atrasados (anteriores ao início da semana exibida)
  const atrasados = useMemo(() => {
    const inicioIso = format(inicioSemana, "yyyy-MM-dd");
    return todosCompromissos.filter((c) => c.dataIso < inicioIso && !c.concluido);
  }, [todosCompromissos, inicioSemana]);

  // ── Ações nos Compromissos ────────────────────────────────────────────────
  const abrirDocumento = (c: CompromissoSemana) => {
    setItemAberto(c);
    setTituloEditor(c.titulo);
    setCorpoEditor(c.corpo);
    setDadosPropsEditor(c.dados);
    setTemMudancasItem(false);
  };

  const salvarEdicaoItem = async () => {
    if (!itemAberto) return;
    setSalvandoItem(true);

    const textoFormatado = escreverMarkdown({
      dados: dadosPropsEditor,
      corpo: corpoEditor,
    });

    try {
      const novoSha = await salvarTexto(
        itemAberto.caminho,
        textoFormatado,
        itemAberto.sha,
        `atualizar documento: ${tituloEditor}`
      );
      invalidarCache();
      setItemAberto((prev) => prev ? { ...prev, sha: novoSha, corpo: corpoEditor, dados: dadosPropsEditor } : null);
      setTemMudancasItem(false);
      toast("Documento salvo com sucesso!");
      carregar();
    } catch (err: any) {
      toast(`Erro ao salvar: ${err?.message || err}`, { tipo: "erro" });
    } finally {
      setSalvandoItem(false);
    }
  };

  const alternarConclusaoTarefa = async (c: CompromissoSemana) => {
    if (c.tipo !== "tarefa") return;
    const novoStatus = c.concluido ? "a-fazer" : "feito";

    const novosDados = { ...c.dados, status: novoStatus };
    const textoFormatado = escreverMarkdown({ dados: novosDados, corpo: c.corpo });

    try {
      await salvarTexto(c.caminho, textoFormatado, c.sha, `atualizar status: ${c.titulo} (${novoStatus})`);
      invalidarCache();
      toast(novoStatus === "feito" ? `"${c.titulo}" concluída!` : `"${c.titulo}" reaberta.`);
      carregar();
    } catch (err: any) {
      toast(`Erro ao salvar tarefa: ${err?.message || err}`, { tipo: "erro" });
    }
  };

  // Salvar novo compromisso/lembrete
  const salvarNovoLembrete = async (titulo: string, dataHora: string, canais: ("inbox" | "telegram" | "email")[]) => {
    const dataIso = dataHora.slice(0, 10);
    const hora = dataHora.slice(11) || "09:00";
    const caminhosExistentes = acervo.map((i) => i.caminho);
    const caminho = nomeLivre("tarefas", `lembrete-${titulo}`, caminhosExistentes);

    const dados = {
      titulo,
      prazo: dataIso,
      status: "a-fazer",
      tags: ["lembrete", ...canais],
      criado: new Date().toISOString().split("T")[0],
    };

    const corpo = `[⏰ Lembrete: ${titulo} | ${dataIso} ${hora}]\n\nLembrete criado via Caixa de Entrada do Klaus.`;
    const textoFormatado = escreverMarkdown({ dados, corpo });

    try {
      await salvarTexto(caminho, textoFormatado, undefined, `criar lembrete: ${titulo}`);
      invalidarCache();
      toast(`Lembrete "${titulo}" agendado para ${dataIso.split("-").reverse().join("/")}!`);
      carregar();
    } catch (err: any) {
      toast(`Erro ao criar lembrete: ${err?.message || err}`, { tipo: "erro" });
    }
  };

  const hoje = new Date();

  return (
    <div className="space-y-6 w-full max-w-none pb-16 animate-in fade-in duration-150">
      {/* 1. Cabeçalho da Caixa de Entrada & Agenda Semanal */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-3 border-b border-border/40">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Caixa de Entrada & Agenda da Semana
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Acompanhe todos os seus compromissos, tarefas com prazo, entregas e lembretes da semana.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Navegação Semanal */}
          <div className="flex items-center gap-1 bg-card border border-border rounded-xl p-1 shadow-2xs">
            <button
              type="button"
              onClick={() => setDataReferencia((d) => subWeeks(d, 1))}
              className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors cursor-pointer"
              title="Semana anterior"
            >
              <ChevronLeft size={16} />
            </button>

            <button
              type="button"
              onClick={() => setDataReferencia(new Date())}
              className="px-2.5 py-1 text-xs font-semibold text-foreground hover:bg-accent rounded-lg transition-colors cursor-pointer"
            >
              Hoje
            </button>

            <button
              type="button"
              onClick={() => setDataReferencia((d) => addWeeks(d, 1))}
              className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors cursor-pointer"
              title="Próxima semana"
            >
              <ChevronRight size={16} />
            </button>
          </div>

          <span className="text-xs font-mono font-medium text-muted-foreground bg-secondary/50 px-2.5 py-1.5 rounded-xl border border-border/50">
            {intervaloSemanaFormatado}
          </span>

          <Button
            size="sm"
            onClick={() => setModalNovoAberto(true)}
            className="text-xs font-semibold h-9 rounded-xl gap-1.5 shadow-2xs cursor-pointer ml-1"
          >
            <Plus size={14} />
            <span>Novo Compromisso</span>
          </Button>
        </div>
      </div>

      {/* 2. Conteúdo da Agenda */}
      {carregando ? (
        <Carregando texto="Carregando compromissos da semana..." />
      ) : (
        <div className="space-y-6">
          {/* Alerta de Itens Atrasados / Pendentes Anteriores */}
          {atrasados.length > 0 && (
            <div className="p-4 rounded-2xl border border-destructive/30 bg-destructive/5 space-y-2.5">
              <div className="flex items-center gap-2 text-destructive font-bold text-xs">
                <AlertCircle size={15} />
                <span>Compromissos Atrasados ({atrasados.length})</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                {atrasados.map((c) => (
                  <div
                    key={c.id}
                    onClick={() => abrirDocumento(c)}
                    className="p-2.5 rounded-xl border border-destructive/20 bg-background/80 hover:bg-card hover:border-destructive/40 transition-all cursor-pointer flex items-center justify-between gap-2 text-xs"
                  >
                    <div className="min-w-0">
                      <p className="font-semibold text-foreground truncate">{c.titulo}</p>
                      <p className="text-[10px] text-destructive font-medium">
                        Venceu em {c.dataIso.split("-").reverse().join("/")}
                      </p>
                    </div>
                    <Badge variant="destructive" className="text-[9px] px-1.5 py-0 h-4 uppercase">
                      {c.tipo}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Grade dos 7 Dias da Semana (Segunda a Domingo) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3 items-start">
            {diasDaSemana.map((dia) => {
              const diaIso = format(dia, "yyyy-MM-dd");
              const diaNome = format(dia, "EEEE", { locale: ptBR });
              const diaNumeroBr = format(dia, "dd/MM");
              const ehHoje = isSameDay(dia, hoje);

              const itensDoDia = todosCompromissos.filter((c) => c.dataIso === diaIso);

              return (
                <div
                  key={diaIso}
                  className={cn(
                    "flex flex-col rounded-2xl border transition-all duration-150 overflow-hidden min-h-[380px]",
                    ehHoje
                      ? "bg-card border-primary/50 shadow-md ring-1 ring-primary/20"
                      : "bg-card/60 border-border/70"
                  )}
                >
                  {/* Cabeçalho do Dia */}
                  <div
                    className={cn(
                      "p-3 border-b text-xs flex items-center justify-between",
                      ehHoje
                        ? "bg-primary/10 border-primary/30 text-primary font-bold"
                        : "bg-secondary/20 border-border/40 text-muted-foreground font-medium"
                    )}
                  >
                    <span className="capitalize">{diaNome.slice(0, 3)}</span>
                    <span className="font-mono text-[11px]">{diaNumeroBr}</span>
                  </div>

                  {/* Lista de Compromissos do Dia */}
                  <div className="p-2 space-y-2 flex-1 overflow-y-auto">
                    {itensDoDia.length === 0 ? (
                      <p className="text-[11px] text-muted-foreground/40 text-center py-8">
                        Sem eventos
                      </p>
                    ) : (
                      itensDoDia.map((c) => {
                        const Icone =
                          c.tipo === "tarefa"
                            ? CheckSquare
                            : c.tipo === "meta"
                            ? Target
                            : c.tipo === "entrega"
                            ? Sparkles
                            : c.tipo === "nota"
                            ? FileText
                            : Bell;

                        return (
                          <div
                            key={c.id}
                            onClick={() => abrirDocumento(c)}
                            className={cn(
                              "group p-2.5 rounded-xl border transition-all cursor-pointer space-y-1.5 text-xs",
                              c.concluido
                                ? "bg-secondary/20 border-border/40 opacity-60 hover:opacity-100"
                                : "bg-background/80 border-border/70 hover:border-border hover:bg-card hover:shadow-xs"
                            )}
                          >
                            <div className="flex items-start justify-between gap-1.5">
                              <div className="flex items-center gap-1.5 min-w-0">
                                {c.tipo === "tarefa" ? (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      alternarConclusaoTarefa(c);
                                    }}
                                    className={cn(
                                      "h-4 w-4 rounded border flex items-center justify-center transition-colors cursor-pointer shrink-0",
                                      c.concluido
                                        ? "bg-primary border-primary text-primary-foreground"
                                        : "border-border hover:border-foreground bg-card"
                                    )}
                                  >
                                    {c.concluido && <Check size={10} strokeWidth={3} />}
                                  </button>
                                ) : (
                                  <Icone size={13} className="text-muted-foreground shrink-0" />
                                )}

                                <span
                                  className={cn(
                                    "font-semibold text-foreground truncate group-hover:text-primary transition-colors",
                                    c.concluido && "line-through opacity-50"
                                  )}
                                >
                                  {c.titulo}
                                </span>
                              </div>
                            </div>

                            <div className="flex items-center justify-between text-[10px] text-muted-foreground pt-0.5">
                              <span className="capitalize">{c.tipo}</span>
                              {c.hora && <span>{c.hora}</span>}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 3. Painel Notion Lateral para Visualizar e Editar Qualquer Documento */}
      {itemAberto && (
        <PainelNotionBase
          rotuloTipo={itemAberto.tipo.toUpperCase()}
          modoVisao={modoVisaoNotion}
          setModoVisao={setModoVisaoNotion}
          titulo={tituloEditor}
          setTitulo={(t) => {
            setTituloEditor(t);
            setTemMudancasItem(true);
          }}
          corpo={corpoEditor}
          setCorpo={(c) => {
            setCorpoEditor(c);
            setTemMudancasItem(true);
          }}
          dadosProps={dadosPropsEditor}
          onChangeProps={(novos) => {
            setDadosPropsEditor(novos);
            setTemMudancasItem(true);
          }}
          caminhoItem={itemAberto.caminho}
          salvando={salvandoItem}
          temMudancas={temMudancasItem}
          aoSalvar={salvarEdicaoItem}
          aoFechar={() => setItemAberto(null)}
        />
      )}

      {/* 4. Modal Padronizado de Agendar Lembrete */}
      <ModalLembrete
        aberto={modalNovoAberto}
        aoFechar={() => setModalNovoAberto(false)}
        aoSalvar={salvarNovoLembrete}
      />
    </div>
  );
}
