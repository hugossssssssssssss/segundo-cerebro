import React, { useState } from "react";
import { 
  Type, 
  Hash, 
  Calendar as CalendarIcon, 
  CheckSquare, 
  ListTodo, 
  Tags,
  Plus,
  Trash2
} from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

import { Link as LinkIcon } from "lucide-react";

export type TipoPropriedade = "texto" | "numero" | "data" | "checkbox" | "select" | "multiselect" | "relation";

const ICONES_TIPO: Record<TipoPropriedade, React.ElementType> = {
  texto: Type,
  numero: Hash,
  data: CalendarIcon,
  checkbox: CheckSquare,
  select: ListTodo,
  multiselect: Tags,
  relation: LinkIcon
};

const NOMES_TIPO: Record<TipoPropriedade, string> = {
  texto: "Texto",
  numero: "Número",
  data: "Data",
  checkbox: "Checkbox",
  select: "Seleção",
  multiselect: "Múltipla Seleção",
  relation: "Relacionamento"
};

type PropriedadesNotionProps = {
  dados: Record<string, any>;
  onChange: (novosDados: Record<string, any>) => void;
  camposFixos?: {
    [key: string]: {
      icone: React.ReactNode;
      tipo: TipoPropriedade;
      opcoes?: string[]; 
    };
  };
  opcoesRelacionamento?: { titulo: string; caminho: string }[];
};

