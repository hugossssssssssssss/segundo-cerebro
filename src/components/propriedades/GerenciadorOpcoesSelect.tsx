import { useState } from "react";
import {
  Palette,
  Pencil,
  Trash2,
  ChevronUp,
  ChevronDown,
  Plus,
} from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const CORES_PALETA_NOTION: Record<string, { bg: string; text: string; border: string; nome: string }> = {
  cinza: { bg: "bg-stone-500/15", text: "text-stone-700 dark:text-stone-300", border: "border-stone-500/20", nome: "Cinza" },
  marrom: { bg: "bg-amber-900/15", text: "text-amber-800 dark:text-amber-200", border: "border-amber-900/20", nome: "Marrom" },
  laranja: { bg: "bg-orange-500/15", text: "text-orange-700 dark:text-orange-300", border: "border-orange-500/20", nome: "Laranja" },
  amarelo: { bg: "bg-amber-500/15", text: "text-amber-700 dark:text-amber-300", border: "border-amber-500/20", nome: "Amarelo" },
  verde: { bg: "bg-emerald-500/15", text: "text-emerald-700 dark:text-emerald-300", border: "border-emerald-500/20", nome: "Verde" },
  azul: { bg: "bg-blue-500/15", text: "text-blue-700 dark:text-blue-300", border: "border-blue-500/20", nome: "Azul" },
  roxo: { bg: "bg-purple-500/15", text: "text-purple-700 dark:text-purple-300", border: "border-purple-500/20", nome: "Roxo" },
  rosa: { bg: "bg-pink-500/15", text: "text-pink-700 dark:text-pink-300", border: "border-pink-500/20", nome: "Rosa" },
  vermelho: { bg: "bg-rose-500/15", text: "text-rose-700 dark:text-rose-300", border: "border-rose-500/20", nome: "Vermelho" },
};

interface GerenciadorOpcoesSelectProps {
  opcoes: string[];
  coresMap: Record<string, string>;
  aoAtualizarOpcoes: (novasOpcoes: string[]) => void;
  aoAtualizarCor: (opcao: string, novaCor: string) => void;
  aoRenomearOpcao: (opcaoAntiga: string, opcaoNova: string) => void;
  aoExcluirOpcao: (opcao: string) => void;
}

