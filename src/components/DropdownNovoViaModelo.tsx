/**
 * DropdownNovoViaModelo — Botão split com menu dropdown de templates Markdown.
 *
 * Permite criar um novo documento direto ou via modelo Markdown (.klaus/templates/*.md).
 * Cada modelo possui um menu de opções (três pontinhos):
 * 1. Definir como padrão (com estrela indicativa)
 * 2. Editar (abre o arquivo .md no editor)
 * 3. Duplicar (cria uma cópia no diretório de templates)
 * 4. Excluir (apaga o arquivo do repositório)
 */

import { useState, useEffect, useCallback } from "react";
import { Plus, ChevronDown, MoreVertical, Star, Copy, Trash2, FileEdit } from "lucide-react";
import { Botao } from "@/components/ui";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  type TemplateItem,
  obterTodosModelos,
  obterModeloPadrao,
  definirModeloPadraoId,
  carregarTemplatesDoRepo,
  salvarTemplateNoRepo,
  excluirTemplateDoRepo,
  ehModeloCustom,
} from "@/lib/templates";
import { lerConfig } from "@/lib/settings";
import { toast } from "@/lib/toast";
import { abrirItemSpa } from "@/components/PropriedadesNotion";

interface DropdownNovoViaModeloProps {
  rotuloPrincipal: string;
  iconePrincipal?: React.ReactNode;
  aoCriarNovo: () => void;
  aoCriarComTemplate: (template: TemplateItem) => void;
  categoria?: "design" | "reuniao" | "tarefa" | "pdi";
  aoEditarTemplate?: (template: TemplateItem) => void;
  className?: string;
}

