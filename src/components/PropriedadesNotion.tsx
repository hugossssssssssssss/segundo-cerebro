import React, { useState, useEffect } from "react";
import { 
  Type, 
  Hash, 
  Calendar as CalendarIcon, 
  CheckSquare, 
  ListTodo, 
  Tags,
  Plus,
  Trash2,
  EyeOff,
  Eye,
  ChevronDown,
  ChevronRight,
  User,
  Clock,
  X
} from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Link as LinkIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { extrairMencoesTexto } from "@/lib/links";

export function abrirItemSpa(caminho: string) {
  if (!caminho) return;
  const pasta = caminho.split("/")[0]?.toLowerCase() || "";
  let rota = "/notas";
  if (pasta === "tarefas") rota = "/tarefas";
  else if (pasta === "referencias") rota = "/referencias";
  else if (pasta === "pdi" || pasta === "metas") rota = "/pdi";
  else if (pasta === "lousas") rota = "/lousas";
  else if (pasta === "notas" || pasta === "reunioes") rota = "/notas";

  window.location.hash = `#${rota}?abrir=${encodeURIComponent(caminho)}`;
  window.dispatchEvent(new HashChangeEvent("hashchange"));
}

export type TipoPropriedade = 
  | "texto" 
  | "numero" 
  | "data" 
  | "checkbox" 
  | "select" 
  | "multiselect" 
  | "relation"
  | "status"
  | "criado_por"
  | "criado_em"
  | "ultima_edicao";

export type OpcaoVisibilidade = "sempre" | "vazia" | "esconder";