export function GerenciadorOpcoesSelect({
  opcoes,
  coresMap,
  aoAtualizarOpcoes,
  aoAtualizarCor,
  aoRenomearOpcao,
  aoExcluirOpcao,
}: GerenciadorOpcoesSelectProps) {
  const [novaOpcao, setNovaOpcao] = useState("");
  const [editando, setEditando] = useState<string | null>(null);
  const [nomeTemp, setNomeTemp] = useState("");

  const handleAdicionar = () => {
    const limpo = novaOpcao.trim();
    if (!limpo) return;
    if (!opcoes.includes(limpo)) {
      aoAtualizarOpcoes([...opcoes, limpo]);
      aoAtualizarCor(limpo, "azul");
    }
    setNovaOpcao("");
  };

  const handleSalvarEdicao = (antigo: string) => {
    const limpo = nomeTemp.trim();
    if (limpo && limpo !== antigo) {
      aoRenomearOpcao(antigo, limpo);
    }
    setEditando(null);
  };

  const moverOpcao = (indice: number, direcao: "cima" | "baixo") => {
    const novoIndice = direcao === "cima" ? indice - 1 : indice + 1;
    if (novoIndice < 0 || novoIndice >= opcoes.length) return;
    const copia = [...opcoes];
    const [item] = copia.splice(indice, 1);
    copia.splice(novoIndice, 0, item);
    aoAtualizarOpcoes(copia);
  };

  return (
    <div className="space-y-2 p-2 bg-secondary/30 rounded-lg border border-border/40 text-xs">
      <div className="flex items-center justify-between text-[11px]">
        <span className="text-muted-foreground font-medium">Opções Pré-cadastradas:</span>
        <span className="text-[10px] text-muted-foreground">{opcoes.length} opções</span>
      </div>

      <div className="max-h-48 overflow-y-auto flex flex-col gap-1.5 pt-1 pr-0.5">
        {opcoes.length === 0 ? (
          <p className="text-[11px] text-muted-foreground/70 py-2 text-center">Nenhuma opção cadastrada.</p>
        ) : (
          opcoes.map((op, idx) => {
            const estaEditando = editando === op;
            const corChave = coresMap[op] || "azul";
            const estilo = CORES_PALETA_NOTION[corChave] || CORES_PALETA_NOTION.azul;

            return (
              <div
                key={op}
                className="flex items-center justify-between gap-1.5 p-1 rounded-md bg-card border border-border/60 text-xs hover:border-border transition-colors"
              >
                {estaEditando ? (
                  <div className="flex items-center gap-1 flex-1">
                    <input
                      type="text"
                      value={nomeTemp}
                      onChange={(e) => setNomeTemp(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleSalvarEdicao(op);
                        if (e.key === "Escape") setEditando(null);
                      }}
                      autoFocus
                      className="flex-1 bg-accent/40 border border-border text-[11px] px-1.5 py-0.5 rounded outline-none focus:ring-1 focus:ring-primary"
                    />
                    <button
                      type="button"
                      onClick={() => handleSalvarEdicao(op)}
                      className="text-[10px] text-primary font-semibold px-1 hover:underline cursor-pointer"
                    >
                      Salvar
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center gap-1.5 min-w-0 flex-1">
                      <Badge
                        variant="secondary"
                        className={cn(
                          "font-medium text-[11px] px-2 py-0.5 border flex items-center gap-1 shadow-2xs truncate",
                          estilo.bg,
                          estilo.text,
                          estilo.border
                        )}
                      >
                        <span className="truncate">{op}</span>
                      </Badge>
                    </div>

                    <div className="flex items-center gap-0.5 shrink-0">
                      {/* Reordenação Cima / Baixo */}
                      <button
                        type="button"
                        disabled={idx === 0}
                        onClick={() => moverOpcao(idx, "cima")}
                        title="Mover para cima"
                        className="p-1 text-muted-foreground hover:text-foreground disabled:opacity-30 rounded hover:bg-accent cursor-pointer"
                      >
                        <ChevronUp size={11} />
                      </button>
                      <button
                        type="button"
                        disabled={idx === opcoes.length - 1}
                        onClick={() => moverOpcao(idx, "baixo")}
                        title="Mover para baixo"
                        className="p-1 text-muted-foreground hover:text-foreground disabled:opacity-30 rounded hover:bg-accent cursor-pointer"
                      >
                        <ChevronDown size={11} />
                      </button>

                      {/* Paleta de Cores */}
                      <Popover>
                        <PopoverTrigger asChild>
                          <button
                            type="button"
                            title="Alterar cor da opção"
                            className="p-1 text-muted-foreground hover:text-foreground rounded hover:bg-accent cursor-pointer"
                          >
                            <Palette size={11} />
                          </button>
                        </PopoverTrigger>
                        <PopoverContent className="w-48 p-2 shadow-xl border-border" align="end">
                          <span className="text-[10px] font-semibold text-muted-foreground block mb-1">
                            Cor da Opção
                          </span>
                          <div className="grid grid-cols-3 gap-1">
                            {Object.entries(CORES_PALETA_NOTION).map(([nomeCor, est]) => (
                              <button
                                key={nomeCor}
                                type="button"
                                onClick={() => aoAtualizarCor(op, nomeCor)}
                                className={cn(
                                  "px-1.5 py-1 rounded text-[10px] font-medium border text-center transition-colors cursor-pointer",
                                  est.bg,
                                  est.text,
                                  est.border,
                                  corChave === nomeCor && "ring-1 ring-primary font-bold"
                                )}
                              >
                                {est.nome}
                              </button>
                            ))}
                          </div>
                        </PopoverContent>
                      </Popover>

                      {/* Renomear */}
                      <button
                        type="button"
                        onClick={() => {
                          setEditando(op);
                          setNomeTemp(op);
                        }}
                        title="Renomear opção"
                        className="p-1 text-muted-foreground hover:text-foreground rounded hover:bg-accent cursor-pointer"
                      >
                        <Pencil size={11} />
                      </button>

                      {/* Excluir */}
                      <button
                        type="button"
                        onClick={() => aoExcluirOpcao(op)}
                        title="Excluir opção"
                        className="p-1 text-muted-foreground hover:text-destructive rounded hover:bg-destructive/10 cursor-pointer"
                      >
                        <Trash2 size={11} />
                      </button>
                    </div>
                  </>
                )}
              </div>
            );
          })
        )}
      </div>

      <div className="pt-2 border-t border-border/40 flex items-center gap-1">
        <input
          type="text"
          placeholder="Nova opção..."
          value={novaOpcao}
          onChange={(e) => setNovaOpcao(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleAdicionar();
          }}
          className="flex-1 bg-card border border-border text-[11px] px-2 py-1 rounded outline-none focus:ring-1 focus:ring-primary"
        />
        <Button
          type="button"
          size="sm"
          variant="secondary"
          disabled={!novaOpcao.trim()}
          onClick={handleAdicionar}
          className="h-6 text-[10px] px-2 flex items-center gap-1"
        >
          <Plus size={10} />
          <span>Adicionar</span>
        </Button>
      </div>
    </div>
  );
}
