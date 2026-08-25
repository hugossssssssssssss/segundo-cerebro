import { ChevronLeft, ChevronRight, Trash2, History as IconeHistorico } from "lucide-react";
import { Botao, Tooltip } from "@/components/ui";
import { useWorkspace } from "./WorkspaceContext";

interface WorkspaceRodapeProps {
  aoRemover?: () => void;
  aoVerHistorico?: () => void;
  temHistorico?: boolean;
}

export function WorkspaceRodape({
  aoRemover,
  aoVerHistorico,
  temHistorico,
}: WorkspaceRodapeProps) {
  const { abaAtiva, irParaAnterior, irParaProximo, infoSequencial } = useWorkspace();

  const salvando = abaAtiva?.salvando;
  const temMudancas = abaAtiva?.temMudancas;

  return (
    <div className="flex shrink-0 items-center justify-between gap-3 border-t border-border px-4 sm:px-6 py-2.5 bg-card/90 backdrop-blur-xs select-none">
      {/* Ações à esquerda */}
      <div className="flex items-center gap-1.5">
        {aoRemover && (
          <Tooltip conteudo="Apagar este item do repositório" posicao="top">
            <Botao
              variante="fantasma"
              onClick={aoRemover}
              className="text-destructive hover:bg-destructive/10 text-xs px-2.5 py-1.5 h-8 cursor-pointer"
            >
              <Trash2 size={13} />
              <span className="hidden sm:inline">Apagar</span>
            </Botao>
          </Tooltip>
        )}

        {temHistorico && aoVerHistorico && (
          <Tooltip conteudo="Ver histórico de alterações e versões no Git" posicao="top">
            <Botao
              variante="fantasma"
              onClick={aoVerHistorico}
              className="text-xs text-muted-foreground hover:text-foreground px-2.5 py-1.5 h-8 cursor-pointer"
            >
              <IconeHistorico size={13} />
              <span className="hidden sm:inline">Histórico</span>
            </Botao>
          </Tooltip>
        )}
      </div>

      {/* Controles de Navegação Sequencial no Centro */}
      <div className="flex items-center gap-2 rounded-xl border border-border/80 bg-muted/40 px-2 py-1 shadow-2xs">
        <Tooltip conteudo="Documento anterior" atalho="←" posicao="top" desabilitado={!infoSequencial.podeAnterior}>
          <button
            onClick={irParaAnterior}
            disabled={!infoSequencial.podeAnterior}
            className="rounded-lg p-1 text-muted-foreground hover:text-foreground hover:bg-background/80 disabled:opacity-30 disabled:hover:bg-transparent disabled:cursor-not-allowed transition-colors cursor-pointer"
            aria-label="Documento anterior"
          >
            <ChevronLeft size={16} />
          </button>
        </Tooltip>

        <span className="text-xs font-medium text-muted-foreground px-1 select-none">
          <span className="font-semibold text-foreground">{infoSequencial.indice}</span> de{" "}
          <span className="font-semibold text-foreground">{infoSequencial.total}</span>
        </span>

        <Tooltip conteudo="Próximo documento" atalho="→" posicao="top" desabilitado={!infoSequencial.podeProximo}>
          <button
            onClick={irParaProximo}
            disabled={!infoSequencial.podeProximo}
            className="rounded-lg p-1 text-muted-foreground hover:text-foreground hover:bg-background/80 disabled:opacity-30 disabled:hover:bg-transparent disabled:cursor-not-allowed transition-colors cursor-pointer"
            aria-label="Próximo documento"
          >
            <ChevronRight size={16} />
          </button>
        </Tooltip>
      </div>

      {/* Status de Sincronização em Background à direita */}
      <div className="flex items-center gap-2">
        <Tooltip
          conteudo={
            salvando
              ? "Gravando alterações no repositório..."
              : temMudancas
              ? "Modificado: alterações salvas no navegador e sincronizando"
              : "Todas as alterações estão salvas e sincronizadas"
          }
          posicao="top"
        >
          <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-accent/60 flex items-center gap-1.5 cursor-default">
            {salvando ? (
              <span className="text-blue-500 animate-pulse font-semibold">Salvando...</span>
            ) : temMudancas ? (
              <span className="text-amber-600 dark:text-amber-400 font-medium">Salva em background</span>
            ) : (
              <span className="text-emerald-600 dark:text-emerald-400 font-medium">✓ Sincronizado</span>
            )}
          </span>
        </Tooltip>
      </div>
    </div>
  );
}
