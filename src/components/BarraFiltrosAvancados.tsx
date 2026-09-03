/**
 * BarraFiltrosAvancados — Sistema de Filtragem Global por Propriedades (Estilo Notion / Linear)
 *
 * Design & UX:
 * - Botão de filtro minimalista com badge de contagem de filtros ativos.
 * - Menu Popover fluído com busca rápida e lista categorizada com ícones coloridos exclusivos.
 * - Pílulas de filtro elegantes (chips) com controles integrados, menus refinados de operadores e valores.
 * - Suporte completo a Notas, Tarefas, Referências e Metas.
 */

import { useState, useMemo } from "react";
import {
  Filter,
  Plus,
  X,
  Search,
  Type,
  Tags as TagsIcon,
  Calendar as CalendarIcon,
  CalendarPlus,
  Clock,
  User,
  ListTodo,
  Hash,
  Link as LinkIcon,
  FolderOpen,
  Flame,
  CheckSquare,
  ChevronDown,
  RotateCcw,
} from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Tooltip } from "@/components/ui/tooltip";
import { cn, hojeISO } from "@/lib/utils";

export type TipoPropriedadeFiltro = "texto" | "tags" | "status" | "data" | "numero" | "checkbox";

export type OperadorFiltro =
  | "contem"
  | "nao_contem"
  | "igual"
  | "comeca_com"
  | "vazio"
  | "nao_vazio"
  | "antes_de"
  | "depois_de"
  | "eh_hoje";

export interface DefinicaoPropriedade {
  id: string;
  rotulo: string;
  tipo: TipoPropriedadeFiltro;
  opcoes?: string[];
  icone?: React.ReactNode;
}

export interface RegraFiltro {
  id: string;
  propriedadeId: string;
  rotulo: string;
  tipo: TipoPropriedadeFiltro;
  operador: OperadorFiltro;
  valor: any;
}

export const OPERADORES_POR_TIPO: Record<TipoPropriedadeFiltro, { id: OperadorFiltro; rotulo: string }[]> = {
  texto: [
    { id: "contem", rotulo: "contém" },
    { id: "nao_contem", rotulo: "não contém" },
    { id: "igual", rotulo: "é igual a" },
    { id: "comeca_com", rotulo: "começa com" },
    { id: "vazio", rotulo: "está vazio" },
    { id: "nao_vazio", rotulo: "não está vazio" },
  ],
  tags: [
    { id: "contem", rotulo: "contém tag" },
    { id: "nao_contem", rotulo: "não contém" },
    { id: "vazio", rotulo: "sem tags" },
    { id: "nao_vazio", rotulo: "com tags" },
  ],
  status: [
    { id: "igual", rotulo: "é" },
    { id: "nao_contem", rotulo: "não é" },
  ],
  data: [
    { id: "eh_hoje", rotulo: "é hoje" },
    { id: "antes_de", rotulo: "antes de" },
    { id: "depois_de", rotulo: "depois de" },
    { id: "vazio", rotulo: "sem data" },
    { id: "nao_vazio", rotulo: "com data" },
  ],
  numero: [
    { id: "igual", rotulo: "=" },
    { id: "antes_de", rotulo: "<" },
    { id: "depois_de", rotulo: ">" },
    { id: "vazio", rotulo: "vazio" },
  ],
  checkbox: [
    { id: "igual", rotulo: "marcado" },
    { id: "vazio", rotulo: "desmarcado" },
  ],
};

const RENDER_ICONE_PROPRIEDADE = (id: string, tipo: TipoPropriedadeFiltro, customIcon?: React.ReactNode) => {
  if (customIcon) return customIcon;
  const idNorm = id.toLowerCase();

  if (idNorm.includes("tag")) return <TagsIcon size={13} className="text-amber-500" />;
  if (idNorm.includes("status")) return <ListTodo size={13} className="text-emerald-500" />;
  if (idNorm.includes("prazo") || idNorm === "data") return <CalendarIcon size={13} className="text-rose-500" />;
  if (idNorm.includes("criado")) return <CalendarPlus size={13} className="text-indigo-500" />;
  if (idNorm.includes("atualizado") || idNorm.includes("edicao")) return <Clock size={13} className="text-teal-500" />;
  if (idNorm.includes("fonte") || idNorm.includes("link")) return <LinkIcon size={13} className="text-blue-500" />;
  if (idNorm.includes("pasta") || idNorm.includes("caminho")) return <FolderOpen size={13} className="text-amber-600" />;
  if (idNorm.includes("pomodoro") || idNorm.includes("esforco")) return <Flame size={13} className="text-orange-500" />;
  if (idNorm.includes("autor") || idNorm.includes("usuario") || idNorm.includes("criado_por")) return <User size={13} className="text-purple-500" />;
  if (tipo === "checkbox") return <CheckSquare size={13} className="text-blue-500" />;
  if (tipo === "numero") return <Hash size={13} className="text-cyan-500" />;

  return <Type size={13} className="text-sky-500" />;
};

