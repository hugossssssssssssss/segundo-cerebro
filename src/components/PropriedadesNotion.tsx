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
  Clock
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

export type TipoPropriedade = 
  | "texto" 
  | "numero" 
  | "data" 
  | "checkbox" 
  | "select" 
  | "multiselect" 
  | "relation"
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
  a_fazer: { label: "A fazer", cor: "cinza" },
  em_andamento: { label: "Em andamento", cor: "azul" },
  pausada: { label: "Pausada", cor: "amarelo" },
  concluida: { label: "Concluída", cor: "verde" },
  cancelada: { label: "Cancelada", cor: "vermelho" },
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
  const [novoCampoPopover, setNovoCampoPopover] = useState(false);
  const [nomeNovoCampo, setNomeNovoCampo] = useState("");
  const [tipoNovoCampo, setTipoNovoCampo] = useState<TipoPropriedade>("texto");

  const [editandoChave, setEditandoChave] = useState<string | null>(null);
  const [renomearPara, setRenomearPara] = useState("");
  const [copiado, setCopiado] = useState<string | null>(null);
  const [mostrandoOcultas, setMostrandoOcultas] = useState(false);
  const [tagInput, setTagInput] = useState("");

  const [globalConfig, setGlobalConfig] = useState(lerConfigPropriedadesGlobais());

  useEffect(() => {
    setGlobalConfig(lerConfigPropriedadesGlobais());
  }, []);

  const esquema = (dados.esquema as Record<string, TipoPropriedade>) || {};
  const visibilidadeMap = (dados._visibilidade as Record<string, OpcaoVisibilidade>) || {};
  const coresMap = { ...globalConfig.coresTags, ...((dados._coresTags as Record<string, string>) || {}) };
  const rotulosMap = { ...globalConfig.rotulos, ...((dados._rotulos as Record<string, string>) || {}) };

  const todasAsChaves = Array.from(new Set([...Object.keys(camposFixos), ...Object.keys(dados)]))
    .filter(k => !["titulo", "tipo", "atualizado", "id", "esquema", "tags", "_visibilidade", "_coresTags", "_rotulos"].includes(k));
    
  todasAsChaves.push("tags");

  // Garante propriedades nativas de sistema
  if (!todasAsChaves.includes("criado_por")) todasAsChaves.push("criado_por");
  if (!todasAsChaves.includes("criado_em")) todasAsChaves.push("criado_em");
  if (!todasAsChaves.includes("ultima_edicao")) todasAsChaves.push("ultima_edicao");

  function nomeExibido(chave: string): string {
    return rotulosMap[chave] || chave;
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
    setEditandoChave(null);
  }

  function criarNovaPropriedade(tipo: TipoPropriedade) {
    const nomeBase = nomeNovoCampo.trim() || `Propriedade ${todasAsChaves.length + 1}`;
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
    setNovoCampoPopover(false);
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
    // Propriedades nativas de sistema começam ocultas por padrão
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

    return (
      <Popover key={nomeTag}>
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
        <PopoverContent className="w-[180px] p-2" align="start">
          <p className="text-xs font-semibold text-muted-foreground mb-2">Cor da tag "{nomeTag}"</p>
          <div className="grid grid-cols-2 gap-1">
            {Object.entries(CORES_NOTION).map(([k, c]) => (
              <button
                key={k}
                onClick={() => atualizarCorTag(nomeTag, k)}
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

  function renderizarBadgeStatus(val: string) {
    const info = STATUS_NOTION[val] || { label: val || "A fazer", cor: "cinza" };
    const estiloCor = CORES_NOTION[info.cor] || CORES_NOTION.cinza;

    return (
      <Popover>
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
        <PopoverContent className="w-[200px] p-1.5" align="start">
          <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-2 py-1">Alterar Status</p>
          <div className="flex flex-col gap-1 mt-1">
            {Object.entries(STATUS_NOTION).map(([stKey, stInfo]) => {
              const est = CORES_NOTION[stInfo.cor] || CORES_NOTION.cinza;
              return (
                <button
                  key={stKey}
                  onClick={() => atualizar("status", stKey)}
                  className={cn(
                    "w-full px-2.5 py-1.5 rounded-md text-xs font-semibold text-left transition-colors border flex items-center justify-between",
                    est.bg,
                    est.text,
                    est.border,
                    val === stKey && "ring-2 ring-primary"
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
    const tipo = fixo?.tipo || esquema[chave] || (Array.isArray(valor) ? "multiselect" : "texto");

    if (chave === "status") {
      return renderizarBadgeStatus(valor || "a_fazer");
    }

    if (tipo === "criado_por") {
      return (
        <span className="text-sm font-medium text-foreground/80 px-2 py-1 flex items-center gap-1.5">
          <User size={13} className="text-muted-foreground" />
          Hugo
        </span>
      );
    }

    if (tipo === "criado_em") {
      const dataCriacao = typeof valor === "string" && valor.trim() ? valor : "Hoje";
      return (
        <span className="text-sm font-medium text-muted-foreground px-2 py-1 flex items-center gap-1.5">
          <Clock size={13} />
          {dataCriacao}
        </span>
      );
    }

    if (tipo === "ultima_edicao") {
      const ultima = typeof dados.atualizado === "string" ? dados.atualizado : "Recente";
      return (
        <span className="text-sm font-medium text-muted-foreground px-2 py-1 flex items-center gap-1.5">
          <Clock size={13} />
          {ultima}
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
          className="flex-1 bg-transparent border-none outline-none h-7 px-2 text-sm text-foreground/80 placeholder:text-muted-foreground focus:ring-0"
        />
      );
    }

    if (tipo === "select") {
      const opcoes = fixo?.opcoes || (valor ? [valor] : []);
      return (
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="sm" className="h-7 px-2 text-left justify-start font-normal text-foreground/80 hover:text-foreground">
              {valor ? renderizarBadgeTag(valor) : <span className="text-muted-foreground">Vazio</span>}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[220px] p-0" align="start">
            <Command>
              <CommandInput placeholder="Buscar ou criar opção..." onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
                if (e.key === "Enter") {
                  atualizar(chave, e.currentTarget.value.trim());
                }
              }} />
              <CommandList>
                <CommandEmpty>Digite e aperte Enter para selecionar.</CommandEmpty>
                <CommandGroup>
                  {opcoes.map((opcao: string) => (
                    <CommandItem key={opcao} onSelect={() => atualizar(chave, opcao)}>
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
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="sm" className="h-7 px-2 text-left justify-start font-normal text-foreground/80 hover:text-foreground">
              {textoFormatado ? (
                <span className="font-medium text-foreground">{textoFormatado}</span>
              ) : (
                <span className="text-muted-foreground">Vazio</span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-3" align="start">
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

      function adicionarTagLimpa(t: string) {
        const limpa = t.trim().replace(/^,+|,+$/g, "");
        if (limpa && !tags.includes(limpa)) {
          atualizar(chave, [...tags, limpa]);
        }
        setTagInput("");
      }

      return (
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="sm" className="h-auto min-h-7 px-2 py-1 text-left justify-start font-normal flex-wrap gap-1 hover:bg-transparent">
              {tags.length > 0 ? (
                tags.map((t: string) => renderizarBadgeTag(t))
              ) : (
                <span className="text-muted-foreground hover:bg-accent px-1.5 py-0.5 rounded transition-colors">Vazio</span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[260px] p-2 space-y-2" align="start">
            <div className="flex items-center gap-1 bg-accent/40 border border-border rounded-md px-2 py-1">
              <input
                type="text"
                autoFocus
                placeholder="Digite a tag e aperte Enter..."
                value={tagInput}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val.includes(",") || val.includes(";")) {
                    adicionarTagLimpa(val);
                  } else {
                    setTagInput(val);
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    adicionarTagLimpa(tagInput);
                  }
                }}
                className="bg-transparent border-none outline-none text-xs text-foreground placeholder:text-muted-foreground w-full"
              />
            </div>

            {tags.length > 0 && (
              <div className="space-y-1">
                <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block">
                  Tags atuais (clique para remover)
                </span>
                <div className="flex flex-wrap gap-1">
                  {tags.map((t: string) => (
                    <button 
                      key={t}
                      onClick={() => atualizar(chave, tags.filter((x: string) => x !== t))}
                      className="group"
                      title="Clique para apagar"
                    >
                      {renderizarBadgeTag(t)}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </PopoverContent>
        </Popover>
      );
    }

    if (tipo === "relation") {
      const relacoes = Array.isArray(valor) ? valor : valor ? [valor] : [];
      
      // Extrai também automáticos do corpo do texto
      const textoMencoes = (corpoTexto || "").match(/@[a-zA-Z0-9_\-áàâãéèêíïóôõöúçñÁÀÂÃÉÈÊÍÏÓÔÕÖÚÇÑ\s]{2,60}/g) || [];
      const unicosMencoes = Array.from(new Set([...relacoes, ...textoMencoes.map(m => m.trim())]));

      return (
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="sm" className="h-auto min-h-7 px-2 py-1 text-left justify-start font-normal flex-wrap gap-1 hover:bg-transparent">
              {unicosMencoes.length > 0 ? (
                unicosMencoes.map((r: string) => {
                  const nomePuro = r.replace(/^[\[@]+/, "").replace(/\]\]$/, "");
                  return (
                    <Badge variant="secondary" key={r} className="font-medium text-[11px] px-2 py-0.5 flex items-center gap-1 bg-blue-500/10 text-blue-600 dark:text-blue-400 hover:underline">
                      <LinkIcon size={10} className="shrink-0" />
                      @{nomePuro}
                    </Badge>
                  );
                })
              ) : (
                <span className="text-muted-foreground hover:bg-accent px-1.5 py-0.5 rounded transition-colors">Vazio</span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[300px] p-0" align="start">
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
        className="flex-1 bg-transparent border-none outline-none h-7 px-2 text-sm text-foreground/80 placeholder:text-muted-foreground focus:ring-0"
      />
    );
  }

  function renderizarMenuPropriedade(chave: string, fixo?: any) {
    const tipoAtual = fixo?.tipo || esquema[chave] || "texto";
    const IconeAtual = fixo?.icone ? () => <>{fixo.icone}</> : ICONES_TIPO[tipoAtual as TipoPropriedade] || Type;
    const visDefault = ["criado_por", "criado_em", "ultima_edicao"].includes(chave) ? "esconder" : "sempre";
    const visAtual = visibilidadeMap[chave] || visDefault;
    const rotuloAtual = nomeExibido(chave);

    return (
      <Popover open={editandoChave === chave} onOpenChange={(open) => {
        if (open) {
          setEditandoChave(chave);
          setRenomearPara(rotuloAtual);
        } else {
          setEditandoChave(null);
        }
      }}>
        <PopoverTrigger asChild>
          <button className="w-36 flex items-center gap-2 text-muted-foreground px-2 py-1 -ml-2 rounded hover:bg-accent/60 transition-colors text-left group/prop">
            <IconeAtual className="h-4 w-4 opacity-60 shrink-0" />
            <span className="truncate flex-1 font-medium text-xs">{rotuloAtual}</span>
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-[260px] p-3 flex flex-col gap-2 shadow-xl border-border" align="start">
          <div>
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1">Nome da Propriedade</span>
            <input 
              value={renomearPara}
              onChange={(e) => setRenomearPara(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") renomear(chave, renomearPara);
              }}
              onBlur={() => renomear(chave, renomearPara)}
              className="bg-accent/50 border border-border outline-none text-sm px-2.5 py-1.5 rounded-md focus:ring-2 focus:ring-primary w-full"
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
                  onClick={() => atualizarVisibilidade(chave, v.id as OpcaoVisibilidade)}
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
                    onClick={() => atualizarEsquema(chave, t)}
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
          <div key={chave} className="flex min-h-8 items-center gap-4 text-sm group">
            {renderizarMenuPropriedade(chave, fixo)}
            <div className="flex-1 flex items-center min-h-8">
              {renderizarValor(chave)}
            </div>
          </div>
        );
      })}

      {/* Gaveta de Propriedades Ocultas */}
      {chavesOcultas.length > 0 && (
        <div className="mt-1 border-t border-border/50 pt-2">
          <button
            onClick={() => setMostrandoOcultas(!mostrandoOcultas)}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors px-1 py-0.5 font-medium"
          >
            {mostrandoOcultas ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            <span>{chavesOcultas.length} propriedade{chavesOcultas.length > 1 ? "s" : ""} oculta{chavesOcultas.length > 1 ? "s" : ""}</span>
          </button>

          {mostrandoOcultas && (
            <div className="flex flex-col gap-1.5 mt-2 pl-2 border-l border-border/60">
              {chavesOcultas.map((chave) => {
                const fixo = camposFixos[chave];
                return (
                  <div key={chave} className="flex min-h-8 items-center gap-4 text-sm group opacity-75 hover:opacity-100">
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

      {/* Botão de Adicionar Nova Propriedade estilo Notion Popover Menu */}
      <div className="flex items-center gap-4 text-sm mt-1">
        <div className="w-36"></div>
        <div className="flex-1">
          <Popover open={novoCampoPopover} onOpenChange={setNovoCampoPopover}>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2.5 -ml-2 text-muted-foreground hover:text-foreground font-medium text-xs flex items-center gap-1.5 rounded-lg border border-dashed border-border/80 hover:border-border hover:bg-accent/40"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Adicionar propriedade</span>
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[280px] p-3 shadow-2xl border-border space-y-3" align="start">
              <div>
                <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">
                  Nova Propriedade
                </span>
                <input
                  type="text"
                  autoFocus
                  placeholder="Nome (ex: Cliente, Prioridade)..."
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
      </div>
    </div>
  );
}
