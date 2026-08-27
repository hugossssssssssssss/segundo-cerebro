import { Link } from "react-router-dom";
import {
  FileText,
  FileImage,
  Mic,
  Headphones,
  Video,
  Layout,
} from "lucide-react";
import { cn } from "@/lib/utils";

export function WidgetHubFerramentas() {
  const ferramentas = [
    {
      nome: "Ferramentas PDF",
      desc: "Juntar, dividir e comprimir",
      icone: FileText,
      cor: "text-red-500 bg-red-500/10 border-red-500/20 hover:border-red-500/50",
      rota: "/pdf",
    },
    {
      nome: "Conversor de Arquivos",
      desc: "Imagens, PDF, WebP e EPUB",
      icone: FileImage,
      cor: "text-blue-500 bg-blue-500/10 border-blue-500/20 hover:border-blue-500/50",
      rota: "/conversor",
    },
    {
      nome: "Transcritor de Voz",
      desc: "Áudio para texto com Whisper",
      icone: Mic,
      cor: "text-purple-500 bg-purple-500/10 border-purple-500/20 hover:border-purple-500/50",
      rota: "/transcritor",
    },
    {
      nome: "Sons de Foco",
      desc: "Ruídos brancos e soundscapes",
      icone: Headphones,
      cor: "text-amber-500 bg-amber-500/10 border-amber-500/20 hover:border-amber-500/50",
      rota: "/sons",
    },
    {
      nome: "Lousas Visuais",
      desc: "Excalidraw & mapas mentais",
      icone: Layout,
      cor: "text-cyan-500 bg-cyan-500/10 border-cyan-500/20 hover:border-cyan-500/50",
      rota: "/lousas",
    },
    {
      nome: "Testador de Hardware",
      desc: "Câmera, mic, teclado e mouse",
      icone: Video,
      cor: "text-emerald-500 bg-emerald-500/10 border-emerald-500/20 hover:border-emerald-500/50",
      rota: "/hardware",
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2.5 flex-1">
      {ferramentas.map((f, idx) => {
        const Icone = f.icone;
        return (
          <Link
            key={idx}
            to={f.rota}
            className={cn(
              "group p-3 rounded-2xl border bg-background/60 hover:bg-card hover:shadow-md transition-all duration-200 flex flex-col items-center justify-center text-center gap-2 cursor-pointer",
              f.cor
            )}
          >
            <div className="p-2 rounded-xl border border-inherit transition-transform duration-200 group-hover:scale-110">
              <Icone size={18} />
            </div>
            <div>
              <p className="text-xs font-bold text-foreground leading-tight line-clamp-1">
                {f.nome}
              </p>
              <p className="text-[10px] text-muted-foreground/70 line-clamp-1 mt-0.5">
                {f.desc}
              </p>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
