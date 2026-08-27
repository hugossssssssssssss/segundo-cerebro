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
  LayoutList,
  Columns3,
} from "lucide-react";
import { lerConfig, configCompleta } from "@/lib/settings";
import { carregarRepo, type ItemRepo, invalidarCache } from "@/lib/repo";
import { useSalvar } from "@/lib/useSalvar";
import { lerMarkdown, escreverMarkdown, tituloProvavel, nomeLivre } from "@/lib/markdown";
import { toast } from "@/lib/toast";
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
  dataBr: string; // DD/MM/AAAA
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
  const { salvarTexto, apagarItem } = useSalvar(cfg);

  const [carregando, setCarregando] = useState(true);
  const [acervo, setAcervo] = useState<ItemRepo[]>([]);
  const [dataReferencia, setDataReferencia] = useState<Date>(new Date());
  const [modoExibicao, setModoExibicao] = useState<"lista" | "colunas">("lista");

  // Estado do Painel Notion para Novo Lembrete / Edição de Documento
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

  // Formata data ISO para DD/MM/AAAA com barras
  const formatarBr = (iso: string) => {
    if (!iso) return "";
    const partes = iso.split("-");
    if (partes.length === 3) {
      return `${partes[2]}/${partes[1]}/${partes[0]}`;
    }
    return iso;
  };

  // ── Compilação Abrangente de Todos os Compromissos ────────────────────────
  const todosCompromissos = useMemo<CompromissoSemana[]>(() => {
    const hojeStr = new Date().toISOString().split("T")[0];
    const lista: CompromissoSemana[] = [];

    for (const item of acervo) {
      if (!item.texto) continue;
      const doc = lerMarkdown(item.texto);
      const tituloDoc = tituloProvavel(doc, item.nome);
      const dados = doc.dados || {};

      // 1. Tarefas com Prazo (tarefas/)
      if (item.caminho.startsWith("tarefas/")) {
        const prazo = (dados.prazo as string) || (dados.data_fim as string) || (dados.data_inicio as string);
        if (prazo && typeof prazo === "string") {
          const match = prazo.match(/\d{4}-\d{2}-\d{2}/);
          if (match) {
            const dataIso = match[0];
            const concluido = dados.status === "feito";
            const atrasado = !concluido && dataIso < hojeStr;

            lista.push({
              id: `tarefa-${item.caminho}`,
              tipo: "tarefa",
              titulo: tituloDoc,
              dataIso,
              dataBr: formatarBr(dataIso),
              caminho: item.caminho,
              sha: item.sha,
              corpo: doc.corpo,
              dados,
              concluido,
              atrasado,
            });
          }
        }
      }

      // 2. Metas do PDI (pdi/metas/)
      else if (item.caminho.startsWith("pdi/metas/")) {
        const prazo = dados.prazo as string;
        if (prazo && typeof prazo === "string") {
          const match = prazo.match(/\d{4}-\d{2}-\d{2}/);
          if (match) {
            const dataIso = match[0];
            const concluido = dados.status === "concluida";
            const atrasado = !concluido && dataIso < hojeStr;

            lista.push({
              id: `meta-${item.caminho}`,
              tipo: "meta",
              titulo: `Meta: ${tituloDoc}`,
              dataIso,
              dataBr: formatarBr(dataIso),
              caminho: item.caminho,
              sha: item.sha,
              corpo: doc.corpo,
              dados,
              concluido,
              atrasado,
            });
          }
        }
      }

      // 3. Entregas do PDI (pdi/entregas/)
      else if (item.caminho.startsWith("pdi/entregas/")) {
        const data = (dados.data as string) || (dados.prazo as string);
        if (data && typeof data === "string") {
          const match = data.match(/\d{4}-\d{2}-\d{2}/);
          if (match) {
            const dataIso = match[0];
            lista.push({
              id: `entrega-${item.caminho}`,
              tipo: "entrega",
              titulo: `Entrega: ${tituloDoc}`,
              dataIso,
              dataBr: formatarBr(dataIso),
              caminho: item.caminho,
              sha: item.sha,
              corpo: doc.corpo,
              dados,
              concluido: true,
            });
          }
        }
      }

      // 4. Notas com Data (notas/)
      else if (item.caminho.startsWith("notas/")) {
        const dataNota = (dados.data as string) || (dados.prazo as string) || (dados.data_reuniao as string);
        let dataEncontrada: string | null = null;

        if (dataNota && typeof dataNota === "string") {
          const match = dataNota.match(/\d{4}-\d{2}-\d{2}/);
          if (match) dataEncontrada = match[0];
        } else {
          // Checa data no nome do arquivo (ex: 2026-08-27-titulo.md)
          const matchNome = item.nome.match(/^(\d{4}-\d{2}-\d{2})/);
          if (matchNome) dataEncontrada = matchNome[1];
        }

        if (dataEncontrada) {
          lista.push({
            id: `nota-${item.caminho}`,
            tipo: "nota",
            titulo: tituloDoc,
            dataIso: dataEncontrada,
            dataBr: formatarBr(dataEncontrada),
            caminho: item.caminho,
            sha: item.sha,
            corpo: doc.corpo,
            dados,
          });
        }
      }

      // 5. Lembretes inline no texto [⏰ Lembrete: Título | YYYY-MM-DD HH:mm]
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
              dataBr: formatarBr(dataIso),
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

  // Intervalo formatado com barras: DD/MM/AAAA – DD/MM/AAAA
  const intervaloSemanaFormatado = useMemo(() => {
    const dInicio = format(inicioSemana, "dd/MM/yyyy");
    const dFim = format(fimSemana, "dd/MM/yyyy");
    return `Semana de ${dInicio} a ${dFim}`;
  }, [inicioSemana, fimSemana]);

  // Compromissos Atrasados: APENAS aqueles cuja data é estritamente anterior ao HOJE REAL
  const hojeRealIso = useMemo(() => new Date().toISOString().split("T")[0], []);

  const atrasadosReais = useMemo(() => {
    return todosCompromissos.filter((c) => c.dataIso < hojeRealIso && !c.concluido);
  }, [todosCompromissos, hojeRealIso]);

  // ── Abertura do Painel Notion ─────────────────────────────────────────────
  const abrirDocumento = (c: CompromissoSemana) => {
    setItemAberto(c);
    setTituloEditor(c.titulo);
    setCorpoEditor(c.corpo);
    setDadosPropsEditor(c.dados);
    setTemMudancasItem(false);
  };

  const abrirNovoLembrete = () => {
    const hojeStr = new Date().toISOString().split("T")[0];
    const novoRascunho: CompromissoSemana = {
      id: "novo-lembrete",
      tipo: "lembrete",
      titulo: "Novo Lembrete",
      dataIso: hojeStr,
      dataBr: formatarBr(hojeStr),
      caminho: "",
      sha: "",
      corpo: "Descreva os detalhes do lembrete...",
      dados: {
        titulo: "Novo Lembrete",
        prazo: hojeStr,
        horario: "09:00",
        status: "a-fazer",
        aviso_inbox: true,
        aviso_telegram: true,
        aviso_email: false,
        tags: ["lembrete"],
        criado: hojeStr,
      },
    };

    setItemAberto(novoRascunho);
    setTituloEditor(novoRascunho.titulo);
    setCorpoEditor(novoRascunho.corpo);
    setDadosPropsEditor(novoRascunho.dados);
    setTemMudancasItem(true);
  };

  const salvarEdicaoItem = async () => {
    if (!itemAberto) return;
    setSalvandoItem(true);

    const hojeStr = new Date().toISOString().split("T")[0];
    const caminhosExistentes = acervo.map((i) => i.caminho);
    const caminhoReal =
      itemAberto.caminho || nomeLivre("tarefas", `lembrete-${tituloEditor}`, caminhosExistentes);

    const novosDados = {
      ...dadosPropsEditor,
      titulo: tituloEditor,
      atualizado: hojeStr,
    };

    const textoFormatado = escreverMarkdown({
      dados: novosDados,
      corpo: corpoEditor,
    });

    try {
      const novoSha = await salvarTexto(
        caminhoReal,
        textoFormatado,
        itemAberto.sha || undefined,
        `salvar lembrete: ${tituloEditor}`
      );
      invalidarCache();
      setItemAberto({
        ...itemAberto,
        caminho: caminhoReal,
        sha: novoSha,
        titulo: tituloEditor,
        corpo: corpoEditor,
        dados: novosDados,
      });
      setTemMudancasItem(false);
      toast("Lembrete salvo com sucesso!");
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
            {intervaloSemanaFormatado}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Alternador de Layout (Lista Espaçosa vs Grade) */}
          <div className="flex items-center gap-0.5 bg-card border border-border rounded-xl p-1 shadow-2xs">
            <button
              type="button"
              onClick={() => setModoExibicao("lista")}
              className={cn(
                "p-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer",
                modoExibicao === "lista"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
              title="Visão Lista Espaçosa por Dia"
            >
              <LayoutList size={14} />
              <span className="hidden sm:inline">Lista</span>
            </button>

            <button
              type="button"
              onClick={() => setModoExibicao("colunas")}
              className={cn(
                "p-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer",
                modoExibicao === "colunas"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
              title="Visão Grade Semanal"
            >
              <Columns3 size={14} />
              <span className="hidden sm:inline">Grade</span>
            </button>
          </div>

          {/* Navegação de Semanas */}
          <div className="flex items-center gap-1 bg-card border border-border rounded-xl p-1 shadow-2xs">
            <button
              type="button"
              onClick={() => setDataReferencia((d) => subWeeks(d, 1))}
              className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors cursor-pointer"
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
              className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors cursor-pointer"
              title="Próxima semana"
            >
              <ChevronRight size={16} />
            </button>
          </div>

          {/* Botão Padronizado + Novo Lembrete */}
          <Button
            size="sm"
            onClick={abrirNovoLembrete}
            className="text-xs font-semibold h-9 rounded-xl gap-1.5 shadow-2xs cursor-pointer ml-1"
          >
            <Plus size={14} />
            <span>Novo Lembrete</span>
          </Button>
        </div>
      </div>

      {/* 2. Conteúdo da Agenda */}
      {carregando ? (
        <Carregando texto="Carregando seus compromissos..." />
      ) : (
        <div className="space-y-6">
          {/* Seção de Atrasados Reais (Apenas o que venceu antes de hoje) */}
          {atrasadosReais.length > 0 && (
            <div className="p-4 rounded-2xl border border-destructive/30 bg-destructive/5 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-destructive font-bold text-xs">
                  <AlertCircle size={15} />
                  <span>Pendências Anteriores Vencidas ({atrasadosReais.length})</span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5">
                {atrasadosReais.map((c) => (
                  <div
                    key={c.id}
                    onClick={() => abrirDocumento(c)}
                    className="p-3 rounded-xl border border-destructive/20 bg-card hover:border-destructive/40 transition-all cursor-pointer flex items-center justify-between gap-2.5 shadow-2xs"
                  >
                    <div className="min-w-0">
                      <p className="font-semibold text-xs text-foreground truncate">{c.titulo}</p>
                      <p className="text-[10px] text-destructive font-medium mt-0.5">
                        Prazo: {c.dataBr}
                      </p>
                    </div>
                    <Badge variant="destructive" className="text-[9px] px-1.5 py-0 h-4 uppercase shrink-0">
                      {c.tipo}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* MODO 1: Lista Espaçosa por Dia da Semana (Layout Confortável) */}
          {modoExibicao === "lista" && (
            <div className="space-y-4">
              {diasDaSemana.map((dia) => {
                const diaIso = format(dia, "yyyy-MM-dd");
                const diaNome = format(dia, "EEEE", { locale: ptBR });
                const diaFormatadoBr = format(dia, "dd/MM/yyyy");
                const ehHoje = isSameDay(dia, hoje);

                const itensDoDia = todosCompromissos.filter((c) => c.dataIso === diaIso);

                return (
                  <div
                    key={diaIso}
                    className={cn(
                      "rounded-2xl border transition-all overflow-hidden p-4 space-y-3",
                      ehHoje
                        ? "bg-card border-primary/50 shadow-md ring-1 ring-primary/20"
                        : "bg-card/70 border-border/70"
                    )}
                  >
                    {/* Topo do Dia */}
                    <div className="flex items-center justify-between border-b border-border/40 pb-2.5">
                      <div className="flex items-center gap-2">
                        <span
                          className={cn(
                            "text-sm font-bold capitalize",
                            ehHoje ? "text-primary" : "text-foreground"
                          )}
                        >
                          {diaNome}
                        </span>
                        <span className="text-xs font-mono text-muted-foreground font-medium">
                          ({diaFormatadoBr})
                        </span>
                        {ehHoje && (
                          <Badge variant="default" className="text-[10px] h-4 px-1.5 py-0">
                            Hoje
                          </Badge>
                        )}
                      </div>

                      <span className="text-xs text-muted-foreground font-medium">
                        {itensDoDia.length} compromisso{itensDoDia.length === 1 ? "" : "s"}
                      </span>
                    </div>

                    {/* Itens do Dia */}
                    {itensDoDia.length === 0 ? (
                      <p className="text-xs text-muted-foreground/50 py-2">
                        Nenhum compromisso para este dia.
                      </p>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                        {itensDoDia.map((c) => {
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
                                "group p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3 shadow-2xs",
                                c.concluido
                                  ? "bg-secondary/20 border-border/40 opacity-60 hover:opacity-100"
                                  : "bg-background border-border/70 hover:border-border hover:bg-card hover:shadow-xs"
                              )}
                            >
                              <div className="flex items-center gap-2.5 min-w-0">
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
                                  <Icone size={14} className="text-muted-foreground shrink-0" />
                                )}

                                <div className="min-w-0">
                                  <p
                                    className={cn(
                                      "font-semibold text-xs text-foreground truncate group-hover:text-primary transition-colors",
                                      c.concluido && "line-through opacity-50"
                                    )}
                                  >
                                    {c.titulo}
                                  </p>
                                  <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground mt-0.5">
                                    <span className="capitalize">{c.tipo}</span>
                                    {c.hora && <span>• {c.hora}</span>}
                                  </div>
                                </div>
                              </div>

                              <span className="text-[10px] font-mono text-muted-foreground shrink-0">
                                {c.dataBr}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* MODO 2: Grade de Colunas por Dia (7 Colunas) */}
          {modoExibicao === "colunas" && (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3 items-start">
              {diasDaSemana.map((dia) => {
                const diaIso = format(dia, "yyyy-MM-dd");
                const diaNome = format(dia, "EEEE", { locale: ptBR });
                const diaFormatadoBr = format(dia, "dd/MM/yyyy");
                const ehHoje = isSameDay(dia, hoje);

                const itensDoDia = todosCompromissos.filter((c) => c.dataIso === diaIso);

                return (
                  <div
                    key={diaIso}
                    className={cn(
                      "flex flex-col rounded-2xl border transition-all duration-150 overflow-hidden min-h-[360px]",
                      ehHoje
                        ? "bg-card border-primary/50 shadow-md ring-1 ring-primary/20"
                        : "bg-card/60 border-border/70"
                    )}
                  >
                    {/* Cabeçalho do Dia */}
                    <div
                      className={cn(
                        "p-3 border-b text-xs flex flex-col gap-0.5",
                        ehHoje
                          ? "bg-primary/10 border-primary/30 text-primary font-bold"
                          : "bg-secondary/20 border-border/40 text-muted-foreground font-medium"
                      )}
                    >
                      <span className="capitalize">{diaNome.slice(0, 3)}</span>
                      <span className="font-mono text-[10px]">{diaFormatadoBr}</span>
                    </div>

                    {/* Lista de Itens */}
                    <div className="p-2 space-y-2 flex-1 overflow-y-auto">
                      {itensDoDia.length === 0 ? (
                        <p className="text-[11px] text-muted-foreground/40 text-center py-8">
                          Sem eventos
                        </p>
                      ) : (
                        itensDoDia.map((c) => (
                          <div
                            key={c.id}
                            onClick={() => abrirDocumento(c)}
                            className="group p-2.5 rounded-xl border border-border/70 bg-background hover:bg-card transition-all cursor-pointer space-y-1 text-xs"
                          >
                            <p className="font-semibold text-foreground truncate">{c.titulo}</p>
                            <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                              <span className="capitalize">{c.tipo}</span>
                              {c.hora && <span>{c.hora}</span>}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* 3. Painel Notion Padrão para Visualizar, Criar e Editar Lembretes / Documentos */}
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
          aoRemover={
            itemAberto.caminho
              ? async () => {
                  await apagarItem(itemAberto.caminho, itemAberto.sha);
                  setItemAberto(null);
                  toast("Lembrete removido com sucesso!");
                  carregar();
                }
              : undefined
          }
          aoFechar={() => setItemAberto(null)}
        />
      )}
    </div>
  );
}
