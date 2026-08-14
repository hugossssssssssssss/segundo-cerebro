import React, { useState } from "react";
import { Type, Plus } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

type PropriedadesNotionProps = {
  dados: Record<string, any>;
  onChange: (novosDados: Record<string, any>) => void;
  // Campos que não podem ser apagados e têm tipo fixo
  camposFixos?: {
    [key: string]: {
      icone: React.ReactNode;
      tipo: "texto" | "data" | "tags" | "status";
      opcoes?: string[]; // para status
    };
  };
};

export function PropriedadesNotion({ dados, onChange, camposFixos = {} }: PropriedadesNotionProps) {
  const [novoCampoAberto, setNovoCampoAberto] = useState(false);
  const [nomeNovoCampo, setNomeNovoCampo] = useState("");

  const todasAsChaves = Array.from(new Set([...Object.keys(camposFixos), ...Object.keys(dados)]))
    // Ocultar chaves internas que não devem ser editadas aqui
    .filter(k => !["titulo", "tipo", "atualizado", "id"].includes(k));

  function atualizar(chave: string, valor: any) {
    onChange({ ...dados, [chave]: valor });
  }

  function remover(chave: string) {
    if (camposFixos[chave]) return;
    const novos = { ...dados };
    delete novos[chave];
    onChange(novos);
  }

  function renderizarValor(chave: string) {
    const fixo = camposFixos[chave];
    const valor = dados[chave];
    const tipo = fixo?.tipo || (Array.isArray(valor) ? "tags" : "texto");

    if (tipo === "status") {
      const opcoes = fixo?.opcoes || ["a-fazer", "fazendo", "feito"];
      return (
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="sm" className="h-7 px-2 text-left justify-start font-normal text-foreground/80 hover:text-foreground">
              {valor ? <Badge variant="secondary" className="font-normal">{valor}</Badge> : <span className="text-muted-foreground">Vazio</span>}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[200px] p-0" align="start">
            <Command>
              <CommandInput placeholder="Alterar status..." />
              <CommandList>
                <CommandEmpty>Nenhum status encontrado.</CommandEmpty>
                <CommandGroup>
                  {opcoes.map((opcao) => (
                    <CommandItem
                      key={opcao}
                      value={opcao}
                      onSelect={(val: string) => atualizar(chave, val)}
                    >
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
      const dataObj = valor ? new Date(valor) : undefined;
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

    if (tipo === "tags") {
      const tags = Array.isArray(valor) ? valor : valor ? [valor] : [];
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
              <CommandInput placeholder="Digite uma tag e pressione Enter..." onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
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
                <CommandEmpty>Digite para criar uma nova tag.</CommandEmpty>
                <CommandGroup heading="Tags atuais (clique para remover)">
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

  return (
    <div className="flex flex-col gap-1 w-full max-w-xl">
      {todasAsChaves.map((chave) => {
        const fixo = camposFixos[chave];
        return (
          <div key={chave} className="flex min-h-8 items-start gap-4 text-sm group">
            <div className="w-32 flex items-center gap-2 text-muted-foreground pt-1.5">
              {fixo?.icone ? fixo.icone : <Type className="h-4 w-4 opacity-50" />}
              <span className="truncate flex-1">{chave}</span>
            </div>
            <div className="flex-1 flex items-center min-h-8">
              {renderizarValor(chave)}
            </div>
            {!fixo && (
              <button
                onClick={() => remover(chave)}
                className="opacity-0 group-hover:opacity-100 p-1 text-muted-foreground hover:text-destructive transition-opacity self-center"
              >
                &times;
              </button>
            )}
          </div>
        );
      })}

      <div className="flex items-center gap-4 text-sm mt-1">
        <div className="w-32"></div>
        <div className="flex-1">
          {novoCampoAberto ? (
            <div className="flex items-center gap-2">
              <input
                type="text"
                autoFocus
                placeholder="Nome da propriedade"
                value={nomeNovoCampo}
                onChange={(e) => setNomeNovoCampo(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && nomeNovoCampo.trim()) {
                    atualizar(nomeNovoCampo.trim(), "");
                    setNovoCampoAberto(false);
                    setNomeNovoCampo("");
                  }
                  if (e.key === "Escape") setNovoCampoAberto(false);
                }}
                className="bg-transparent border-none outline-none h-7 px-2 text-sm text-foreground placeholder:text-muted-foreground focus:ring-0 w-32"
              />
            </div>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setNovoCampoAberto(true)}
              className="h-7 px-2 text-muted-foreground hover:text-foreground font-normal"
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
