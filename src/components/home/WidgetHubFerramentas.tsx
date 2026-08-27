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

export function WidgetHubFerramentas() {
  const ferramentas = [
    {
      nome: "Ferramentas PDF",
      desc: "Juntar, dividir e comprimir",
      icone: FileText,
      rota: "/pdf",
    },
    {
      nome: "Conversor",
      desc: "Imagens, PDF e EPUB",
      icone: FileImage,
      rota: "/conversor",
    },
    {
      nome: "Transcritor",
      desc: "Áudio para texto Whisper",
      icone: Mic,
      rota: "/transcritor",
    },
    {
      nome: "Sons de Foco",
      desc: "Ruídos e soundscapes",
      icone: Headphones,
      rota: "/sons",
    },
    {
      nome: "Lousas Visuais",
      desc: "Excalidraw & diagramas",
      icone: Layout,
      rota: "/lousas",
    },
    {
      nome: "Testador Hardware",
      desc: "Câmera, mic e teclado",
      icone: Video,
      rota: "/hardware",
    },
    {
      nome: "Livros & Docs",
      desc: "Pesquisar e ler acervos",
      icone: BookOpen,
      rota: "/livros",
    },
    {
      nome: "Grafo Neural",
      desc: "Visualizador 3D de links",
      icone: Network,
      rota: "/grafo",
    },
    {
      nome: "Notícias & Design",
      desc: "Feed de novidades e RSS",
      icone: Newspaper,
      rota: "/noticias",
    },
    {
      nome: "Calendário",
      desc: "Prazos e compromissos",
      icone: Calendar,
      rota: "/calendario",
    },
    {
      nome: "Chat IA",
      desc: "Assistente Gemini",
      icone: MessageSquare,
      rota: "/chat",
    },
    {
      nome: "Contatos",
      desc: "Rede e relacionamentos",
      icone: Users,
      rota: "/contatos",
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2 flex-1 overflow-y-auto">
      {ferramentas.map((f, idx) => {
        const Icone = f.icone;
        return (
          <Link
            key={idx}
            to={f.rota}
            className="group p-2.5 rounded-xl border border-border/60 bg-background/60 hover:bg-card hover:border-border transition-colors flex flex-col items-center justify-center text-center gap-1.5 cursor-pointer"
          >
            <div className="p-2 rounded-lg bg-secondary text-foreground group-hover:text-primary transition-colors">
              <Icone size={16} />
            </div>
            <div>
              <p className="text-[11px] font-semibold text-foreground leading-tight line-clamp-1">
                {f.nome}
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
