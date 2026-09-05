import { Video, Image as ImageIcon, Play, Link as LinkIcon, Volume2, Download, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useFerramentasFlutuantes } from "@/components/ContextoFerramentasFlutuantes";

interface WidgetBaixadorRapidoProps {
  aoAbrirPopup?: (id?: string) => void;
}

export function WidgetBaixadorRapido({ aoAbrirPopup }: WidgetBaixadorRapidoProps) {
  const { abrirFerramentaFlutuante } = useFerramentasFlutuantes();

  const acoes = [
    { id: "baixador_youtube", nome: "YouTube", desc: "Vídeos & MP3", icone: Video, cor: "text-red-500 bg-red-500/10" },
    { id: "baixador_instagram", nome: "Instagram", desc: "Reels & Fotos", icone: ImageIcon, cor: "text-pink-500 bg-pink-500/10" },
    { id: "baixador_tiktok", nome: "TikTok", desc: "Sem marca d'água", icone: Play, cor: "text-cyan-500 bg-cyan-500/10" },
    { id: "baixador_twitter", nome: "X / Twitter", desc: "Vídeos & GIFs", icone: LinkIcon, cor: "text-sky-500 bg-sky-500/10" },
    { id: "baixador_audio", nome: "Extrair MP3", desc: "Áudio direto", icone: Volume2, cor: "text-amber-500 bg-amber-500/10" },
    { id: "baixador_pinterest", nome: "Pinterest", desc: "Vídeos & Pins", icone: ImageIcon, cor: "text-rose-500 bg-rose-500/10" },
  ];

  const abrirFerramenta = (id: string) => {
    if (aoAbrirPopup) {
      aoAbrirPopup(id);
    } else {
      abrirFerramentaFlutuante(id);
    }
  };

  return (
    <div className="flex flex-col justify-between h-full space-y-3">
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {acoes.map((item) => {
          const Icone = item.icone;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => abrirFerramenta(item.id)}
              className="p-2.5 rounded-xl border border-border/60 bg-background/50 hover:bg-secondary/40 hover:border-border transition-colors text-left flex items-center gap-2.5 cursor-pointer group"
            >
              <div className={`p-2 rounded-lg shrink-0 ${item.cor}`}>
                <Icone size={15} />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-foreground truncate group-hover:text-primary transition-colors">
                  {item.nome}
                </p>
                <p className="text-[10px] text-muted-foreground truncate">{item.desc}</p>
              </div>
            </button>
          );
        })}
      </div>

      <div
        onClick={() => abrirFerramenta("baixador_midia")}
        className="p-2.5 rounded-xl border border-dashed border-border/80 bg-secondary/15 hover:bg-secondary/30 transition-colors flex items-center justify-between gap-3 cursor-pointer"
      >
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Sparkles size={14} className="text-primary" />
          <span>Cole qualquer link do YouTube, Instagram, TikTok, X, Pinterest...</span>
        </div>

        <Button size="sm" variant="secondary" className="h-7 text-xs font-semibold rounded-lg shrink-0">
          <Download size={13} className="mr-1" />
          Abrir Baixador
        </Button>
      </div>
    </div>
  );
}
