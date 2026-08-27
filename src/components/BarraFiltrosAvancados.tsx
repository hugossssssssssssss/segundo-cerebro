/**
 * BarraFiltrosAvancados — Componente reutilizável de filtros por tags, datas e propriedades.
 *
 * Estado interno via useState — reseta automaticamente quando o componente desmonta
 * (mudança de rota).
 *
 * Uso:
 * ```tsx
 * <BarraFiltrosAvancados
 *   todasTags={["design", "reunião", "entrega"]}
 *   tagsFiltro={tagsSelecionadas}
 *   aoMudarTags={setTagsSelecionadas}
 *   filtroData={filtroData}
 *   aoMudarFiltroData={setFiltroData}
 * />
 * ```
 */

import { Tag, X, Filter, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useState } from "react";

export type FiltroDataPreset = "qualquer" | "hoje" | "7dias" | "mes" | "custom";

const PRESETS_DATA: { id: FiltroDataPreset; rotulo: string }[] = [
  { id: "qualquer", rotulo: "Qualquer data" },
  { id: "hoje", rotulo: "Hoje" },
  { id: "7dias", rotulo: "Últimos 7 dias" },
  { id: "mes", rotulo: "Este mês" },
];

interface BarraFiltrosAvancadosProps {
  /** Todas as tags disponíveis (já ordenadas) */
  todasTags: string[];
  /** Tags atualmente selecionadas */
  tagsFiltro: string[];
  /** Callback para mudar tags */
  aoMudarTags: (tags: string[]) => void;
  /** Filtro de data ativo */
  filtroData: FiltroDataPreset;
  /** Callback para mudar filtro de data */
  aoMudarFiltroData: (filtro: FiltroDataPreset) => void;
  /** Filtros extras customizados (ex: status, checkbox) */
  extras?: React.ReactNode;
  /** Classe CSS adicional */
  className?: string;
}

export function BarraFiltrosAvancados({
  todasTags,
  tagsFiltro,
  aoMudarTags,
  filtroData,
  aoMudarFiltroData,
  extras,
  className,
}: BarraFiltrosAvancadosProps) {
  const [tagsAberto, setTagsAberto] = useState(false);
  const temFiltro = tagsFiltro.length > 0 || filtroData !== "qualquer";

  function alternarTag(tag: string) {
    if (tagsFiltro.includes(tag)) {
      aoMudarTags(tagsFiltro.filter((t) => t !== tag));
    } else {
      aoMudarTags([...tagsFiltro, tag]);
    }
  }

  function limparTudo() {
    aoMudarTags([]);
    aoMudarFiltroData("qualquer");
  }

  return (
    <div className={cn("flex items-center gap-2 flex-wrap", className)}>
      {/* Ícone de filtro */}
      <span className="text-xs font-medium text-muted-foreground flex items-center gap-1 shrink-0">
        <Filter size={13} />
        Filtros
      </span>

      {/* Filtro de Data */}
      <div className="flex items-center">
        <select
          value={filtroData}
          onChange={(e) => aoMudarFiltroData(e.target.value as FiltroDataPreset)}
          className={cn(
            "rounded-xl border px-2.5 py-1.5 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-ring cursor-pointer transition-colors",
            filtroData !== "qualquer"
              ? "border-primary/40 bg-primary/5 text-primary"
              : "border-border bg-card text-foreground"
          )}
        >
          {PRESETS_DATA.map((p) => (
            <option key={p.id} value={p.id}>{p.rotulo}</option>
          ))}
        </select>
      </div>

      {/* Filtro de Tags */}
      {todasTags.length > 0 && (
        <Popover open={tagsAberto} onOpenChange={setTagsAberto}>
          <PopoverTrigger asChild>
            <button
              type="button"
              className={cn(
                "flex items-center gap-1.5 rounded-xl border px-2.5 py-1.5 text-xs font-medium transition-colors cursor-pointer",
                tagsFiltro.length > 0
                  ? "border-primary/40 bg-primary/5 text-primary"
                  : "border-border bg-card text-foreground hover:bg-accent"
              )}
            >
              <Tag size={12} />
              Tags
              {tagsFiltro.length > 0 && (
                <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-primary text-primary-foreground text-[10px] font-bold px-1">
                  {tagsFiltro.length}
                </span>
              )}
              <ChevronDown size={12} className="opacity-50" />
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-64 p-2" align="start">
            <div className="space-y-1 max-h-64 overflow-y-auto">
              {todasTags.map((tag) => {
                const ativa = tagsFiltro.includes(tag);
                return (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => alternarTag(tag)}
                    className={cn(
                      "w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer text-left",
                      ativa
                        ? "bg-primary/10 text-primary font-semibold"
                        : "text-foreground hover:bg-accent"
                    )}
                  >
                    <span className={cn(
                      "h-3.5 w-3.5 rounded border-2 flex items-center justify-center transition-colors shrink-0",
                      ativa
                        ? "border-primary bg-primary"
                        : "border-border"
                    )}>
                      {ativa && (
                        <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                          <path d="M1.5 4L3 5.5L6.5 2" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      )}
                    </span>
                    <span className="truncate">{tag}</span>
                  </button>
                );
              })}
            </div>
          </PopoverContent>
        </Popover>
      )}

      {/* Tags selecionadas como chips */}
      {tagsFiltro.map((tag) => (
        <button
          key={tag}
          type="button"
          onClick={() => alternarTag(tag)}
          className="flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-semibold text-primary hover:bg-primary/20 transition-colors cursor-pointer"
        >
          #{tag}
          <X size={10} />
        </button>
      ))}

      {/* Extras */}
      {extras}

      {/* Botão limpar */}
      {temFiltro && (
        <button
          type="button"
          onClick={limparTudo}
          className="text-[11px] font-medium text-destructive hover:underline cursor-pointer shrink-0"
        >
          Limpar filtros
        </button>
      )}
    </div>
  );
}

/**
 * Helper para filtrar itens por data com base no preset.
 * Espera que o item tenha `criado_em` ou `criado` no frontmatter (bruto).
 */
export function filtrarPorDataPreset(
  bruto: Record<string, any>,
  filtro: FiltroDataPreset,
): boolean {
  if (filtro === "qualquer" || filtro === "custom") return true;

  const raw = bruto?.criado_em || bruto?.criado || bruto?.atualizado;
  if (!raw) return true;

  const data = new Date(typeof raw === "string" && !raw.includes("T") ? `${raw}T00:00:00` : raw);
  if (isNaN(data.getTime())) return true;

  const agora = new Date();
  const inicioHoje = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate());

  if (filtro === "hoje") {
    return data >= inicioHoje;
  }
  if (filtro === "7dias") {
    const seteDiasAtras = new Date(inicioHoje);
    seteDiasAtras.setDate(seteDiasAtras.getDate() - 7);
    return data >= seteDiasAtras;
  }
  if (filtro === "mes") {
    const inicioMes = new Date(agora.getFullYear(), agora.getMonth(), 1);
    return data >= inicioMes;
  }

  return true;
}
