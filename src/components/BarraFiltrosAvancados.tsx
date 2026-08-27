/**
 * BarraFiltrosAvancados — Sistema de Filtragem Global por Propriedades (Estilo Notion)
 *
 * Funcionalidades:
 * 1. Botão simples de filtro (apenas ícone).
 * 2. Ao clicar, abre popover com busca "Procurar propriedade..." e lista de todas as propriedades.
 * 3. Ao selecionar uma propriedade, adiciona uma pílula na linha de filtros com operador e campo de valor.
 * 4. Botão "+ Filtrar" para adicionar múltiplos filtros combinados (AND).
 * 5. Reutilizável em Notas, Tarefas, Referências, Metas e Lousas.
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
  Clock,
  User,
  ListTodo,
  Hash,
} from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

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
  opcoes?: string[]; // Opções para status ou tags
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
    { id: "igual", rotulo: "é exatamente" },
    { id: "comeca_com", rotulo: "começa com" },
    { id: "vazio", rotulo: "está vazio" },
    { id: "nao_vazio", rotulo: "não está vazio" },
  ],
  tags: [
    { id: "contem", rotulo: "contém" },
    { id: "nao_contem", rotulo: "não contém" },
    { id: "vazio", rotulo: "está sem tags" },
    { id: "nao_vazio", rotulo: "tem alguma tag" },
  ],
  status: [
    { id: "igual", rotulo: "é" },
    { id: "nao_contem", rotulo: "não é" },
  ],
  data: [
    { id: "eh_hoje", rotulo: "é hoje" },
    { id: "antes_de", rotulo: "está antes de" },
    { id: "depois_de", rotulo: "está depois de" },
    { id: "vazio", rotulo: "está sem data" },
    { id: "nao_vazio", rotulo: "tem data definida" },
  ],
  numero: [
    { id: "igual", rotulo: "é igual a" },
    { id: "antes_de", rotulo: "é menor que" },
    { id: "depois_de", rotulo: "é maior que" },
    { id: "vazio", rotulo: "está vazio" },
  ],
  checkbox: [
    { id: "igual", rotulo: "está marcado" },
    { id: "vazio", rotulo: "não está marcado" },
  ],
};

const ICONES_PADRAO: Record<string, React.ReactNode> = {
  titulo: <Type size={13} />,
  nome: <Type size={13} />,
  tags: <TagsIcon size={13} />,
  status: <ListTodo size={13} />,
  prazo: <CalendarIcon size={13} />,
  data: <CalendarIcon size={13} />,
  criado_em: <Clock size={13} />,
  atualizado_em: <Clock size={13} />,
  criado_por: <User size={13} />,
  estimativa: <Hash size={13} />,
  pomodoro: <Hash size={13} />,
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
    return propriedadesDisponiveis.filter((p) => p.rotulo.toLowerCase().includes(b));
  }, [propriedadesDisponiveis, buscaPropriedade]);

  const adicionarFiltro = (prop: DefinicaoPropriedade) => {
    const operadores = OPERADORES_POR_TIPO[prop.tipo] || OPERADORES_POR_TIPO.texto;
    const operadorInicial = operadores[0]?.id || "contem";
    let valorInicial: any = "";

    if (prop.tipo === "status" && prop.opcoes && prop.opcoes.length > 0) {
      valorInicial = prop.opcoes[0];
    } else if (prop.tipo === "data") {
      valorInicial = new Date().toISOString().split("T")[0];
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
      {/* Botão Principal de Filtro (ou "+ Filtrar" se já houver regras) */}
      <Popover open={menuAddAberto} onOpenChange={setMenuAddAberto}>
        <PopoverTrigger asChild>
          {regras.length === 0 ? (
            <Button
              variant="outline"
              size="sm"
              className="h-8 w-8 p-0 rounded-xl text-muted-foreground hover:text-foreground cursor-pointer shadow-2xs"
              title="Filtrar por propriedade"
              aria-label="Filtrar por propriedade"
            >
              <Filter size={14} />
            </Button>
          ) : (
            <Button
              variant="outline"
              size="sm"
              className="h-7 px-2 text-xs rounded-lg text-primary border-primary/30 bg-primary/5 hover:bg-primary/10 gap-1 cursor-pointer font-semibold"
            >
              <Plus size={12} />
              <span>Filtrar</span>
            </Button>
          )}
        </PopoverTrigger>

        <PopoverContent className="w-64 p-2 shadow-2xl border-border rounded-xl" align="start">
          <div className="space-y-2">
            <div className="relative">
              <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                value={buscaPropriedade}
                onChange={(e) => setBuscaPropriedade(e.target.value)}
                placeholder="Procurar propriedade..."
                autoFocus
                className="w-full bg-secondary/40 border border-border/80 rounded-lg pl-8 pr-2.5 py-1 text-xs text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <div className="max-h-52 overflow-y-auto space-y-0.5 pt-1 divide-y divide-border/20">
              {propriedadesFiltradas.length === 0 ? (
                <p className="text-[11px] text-muted-foreground text-center py-4">
                  Nenhuma propriedade encontrada
                </p>
              ) : (
                propriedadesFiltradas.map((p) => {
                  const Icone = p.icone || ICONES_PADRAO[p.id] || <Type size={13} />;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => adicionarFiltro(p)}
                      className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs text-left text-foreground hover:bg-accent transition-colors cursor-pointer"
                    >
                      <span className="text-muted-foreground shrink-0">{Icone}</span>
                      <span className="truncate font-medium flex-1">{p.rotulo}</span>
                      <span className="text-[10px] text-muted-foreground uppercase font-mono">{p.tipo}</span>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </PopoverContent>
      </Popover>

      {/* Linha de Filtros Ativos (Chips) */}
      {regras.map((regra) => {
        const propDef = propriedadesDisponiveis.find((p) => p.id === regra.propriedadeId);
        const operadoresDisponiveis = OPERADORES_POR_TIPO[regra.tipo] || OPERADORES_POR_TIPO.texto;
        const precisaValor = regra.operador !== "vazio" && regra.operador !== "nao_vazio" && regra.operador !== "eh_hoje";
        const Icone = propDef?.icone || ICONES_PADRAO[regra.propriedadeId] || <Type size={12} />;

        return (
          <div
            key={regra.id}
            className="flex items-center gap-1 bg-card border border-border/80 rounded-xl px-2 py-0.5 shadow-2xs animate-in fade-in zoom-in-95 duration-100"
          >
            {/* Nome da Propriedade */}
            <span className="flex items-center gap-1 font-semibold text-[11px] text-foreground shrink-0 select-none">
              <span className="text-primary/70">{Icone}</span>
              <span>{regra.rotulo}</span>
            </span>

            {/* Seletor de Operador */}
            <select
              value={regra.operador}
              onChange={(e) => atualizarRegra(regra.id, { operador: e.target.value as OperadorFiltro })}
              className="bg-secondary/40 border border-border/50 text-[11px] font-medium text-muted-foreground hover:text-foreground rounded-md px-1.5 py-0.5 outline-none cursor-pointer"
            >
              {operadoresDisponiveis.map((op) => (
                <option key={op.id} value={op.id}>
                  {op.rotulo}
                </option>
              ))}
            </select>

            {/* Input de Valor */}
            {precisaValor && (
              regra.tipo === "status" && propDef?.opcoes ? (
                <select
                  value={regra.valor || ""}
                  onChange={(e) => atualizarRegra(regra.id, { valor: e.target.value })}
                  className="bg-secondary/40 border border-border/50 text-[11px] font-medium text-foreground rounded-md px-1.5 py-0.5 outline-none cursor-pointer"
                >
                  {propDef.opcoes.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              ) : regra.tipo === "tags" && propDef?.opcoes ? (
                <select
                  value={regra.valor || ""}
                  onChange={(e) => atualizarRegra(regra.id, { valor: e.target.value })}
                  className="bg-secondary/40 border border-border/50 text-[11px] font-medium text-foreground rounded-md px-1.5 py-0.5 outline-none cursor-pointer"
                >
                  <option value="">Selecione a tag...</option>
                  {propDef.opcoes.map((tag) => (
                    <option key={tag} value={tag}>
                      {tag}
                    </option>
                  ))}
                </select>
              ) : regra.tipo === "data" ? (
                <input
                  type="date"
                  value={regra.valor || ""}
                  onChange={(e) => atualizarRegra(regra.id, { valor: e.target.value })}
                  className="bg-secondary/40 border border-border/50 text-[11px] font-mono text-foreground rounded-md px-1.5 py-0.5 outline-none"
                />
              ) : (
                <input
                  type="text"
                  value={regra.valor || ""}
                  onChange={(e) => atualizarRegra(regra.id, { valor: e.target.value })}
                  placeholder="Valor..."
                  className="bg-secondary/40 border border-border/50 text-[11px] text-foreground rounded-md px-1.5 py-0.5 w-24 sm:w-32 outline-none focus:ring-1 focus:ring-primary"
                />
              )
            )}

            {/* Botão Remover Filtro */}
            <button
              type="button"
              onClick={() => removerRegra(regra.id)}
              className="p-1 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors cursor-pointer"
              title="Remover filtro"
            >
              <X size={11} />
            </button>
          </div>
        );
      })}

      {/* Botão Limpar Tudo */}
      {regras.length > 0 && (
        <button
          type="button"
          onClick={limparTodosFiltros}
          className="text-[11px] text-muted-foreground hover:text-destructive px-1.5 py-1 rounded transition-colors cursor-pointer"
          title="Limpar todos os filtros"
        >
          Limpar
        </button>
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

  const hojeIso = new Date().toISOString().split("T")[0];

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
