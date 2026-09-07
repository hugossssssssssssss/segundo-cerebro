import React from "react";
import {
  Type,
  Hash,
  Calendar,
  CheckSquare,
  ListTodo,
  Tags,
  Link as LinkIcon,
  User,
  Clock,
  Flag,
  Timer,
  Phone,
  Mail,
  Building,
  Briefcase,
  Sparkles,
  MessageSquareQuote,
  Palette,
  Folder,
  Star,
  Heart,
  Bookmark,
  Layers,
  FileText,
  DollarSign,
  Percent,
  Check,
  Zap,
  Globe,
  Award,
  Pin,
  HelpCircle,
} from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export const ICONES_MAPA: Record<string, React.ElementType> = {
  Type,
  Hash,
  Calendar,
  CheckSquare,
  ListTodo,
  Tags,
  Link: LinkIcon,
  User,
  Clock,
  Flag,
  Timer,
  Phone,
  Mail,
  Building,
  Briefcase,
  Sparkles,
  MessageSquareQuote,
  Palette,
  Folder,
  Star,
  Heart,
  Bookmark,
  Layers,
  FileText,
  DollarSign,
  Percent,
  Zap,
  Globe,
  Award,
  Pin,
  HelpCircle,
};

export const CORES_ICONE = [
  { id: "padrao", nome: "Padrão", classe: "text-muted-foreground", bg: "bg-stone-500" },
  { id: "azul", nome: "Azul", classe: "text-blue-500", bg: "bg-blue-500" },
  { id: "verde", nome: "Verde", classe: "text-emerald-500", bg: "bg-emerald-500" },
  { id: "amarelo", nome: "Amarelo", classe: "text-amber-500", bg: "bg-amber-500" },
  { id: "laranja", nome: "Laranja", classe: "text-orange-500", bg: "bg-orange-500" },
  { id: "vermelho", nome: "Vermelho", classe: "text-rose-500", bg: "bg-rose-500" },
  { id: "roxo", nome: "Roxo", classe: "text-purple-500", bg: "bg-purple-500" },
  { id: "rosa", nome: "Rosa", classe: "text-pink-500", bg: "bg-pink-500" },
  { id: "indigo", nome: "Índigo", classe: "text-indigo-500", bg: "bg-indigo-500" },
  { id: "ciano", nome: "Ciano", classe: "text-cyan-500", bg: "bg-cyan-500" },
];

interface SeletorIconePropriedadeProps {
  iconeAtual?: string;
  corAtual?: string;
  aoMudarIcone: (novoIcone: string) => void;
  aoMudarCor: (novaCor: string) => void;
  children: React.ReactNode;
}

export function SeletorIconePropriedade({
  iconeAtual = "Type",
  corAtual = "padrao",
  aoMudarIcone,
  aoMudarCor,
  children,
}: SeletorIconePropriedadeProps) {
  const [aberto, setAberto] = React.useState(false);

  return (
    <Popover open={aberto} onOpenChange={setAberto}>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent
        className="w-64 p-2.5 shadow-2xl border-border space-y-2.5"
        align="start"
        onInteractOutside={() => setAberto(false)}
      >
        <div>
          <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">
            Cor do Ícone
          </span>
          <div className="flex items-center gap-1.5 flex-wrap">
            {CORES_ICONE.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => aoMudarCor(c.id)}
                title={c.nome}
                className={cn(
                  "w-5 h-5 rounded-full border border-border/80 flex items-center justify-center transition-transform hover:scale-110",
                  c.bg,
                  corAtual === c.id && "ring-2 ring-primary ring-offset-1 ring-offset-background"
                )}
              >
                {corAtual === c.id && <Check size={10} className="text-white drop-shadow" />}
              </button>
            ))}
          </div>
        </div>

        <div className="border-t border-border/50 pt-2">
          <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">
            Escolher Ícone
          </span>
          <div className="grid grid-cols-6 gap-1 max-h-44 overflow-y-auto pr-1">
            {Object.entries(ICONES_MAPA).map(([nomeIcone, IconComp]) => {
              const selecionado = iconeAtual === nomeIcone;
              return (
                <button
                  key={nomeIcone}
                  type="button"
                  onClick={() => {
                    aoMudarIcone(nomeIcone);
                    setAberto(false);
                  }}
                  title={nomeIcone}
                  className={cn(
                    "h-8 w-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent transition-colors cursor-pointer",
                    selecionado && "bg-primary/15 text-primary ring-1 ring-primary/40 font-bold"
                  )}
                >
                  <IconComp size={15} />
                </button>
              );
            })}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
