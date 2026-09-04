import { Tag as TagIcon, X } from "lucide-react";
import { Tooltip } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { CORES_NOTION, lerConfigPropriedadesGlobais } from "@/components/PropriedadesNotion";

interface TagChipProps {
  tag: string;
  cor?: string;
  ativa?: boolean;
  aoClicar?: () => void;
  aoRemover?: () => void;
  className?: string;
}

/**
 * Retorna os estilos CSS da tag baseando-se nas cores salvas pelo usuário ou paleta do Notion.
 */
export function obterEstiloTagChip(tag: string, corFornecida?: string) {
  const nomeLimpo = tag.startsWith("#") ? tag.slice(1).trim() : tag.trim();
  const globalConfig = lerConfigPropriedadesGlobais();
  const corNome = corFornecida || globalConfig.coresTags?.[nomeLimpo] || globalConfig.coresTags?.[`#${nomeLimpo}`];

  if (corNome && CORES_NOTION[corNome]) {
    return CORES_NOTION[corNome];
  }

  return null;
}

/**
 * Pílula padronizada para exibir e filtrar tags (#design, #web, etc.).
 */
export function TagChip({
  tag,
  cor,
  ativa = false,
  aoClicar,
  aoRemover,
  className,
}: TagChipProps) {
  const nomeLimpo = tag.startsWith("#") ? tag.slice(1) : tag;
  const estiloCor = obterEstiloTagChip(nomeLimpo, cor);

  return (
    <span
      onClick={(e) => {
        if (aoClicar) {
          e.stopPropagation();
          aoClicar();
        }
      }}
      className={cn(
        "inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-semibold border transition-all select-none shrink-0",
        aoClicar && "cursor-pointer",
        ativa
          ? "bg-primary text-primary-foreground border-primary shadow-2xs font-bold"
          : estiloCor
          ? cn(estiloCor.bg, estiloCor.text, estiloCor.border, "hover:opacity-85")
          : "bg-muted/60 text-muted-foreground border-border/60 hover:border-border hover:text-foreground hover:bg-accent",
        className
      )}
    >
      <TagIcon size={11} className="opacity-70 shrink-0" />
      <span>#{nomeLimpo}</span>
      {aoRemover && (
        <Tooltip conteudo="Remover tag">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              aoRemover();
            }}
            className="ml-0.5 rounded-xs p-0.5 hover:bg-destructive/20 hover:text-destructive transition-colors cursor-pointer"
            aria-label="Remover tag"
          >
            <X size={10} />
          </button>
        </Tooltip>
      )}
    </span>
  );
}
