import { useState } from "react";
import {
  Calendar as CalendarIcon,
  Check,
  Plus,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { FormatadorNumero, type ConfigFormatoNumero } from "./FormatadorNumero";
import { SeletorDataAvancada, formatarDataExibicao, type DadosDataAvancada } from "./SeletorDataAvancada";
import { SeletorBadgeStatus, type ItemStatusNotion } from "./GerenciadorStatusNotion";
import { SeletorRelacaoNotion, type ItemRelacionavel } from "./SeletorRelacaoNotion";

export type TipoPropriedadeInline =
  | "texto"
  | "numero"
  | "status"
  | "data"
  | "select"
  | "multiselect"
  | "tags"
  | "relation"
  | "checkbox"
  | "url";

interface CelulaPropriedadeInlineProps {
  chave: string;
  tipo: TipoPropriedadeInline;
  valor: any;
  aoSalvar: (novoValor: any) => void;
  configNumero?: ConfigFormatoNumero;
  opcoesSelect?: string[];
  statusLista?: ItemStatusNotion[];
  opcoesRelacao?: ItemRelacionavel[];
  aoCriarItemRelacao?: (titulo: string, tipo: any) => Promise<void> | void;
  aoClicarItemRelacao?: (titulo: string, caminho?: string) => void;
  dataFim?: string;
  horario?: string;
  lembrete?: string;
  placeholder?: string;
  className?: string;
}

export function CelulaPropriedadeInline({
  tipo,
  valor,
  aoSalvar,
  configNumero,
  opcoesSelect = [],
  statusLista,
  opcoesRelacao = [],
  aoCriarItemRelacao,
  aoClicarItemRelacao,
  dataFim,
  horario,
  lembrete,
  placeholder = "Vazio",
  className,
}: CelulaPropriedadeInlineProps) {
  const [popoverAberto, setPopoverAberto] = useState(false);
  const [editandoTexto, setEditandoTexto] = useState(false);
  const [textoLocal, setTextoLocal] = useState(String(valor || ""));

  // 1. STATUS
  if (tipo === "status") {
    return (
      <div
        onClick={(e) => e.stopPropagation()}
        className={cn("inline-flex items-center", className)}
      >
        <SeletorBadgeStatus
          valorAtual={typeof valor === "string" ? valor : ""}
          statusLista={statusLista}
          aoSelecionar={(novoStatus) => {
            aoSalvar(novoStatus);
          }}
          aberto={popoverAberto}
          aoMudarAberto={setPopoverAberto}
        />
      </div>
    );
  }

  // 2. DATA / PRAZO
  if (tipo === "data") {
    const dadosData: DadosDataAvancada = {
      dataInicio: typeof valor === "string" ? valor : undefined,
      dataFim,
      horario,
      lembrete,
    };
    const infoData = formatarDataExibicao(dadosData.dataInicio, dadosData.dataFim, dadosData.horario);

    return (
      <div
        onClick={(e) => e.stopPropagation()}
        className={cn("inline-flex items-center", className)}
      >
        <SeletorDataAvancada
          dados={dadosData}
          aoSalvar={(novos) => {
            aoSalvar(novos.dataInicio || "");
          }}
          aberto={popoverAberto}
          aoMudarAberto={setPopoverAberto}
        >
          <button
            type="button"
            data-testid="trigger-celula-data"
            onClick={(e) => {
              e.stopPropagation();
              setPopoverAberto(true);
            }}
            className={cn(
              "h-7 px-2 text-xs rounded border border-border/50 bg-card hover:bg-accent flex items-center gap-1.5 transition-colors cursor-pointer",
              infoData.ehVazio ? "text-muted-foreground opacity-60" : "text-foreground font-medium"
            )}
          >
            <CalendarIcon size={12} className="text-muted-foreground shrink-0" />
            <span className="truncate">{infoData.texto}</span>
          </button>
        </SeletorDataAvancada>
      </div>
    );
  }

  // 3. NÚMERO FORMATADO
  if (tipo === "numero") {
    return (
      <div
        onClick={(e) => e.stopPropagation()}
        className={cn("inline-flex items-center flex-1 min-w-0", className)}
      >
        <FormatadorNumero
          valor={valor}
          config={configNumero}
          aoMudar={(novoNum) => aoSalvar(novoNum)}
          placeholder={placeholder}
        />
      </div>
    );
  }

  // 4. CHECKBOX
  if (tipo === "checkbox") {
    const marcado = Boolean(valor);
    return (
      <div
        onClick={(e) => e.stopPropagation()}
        className={cn("inline-flex items-center py-1", className)}
      >
        <input
          type="checkbox"
          checked={marcado}
          onChange={(e) => {
            e.stopPropagation();
            aoSalvar(e.target.checked);
          }}
          className="w-4 h-4 rounded border-border text-primary focus:ring-primary cursor-pointer"
        />
      </div>
    );
  }

  // 5. SELECT / MULTISELECT / TAGS
  if (tipo === "select" || tipo === "multiselect" || tipo === "tags") {
    const valoresArray = Array.isArray(valor) ? valor : valor ? [String(valor)] : [];

    return (
      <div
        onClick={(e) => e.stopPropagation()}
        className={cn("inline-flex items-center gap-1 flex-wrap", className)}
      >
        {valoresArray.map((tag) => (
          <Badge
            key={tag}
            variant="secondary"
            className="text-[11px] px-2 py-0.5 border border-border/60 bg-accent text-foreground"
          >
            {tag}
          </Badge>
        ))}

        <Popover open={popoverAberto} onOpenChange={setPopoverAberto}>
          <PopoverTrigger asChild>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setPopoverAberto(true);
              }}
              className="h-6 px-1.5 text-xs text-muted-foreground hover:text-foreground rounded hover:bg-accent flex items-center gap-1 transition-colors cursor-pointer"
            >
              <Plus size={11} />
              {valoresArray.length === 0 && <span>{placeholder}</span>}
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-52 p-1.5 shadow-xl border-border" align="start">
            <div className="space-y-1">
              <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-1">
                Opções
              </span>
              <div className="flex flex-col gap-0.5 max-h-48 overflow-y-auto">
                {opcoesSelect.map((op) => {
                  const ativo = valoresArray.includes(op);
                  return (
                    <button
                      key={op}
                      type="button"
                      onClick={() => {
                        if (tipo === "select") {
                          aoSalvar(ativo ? "" : op);
                          setPopoverAberto(false);
                        } else {
                          const nova = ativo
                            ? valoresArray.filter((x) => x !== op)
                            : [...valoresArray, op];
                          aoSalvar(nova);
                        }
                      }}
                      className={cn(
                        "w-full flex items-center justify-between px-2 py-1.5 rounded text-xs text-left cursor-pointer transition-colors",
                        ativo ? "bg-primary/10 text-primary font-medium" : "hover:bg-accent text-foreground"
                      )}
                    >
                      <span className="truncate">{op}</span>
                      {ativo && <Check size={12} className="text-primary shrink-0" />}
                    </button>
                  );
                })}
              </div>
            </div>
          </PopoverContent>
        </Popover>
      </div>
    );
  }

  // 6. RELAÇÃO
  if (tipo === "relation") {
    const rels = Array.isArray(valor) ? valor : valor ? [String(valor)] : [];

    return (
      <div
        onClick={(e) => e.stopPropagation()}
        className={cn("inline-flex items-center flex-1 min-w-0", className)}
      >
        <SeletorRelacaoNotion
          relacionamentos={rels}
          opcoesDisponiveis={opcoesRelacao}
          aoAlternarRelacao={(tit) => {
            const limpo = tit.startsWith("@") ? tit.slice(1) : tit;
            const existe = rels.some((r) => (r.startsWith("@") ? r.slice(1) : r) === limpo);
            const novos = existe
              ? rels.filter((r) => (r.startsWith("@") ? r.slice(1) : r) !== limpo)
              : [...rels, `@${limpo}`];
            aoSalvar(novos);
          }}
          aoCriarNovoItem={aoCriarItemRelacao}
          aoClicarItem={aoClicarItemRelacao}
          aberto={popoverAberto}
          aoMudarAberto={setPopoverAberto}
        />
      </div>
    );
  }

  // 7. TEXTO / URL / PADRÃO
  if (editandoTexto) {
    return (
      <input
        type="text"
        value={textoLocal}
        onChange={(e) => setTextoLocal(e.target.value)}
        onBlur={() => {
          setEditandoTexto(false);
          aoSalvar(textoLocal);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            setEditandoTexto(false);
            aoSalvar(textoLocal);
          }
          if (e.key === "Escape") {
            setEditandoTexto(false);
            setTextoLocal(String(valor || ""));
          }
        }}
        autoFocus
        onClick={(e) => e.stopPropagation()}
        className="w-full bg-accent/40 border border-border text-xs px-2 h-7 rounded outline-none focus:ring-1 focus:ring-primary"
      />
    );
  }

  return (
    <div
      onClick={(e) => {
        e.stopPropagation();
        setEditandoTexto(true);
      }}
      className={cn(
        "h-7 px-2 text-xs rounded hover:bg-accent/40 flex items-center cursor-text truncate transition-colors",
        valor ? "text-foreground" : "text-muted-foreground opacity-60",
        className
      )}
      title="Clique para editar"
    >
      <span className="truncate">{valor ? String(valor) : placeholder}</span>
    </div>
  );
}