const ICONES_TIPO: Record<TipoPropriedade, React.ElementType> = {
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

const NOMES_TIPO: Record<TipoPropriedade, string> = {
  texto: "Texto",
  numero: "Número",
  data: "Data",
  checkbox: "Checkbox",
  select: "Seleção",
  multiselect: "Múltipla Seleção",
  relation: "Relacionamento",
  status: "Status",
  criado_por: "Criado por",
  criado_em: "Criado em",
  ultima_edicao: "Última edição em",
};

const NOMES_PADRAO_TIPO: Record<TipoPropriedade, string> = {
  texto: "Texto",
  numero: "Número",
  data: "Data",
  checkbox: "Checkbox",
  select: "Seleção",
  multiselect: "Tags",
  relation: "Relacionamento",
  status: "Status",
  criado_por: "Criado por",
  criado_em: "Criado em",
  ultima_edicao: "Última edição em",
};

export const CORES_NOTION: Record<string, { bg: string; text: string; border: string; nome: string }> = {
  cinza: { bg: "bg-stone-500/15", text: "text-stone-700 dark:text-stone-300", border: "border-stone-500/20", nome: "Cinza" },
  azul: { bg: "bg-blue-500/15", text: "text-blue-700 dark:text-blue-300", border: "border-blue-500/20", nome: "Azul" },
  verde: { bg: "bg-emerald-500/15", text: "text-emerald-700 dark:text-emerald-300", border: "border-emerald-500/20", nome: "Verde" },
  amarelo: { bg: "bg-amber-500/15", text: "text-amber-700 dark:text-amber-300", border: "border-amber-500/20", nome: "Amarelo" },
  vermelho: { bg: "bg-rose-500/15", text: "text-rose-700 dark:text-rose-300", border: "border-rose-500/20", nome: "Vermelho" },
  roxo: { bg: "bg-purple-500/15", text: "text-purple-700 dark:text-purple-300", border: "border-purple-500/20", nome: "Roxo" },
  rosa: { bg: "bg-pink-500/15", text: "text-pink-700 dark:text-pink-300", border: "border-pink-500/20", nome: "Rosa" },
  laranja: { bg: "bg-orange-500/15", text: "text-orange-700 dark:text-orange-300", border: "border-orange-500/20", nome: "Laranja" },
};

export const STATUS_NOTION: Record<string, { label: string; cor: string }> = {
  "a-fazer": { label: "A fazer", cor: "cinza" },
  "fazendo": { label: "Fazendo", cor: "azul" },
  "feito": { label: "Feito", cor: "verde" },
};

const CONFIG_KEY = "segundo-cerebro-propriedades-config";

export function lerConfigPropriedadesGlobais(): { rotulos: Record<string, string>; coresTags: Record<string, string> } {
  try {
    const raw = localStorage.getItem(CONFIG_KEY);
    if (!raw) return { rotulos: {}, coresTags: {} };
    const parsed = JSON.parse(raw);
    return {
      rotulos: parsed?.rotulos || {},
      coresTags: parsed?.coresTags || {},
    };
  } catch {
    return { rotulos: {}, coresTags: {} };
  }
}

export function salvarConfigPropriedadesGlobais(novosRotulos?: Record<string, string>, novasCores?: Record<string, string>) {
  try {
    const atual = lerConfigPropriedadesGlobais();
    const proximo = {
      rotulos: { ...atual.rotulos, ...novosRotulos },
      coresTags: { ...atual.coresTags, ...novasCores },
    };
    localStorage.setItem(CONFIG_KEY, JSON.stringify(proximo));
  } catch {
    // silencioso
  }
}

export function normalizarStatus(val: string): string {
  if (val === "a_fazer") return "a-fazer";
  if (val === "em_andamento") return "fazendo";
  if (val === "concluida") return "feito";
  if (val === "pausada") return "a-fazer";
  if (val === "cancelada") return "a-fazer";
  return val || "a-fazer";
}

type PropriedadesNotionProps = {
  dados: Record<string, any>;
  onChange: (novosDados: Record<string, any>) => void;
  corpoTexto?: string;
  camposFixos?: {
    [key: string]: {
      icone: React.ReactNode;
      tipo: TipoPropriedade;
      opcoes?: string[]; 
    };
  };
  opcoesRelacionamento?: { titulo: string; caminho: string }[];
};

export function PropriedadesNotion({ 
  dados, 
  onChange, 
  corpoTexto = "",
  camposFixos = {}, 
  opcoesRelacionamento = [] 
}: PropriedadesNotionProps) {
  // Controle estrito de um ÚNICO menu aberto por vez
  const [menuAberto, setMenuAberto] = useState<string | null>(null);

  const [nomeNovoCampo, setNomeNovoCampo] = useState("");
  const [tipoNovoCampo, setTipoNovoCampo] = useState<TipoPropriedade>("texto");

  const [renomearPara, setRenomearPara] = useState("");
  const [copiado, setCopiado] = useState<string | null>(null);
  const [mostrandoOcultas, setMostrandoOcultas] = useState(false);
  const [tagInputs, setTagInputs] = useState<Record<string, string>>({});

  const [globalConfig, setGlobalConfig] = useState(lerConfigPropriedadesGlobais());

  useEffect(() => {
    setGlobalConfig(lerConfigPropriedadesGlobais());
  }, []);

  // Garante o fechamento imediato de qualquer menu de propriedade aberto ao clicar fora em qualquer lugar da tela
  useEffect(() => {
    if (!menuAberto) return;
    const aoClicarFora = (e: PointerEvent) => {
      const el = e.target as HTMLElement | null;
      if (!el) return;
      const dentroDoPopover = el.closest('[data-radix-popper-content-wrapper], [role="dialog"], [role="menu"]');
      if (!dentroDoPopover) {
        setMenuAberto(null);
      }
    };
    window.addEventListener("pointerdown", aoClicarFora, { capture: true });
    return () => window.removeEventListener("pointerdown", aoClicarFora, { capture: true });
  }, [menuAberto]);

  const esquema = (dados.esquema as Record<string, TipoPropriedade>) || {};
  const visibilidadeMap = (dados._visibilidade as Record<string, OpcaoVisibilidade>) || {};
  const coresMap = { ...globalConfig.coresTags, ...((dados._coresTags as Record<string, string>) || {}) };
  const rotulosMap = { ...globalConfig.rotulos, ...((dados._rotulos as Record<string, string>) || {}) };

  const todasAsChaves = Array.from(new Set([...Object.keys(camposFixos), ...Object.keys(dados)]))
    .filter(k => !["titulo", "tipo", "atualizado", "id", "esquema", "_visibilidade", "_coresTags", "_rotulos"].includes(k));
    
  const temRelacionamentos = (Array.isArray(dados.relacionamentos) && dados.relacionamentos.length > 0) ||
    (Array.isArray(dados.relacao) && dados.relacao.length > 0);
  if (temRelacionamentos && !todasAsChaves.includes("relacionamentos")) {
    todasAsChaves.push("relacionamentos");
  }
  if (!todasAsChaves.includes("tags")) todasAsChaves.push("tags");
  if (!todasAsChaves.includes("criado_por")) todasAsChaves.push("criado_por");
  if (!todasAsChaves.includes("criado_em")) todasAsChaves.push("criado_em");
  if (!todasAsChaves.includes("ultima_edicao")) todasAsChaves.push("ultima_edicao");

  function nomeExibido(chave: string): string {
    if (rotulosMap[chave]) return rotulosMap[chave];
    if (chave === "relacionamentos" || chave === "relacao") return "Relacionamentos";
    if (chave === "criado_por" || chave === "criado") return "Criado por";
    if (chave === "criado_em") return "Criado em";
    if (chave === "ultima_edicao" || chave === "atualizado") return "Última edição em";
    if (chave === "status") return "Status";
    if (chave === "prazo") return "Prazo";
    if (chave === "tags") return "Tags";
    return chave;
  }

  function atualizar(chave: string, valor: any) {
    onChange({ ...dados, [chave]: valor });
  }

  function atualizarEsquema(chave: string, tipo: TipoPropriedade) {
    const novoEsquema = { ...esquema, [chave]: tipo };
    onChange({ ...dados, esquema: novoEsquema });
  }

  function atualizarVisibilidade(chave: string, op: OpcaoVisibilidade) {
    const novo = { ...visibilidadeMap, [chave]: op };
    onChange({ ...dados, _visibilidade: novo });
  }

  function atualizarCorTag(tag: string, cor: string) {
    const novasCores = { ...coresMap, [tag]: cor };
    salvarConfigPropriedadesGlobais(undefined, { [tag]: cor });
    setGlobalConfig(lerConfigPropriedadesGlobais());
    onChange({ ...dados, _coresTags: novasCores });
  }

  function remover(chave: string) {
    if (camposFixos[chave]) return;
    const novos: Record<string, any> = { ...dados };
    delete novos[chave];
    if (novos.esquema) delete (novos.esquema as any)[chave];
    if (novos._visibilidade) delete (novos._visibilidade as any)[chave];
    if (novos._rotulos) delete (novos._rotulos as any)[chave];
    onChange(novos);
  }

  function renomear(velha: string, nova: string) {
    if (!nova.trim() || nomeExibido(velha) === nova) return;
    
    const novosRotulos = { ...rotulosMap, [velha]: nova.trim() };
    salvarConfigPropriedadesGlobais({ [velha]: nova.trim() });
    setGlobalConfig(lerConfigPropriedadesGlobais());
    
    const novos: Record<string, any> = { ...dados, _rotulos: novosRotulos };

    if (!camposFixos[velha] && velha !== nova) {
      novos[nova] = novos[velha];
      delete novos[velha];

      if (novos.esquema && (novos.esquema as any)[velha]) {
        (novos.esquema as any)[nova] = (novos.esquema as any)[velha];
        delete (novos.esquema as any)[velha];
      }
    }

    onChange(novos);
    setMenuAberto(null);
  }

  function criarNovaPropriedade(tipo: TipoPropriedade) {
    const nomePadrao = NOMES_PADRAO_TIPO[tipo] || "Propriedade";
    const nomeBase = nomeNovoCampo.trim() || nomePadrao;
    let nomeFinal = nomeBase;
    let idx = 2;
    while (dados[nomeFinal] !== undefined || camposFixos[nomeFinal] !== undefined) {
      nomeFinal = `${nomeBase} ${idx}`;
      idx++;
    }

    const novos: Record<string, any> = { ...dados, [nomeFinal]: "" };
    const novoEsquema = { ...esquema, [nomeFinal]: tipo };
    novos.esquema = novoEsquema;

    onChange(novos);
    setNomeNovoCampo("");
    setMenuAberto(null);
  }

  function ehVazia(chave: string): boolean {
    const v = dados[chave];
    if (v === undefined || v === null || v === "") return true;
    if (Array.isArray(v) && v.length === 0) return true;
    return false;
  }

  // Separa propriedades visíveis das ocultas
  const chavesVisiveis: string[] = [];
  const chavesOcultas: string[] = [];

  todasAsChaves.forEach((chave) => {
    const visDefault = ["criado_por", "criado_em", "ultima_edicao"].includes(chave) ? "esconder" : "sempre";
    const vis = visibilidadeMap[chave] || visDefault;

    if (vis === "esconder") {
      chavesOcultas.push(chave);
    } else if (vis === "vazia" && ehVazia(chave)) {
      chavesOcultas.push(chave);
    } else {
      chavesVisiveis.push(chave);
    }
  });

  function renderizarBadgeTag(nomeTag: string) {
    const chaveCor = coresMap[nomeTag] || "azul";
    const estiloCor = CORES_NOTION[chaveCor] || CORES_NOTION.azul;
    const idMenu = `tag-${nomeTag}`;

    return (
      <Popover open={menuAberto === idMenu} onOpenChange={(open) => setMenuAberto(open ? idMenu : null)}>
        <PopoverTrigger asChild>
          <Badge 
            variant="secondary" 
            className={cn(
              "font-medium text-[11px] px-2 py-0.5 border cursor-pointer transition-all hover:opacity-85 flex items-center gap-1 shadow-2xs",
              estiloCor.bg,
              estiloCor.text,
              estiloCor.border
            )}
          >
            <span>{nomeTag}</span>
          </Badge>
        </PopoverTrigger>
        <PopoverContent className="w-[180px] p-2" align="start" onInteractOutside={() => setMenuAberto(null)}>
          <p className="text-xs font-semibold text-muted-foreground mb-2">Cor da tag "{nomeTag}"</p>
          <div className="grid grid-cols-2 gap-1">
            {Object.entries(CORES_NOTION).map(([k, c]) => (
              <button
                key={k}
                onClick={() => {
                  atualizarCorTag(nomeTag, k);
                  setMenuAberto(null);
                }}
                className={cn(
                  "px-2 py-1 rounded text-xs text-left font-medium transition-colors border flex items-center justify-between",
                  c.bg,
                  c.text,
                  c.border
                )}
              >
                <span>{c.nome}</span>
                {coresMap[nomeTag] === k && <span className="text-[10px]">✓</span>}
              </button>
            ))}
          </div>
        </PopoverContent>
      </Popover>
    );
  }

  function renderizarBadgeStatus(rawVal: string) {
    const val = normalizarStatus(rawVal);
    const info = STATUS_NOTION[val] || { label: "A fazer", cor: "cinza" };
    const estiloCor = CORES_NOTION[info.cor] || CORES_NOTION.cinza;

    return (
      <Popover open={menuAberto === "status-pop"} onOpenChange={(open) => setMenuAberto(open ? "status-pop" : null)}>
        <PopoverTrigger asChild>
          <Badge 
            variant="secondary" 
            className={cn(
              "font-semibold text-xs px-2.5 py-1 border cursor-pointer transition-all hover:scale-105 active:scale-95 flex items-center gap-1.5 shadow-xs",
              estiloCor.bg,
              estiloCor.text,
              estiloCor.border
            )}
          >
            <span>{info.label}</span>
          </Badge>
        </PopoverTrigger>
        <PopoverContent className="w-[180px] p-1.5" align="start" onInteractOutside={() => setMenuAberto(null)}>
          <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-2 py-1">Alterar Status</p>
          <div className="flex flex-col gap-1 mt-1">
            {Object.entries(STATUS_NOTION).map(([stKey, stInfo]) => {
              const est = CORES_NOTION[stInfo.cor] || CORES_NOTION.cinza;
              return (
                <button
                  key={stKey}
                  onClick={() => {
                    atualizar("status", stKey);
                    setMenuAberto(null);
                  }}
                  className={cn(
                    "w-full px-2.5 py-1.5 rounded-md text-xs font-semibold text-left transition-colors border flex items-center justify-between",
                    est.bg,
                    est.text,
                    est.border,
                    val === stKey && "ring-2 ring-primary font-bold"
                  )}
                >
                  <span>{stInfo.label}</span>
                  {val === stKey && <span className="text-xs">✓</span>}
                </button>
              );
            })}
          </div>
        </PopoverContent>
      </Popover>
    );
  }

  function renderizarValor(chave: string) {
    const fixo = camposFixos[chave];
    const valor = dados[chave];
    const tipo = 
      chave === "status" ? "status" :
      chave === "relacionamentos" || chave === "relacao" ? "relation" :
      chave === "criado_por" ? "criado_por" :
      chave === "criado_em" || chave === "criado" ? "criado_em" :
      chave === "ultima_edicao" || chave === "atualizado" ? "ultima_edicao" :
      fixo?.tipo || esquema[chave] || (Array.isArray(valor) ? "multiselect" : "texto");
    const idPopover = `val-${chave}`;

    if (tipo === "status" || chave === "status") {
      return renderizarBadgeStatus(valor || "a-fazer");
    }

    if (tipo === "criado_por" || chave === "criado_por") {
      return (
        <span className="text-xs font-medium text-foreground/80 px-2 py-1 flex items-center gap-1.5">
          <User size={13} className="text-muted-foreground shrink-0" />
          Hugo
        </span>
      );
    }

    if (tipo === "criado_em" || chave === "criado_em" || chave === "criado") {
      let dataObj: Date | undefined;
      const raw = dados.criado_em || dados.criado || valor;
      if (typeof raw === "string" && raw.trim()) {
        const parsed = new Date(raw.includes("T") ? raw : `${raw.trim()}T00:00:00`);
        if (!isNaN(parsed.getTime())) dataObj = parsed;
      }
      if (!dataObj) dataObj = new Date();

      const formatada = format(dataObj, "dd 'de' MMM 'de' yyyy", { locale: ptBR });

      return (
        <span className="text-xs font-medium text-muted-foreground px-2 py-1 flex items-center gap-1.5">
          <Clock size={13} className="shrink-0" />
          {formatada}
        </span>
      );
    }

    if (tipo === "ultima_edicao" || chave === "ultima_edicao" || chave === "atualizado") {
      let dataObj: Date | undefined;
      const raw = dados.atualizado || dados.ultima_edicao || valor;
      if (typeof raw === "string" && raw.trim()) {
        const parsed = new Date(raw);
        if (!isNaN(parsed.getTime())) dataObj = parsed;
      }
      if (!dataObj) dataObj = new Date();

      const formatada = format(dataObj, "dd 'de' MMM 'de' yyyy, HH:mm", { locale: ptBR });

      return (
        <span className="text-xs font-medium text-muted-foreground px-2 py-1 flex items-center gap-1.5">
          <Clock size={13} className="shrink-0" />
          {formatada}
        </span>
      );
    }

    if (tipo === "checkbox") {
      return (
        <input 
          type="checkbox" 
          checked={!!valor}
          onChange={(e) => atualizar(chave, e.target.checked)}
          className="w-4 h-4 rounded border-border text-primary focus:ring-primary cursor-pointer ml-2"
        />
      );
    }

    if (tipo === "numero") {
      return (
        <input
          type="number"
          value={valor ?? ""}
          onChange={(e) =>
            atualizar(
              chave,
              e.target.value === "" ? undefined : Number(e.target.value),
            )
          }
          placeholder="Vazio"
          className="flex-1 bg-transparent border-none outline-none h-7 px-2 text-xs text-foreground/80 placeholder:text-muted-foreground focus:ring-0"
        />
      );
    }

    if (tipo === "select") {
      const opcoes = fixo?.opcoes || (valor ? [valor] : []);
      return (
        <Popover open={menuAberto === idPopover} onOpenChange={(open) => setMenuAberto(open ? idPopover : null)}>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="sm" className="h-7 px-2 text-left justify-start font-normal text-foreground/80 hover:text-foreground">
              {valor ? renderizarBadgeTag(valor) : <span className="text-muted-foreground text-xs">Vazio</span>}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[220px] p-0" align="start" onInteractOutside={() => setMenuAberto(null)}>
            <Command>
              <CommandInput placeholder="Buscar ou criar opção..." onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
                if (e.key === "Enter") {
                  atualizar(chave, e.currentTarget.value.trim());
                  setMenuAberto(null);
                }
              }} />
              <CommandList>
                <CommandEmpty>Digite e aperte Enter para selecionar.</CommandEmpty>
                <CommandGroup>
                  {opcoes.map((opcao: string) => (
                    <CommandItem key={opcao} onSelect={() => {
                      atualizar(chave, opcao);
                      setMenuAberto(null);
                    }}>
                      {renderizarBadgeTag(opcao)}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      );
    }

    if (tipo === "data") {
      let inicioStr = typeof valor === "string" ? valor.split("→")[0]?.trim() : valor?.inicio || "";
      let fimStr = typeof valor === "string" && valor.includes("→") ? valor.split("→")[1]?.trim() : valor?.fim || "";

      const inicioObj = inicioStr ? new Date(`${inicioStr}T00:00:00`) : undefined;
      const fimObj = fimStr ? new Date(`${fimStr}T00:00:00`) : undefined;

      const textoFormatado = inicioObj && !isNaN(inicioObj.getTime())
        ? fimObj && !isNaN(fimObj.getTime())
          ? `${format(inicioObj, "dd 'de' MMM", { locale: ptBR })} → ${format(fimObj, "dd 'de' MMM 'de' yyyy", { locale: ptBR })}`
          : format(inicioObj, "dd 'de' MMM 'de' yyyy", { locale: ptBR })
        : null;

      return (
        <Popover open={menuAberto === idPopover} onOpenChange={(open) => setMenuAberto(open ? idPopover : null)}>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="sm" className="h-7 px-2 text-left justify-start font-normal text-foreground/80 hover:text-foreground">
              {textoFormatado ? (
                <span className="font-medium text-foreground text-xs">{textoFormatado}</span>
              ) : (
                <span className="text-muted-foreground text-xs">Vazio</span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-3" align="start" onInteractOutside={() => setMenuAberto(null)}>
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground">
                <span>Data Inicial</span>
                {fimStr && (
                  <button 
                    onClick={() => atualizar(chave, inicioStr)} 
                    className="text-destructive hover:underline text-[11px]"
                  >
                    Remover término
                  </button>
                )}
              </div>

              <Calendar
                mode="single"
                selected={inicioObj}
                onSelect={(d: Date | undefined) => {
                  const nInicio = d ? format(d, "yyyy-MM-dd") : "";
                  atualizar(chave, fimStr ? `${nInicio} → ${fimStr}` : nInicio);
                }}
                autoFocus
              />

              <div className="border-t border-border pt-2">
                <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground mb-1.5">
                  <span>Data de Término (Intervalo)</span>
                </div>
                <input
                  type="date"
                  value={fimStr}
                  onChange={(e) => {
                    const nFim = e.target.value;
                    atualizar(chave, nFim ? `${inicioStr || format(new Date(), "yyyy-MM-dd")} → ${nFim}` : inicioStr);
                  }}
                  className="w-full text-xs rounded border border-border bg-accent/40 p-1.5 text-foreground outline-none"
                />
              </div>
            </div>
          </PopoverContent>
        </Popover>
      );
    }

    if (tipo === "multiselect" || chave === "paleta" || chave === "tags") {
      const tags = Array.isArray(valor) ? valor : valor ? [valor] : [];
      const ehPaleta = chave === "paleta" || tags.every((t: string) => /^#[0-9a-fA-F]{6}$/.test(t));
      
      if (ehPaleta && tags.length > 0) {
        return (
          <div className="flex items-center gap-1.5 flex-wrap py-1">
            {tags.map((hex: string) => {
              const ehCopiado = copiado === hex;
              return (
                <button
                  key={hex}
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(hex);
                    setCopiado(hex);
                    setTimeout(() => setCopiado(null), 1500);
                  }}
                  className="group flex items-center gap-1 px-2.5 py-1 rounded-full border text-xs font-mono transition-all active:scale-95 hover:shadow-sm"
                  style={{ backgroundColor: hex, color: parseInt(hex.replace('#',''), 16) > 0xffffff/2 ? '#000' : '#fff' }}
                  title={`Clique para copiar ${hex}`}
                >
                  <span>{ehCopiado ? "Copiado!" : hex}</span>
                </button>
              );
            })}
          </div>
        );
      }

      function processarEInserirTag(inp: string) {
        const pedacos = inp.split(/[,;]/).map(s => s.trim().replace(/^@+/, "")).filter(Boolean);
        if (pedacos.length === 0) return;
        
        const novastags = Array.from(new Set([...tags, ...pedacos]));
        atualizar(chave, novastags);
        setTagInputs({ ...tagInputs, [chave]: "" });
      }

      const inputVal = tagInputs[chave] || "";

      return (
        <div className="flex items-center gap-1.5 flex-wrap py-1 min-h-7">
          {tags.map((t: string) => (
            <div key={t} className="group relative flex items-center">
              {renderizarBadgeTag(t)}
              <button
                onClick={() => atualizar(chave, tags.filter((x: string) => x !== t))}
                className="ml-0.5 text-muted-foreground hover:text-destructive opacity-50 hover:opacity-100 transition-all"
                title="Remover tag"
              >
                <X size={11} />
              </button>
            </div>
          ))}

          <input
            type="text"
            placeholder={tags.length === 0 ? "Digitar tag (Enter ou vírgula)..." : "+ tag"}
            value={inputVal}
            onChange={(e) => {
              const val = e.target.value;
              if (val.includes(",") || val.includes(";")) {
                processarEInserirTag(val);
              } else {
                setTagInputs({ ...tagInputs, [chave]: val });
              }
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === "Tab") {
                e.preventDefault();
                processarEInserirTag(inputVal);
              }
            }}
            onBlur={() => {
              if (inputVal.trim()) processarEInserirTag(inputVal);
            }}
            className="bg-transparent border-none outline-none text-xs text-foreground placeholder:text-muted-foreground/60 px-1 py-0.5 min-w-[120px] focus:ring-0"
          />
        </div>
      );
    }

    if (tipo === "relation") {
      const relacoes = Array.isArray(valor) ? valor : valor ? [valor] : [];
      
      const textoMencoes = extrairMencoesTexto(corpoTexto || "", opcoesRelacionamento.map(o => o.titulo));
      const unicosMencoes = Array.from(new Set([...relacoes, ...textoMencoes.map(m => m.trim())]));

      return (
        <Popover open={menuAberto === idPopover} onOpenChange={(open) => setMenuAberto(open ? idPopover : null)}>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="sm" className="h-auto min-h-7 px-2 py-1 text-left justify-start font-normal flex-wrap gap-1 hover:bg-transparent">
              {unicosMencoes.length > 0 ? (
                unicosMencoes.map((r: string) => {
                  const nomePuro = r.replace(/^[\[@]+/, "").replace(/\]\]$/, "").trim();
                  const normNome = nomePuro.toLowerCase();
                  const itemAlvo = opcoesRelacionamento.find((o) => {
                    const normTitulo = o.titulo.toLowerCase().trim();
                    const normCaminho = o.caminho.toLowerCase().trim();
                    const normBase = o.caminho.split("/").pop()?.replace(/\.(md|json|excalidraw)$/i, "").toLowerCase().trim() || "";
                    return normTitulo === normNome || normCaminho === normNome || normBase === normNome || normTitulo.includes(normNome) || normNome.includes(normTitulo);
                  });
                  const ehMapaMental = itemAlvo?.caminho.startsWith("lousas/") || r.toLowerCase().includes("lousa") || r.toLowerCase().includes("mapa");
                  return (
                    <Badge 
                      variant="secondary" 
                      key={r} 
                      onClick={(e) => {
                        e.stopPropagation();
                        const alvo = itemAlvo || opcoesRelacionamento.find((o) => o.titulo.toLowerCase().includes(normNome));
                        if (alvo) {
                          abrirItemSpa(alvo.caminho);
                        } else if (r.includes("/")) {
                          abrirItemSpa(r);
                        }
                      }}
                      className={cn(
                        "font-medium text-[11px] px-2 py-0.5 flex items-center gap-1.5 hover:underline cursor-pointer border transition-all shadow-xs",
                        ehMapaMental
                          ? "bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border-indigo-500/30 hover:bg-indigo-500/25"
                          : "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20"
                      )}
                      title={itemAlvo ? `Abrir "${itemAlvo.titulo}"` : `Abrir "${nomePuro}"`}
                    >
                      {ehMapaMental ? (
                        <>
                          <span className="text-xs">🗺️</span>
                          <span className="font-bold">Mapa Mental:</span> @{nomePuro}
                        </>
                      ) : (
                        <>
                          <LinkIcon size={10} className="shrink-0" />
                          @{nomePuro}
                        </>
                      )}
                    </Badge>
                  );
                })
              ) : (
                <span className="text-muted-foreground text-xs hover:bg-accent px-1.5 py-0.5 rounded transition-colors">Vazio</span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[300px] p-0" align="start" onInteractOutside={() => setMenuAberto(null)}>
            <Command>
              <CommandInput placeholder="Buscar página para ligar..." />
              <CommandList>
                <CommandEmpty>Página não encontrada.</CommandEmpty>
                <CommandGroup heading="Páginas (clique para ligar/desligar)">
                  {opcoesRelacionamento.map((opcao) => {
                    const tagFormatada = `@${opcao.titulo}`;
                    const selecionado = unicosMencoes.includes(tagFormatada) || unicosMencoes.includes(`[[${opcao.titulo}]]`);
                    return (
                      <CommandItem 
                        key={opcao.caminho} 
                        onSelect={() => {
                          if (selecionado) {
                            atualizar(chave, relacoes.filter((x: string) => x !== tagFormatada && x !== `[[${opcao.titulo}]]`));
                          } else {
                            atualizar(chave, [...relacoes, tagFormatada]);
                          }
                          setMenuAberto(null);
                        }}
                      >
                        <div className="flex items-center gap-2">
                          <CheckSquare className={`h-4 w-4 shrink-0 ${selecionado ? "opacity-100 text-primary" : "opacity-0"}`} />
                          <span className="truncate text-blue-600 font-medium">@{opcao.titulo}</span>
                        </div>
                      </CommandItem>
                    );
                  })}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      );
    }

    // Texto livre
    return (
      <input
        type="text"
        value={valor || ""}
        onChange={(e) => atualizar(chave, e.target.value)}
        placeholder="Vazio"
        className="flex-1 bg-transparent border-none outline-none h-7 px-2 text-xs text-foreground/80 placeholder:text-muted-foreground focus:ring-0"
      />
    );
  }

  function renderizarMenuPropriedade(chave: string, fixo?: any) {
    const tipoAtual = 
      chave === "status" ? "status" :
      chave === "criado_por" ? "criado_por" :
      chave === "criado_em" || chave === "criado" ? "criado_em" :
      chave === "ultima_edicao" || chave === "atualizado" ? "ultima_edicao" :
      fixo?.tipo || esquema[chave] || "texto";
    const IconeAtual = fixo?.icone ? () => <>{fixo.icone}</> : ICONES_TIPO[tipoAtual as TipoPropriedade] || Type;
    const visDefault = ["criado_por", "criado_em", "criado", "ultima_edicao", "atualizado"].includes(chave) ? "esconder" : "sempre";
    const visAtual = visibilidadeMap[chave] || visDefault;
    const rotuloAtual = nomeExibido(chave);
    const idMenu = `prop-${chave}`;

    return (
      <Popover open={menuAberto === idMenu} onOpenChange={(open) => {
        if (open) {
          setMenuAberto(idMenu);
          setRenomearPara(rotuloAtual);
        } else {
          setMenuAberto(null);
        }
      }}>
        <PopoverTrigger asChild>
          <button className="w-36 flex items-center gap-2 text-muted-foreground px-2 py-1 -ml-2 rounded hover:bg-accent/60 transition-colors text-left group/prop">
            <IconeAtual className="h-4 w-4 opacity-60 shrink-0" />
            <span className="truncate flex-1 font-medium text-xs">{rotuloAtual}</span>
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-[260px] p-3 flex flex-col gap-2 shadow-xl border-border" align="start" onInteractOutside={() => setMenuAberto(null)}>
          <div>
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1">Nome da Propriedade</span>
            <input 
              value={renomearPara}
              onChange={(e) => setRenomearPara(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") renomear(chave, renomearPara);
              }}
              onBlur={() => renomear(chave, renomearPara)}
              className="bg-accent/50 border border-border outline-none text-xs px-2.5 py-1.5 rounded-md focus:ring-2 focus:ring-primary w-full"
            />
          </div>

          {/* Visibilidade da propriedade */}
          <div className="border-t border-border pt-2 mt-1">
            <span className="text-[11px] font-semibold text-muted-foreground px-1 uppercase tracking-wider block mb-1">Visibilidade</span>
            <div className="flex flex-col gap-0.5">
              {[
                { id: "sempre", label: "Sempre mostrar", icon: Eye },
                { id: "vazia", label: "Esconder se vazia", icon: EyeOff },
                { id: "esconder", label: "Sempre esconder", icon: EyeOff },
              ].map((v) => (
                <Button
                  key={v.id}
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    atualizarVisibilidade(chave, v.id as OpcaoVisibilidade);
                    setMenuAberto(null);
                  }}
                  className={cn("justify-start text-xs font-normal h-7 px-2", visAtual === v.id && "bg-accent font-semibold")}
                >
                  <v.icon className="h-3.5 w-3.5 mr-2 opacity-60" />
                  {v.label}
                </Button>
              ))}
            </div>
          </div>

          {!fixo && (
            <div className="border-t border-border pt-2 mt-1">
              <span className="text-[11px] font-semibold text-muted-foreground px-1 uppercase tracking-wider block mb-1">Tipo de Propriedade</span>
              <div className="flex flex-col gap-0.5 max-h-48 overflow-y-auto pr-1">
                {(Object.entries(ICONES_TIPO) as [TipoPropriedade, React.ElementType][]).map(([t, Icon]) => (
                  <Button 
                    key={t}
                    variant="ghost" 
                    size="sm" 
                    onClick={() => {
                      atualizarEsquema(chave, t);
                      setMenuAberto(null);
                    }}
                    className={cn("justify-start font-normal text-xs h-7 px-2", tipoAtual === t && "bg-accent font-semibold")}
                  >
                    <Icon className="h-3.5 w-3.5 mr-2 opacity-60" />
                    {NOMES_TIPO[t]}
                  </Button>
                ))}
              </div>
            </div>
          )}
          
          {!fixo && (
            <div className="border-t border-border pt-2 mt-1">
              <Button variant="ghost" size="sm" onClick={() => remover(chave)} className="w-full justify-start text-xs text-destructive hover:text-destructive hover:bg-destructive/10 h-7 px-2">
                <Trash2 className="h-3.5 w-3.5 mr-2" />
                Excluir propriedade
              </Button>
            </div>
          )}
        </PopoverContent>
      </Popover>
    );
  }

  return (
    <div className="flex flex-col gap-1.5 w-full">
      {/* Lista de Propriedades Visíveis */}
      {chavesVisiveis.map((chave) => {
        const fixo = camposFixos[chave];
        return (
          <div key={chave} className="flex min-h-8 items-center gap-4 text-xs group">
            {renderizarMenuPropriedade(chave, fixo)}
            <div className="flex-1 flex items-center min-h-8">
              {renderizarValor(chave)}
            </div>
          </div>
        );
      })}

      {/* Botão de Adicionar Nova Propriedade perfeitamente alinhado acima das ocultas */}
      <div className="flex items-center gap-4 text-xs mt-1 pt-1 border-t border-border/30">
        <div className="w-36">
          <Popover open={menuAberto === "novo_campo"} onOpenChange={(open) => setMenuAberto(open ? "novo_campo" : null)}>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 -ml-2 text-muted-foreground hover:text-foreground font-normal text-xs flex items-center gap-1.5 rounded-md hover:bg-accent/60"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Adicionar propriedade</span>
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[280px] p-3 shadow-2xl border-border space-y-3" align="start" onInteractOutside={() => setMenuAberto(null)}>
              <div>
                <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">
                  Nome da Propriedade (Opcional)
                </span>
                <input
                  type="text"
                  autoFocus
                  placeholder={`Padrão: "${NOMES_PADRAO_TIPO[tipoNovoCampo]}"...`}
                  value={nomeNovoCampo}
                  onChange={(e) => setNomeNovoCampo(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      criarNovaPropriedade(tipoNovoCampo);
                    }
                  }}
                  className="w-full bg-accent/40 border border-border text-xs px-2.5 py-1.5 rounded-md outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div className="border-t border-border pt-2">
                <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">
                  Selecione o Tipo
                </span>
                <div className="flex flex-col gap-0.5 max-h-56 overflow-y-auto pr-1">
                  {(Object.entries(ICONES_TIPO) as [TipoPropriedade, React.ElementType][]).map(([t, Icon]) => (
                    <button
                      key={t}
                      onClick={() => {
                        setTipoNovoCampo(t);
                        criarNovaPropriedade(t);
                      }}
                      className={cn(
                        "w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-xs text-left transition-colors hover:bg-accent",
                        tipoNovoCampo === t && "bg-accent font-semibold"
                      )}
                    >
                      <Icon className="h-3.5 w-3.5 opacity-60 shrink-0" />
                      <span>{NOMES_TIPO[t]}</span>
                    </button>
                  ))}
                </div>
              </div>
            </PopoverContent>
          </Popover>
        </div>
        <div className="flex-1"></div>
      </div>

      {/* Gaveta de Propriedades Ocultas na parte inferior */}
      {chavesOcultas.length > 0 && (
        <div className="mt-1 border-t border-border/40 pt-1">
          <button
            onClick={() => setMostrandoOcultas(!mostrandoOcultas)}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors px-1 py-0.5 font-medium"
          >
            {mostrandoOcultas ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
            <span>{chavesOcultas.length} propriedade{chavesOcultas.length > 1 ? "s" : ""} oculta{chavesOcultas.length > 1 ? "s" : ""}</span>
          </button>

          {mostrandoOcultas && (
            <div className="flex flex-col gap-1.5 mt-1.5 pl-2 border-l border-border/60">
              {chavesOcultas.map((chave) => {
                const fixo = camposFixos[chave];
                return (
                  <div key={chave} className="flex min-h-8 items-center gap-4 text-xs group opacity-75 hover:opacity-100">
                    {renderizarMenuPropriedade(chave, fixo)}
                    <div className="flex-1 flex items-center min-h-8">
                      {renderizarValor(chave)}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
