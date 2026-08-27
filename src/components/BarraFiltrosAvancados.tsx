/**
 * BarraFiltrosAvancados / GlobalFilterBar — Componente reutilizável de filtros globais
 * para telas de listagem (Notas, Tarefas, Referências, etc.).
 *
 * Capacidades:
 * - Filtro por Tags (múltipla seleção com badges e chips removíveis)
 * - Filtro por Data de Criação (Hoje, Últimos 7 dias, Este mês)
 * - Filtro por Data de Atualização (Hoje, Últimos 7 dias, Este mês)
 * - Filtros por propriedades customizadas / booleanas (status, checkbox)
 * - Estado local isolado: não vaza entre rotas nem persiste em localStorage.
 */

import { useState } from "react";
import { Tag, X, Filter, ChevronDown, CheckSquare } from "lucide-react";
import { cn } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

export type FiltroDataPreset = "qualquer" | "hoje" | "7dias" | "mes";

export const PRESETS_DATA: { id: FiltroDataPreset; rotulo: string }[] = [
  { id: "qualquer", rotulo: "Qualquer data" },
  { id: "hoje", rotulo: "Hoje" },
  { id: "7dias", rotulo: "Últimos 7 dias" },
  { id: "mes", rotulo: "Este mês" },
];

export interface BarraFiltrosAvancadosProps {
  /** Todas as tags únicas disponíveis */
  todasTags?: string[];
  /** Tags selecionadas */
  tagsFiltro?: string[];
  /** Callback ao mudar tags */
  aoMudarTags?: (tags: string[]) => void;

  /** Filtro de Data (Criação ou Geral) */
  filtroData?: FiltroDataPreset;
  aoMudarFiltroData?: (filtro: FiltroDataPreset) => void;

  /** Filtro de Data de Atualização */
  filtroAtualizacao?: FiltroDataPreset;
  aoMudarFiltroAtualizacao?: (filtro: FiltroDataPreset) => void;

  /** Filtro booleano / checkbox opcional (ex: apenas marcados) */
  filtroCheckbox?: {
    rotulo: string;
    ativo: boolean;
    aoAlternar: (ativo: boolean) => void;
  };

  /** Elementos extras customizados */
  extras?: React.ReactNode;
  className?: string;
}

