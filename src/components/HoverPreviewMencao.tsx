import { useMemo } from "react";
import { FileText, CheckSquare, Target, Users, Image as ImageIcon, Layout, ArrowRight } from "lucide-react";
import { type Alvo } from "@/lib/links";
import { cache } from "@/lib/repo";
import { SeloStatus, type TomSelo } from "@/components/SeloStatus";
import { TagChip } from "@/components/TagChip";
import { prepararSnippetPreview } from "@/lib/markdownInline";
import { cn } from "@/lib/utils";

interface HoverPreviewMencaoProps {
  mencao: Alvo | null;
  posicao: { x: number; y: number } | null;
  aoAbrir?: (caminho: string) => void;
}

const ICONES_TIPO: Record<string, any> = {
  nota: FileText,
  notas: FileText,
  tarefa: CheckSquare,
  tarefas: CheckSquare,
  meta: Target,
  metas: Target,
  entrega: Target,
  entregas: Target,
  contato: Users,
  contatos: Users,
  referencia: ImageIcon,
  referencias: ImageIcon,
  lousa: Layout,
  lousas: Layout,
};

export function HoverPreviewMencao({
  mencao,
  posicao,
  aoAbrir,
}: HoverPreviewMencaoProps) {
  const itemDetalhe = useMemo(() => {
    if (!mencao || !cache?.itens) return null;
    return cache.itens.find((i) => i.caminho === mencao.caminho);
  }, [mencao]);

  if (!mencao || !posicao) return null;

  const doc = itemDetalhe?.doc;
  const dados = (doc?.dados as Record<string, any>) || {};
  const corpo = doc?.corpo || "";
  const snippet = prepararSnippetPreview(corpo, 120);

  const pasta = mencao.caminho.split("/")[0] || mencao.tipo;
  const Icone = ICONES_TIPO[pasta] || ICONES_TIPO[mencao.tipo] || FileText;

  const status = dados.status;
  const tags: string[] = Array.isArray(dados.tags) ? dados.tags : [];

  let tomStatus: TomSelo = "neutro";
  if (status === "feito" || status === "concluida" || status === "concluido") tomStatus = "sucesso";
  else if (status === "fazendo" || status === "em-andamento") tomStatus = "primario";
  else if (status === "atrasada") tomStatus = "perigo";

  // Evita que o preview ultrapasse a margem da janela
  const larguraCard = 280;
  const alturaCard = 140;
  const posX = Math.min(posicao.x, typeof window !== "undefined" ? window.innerWidth - larguraCard - 16 : posicao.x);
  const posY = Math.min(posicao.y + 14, typeof window !== "undefined" ? window.innerHeight - alturaCard - 16 : posicao.y + 14);

  return (
    <div
      style={{ left: `${posX}px`, top: `${posY}px` }}
      onClick={() => {
        if (aoAbrir && mencao.caminho) aoAbrir(mencao.caminho);
      }}
      className={cn(
        "fixed z-[100] w-72 rounded-xl p-3 select-none pointer-events-auto cursor-pointer",
        "bg-card/95 border border-border/60 shadow-2xl backdrop-blur-xl",
        "animate-in fade-in zoom-in-95 duration-150"
      )}
    >
      <div className="flex items-start gap-2.5 min-w-0">
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground mt-0.5">
          <Icone size={14} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 flex-wrap">
            <h4 className="text-xs font-semibold text-foreground truncate max-w-[170px]">
              {mencao.titulo}
            </h4>
            {status && (
              <SeloStatus rotulo={status} tom={tomStatus} />
            )}
          </div>
          <span className="text-[10px] text-muted-foreground capitalize block mt-0.5">
            {pasta}
          </span>
        </div>
      </div>

      {snippet && (
        <p className="mt-2 text-[11px] text-muted-foreground leading-relaxed line-clamp-3">
          {snippet}
        </p>
      )}

      {tags.length > 0 && (
        <div className="mt-2 flex items-center gap-1 flex-wrap">
          {tags.slice(0, 3).map((t) => (
            <TagChip key={t} tag={t} />
          ))}
          {tags.length > 3 && (
            <span className="text-[10px] text-muted-foreground">+{tags.length - 3}</span>
          )}
        </div>
      )}

      <div className="mt-2.5 pt-2 border-t border-border/40 flex items-center justify-between text-[10px] text-muted-foreground">
        <span>Clique para abrir</span>
        <ArrowRight size={11} className="opacity-70" />
      </div>
    </div>
  );
}
