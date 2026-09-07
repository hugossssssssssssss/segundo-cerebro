import { useState } from "react";
import { 
  Check, 
  Plus, 
  Pencil, 
  Trash2, 
  CircleDot,
  CheckCircle2,
  Clock,
} from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export type GrupoStatusNotion = "a_fazer" | "em_andamento" | "concluido";

export interface ItemStatusNotion {
  id: string;
  rotulo: string;
  cor: string;
  grupo: GrupoStatusNotion;
}

export const CORES_STATUS: Record<string, { bg: string; text: string; border: string; nome: string }> = {
  cinza: { bg: "bg-stone-500/15", text: "text-stone-700 dark:text-stone-300", border: "border-stone-500/20", nome: "Cinza" },
  azul: { bg: "bg-blue-500/15", text: "text-blue-700 dark:text-blue-300", border: "border-blue-500/20", nome: "Azul" },
  verde: { bg: "bg-emerald-500/15", text: "text-emerald-700 dark:text-emerald-300", border: "border-emerald-500/20", nome: "Verde" },
  amarelo: { bg: "bg-amber-500/15", text: "text-amber-700 dark:text-amber-300", border: "border-amber-500/20", nome: "Amarelo" },
  vermelho: { bg: "bg-rose-500/15", text: "text-rose-700 dark:text-rose-300", border: "border-rose-500/20", nome: "Vermelho" },
  roxo: { bg: "bg-purple-500/15", text: "text-purple-700 dark:text-purple-300", border: "border-purple-500/20", nome: "Roxo" },
  rosa: { bg: "bg-pink-500/15", text: "text-pink-700 dark:text-pink-300", border: "border-pink-500/20", nome: "Rosa" },
  laranja: { bg: "bg-orange-500/15", text: "text-orange-700 dark:text-orange-300", border: "border-orange-500/20", nome: "Laranja" },
};

export const GRUPOS_STATUS: { id: GrupoStatusNotion; rotulo: string; icone: React.ElementType }[] = [
  { id: "a_fazer", rotulo: "Não Iniciado", icone: CircleDot },
  { id: "em_andamento", rotulo: "Em Progresso", icone: Clock },
  { id: "concluido", rotulo: "Concluído", icone: CheckCircle2 },
];

export const STATUS_NOTION_PADRAO: ItemStatusNotion[] = [
  { id: "a-fazer", rotulo: "A fazer", cor: "cinza", grupo: "a_fazer" },
  { id: "nao-iniciado", rotulo: "Não iniciado", cor: "cinza", grupo: "a_fazer" },
  { id: "fazendo", rotulo: "Em andamento", cor: "azul", grupo: "em_andamento" },
  { id: "em-andamento", rotulo: "Em andamento", cor: "azul", grupo: "em_andamento" },
  { id: "em-revisao", rotulo: "Em revisão", cor: "amarelo", grupo: "em_andamento" },
  { id: "bloqueado", rotulo: "Bloqueado", cor: "vermelho", grupo: "em_andamento" },
  { id: "feito", rotulo: "Feito", cor: "verde", grupo: "concluido" },
  { id: "concluido", rotulo: "Concluído", cor: "verde", grupo: "concluido" },
  { id: "cancelado", rotulo: "Cancelado", cor: "cinza", grupo: "concluido" },
];

export function normalizarStatusNotion(
  val?: string,
  customizados: ItemStatusNotion[] = STATUS_NOTION_PADRAO
): ItemStatusNotion {
  if (!val) return customizados.find((s) => s.id === "a-fazer") || STATUS_NOTION_PADRAO[0];

  const limpo = val.toLowerCase().trim().replace(/_/g, "-");
  const encontrado = customizados.find((s) => s.id === limpo || s.rotulo.toLowerCase() === val.toLowerCase());
  if (encontrado) return encontrado;

  return {
    id: limpo,
    rotulo: val.charAt(0).toUpperCase() + val.slice(1),
    cor: "cinza",
    grupo: "em_andamento",
  };
}

interface SeletorBadgeStatusProps {
  valorAtual?: string;
  statusLista?: ItemStatusNotion[];
  aoSelecionar: (statusId: string) => void;
  aberto: boolean;
  aoMudarAberto: (aberto: boolean) => void;
}

