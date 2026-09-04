import { useState, useMemo } from "react";
import {
  X,
  Printer,
  Copy,
  Check,
  TrendingUp,
  MessageSquareQuote,
  Users,
  Target,
  Layers,
  Sparkles,
  Award,
} from "lucide-react";
import { Botao, Selo } from "@/components/ui";
import { Tooltip } from "@/components/ui/tooltip";
import { toast } from "@/lib/toast";
import { dataCurta, cn } from "@/lib/utils";
import type { Meta, Entrega, Contato } from "@/lib/tipos";
import {
  consolidarDossie,
  gerarMarkdownDossie,
} from "@/lib/dossieCarreira";
import { lerConfig, nomeExibido } from "@/lib/settings";

interface ModalDossieCarreiraProps {
  aberto: boolean;
  aoFechar: () => void;
  metas: Meta[];
  entregas: Entrega[];
  contatos?: Contato[];
}

type TabDossie = "executiva" | "metas" | "timeline" | "elogios";

export function ModalDossieCarreira({
  aberto,
  aoFechar,
  metas,
  entregas,
  contatos = [],
}: ModalDossieCarreiraProps) {
  const cfg = lerConfig();
  const nomeUsuario = nomeExibido(cfg) || "Hugo Silva";

  const anoAtual = new Date().getFullYear().toString();
  const [filtroPeriodo, setFiltroPeriodo] = useState<string>("ano-atual");
  const [tabAtiva, setTabAtiva] = useState<TabDossie>("executiva");
  const [copiado, setCopiado] = useState(false);

  // Intervalo de datas baseado no filtro
  const { dataInicio, dataFim, rotuloPeriodo } = useMemo(() => {
    const hoje = new Date();
    const ano = hoje.getFullYear();

    if (filtroPeriodo === "ano-atual") {
      return {
        dataInicio: `${ano}-01-01`,
        dataFim: `${ano}-12-31`,
        rotuloPeriodo: `Ano de ${ano}`,
      };
    }
    if (filtroPeriodo === "ultimos-3-meses") {
      const d = new Date();
      d.setMonth(d.getMonth() - 3);
      return {
        dataInicio: d.toISOString().slice(0, 10),
        dataFim: hoje.toISOString().slice(0, 10),
        rotuloPeriodo: "Últimos 3 meses",
      };
    }
    if (filtroPeriodo === "ultimos-6-meses") {
      const d = new Date();
      d.setMonth(d.getMonth() - 6);
      return {
        dataInicio: d.toISOString().slice(0, 10),
        dataFim: hoje.toISOString().slice(0, 10),
        rotuloPeriodo: "Últimos 6 meses",
      };
    }
    if (filtroPeriodo === "ano-anterior") {
      const anoPassado = ano - 1;
      return {
        dataInicio: `${anoPassado}-01-01`,
        dataFim: `${anoPassado}-12-31`,
        rotuloPeriodo: `Ano de ${anoPassado}`,
      };
    }
    return {
      dataInicio: undefined,
      dataFim: undefined,
      rotuloPeriodo: "Todo o Histórico",
    };
  }, [filtroPeriodo]);

  const dadosConsolidados = useMemo(() => {
    return consolidarDossie(metas, entregas, contatos, dataInicio, dataFim);
  }, [metas, entregas, contatos, dataInicio, dataFim]);

  const textoMarkdown = useMemo(() => {
    return gerarMarkdownDossie(dadosConsolidados, {
      nomeUsuario,
      periodoRotulo: rotuloPeriodo,
    });
  }, [dadosConsolidados, nomeUsuario, rotuloPeriodo]);

  const copiarMarkdown = async () => {
    try {
      await navigator.clipboard.writeText(textoMarkdown);
      setCopiado(true);
      toast("Dossiê de Carreira copiado em Markdown!");
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      toast("Erro ao copiar para a área de transferência", { tipo: "erro" });
    }
  };

  const imprimirDossie = () => {
    window.print();
  };

  // Metas agrupadas com suas entregas correspondentes
  const metasComEntregas = useMemo(() => {
    return dadosConsolidados.metas.map((m) => {
      const ligadas = dadosConsolidados.entregas.filter((e) => e.metas.includes(m.id));
      return {
        meta: m,
        entregas: ligadas,
      };
    });
  }, [dadosConsolidados]);

  if (!aberto) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="relative w-full max-w-5xl max-h-[92vh] flex flex-col bg-background rounded-2xl border border-border shadow-2xl overflow-hidden">
        
        {/* Cabeçalho Principal (Oculto na impressão) */}
        <div className="flex items-center justify-between gap-4 px-5 py-3.5 border-b border-border bg-card/80 shrink-0 print:hidden flex-wrap">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <Award size={20} />
            </div>
            <div>
              <h2 className="text-base font-semibold leading-tight text-foreground flex items-center gap-2">
                <span>Dossiê de Carreira & Brag Document</span>
                <Selo tom="sucesso">{rotuloPeriodo}</Selo>
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Consolidado de conquistas, impactos e reconhecimentos para 1:1s e avaliação de desempenho.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Seletor de Período */}
            <select
              value={filtroPeriodo}
              onChange={(e) => setFiltroPeriodo(e.target.value)}
              aria-label="Selecionar período do dossiê"
              className="text-xs font-medium rounded-lg border border-border bg-background px-3 py-1.5 focus:outline-hidden focus:ring-1 focus:ring-primary cursor-pointer h-8.5"
            >
              <option value="ano-atual">Ano Atual ({anoAtual})</option>
              <option value="ultimos-3-meses">Últimos 3 meses</option>
              <option value="ultimos-6-meses">Últimos 6 meses</option>
              <option value="ano-anterior">Ano Anterior ({Number(anoAtual) - 1})</option>
              <option value="tudo">Todo o Histórico</option>
            </select>

            <Tooltip conteudo="Copiar relatório formatado em Markdown" posicao="bottom">
              <Botao
                variante="neutro"
                onClick={copiarMarkdown}
                className="gap-1.5 text-xs h-8.5 px-3 font-medium"
              >
                {copiado ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                <span>{copiado ? "Copiado!" : "Copiar MD"}</span>
              </Botao>
            </Tooltip>

            <Tooltip conteudo="Imprimir ou salvar como PDF executivo" posicao="bottom">
              <Botao
                variante="primario"
                onClick={imprimirDossie}
                className="gap-1.5 text-xs h-8.5 px-3 font-medium bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                <Printer size={14} />
                <span>Imprimir / PDF</span>
              </Botao>
            </Tooltip>

            <button
              type="button"
              onClick={aoFechar}
              className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors cursor-pointer ml-1"
              aria-label="Fechar modal"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Barra de Abas de Visualização (Oculta na impressão) */}
        <div className="flex items-center gap-1 px-5 py-2 border-b border-border/60 bg-muted/20 shrink-0 print:hidden overflow-x-auto">
          {[
            { id: "executiva", label: "Visão Executiva", icon: Sparkles },
            { id: "metas", label: `Por Metas (${dadosConsolidados.metas.length})`, icon: Target },
            { id: "timeline", label: `Linha do Tempo (${dadosConsolidados.entregas.length})`, icon: Layers },
            { id: "elogios", label: `Mural de Elogios (${dadosConsolidados.elogios.length})`, icon: MessageSquareQuote },
          ].map((tab) => {
            const ativa = tabAtiva === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setTabAtiva(tab.id as TabDossie)}
                className={cn(
                  "flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer shrink-0",
                  ativa
                    ? "bg-background text-foreground shadow-2xs border border-border/80 font-semibold"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
                )}
              >
                <tab.icon size={13} className={ativa ? "text-emerald-500" : "opacity-60"} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Corpo do Documento (Visualização na Tela + Área Impressa) */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-8 space-y-6 bg-card/10 print:bg-white print:text-black print:p-0 print:overflow-visible print:h-auto">
          
          {/* Cabeçalho do Documento Executivo */}
          <div className="border-b border-border/80 pb-4 space-y-1.5 print:border-neutral-300">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <span className="text-[11px] font-bold tracking-wider uppercase text-emerald-600 dark:text-emerald-400 print:text-emerald-700">
                Dossiê de Carreira & Brag Document
              </span>
              <span className="text-xs text-muted-foreground print:text-neutral-500">
                Período: <strong>{rotuloPeriodo}</strong>
              </span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground print:text-black">
              {nomeUsuario}
            </h1>
            <p className="text-xs text-muted-foreground print:text-neutral-600">
              Emitido em {new Date().toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" })} através do Klaus.
            </p>
          </div>

          {/* ══════════════════════════════════════════════════════════════════
              1. ABA: VISÃO EXECUTIVA (Resumo, Métricas & Destaques)
             ══════════════════════════════════════════════════════════════════ */}
          {(tabAtiva === "executiva" || typeof window !== "undefined") && (
            <div className={cn("space-y-6", tabAtiva !== "executiva" && "print:block hidden")}>
              {/* Cards de Métricas Principais */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3.5 rounded-xl border border-emerald-500/25 bg-emerald-500/5 print:border-neutral-300 print:bg-neutral-50">
                  <span className="text-[11px] font-medium text-muted-foreground block">Entregas & Conquistas</span>
                  <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
                    {dadosConsolidados.entregas.length}
                  </p>
                </div>
                <div className="p-3.5 rounded-xl border border-border/80 bg-card/60 print:border-neutral-300 print:bg-neutral-50">
                  <span className="text-[11px] font-medium text-muted-foreground block">Metas em Foco</span>
                  <p className="text-2xl font-bold text-foreground mt-0.5">
                    {dadosConsolidados.metas.length}
                  </p>
                </div>
                <div className="p-3.5 rounded-xl border border-purple-500/25 bg-purple-500/5 print:border-neutral-300 print:bg-neutral-50">
                  <span className="text-[11px] font-medium text-muted-foreground block">Elogios & Feedbacks</span>
                  <p className="text-2xl font-bold text-purple-600 dark:text-purple-400 mt-0.5">
                    {dadosConsolidados.elogios.length}
                  </p>
                </div>
                <div className="p-3.5 rounded-xl border border-blue-500/25 bg-blue-500/5 print:border-neutral-300 print:bg-neutral-50">
                  <span className="text-[11px] font-medium text-muted-foreground block">Colaboração & Áreas</span>
                  <p className="text-2xl font-bold text-blue-600 dark:text-blue-400 mt-0.5">
                    {Object.keys(dadosConsolidados.colaboracoes).length}
                  </p>
                </div>
              </div>

              {/* Destaques de Impacto */}
              {dadosConsolidados.entregas.filter(e => e.impacto || e.conquista).length > 0 && (
                <section className="space-y-3">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <TrendingUp size={14} className="text-emerald-500" />
                    <span>Destaques de Impacto & Conquistas Chave</span>
                  </h3>
                  <div className="space-y-2.5">
                    {dadosConsolidados.entregas
                      .filter(e => e.impacto || e.conquista)
                      .slice(0, 5)
                      .map((e) => (
                        <div
                          key={e.id}
                          className="p-3.5 rounded-xl border border-border/80 bg-card/70 print:border-neutral-300 print:bg-white space-y-1.5 break-inside-avoid"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <h4 className="text-sm font-semibold text-foreground print:text-black">
                              {e.titulo || e.conquista || "Conquista registrada"}
                            </h4>
                            <span className="text-[11px] text-muted-foreground shrink-0 tabular-nums">
                              {dataCurta(e.data)}
                            </span>
                          </div>
                          {e.conquista && e.conquista !== e.titulo && (
                            <p className="text-xs text-foreground/90 font-medium">
                              🏆 {e.conquista}
                            </p>
                          )}
                          {e.impacto && (
                            <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-800 dark:text-emerald-300 print:bg-emerald-50 print:text-emerald-950">
                              <strong>Impacto:</strong> {e.impacto}
                            </div>
                          )}
                        </div>
                      ))}
                  </div>
                </section>
              )}

              {/* Feedbacks em Destaque */}
              {dadosConsolidados.elogios.length > 0 && (
                <section className="space-y-3">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <MessageSquareQuote size={14} className="text-purple-500" />
                    <span>Reconhecimentos & Elogios Recentes</span>
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {dadosConsolidados.elogios.slice(0, 4).map((el, idx) => (
                      <div
                        key={idx}
                        className="p-3.5 rounded-xl border border-purple-500/25 bg-purple-500/5 print:border-neutral-300 print:bg-neutral-50 flex flex-col justify-between space-y-2.5 break-inside-avoid"
                      >
                        <p className="text-xs italic text-foreground/90 leading-relaxed">
                          "{el.texto}"
                        </p>
                        <div className="flex items-center gap-2 pt-2 border-t border-purple-500/15">
                          <div className="h-6 w-6 rounded-full bg-purple-500/20 text-purple-700 dark:text-purple-300 flex items-center justify-center text-[10px] font-bold shrink-0">
                            {el.autorNome.charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-semibold leading-tight truncate">
                              {el.autorNome}
                            </p>
                            {el.contato?.cargo && (
                              <p className="text-[10px] text-muted-foreground truncate">
                                {el.contato.cargo}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              )}
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════════
              2. ABA: POR METAS & PILARES
             ══════════════════════════════════════════════════════════════════ */}
          {(tabAtiva === "metas" || typeof window !== "undefined") && (
            <div className={cn("space-y-6", tabAtiva !== "metas" && "print:block hidden")}>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Target size={14} className="text-emerald-500" />
                <span>Progresso Detalhado por Meta ({metasComEntregas.length})</span>
              </h3>

              <div className="space-y-4">
                {metasComEntregas.map(({ meta, entregas: entregasMeta }) => (
                  <div
                    key={meta.id}
                    className="p-4 rounded-xl border border-border/80 bg-card/60 print:border-neutral-300 print:bg-white space-y-3 break-inside-avoid"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h4 className="text-base font-semibold text-foreground print:text-black">
                          {meta.titulo}
                        </h4>
                        {meta.indicador && (
                          <p className="text-xs text-muted-foreground mt-0.5">
                            <strong>Indicador:</strong> {meta.indicador}
                          </p>
                        )}
                      </div>
                      <Selo tom={meta.status === "concluida" ? "sucesso" : meta.status === "em-andamento" ? "primario" : "neutro"}>
                        {meta.status === "concluida" ? "Concluída" : meta.status === "em-andamento" ? "Em andamento" : "A iniciar"}
                      </Selo>
                    </div>

                    {/* Entregas vinculadas à meta */}
                    <div className="space-y-2 pt-2 border-t border-border/40">
                      <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">
                        Entregas Vinculadas ({entregasMeta.length})
                      </span>
                      {entregasMeta.length === 0 ? (
                        <p className="text-xs text-muted-foreground/70 italic">Nenhuma entrega no período.</p>
                      ) : (
                        <div className="space-y-2">
                          {entregasMeta.map((e) => (
                            <div key={e.id} className="p-2.5 rounded-lg bg-secondary/30 border border-border/40 text-xs space-y-1">
                              <div className="flex items-center justify-between gap-2">
                                <span className="font-semibold text-foreground">{e.titulo || e.conquista}</span>
                                <span className="text-[10px] text-muted-foreground tabular-nums">{dataCurta(e.data)}</span>
                              </div>
                              {e.impacto && (
                                <p className="text-emerald-700 dark:text-emerald-300 text-[11px]">
                                  <strong>Impacto:</strong> {e.impacto}
                                </p>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════════
              3. ABA: LINHA DO TEMPO (Timeline de Entregas)
             ══════════════════════════════════════════════════════════════════ */}
          {(tabAtiva === "timeline" || typeof window !== "undefined") && (
            <div className={cn("space-y-4", tabAtiva !== "timeline" && "print:block hidden")}>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Layers size={14} className="text-emerald-500" />
                <span>Histórico Cronológico de Entregas ({dadosConsolidados.entregas.length})</span>
              </h3>

              {dadosConsolidados.entregas.length === 0 ? (
                <p className="text-xs text-muted-foreground italic py-4">Nenhuma entrega registrada no período selecionado.</p>
              ) : (
                <div className="relative border-l-2 border-border/80 ml-3 pl-4 space-y-4">
                  {dadosConsolidados.entregas.map((e) => (
                    <div key={e.id} className="relative group break-inside-avoid">
                      <div className="absolute -left-[23px] top-1.5 h-3 w-3 rounded-full border-2 border-background bg-emerald-500" />
                      <div className="p-3.5 rounded-xl border border-border/80 bg-card/70 print:border-neutral-300 print:bg-white space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <h4 className="text-sm font-semibold text-foreground print:text-black">
                            {e.titulo || e.conquista || "Entrega"}
                          </h4>
                          <span className="text-xs text-muted-foreground tabular-nums shrink-0">
                            {dataCurta(e.data)}
                          </span>
                        </div>
                        {e.conquista && e.conquista !== e.titulo && (
                          <p className="text-xs text-foreground/90 font-medium">
                            🏆 {e.conquista}
                          </p>
                        )}
                        {e.impacto && (
                          <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-800 dark:text-emerald-300 print:bg-emerald-50 print:text-emerald-950">
                            <strong>Impacto:</strong> {e.impacto}
                          </div>
                        )}
                        {e.corpo && e.corpo.trim() && (
                          <p className="text-xs text-muted-foreground whitespace-pre-line leading-relaxed">
                            {e.corpo.trim()}
                          </p>
                        )}
                        {e.colaboracao && e.colaboracao.length > 0 && (
                          <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground pt-1">
                            <Users size={12} />
                            <span>Colaboração: {e.colaboracao.join(", ")}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════════
              4. ABA: MURAL DE ELOGIOS & FEEDBACKS
             ══════════════════════════════════════════════════════════════════ */}
          {(tabAtiva === "elogios" || typeof window !== "undefined") && (
            <div className={cn("space-y-4", tabAtiva !== "elogios" && "print:block hidden")}>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <MessageSquareQuote size={14} className="text-purple-500" />
                <span>Mural Completo de Elogios & Reconhecimentos ({dadosConsolidados.elogios.length})</span>
              </h3>

              {dadosConsolidados.elogios.length === 0 ? (
                <p className="text-xs text-muted-foreground italic py-4">Nenhum elogio registrado no período selecionado.</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  {dadosConsolidados.elogios.map((el, idx) => (
                    <div
                      key={idx}
                      className="p-4 rounded-xl border border-purple-500/25 bg-purple-500/5 print:border-neutral-300 print:bg-neutral-50 flex flex-col justify-between space-y-3 break-inside-avoid"
                    >
                      <p className="text-xs italic text-foreground/90 leading-relaxed font-serif text-sm">
                        "{el.texto}"
                      </p>
                      <div className="flex items-center gap-2.5 pt-2.5 border-t border-purple-500/15">
                        <div className="h-7 w-7 rounded-full bg-purple-500/20 text-purple-700 dark:text-purple-300 flex items-center justify-center text-xs font-bold shrink-0">
                          {el.autorNome.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-semibold leading-tight truncate">
                            {el.autorNome}
                          </p>
                          {el.contato?.cargo && (
                            <p className="text-[10px] text-muted-foreground truncate">
                              {el.contato.cargo}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Seção de Colaborações & Habilidades no Rodapé do Dossiê */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-border/80 print:border-neutral-300 break-inside-avoid">
            {Object.keys(dadosConsolidados.colaboracoes).length > 0 && (
              <div className="space-y-2">
                <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                  <Users size={12} />
                  <span>Áreas de Colaboração</span>
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {Object.entries(dadosConsolidados.colaboracoes).map(([area, items]) => (
                    <span key={area} className="px-2 py-0.5 rounded-md bg-secondary/80 text-foreground text-[11px] font-medium">
                      {area} ({items.length})
                    </span>
                  ))}
                </div>
              </div>
            )}

            {dadosConsolidados.todasTags.length > 0 && (
              <div className="space-y-2">
                <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                  <Sparkles size={12} />
                  <span>Competências & Habilidades</span>
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {dadosConsolidados.todasTags.map((t) => (
                    <span key={t} className="px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 text-[11px] font-medium border border-emerald-500/20">
                      #{t}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
