/**
 * DropdownNovoViaModelo — Botão integrado com menu dropdown de templates Markdown.
 *
 * - Fica ao lado ou integrado ao botão de "Nova Nota / Nova Tarefa", com exatamente a mesma altura.
 * - Dropdown com:
 *   1. Botão "+ Novo Modelo"
 *   2. Lista de modelos disponíveis
 *   3. Cada modelo possui: Definir Padrão (⭐), Editar (✏️), Duplicar (📄) e Excluir (🗑️).
 */

import { useState, useEffect, useCallback } from "react";
import { Plus, ChevronDown, Star, Copy, Trash2, FileEdit, LayoutTemplate } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip } from "@/components/ui/tooltip";
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
  className = "",
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
    window.addEventListener("acervo-atualizado", atualizarLista);
    window.addEventListener("klaus-templates-atualizados", atualizarLista);
    return () => {
      window.removeEventListener("acervo-atualizado", atualizarLista);
      window.removeEventListener("klaus-templates-atualizados", atualizarLista);
    };
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
    toast(ehPadrao ? `Modelo "${m.titulo}" desmarcado como padrão.` : `"${m.titulo}" definido como modelo padrão!`);
  };

  const handleEditar = async (e: React.MouseEvent, m: TemplateItem) => {
    e.stopPropagation();
    setAberto(false);
    if (aoEditarTemplate) {
      aoEditarTemplate(m);
      return;
    }

    // Se a página não tiver editor de template dedicado, dispara o evento global
    window.dispatchEvent(new CustomEvent("klaus-editar-template", { detail: { template: m } }));
    toast(`Editando modelo: "${m.titulo}"`);
  };

  const handleDuplicar = async (e: React.MouseEvent, m: TemplateItem) => {
    e.stopPropagation();
    try {
      const duplicado: TemplateItem = {
        ...m,
        id: `custom_${Date.now()}`,
        titulo: `${m.titulo} (Cópia)`,
        caminho: undefined,
        sha: undefined,
      };
      await salvarTemplateNoRepo(cfg, duplicado);
      await atualizarLista();
      toast(`Modelo "${duplicado.titulo}" duplicado com sucesso!`);
    } catch (err: any) {
      toast(`Erro ao duplicar modelo: ${err?.message || err}`, { tipo: "erro" });
    }
  };

  const handleExcluir = async (e: React.MouseEvent, m: TemplateItem) => {
    e.stopPropagation();
    if (!m.caminho || !m.sha) {
      toast("Modelos do sistema não podem ser excluídos.", { tipo: "erro" });
      return;
    }
    try {
      await excluirTemplateDoRepo(cfg, m.caminho, m.sha);
      await atualizarLista();
      toast("Modelo excluído com sucesso.");
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
          tags: [],
        },
        corpoPadrao: "## Seção Principal\n\nEscreva a estrutura padrão do seu modelo aqui...",
      };
      await salvarTemplateNoRepo(cfg, novoTemplate);
      await atualizarLista();
      toast(`Modelo "${novoNome}" criado!`);

      if (aoEditarTemplate) {
        aoEditarTemplate(novoTemplate);
      } else {
        window.dispatchEvent(new CustomEvent("klaus-editar-template", { detail: { template: novoTemplate } }));
      }
    } catch (err: any) {
      toast(`Erro ao criar novo modelo: ${err?.message || err}`, { tipo: "erro" });
    }
  };

  const aoClicarPrincipal = () => {
    if (modeloPadrao && aoCriarComTemplate) {
      aoCriarComTemplate(modeloPadrao);
    } else {
      aoCriarNovo();
    }
  };

  return (
    <div className={`inline-flex items-center shadow-2xs rounded-xl overflow-hidden ${className}`}>
      {/* Botão Principal de Criação (Mesma altura exata h-9) */}
      <Tooltip conteudo={modeloPadrao ? `Criar novo usando modelo padrão: "${modeloPadrao.titulo}"` : undefined} desabilitado={!modeloPadrao}>
        <Button
          variant="default"
          size="sm"
          onClick={aoClicarPrincipal}
          className="h-9 rounded-r-none gap-1.5 font-semibold text-xs cursor-pointer"
        >
          {iconePrincipal}
          <span>{rotuloPrincipal}</span>
          {modeloPadrao && <Star size={12} className="text-amber-300 fill-amber-300 inline shrink-0" />}
        </Button>
      </Tooltip>

      {/* Botão de Modelos / Dropdown (Exatamente da mesma altura h-9) */}
      <Popover open={aberto} onOpenChange={setAberto}>
        <Tooltip conteudo="Escolher ou gerenciar modelos">
          <PopoverTrigger asChild>
            <Button
              variant="default"
              size="sm"
              className="h-9 px-2.5 rounded-l-none border-l border-primary-foreground/20 hover:bg-primary/90 transition-colors cursor-pointer"
              aria-label="Opções de modelos"
            >
              <ChevronDown size={14} />
            </Button>
          </PopoverTrigger>
        </Tooltip>

        <PopoverContent className="w-80 p-1.5 shadow-2xl border-border rounded-xl" align="end">
          <div className="py-1">
            <div className="flex items-center justify-between px-3 py-2 border-b border-border/50">
              <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                <LayoutTemplate size={13} className="text-primary" />
                <span>Modelos de Documento</span>
              </span>
              <Tooltip conteudo="Criar um novo modelo personalizado">
                <button
                  type="button"
                  onClick={handleCriarNovoModelo}
                  className="text-[11px] font-semibold text-primary hover:underline flex items-center gap-1 cursor-pointer"
                  aria-label="Criar um novo modelo personalizado"
                >
                  <Plus size={12} />
                  <span>Novo Modelo</span>
                </button>
              </Tooltip>
            </div>

            <div className="max-h-64 overflow-y-auto divide-y divide-border/20 pt-1">
              {modelosFiltrados.length === 0 ? (
                <div className="px-3 py-6 text-center text-xs text-muted-foreground">
                  Nenhum modelo disponível
                </div>
              ) : (
                modelosFiltrados.map((m) => {
                  const ehPadrao = modeloPadrao?.id === m.id;
                  const ehCustom = ehModeloCustom(m.id) || !!m.caminho;

                  return (
                    <div
                      key={m.id}
                      className="group flex items-center justify-between gap-2 px-3 py-2.5 rounded-lg hover:bg-accent cursor-pointer transition-colors"
                      onClick={() => {
                        aoCriarComTemplate(m);
                        setAberto(false);
                      }}
                    >
                      <div className="flex-1 min-w-0 pr-1">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-semibold text-foreground truncate">{m.titulo}</span>
                          {ehPadrao && (
                            <Star size={11} className="text-amber-500 fill-amber-500 shrink-0" />
                          )}
                        </div>
                        {m.descricao && (
                          <p className="text-[10px] text-muted-foreground truncate">{m.descricao}</p>
                        )}
                      </div>

                      {/* Ações Diretas por Modelo */}
                      <div
                        className="flex items-center gap-0.5 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity shrink-0"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Tooltip conteudo={ehPadrao ? "Remover como padrão" : "Definir como padrão"}>
                          <button
                            type="button"
                            className="p-1 rounded-md text-muted-foreground hover:text-amber-500 hover:bg-muted transition-colors cursor-pointer"
                            onClick={(e) => handleDefinirPadrao(e, m)}
                            aria-label={ehPadrao ? "Remover como padrão" : "Definir como padrão"}
                          >
                            <Star size={13} className={ehPadrao ? "text-amber-500 fill-amber-500" : ""} />
                          </button>
                        </Tooltip>

                        <Tooltip conteudo="Editar modelo">
                          <button
                            type="button"
                            className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
                            onClick={(e) => handleEditar(e, m)}
                            aria-label="Editar modelo"
                          >
                            <FileEdit size={13} />
                          </button>
                        </Tooltip>

                        <Tooltip conteudo="Duplicar modelo">
                          <button
                            type="button"
                            className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
                            onClick={(e) => handleDuplicar(e, m)}
                            aria-label="Duplicar modelo"
                          >
                            <Copy size={13} />
                          </button>
                        </Tooltip>

                        {ehCustom && m.caminho && (
                          <Tooltip conteudo="Excluir modelo">
                            <button
                              type="button"
                              className="p-1 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors cursor-pointer"
                              onClick={(e) => handleExcluir(e, m)}
                              aria-label="Excluir modelo"
                            >
                              <Trash2 size={13} />
                            </button>
                          </Tooltip>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
