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
import { 
  SeletorIconePropriedade, 
  ICONES_MAPA, 
  CORES_ICONE,
  obterIconePadraoPropriedade,
  obterCorPadraoPropriedade,
} from "./SeletorIconePropriedade";
import { GerenciadorOpcoesSelect } from "./GerenciadorOpcoesSelect";
import { ConfiguradorNumeroModal } from "./ConfiguradorNumeroModal";
import type { ConfigFormatoNumero } from "./FormatadorNumero";
import { EditorStatusNotion, type ItemStatusNotion } from "./GerenciadorStatusNotion";
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
  configNumero?: ConfigFormatoNumero;
  aoAtualizarConfigNumero?: (cfg: ConfigFormatoNumero) => void;
  statusLista?: ItemStatusNotion[];
  aoAtualizarStatusLista?: (lista: ItemStatusNotion[]) => void;
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
  configNumero = {},
  aoAtualizarConfigNumero,
  statusLista,
  aoAtualizarStatusLista,
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
  const [editandoNome, setEditandoNome] = useState(false);
  const [nomeTemp, setNomeTemp] = useState(nomeAtual);
  const [editandoDesc, setEditandoDesc] = useState(false);
  const [descTemp, setDescTemp] = useState(descricaoAtual);

  const iconeNomePadrao = obterIconePadraoPropriedade(chave, tipoAtual);
  const corNomePadrao = obterCorPadraoPropriedade(chave, tipoAtual);
  const iconeNomeEfetivo = iconePersonalizado || iconeNomePadrao;
  const corIconeEfetiva = corIconePersonalizada && corIconePersonalizada !== "padrao" ? corIconePersonalizada : corNomePadrao;
  const IconeComponente =
    ICONES_MAPA[iconeNomeEfetivo] || ICONES_TIPO_PADRAO[tipoAtual] || Type;
  const corIconeObj =
    CORES_ICONE.find((c) => c.id === corIconeEfetiva) || CORES_ICONE[0];

  const handleSalvarNome = () => {
    setEditandoNome(false);
    if (nomeTemp.trim() && nomeTemp.trim() !== nomeAtual) {
      aoRenomear(nomeTemp.trim());
    } else {
      setNomeTemp(nomeAtual);
    }
  };

  const handleSalvarDescricao = () => {
    setEditandoDesc(false);
    aoMudarDescricao(descTemp.trim());
  };

  return (
    <Popover open={aberto} onOpenChange={aoMudarAberto}>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent
        className="w-72 p-2.5 shadow-2xl border-border space-y-3 max-h-[85vh] overflow-y-auto"
        align="start"
        onInteractOutside={() => aoMudarAberto(false)}
      >
        {/* Cabeçalho da Propriedade */}
        <div className="flex items-center gap-2 pb-2 border-b border-border/60">
          <SeletorIconePropriedade
            iconeAtual={iconePersonalizado || "Type"}
            corAtual={corIconePersonalizada}
            aoMudarIcone={aoMudarIcone}
            aoMudarCor={aoMudarCorIcone}
          >
            <button
              type="button"
              className={cn(
                "w-7 h-7 rounded-md border border-border/80 flex items-center justify-center transition-colors hover:bg-accent cursor-pointer shrink-0",
                corIconeObj.classe
              )}
              title="Personalizar ícone e cor"
            >
              <IconeComponente size={14} />
            </button>
          </SeletorIconePropriedade>

          <div className="flex-1 min-w-0">
            {editandoNome && !ehFixo ? (
              <input
                type="text"
                autoFocus
                value={nomeTemp}
                onChange={(e) => setNomeTemp(e.target.value)}
                onBlur={handleSalvarNome}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSalvarNome();
                  if (e.key === "Escape") {
                    setNomeTemp(nomeAtual);
                    setEditandoNome(false);
                  }
                }}
                className="w-full bg-accent/40 border border-border text-xs px-1.5 py-0.5 rounded outline-none font-semibold focus:ring-1 focus:ring-primary"
              />
            ) : (
              <div
                onClick={() => !ehFixo && setEditandoNome(true)}
                className={cn(
                  "text-xs font-semibold truncate",
                  !ehFixo ? "hover:text-primary cursor-pointer" : "text-foreground"
                )}
                title={!ehFixo ? "Clique para renomear" : undefined}
              >
                {nomeAtual}
              </div>
            )}
            <div className="text-[10px] text-muted-foreground flex items-center gap-1">
              <span>{NOMES_TIPO_PADRAO[tipoAtual] || tipoAtual}</span>
              {ehFixo && <span className="opacity-70">(Padrão)</span>}
            </div>
          </div>
        </div>

        {/* Descrição / Ajuda */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-muted-foreground font-medium flex items-center gap-1">
              <HelpCircle size={11} />
              Descrição / Dica:
            </span>
            {!editandoDesc && (
              <button
                type="button"
                onClick={() => setEditandoDesc(true)}
                className="text-[10px] text-primary hover:underline cursor-pointer"
              >
                {descricaoAtual ? "Editar" : "+ Adicionar"}
              </button>
            )}
          </div>

          {editandoDesc ? (
            <div className="flex items-center gap-1">
              <input
                type="text"
                autoFocus
                placeholder="Explique o preenchimento deste campo..."
                value={descTemp}
                onChange={(e) => setDescTemp(e.target.value)}
                onBlur={handleSalvarDescricao}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSalvarDescricao();
                  if (e.key === "Escape") setEditandoDesc(false);
                }}
                className="flex-1 bg-accent/40 border border-border text-[11px] px-2 py-1 rounded outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
          ) : (
            descricaoAtual && (
              <p className="text-[11px] text-foreground/80 bg-accent/30 p-1.5 rounded border border-border/40 italic">
                "{descricaoAtual}"
              </p>
            )
          )}
        </div>

        {/* Visibilidade */}
        <div className="space-y-1 pt-1 border-t border-border/50">
          <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block">
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

        {/* Gestão de Status Agrupado */}
        {tipoAtual === "status" && statusLista && aoAtualizarStatusLista && (
          <div className="border-t border-border/50 pt-2">
            <EditorStatusNotion
              statusLista={statusLista}
              aoSalvarLista={aoAtualizarStatusLista}
            />
          </div>
        )}

        {/* Configuração de Número / Moeda / Barra de Progresso */}
        {tipoAtual === "numero" && aoAtualizarConfigNumero && (
          <div className="border-t border-border/50 pt-2">
            <ConfiguradorNumeroModal
              config={configNumero}
              aoSalvarConfig={aoAtualizarConfigNumero}
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
