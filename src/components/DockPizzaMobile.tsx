import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  X,
  FileCheck,
  CheckSquare,
  FileText,
  Image as ImageIcon,
  Target,
  RefreshCw,
  Download,
  Layout,
  Headphones,
  Settings,
  ChevronRight,
  Plus,
  Scissors,
  Layers,
  Crop,
  Lock,
  Camera,
  Calendar,
  Sparkles,
  Moon,
  Volume2,
  Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { alternarTema } from "@/lib/tema";

export interface FuncaoRapida {
  rotulo: string;
  subtitulo?: string;
  rota?: string;
  icone: React.ReactNode;
  acao?: () => void;
}

export interface CategoriaPizza {
  id: string;
  nome: string;
  descricao: string;
  cor: string;
  bgCor: string;
  Icone: any;
  funcoes: FuncaoRapida[];
}

interface DockPizzaMobileProps {
  aberto: boolean;
  aoFechar: () => void;
}

export function DockPizzaMobile({ aberto, aoFechar }: DockPizzaMobileProps) {
  const navegar = useNavigate();
  const carrosselRef = useRef<HTMLDivElement>(null);
  const [categoriaAtivaId, setCategoriaAtivaId] = useState<string>("pdf");

  const categorias: CategoriaPizza[] = [
    {
      id: "pdf",
      nome: "Ferramentas PDF",
      descricao: "Juntar, dividir, comprimir e digitalizar",
      cor: "#ef4444",
      bgCor: "bg-red-500/10 text-red-500 border-red-500/30",
      Icone: FileCheck,
      funcoes: [
        {
          rotulo: "Juntar PDFs",
          subtitulo: "Mesclar múltiplos documentos",
          rota: "/pdf?aba=juntar",
          icone: <Layers size={16} className="text-red-400" />,
        },
        {
          rotulo: "Dividir PDF",
          subtitulo: "Separar páginas em arquivos",
          rota: "/pdf?aba=dividir",
          icone: <Scissors size={16} className="text-orange-400" />,
        },
        {
          rotulo: "Comprimir PDF",
          subtitulo: "Reduzir o tamanho do arquivo",
          rota: "/pdf?aba=comprimir",
          icone: <RefreshCw size={16} className="text-amber-400" />,
        },
        {
          rotulo: "Recortar / Páginas",
          subtitulo: "Extrair trechos específicos",
          rota: "/pdf?aba=recortar",
          icone: <Crop size={16} className="text-emerald-400" />,
        },
        {
          rotulo: "Organizar Páginas",
          subtitulo: "Reordenar e girar páginas",
          rota: "/pdf?aba=organizar",
          icone: <FileCheck size={16} className="text-blue-400" />,
        },
        {
          rotulo: "Digitalizar / Scanner",
          subtitulo: "Capturar documento com a câmera",
          rota: "/pdf?aba=digitalizar",
          icone: <Camera size={16} className="text-purple-400" />,
        },
        {
          rotulo: "Desbloquear PDF",
          subtitulo: "Remover senha e restrições",
          rota: "/pdf?aba=desbloquear",
          icone: <Lock size={16} className="text-zinc-400" />,
        },
      ],
    },
    {
      id: "tarefas",
      nome: "Tarefas & Prazos",
      descricao: "Kanban diário, prazos e prioridades",
      cor: "#3b82f6",
      bgCor: "bg-blue-500/10 text-blue-500 border-blue-500/30",
      Icone: CheckSquare,
      funcoes: [
        {
          rotulo: "Quadro Kanban",
          subtitulo: "Ver fluxo A Fazer, Fazendo, Feito",
          rota: "/tarefas",
          icone: <CheckSquare size={16} className="text-blue-400" />,
        },
        {
          rotulo: "Calendário de Prazos",
          subtitulo: "Visualizar tarefas no mês",
          rota: "/tarefas?visao=calendario",
          icone: <Calendar size={16} className="text-cyan-400" />,
        },
        {
          rotulo: "Tarefas de Hoje",
          subtitulo: "Focar no que vence hoje",
          rota: "/tarefas?filtro=hoje",
          icone: <Sparkles size={16} className="text-amber-400" />,
        },
        {
          rotulo: "Nova Tarefa",
          subtitulo: "Criar uma tarefa no dedo",
          rota: "/tarefas?acao=nova",
          icone: <Plus size={16} className="text-emerald-400" />,
        },
      ],
    },
    {
      id: "notas",
      nome: "Notas & Conhecimento",
      descricao: "Segundo cérebro, links e anotações",
      cor: "#eab308",
      bgCor: "bg-yellow-500/10 text-yellow-500 border-yellow-500/30",
      Icone: FileText,
      funcoes: [
        {
          rotulo: "Todas as Notas",
          subtitulo: "Explorar seu acervo",
          rota: "/notas",
          icone: <FileText size={16} className="text-yellow-400" />,
        },
        {
          rotulo: "Nova Nota",
          subtitulo: "Começar uma nova anotação",
          rota: "/notas?acao=nova",
          icone: <Plus size={16} className="text-emerald-400" />,
        },
        {
          rotulo: "Lixeira",
          subtitulo: "Documentos apagados",
          rota: "/lixeira",
          icone: <Trash2 size={16} className="text-rose-400" />,
        },
      ],
    },
    {
      id: "referencias",
      nome: "Referências Visuais",
      descricao: "Mural de design, fotos e cores",
      cor: "#a855f7",
      bgCor: "bg-purple-500/10 text-purple-500 border-purple-500/30",
      Icone: ImageIcon,
      funcoes: [
        {
          rotulo: "Mural de Inspiração",
          subtitulo: "Ver todas as referências",
          rota: "/referencias",
          icone: <ImageIcon size={16} className="text-purple-400" />,
        },
        {
          rotulo: "Nova Referência",
          subtitulo: "Adicionar imagem ou link",
          rota: "/referencias?acao=nova",
          icone: <Plus size={16} className="text-emerald-400" />,
        },
        {
          rotulo: "Tirar Foto no Celular",
          subtitulo: "Fotografar com a câmera",
          rota: "/referencias?camera=1",
          icone: <Camera size={16} className="text-pink-400" />,
        },
      ],
    },
    {
      id: "pdi",
      nome: "Carreira (PDI)",
      descricao: "Metas de carreira e conquistas",
      cor: "#10b981",
      bgCor: "bg-emerald-500/10 text-emerald-500 border-emerald-500/30",
      Icone: Target,
      funcoes: [
        {
          rotulo: "Visão Geral PDI",
          subtitulo: "Acompanhar progresso",
          rota: "/pdi",
          icone: <Target size={16} className="text-emerald-400" />,
        },
        {
          rotulo: "Nova Meta",
          subtitulo: "Definir novo objetivo",
          rota: "/pdi?acao=meta",
          icone: <Plus size={16} className="text-cyan-400" />,
        },
        {
          rotulo: "Nova Conquista",
          subtitulo: "Registrar entrega de valor",
          rota: "/pdi?acao=entrega",
          icone: <Sparkles size={16} className="text-yellow-400" />,
        },
      ],
    },
    {
      id: "conversor",
      nome: "Conversor de Mídia",
      descricao: "Converter imagens, docs e áudios",
      cor: "#06b6d4",
      bgCor: "bg-cyan-500/10 text-cyan-500 border-cyan-500/30",
      Icone: RefreshCw,
      funcoes: [
        {
          rotulo: "Converter Imagens",
          subtitulo: "PNG, JPG, WebP, SVG",
          rota: "/conversor",
          icone: <ImageIcon size={16} className="text-cyan-400" />,
        },
        {
          rotulo: "Converter Documentos",
          subtitulo: "PDF, TXT, Markdown",
          rota: "/conversor",
          icone: <FileText size={16} className="text-blue-400" />,
        },
      ],
    },
    {
      id: "baixador",
      nome: "Baixador de Mídia",
      descricao: "Download de vídeos e áudios da web",
      cor: "#f59e0b",
      bgCor: "bg-amber-500/10 text-amber-500 border-amber-500/30",
      Icone: Download,
      funcoes: [
        {
          rotulo: "Baixar Vídeo / Áudio",
          subtitulo: "Cole o link para baixar",
          rota: "/baixador",
          icone: <Download size={16} className="text-amber-400" />,
        },
      ],
    },
    {
      id: "lousas",
      nome: "Lousas Visuais",
      descricao: "Desenho livre e diagramas infinitos",
      cor: "#ec4899",
      bgCor: "bg-pink-500/10 text-pink-500 border-pink-500/30",
      Icone: Layout,
      funcoes: [
        {
          rotulo: "Ver Lousas",
          subtitulo: "Seus esboços e diagramas",
          rota: "/lousas",
          icone: <Layout size={16} className="text-pink-400" />,
        },
        {
          rotulo: "Nova Lousa",
          subtitulo: "Criar novo canvas Excalidraw",
          rota: "/lousas?acao=nova",
          icone: <Plus size={16} className="text-purple-400" />,
        },
      ],
    },
    {
      id: "sons",
      nome: "Sons de Foco",
      descricao: "Ruído branco, chuva e café",
      cor: "#14b8a6",
      bgCor: "bg-teal-500/10 text-teal-500 border-teal-500/30",
      Icone: Headphones,
      funcoes: [
        {
          rotulo: "Tocar Sons de Foco",
          subtitulo: "Ambientes sonoros para imersão",
          rota: "/sons",
          icone: <Volume2 size={16} className="text-teal-400" />,
        },
      ],
    },
    {
      id: "config",
      nome: "Ajustes & Sistema",
      descricao: "GitHub, tema, IA e preferências",
      cor: "#71717a",
      bgCor: "bg-zinc-500/10 text-zinc-400 border-zinc-500/30",
      Icone: Settings,
      funcoes: [
        {
          rotulo: "Configurações",
          subtitulo: "Tokens e preferências do Klaus",
          rota: "/config",
          icone: <Settings size={16} className="text-zinc-400" />,
        },
        {
          rotulo: "Alternar Tema Claro / Escuro",
          subtitulo: "Mudar o visual do app",
          icone: <Moon size={16} className="text-amber-400" />,
          acao: () => {
            alternarTema();
          },
        },
      ],
    },
  ];

  const categoriaAtiva =
    categorias.find((c) => c.id === categoriaAtivaId) || categorias[0];

  const executarFuncao = (funcao: FuncaoRapida) => {
    aoFechar();
    if (funcao.acao) {
      funcao.acao();
      return;
    }
    if (funcao.rota) {
      navegar(funcao.rota);
    }
  };

  // Garante que a ferramenta selecionada role suavemente para o centro da tela
  const selecionarCategoria = (id: string) => {
    setCategoriaAtivaId(id);
    const container = carrosselRef.current;
    if (container) {
      const elemento = container.querySelector(`[data-cat="${id}"]`) as HTMLElement;
      if (elemento) {
        elemento.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
      }
    }
  };

  // Travar o scroll de fundo enquanto o menu pizza está aberto
  useEffect(() => {
    if (aberto) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [aberto]);

  if (!aberto) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end sm:hidden select-none">
      {/* 1. Backdrop escurecedor cinematográfico com blur */}
      <div
        onClick={aoFechar}
        className="fixed inset-0 bg-black/75 backdrop-blur-md transition-opacity duration-300 animate-in fade-in"
      />

      {/* 2. Menu Pizza / Radial Bottom Sheet */}
      <div className="relative z-10 w-full rounded-t-[34px] bg-card/95 dark:bg-zinc-950/95 border-t border-border/70 dark:border-white/10 shadow-2xl pb-[max(env(safe-area-inset-bottom),18px)] pt-3 px-4 flex flex-col max-h-[85vh] animate-in slide-in-from-bottom duration-300 ease-out">
        {/* Alça tátil de puxar */}
        <div
          onClick={aoFechar}
          className="w-12 h-1.5 rounded-full bg-muted-foreground/30 hover:bg-muted-foreground/50 mx-auto mb-3 cursor-pointer transition-colors"
        />

        {/* Cabeçalho da Ferramenta Ativa */}
        <div className="flex items-center justify-between px-1 mb-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div
              className={cn(
                "h-9 w-9 rounded-xl flex items-center justify-center border shadow-xs shrink-0 transition-all",
                categoriaAtiva.bgCor
              )}
            >
              <categoriaAtiva.Icone size={18} />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-bold text-foreground truncate leading-tight">
                {categoriaAtiva.nome}
              </h3>
              <p className="text-[11px] text-muted-foreground truncate leading-tight">
                {categoriaAtiva.descricao}
              </p>
            </div>
          </div>

          <button
            onClick={aoFechar}
            className="h-8 w-8 rounded-full bg-secondary/80 text-muted-foreground hover:text-foreground flex items-center justify-center active:scale-90 transition-transform cursor-pointer"
            aria-label="Fechar menu"
          >
            <X size={16} />
          </button>
        </div>

        {/* 3. O Carrossel Radial / Fatias da Pizza - Deslizar com o dedo pro lado */}
        <div className="relative mb-4">
          <div
            ref={carrosselRef}
            className="flex items-center gap-2 overflow-x-auto py-1 px-1 no-scrollbar snap-x snap-mandatory scroll-smooth"
          >
            {categorias.map((cat) => {
              const ativa = cat.id === categoriaAtivaId;
              const IconeCat = cat.Icone;
              return (
                <button
                  key={cat.id}
                  data-cat={cat.id}
                  onClick={() => selecionarCategoria(cat.id)}
                  type="button"
                  className={cn(
                    "flex flex-col items-center justify-center gap-1.5 py-2 px-3 rounded-2xl transition-all snap-center shrink-0 min-w-[76px] cursor-pointer touch-manipulation active:scale-95 border",
                    ativa
                      ? "bg-primary text-primary-foreground font-bold shadow-lg scale-105 border-primary"
                      : "bg-secondary/40 text-muted-foreground hover:text-foreground hover:bg-secondary border-border/50"
                  )}
                >
                  <div
                    className={cn(
                      "h-10 w-10 rounded-xl flex items-center justify-center transition-all",
                      ativa
                        ? "bg-primary-foreground/20 text-primary-foreground"
                        : "bg-card dark:bg-zinc-900 text-foreground shadow-2xs"
                    )}
                  >
                    <IconeCat size={20} />
                  </div>
                  <span className="text-[10px] whitespace-nowrap tracking-tight font-medium">
                    {cat.nome.split(" ")[0]}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* 4. Lista de Funções Rápidas da Ferramenta Selecionada */}
        <div className="flex-1 overflow-y-auto no-scrollbar space-y-2 pr-0.5">
          <p className="text-[11px] font-semibold text-muted-foreground tracking-wider uppercase px-1">
            Funções Rápidas de {categoriaAtiva.nome}
          </p>

          <div className="grid grid-cols-1 gap-2 pb-2">
            {categoriaAtiva.funcoes.map((f, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => executarFuncao(f)}
                className="w-full flex items-center justify-between p-3 rounded-2xl bg-secondary/40 hover:bg-secondary/80 border border-border/60 text-left transition-all active:scale-[0.98] cursor-pointer group shadow-2xs"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="h-9 w-9 rounded-xl bg-card dark:bg-zinc-900 border border-border/60 flex items-center justify-center shrink-0 shadow-2xs group-hover:scale-105 transition-transform">
                    {f.icone}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-foreground truncate group-hover:text-primary transition-colors">
                      {f.rotulo}
                    </p>
                    {f.subtitulo && (
                      <p className="text-[11px] text-muted-foreground truncate">
                        {f.subtitulo}
                      </p>
                    )}
                  </div>
                </div>

                <ChevronRight
                  size={15}
                  className="text-muted-foreground/60 group-hover:text-foreground group-hover:translate-x-0.5 transition-all shrink-0 ml-2"
                />
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
