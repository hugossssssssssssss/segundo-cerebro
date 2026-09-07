import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  FileText,
  FileImage,
  Mic,
  Headphones,
  Layout,
  Video,
  BookOpen,
  Network,
  Newspaper,
  Calendar,
  MessageSquare,
  Users,
} from "lucide-react";
import {
  carregarMenuPersonalizado,
  EVENTO_MENU_ATUALIZADO,
  type GrupoMenuPersonalizado,
  type ItemMenuPersonalizado,
} from "@/lib/menuPersonalizado";
import { obterIconePorNome } from "@/lib/icones";

const FERRAMENTAS_BASE = [
  {
    id: "pdf",
    nomePadrao: "Ferramentas PDF",
    desc: "Juntar, dividir e comprimir",
    iconePadrao: FileText,
    rota: "/pdf",
  },
  {
    id: "conversor",
    nomePadrao: "Conversor",
    desc: "Imagens, PDF e EPUB",
    iconePadrao: FileImage,
    rota: "/conversor",
  },
  {
    id: "transcritor",
    nomePadrao: "Transcritor",
    desc: "Áudio para texto Whisper",
    iconePadrao: Mic,
    rota: "/transcritor",
  },
  {
    id: "sons",
    nomePadrao: "Sons de Foco",
    desc: "Ruídos e soundscapes",
    iconePadrao: Headphones,
    rota: "/sons",
  },
  {
    id: "lousas",
    nomePadrao: "Lousas Visuais",
    desc: "Excalidraw & diagramas",
    iconePadrao: Layout,
    rota: "/lousas",
  },
  {
    id: "hardware",
    nomePadrao: "Testador Hardware",
    desc: "Câmera, mic e teclado",
    iconePadrao: Video,
    rota: "/testador",
  },
  {
    id: "livros",
    nomePadrao: "Livros & Docs",
    desc: "Pesquisar e ler acervos",
    iconePadrao: BookOpen,
    rota: "/livros",
  },
  {
    id: "grafo",
    nomePadrao: "Grafo Neural",
    desc: "Visualizador 3D de links",
    iconePadrao: Network,
    rota: "/grafo",
  },
  {
    id: "noticias",
    nomePadrao: "Notícias & Design",
    desc: "Feed de novidades e RSS",
    iconePadrao: Newspaper,
    rota: "/noticias",
  },
  {
    id: "calendario",
    nomePadrao: "Calendário",
    desc: "Prazos e compromissos",
    iconePadrao: Calendar,
    rota: "/tarefas",
  },
  {
    id: "chat",
    nomePadrao: "Chat IA",
    desc: "Assistente Gemini",
    iconePadrao: MessageSquare,
    rota: "/chat",
  },
  {
    id: "contatos",
    nomePadrao: "Contatos",
    desc: "Rede e relacionamentos",
    iconePadrao: Users,
    rota: "/contatos",
  },
];

export function WidgetHubFerramentas() {
  const [grupos, setGrupos] = useState<GrupoMenuPersonalizado[]>(carregarMenuPersonalizado);

  useEffect(() => {
    const aoAtualizar = () => setGrupos(carregarMenuPersonalizado());
    window.addEventListener(EVENTO_MENU_ATUALIZADO, aoAtualizar);
    return () => window.removeEventListener(EVENTO_MENU_ATUALIZADO, aoAtualizar);
  }, []);

  const mapaCustom = new Map<string, ItemMenuPersonalizado>();
  for (const g of grupos) {
    for (const it of g.itens || []) {
      if (it?.para) mapaCustom.set(it.para.toLowerCase(), it);
      if (it?.id) mapaCustom.set(it.id.toLowerCase(), it);
    }
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2 flex-1 overflow-y-auto">
      {FERRAMENTAS_BASE.map((f) => {
        const rotaLimpa = f.rota.toLowerCase();
        const custom =
          mapaCustom.get(rotaLimpa) ||
          mapaCustom.get(f.id.toLowerCase());

        const nome = (custom?.rotulo && custom.rotulo.trim()) ? custom.rotulo.trim() : f.nomePadrao;
        const Icone = (custom?.iconeNome && custom.iconeNome.trim())
          ? obterIconePorNome(custom.iconeNome)
          : f.iconePadrao;
        const cor = custom?.cor;

        return (
          <Link
            key={f.id}
            to={f.rota}
            className="group p-2.5 rounded-xl border border-border/60 bg-background/60 hover:bg-card hover:border-border transition-colors flex flex-col items-center justify-center text-center gap-1.5 cursor-pointer"
          >
            <div
              className="p-2 rounded-lg bg-secondary text-foreground group-hover:text-primary transition-colors"
              style={cor ? { color: cor } : undefined}
            >
              <Icone size={16} />
            </div>
            <div>
              <p className="text-[11px] font-semibold text-foreground leading-tight line-clamp-1">
                {nome}
              </p>
              <p className="text-[10px] text-muted-foreground line-clamp-1 mt-0.5">
                {f.desc}
              </p>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