export function BarraFiltrosAvancados({
  todasTags = [],
  tagsFiltro = [],
  aoMudarTags,
  filtroData = "qualquer",
  aoMudarFiltroData,
  filtroAtualizacao = "qualquer",
  aoMudarFiltroAtualizacao,
  filtroCheckbox,
  extras,
  className,
}: BarraFiltrosAvancadosProps) {
  const [tagsAberto, setTagsAberto] = useState(false);

  const temFiltroAtivo =
    tagsFiltro.length > 0 ||
    filtroData !== "qualquer" ||
    filtroAtualizacao !== "qualquer" ||
    !!filtroCheckbox?.ativo;

  function alternarTag(tag: string) {
    if (!aoMudarTags) return;
    if (tagsFiltro.includes(tag)) {
      aoMudarTags(tagsFiltro.filter((t) => t !== tag));
    } else {
      aoMudarTags([...tagsFiltro, tag]);
    }
  }

  function limparTudo() {
    if (aoMudarTags) aoMudarTags([]);
    if (aoMudarFiltroData) aoMudarFiltroData("qualquer");
    if (aoMudarFiltroAtualizacao) aoMudarFiltroAtualizacao("qualquer");
    if (filtroCheckbox) filtroCheckbox.aoAlternar(false);
  }

  return (
    <div className={cn("flex items-center gap-2 flex-wrap text-xs", className)}>
      {/* Indicador de Filtro */}
      <span className="font-semibold text-muted-foreground flex items-center gap-1 shrink-0 select-none">
        <Filter size={13} className="text-primary/70" />
        Filtros
      </span>

      {/* 1. Filtro de Data de Criação */}
      {aoMudarFiltroData && (
        <div className="flex items-center">
          <select
            value={filtroData}
            onChange={(e) => aoMudarFiltroData(e.target.value as FiltroDataPreset)}
            className={cn(
              "rounded-xl border px-2.5 py-1.5 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-ring cursor-pointer transition-colors",
              filtroData !== "qualquer"
                ? "border-primary/40 bg-primary/10 text-primary font-semibold"
                : "border-border bg-card text-foreground hover:bg-accent"
            )}
            title="Filtrar por data de criação"
          >
            <option value="qualquer">Criado em: Qualquer data</option>
            <option value="hoje">Criado: Hoje</option>
            <option value="7dias">Criado: Últimos 7 dias</option>
            <option value="mes">Criado: Este mês</option>
          </select>
        </div>
      )}

      {/* 2. Filtro de Data de Atualização */}
      {aoMudarFiltroAtualizacao && (
        <div className="flex items-center">
          <select
            value={filtroAtualizacao}
            onChange={(e) => aoMudarFiltroAtualizacao(e.target.value as FiltroDataPreset)}
            className={cn(
              "rounded-xl border px-2.5 py-1.5 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-ring cursor-pointer transition-colors",
              filtroAtualizacao !== "qualquer"
                ? "border-primary/40 bg-primary/10 text-primary font-semibold"
                : "border-border bg-card text-foreground hover:bg-accent"
            )}
            title="Filtrar por data de atualização"
          >
            <option value="qualquer">Modificado: Qualquer data</option>
            <option value="hoje">Modificado: Hoje</option>
            <option value="7dias">Modificado: Últimos 7 dias</option>
            <option value="mes">Modificado: Este mês</option>
          </select>
        </div>
      )}

      {/* 3. Filtro de Tags (Popover Multiselect) */}
      {todasTags.length > 0 && aoMudarTags && (
        <Popover open={tagsAberto} onOpenChange={setTagsAberto}>
          <PopoverTrigger asChild>
            <button
              type="button"
              className={cn(
                "flex items-center gap-1.5 rounded-xl border px-2.5 py-1.5 text-xs font-medium transition-colors cursor-pointer",
                tagsFiltro.length > 0
                  ? "border-primary/40 bg-primary/10 text-primary font-semibold"
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
          <PopoverContent className="w-64 p-2 shadow-xl border-border" align="start">
            <div className="space-y-1 max-h-64 overflow-y-auto">
              <div className="px-2 py-1 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                Selecionar Tags ({todasTags.length})
              </div>
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
                    <span
                      className={cn(
                        "h-3.5 w-3.5 rounded border flex items-center justify-center transition-colors shrink-0",
                        ativa ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card"
                      )}
                    >
                      {ativa && (
                        <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                          <path
                            d="M1.5 4L3 5.5L6.5 2"
                            stroke="currentColor"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      )}
                    </span>
                    <span className="truncate">#{tag}</span>
                  </button>
                );
              })}
            </div>
          </PopoverContent>
        </Popover>
      )}

      {/* 4. Filtro Booleano / Checkbox */}
      {filtroCheckbox && (
        <button
          type="button"
          onClick={() => filtroCheckbox.aoAlternar(!filtroCheckbox.ativo)}
          className={cn(
            "flex items-center gap-1.5 rounded-xl border px-2.5 py-1.5 text-xs font-medium transition-colors cursor-pointer",
            filtroCheckbox.ativo
              ? "border-primary/40 bg-primary/10 text-primary font-semibold"
              : "border-border bg-card text-foreground hover:bg-accent"
          )}
        >
          <CheckSquare size={13} className={filtroCheckbox.ativo ? "text-primary" : "opacity-60"} />
          <span>{filtroCheckbox.rotulo}</span>
        </button>
      )}

      {/* 5. Chips de tags selecionadas */}
      {tagsFiltro.map((tag) => (
        <button
          key={tag}
          type="button"
          onClick={() => alternarTag(tag)}
          className="flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-semibold text-primary hover:bg-primary/20 transition-colors cursor-pointer"
          title={`Remover tag #${tag}`}
        >
          #{tag}
          <X size={11} />
        </button>
      ))}

      {/* Extras customizados */}
      {extras}

      {/* Botão Limpar Filtros */}
      {temFiltroAtivo && (
        <button
          type="button"
          onClick={limparTudo}
          className="text-[11px] font-medium text-destructive hover:underline cursor-pointer shrink-0 ml-1"
        >
          Limpar filtros
        </button>
      )}
    </div>
  );
}

/** Alias exportado como GlobalFilterBar */
export const GlobalFilterBar = BarraFiltrosAvancados;

/**
 * Helper para filtrar itens por data com base no preset.
 * Suporta formatos ISO ou YYYY-MM-DD.
 */
export function filtrarPorDataPreset(
  dataRaw: string | undefined | null,
  filtro: FiltroDataPreset,
): boolean {
  if (filtro === "qualquer" || !dataRaw) return true;

  const data = new Date(typeof dataRaw === "string" && !dataRaw.includes("T") ? `${dataRaw}T00:00:00` : dataRaw);
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
