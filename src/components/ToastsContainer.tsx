import { useEffect, useRef, useState } from "react";
import {
  CheckCircle2,
  AlertCircle,
  Info,
  AlertTriangle,
  X,
  RotateCcw,
  ExternalLink,
  Copy,
  Check,
} from "lucide-react";
import { inscreverToasts, removerToast, type ItemToast } from "@/lib/toast";
import { Modal, Botao } from "@/components/ui";
import { cn } from "@/lib/utils";

function SingleToast({
  t,
  aoAbrirDetalhes,
}: {
  t: ItemToast;
  aoAbrirDetalhes: (t: ItemToast) => void;
}) {
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  function agendarRemocao() {
    if (!t.duracaoMs || t.duracaoMs <= 0) return;
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      removerToast(t.id);
    }, t.duracaoMs);
  }

  function pausarRemocao() {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }

  useEffect(() => {
    agendarRemocao();
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [t.id, t.duracaoMs]);

  const Icone =
    t.tipo === "sucesso"
      ? CheckCircle2
      : t.tipo === "erro"
      ? AlertCircle
      : t.tipo === "aviso"
      ? AlertTriangle
      : Info;

  const corBorda =
    t.tipo === "sucesso"
      ? "border-emerald-500/40 text-emerald-600 dark:text-emerald-400"
      : t.tipo === "erro"
      ? "border-destructive/50 text-destructive bg-destructive/5"
      : t.tipo === "aviso"
      ? "border-amber-500/40 text-amber-600 dark:text-amber-400"
      : "border-blue-500/40 text-blue-600 dark:text-blue-400";

  const ehErro = t.tipo === "erro" || !!t.detalhes;

  return (
    <div
      onMouseEnter={pausarRemocao}
      onMouseLeave={agendarRemocao}
      onClick={() => {
        if (ehErro) aoAbrirDetalhes(t);
      }}
      className={cn(
        "pointer-events-auto flex items-center justify-between gap-3 rounded-xl border bg-card/95 backdrop-blur-md p-3.5 shadow-xl transition-all animate-in slide-in-from-bottom-2 duration-200",
        corBorda,
        ehErro && "cursor-pointer hover:bg-destructive/10",
      )}
    >
      <div className="flex items-center gap-2.5 min-w-0">
        <Icone size={18} className="shrink-0" />
        <div className="min-w-0">
          <span className="text-xs font-semibold text-foreground leading-snug block truncate">
            {t.mensagem}
          </span>
          {ehErro && (
            <span className="text-[10px] font-bold text-destructive underline flex items-center gap-1 mt-0.5">
              <ExternalLink size={10} /> Clique para ver o erro detalhado
            </span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-1 shrink-0 ml-2">
        {t.aoDesfazer && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              t.aoDesfazer?.();
              removerToast(t.id);
            }}
            className="flex items-center gap-1 rounded-md bg-accent px-2 py-1 text-[11px] font-semibold text-foreground hover:bg-accent/80 transition-colors"
          >
            <RotateCcw size={12} />
            <span>Desfazer</span>
          </button>
        )}

        <button
          onClick={(e) => {
            e.stopPropagation();
            removerToast(t.id);
          }}
          className="rounded-md p-1 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
          title="Fechar notificação"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  );
}

export function ToastsContainer() {
  const [toasts, setToasts] = useState<ItemToast[]>([]);
  const [erroDetalhe, setErroDetalhe] = useState<{ titulo: string; detalhes: string } | null>(null);
  const [copiado, setCopiado] = useState(false);

  useEffect(() => {
    return inscreverToasts((novos) => setToasts(novos));
  }, []);

  function abrirDetalhes(t: ItemToast) {
    setErroDetalhe({
      titulo: t.mensagem,
      detalhes: t.detalhes || t.mensagem,
    });
  }

  function copiarErro() {
    if (!erroDetalhe) return;
    navigator.clipboard.writeText(erroDetalhe.detalhes);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  }

  return (
    <>
      {toasts.length > 0 && (
        <div className="fixed bottom-4 right-4 z-[700] flex flex-col gap-2 max-w-sm w-full pointer-events-none px-3 sm:px-0">
          {toasts.map((t) => (
            <SingleToast key={t.id} t={t} aoAbrirDetalhes={abrirDetalhes} />
          ))}
        </div>
      )}

      {/* Modal de Detalhes de Erro */}
      {erroDetalhe && (
        <Modal
          aberto={!!erroDetalhe}
          aoFechar={() => setErroDetalhe(null)}
          titulo="Detalhes do Erro"
        >
          <div className="space-y-4 p-4">
            <div className="flex items-center gap-2 text-destructive font-semibold text-sm">
              <AlertCircle size={18} />
              <span>{erroDetalhe.titulo}</span>
            </div>

            <div className="bg-secondary/50 p-3 rounded-xl border border-border/80 text-xs font-mono text-foreground whitespace-pre-wrap break-words max-h-60 overflow-y-auto">
              {erroDetalhe.detalhes}
            </div>

            <div className="flex items-center justify-between gap-2 pt-2 border-t border-border/60">
              <span className="text-[11px] text-muted-foreground">
                Copie os detalhes acima para diagnóstico se o erro persistir.
              </span>
              <Botao tamanho="pequeno" variante="neutro" onClick={copiarErro} className="shrink-0 gap-1.5">
                {copiado ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                {copiado ? "Copiado!" : "Copiar Erro"}
              </Botao>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}
