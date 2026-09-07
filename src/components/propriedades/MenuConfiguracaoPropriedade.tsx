import React, { useState } from "react";
import {
  Type,
  Hash,
  Calendar as CalendarIcon,
  CheckSquare,
  ListTodo,
  Tags,
  Link as LinkIcon,
  User,
  Clock,
  Eye,
  EyeOff,
  Trash2,
  Copy,
  ChevronUp,
  ChevronDown,
  HelpCircle,
  Timer,
} from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { SeletorIconePropriedade, ICONES_MAPA, CORES_ICONE } from "./SeletorIconePropriedade";
import { GerenciadorOpcoesSelect } from "./GerenciadorOpcoesSelect";
import type { TipoPropriedade, OpcaoVisibilidade } from "@/components/PropriedadesNotion";

export const ICONES_TIPO_PADRAO: Record<TipoPropriedade, React.ElementType> = {
  texto: Type,
  numero: Hash,
  data: CalendarIcon,
  checkbox: CheckSquare,
  select: ListTodo,
  multiselect: Tags,
  relation: LinkIcon,
  status: ListTodo,
  criado_por: User,
  criado_em: Clock,
  ultima_edicao: Clock,
};

export const NOMES_TIPO_PADRAO: Record<TipoPropriedade, string> = {
  texto: "Texto",
  numero: "Número",
  data: "Data",
  checkbox: "Checkbox",
  select: "Seleção Única",
  multiselect: "Múltipla Seleção (Tags)",
  relation: "Relacionamento",
  status: "Status",
  criado_por: "Criado por",
  criado_em: "Criado em",
  ultima_edicao: "Última edição em",
};

interface MenuConfiguracaoPropriedadeProps {
  chave: string;
  nomeAtual: string;
  tipoAtual: TipoPropriedade;
  visibilidadeAtual: OpcaoVisibilidade;
  descricaoAtual?: string;
  iconePersonalizado?: string;
  corIconePersonalizada?: string;
  ehFixo?: boolean;
  podeMoverCima?: boolean;
  podeMoverBaixo?: boolean;
  opcoesCadastradas: string[];
  coresTagsMap: Record<string, string>;
  aberto: boolean;
  aoMudarAberto: (aberto: boolean) => void;
  aoRenomear: (novoNome: string) => void;
  aoMudarTipo: (novoTipo: TipoPropriedade) => void;
  aoMudarVisibilidade: (novaVis: OpcaoVisibilidade) => void;
  aoMudarDescricao: (novaDesc: string) => void;
  aoMudarIcone: (novoIcone: string) => void;
  aoMudarCorIcone: (novaCor: string) => void;
  aoMover: (direcao: "cima" | "baixo") => void;
  aoDuplicar?: () => void;
  aoExcluir?: () => void;
  aoAtualizarOpcoes: (novasOpcoes: string[]) => void;
  aoAtualizarCorTag: (tag: string, cor: string) => void;
  aoRenomearTag: (tagAntiga: string, tagNova: string) => void;
  aoExcluirTag: (tag: string) => void;
  dadosPomodoro?: { estimados?: number; realizados?: number };
  aoAtualizarPomodoro?: (dados: { estimados?: number; realizados?: number }) => void;
  children: React.ReactNode;
}

