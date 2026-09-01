import React, { useState } from "react";
import type { Nota } from "../lib/tipos";
import { TagChip } from "./TagChip";
import { ChevronDown, ChevronUp, Plus, Trash2, Tag, Calendar, Users, Sliders, Check, X } from "lucide-react";
import { Tooltip } from "@/components/ui/tooltip";

interface PainelPropriedadesNotaProps {
  nota: Nota;
  aoMudar: (atualizacao: Partial<Nota> & { camposExtras?: Record<string, string> }) => void;
}

const SUBTIPOS = [
  { id: "nota", rotulo: "Nota Comum" },
  { id: "briefing", rotulo: "Briefing" },
  { id: "reuniao", rotulo: "Ata de Reunião" },
  { id: "rascunho", rotulo: "Rascunho" },
] as const;

export const PainelPropriedadesNota: React.FC<PainelPropriedadesNotaProps> = ({
  nota,
  aoMudar,
}) => {
  const [expandido, setExpandido] = useState(false);
  const [novaTag, setNovaTag] = useState("");
  const [adicionandoTag, setAdicionandoTag] = useState(false);

  const [novaChave, setNovaChave] = useState("");
  const [novoValor, setNovoValor] = useState("");
  const [adicionandoProp, setAdicionandoProp] = useState(false);

  const subtipoAtual = nota.subtipo || "nota";

  // Identifica propriedades extras livres que estão no frontmatter bruto
  const chavesReservadas = new Set([
    "id",
    "titulo",
    "tipo",
    "subtipo",
    "tags",
    "criado",
    "criado_em",
    "atualizado",
    "atualizado_em",
    "data_reuniao",
    "participantes",
    "relacionamentos",
    "esquema",
    "ia_sugeriu",
  ]);

  const propsExtras: Array<[string, string]> = [];
  if (nota.bruto && typeof nota.bruto === "object") {
    for (const [k, v] of Object.entries(nota.bruto)) {
      if (!chavesReservadas.has(k) && !k.startsWith("_") && v !== undefined && v !== null && v !== "") {
        propsExtras.push([k, String(v)]);
      }
    }
  }

  const handleSubtipoChange = (novoSubtipo: Nota["subtipo"]) => {
    aoMudar({ subtipo: novoSubtipo });
  };

  const handleAddTag = (e: React.FormEvent) => {
    e.preventDefault();
    const limpa = novaTag.trim().replace(/^#+/, "");
    if (!limpa) return;
    if (!nota.tags.includes(limpa)) {
      aoMudar({ tags: [...nota.tags, limpa] });
    }
    setNovaTag("");
    setAdicionandoTag(false);
  };

  const handleRemoverTag = (tagRemover: string) => {
    aoMudar({ tags: nota.tags.filter((t) => t !== tagRemover) });
  };

  const handleAddPropriedade = (e: React.FormEvent) => {
    e.preventDefault();
    const k = novaChave.trim().toLowerCase().replace(/\s+/g, "_");
    const v = novoValor.trim();
    if (!k || !v) return;

    const extras = { ...(nota.bruto || {}), [k]: v };
    aoMudar({ bruto: extras });
    setNovaChave("");
    setNovoValor("");
    setAdicionandoProp(false);
  };

  const handleRemoverPropriedade = (chave: string) => {
    const extras = { ...(nota.bruto || {}) };
    delete extras[chave];
    aoMudar({ bruto: extras });
  };

  return (
    <div className="mb-4 rounded-xl border border-border/70 bg-card/60 backdrop-blur-sm transition-all shadow-sm">
      {/* Barra compacta superior */}
      <div className="flex items-center justify-between px-4 py-2.5">
        <div className="flex flex-wrap items-center gap-2">
          {/* Seletor de subtipo */}
          <div className="flex items-center rounded-lg bg-muted/60 p-0.5 text-xs font-medium">
            {SUBTIPOS.map((st) => {
              const ativo = subtipoAtual === st.id;
              return (
                <button
                  key={st.id}
                  type="button"
                  onClick={() => handleSubtipoChange(st.id as Nota["subtipo"])}
                  className={`rounded-md px-2.5 py-1 transition-all ${
                    ativo
                      ? "bg-primary text-primary-foreground shadow-xs font-semibold"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {st.rotulo}
                </button>
              );
            })}
          </div>

          {/* Resumo de tags */}
          {nota.tags.length > 0 && !expandido && (
            <div className="flex items-center gap-1.5 ml-2">
              {nota.tags.slice(0, 3).map((t) => (
                <TagChip key={t} tag={t} />
              ))}
              {nota.tags.length > 3 && (
                <span className="text-[11px] text-muted-foreground font-medium">
                  +{nota.tags.length - 3}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Botão para alternar detalhes */}
        <Tooltip conteudo={expandido ? "Ocultar metadados" : "Ver propriedades e metadados"}>
          <button
            type="button"
            onClick={() => setExpandido(!expandido)}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground font-medium px-2 py-1 rounded-md hover:bg-accent transition-colors cursor-pointer"
            aria-label={expandido ? "Ocultar metadados" : "Ver propriedades e metadados"}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>{expandido ? "Ocultar" : "Propriedades"}</span>
            {expandido ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </Tooltip>
      </div>

      {/* Painel expandido de propriedades */}
      {expandido && (
        <div className="border-t border-border/50 px-4 py-3 space-y-3.5 bg-muted/20 animate-in fade-in-50 duration-150">
          {/* Seção de Tags */}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
              <Tag className="w-3.5 h-3.5" />
              <span>Tags da Nota</span>
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              {nota.tags.map((t) => (
                <span
                  key={t}
                  className="inline-flex items-center gap-1 rounded-md bg-secondary/80 px-2 py-0.5 text-xs text-secondary-foreground"
                >
                  #{t}
                  <Tooltip conteudo={`Remover tag #${t}`}>
                    <button
                      type="button"
                      onClick={() => handleRemoverTag(t)}
                      className="text-muted-foreground hover:text-destructive transition-colors ml-0.5 cursor-pointer"
                      aria-label={`Remover tag #${t}`}
                    >
                      ×
                    </button>
                  </Tooltip>
                </span>
              ))}

              {adicionandoTag ? (
                <form onSubmit={handleAddTag} className="inline-flex items-center gap-1">
                  <input
                    type="text"
                    value={novaTag}
                    onChange={(e) => setNovaTag(e.target.value)}
                    placeholder="nova-tag"
                    autoFocus
                    className="h-6 rounded border border-input bg-background px-2 text-xs focus:outline-none focus:ring-1 focus:ring-primary w-24"
                  />
                  <Tooltip conteudo="Confirmar tag" posicao="top">
                    <button
                      type="submit"
                      className="h-6 w-6 rounded bg-primary flex items-center justify-center text-primary-foreground hover:bg-primary/90 transition-colors"
                      aria-label="Confirmar tag"
                    >
                      <Check size={12} />
                    </button>
                  </Tooltip>
                  <Tooltip conteudo="Cancelar" posicao="top">
                    <button
                      type="button"
                      onClick={() => setAdicionandoTag(false)}
                      className="h-6 w-6 rounded flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                      aria-label="Cancelar"
                    >
                      <X size={12} />
                    </button>
                  </Tooltip>
                </form>
              ) : (
                <button
                  type="button"
                  onClick={() => setAdicionandoTag(true)}
                  className="inline-flex items-center gap-1 rounded border border-dashed border-border px-2 py-0.5 text-xs text-muted-foreground hover:text-foreground hover:border-primary/50 transition-colors"
                >
                  <Plus className="w-3 h-3" />
                  <span>Adicionar Tag</span>
                </button>
              )}
            </div>
          </div>

          {/* Seção Reunião (condicional) */}
          {subtipoAtual === "reuniao" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 border-t border-border/40">
              <div className="flex flex-col gap-1">
                <label className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
                  <Calendar className="w-3.5 h-3.5" />
                  <span>Data da Reunião</span>
                </label>
                <input
                  type="date"
                  value={nota.dataReuniao || ""}
                  onChange={(e) => aoMudar({ dataReuniao: e.target.value || undefined })}
                  className="h-8 rounded-md border border-input bg-background px-2.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
                  <Users className="w-3.5 h-3.5" />
                  <span>Participantes</span>
                </label>
                <input
                  type="text"
                  placeholder="Ex: @Marcelo, Hugo, Cliente Acme"
                  value={(nota.participantes || []).join(", ")}
                  onChange={(e) =>
                    aoMudar({
                      participantes: e.target.value
                        ? e.target.value.split(",").map((p) => p.trim()).filter(Boolean)
                        : undefined,
                    })
                  }
                  className="h-8 rounded-md border border-input bg-background px-2.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
            </div>
          )}

          {/* Propriedades Extras Livres */}
          <div className="pt-2 border-t border-border/40 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground">
                Propriedades Personalizadas ({propsExtras.length})
              </span>
              {!adicionandoProp && (
                <button
                  type="button"
                  onClick={() => setAdicionandoProp(true)}
                  className="inline-flex items-center gap-1 text-[11px] text-primary hover:underline font-medium"
                >
                  <Plus className="w-3 h-3" />
                  <span>Nova Propriedade</span>
                </button>
              )}
            </div>

            {propsExtras.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                {propsExtras.map(([chave, valor]) => (
                  <div
                    key={chave}
                    className="flex items-center justify-between rounded-lg border border-border/60 bg-background/80 px-2.5 py-1.5 text-xs shadow-2xs"
                  >
                    <div className="flex flex-col min-w-0 pr-2">
                      <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider truncate">
                        {chave}
                      </span>
                      <span className="text-xs font-medium text-foreground truncate">
                        {valor}
                      </span>
                    </div>
                    <Tooltip conteudo={`Remover propriedade ${chave}`}>
                      <button
                        type="button"
                        onClick={() => handleRemoverPropriedade(chave)}
                        className="text-muted-foreground hover:text-destructive transition-colors p-1 cursor-pointer"
                        aria-label={`Remover propriedade ${chave}`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </Tooltip>
                  </div>
                ))}
              </div>
            )}

            {adicionandoProp && (
              <form onSubmit={handleAddPropriedade} className="flex flex-wrap items-center gap-2 bg-muted/40 p-2.5 rounded-lg border border-border">
                <input
                  type="text"
                  placeholder="Nome (ex: cliente)"
                  value={novaChave}
                  onChange={(e) => setNovaChave(e.target.value)}
                  className="h-7 rounded border border-input bg-background px-2 text-xs flex-1 min-w-[120px] focus:outline-none focus:ring-1 focus:ring-primary"
                  autoFocus
                />
                <input
                  type="text"
                  placeholder="Valor (ex: Acme Inc)"
                  value={novoValor}
                  onChange={(e) => setNovoValor(e.target.value)}
                  className="h-7 rounded border border-input bg-background px-2 text-xs flex-1 min-w-[120px] focus:outline-none focus:ring-1 focus:ring-primary"
                />
                <button
                  type="submit"
                  className="h-7 rounded bg-primary px-3 text-xs font-medium text-primary-foreground hover:bg-primary/90"
                >
                  Salvar
                </button>
                <button
                  type="button"
                  onClick={() => setAdicionandoProp(false)}
                  className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
                >
                  Cancelar
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