export function PropriedadesNotion({ dados, onChange, camposFixos = {}, opcoesRelacionamento = [] }: PropriedadesNotionProps) {
  const [novoCampoAberto, setNovoCampoAberto] = useState(false);
  const [nomeNovoCampo, setNomeNovoCampo] = useState("");
  const [tipoNovoCampo, setTipoNovoCampo] = useState<TipoPropriedade>("texto");

  const [editandoChave, setEditandoChave] = useState<string | null>(null);
  const [renomearPara, setRenomearPara] = useState("");
  const [copiado, setCopiado] = useState<string | null>(null);

  const esquema = (dados.esquema as Record<string, TipoPropriedade>) || {};

  const todasAsChaves = Array.from(new Set([...Object.keys(camposFixos), ...Object.keys(dados)]))
    .filter(k => !["titulo", "tipo", "atualizado", "id", "esquema", "tags"].includes(k));
    
  // "tags" SEMPRE aparece. Antes só era mostrada quando o item já tinha tags,
  // então uma nota nova não tinha por onde ganhar a primeira — e não existe
  // outro caminho na interface para marcar uma nota.
  todasAsChaves.push("tags");

  function atualizar(chave: string, valor: any) {
    onChange({ ...dados, [chave]: valor });
  }

  function atualizarEsquema(chave: string, tipo: TipoPropriedade) {
    const novoEsquema = { ...esquema, [chave]: tipo };
    onChange({ ...dados, esquema: novoEsquema });
  }

  function remover(chave: string) {
    if (camposFixos[chave]) return;
    const novos = { ...dados };
    delete novos[chave];
    if (novos.esquema) {
      delete (novos.esquema as any)[chave];
    }
    onChange(novos);
  }

  function renomear(velha: string, nova: string) {
    if (!nova.trim() || velha === nova || camposFixos[velha]) return;
    const novos = { ...dados };
    novos[nova] = novos[velha];
    delete novos[velha];

    if (novos.esquema && (novos.esquema as any)[velha]) {
      (novos.esquema as any)[nova] = (novos.esquema as any)[velha];
      delete (novos.esquema as any)[velha];
    }
    onChange(novos);
    setEditandoChave(null);
  }

  function renderizarValor(chave: string) {
    const fixo = camposFixos[chave];
    const valor = dados[chave];
    const tipo = fixo?.tipo || esquema[chave] || (Array.isArray(valor) ? "multiselect" : "texto");

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
              {valor ? <Badge variant="secondary" className="font-normal">{valor}</Badge> : <span className="text-muted-foreground">Vazio</span>}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[200px] p-0" align="start">
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
                      {opcao}
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
      const dataObj =
        typeof valor === "string" && valor.trim()
          ? new Date(`${valor.trim()}T00:00:00`)
          : valor instanceof Date
            ? valor
            : undefined;
      return (
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="sm" className="h-7 px-2 text-left justify-start font-normal text-foreground/80 hover:text-foreground">
              {dataObj && !isNaN(dataObj.getTime()) ? (
                format(dataObj, "dd 'de' MMM 'de' yyyy", { locale: ptBR })
              ) : (
                <span className="text-muted-foreground">Vazio</span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={dataObj}
              onSelect={(d: Date | undefined) => atualizar(chave, d ? format(d, "yyyy-MM-dd") : undefined)}
              autoFocus
            />
          </PopoverContent>
        </Popover>
      );
    }

    if (tipo === "multiselect" || chave === "paleta") {
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

      return (
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="sm" className="h-auto min-h-7 px-2 py-1 text-left justify-start font-normal flex-wrap gap-1 hover:bg-transparent">
              {tags.length > 0 ? (
                tags.map((t: string) => (
                  <Badge variant="secondary" key={t} className="font-normal text-[11px] px-1.5 py-0">
                    {t}
                  </Badge>
                ))
              ) : (
                <span className="text-muted-foreground hover:bg-accent px-1.5 py-0.5 rounded transition-colors">Vazio</span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[250px] p-0" align="start">
            <Command>
              <CommandInput placeholder="Digite e pressione Enter..." onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  const val = e.currentTarget.value.trim();
                  if (val && !tags.includes(val)) {
                    atualizar(chave, [...tags, val]);
                    e.currentTarget.value = "";
                  }
                }
              }} />
              <CommandList>
                <CommandEmpty>Digite para criar.</CommandEmpty>
                <CommandGroup heading="Selecionados (clique para remover)">
                  {tags.map((t: string) => (
                    <CommandItem key={t} onSelect={() => atualizar(chave, tags.filter((x: string) => x !== t))}>
                      {t}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      );
    }

    if (tipo === "relation") {
      const relacoes = Array.isArray(valor) ? valor : valor ? [valor] : [];
      return (
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="sm" className="h-auto min-h-7 px-2 py-1 text-left justify-start font-normal flex-wrap gap-1 hover:bg-transparent">
              {relacoes.length > 0 ? (
                relacoes.map((r: string) => {
                  const nomePuro = r.replace(/^[\[@]+/, "").replace(/\]\]$/, "");
                  return (
                    <Badge variant="secondary" key={r} className="font-normal text-[11px] px-1.5 py-0 flex items-center gap-1 bg-primary/10 text-primary hover:bg-primary/20">
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
                    const selecionado = relacoes.includes(tagFormatada) || relacoes.includes(`[[${opcao.titulo}]]`);
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
                          <span className="truncate">@{opcao.titulo}</span>
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
    const IconeAtual = fixo?.icone ? () => <>{fixo.icone}</> : ICONES_TIPO[tipoAtual as TipoPropriedade];

    return (
      <Popover open={editandoChave === chave} onOpenChange={(open) => {
        if (open) {
          setEditandoChave(chave);
          setRenomearPara(chave);
        } else {
          setEditandoChave(null);
        }
      }}>
        <PopoverTrigger asChild>
          <button className="w-32 flex items-center gap-2 text-muted-foreground px-2 py-1 -ml-2 rounded hover:bg-accent/50 transition-colors text-left group/prop">
            <IconeAtual className="h-4 w-4 opacity-50 shrink-0" />
            <span className="truncate flex-1">{chave}</span>
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-[240px] p-2 flex flex-col gap-2" align="start">
          {!fixo ? (
            <input 
              value={renomearPara}
              onChange={(e) => setRenomearPara(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") renomear(chave, renomearPara);
              }}
              onBlur={() => renomear(chave, renomearPara)}
              className="bg-accent/50 border-none outline-none text-sm px-2 py-1.5 rounded focus:ring-2 focus:ring-primary w-full"
            />
          ) : (
            <div className="text-sm font-medium px-2 py-1">{chave} <span className="text-muted-foreground text-xs font-normal">(Fixo)</span></div>
          )}

          {!fixo && (
            <div className="border-t pt-2 mt-1">
              <span className="text-xs font-semibold text-muted-foreground px-2 uppercase tracking-wider">Tipo</span>
              <div className="flex flex-col gap-0.5 mt-1">
                {(Object.entries(ICONES_TIPO) as [TipoPropriedade, React.ElementType][]).map(([t, Icon]) => (
                  <Button 
                    key={t}
                    variant="ghost" 
                    size="sm" 
                    onClick={() => atualizarEsquema(chave, t)}
                    className={`justify-start font-normal h-8 ${tipoAtual === t ? 'bg-accent' : ''}`}
                  >
                    <Icon className="h-4 w-4 mr-2 opacity-50" />
                    {NOMES_TIPO[t]}
                  </Button>
                ))}
              </div>
            </div>
          )}
          
          {!fixo && (
            <div className="border-t pt-2 mt-1">
              <Button variant="ghost" size="sm" onClick={() => remover(chave)} className="w-full justify-start text-destructive hover:text-destructive hover:bg-destructive/10">
                <Trash2 className="h-4 w-4 mr-2" />
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
      {todasAsChaves.map((chave) => {
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

      <div className="flex items-center gap-4 text-sm mt-1">
        <div className="w-32"></div>
        <div className="flex-1">
          {novoCampoAberto ? (
            <div className="flex items-center gap-2 p-1 bg-accent/30 rounded-md w-full max-w-xs border">
              <select 
                value={tipoNovoCampo} 
                onChange={(e) => setTipoNovoCampo(e.target.value as TipoPropriedade)}
                className="bg-transparent border-r outline-none text-xs p-1 text-muted-foreground focus:ring-0 cursor-pointer"
              >
                {Object.entries(NOMES_TIPO).map(([t, nome]) => (
                  <option key={t} value={t}>{nome}</option>
                ))}
              </select>
              <input
                type="text"
                autoFocus
                placeholder="Nome da propriedade..."
                value={nomeNovoCampo}
                onChange={(e) => setNomeNovoCampo(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && nomeNovoCampo.trim()) {
                    const nome = nomeNovoCampo.trim();
                    atualizar(nome, "");
                    atualizarEsquema(nome, tipoNovoCampo);
                    setNovoCampoAberto(false);
                    setNomeNovoCampo("");
                    setTipoNovoCampo("texto");
                  }
                  if (e.key === "Escape") setNovoCampoAberto(false);
                }}
                className="bg-transparent border-none outline-none h-6 px-1 text-sm text-foreground placeholder:text-muted-foreground focus:ring-0 flex-1"
              />
            </div>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setNovoCampoAberto(true)}
              className="h-7 px-2 -ml-2 text-muted-foreground hover:text-foreground font-normal"
            >
              <Plus className="h-3.5 w-3.5 mr-1" />
              Adicionar propriedade
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
