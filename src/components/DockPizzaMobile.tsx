import { useState, useEffect } from "react";
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
  BookOpen,
  FileType,
  ArrowRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { alternarTema } from "@/lib/tema";

export interface FuncaoRapida {
  id: string;
  rotulo: string;
  subtitulo: string;
  rota?: string;
  bgClasse: string;
  Icone: any;
  acao?: () => void;
}

export interface CategoriaPizza {
  id: string;
  nome: string;
  descricao: string;
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

  // Ferramentas separadas do Klaus organizadas por categoria no leque da pizza
  const categorias: CategoriaPizza[] = [
    {
      id: "pdf",
      nome: "Ferramentas PDF",
      descricao: "Manipulação completa de arquivos PDF no navegador",
      corClasse: "text-red-500",
      iconeClasse: "bg-red-500/15 text-red-500 border-red-500/30",
      Icone: Layers,
      funcoes: [
        {
          id: "juntar-pdf",
          rotulo: "Juntar PDFs",
          subtitulo: "Mesclar múltiplos arquivos em um único PDF",
          rota: "/pdf?aba=juntar",
          bgClasse: "bg-red-500/15 text-red-500 border-red-500/30",
          Icone: Layers,
        },
        {
          id: "dividir-pdf",
          rotulo: "Dividir PDF",
          subtitulo: "Separar páginas em arquivos individuais",
          rota: "/pdf?aba=dividir",
          bgClasse: "bg-orange-500/15 text-orange-500 border-orange-500/30",
          Icone: Scissors,
        },
        {
          id: "comprimir-pdf",
          rotulo: "Comprimir PDF",
          subtitulo: "Reduzir tamanho mantendo legibilidade",
          rota: "/pdf?aba=comprimir",
          bgClasse: "bg-amber-500/15 text-amber-500 border-amber-500/30",
          Icone: FileArchive,
        },
        {
          id: "scanner-pdf",
          rotulo: "Scanner / Foto PDF",
          subtitulo: "Digitalizar folha com a câmera do celular",
          rota: "/pdf?aba=digitalizar",
          bgClasse: "bg-purple-500/15 text-purple-500 border-purple-500/30",
          Icone: Camera,
        },
        {
          id: "recortar-pdf",
          rotulo: "Recortar Páginas",
          subtitulo: "Extrair trecho específico de documento",
          rota: "/pdf?aba=recortar",
          bgClasse: "bg-emerald-500/15 text-emerald-500 border-emerald-500/30",
          Icone: Crop,
        },
        {
          id: "desbloquear-pdf",
          rotulo: "Desbloquear PDF",
          subtitulo: "Remover senha de arquivo PDF",
          rota: "/pdf?aba=desbloquear",
          bgClasse: "bg-slate-500/15 text-slate-400 border-slate-500/30",
          Icone: Lock,
        },
        {
          id: "organizar-pdf",
          rotulo: "Organizar Páginas",
          subtitulo: "Reordenar, girar e ajustar sequência",
          rota: "/pdf?aba=organizar",
          bgClasse: "bg-blue-500/15 text-blue-500 border-blue-500/30",
          Icone: FileCheck,
        },
      ],
    },
    {
      id: "conversor",
      nome: "Imagens & Conversor",
      descricao: "Conversão individual de formatos de imagem e documentos",
      corClasse: "text-cyan-500",
      iconeClasse: "bg-cyan-500/15 text-cyan-500 border-cyan-500/30",
      Icone: ImageIcon,
      funcoes: [
        {
          id: "converter-para-jpg",
          rotulo: "Converter para JPG",
          subtitulo: "Transformar PNG ou WebP em JPG leve",
          rota: "/conversor?ferramenta=img_para_jpg",
          bgClasse: "bg-orange-500/15 text-orange-500 border-orange-500/30",
          Icone: ImageIcon,
        },
        {
          id: "converter-para-png",
          rotulo: "Converter para PNG",
          subtitulo: "Transformar imagens em PNG com transparência",
          rota: "/conversor?ferramenta=img_para_png",
          bgClasse: "bg-cyan-500/15 text-cyan-500 border-cyan-500/30",
          Icone: ImageIcon,
        },
        {
          id: "converter-para-webp",
          rotulo: "Converter para WebP",
          subtitulo: "Compactação máxima preservando qualidade visual",
          rota: "/conversor?ferramenta=img_para_webp",
          bgClasse: "bg-emerald-500/15 text-emerald-500 border-emerald-500/30",
          Icone: ImageIcon,
        },
        {
          id: "img-para-pdf",
          rotulo: "Imagens para PDF",
          subtitulo: "Juntar fotos (PNG, JPG) em um único PDF",
          rota: "/conversor?ferramenta=img_para_pdf",
          bgClasse: "bg-purple-500/15 text-purple-500 border-purple-500/30",
          Icone: FileText,
        },
        {
          id: "pdf-para-jpg",
          rotulo: "PDF para JPG",
          subtitulo: "Extrair páginas do PDF em imagens JPG",
          rota: "/conversor?ferramenta=pdf_para_jpg",
          bgClasse: "bg-amber-500/15 text-amber-500 border-amber-500/30",
          Icone: ImageIcon,
        },
        {
          id: "pdf-para-png",
          rotulo: "PDF para PNG",
          subtitulo: "Extrair páginas do PDF em imagens PNG HD",
          rota: "/conversor?ferramenta=pdf_para_png",
          bgClasse: "bg-blue-500/15 text-blue-500 border-blue-500/30",
          Icone: ImageIcon,
        },
        {
          id: "pdf-para-epub",
          rotulo: "PDF para Livro EPUB",
          subtitulo: "Converter documentos PDF em e-book fluido",
          rota: "/conversor?ferramenta=pdf_para_epub",
          bgClasse: "bg-emerald-500/15 text-emerald-500 border-emerald-500/30",
          Icone: BookOpen,
        },
        {
          id: "texto-para-md",
          rotulo: "Texto para Markdown",
          subtitulo: "Converter TXT, HTML ou CSV em notas limpas",
          rota: "/conversor?ferramenta=texto_para_md",
          bgClasse: "bg-indigo-500/15 text-indigo-500 border-indigo-500/30",
          Icone: FileType,
        },
        {
          id: "extrair-audio",
          rotulo: "Extrair Áudio de Vídeo",
          subtitulo: "Salvar áudio MP3 de vídeos",
          rota: "/conversor?tipo=audio",
          bgClasse: "bg-violet-500/15 text-violet-500 border-violet-500/30",
          Icone: Volume2,
        },
        {
          id: "baixador-midia",
          rotulo: "Baixador de Mídia Web",
          subtitulo: "Baixar vídeos do Instagram, YouTube e TikTok",
          rota: "/baixador",
          bgClasse: "bg-yellow-500/15 text-yellow-500 border-yellow-500/30",
          Icone: Download,
        },
        {
          id: "referencias-mural",
          rotulo: "Mural de Referências",
          subtitulo: "Mural de design e inspirações visuais",
          rota: "/referencias",
          bgClasse: "bg-pink-500/15 text-pink-500 border-pink-500/30",
          Icone: ImageIcon,
        },
      ],
    },
    {
      id: "produtividade",
      nome: "Tarefas & Foco",
      descricao: "Gestão do tempo, foco e registros rápidos",
      corClasse: "text-amber-500",
      iconeClasse: "bg-amber-500/15 text-amber-500 border-amber-500/30",
      Icone: CheckSquare,
      funcoes: [
        {
          id: "ver-tarefas",
          rotulo: "Minhas Tarefas",
          subtitulo: "Visualizar tarefas, quadros e prazos",
          rota: "/tarefas",
          bgClasse: "bg-amber-500/15 text-amber-500 border-amber-500/30",
          Icone: CheckSquare,
        },
        {
          id: "nova-tarefa",
          rotulo: "Criar Nova Tarefa",
          subtitulo: "Adicionar uma tarefa imediatamente",
          bgClasse: "bg-emerald-500/15 text-emerald-500 border-emerald-500/30",
          Icone: PlusCircle,
          acao: () => {
            navegar("/tarefas");
            setTimeout(() => {
              window.dispatchEvent(new CustomEvent("klaus-acao-criar-dock"));
            }, 120);
          },
        },
        {
          id: "sons-foco",
          rotulo: "Sons de Foco",
          subtitulo: "Chuva, cafeteria, ruído branco e pomodoro",
          rota: "/sons",
          bgClasse: "bg-teal-500/15 text-teal-500 border-teal-500/30",
          Icone: Headphones,
        },
        {
          id: "lousas-canvas",
          rotulo: "Lousas & Esboços",
          subtitulo: "Desenho livre e diagramação no Excalidraw",
          rota: "/lousas",
          bgClasse: "bg-rose-500/15 text-rose-500 border-rose-500/30",
          Icone: Layout,
        },
        {
          id: "transcritor-voz",
          rotulo: "Transcrição de Voz",
          subtitulo: "Gravar áudio e converter em texto limpo",
          rota: "/transcritor",
          bgClasse: "bg-violet-500/15 text-violet-500 border-violet-500/30",
          Icone: Mic,
        },
      ],
    },
    {
      id: "notas",
      nome: "Notas & Grafo",
      descricao: "Anotações do cérebro, grafo neural e contatos",
      corClasse: "text-blue-500",
      iconeClasse: "bg-blue-500/15 text-blue-500 border-blue-500/30",
      Icone: FileText,
      funcoes: [
        {
          id: "ver-notas",
          rotulo: "Todas as Notas",
          subtitulo: "Acessar documentos e biblioteca de notas",
          rota: "/notas",
          bgClasse: "bg-blue-500/15 text-blue-500 border-blue-500/30",
          Icone: FileText,
        },
        {
          id: "nova-nota",
          rotulo: "Nova Nota em Branco",
          subtitulo: "Criar uma anotação imediatamente",
          bgClasse: "bg-cyan-500/15 text-cyan-500 border-cyan-500/30",
          Icone: FilePlus,
          acao: () => {
            navegar("/notas");
            setTimeout(() => {
              window.dispatchEvent(new CustomEvent("klaus-acao-criar-dock"));
            }, 120);
          },
        },
        {
          id: "grafo-neural",
          rotulo: "Grafo Neural",
          subtitulo: "Visualizar rede de conexões entre suas notas",
          rota: "/grafo",
          bgClasse: "bg-indigo-500/15 text-indigo-500 border-indigo-500/30",
          Icone: Network,
        },
        {
          id: "arvore-contatos",
          rotulo: "Árvore de Contatos",
          subtitulo: "Diretório de equipe, clientes e parceiros",
          rota: "/contatos",
          bgClasse: "bg-emerald-500/15 text-emerald-500 border-emerald-500/30",
          Icone: FolderTree,
        },
      ],
    },
    {
      id: "pdi",
      nome: "Carreira & PDI",
      descricao: "Evolução profissional, conquistas e plano de carreira",
      corClasse: "text-emerald-500",
      iconeClasse: "bg-emerald-500/15 text-emerald-500 border-emerald-500/30",
      Icone: Target,
      funcoes: [
        {
          id: "painel-pdi",
          rotulo: "Painel de Metas do PDI",
          subtitulo: "Acompanhar objetivos de evolução",
          rota: "/pdi",
          bgClasse: "bg-emerald-500/15 text-emerald-500 border-emerald-500/30",
          Icone: Target,
        },
        {
          id: "nova-entrega",
          rotulo: "Registrar Nova Conquista",
          subtitulo: "Salvar entrega de alto valor para seu PDI",
          rota: "/pdi?acao=entrega",
          bgClasse: "bg-amber-500/15 text-amber-500 border-amber-500/30",
          Icone: Sparkles,
        },
      ],
    },
    {
      id: "sistema",
      nome: "Ajustes & Tema",
      descricao: "Configuração do Klaus, tema e integração GitHub",
      corClasse: "text-violet-500",
      iconeClasse: "bg-violet-500/15 text-violet-500 border-violet-500/30",
      Icone: Settings,
      funcoes: [
        {
          id: "configuracoes",
          rotulo: "Ajustes do Klaus",
          subtitulo: "Token do GitHub, IA Gemini e dados",
          rota: "/config",
          bgClasse: "bg-zinc-500/15 text-zinc-300 border-zinc-500/30",
          Icone: Settings,
        },
        {
          id: "alternar-tema",
          rotulo: "Alternar Tema Claro / Escuro",
          subtitulo: "Trocar a aparência visual do aplicativo",
          bgClasse: "bg-amber-500/15 text-amber-400 border-amber-500/30",
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

    window.history.pushState({ modalMenuPizzaKlaus: true }, "");

    const lidarVoltarNavegador = () => {
      aoFechar();
    };

    window.addEventListener("popstate", lidarVoltarNavegador);
    document.body.style.overflow = "hidden";

    return () => {
      window.removeEventListener("popstate", lidarVoltarNavegador);
      document.body.style.overflow = "";
    };
  }, [aberto, aoFechar]);

  if (!aberto) return null;

  // Abertura direta e instantânea de qualquer função sem travar o histórico
  const executarFuncao = (funcao: FuncaoRapida) => {
    aoFechar();
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
      {/* 1. Backdrop escuro cinematográfico que escurece a tela de fundo */}
      <div
        onClick={aoFechar}
        className="fixed inset-0 bg-black/80 backdrop-blur-md transition-opacity duration-300 animate-in fade-in cursor-pointer"
      />

      {/* 
        2. DOCK ESTILO PIZZA FLUIDO:
        Formato contínuo de fatia de pizza:
        - Maior na parte de cima (largura de 96vw, cantos superiores bem arredondados)
        - Menor na parte de baixo (afunila suavemente em direção à base onde fica o botão de menu circular)
      */}
      <div className="relative z-10 w-full max-w-lg mx-auto flex flex-col items-center animate-in slide-in-from-bottom duration-300 ease-out px-2 pb-[max(env(safe-area-inset-bottom),14px)]">
        {/* Peça central unificada em estilo fatia de pizza */}
        <div className="w-full flex flex-col items-center">
          {/* TOPO AMPLO DA PIZZA (96vw com cantos arredondados de 40px) */}
          <div className="w-[96vw] max-w-md bg-card/98 dark:bg-zinc-950/98 backdrop-blur-2xl border-t border-x border-border/80 dark:border-white/10 rounded-t-[40px] shadow-2xl pt-3 px-4 pb-2">
            {/* Puxador tátil */}
            <div
              onClick={aoFechar}
              className="w-12 h-1.5 rounded-full bg-muted-foreground/30 hover:bg-muted-foreground/50 mx-auto mb-2.5 cursor-pointer"
            />

            {/* Cabeçalho com ícone de pizza e botão fechar */}
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="text-xl">🍕</span>
                <div>
                  <h3 className="text-xs font-bold text-foreground leading-tight">
                    Menu Pizza do Klaus
                  </h3>
                  <p className="text-[10px] text-muted-foreground">
                    Passe o dedo pro lado para ver as ferramentas
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={aoFechar}
                className="h-8 w-8 rounded-full bg-secondary/80 text-muted-foreground hover:text-foreground flex items-center justify-center active:scale-90 transition-transform cursor-pointer"
                aria-label="Fechar menu"
              >
                <X size={16} />
              </button>
            </div>

            {/* 
              3. BARRA HORIZONTAL FLUIDA ("AO PASSAR O DEDO PRO LADO")
              Carrossel horizontal com as ferramentas principais
            */}
            <div className="overflow-x-auto no-scrollbar scroll-smooth flex items-center gap-2 py-1.5 -mx-2 px-2 touch-pan-x">
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
                    <Icone
                      size={15}
                      className={cn("shrink-0", ativa ? "text-primary-foreground" : cat.corClasse)}
                    />
                    <span>{cat.nome}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 
            4. CORPO DAS FUNÇÕES RÁPIDAS (ABAIXO DO NOME DE CADA FERRAMENTA)
            Largura ligeiramente mais estreita (91vw), continuando o formato afunilado
          */}
          <div className="w-[91vw] max-w-[calc(100%-20px)] bg-card/98 dark:bg-zinc-950/98 backdrop-blur-2xl border-x border-border/80 dark:border-white/10 px-3.5 py-3 max-h-[50vh] overflow-y-auto no-scrollbar">
            {/* Título da ferramenta selecionada e subtítulo explicativo */}
            <div className="flex items-center justify-between gap-2 pb-2 mb-2 border-b border-border/40">
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
                    {categoriaAtiva.descricao}
                  </p>
                </div>
              </div>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-secondary/80 text-muted-foreground">
                {categoriaAtiva.funcoes.length} opções
              </span>
            </div>

            {/* Funções rápidas individuais abaixo do nome da ferramenta */}
            <div className="flex flex-col gap-1.5 pb-2">
              {categoriaAtiva.funcoes.map((funcao) => {
                const IconeFuncao = funcao.Icone;
                return (
                  <button
                    key={funcao.id}
                    type="button"
                    onClick={() => executarFuncao(funcao)}
                    className="w-full flex items-center justify-between p-2.5 rounded-2xl bg-secondary/35 hover:bg-secondary/70 active:scale-[0.98] border border-border/40 transition-all cursor-pointer group text-left"
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

                    <ArrowRight
                      size={14}
                      className="text-muted-foreground/60 group-hover:text-foreground shrink-0 ml-2 transition-transform group-hover:translate-x-0.5"
                    />
                  </button>
                );
              })}
            </div>
          </div>

          {/* 
            5. BASE DA PIZZA AFUNILADA (81vw, mais estreita que o topo, conectando ao botão de menu)
          */}
          <div className="w-[81vw] max-w-[calc(100%-54px)] bg-card/98 dark:bg-zinc-950/98 backdrop-blur-2xl border-b border-x border-border/80 dark:border-white/10 rounded-b-[28px] shadow-2xl py-2 flex items-center justify-center">
            <button
              type="button"
              onClick={aoFechar}
              className="text-xs font-semibold text-muted-foreground hover:text-foreground py-1 px-5 rounded-full bg-secondary/50 active:scale-95 transition-all cursor-pointer"
            >
              Fechar menu
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