export function MenuConfiguracaoPropriedade({
  chave,
  nomeAtual,
  tipoAtual,
  visibilidadeAtual,
  descricaoAtual = "",
  iconePersonalizado,
  corIconePersonalizada = "padrao",
  ehFixo = false,
  podeMoverCima = false,
  podeMoverBaixo = false,
  opcoesCadastradas,
  coresTagsMap,
  aberto,
  aoMudarAberto,
  aoRenomear,
  aoMudarTipo,
  aoMudarVisibilidade,
  aoMudarDescricao,
  aoMudarIcone,
  aoMudarCorIcone,
  aoMover,
  aoDuplicar,
  aoExcluir,
  aoAtualizarOpcoes,
  aoAtualizarCorTag,
  aoRenomearTag,
  aoExcluirTag,
  dadosPomodoro,
  aoAtualizarPomodoro,
  children,
}: MenuConfiguracaoPropriedadeProps) {
  const [nomeTemp, setNomeTemp] = useState(nomeAtual);
  const [descTemp, setDescTemp] = useState(descricaoAtual);
  const [editandoDesc, setEditandoDesc] = useState(Boolean(descricaoAtual));

  // Resolver ícone
  const IconeResolvido =
    (iconePersonalizado && ICONES_MAPA[iconePersonalizado]) ||
    ICONES_TIPO_PADRAO[tipoAtual] ||
    Type;

  const corIconeObj = CORES_ICONE.find((c) => c.id === corIconePersonalizada) || CORES_ICONE[0];

  const handleSalvarNome = () => {
    const limpo = nomeTemp.trim();
    if (limpo && limpo !== nomeAtual) {
      aoRenomear(limpo);
    }
  };

  const handleSalvarDescricao = () => {
    aoMudarDescricao(descTemp.trim());
  };

  return (
    <Popover open={aberto} onOpenChange={(open) => {
      aoMudarAberto(open);
      if (open) {
        setNomeTemp(nomeAtual);
        setDescTemp(descricaoAtual);
      }
    }}>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent
        className="w-[300px] p-3 flex flex-col gap-2.5 shadow-2xl border-border max-h-[85vh] overflow-y-auto"
        align="start"
        onInteractOutside={() => aoMudarAberto(false)}
      >
        {/* Cabeçalho com Ícone clicável + Nome editável */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
              Propriedade
            </span>
            <span className="text-[10px] font-mono text-muted-foreground/60">
              #{chave}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <SeletorIconePropriedade
              iconeAtual={iconePersonalizado || "Type"}
              corAtual={corIconePersonalizada}
              aoMudarIcone={aoMudarIcone}
              aoMudarCor={aoMudarCorIcone}
            >
              <button
                type="button"
                title="Alterar ícone e cor"
                className={cn(
                  "h-8 w-8 rounded-lg border border-border/80 flex items-center justify-center hover:bg-accent transition-colors shrink-0 cursor-pointer shadow-2xs",
                  corIconeObj.classe
                )}
              >
                <IconeResolvido size={15} />
              </button>
            </SeletorIconePropriedade>

            <input
              type="text"
              value={nomeTemp}
              onChange={(e) => setNomeTemp(e.target.value)}
              onBlur={handleSalvarNome}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSalvarNome();
              }}
              placeholder="Nome da propriedade"
              className="flex-1 bg-accent/40 border border-border text-xs px-2.5 py-1.5 rounded-lg outline-none focus:ring-2 focus:ring-primary font-medium text-foreground"
            />
          </div>
        </div>

        {/* Dica / Descrição Opcional */}
        <div className="pt-1">
          {editandoDesc ? (
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                  <HelpCircle size={11} className="text-primary" />
                  <span>Dica de Ajuda (Tooltip)</span>
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setDescTemp("");
                    aoMudarDescricao("");
                    setEditandoDesc(false);
                  }}
                  className="text-[10px] text-muted-foreground hover:text-destructive"
                >
                  Remover
                </button>
              </div>
              <input
                type="text"
                placeholder="Ex: Instrução de preenchimento..."
                value={descTemp}
                onChange={(e) => setDescTemp(e.target.value)}
                onBlur={handleSalvarDescricao}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSalvarDescricao();
                }}
                className="w-full bg-accent/30 border border-border text-[11px] px-2 py-1 rounded-md outline-none focus:ring-1 focus:ring-primary text-muted-foreground"
              />
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setEditandoDesc(true)}
              className="text-[11px] text-muted-foreground hover:text-foreground flex items-center gap-1.5 py-0.5 transition-colors cursor-pointer"
            >
              <HelpCircle size={12} className="opacity-70" />
              <span>Adicionar dica ou descrição...</span>
            </button>
          )}
        </div>

        {/* Visibilidade */}
        <div className="border-t border-border/50 pt-2">
          <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">
            Visibilidade
          </span>
          <div className="grid grid-cols-3 gap-1">
            {[
              { id: "sempre", label: "Sempre", icon: Eye },
              { id: "vazia", label: "Se vazia", icon: EyeOff },
              { id: "esconder", label: "Ocultar", icon: EyeOff },
            ].map((v) => (
              <button
                key={v.id}
                type="button"
                onClick={() => aoMudarVisibilidade(v.id as OpcaoVisibilidade)}
                className={cn(
                  "flex items-center justify-center gap-1 px-1.5 py-1.5 rounded-md text-[11px] transition-colors border cursor-pointer",
                  visibilidadeAtual === v.id
                    ? "bg-primary/10 border-primary/30 text-primary font-semibold"
                    : "bg-card border-border/60 text-muted-foreground hover:text-foreground hover:bg-accent"
                )}
              >
                <v.icon size={12} className="shrink-0" />
                <span>{v.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Gestão de Opções para Select / Multiselect */}
        {(tipoAtual === "multiselect" || tipoAtual === "select" || chave === "tags" || chave === "colaboracao") && (
          <div className="border-t border-border/50 pt-2">
            <GerenciadorOpcoesSelect
              opcoes={opcoesCadastradas}
              coresMap={coresTagsMap}
              aoAtualizarOpcoes={aoAtualizarOpcoes}
              aoAtualizarCor={aoAtualizarCorTag}
              aoRenomearOpcao={aoRenomearTag}
              aoExcluirOpcao={aoExcluirTag}
            />
          </div>
        )}

        {/* Pomodoro */}
        {(chave === "Pomodoro" || chave === "pomodoro" || chave === "estimativa") && dadosPomodoro && aoAtualizarPomodoro && (
          <div className="border-t border-border/50 pt-2">
            <div className="p-2.5 bg-secondary/30 rounded-lg border border-border/40 space-y-2 text-xs">
              <div className="flex items-center gap-1.5 font-semibold text-foreground">
                <Timer size={13} className="text-indigo-500 shrink-0" />
                <span>Configurações de Pomodoro</span>
              </div>
              <div className="grid grid-cols-2 gap-2 pt-1">
                <div>
                  <span className="text-[10px] text-muted-foreground block mb-0.5">Estimados:</span>
                  <input
                    type="number"
                    min="0"
                    max="99"
                    value={dadosPomodoro.estimados ?? ""}
                    onChange={(e) => {
                      const v = e.target.value === "" ? undefined : Number(e.target.value);
                      aoAtualizarPomodoro({ ...dadosPomodoro, estimados: v });
                    }}
                    placeholder="0"
                    className="w-full bg-card border border-border text-xs px-2 py-1 rounded outline-none text-center"
                  />
                </div>
                <div>
                  <span className="text-[10px] text-muted-foreground block mb-0.5">Realizados:</span>
                  <input
                    type="number"
                    min="0"
                    max="99"
                    value={dadosPomodoro.realizados ?? ""}
                    onChange={(e) => {
                      const v = e.target.value === "" ? undefined : Number(e.target.value);
                      aoAtualizarPomodoro({ ...dadosPomodoro, realizados: v });
                    }}
                    placeholder="0"
                    className="w-full bg-card border border-border text-xs px-2 py-1 rounded outline-none text-center"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Troca de Tipo (quando não é fixo) */}
        {!ehFixo && (
          <div className="border-t border-border/50 pt-2">
            <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">
              Tipo de Dados
            </span>
            <div className="grid grid-cols-2 gap-1 max-h-36 overflow-y-auto pr-0.5">
              {(Object.entries(NOMES_TIPO_PADRAO) as [TipoPropriedade, string][]).map(([t, label]) => {
                const IconComp = ICONES_TIPO_PADRAO[t] || Type;
                const selecionado = tipoAtual === t;
                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() => aoMudarTipo(t)}
                    className={cn(
                      "flex items-center gap-1.5 px-2 py-1.5 rounded-md text-[11px] text-left transition-colors border cursor-pointer",
                      selecionado
                        ? "bg-primary/10 border-primary/30 text-primary font-semibold"
                        : "bg-card border-border/50 text-muted-foreground hover:text-foreground hover:bg-accent"
                    )}
                  >
                    <IconComp size={12} className="shrink-0 opacity-70" />
                    <span className="truncate">{label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Ações de Reordenação e Gestão */}
        <div className="border-t border-border/50 pt-2 flex flex-col gap-1">
          <div className="grid grid-cols-2 gap-1">
            <button
              type="button"
              disabled={!podeMoverCima}
              onClick={() => aoMover("cima")}
              className="flex items-center justify-center gap-1 px-2 py-1.5 rounded-md text-[11px] bg-secondary/40 hover:bg-secondary border border-border/60 text-muted-foreground hover:text-foreground disabled:opacity-30 cursor-pointer transition-colors"
            >
              <ChevronUp size={12} />
              <span>Para Cima</span>
            </button>
            <button
              type="button"
              disabled={!podeMoverBaixo}
              onClick={() => aoMover("baixo")}
              className="flex items-center justify-center gap-1 px-2 py-1.5 rounded-md text-[11px] bg-secondary/40 hover:bg-secondary border border-border/60 text-muted-foreground hover:text-foreground disabled:opacity-30 cursor-pointer transition-colors"
            >
              <ChevronDown size={12} />
              <span>Para Baixo</span>
            </button>
          </div>

          {aoDuplicar && !ehFixo && (
            <button
              type="button"
              onClick={aoDuplicar}
              className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md text-xs text-muted-foreground hover:text-foreground hover:bg-accent transition-colors cursor-pointer"
            >
              <Copy size={13} className="shrink-0" />
              <span>Duplicar propriedade</span>
            </button>
          )}

          {aoExcluir && !ehFixo && (
            <button
              type="button"
              onClick={aoExcluir}
              className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md text-xs text-destructive hover:bg-destructive/10 transition-colors cursor-pointer font-medium"
            >
              <Trash2 size={13} className="shrink-0" />
              <span>Excluir propriedade</span>
            </button>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
