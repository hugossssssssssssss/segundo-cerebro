import { useState, useEffect, useMemo } from "react";
import { Plus, X, Check, UserPlus } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { AvatarUsuario } from "@/components/AvatarUsuario";
import { lerConfig, nomeExibido } from "@/lib/settings";
import { lerPerfilLocal } from "@/lib/usuario";
import { carregarEquipe, type MembroEquipe } from "@/lib/equipe";
import { cn } from "@/lib/utils";

interface SeletorMembrosPropriedadeProps {
  valor: string[] | string | undefined;
  onChange: (novosResponsaveis: string[]) => void;
  somenteLeitura?: boolean;
  className?: string;
}

export function SeletorMembrosPropriedade({
  valor,
  onChange,
  somenteLeitura = false,
  className,
}: SeletorMembrosPropriedadeProps) {
  const [aberto, setAberto] = useState(false);
  const [busca, setBusca] = useState("");
  const [membrosEquipe, setMembrosEquipe] = useState<MembroEquipe[]>([]);

  // Normaliza os valores selecionados em lista de strings limpas
  const selecionados: string[] = useMemo(() => {
    if (!valor) return [];
    if (Array.isArray(valor)) {
      return valor.map((v) => String(v).trim().replace(/^@/, "")).filter(Boolean);
    }
    return [String(valor).trim().replace(/^@/, "")].filter(Boolean);
  }, [valor]);

  // Carrega membros da equipe atual em background
  useEffect(() => {
    let cancelado = false;
    async function buscarMembros() {
      const cfg = lerConfig();
      const perfil = lerPerfilLocal();
      try {
        const { config } = await carregarEquipe(cfg, perfil);
        if (!cancelado && config.membros) {
          setMembrosEquipe(config.membros);
        }
      } catch {
        // Fallback: se não conseguir ler equipe.json, coloca pelo menos o usuário local
        if (!cancelado) {
          const loginDono = perfil?.login || cfg.repoOwner || "usuario";
          setMembrosEquipe([
            {
              login: loginDono,
              nome: perfil?.nome || nomeExibido(cfg) || loginDono,
              papel: "dono",
              ativo: true,
              avatar: perfil?.avatarUrl,
            },
          ]);
        }
      }
    }
    buscarMembros();
    return () => {
      cancelado = true;
    };
  }, []);

  const alternarMembro = (login: string) => {
    const limpo = login.trim().replace(/^@/, "");
    if (!limpo) return;

    const jaExiste = selecionados.some((s) => s.toLowerCase() === limpo.toLowerCase());
    if (jaExiste) {
      onChange(selecionados.filter((s) => s.toLowerCase() !== limpo.toLowerCase()));
    } else {
      onChange([...selecionados, limpo]);
    }
  };

  const removerMembro = (login: string) => {
    const limpo = login.trim().replace(/^@/, "");
    onChange(selecionados.filter((s) => s.toLowerCase() !== limpo.toLowerCase()));
  };

  const buscaLimpa = busca.trim().replace(/^@/, "");
  const ehNovoUsuario =
    buscaLimpa.length > 1 &&
    !membrosEquipe.some((m) => m.login.toLowerCase() === buscaLimpa.toLowerCase());

  return (
    <div className={cn("flex items-center gap-1.5 flex-wrap py-0.5", className)}>
      {/* Chips dos membros já atribuídos */}
      {selecionados.map((login) => {
        const membroCadastrado = membrosEquipe.find(
          (m) => m.login.toLowerCase() === login.toLowerCase()
        );
        const nomeParaExibir = membroCadastrado?.nome || `@${login}`;

        return (
          <div
            key={login}
            className="inline-flex items-center gap-1.5 pl-1 pr-2 py-0.5 rounded-full bg-secondary/70 border border-border/60 text-xs text-foreground group"
          >
            <AvatarUsuario
              login={login}
              nome={membroCadastrado?.nome}
              avatarUrl={membroCadastrado?.avatar}
              tamanho="xs"
              comTooltip={false}
            />
            <span className="font-medium text-[11px] max-w-[120px] truncate">
              {nomeParaExibir}
            </span>
            {!somenteLeitura && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  removerMembro(login);
                }}
                className="p-0.5 -mr-1 rounded-full text-muted-foreground hover:text-destructive hover:bg-destructive/10 cursor-pointer transition-colors"
                title={`Remover @${login}`}
              >
                <X size={10} />
              </button>
            )}
          </div>
        );
      })}

      {/* Botão para atribuir / abrir seletor */}
      {!somenteLeitura && (
        <Popover open={aberto} onOpenChange={setAberto}>
          <PopoverTrigger asChild>
            <button
              type="button"
              className={cn(
                "h-6 px-2 text-xs rounded-full flex items-center gap-1 transition-colors cursor-pointer border border-dashed border-border/80 hover:border-primary/50",
                selecionados.length === 0
                  ? "text-muted-foreground hover:text-foreground hover:bg-accent/60"
                  : "text-muted-foreground/80 hover:text-foreground hover:bg-accent/40"
              )}
            >
              <Plus size={11} />
              <span>{selecionados.length === 0 ? "Atribuir responsável" : "Adicionar"}</span>
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-[240px] p-0" align="start">
            <Command>
              <CommandInput
                placeholder="Buscar membro ou @login..."
                value={busca}
                onValueChange={setBusca}
              />
              <CommandList>
                <CommandEmpty className="p-2 text-xs text-muted-foreground text-center">
                  Nenhum membro encontrado.
                </CommandEmpty>

                <CommandGroup heading="Membros da Equipe">
                  {membrosEquipe.map((m) => {
                    const ativo = selecionados.some(
                      (s) => s.toLowerCase() === m.login.toLowerCase()
                    );
                    return (
                      <CommandItem
                        key={m.login}
                        value={`${m.login} ${m.nome}`}
                        onSelect={() => alternarMembro(m.login)}
                        className="text-xs cursor-pointer flex items-center justify-between py-1.5 px-2"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <AvatarUsuario
                            login={m.login}
                            nome={m.nome}
                            avatarUrl={m.avatar}
                            tamanho="xs"
                            comTooltip={false}
                          />
                          <div className="flex flex-col min-w-0 leading-tight">
                            <span className="font-medium text-foreground truncate">
                              {m.nome || m.login}
                            </span>
                            <span className="text-[10px] text-muted-foreground truncate">
                              @{m.login}
                            </span>
                          </div>
                        </div>
                        {ativo && <Check size={12} className="text-primary shrink-0 ml-1" />}
                      </CommandItem>
                    );
                  })}
                </CommandGroup>

                {/* Opção para adicionar @username qualquer do GitHub */}
                {ehNovoUsuario && (
                  <CommandGroup heading="Atribuir a usuário do GitHub">
                    <CommandItem
                      value={buscaLimpa}
                      onSelect={() => {
                        alternarMembro(buscaLimpa);
                        setBusca("");
                        setAberto(false);
                      }}
                      className="text-xs cursor-pointer flex items-center gap-2 py-1.5 px-2 text-primary"
                    >
                      <UserPlus size={13} className="shrink-0" />
                      <span>Atribuir a <strong>@{buscaLimpa}</strong></span>
                    </CommandItem>
                  </CommandGroup>
                )}
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      )}
    </div>
  );
}
