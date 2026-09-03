import { useState, useMemo } from "react";
import {
  X,
  Printer,
  Copy,
  Check,
  Award,
  TrendingUp,
  MessageSquareQuote,
  Users,
  Target,
} from "lucide-react";
import { Botao, Selo } from "@/components/ui";
import { Tooltip } from "@/components/ui/tooltip";
import { toast } from "@/lib/toast";
import { dataCurta } from "@/lib/utils";
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

  if (!aberto) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="relative w-full max-w-4xl max-h-[92vh] flex flex-col bg-background rounded-2xl border border-border shadow-2xl overflow-hidden">
        {/* Cabeçalho do Modal (Oculto na impressão) */}
        <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-border bg-card/60 shrink-0 print:hidden flex-wrap">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-teal-500/10 text-teal-600 dark:text-teal-400">
              <Award size={20} />
            </div>
            <div>
              <h2 className="text-base font-semibold leading-tight">Dossiê de Carreira & Conquistas</h2>
              <p className="text-xs text-muted-foreground">
                Relatório de impacto profissional (Brag Document) para 1:1s e avaliações.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            {/* Seletor de Período */}
            <select
              value={filtroPeriodo}
              onChange={(e) => setFiltroPeriodo(e.target.value)}
              aria-label="Selecionar período do dossiê"
              className="text-xs font-medium rounded-lg border border-border bg-background px-3 py-2 focus:outline-hidden focus:ring-1 focus:ring-primary cursor-pointer h-9"
            >
              <option value="ano-atual">Ano Atual ({anoAtual})</option>
              <option value="ultimos-6-meses">Últimos 6 meses</option>
              <option value="ano-anterior">Ano Anterior ({Number(anoAtual) - 1})</option>
              <option value="tudo">Todo o Histórico</option>
            </select>

            <Tooltip conteudo="Copiar relatório em Markdown para colar no Notion, Slack ou 1:1" posicao="bottom">
              <Botao
                variante="neutro"
                onClick={copiarMarkdown}
                className="gap-2 text-xs h-9 px-3.5 py-2 font-medium"
              >
                {copiado ? <Check size={15} className="text-emerald-500" /> : <Copy size={15} />}
                <span>{copiado ? "Copiado!" : "Copiar Markdown"}</span>
              </Botao>
            </Tooltip>

            <Tooltip conteudo="Imprimir ou gerar PDF limpo" posicao="bottom">
              <Botao
                variante="primario"
                onClick={imprimirDossie}
                className="gap-2 text-xs h-9 px-3.5 py-2 font-medium"
              >
                <Printer size={15} />
                <span>Imprimir / PDF</span>
              </Botao>
            </Tooltip>

            <button
              type="button"
              onClick={aoFechar}
              className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors cursor-pointer"
              aria-label="Fechar modal"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Corpo do Documento (Área que é impressa com estilo folha executiva) */}
        <div className="flex-1 overflow-y-auto p-6 sm:p-10 space-y-8 bg-card/20 print:bg-white print:text-black print:p-0 print:overflow-visible print:h-auto">
          {/* Cabeçalho do Dossiê */}
          <div className="border-b border-border/80 pb-5 space-y-2 print:border-neutral-300">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <span className="text-[11px] font-bold tracking-wider uppercase text-teal-600 dark:text-teal-400 print:text-teal-700">
                Relatório de Impacto & Carreira
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

          {/* 1. Metas Profissionais */}
          {dadosConsolidados.metas.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-sm font-semibold tracking-wide uppercase text-muted-foreground flex items-center gap-2 print:text-neutral-800">
                <Target size={16} className="text-teal-600 print:text-teal-700" />
                Metas & Objetivos Profissionais ({dadosConsolidados.metas.length})
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 print:grid-cols-2">
                {dadosConsolidados.metas.map((m) => (
                  <div
                    key={m.id}
                    className="p-3.5 rounded-xl border border-border/70 bg-card/50 print:border-neutral-300 print:bg-neutral-50 space-y-2"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-semibold text-sm leading-snug">{m.titulo}</p>
                      <Selo
                        tom={
                          m.status === "concluida"
                            ? "sucesso"
                            : m.status === "em-andamento"
                            ? "primario"
                            : "neutro"
                        }
                      >
                        {m.status === "concluida"
                          ? "Concluída"
                          : m.status === "em-andamento"
                          ? "Em andamento"
                          : "A iniciar"}
                      </Selo>
                    </div>
                    {m.indicador && (
                      <p className="text-xs text-muted-foreground print:text-neutral-600">
                        <strong>Indicador:</strong> {m.indicador}
                      </p>
                    )}
                    {m.prazo && (
                      <p className="text-[11px] text-muted-foreground print:text-neutral-500">
                        Prazo estimado: {dataCurta(m.prazo)}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* 2. Principais Entregas e Impacto */}
          <section className="space-y-3">
            <h2 className="text-sm font-semibold tracking-wide uppercase text-muted-foreground flex items-center gap-2 print:text-neutral-800">
              <TrendingUp size={16} className="text-emerald-600 print:text-emerald-700" />
              Entregas Realizadas & Impacto ({dadosConsolidados.entregas.length})
            </h2>

            {dadosConsolidados.entregas.length === 0 ? (
              <p className="text-xs text-muted-foreground italic py-2">
                Nenhuma entrega registrada para o período selecionado.
              </p>
            ) : (
              <div className="space-y-3">
                {dadosConsolidados.entregas.map((e) => (
                  <div
                    key={e.id}
                    className="p-4 rounded-xl border border-border/70 bg-card/50 print:border-neutral-300 print:bg-white space-y-2.5"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <h3 className="font-semibold text-sm text-foreground print:text-black">
                        {e.titulo}
                      </h3>
                      <span className="text-xs text-muted-foreground tabular-nums print:text-neutral-600">
                        {dataCurta(e.data)}
                      </span>
                    </div>

                    {e.impacto && (
                      <div className="flex items-start gap-2 p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-800 dark:text-emerald-300 print:bg-emerald-50 print:text-emerald-950 print:border-emerald-300">
                        <TrendingUp size={14} className="shrink-0 mt-0.5" />
                        <div>
                          <strong>Impacto:</strong> {e.impacto}
                        </div>
                      </div>
                    )}

                    {e.corpo && e.corpo.trim() && (
                      <p className="text-xs text-muted-foreground leading-relaxed print:text-neutral-700 whitespace-pre-line">
                        {e.corpo.trim()}
                      </p>
                    )}

                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      {e.colaboracao && e.colaboracao.length > 0 && (
                        <div className="flex items-center gap-1 text-[11px] text-muted-foreground print:text-neutral-600">
                          <Users size={12} />
                          <span>{e.colaboracao.join(", ")}</span>
                        </div>
                      )}
                      {e.tags && e.tags.length > 0 && (
                        <div className="flex items-center gap-1">
                          {e.tags.map((t) => (
                            <span
                              key={t}
                              className="text-[10px] px-1.5 py-0.5 rounded-md bg-secondary/80 text-muted-foreground print:border print:border-neutral-300"
                            >
                              #{t}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* 3. Pote de Elogios & Reconhecimentos */}
          {dadosConsolidados.elogios.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-sm font-semibold tracking-wide uppercase text-muted-foreground flex items-center gap-2 print:text-neutral-800">
                <MessageSquareQuote size={16} className="text-purple-600 print:text-purple-700" />
                Feedbacks & Elogios Recebidos ({dadosConsolidados.elogios.length})
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 print:grid-cols-2">
                {dadosConsolidados.elogios.map((el, idx) => (
                  <div
                    key={idx}
                    className="p-4 rounded-xl border border-purple-500/20 bg-purple-500/5 print:border-neutral-300 print:bg-neutral-50 flex flex-col justify-between space-y-3"
                  >
                    <p className="text-xs italic text-foreground/90 leading-relaxed print:text-neutral-800">
                      "{el.texto}"
                    </p>
                    <div className="flex items-center gap-2 pt-2 border-t border-purple-500/15 print:border-neutral-200">
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

          {/* 4. Colaboração por Equipe */}
          {Object.keys(dadosConsolidados.colaboracoes).length > 0 && (
            <section className="space-y-3">
              <h2 className="text-sm font-semibold tracking-wide uppercase text-muted-foreground flex items-center gap-2 print:text-neutral-800">
                <Users size={16} className="text-blue-600 print:text-blue-700" />
                Atuação em Equipe & Colaboração
              </h2>
              <div className="flex flex-wrap gap-2">
                {Object.entries(dadosConsolidados.colaboracoes).map(([time, lista]) => (
                  <div
                    key={time}
                    className="px-3 py-1.5 rounded-lg border border-border/80 bg-card text-xs flex items-center gap-2 print:border-neutral-300"
                  >
                    <span className="font-semibold text-primary print:text-black">{time}</span>
                    <span className="text-[11px] text-muted-foreground">
                      ({lista.length} entrega{lista.length === 1 ? "" : "s"})
                    </span>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* 5. Habilidades Desenvolvidas */}
          {dadosConsolidados.todasTags.length > 0 && (
            <section className="space-y-2 pt-2 border-t border-border/60 print:border-neutral-300">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Habilidades & Aprendizados
              </h3>
              <div className="flex flex-wrap gap-1.5">
                {dadosConsolidados.todasTags.map((t) => (
                  <span
                    key={t}
                    className="text-xs px-2.5 py-0.5 rounded-full bg-secondary text-secondary-foreground print:border print:border-neutral-300"
                  >
                    #{t}
                  </span>
                ))}
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
