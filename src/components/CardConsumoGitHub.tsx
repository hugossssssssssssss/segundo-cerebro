import { useState, useEffect } from "react";
import {
  obterMetricasRequisicoes,
  inscreverMetricas,
  type MetricasRequisicoes,
} from "@/lib/telemetriaRequisicoes";
import { Cartao, Selo } from "@/components/ui";
import {
  Activity,
  Zap,
  Clock,
  FolderTree,
  Database,
  Bookmark,
  GitCommit,
} from "lucide-react";
import { cn } from "@/lib/utils";

export function CardConsumoGitHub() {
  const [metricas, setMetricas] = useState<MetricasRequisicoes>(obterMetricasRequisicoes);
  const [vendoHistorico, setVendoHistorico] = useState(false);

  useEffect(() => {
    const unsub = inscreverMetricas(() => {
      setMetricas(obterMetricasRequisicoes());
    });
    return () => unsub();
  }, []);

  const pctUsada = Math.min(
    100,
    Math.round((metricas.usadoHora / Math.max(1, metricas.limiteHora)) * 100),
  );

  const corStatus =
    metricas.restanteHora <= 50
      ? "text-rose-500 bg-rose-500/10 border-rose-500/30"
      : metricas.restanteHora <= 500
        ? "text-amber-500 bg-amber-500/10 border-amber-500/30"
        : "text-emerald-500 bg-emerald-500/10 border-emerald-500/30";

  return (
    <Cartao className="p-5 space-y-4 border-border/80">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border/60">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-primary/10 text-primary">
            <Activity size={20} />
          </div>
          <div>
            <h2 className="font-semibold text-foreground flex items-center gap-2">
              Consumo da API do GitHub
              <span className={cn("text-xs font-mono px-2 py-0.5 rounded-full border", corStatus)}>
                {metricas.restanteHora.toLocaleString()} restantes
              </span>
            </h2>
            <p className="text-xs text-muted-foreground">
              Monitoramento transparente da cota horária do seu token no GitHub
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {metricas.totalEconomizadas304 > 0 && (
            <Selo tom="sucesso" className="gap-1 font-mono text-[11px]">
              <Zap size={13} className="fill-emerald-500 text-emerald-500" />
              {metricas.totalEconomizadas304} reqs economizadas (304)
            </Selo>
          )}
        </div>
      </div>

      {/* Barra de Progresso da Cota Horária */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">
            Usadas nesta hora: <strong className="text-foreground">{metricas.usadoHora.toLocaleString()}</strong> de{" "}
            <strong className="text-foreground">{metricas.limiteHora.toLocaleString()}</strong>
          </span>
          <span className="text-muted-foreground flex items-center gap-1">
            <Clock size={13} />
            Reset da cota: {metricas.minutosAteReset > 0 ? `em ${metricas.minutosAteReset} min` : "nesta hora"}
          </span>
        </div>

        <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
          <div
            className={cn(
              "h-full transition-all duration-300",
              pctUsada > 85 ? "bg-rose-500" : pctUsada > 60 ? "bg-amber-500" : "bg-primary",
            )}
            style={{ width: `${pctUsada}%` }}
          />
        </div>
      </div>

      {/* Grade de Métricas por Tipo de Operação */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1">
        <div className="p-2.5 rounded-xl bg-muted/40 border border-border/50">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
            <FolderTree size={14} className="text-blue-500" />
            <span>Árvores Git</span>
          </div>
          <p className="text-lg font-semibold font-mono text-foreground">
            {metricas.porTipo.arvoreGit}
          </p>
          <span className="text-[10px] text-muted-foreground">Listagem do repositório</span>
        </div>

        <div className="p-2.5 rounded-xl bg-muted/40 border border-border/50">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
            <Database size={14} className="text-purple-500" />
            <span>GraphQL Lote</span>
          </div>
          <p className="text-lg font-semibold font-mono text-foreground">
            {metricas.porTipo.conteudoGraphQL}
          </p>
          <span className="text-[10px] text-muted-foreground">Até 100 arquivos/req</span>
        </div>

        <div className="p-2.5 rounded-xl bg-muted/40 border border-border/50">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
            <GitCommit size={14} className="text-emerald-500" />
            <span>Gravações (PUT)</span>
          </div>
          <p className="text-lg font-semibold font-mono text-foreground">
            {metricas.porTipo.gravacaoCommit}
          </p>
          <span className="text-[10px] text-muted-foreground">Commits e alterações</span>
        </div>

        <div className="p-2.5 rounded-xl bg-muted/40 border border-border/50">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
            <Bookmark size={14} className="text-amber-500" />
            <span>Favoritos</span>
          </div>
          <p className="text-lg font-semibold font-mono text-foreground">
            {metricas.porTipo.favoritos}
          </p>
          <span className="text-[10px] text-muted-foreground">Links e ícones</span>
        </div>
      </div>

      {/* Dica de Economia Inteligente */}
      <div className="p-3 rounded-xl bg-primary/5 border border-primary/20 flex items-start gap-2.5 text-xs text-muted-foreground">
        <Zap size={16} className="text-primary shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="text-foreground font-medium">Como o Klaus economiza suas requisições:</p>
          <p>
            O Klaus utiliza <strong>requisições condicionais com ETag (HTTP 304)</strong> e cache em memória de 30 segundos. Quando o seu acervo não teve modificações externas, o GitHub responde instantaneamente <strong>sem descontar nada da sua cota de 5.000 requisições/hora</strong>.
          </p>
        </div>
      </div>

      {/* Alternar histórico detalhado */}
      <div>
        <button
          type="button"
          onClick={() => setVendoHistorico((v) => !v)}
          className="text-xs text-primary hover:underline flex items-center gap-1 font-medium cursor-pointer"
        >
          {vendoHistorico ? "Ocultar últimas chamadas" : `Ver últimas chamadas (${metricas.ultimasRequisicoes.length})`}
        </button>

        {vendoHistorico && (
          <div className="mt-2 max-h-48 overflow-y-auto space-y-1.5 rounded-xl border border-border bg-background p-2 text-xs font-mono">
            {metricas.ultimasRequisicoes.length === 0 ? (
              <p className="text-muted-foreground py-2 text-center">Nenhuma requisição registrada nesta sessão.</p>
            ) : (
              metricas.ultimasRequisicoes.map((req, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between gap-2 py-1 px-2 rounded hover:bg-muted/40 text-[11px]"
                >
                  <div className="flex items-center gap-2 truncate">
                    <span className="text-muted-foreground shrink-0">{req.timestamp}</span>
                    <span className="font-semibold text-foreground shrink-0">{req.metodo}</span>
                    <span className="truncate text-muted-foreground">{req.urlSimplificada}</span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {req.economizou304 ? (
                      <span className="text-emerald-500 font-semibold bg-emerald-500/10 px-1.5 py-0.2 rounded text-[10px]">
                        304 (0 custo)
                      </span>
                    ) : (
                      <span
                        className={cn(
                          "px-1.5 py-0.2 rounded text-[10px]",
                          req.status >= 400 ? "text-rose-500 bg-rose-500/10" : "text-muted-foreground bg-muted",
                        )}
                      >
                        {req.status}
                      </span>
                    )}
                    <span className="text-[10px] text-muted-foreground">({req.restante} rest.)</span>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </Cartao>
  );
}