export function SeletorBadgeStatus({
  valorAtual,
  statusLista = STATUS_NOTION_PADRAO,
  aoSelecionar,
  aberto,
  aoMudarAberto,
}: SeletorBadgeStatusProps) {
  const statusObj = normalizarStatusNotion(valorAtual, statusLista);
  const estiloCor = CORES_STATUS[statusObj.cor] || CORES_STATUS.cinza;

  return (
    <Popover open={aberto} onOpenChange={aoMudarAberto}>
      <PopoverTrigger asChild>
        <Badge
          variant="secondary"
          className={cn(
            "font-semibold text-xs px-2.5 py-1 border cursor-pointer transition-all hover:scale-105 active:scale-95 flex items-center gap-1.5 shadow-xs select-none",
            estiloCor.bg,
            estiloCor.text,
            estiloCor.border
          )}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-current opacity-80" />
          <span>{statusObj.rotulo}</span>
        </Badge>
      </PopoverTrigger>
      <PopoverContent
        className="w-56 p-1.5 shadow-2xl border-border space-y-2"
        align="start"
        onInteractOutside={() => aoMudarAberto(false)}
      >
        {GRUPOS_STATUS.map((grp) => {
          const itensDoGrupo = statusLista.filter((s) => s.grupo === grp.id);
          if (itensDoGrupo.length === 0) return null;
          const IconGrupo = grp.icone;

          return (
            <div key={grp.id} className="space-y-0.5">
              <div className="flex items-center gap-1.5 px-2 py-1 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                <IconGrupo size={11} className="opacity-70" />
                <span>{grp.rotulo}</span>
              </div>
              <div className="flex flex-col gap-0.5">
                {itensDoGrupo.map((st) => {
                  const est = CORES_STATUS[st.cor] || CORES_STATUS.cinza;
                  const selecionado = statusObj.id === st.id;

                  return (
                    <button
                      key={st.id}
                      type="button"
                      onClick={() => {
                        aoSelecionar(st.id);
                        aoMudarAberto(false);
                      }}
                      className={cn(
                        "w-full px-2 py-1.5 rounded-md text-xs font-medium text-left transition-colors border flex items-center justify-between cursor-pointer",
                        est.bg,
                        est.text,
                        est.border,
                        selecionado && "ring-2 ring-primary font-bold shadow-xs"
                      )}
                    >
                      <div className="flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-current opacity-80" />
                        <span>{st.rotulo}</span>
                      </div>
                      {selecionado && <Check size={12} className="shrink-0" />}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </PopoverContent>
    </Popover>
  );
}

interface EditorStatusModalProps {
  statusLista: ItemStatusNotion[];
  aoSalvarLista: (novaLista: ItemStatusNotion[]) => void;
}

export function EditorStatusNotion({
  statusLista = STATUS_NOTION_PADRAO,
  aoSalvarLista,
}: EditorStatusModalProps) {
  const [novoStatusTexto, setNovoStatusTexto] = useState("");
  const [grupoSelecionado, setGrupoSelecionado] = useState<GrupoStatusNotion>("a_fazer");
  const [corSelecionada, setCorSelecionada] = useState("azul");
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [editandoTexto, setEditandoTexto] = useState("");

  const handleAdicionar = () => {
    const limpo = novoStatusTexto.trim();
    if (!limpo) return;
    const id = limpo.toLowerCase().replace(/[^a-z0-9]+/g, "-");
    const novo: ItemStatusNotion = {
      id,
      rotulo: limpo,
      cor: corSelecionada,
      grupo: grupoSelecionado,
    };
    aoSalvarLista([...statusLista, novo]);
    setNovoStatusTexto("");
  };

  const handleExcluir = (id: string) => {
    aoSalvarLista(statusLista.filter((s) => s.id !== id));
  };

  const handleSalvarEdicao = (id: string) => {
    if (!editandoTexto.trim()) return;
    aoSalvarLista(
      statusLista.map((s) => (s.id === id ? { ...s, rotulo: editandoTexto.trim() } : s))
    );
    setEditandoId(null);
  };

  return (
    <div className="space-y-3 p-1 text-xs">
      <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
        {GRUPOS_STATUS.map((grp) => {
          const itens = statusLista.filter((s) => s.grupo === grp.id);
          const Icon = grp.icone;

          return (
            <div key={grp.id} className="space-y-1 bg-secondary/30 p-2 rounded-lg border border-border/40">
              <div className="flex items-center gap-1.5 text-[11px] font-semibold text-foreground">
                <Icon size={12} className="text-primary" />
                <span>{grp.rotulo}</span>
                <span className="ml-auto text-[10px] text-muted-foreground font-normal">
                  {itens.length} opções
                </span>
              </div>

              <div className="flex flex-col gap-1 pt-1">
                {itens.map((st) => {
                  const est = CORES_STATUS[st.cor] || CORES_STATUS.cinza;
                  const estaEditando = editandoId === st.id;

                  return (
                    <div
                      key={st.id}
                      className="flex items-center justify-between gap-1.5 p-1 rounded-md bg-card border border-border/60"
                    >
                      {estaEditando ? (
                        <input
                          type="text"
                          value={editandoTexto}
                          onChange={(e) => setEditandoTexto(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") handleSalvarEdicao(st.id);
                            if (e.key === "Escape") setEditandoId(null);
                          }}
                          autoFocus
                          className="flex-1 bg-accent/40 border border-border text-xs px-2 py-0.5 rounded outline-none focus:ring-1 focus:ring-primary"
                        />
                      ) : (
                        <Badge
                          variant="secondary"
                          className={cn("text-[11px] px-2 py-0.5 border font-medium truncate", est.bg, est.text, est.border)}
                        >
                          {st.rotulo}
                        </Badge>
                      )}

                      <div className="flex items-center gap-0.5">
                        {estaEditando ? (
                          <button
                            type="button"
                            onClick={() => handleSalvarEdicao(st.id)}
                            className="p-1 text-primary hover:bg-accent rounded cursor-pointer"
                          >
                            <Check size={11} />
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              setEditandoId(st.id);
                              setEditandoTexto(st.rotulo);
                            }}
                            className="p-1 text-muted-foreground hover:text-foreground rounded hover:bg-accent cursor-pointer"
                          >
                            <Pencil size={11} />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => handleExcluir(st.id)}
                          className="p-1 text-muted-foreground hover:text-destructive rounded hover:bg-destructive/10 cursor-pointer"
                        >
                          <Trash2 size={11} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Adicionar Novo Status */}
      <div className="pt-2 border-t border-border/40 space-y-2">
        <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">
          Adicionar Novo Status
        </span>
        <div className="flex items-center gap-1.5">
          <input
            type="text"
            placeholder="Nome do status..."
            value={novoStatusTexto}
            onChange={(e) => setNovoStatusTexto(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleAdicionar();
            }}
            className="flex-1 bg-accent/40 border border-border text-xs px-2 py-1 rounded outline-none focus:ring-1 focus:ring-primary"
          />
          <select
            value={grupoSelecionado}
            onChange={(e) => setGrupoSelecionado(e.target.value as GrupoStatusNotion)}
            className="bg-card border border-border text-[11px] px-2 py-1 rounded outline-none cursor-pointer"
          >
            {GRUPOS_STATUS.map((g) => (
              <option key={g.id} value={g.id}>
                {g.rotulo}
              </option>
            ))}
          </select>
          <select
            value={corSelecionada}
            onChange={(e) => setCorSelecionada(e.target.value)}
            className="bg-card border border-border text-[11px] px-2 py-1 rounded outline-none cursor-pointer"
          >
            {Object.entries(CORES_STATUS).map(([k, c]) => (
              <option key={k} value={k}>
                {c.nome}
              </option>
            ))}
          </select>
          <button
            type="button"
            disabled={!novoStatusTexto.trim()}
            onClick={handleAdicionar}
            className="p-1.5 bg-primary text-primary-foreground rounded hover:opacity-90 disabled:opacity-40 cursor-pointer"
          >
            <Plus size={12} />
          </button>
        </div>
      </div>
    </div>
  );
}