export function DropdownNovoViaModelo({
  rotuloPrincipal,
  iconePrincipal = <Plus size={16} />,
  aoCriarNovo,
  aoCriarComTemplate,
  categoria,
  aoEditarTemplate,
  className,
}: DropdownNovoViaModeloProps) {
  const [aberto, setAberto] = useState(false);
  const [modelos, setModelos] = useState<TemplateItem[]>(() => obterTodosModelos());
  const [modeloPadrao, setModeloPadrao] = useState<TemplateItem | undefined>(() => obterModeloPadrao());
  const cfg = lerConfig();

  const atualizarLista = useCallback(async () => {
    try {
      await carregarTemplatesDoRepo(cfg);
    } catch {}
    setModelos(obterTodosModelos());
    setModeloPadrao(obterModeloPadrao());
  }, [cfg]);

  useEffect(() => {
    atualizarLista();
  }, [atualizarLista]);

  const modelosFiltrados = categoria
    ? modelos.filter((m) => !m.categoria || m.categoria === categoria || m.categoria === "design")
    : modelos;

  const handleDefinirPadrao = (e: React.MouseEvent, m: TemplateItem) => {
    e.stopPropagation();
    const ehPadrao = modeloPadrao?.id === m.id;
    definirModeloPadraoId(ehPadrao ? null : m.id);
    setModeloPadrao(ehPadrao ? undefined : m);
    setModelos(obterTodosModelos());
  };

  const handleEditar = async (e: React.MouseEvent, m: TemplateItem) => {
    e.stopPropagation();
    setAberto(false);
    if (aoEditarTemplate) {
      aoEditarTemplate(m);
      return;
    }

    // Se já é um arquivo no repositório, abre diretamente pelo SPA
    if (m.caminho) {
      abrirItemSpa(m.caminho);
    } else {
      // Se é um template padrão interno, cria cópia em .klaus/templates e abre
      try {
        const caminhoNovo = await salvarTemplateNoRepo(cfg, {
          ...m,
          titulo: `${m.titulo} (Personalizado)`,
        });
        await atualizarLista();
        abrirItemSpa(caminhoNovo);
      } catch (err: any) {
        toast(`Erro ao criar arquivo para edição: ${err?.message || err}`, { tipo: "erro" });
      }
    }
  };

  const handleDuplicar = async (e: React.MouseEvent, m: TemplateItem) => {
    e.stopPropagation();
    try {
      const duplicado: TemplateItem = {
        ...m,
        id: `custom_${Date.now()}`,
        titulo: `${m.titulo} - cópia`,
        caminho: undefined,
        sha: undefined,
      };
      await salvarTemplateNoRepo(cfg, duplicado);
      await atualizarLista();
      toast("Modelo duplicado!");
    } catch (err: any) {
      toast(`Erro ao duplicar modelo: ${err?.message || err}`, { tipo: "erro" });
    }
  };

  const handleExcluir = async (e: React.MouseEvent, m: TemplateItem) => {
    e.stopPropagation();
    if (!m.caminho || !m.sha) return;
    try {
      await excluirTemplateDoRepo(cfg, m.caminho, m.sha);
      await atualizarLista();
      toast("Modelo excluído.");
    } catch (err: any) {
      toast(`Erro ao excluir modelo: ${err?.message || err}`, { tipo: "erro" });
    }
  };

  const handleCriarNovoModelo = async () => {
    setAberto(false);
    try {
      const novoNome = `Novo Modelo ${Date.now().toString().slice(-4)}`;
      const novoTemplate: TemplateItem = {
        id: `custom_${Date.now()}`,
        titulo: novoNome,
        categoria: categoria || "design",
        descricao: "Modelo personalizado",
        frontmatter: {
          tipo: categoria === "tarefa" ? "tarefa" : "nota",
          tags: ["modelo"],
        },
        corpoPadrao: "## Seção Principal\n\nEscreva o conteúdo do modelo aqui...",
      };
      const caminho = await salvarTemplateNoRepo(cfg, novoTemplate);
      await atualizarLista();
      toast("Novo modelo criado em .klaus/templates!");
      abrirItemSpa(caminho);
    } catch (err: any) {
      toast(`Erro ao criar novo modelo: ${err?.message || err}`, { tipo: "erro" });
    }
  };

  return (
    <div className={`flex items-center ${className || ""}`}>
      <Botao onClick={aoCriarNovo} className="rounded-r-none">
        {iconePrincipal}
        {rotuloPrincipal}
      </Botao>

      <Popover open={aberto} onOpenChange={setAberto}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className="flex items-center justify-center h-full px-2 py-2 rounded-r-xl bg-primary text-primary-foreground border-l border-primary-foreground/20 hover:bg-primary/90 transition-colors cursor-pointer"
            title="Novo via Modelo"
          >
            <ChevronDown size={14} />
          </button>
        </PopoverTrigger>

        <PopoverContent className="w-72 p-1 shadow-xl border-border" align="end">
          <div className="py-1">
            <div className="flex items-center justify-between px-3 py-1.5 border-b border-border/50">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                Novo via Modelo
              </p>
              <button
                type="button"
                onClick={handleCriarNovoModelo}
                className="text-[11px] font-semibold text-primary hover:underline flex items-center gap-1 cursor-pointer"
                title="Criar um novo modelo personalizado"
              >
                <Plus size={12} />
                <span>Novo Modelo</span>
              </button>
            </div>

            {modelosFiltrados.length === 0 ? (
              <div className="px-3 py-4 text-center text-xs text-muted-foreground">
                Nenhum modelo disponível
              </div>
            ) : (
              modelosFiltrados.map((m) => {
                const ehPadrao = modeloPadrao?.id === m.id;
                const ehCustom = ehModeloCustom(m.id) || !!m.caminho;

                return (
                  <div
                    key={m.id}
                    className="group flex items-center justify-between gap-2 px-3 py-2 rounded-lg hover:bg-accent cursor-pointer transition-colors"
                    onClick={() => {
                      aoCriarComTemplate(m);
                      setAberto(false);
                    }}
                  >
                    <div className="flex-1 min-w-0 pr-1">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-medium text-foreground truncate">{m.titulo}</span>
                        {ehPadrao && (
                          <Star size={10} className="text-amber-500 fill-amber-500 shrink-0" />
                        )}
                      </div>
                      {m.descricao && (
                        <p className="text-[10px] text-muted-foreground truncate">{m.descricao}</p>
                      )}
                    </div>

                    <Popover>
                      <PopoverTrigger asChild>
                        <button
                          type="button"
                          className="p-1 rounded-md opacity-0 group-hover:opacity-100 hover:bg-muted text-muted-foreground hover:text-foreground transition-all cursor-pointer shrink-0"
                          onClick={(e) => e.stopPropagation()}
                          title="Opções do modelo"
                        >
                          <MoreVertical size={13} />
                        </button>
                      </PopoverTrigger>

                      <PopoverContent className="w-44 p-1 shadow-xl border-border" align="end">
                        <button
                          type="button"
                          className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md text-xs text-foreground hover:bg-accent transition-colors cursor-pointer text-left"
                          onClick={(e) => handleDefinirPadrao(e, m)}
                        >
                          <Star size={13} className={ehPadrao ? "text-amber-500 fill-amber-500" : ""} />
                          <span>{ehPadrao ? "Remover padrão" : "Definir como padrão"}</span>
                        </button>

                        <button
                          type="button"
                          className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md text-xs text-foreground hover:bg-accent transition-colors cursor-pointer text-left"
                          onClick={(e) => handleEditar(e, m)}
                        >
                          <FileEdit size={13} />
                          <span>Editar modelo</span>
                        </button>

                        <button
                          type="button"
                          className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md text-xs text-foreground hover:bg-accent transition-colors cursor-pointer text-left"
                          onClick={(e) => handleDuplicar(e, m)}
                        >
                          <Copy size={13} />
                          <span>Duplicar</span>
                        </button>

                        {ehCustom && m.caminho && (
                          <button
                            type="button"
                            className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md text-xs text-destructive hover:bg-destructive/10 transition-colors cursor-pointer text-left"
                            onClick={(e) => handleExcluir(e, m)}
                          >
                            <Trash2 size={13} />
                            <span>Excluir</span>
                          </button>
                        )}
                      </PopoverContent>
                    </Popover>
                  </div>
                );
              })
            )}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
