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

/**
 * Resolve o ícone padrão mais expressivo e representativo para a propriedade,
 * analisando o nome da chave e o tipo de dados.
 */
export function obterIconePadraoPropriedade(chave: string, tipo?: string): string {
  const c = chave.toLowerCase().replace(/[-_]/g, "");

  // Mapeamentos por nome semântico da chave
  if (c.includes("prazo") || c.includes("data") || c.includes("vencimento") || c.includes("due") || c.includes("date")) return "Calendar";
  if (c.includes("status") || c.includes("estado") || c.includes("fase") || c.includes("etapa")) return "ListTodo";
  if (c.includes("prioridade") || c.includes("prio") || c.includes("urgencia") || c.includes("urgente")) return "Flag";
  if (c.includes("tag") || c.includes("etiqueta") || c.includes("categoria") || c.includes("label")) return "Tags";
  if (c.includes("paleta") || c.includes("cor") || c.includes("cores") || c.includes("palette")) return "Palette";
  if (c.includes("relac") || c.includes("vinculo") || c.includes("conex") || c.includes("link") || c.includes("backlink")) return "Link";
  if (c.includes("email") || c.includes("mail")) return "Mail";
  if (c.includes("tel") || c.includes("fone") || c.includes("phone") || c.includes("celular") || c.includes("whatsapp")) return "Phone";
  if (c.includes("cargo") || c.includes("funcao") || c.includes("profissao") || c.includes("role") || c.includes("job")) return "Briefcase";
  if (c.includes("empresa") || c.includes("company") || c.includes("organizacao") || c.includes("orgao")) return "Building";
  if (c.includes("autor") || c.includes("responsavel") || c.includes("pessoa") || c.includes("user") || c.includes("contato") || c.includes("membro") || c.includes("participante") || c.includes("criadopor")) return "User";
  if (c.includes("impacto") || c.includes("ia") || c.includes("elogio") || c.includes("destaque") || c.includes("brag")) return "Sparkles";
  if (c.includes("meta") || c.includes("objetivo") || c.includes("target") || c.includes("alvo") || c.includes("okr")) return "Award";
  if (c.includes("tempo") || c.includes("duracao") || c.includes("pomodoro") || c.includes("timer") || c.includes("minutos") || c.includes("horas")) return "Timer";
  if (c.includes("criado") || c.includes("atualizado") || c.includes("edicao") || c.includes("hora") || c.includes("clock")) return "Clock";
  if (c.includes("preco") || c.includes("valor") || c.includes("custo") || c.includes("orcamento") || c.includes("moeda") || c.includes("dinheiro") || c.includes("receita") || c.includes("gasto")) return "DollarSign";
  if (c.includes("porcentagem") || c.includes("percentual") || c.includes("progresso") || c.includes("conclusao") || c.includes("taxa")) return "Percent";
  if (c.includes("site") || c.includes("web") || c.includes("fonte") || c.includes("url") || c.includes("dominio") || c.includes("linkexterno")) return "Globe";
  if (c.includes("pasta") || c.includes("caminho") || c.includes("diretorio") || c.includes("folder")) return "Folder";
  if (c.includes("documento") || c.includes("doc") || c.includes("arquivo") || c.includes("anexo") || c.includes("resumo") || c.includes("briefing") || c.includes("ata") || c.includes("conteudo")) return "FileText";
  if (c.includes("citacao") || c.includes("quote") || c.includes("frase") || c.includes("depoimento")) return "MessageSquareQuote";
  if (c.includes("favorito") || c.includes("star") || c.includes("estrela")) return "Star";
  if (c.includes("curtida") || c.includes("heart") || c.includes("gostei") || c.includes("amor")) return "Heart";
  if (c.includes("fixado") || c.includes("pin") || c.includes("alfinete")) return "Pin";
  if (c.includes("camada") || c.includes("secao") || c.includes("grupo")) return "Layers";
  if (c.includes("feito") || c.includes("concluido") || c.includes("marcado") || c.includes("aprovado") || c.includes("check")) return "CheckSquare";
  if (c.includes("qtd") || c.includes("quantidade") || c.includes("total") || c.includes("numero") || c.includes("num") || c.includes("ranking") || c.includes("ordem") || c.includes("id")) return "Hash";

  // Mapeamentos de fallback por tipo de propriedade
  if (tipo === "data") return "Calendar";
  if (tipo === "numero") return "Hash";
  if (tipo === "status") return "ListTodo";
  if (tipo === "checkbox") return "CheckSquare";
  if (tipo === "select") return "ListTodo";
  if (tipo === "multiselect") return "Tags";
  if (tipo === "relation") return "Link";
  if (tipo === "criado_por") return "User";
  if (tipo === "criado_em" || tipo === "ultima_edicao") return "Clock";

  return "Type";
}

/**
 * Resolve a cor padrão temática para a propriedade caso não tenha sido personalizada.
 */
export function obterCorPadraoPropriedade(chave: string, tipo?: string): string {
  const c = chave.toLowerCase().replace(/[-_]/g, "");

  if (c.includes("prazo") || c.includes("vencimento") || c.includes("urgente")) return "vermelho";
  if (c.includes("prioridade") || c.includes("impacto") || c.includes("elogio") || c.includes("star")) return "amarelo";
  if (c.includes("status") || c.includes("estado") || c.includes("cargo") || c.includes("fonte") || c.includes("link")) return "azul";
  if (c.includes("tag") || c.includes("categoria") || c.includes("valor") || c.includes("preco") || c.includes("aprovado") || c.includes("feito")) return "verde";
  if (c.includes("relac") || c.includes("vinculo") || c.includes("ia")) return "roxo";
  if (c.includes("email") || c.includes("contato") || c.includes("user")) return "indigo";
  if (c.includes("paleta") || c.includes("cor")) return "rosa";
  if (c.includes("tempo") || c.includes("pomodoro") || c.includes("timer")) return "laranja";

  if (tipo === "data") return "azul";
  if (tipo === "status") return "azul";
  if (tipo === "multiselect") return "verde";
  if (tipo === "relation") return "roxo";

  return "padrao";
}

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