const ROTULO_TIPO_AMIGAVEL: Record<TipoPropriedadeFiltro, string> = {
  texto: "Texto",
  tags: "Tags",
  status: "Status",
  data: "Data",
  numero: "Número",
  checkbox: "Seleção",
};

export interface BarraFiltrosAvancadosProps {
  propriedadesDisponiveis: DefinicaoPropriedade[];
  regras: RegraFiltro[];
  aoMudarRegras: (regras: RegraFiltro[]) => void;
  className?: string;
}

export function BarraFiltrosAvancados({
  propriedadesDisponiveis,
  regras,
  aoMudarRegras,
  className,
}: BarraFiltrosAvancadosProps) {
  const [menuAddAberto, setMenuAddAberto] = useState(false);
  const [buscaPropriedade, setBuscaPropriedade] = useState("");

  const propriedadesFiltradas = useMemo(() => {
    if (!buscaPropriedade.trim()) return propriedadesDisponiveis;
    const b = buscaPropriedade.toLowerCase();
    return propriedadesDisponiveis.filter((p) => p.rotulo.toLowerCase().includes(b) || p.id.toLowerCase().includes(b));
  }, [propriedadesDisponiveis, buscaPropriedade]);

  const adicionarFiltro = (prop: DefinicaoPropriedade) => {
    const operadores = OPERADORES_POR_TIPO[prop.tipo] || OPERADORES_POR_TIPO.texto;
    const operadorInicial = operadores[0]?.id || "contem";
    let valorInicial: any = "";

    if (prop.tipo === "status" && prop.opcoes && prop.opcoes.length > 0) {
      valorInicial = prop.opcoes[0];
    } else if (prop.tipo === "data") {
      valorInicial = hojeISO();
    }

    const novaRegra: RegraFiltro = {
      id: `filtro_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      propriedadeId: prop.id,
      rotulo: prop.rotulo,
      tipo: prop.tipo,
      operador: operadorInicial,
      valor: valorInicial,
    };

    aoMudarRegras([...regras, novaRegra]);
    setMenuAddAberto(false);
    setBuscaPropriedade("");
  };

  const atualizarRegra = (id: string, updates: Partial<RegraFiltro>) => {
    aoMudarRegras(
      regras.map((r) => {
        if (r.id !== id) return r;
        return { ...r, ...updates };
      })
    );
  };

  const removerRegra = (id: string) => {
    aoMudarRegras(regras.filter((r) => r.id !== id));
  };

  const limparTodosFiltros = () => {
    aoMudarRegras([]);
  };

  return (
    <div className={cn("flex items-center gap-2 flex-wrap text-xs", className)}>
      {/* Botão de Disparo do Filtro */}
      <Popover open={menuAddAberto} onOpenChange={setMenuAddAberto}>
        <Tooltip conteudo="Filtrar por propriedade" desabilitado={regras.length > 0}>
          <PopoverTrigger asChild>
            {regras.length === 0 ? (
              <Button
                variant="outline"
                size="sm"
                className="h-9 px-2.5 rounded-xl border border-border/80 bg-background/80 hover:bg-accent text-muted-foreground hover:text-foreground transition-all cursor-pointer shadow-2xs gap-1.5 font-medium"
                aria-label="Filtrar por propriedade"
              >
                <Filter size={14} className="text-primary/80" />
                <span className="text-xs">Filtro</span>
              </Button>
            ) : (
              <Button
                variant="outline"
                size="sm"
                className="h-9 px-3 text-xs rounded-xl text-primary border-primary/40 bg-primary/10 hover:bg-primary/15 transition-all gap-1.5 cursor-pointer font-semibold shadow-2xs"
              >
                <Plus size={13} strokeWidth={2.5} />
                <span>Filtrar ({regras.length})</span>
              </Button>
            )}
          </PopoverTrigger>
        </Tooltip>

        <PopoverContent
          className="w-72 p-2 shadow-2xl border-border/80 bg-popover/95 backdrop-blur-xl rounded-2xl animate-in fade-in-50 zoom-in-95 duration-150"
          align="start"
        >
          <div className="space-y-2">
            {/* Campo de Busca de Propriedades */}
            <div className="relative">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
              <input
                type="text"
                value={buscaPropriedade}
                onChange={(e) => setBuscaPropriedade(e.target.value)}
                placeholder="Procurar propriedade..."
                autoFocus
                className="w-full bg-secondary/50 border border-border/60 rounded-xl pl-8.5 pr-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-primary/40 transition-all font-medium"
              />
            </div>

            {/* Lista com Propriedades e Ícones Elegantes */}
            <div className="max-h-56 overflow-y-auto space-y-1 pt-1 pr-0.5 custom-scrollbar">
              {propriedadesFiltradas.length === 0 ? (
                <div className="py-6 text-center text-xs text-muted-foreground">
                  Nenhuma propriedade encontrada
                </div>
              ) : (
                propriedadesFiltradas.map((p) => {
                  const Icone = RENDER_ICONE_PROPRIEDADE(p.id, p.tipo, p.icone);
                  const tipoTexto = ROTULO_TIPO_AMIGAVEL[p.tipo] || "Geral";

                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => adicionarFiltro(p)}
                      className="w-full flex items-center justify-between gap-2 px-2.5 py-2 rounded-xl text-xs text-left text-foreground hover:bg-accent/80 transition-all cursor-pointer group"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="h-6 w-6 rounded-lg bg-secondary/60 flex items-center justify-center shrink-0 group-hover:bg-primary/15 transition-colors">
                          {Icone}
                        </div>
                        <span className="truncate font-semibold text-foreground/90 group-hover:text-foreground">
                          {p.rotulo}
                        </span>
                      </div>
                      <span className="text-[10px] font-medium text-muted-foreground bg-secondary/40 px-1.5 py-0.5 rounded-md shrink-0">
                        {tipoTexto}
                      </span>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </PopoverContent>
      </Popover>

      {/* Pílulas de Filtros Ativos (Estilo Notion Linear) */}
      {regras.map((regra) => {
        const propDef = propriedadesDisponiveis.find((p) => p.id === regra.propriedadeId);
        const operadoresDisponiveis = OPERADORES_POR_TIPO[regra.tipo] || OPERADORES_POR_TIPO.texto;
        const precisaValor = regra.operador !== "vazio" && regra.operador !== "nao_vazio" && regra.operador !== "eh_hoje";
        const Icone = RENDER_ICONE_PROPRIEDADE(regra.propriedadeId, regra.tipo, propDef?.icone);

        return (
          <div
            key={regra.id}
            className="inline-flex items-center rounded-xl bg-card border border-border/80 shadow-2xs hover:border-primary/40 transition-all overflow-hidden text-xs animate-in fade-in zoom-in-95 duration-100 divide-x divide-border/60"
          >
            {/* Bloco 1: Nome da Propriedade com Ícone */}
            <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-secondary/20 select-none font-semibold text-foreground shrink-0">
              <span className="shrink-0">{Icone}</span>
              <span className="text-[11px]">{regra.rotulo}</span>
            </div>

            {/* Bloco 2: Seletor Elegante de Operador */}
            <div className="relative flex items-center bg-background/50 px-1.5 py-1">
              <select
                value={regra.operador}
                onChange={(e) => atualizarRegra(regra.id, { operador: e.target.value as OperadorFiltro })}
                className="appearance-none bg-transparent pr-4 pl-1 text-[11px] font-medium text-muted-foreground hover:text-foreground outline-none cursor-pointer"
              >
                {operadoresDisponiveis.map((op) => (
                  <option key={op.id} value={op.id}>
                    {op.rotulo}
                  </option>
                ))}
              </select>
              <ChevronDown size={11} className="absolute right-1 text-muted-foreground pointer-events-none opacity-60" />
            </div>

            {/* Bloco 3: Campo de Valor Dinâmico e Customizado */}
            {precisaValor && (
              <div className="flex items-center px-1.5 py-1 bg-background/30">
                {regra.tipo === "status" && propDef?.opcoes ? (
                  <div className="relative flex items-center">
                    <select
                      value={regra.valor || ""}
                      onChange={(e) => atualizarRegra(regra.id, { valor: e.target.value })}
                      className="appearance-none bg-transparent pr-4 pl-1 text-[11px] font-semibold text-primary outline-none cursor-pointer"
                    >
                      {propDef.opcoes.map((opt) => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </select>
                    <ChevronDown size={11} className="absolute right-0 text-muted-foreground pointer-events-none opacity-60" />
                  </div>
                ) : regra.tipo === "tags" && propDef?.opcoes ? (
                  <div className="relative flex items-center">
                    <select
                      value={regra.valor || ""}
                      onChange={(e) => atualizarRegra(regra.id, { valor: e.target.value })}
                      className="appearance-none bg-transparent pr-4 pl-1 text-[11px] font-medium text-foreground outline-none cursor-pointer max-w-[130px] truncate"
                    >
                      <option value="">Escolher tag...</option>
                      {propDef.opcoes.map((tag) => (
                        <option key={tag} value={tag}>
                          {tag}
                        </option>
                      ))}
                    </select>
                    <ChevronDown size={11} className="absolute right-0 text-muted-foreground pointer-events-none opacity-60" />
                  </div>
                ) : regra.tipo === "data" ? (
                  <input
                    type="date"
                    value={regra.valor || ""}
                    onChange={(e) => atualizarRegra(regra.id, { valor: e.target.value })}
                    className="bg-transparent border-none text-[11px] font-mono text-foreground outline-none px-1 py-0.5 cursor-pointer"
                  />
                ) : (
                  <input
                    type="text"
                    value={regra.valor || ""}
                    onChange={(e) => atualizarRegra(regra.id, { valor: e.target.value })}
                    placeholder="Digitar valor..."
                    className="bg-transparent border-none text-[11px] text-foreground placeholder:text-muted-foreground outline-none px-1.5 py-0.5 w-24 sm:w-32 focus:w-40 transition-all font-medium"
                  />
                )}
              </div>
            )}

            {/* Bloco 4: Botão de Remover Filtro */}
            <Tooltip conteudo="Remover filtro">
              <button
                type="button"
                onClick={() => removerRegra(regra.id)}
                className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors cursor-pointer shrink-0"
                aria-label="Remover filtro"
              >
                <X size={12} />
              </button>
            </Tooltip>
          </div>
        );
      })}

      {/* Botão de Limpar Todos os Filtros */}
      {regras.length > 0 && (
        <Tooltip conteudo="Remover todos os filtros" posicao="top">
          <button
            type="button"
            onClick={limparTodosFiltros}
            className="p-1.5 text-muted-foreground hover:text-destructive rounded-lg hover:bg-destructive/10 transition-colors cursor-pointer select-none"
            aria-label="Limpar todos os filtros"
          >
            <RotateCcw size={13} />
          </button>
        </Tooltip>
      )}
    </div>
  );
}

/**
 * Função utilitária universal de filtragem client-side por regras.
 */
export function filtrarItensPorRegras<T>(
  itens: T[],
  regras: RegraFiltro[],
  extratorPropriedade: (item: T, propId: string) => any
): T[] {
  if (regras.length === 0) return itens;

  const hojeIso = hojeISO();

  return itens.filter((item) => {
    return regras.every((regra) => {
      const val = extratorPropriedade(item, regra.propriedadeId);

      // Tratamento para 'vazio' e 'nao_vazio'
      if (regra.operador === "vazio") {
        if (val === undefined || val === null || val === "") return true;
        if (Array.isArray(val) && val.length === 0) return true;
        return false;
      }
      if (regra.operador === "nao_vazio") {
        if (val === undefined || val === null || val === "") return false;
        if (Array.isArray(val) && val.length === 0) return false;
        return true;
      }

      // Tratamento para Tags / Arrays
      if (regra.tipo === "tags" || Array.isArray(val)) {
        const tags = Array.isArray(val) ? val.map((x) => String(x).toLowerCase()) : [];
        const busca = String(regra.valor || "").toLowerCase().trim();
        if (!busca) return true;
        if (regra.operador === "contem") return tags.some((t) => t.includes(busca));
        if (regra.operador === "nao_contem") return !tags.some((t) => t.includes(busca));
        return true;
      }

      // Tratamento para Data
      if (regra.tipo === "data") {
        const dataStr = typeof val === "string" ? val.match(/\d{4}-\d{2}-\d{2}/)?.[0] : "";
        if (regra.operador === "eh_hoje") return dataStr === hojeIso;
        if (!dataStr || !regra.valor) return true;
        if (regra.operador === "antes_de") return dataStr < regra.valor;
        if (regra.operador === "depois_de") return dataStr > regra.valor;
        if (regra.operador === "igual") return dataStr === regra.valor;
        return true;
      }

      // Tratamento para Texto Geral
      const textoItem = String(val || "").toLowerCase();
      const textoBusca = String(regra.valor || "").toLowerCase().trim();

      if (!textoBusca) return true;

      switch (regra.operador) {
        case "contem":
          return textoItem.includes(textoBusca);
        case "nao_contem":
          return !textoItem.includes(textoBusca);
        case "igual":
          return textoItem === textoBusca;
        case "comeca_com":
          return textoItem.startsWith(textoBusca);
        default:
          return textoItem.includes(textoBusca);
      }
    });
  });
}
