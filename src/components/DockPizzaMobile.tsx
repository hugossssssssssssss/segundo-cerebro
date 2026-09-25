import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  X,
  Layers,
  Scissors,
  FileArchive,
  Crop,
  Lock,
  FileCheck,
  Camera,
  Image as ImageIcon,
  FileText,
  Volume2,
  Download,
  Layout,
  Headphones,
  Target,
  Sparkles,
  Mic,
  Network,
  FolderTree,
  Settings,
  Moon,
  CheckSquare,
  PlusCircle,
  FilePlus,
  Sliders,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { alternarTema } from "@/lib/tema";

export interface FuncaoRapida {
  id: string;
  rotulo: string;
  subtitulo: string;
  rota?: string;
  corHex: string;
  bgClasse: string;
  Icone: any;
  acao?: () => void;
}

export interface CategoriaFerramenta {
  id: string;
  nome: string;
  subtitulo: string;
  corClasse: string;
  iconeClasse: string;
  Icone: any;
  funcoes: FuncaoRapida[];
}

interface DockPizzaMobileProps {
  aberto: boolean;
  aoFechar: () => void;
}

export function DockPizzaMobile({ aberto, aoFechar }: DockPizzaMobileProps) {
  const navegar = useNavigate();
  const [categoriaAtivaId, setCategoriaAtivaId] = useState<string>("pdf");
  const fechandoPorPopstateRef = useRef(false);

  // Categorias de ferramentas com suas funções rápidas dedicadas
  const categorias: CategoriaFerramenta[] = [
    {
      id: "pdf",
      nome: "Ferramentas PDF",
      subtitulo: "Mesclar, dividir, comprimir e digitalizar",
      corClasse: "text-red-500",
      iconeClasse: "bg-red-500/15 text-red-500 border-red-500/30",
      Icone: Layers,
      funcoes: [
        {
          id: "juntar-pdf",
          rotulo: "Juntar PDFs",
          subtitulo: "Mesclar múltiplos arquivos em um único PDF",
          rota: "/pdf?aba=juntar",
          corHex: "#ef4444",
          bgClasse: "bg-red-500/15 text-red-500 border-red-500/25",
          Icone: Layers,
        },
        {
          id: "dividir-pdf",
          rotulo: "Dividir PDF",
          subtitulo: "Separar páginas em arquivos individuais",
          rota: "/pdf?aba=dividir",
          corHex: "#f97316",
          bgClasse: "bg-orange-500/15 text-orange-500 border-orange-500/25",
          Icone: Scissors,
        },
        {
          id: "comprimir-pdf",
          rotulo: "Comprimir PDF",
          subtitulo: "Reduzir tamanho sem perder qualidade legível",
          rota: "/pdf?aba=comprimir",
          corHex: "#f59e0b",
          bgClasse: "bg-amber-500/15 text-amber-500 border-amber-500/25",
          Icone: FileArchive,
        },
        {
          id: "scanner-pdf",
          rotulo: "Scanner / Foto PDF",
          subtitulo: "Digitalizar folhas físicas com a câmera do celular",
          rota: "/pdf?aba=digitalizar",
          corHex: "#a855f7",
          bgClasse: "bg-purple-500/15 text-purple-500 border-purple-500/25",
          Icone: Camera,
        },
        {
          id: "recortar-pdf",
          rotulo: "Recortar Páginas",
          subtitulo: "Extrair trecho específico de documento",
          rota: "/pdf?aba=recortar",
          corHex: "#10b981",
          bgClasse: "bg-emerald-500/15 text-emerald-500 border-emerald-500/25",
          Icone: Crop,
        },
        {
          id: "desbloquear-pdf",
          rotulo: "Desbloquear PDF",
          subtitulo: "Remover proteção ou senha de arquivo PDF",
          rota: "/pdf?aba=desbloquear",
          corHex: "#64748b",
          bgClasse: "bg-slate-500/15 text-slate-400 border-slate-500/25",
          Icone: Lock,
        },
        {
          id: "organizar-pdf",
          rotulo: "Organizar Páginas",
          subtitulo: "Reordenar, girar e organizar sequência",
          rota: "/pdf?aba=organizar",
          corHex: "#3b82f6",
          bgClasse: "bg-blue-500/15 text-blue-500 border-blue-500/25",
          Icone: FileCheck,
        },
      ],
    },
    {
      id: "midia",
      nome: "Imagens & Mídia",
      subtitulo: "Conversor, extrator de áudio e referências",
      corClasse: "text-cyan-500",
      iconeClasse: "bg-cyan-500/15 text-cyan-500 border-cyan-500/30",
      Icone: ImageIcon,
      funcoes: [
        {
          id: "converter-imagens",
          rotulo: "Converter Imagens",
          subtitulo: "PNG, JPG, WebP, SVG e outros formatos",
          rota: "/conversor?tipo=imagem",
          corHex: "#06b6d4",
          bgClasse: "bg-cyan-500/15 text-cyan-500 border-cyan-500/25",
          Icone: ImageIcon,
        },
        {
          id: "converter-documentos",
          rotulo: "Converter Documentos",
          subtitulo: "PDF, Word, Markdown, Texto e EPUB",
          rota: "/conversor?tipo=documento",
          corHex: "#0ea5e9",
          bgClasse: "bg-sky-500/15 text-sky-500 border-sky-500/25",
          Icone: FileText,
        },
        {
          id: "extrair-audio",
          rotulo: "Extrair Áudio",
          subtitulo: "Salvar áudio MP3 de vídeos",
          rota: "/conversor?tipo=audio",
          corHex: "#8b5cf6",
          bgClasse: "bg-violet-500/15 text-violet-500 border-violet-500/25",
          Icone: Volume2,
        },
        {
          id: "baixador-midia",
          rotulo: "Baixador de Mídia",
          subtitulo: "Baixar vídeos do Instagram, YouTube e TikTok",
          rota: "/baixador",
          corHex: "#eab308",
          bgClasse: "bg-yellow-500/15 text-yellow-500 border-yellow-500/25",
          Icone: Download,
        },
        {
          id: "referencias-mural",
          rotulo: "Mural de Referências",
          subtitulo: "Mural visual de inspirações e design",
          rota: "/referencias",
          corHex: "#ec4899",
          bgClasse: "bg-pink-500/15 text-pink-500 border-pink-500/25",
          Icone: ImageIcon,
        },
      ],
    },
    {
      id: "produtividade",
      nome: "Tarefas & Foco",
      subtitulo: "Organização diária, lousas e sons",
      corClasse: "text-amber-500",
      iconeClasse: "bg-amber-500/15 text-amber-500 border-amber-500/30",
      Icone: CheckSquare,
      funcoes: [
        {
          id: "ver-tarefas",
          rotulo: "Minhas Tarefas",
          subtitulo: "Acessar quadro de tarefas e prazos",
          rota: "/tarefas",
          corHex: "#f59e0b",
          bgClasse: "bg-amber-500/15 text-amber-500 border-amber-500/25",
          Icone: CheckSquare,
        },
        {
          id: "nova-tarefa",
          rotulo: "Nova Tarefa Rápida",
          subtitulo: "Criar uma tarefa imediatamente",
          corHex: "#10b981",
          bgClasse: "bg-emerald-500/15 text-emerald-500 border-emerald-500/25",
          Icone: PlusCircle,
          acao: () => {
            navegar("/tarefas");
            setTimeout(() => {
              window.dispatchEvent(new CustomEvent("klaus-acao-criar-dock"));
            }, 100);
          },
        },
        {
          id: "sons-foco",
          rotulo: "Sons de Foco",
          subtitulo: "Chuva, cafeteria, ruído branco e timer",
          rota: "/sons",
          corHex: "#14b8a6",
          bgClasse: "bg-teal-500/15 text-teal-500 border-teal-500/25",
          Icone: Headphones,
        },
        {
          id: "lousas-canvas",
          rotulo: "Lousas & Esboços",
          subtitulo: "Desenho livre e diagramas no Excalidraw",
          rota: "/lousas",
          corHex: "#f43f5e",
          bgClasse: "bg-rose-500/15 text-rose-500 border-rose-500/25",
          Icone: Layout,
        },
        {
          id: "transcritor-voz",
          rotulo: "Transcrição de Voz",
          subtitulo: "Gravar voz e converter em texto limpo",
          rota: "/transcritor",
          corHex: "#8b5cf6",
          bgClasse: "bg-violet-500/15 text-violet-500 border-violet-500/25",
          Icone: Mic,
        },
      ],
    },
    {
      id: "notas",
      nome: "Notas & Conexões",
      subtitulo: "Anotações, grafo neural e equipe",
      corClasse: "text-blue-500",
      iconeClasse: "bg-blue-500/15 text-blue-500 border-blue-500/30",
      Icone: FileText,
      funcoes: [
        {
          id: "todas-notas",
          rotulo: "Todas as Notas",
          subtitulo: "Ver suas anotações e documentos",
          rota: "/notas",
          corHex: "#3b82f6",
          bgClasse: "bg-blue-500/15 text-blue-500 border-blue-500/25",
          Icone: FileText,
        },
        {
          id: "nova-nota",
          rotulo: "Criar Nova Nota",
          subtitulo: "Abrir documento em branco agora",
          corHex: "#06b6d4",
          bgClasse: "bg-cyan-500/15 text-cyan-500 border-cyan-500/25",
          Icone: FilePlus,
          acao: () => {
            navegar("/notas");
            setTimeout(() => {
              window.dispatchEvent(new CustomEvent("klaus-acao-criar-dock"));
            }, 100);
          },
        },
        {
          id: "grafo-links",
          rotulo: "Grafo Neural",
          subtitulo: "Visualizar rede de notas interconectadas",
          rota: "/grafo",
          corHex: "#6366f1",
          bgClasse: "bg-indigo-500/15 text-indigo-500 border-indigo-500/25",
          Icone: Network,
        },
        {
          id: "contatos-arvore",
          rotulo: "Árvore de Contatos",
          subtitulo: "Equipe, parceiros e clientes",
          rota: "/contatos",
          corHex: "#10b981",
          bgClasse: "bg-emerald-500/15 text-emerald-500 border-emerald-500/25",
          Icone: FolderTree,
        },
      ],
    },
    {
      id: "pdi",
      nome: "Carreira & PDI",
      subtitulo: "Metas de carreira e evolução",
      corClasse: "text-emerald-500",
      iconeClasse: "bg-emerald-500/15 text-emerald-500 border-emerald-500/30",
      Icone: Target,
      funcoes: [
        {
          id: "painel-pdi",
          rotulo: "Painel do PDI",
          subtitulo: "Acompanhar metas e plano de evolução",
          rota: "/pdi",
          corHex: "#10b981",
          bgClasse: "bg-emerald-500/15 text-emerald-500 border-emerald-500/25",
          Icone: Target,
        },
        {
          id: "nova-entrega",
          rotulo: "Nova Conquista",
          subtitulo: "Registrar entrega de valor para seu PDI",
          rota: "/pdi?acao=entrega",
          corHex: "#f59e0b",
          bgClasse: "bg-amber-500/15 text-amber-500 border-amber-500/25",
          Icone: Sparkles,
        },
      ],
    },
    {
      id: "sistema",
      nome: "Ajustes & Sistema",
      subtitulo: "Preferências, tema e conexão",
      corClasse: "text-violet-500",
      iconeClasse: "bg-violet-500/15 text-violet-500 border-violet-500/30",
      Icone: Settings,
      funcoes: [
        {
          id: "ajustes-gerais",
          rotulo: "Ajustes do Klaus",
          subtitulo: "Configurar token GitHub e chave IA Gemini",
          rota: "/config",
          corHex: "#71717a",
          bgClasse: "bg-zinc-500/15 text-zinc-300 border-zinc-500/25",
          Icone: Sliders,
        },
        {
          id: "alternar-tema",
          rotulo: "Alternar Tema",
          subtitulo: "Trocar instantaneamente Claro / Escuro",
          corHex: "#f59e0b",
          bgClasse: "bg-amber-500/15 text-amber-400 border-amber-500/25",
          Icone: Moon,
          acao: () => {
            alternarTema();
          },
        },
      ],
    },
  ];

  // Intercepta o botão voltar nativo do Android para fechar o menu sem sair da tela
  useEffect(() => {
    if (!aberto) return;

    fechandoPorPopstateRef.current = false;
    window.history.pushState({ modalPizzaAberto: true }, "");

    const lidarPopstate = () => {
      fechandoPorPopstateRef.current = true;
      aoFechar();
    };

    window.addEventListener("popstate", lidarPopstate);
    document.body.style.overflow = "hidden";

    return () => {
      window.removeEventListener("popstate", lidarPopstate);
      document.body.style.overflow = "";

      // Se fechou sem ser pelo botão voltar do aparelho, desfaz o pushState
      if (!fechandoPorPopstateRef.current && window.history.state?.modalPizzaAberto) {
        window.history.back();
      }
    };
  }, [aberto, aoFechar]);

  if (!aberto) return null;

  const fecharMenu = () => {
    fechandoPorPopstateRef.current = true;
    if (window.history.state?.modalPizzaAberto) {
      window.history.back();
    }
    aoFechar();
  };

  // Executa a função rápida diretamente sem travar a navegação
  const executarFuncao = (funcao: FuncaoRapida) => {
    // Fecha o modal
    fecharMenu();

    // Executa a ação ou navega
    if (funcao.acao) {
      funcao.acao();
    } else if (funcao.rota) {
      navegar(funcao.rota);
    }
  };

  const categoriaAtiva =
    categorias.find((c) => c.id === categoriaAtivaId) || categorias[0];

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end sm:hidden select-none">
      {/* 1. Backdrop escurecedor cinematográfico */}
      <div
        onClick={fecharMenu}
        className="fixed inset-0 bg-black/80 backdrop-blur-md transition-opacity duration-300 animate-in fade-in"
      />

      {/* 
        2. DOCK ESTILO PIZZA:
        - Maior na parte de cima (largura 96vw, cantos bem arredondados)
        - Menor na parte de baixo (afunilando suavemente em direção ao botão de menu)
        - Cantos arredondados e acabamento fluido
      */}
      <div className="relative z-10 w-full max-w-md mx-auto flex flex-col items-center animate-in slide-in-from-bottom duration-300 ease-out px-2 pb-[max(env(safe-area-inset-bottom),12px)]">
        {/* Container em formato de leque/pizza */}
        <div className="w-full flex flex-col items-center">
          {/* TOPO DA PIZZA (Mais largo) */}
          <div className="w-[96vw] max-w-md bg-card/95 dark:bg-zinc-950/95 backdrop-blur-2xl border-t border-x border-border/80 dark:border-white/10 rounded-t-[38px] shadow-2xl pt-3 px-4 pb-2">
            {/* Alça tátil de puxar para fechar */}
            <div
              onClick={fecharMenu}
              className="w-12 h-1.5 rounded-full bg-muted-foreground/30 hover:bg-muted-foreground/50 mx-auto mb-2.5 cursor-pointer"
            />

            {/* Cabeçalho do Menu com botão fechar */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="text-lg">🍕</span>
                <div>
                  <h3 className="text-xs font-bold text-foreground leading-tight">
                    Menu Pizza do Klaus
                  </h3>
                  <p className="text-[10px] text-muted-foreground">
                    Deslize para o lado para escolher a ferramenta
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={fecharMenu}
                className="h-7 w-7 rounded-full bg-secondary/80 text-muted-foreground hover:text-foreground flex items-center justify-center active:scale-90 transition-transform cursor-pointer"
                aria-label="Fechar"
              >
                <X size={15} />
              </button>
            </div>

            {/* 
              3. BARRA HORIZONTAL FLUIDA ("AO PASSAR O DEDO PRO LADO")
              Carrossel horizontal com as ferramentas principais
            */}
            <div className="overflow-x-auto no-scrollbar scroll-smooth flex items-center gap-2 py-1 -mx-2 px-2 touch-pan-x">
              {categorias.map((cat) => {
                const ativa = cat.id === categoriaAtivaId;
                const Icone = cat.Icone;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setCategoriaAtivaId(cat.id)}
                    className={cn(
                      "flex items-center gap-2 py-2 px-3.5 rounded-2xl whitespace-nowrap text-xs font-bold transition-all duration-200 cursor-pointer active:scale-95 shrink-0 border",
                      ativa
                        ? "bg-primary text-primary-foreground border-primary shadow-md"
                        : "bg-secondary/40 text-muted-foreground hover:text-foreground hover:bg-secondary/70 border-border/40"
                    )}
                  >
                    <Icone size={15} className={cn("shrink-0", ativa ? "text-primary-foreground" : cat.corClasse)} />
                    <span>{cat.nome}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 
            4. CORPO DAS FUNÇÕES RÁPIDAS (ABAIXO DO NOME DE CADA FERRAMENTA)
            Largura proporcional de transição
          */}
          <div className="w-[92vw] max-w-[calc(100%-16px)] bg-card/95 dark:bg-zinc-950/95 backdrop-blur-2xl border-x border-border/80 dark:border-white/10 px-3.5 py-3 max-h-[50vh] overflow-y-auto no-scrollbar">
            {/* Título da ferramenta selecionada e subtítulo explicativo */}
            <div className="flex items-center justify-between gap-2 pb-2.5 mb-2 border-b border-border/40">
              <div className="flex items-center gap-2">
                <div
                  className={cn(
                    "h-7 w-7 rounded-xl flex items-center justify-center border shadow-xs shrink-0",
                    categoriaAtiva.iconeClasse
                  )}
                >
                  <categoriaAtiva.Icone size={15} />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-foreground leading-tight">
                    {categoriaAtiva.nome}
                  </h4>
                  <p className="text-[10px] text-muted-foreground leading-tight">
                    {categoriaAtiva.subtitulo}
                  </p>
                </div>
              </div>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-secondary/80 text-muted-foreground">
                {categoriaAtiva.funcoes.length} funções
              </span>
            </div>

            {/* Lista das funções rápidas abaixo do nome da ferramenta */}
            <div className="flex flex-col gap-1.5 pb-2">
              {categoriaAtiva.funcoes.map((funcao) => {
                const IconeFuncao = funcao.Icone;
                return (
                  <button
                    key={funcao.id}
                    type="button"
                    onClick={() => executarFuncao(funcao)}
                    className="w-full flex items-center justify-between p-2.5 rounded-2xl bg-secondary/30 hover:bg-secondary/70 active:scale-[0.98] border border-border/40 transition-all cursor-pointer group text-left"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div
                        className={cn(
                          "h-8 w-8 rounded-xl flex items-center justify-center border shadow-xs shrink-0 group-hover:scale-105 transition-transform",
                          funcao.bgClasse
                        )}
                      >
                        <IconeFuncao size={16} />
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-foreground leading-tight truncate">
                          {funcao.rotulo}
                        </div>
                        <div className="text-[10px] text-muted-foreground leading-tight truncate">
                          {funcao.subtitulo}
                        </div>
                      </div>
                    </div>

                    <ChevronRight
                      size={15}
                      className="text-muted-foreground/60 group-hover:text-foreground shrink-0 ml-2 transition-transform group-hover:translate-x-0.5"
                    />
                  </button>
                );
              })}
            </div>
          </div>

          {/* 
            5. BASE DA PIZZA (Mais estreita que o topo, afunilando)
            Conecta visualmente com a área do dedão
          */}
          <div className="w-[84vw] max-w-[calc(100%-48px)] bg-card/95 dark:bg-zinc-950/95 backdrop-blur-2xl border-b border-x border-border/80 dark:border-white/10 rounded-b-[28px] shadow-2xl py-2 flex items-center justify-center">
            <button
              type="button"
              onClick={fecharMenu}
              className="text-xs font-semibold text-muted-foreground hover:text-foreground py-1 px-5 rounded-full bg-secondary/50 active:scale-95 transition-all"
            >
              Fechar menu
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
