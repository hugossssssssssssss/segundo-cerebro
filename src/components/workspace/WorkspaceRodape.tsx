import { ChevronLeft, ChevronRight, Trash2, History as IconeHistorico, Check, Save } from "lucide-react";
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
  const { abaAtiva, salvarAba, irParaAnterior, irParaProximo, infoSequencial } = useWorkspace();

  const salvando = abaAtiva?.salvando;
  const temMudancas = abaAtiva?.temMudancas;

  const handleSalvar = () => {
    if (abaAtiva?.id) {
      salvarAba(abaAtiva.id);
    }
  };

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
      <div className="flex items-center gap-2">
        <Tooltip conteudo="Documento anterior" atalho="←" posicao="top" desabilitado={!infoSequencial.podeAnterior}>
          <button
            type="button"
            onClick={irParaAnterior}
            disabled={!infoSequencial.podeAnterior}
            className="rounded-lg p-1 text-muted-foreground hover:text-foreground hover:bg-accent/40 disabled:opacity-25 disabled:hover:bg-transparent disabled:cursor-not-allowed transition-colors cursor-pointer"
            aria-label="Documento anterior"
          >
            <ChevronLeft size={16} />
          </button>
        </Tooltip>

        <span className="text-xs font-medium text-muted-foreground px-0.5 select-none">
          <span className="font-semibold text-foreground">{infoSequencial.indice}</span> de{" "}
          <span className="font-semibold text-foreground">{infoSequencial.total}</span>
        </span>

        <Tooltip conteudo="Próximo documento" atalho="→" posicao="top" desabilitado={!infoSequencial.podeProximo}>
          <button
            type="button"
            onClick={irParaProximo}
            disabled={!infoSequencial.podeProximo}
            className="rounded-lg p-1 text-muted-foreground hover:text-foreground hover:bg-accent/40 disabled:opacity-25 disabled:hover:bg-transparent disabled:cursor-not-allowed transition-colors cursor-pointer"
            aria-label="Próximo documento"
          >
            <ChevronRight size={16} />
          </button>
        </Tooltip>
      </div>

      {/* Status de Sincronização e Botão Salvar à direita */}
      <div className="flex items-center gap-2">
        <Tooltip
          conteudo={
            salvando
              ? "Gravando alterações no repositório..."
              : temMudancas
              ? "Alterações pendentes — clique para salvar agora (ou aguarde auto-save)"
              : "Todas as alterações estão salvas e sincronizadas"
          }
          atalho="⌘S"
          posicao="top"
        >
          <Botao
            variante={temMudancas ? "primario" : "neutro"}
            tamanho="pequeno"
            onClick={handleSalvar}
            disabled={salvando}
            className="text-xs h-7 px-2.5 gap-1.5"
          >
            {salvando ? (
              <>
                <span className="inline-block h-2.5 w-2.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
                <span>Salvando…</span>
              </>
            ) : temMudancas ? (
              <>
                <Save size={13} />
                <span>Salvar</span>
              </>
            ) : (
              <>
                <Check size={13} className="text-emerald-500" />
                <span>Salvo</span>
              </>
            )}
          </Botao>
        </Tooltip>
      </div>
    </div>
  );
}
