import { useEffect, useRef, useState } from "react";
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
  Search,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { alternarTema } from "@/lib/tema";

export interface ItemPizza {
  id: string;
  rotulo: string;
  subtitulo: string;
  rota?: string;
  corHex: string;
  bgClasse: string;
  Icone: any;
  acao?: () => void;
}

interface DockPizzaMobileProps {
  aberto: boolean;
  aoFechar: () => void;
}

export function DockPizzaMobile({ aberto, aoFechar }: DockPizzaMobileProps) {
  const navegar = useNavigate();
  const [busca, setBusca] = useState("");
  const fechandoRef = useRef(false);

  // Todas as ferramentas do Klaus separadas individualmente, direto ao ponto
  const todasFerramentas: ItemPizza[] = [
    {
      id: "juntar-pdf",
      rotulo: "Juntar PDFs",
      subtitulo: "Mesclar múltiplos PDFs em um único",
      rota: "/pdf?aba=juntar",
      corHex: "#ef4444",
      bgClasse: "bg-red-500/10 text-red-500 border-red-500/25",
      Icone: Layers,
    },
    {
      id: "dividir-pdf",
      rotulo: "Dividir PDF",
      subtitulo: "Separar páginas em arquivos",
      rota: "/pdf?aba=dividir",
      corHex: "#f97316",
      bgClasse: "bg-orange-500/10 text-orange-500 border-orange-500/25",
      Icone: Scissors,
    },
    {
      id: "comprimir-pdf",
      rotulo: "Comprimir PDF",
      subtitulo: "Reduzir tamanho sem perder qualidade",
      rota: "/pdf?aba=comprimir",
      corHex: "#f59e0b",
      bgClasse: "bg-amber-500/10 text-amber-500 border-amber-500/25",
      Icone: FileArchive,
    },
    {
      id: "scanner-pdf",
      rotulo: "Scanner / Foto PDF",
      subtitulo: "Digitalizar folha com a câmera",
      rota: "/pdf?aba=digitalizar",
      corHex: "#a855f7",
      bgClasse: "bg-purple-500/10 text-purple-500 border-purple-500/25",
      Icone: Camera,
    },
    {
      id: "recortar-pdf",
      rotulo: "Recortar Páginas",
      subtitulo: "Extrair trecho de documento",
      rota: "/pdf?aba=recortar",
      corHex: "#10b981",
      bgClasse: "bg-emerald-500/10 text-emerald-500 border-emerald-500/25",
      Icone: Crop,
    },
    {
      id: "desbloquear-pdf",
      rotulo: "Desbloquear PDF",
      subtitulo: "Remover senha de arquivo",
      rota: "/pdf?aba=desbloquear",
      corHex: "#64748b",
      bgClasse: "bg-slate-500/10 text-slate-400 border-slate-500/25",
      Icone: Lock,
    },
    {
      id: "organizar-pdf",
      rotulo: "Organizar Páginas",
      subtitulo: "Reordenar e girar páginas",
      rota: "/pdf?aba=organizar",
      corHex: "#3b82f6",
      bgClasse: "bg-blue-500/10 text-blue-500 border-blue-500/25",
      Icone: FileCheck,
    },
    {
      id: "converter-imagens",
      rotulo: "Converter Imagens",
      subtitulo: "PNG, JPG, WebP, SVG",
      rota: "/conversor?tipo=imagem",
      corHex: "#06b6d4",
      bgClasse: "bg-cyan-500/10 text-cyan-500 border-cyan-500/25",
      Icone: ImageIcon,
    },
    {
      id: "converter-documentos",
      rotulo: "Converter Documentos",
      subtitulo: "PDF, Word, Markdown, Texto",
      rota: "/conversor?tipo=documento",
      corHex: "#0ea5e9",
      bgClasse: "bg-sky-500/10 text-sky-500 border-sky-500/25",
      Icone: FileText,
    },
    {
      id: "extrair-audio",
      rotulo: "Extrair Áudio",
      subtitulo: "Salvar áudio MP3 de vídeos",
      rota: "/conversor?tipo=audio",
      corHex: "#8b5cf6",
      bgClasse: "bg-violet-500/10 text-violet-500 border-violet-500/25",
      Icone: Volume2,
    },
    {
      id: "baixador-midia",
      rotulo: "Baixador de Mídia",
      subtitulo: "Baixar vídeos do Insta/YouTube",
      rota: "/baixador",
      corHex: "#eab308",
      bgClasse: "bg-yellow-500/10 text-yellow-500 border-yellow-500/25",
      Icone: Download,
    },
    {
      id: "referencias-mural",
      rotulo: "Mural de Referências",
      subtitulo: "Mural de design e inspirações",
      rota: "/referencias",
      corHex: "#ec4899",
      bgClasse: "bg-pink-500/10 text-pink-500 border-pink-500/25",
      Icone: ImageIcon,
    },
    {
      id: "lousas-canvas",
      rotulo: "Lousas & Esboços",
      subtitulo: "Desenho livre e Excalidraw",
      rota: "/lousas",
      corHex: "#f43f5e",
      bgClasse: "bg-rose-500/10 text-rose-500 border-rose-500/25",
      Icone: Layout,
    },
    {
      id: "sons-foco",
      rotulo: "Sons de Foco",
      subtitulo: "Chuva, cafeteria e ruído branco",
      rota: "/sons",
      corHex: "#14b8a6",
      bgClasse: "bg-teal-500/10 text-teal-500 border-teal-500/25",
      Icone: Headphones,
    },
    {
      id: "pdi-carreira",
      rotulo: "Carreira & PDI",
      subtitulo: "Metas de carreira e evolução",
      rota: "/pdi",
      corHex: "#10b981",
      bgClasse: "bg-emerald-500/10 text-emerald-500 border-emerald-500/25",
      Icone: Target,
    },
    {
      id: "pdi-conquista",
      rotulo: "Nova Conquista",
      subtitulo: "Registrar entrega de valor no PDI",
      rota: "/pdi?acao=entrega",
      corHex: "#f59e0b",
      bgClasse: "bg-amber-500/10 text-amber-500 border-amber-500/25",
      Icone: Sparkles,
    },
    {
      id: "transcritor-voz",
      rotulo: "Transcrição de Voz",
      subtitulo: "Falar e virar texto instantâneo",
      rota: "/transcritor",
      corHex: "#8b5cf6",
      bgClasse: "bg-violet-500/10 text-violet-500 border-violet-500/25",
      Icone: Mic,
    },
    {
      id: "grafo-links",
      rotulo: "Grafo Neural",
      subtitulo: "Visualizar rede de notas e conexões",
      rota: "/grafo",
      corHex: "#3b82f6",
      bgClasse: "bg-blue-500/10 text-blue-500 border-blue-500/25",
      Icone: Network,
    },
    {
      id: "contatos-arvore",
      rotulo: "Árvore de Contatos",
      subtitulo: "Equipe, parceiros e clientes",
      rota: "/contatos",
      corHex: "#06b6d4",
      bgClasse: "bg-cyan-500/10 text-cyan-500 border-cyan-500/25",
      Icone: FolderTree,
    },
    {
      id: "ajustes-sistema",
      rotulo: "Ajustes do Klaus",
      subtitulo: "Configurar tokens e GitHub",
      rota: "/config",
      corHex: "#71717a",
      bgClasse: "bg-zinc-500/10 text-zinc-400 border-zinc-500/25",
      Icone: Settings,
    },
    {
      id: "alternar-tema",
      rotulo: "Alternar Tema",
      subtitulo: "Trocar entre Claro e Escuro",
      corHex: "#f59e0b",
      bgClasse: "bg-amber-500/10 text-amber-400 border-amber-500/25",
      Icone: Moon,
      acao: () => {
        alternarTema();
      },
    },
  ];

  const itensFiltrados = busca.trim()
    ? todasFerramentas.filter(
        (f) =>
          f.rotulo.toLowerCase().includes(busca.toLowerCase()) ||
          f.subtitulo.toLowerCase().includes(busca.toLowerCase())
      )
    : todasFerramentas;

  // Intercepta o botão voltar nativo do Android/navegador para fechar o menu sem sair da tela
  useEffect(() => {
    if (!aberto) return;

    fechandoRef.current = false;
    window.history.pushState({ modalMenuPizzaKlaus: true }, "");

    const aoVoltarNavegador = () => {
      fechandoRef.current = true;
      aoFechar();
    };

    window.addEventListener("popstate", aoVoltarNavegador);

    // Trava scroll de fundo
    document.body.style.overflow = "hidden";

    return () => {
      window.removeEventListener("popstate", aoVoltarNavegador);
      document.body.style.overflow = "";

      // Se fechou pelo botão X ou toque na tela (e não pelo popstate), limpa o histórico
      if (!fechandoRef.current && window.history.state?.modalMenuPizzaKlaus) {
        window.history.back();
      }
    };
  }, [aberto, aoFechar]);

  if (!aberto) return null;

  const fecharComSucesso = () => {
    fechandoRef.current = true;
    if (window.history.state?.modalMenuPizzaKlaus) {
      window.history.back();
    }
    aoFechar();
  };

  const executarItem = (item: ItemPizza) => {
    fecharComSucesso();
    if (item.acao) {
      item.acao();
      return;
    }
    if (item.rota) {
      navegar(item.rota);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end sm:hidden select-none">
      {/* 1. Backdrop escurecedor cinematográfico com blur */}
      <div
        onClick={fecharComSucesso}
        className="fixed inset-0 bg-black/80 backdrop-blur-md transition-opacity duration-300 animate-in fade-in"
      />

      {/* 
        2. Estrutura Autêntica de Pizza:
        MAIOR NA PARTE DE CIMA (96% de largura, cantos bem arredondados) 
        MENOR NA PARTE DE BAIXO (afunilando em trapézio em direção ao dedão/botão de menu)
      */}
      <div className="relative z-10 w-[95vw] max-w-lg mx-auto flex flex-col items-center animate-in slide-in-from-bottom duration-300 ease-out pb-[max(env(safe-area-inset-bottom),14px)]">
        {/* Corpo estilo Fatia de Pizza com bordas arredondadas e formato afunilando na base */}
        <div
          className="w-full rounded-t-[44px] rounded-b-[28px] bg-card/95 dark:bg-zinc-950/95 border-t border-x border-border/80 dark:border-white/10 shadow-2xl flex flex-col max-h-[82vh] overflow-hidden"
          style={{
            // Formato leque/fatia de pizza: topo amplo 100%, base ligeiramente afunilada
            clipPath: "polygon(0% 0%, 100% 0%, 93% 100%, 7% 100%)",
          }}
        >
          {/* Topo amplo da Pizza */}
          <div className="pt-4 px-5 pb-2.5 bg-gradient-to-b from-primary/10 via-transparent to-transparent flex flex-col items-center">
            {/* Alça tátil de toque */}
            <div
              onClick={fecharComSucesso}
              className="w-12 h-1.5 rounded-full bg-muted-foreground/30 hover:bg-muted-foreground/50 mb-3 cursor-pointer transition-colors"
            />

            {/* Cabeçalho */}
            <div className="w-full flex items-center justify-between gap-2 mb-2">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-full bg-primary/15 text-primary flex items-center justify-center font-bold text-xs shadow-xs">
                  🍕
                </div>
                <div>
                  <h3 className="text-sm font-bold text-foreground leading-tight">
                    Ferramentas do Klaus
                  </h3>
                  <p className="text-[10px] text-muted-foreground">
                    Acesso direto sem menus escondidos
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={fecharComSucesso}
                className="h-8 w-8 rounded-full bg-secondary/80 text-muted-foreground hover:text-foreground flex items-center justify-center active:scale-90 transition-transform cursor-pointer"
                aria-label="Fechar menu"
              >
                <X size={16} />
              </button>
            </div>

            {/* Campo de Busca Rápida de Ferramentas */}
            <div className="w-full relative mt-1">
              <Search
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
              />
              <input
                type="text"
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="Buscar ferramenta rápida..."
                className="w-full text-xs pl-8 pr-3 py-2 rounded-xl bg-secondary/60 border border-border/60 text-foreground placeholder:text-muted-foreground focus:outline-hidden focus:ring-1 focus:ring-primary/40 transition-all"
              />
            </div>
          </div>

          {/* Grade de Ferramentas Separadas e Diretas */}
          <div className="flex-1 overflow-y-auto no-scrollbar p-3.5 space-y-1.5">
            <div className="grid grid-cols-2 gap-2 pb-4">
              {itensFiltrados.map((item) => {
                const Icone = item.Icone;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => executarItem(item)}
                    className="flex flex-col p-2.5 rounded-2xl bg-secondary/35 hover:bg-secondary/70 border border-border/50 text-left transition-all active:scale-[0.96] cursor-pointer group shadow-2xs"
                  >
                    <div className="flex items-center gap-2 mb-1.5">
                      <div
                        className={cn(
                          "h-8 w-8 rounded-xl flex items-center justify-center border shadow-xs shrink-0 transition-transform group-hover:scale-105",
                          item.bgClasse
                        )}
                      >
                        <Icone size={16} />
                      </div>
                      <span className="text-xs font-bold text-foreground leading-tight truncate">
                        {item.rotulo}
                      </span>
                    </div>

                    <p className="text-[10px] text-muted-foreground leading-tight line-clamp-1">
                      {item.subtitulo}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Rodapé afunilado da Pizza */}
          <div className="pb-3 pt-1 flex justify-center bg-card/60 dark:bg-zinc-950/60 border-t border-border/40">
            <button
              type="button"
              onClick={fecharComSucesso}
              className="text-xs font-semibold text-muted-foreground hover:text-foreground py-1 px-4 rounded-full bg-secondary/40 active:scale-95 transition-all"
            >
              Fechar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
