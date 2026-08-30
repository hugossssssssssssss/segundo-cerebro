import { useState } from "react";
import { RefreshCw, FileText, ArrowRight, CheckCircle2, AlertCircle } from "lucide-react";
import { Modal, Botao, Cartao } from "@/components/ui";
import type { PlanoRefatoracao } from "@/lib/refatorarLinks";
import { executarPlanoRefatoracao } from "@/lib/refatorarLinks";
import { lerConfig } from "@/lib/settings";
import { toast } from "@/lib/toast";

interface ModalRefatorarLinksProps {
  aberto: boolean;
  onFechar: () => void;
  tituloAntigo: string;
  tituloNovo: string;
  plano: PlanoRefatoracao;
  aoConcluir?: () => void;
}

export function ModalRefatorarLinks({
  aberto,
  onFechar,
  tituloAntigo,
  tituloNovo,
  plano,
  aoConcluir,
}: ModalRefatorarLinksProps) {
  const [executando, setExecutando] = useState(false);
  const [progresso, setProgresso] = useState<{ atual: number; total: number } | null>(null);
  const [resultado, setResultado] = useState<{ sucessos: number; falhas: string[]; modo: string } | null>(null);

  if (!aberto || plano.alteracoes.length === 0) return null;

  async function confirmar() {
    setExecutando(true);
    setResultado(null);
    const cfg = lerConfig();

    try {
      const res = await executarPlanoRefatoracao(cfg, plano, (atual, total) => {
        setProgresso({ atual, total });
      });

      setResultado(res);

      if (res.falhas.length === 0) {
        toast(`Todas as ${res.sucessos} referências foram atualizadas com sucesso!`);
        setTimeout(() => {
          onFechar();
          if (aoConcluir) aoConcluir();
        }, 1200);
      } else {
        toast(`Atualizado com ressalvas: ${res.sucessos} sucessos, ${res.falhas.length} falhas.`);
      }
    } catch (e) {
      toast(`Erro ao atualizar referências: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setExecutando(false);
    }
  }

  return (
    <Modal
      aberto={aberto}
      aoFechar={executando ? () => {} : onFechar}
      titulo="Atualizar referências em cascata"
    >
      <div className="space-y-4 text-sm">
        <p className="text-muted-foreground leading-relaxed">
          Você alterou o título de{" "}
          <strong className="text-foreground font-semibold">@{tituloAntigo}</strong> para{" "}
          <strong className="text-primary font-semibold">@{tituloNovo}</strong>.
        </p>

        <div className="p-3 rounded-xl bg-accent/40 border border-border/80 text-xs flex items-center gap-2">
          <RefreshCw size={15} className="text-primary shrink-0 animate-spin-slow" />
          <span>
            Foram encontradas <strong className="font-semibold text-foreground">{plano.totalArquivos}</strong> menções que apontam para o nome antigo. Deseja atualizá-las agora?
          </span>
        </div>

        {/* Lista de arquivos afetados */}
        <div className="max-h-56 overflow-y-auto space-y-2 pr-1">
          {plano.alteracoes.map((alt) => (
            <Cartao key={alt.caminho} className="p-2.5 bg-card/60 border-border/70 text-xs">
              <div className="flex items-center gap-2 font-medium text-foreground mb-1">
                <FileText size={13} className="text-muted-foreground shrink-0" />
                <span className="truncate">{alt.titulo}</span>
                <span className="text-[10px] text-muted-foreground opacity-75 truncate">
                  ({alt.caminho})
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground pl-5">
                <span className="line-through text-rose-500/80">@{tituloAntigo}</span>
                <ArrowRight size={11} className="shrink-0 opacity-60" />
                <span className="font-semibold text-emerald-600 dark:text-emerald-400">@{tituloNovo}</span>
              </div>
            </Cartao>
          ))}
        </div>

        {/* Progresso ou Status */}
        {executando && progresso && (
          <div className="p-2.5 rounded-lg bg-primary/10 border border-primary/20 text-xs text-primary font-medium flex items-center justify-between animate-pulse">
            <span>Atualizando arquivos no repositório...</span>
            <span>
              {progresso.atual} de {progresso.total}
            </span>
          </div>
        )}

        {resultado && (
          <div
            className={`p-2.5 rounded-lg text-xs font-medium flex items-center gap-2 ${
              resultado.falhas.length === 0
                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20"
            }`}
          >
            {resultado.falhas.length === 0 ? (
              <>
                <CheckCircle2 size={14} className="shrink-0" />
                <span>
                  {resultado.sucessos} arquivos atualizados em commit {resultado.modo === "atomico" ? "atômico único" : "sequencial"}!
                </span>
              </>
            ) : (
              <>
                <AlertCircle size={14} className="shrink-0" />
                <span>
                  {resultado.sucessos} atualizados, mas {resultado.falhas.length} falharam.
                </span>
              </>
            )}
          </div>
        )}

        {/* Botões de Ação */}
        <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/40">
          <Botao
            variante="neutro"
            tamanho="pequeno"
            onClick={onFechar}
            disabled={executando}
          >
            Manter como está
          </Botao>
          <Botao
            variante="primario"
            tamanho="pequeno"
            onClick={confirmar}
            disabled={executando || (resultado !== null && resultado.falhas.length === 0)}
          >
            {executando ? "Atualizando..." : `Atualizar ${plano.totalArquivos} notas`}
          </Botao>
        </div>
      </div>
    </Modal>
  );
}
