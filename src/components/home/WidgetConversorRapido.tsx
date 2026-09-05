import { ArrowRight, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useFerramentasFlutuantes } from "@/components/ContextoFerramentasFlutuantes";

interface WidgetConversorRapidoProps {
  aoAbrirPopup?: (id?: string) => void;
}

export function WidgetConversorRapido({ aoAbrirPopup }: WidgetConversorRapidoProps) {
  const { abrirFerramentaFlutuante } = useFerramentasFlutuantes();

  const conversoesPopulares = [
    { id: "pdf_para_epub", de: "PDF", para: "EPUB", rotulo: "Livro Digital" },
    { id: "pdf_para_jpg", de: "PDF", para: "JPG", rotulo: "Imagens HD" },
    { id: "img_para_png", de: "WebP", para: "PNG", rotulo: "Com Transparência" },
    { id: "img_para_webp", de: "PNG", para: "WebP", rotulo: "Ultra Compacto" },
  ];

  const abrirConversor = (id: string) => {
    if (aoAbrirPopup) {
      aoAbrirPopup(id);
    } else {
      abrirFerramentaFlutuante(id);
    }
  };

  return (
    <div className="flex flex-col justify-between h-full space-y-3">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {conversoesPopulares.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => abrirConversor(c.id)}
            className="p-2.5 rounded-xl border border-border/60 bg-background/50 hover:bg-secondary/40 hover:border-border transition-all text-left cursor-pointer group"
          >
            <p className="text-[10px] text-muted-foreground font-medium group-hover:text-primary transition-colors">
              {c.rotulo}
            </p>
            <p className="text-xs font-bold text-foreground flex items-center gap-1 mt-0.5">
              <span>{c.de}</span>
              <ArrowRight size={10} className="text-muted-foreground" />
              <span className="text-primary">{c.para}</span>
            </p>
          </button>
        ))}
      </div>

      <div
        onClick={() => abrirConversor("conversor")}
        className="p-3 rounded-xl border border-dashed border-border/80 bg-secondary/15 hover:bg-secondary/30 transition-colors flex items-center justify-between gap-3 cursor-pointer"
      >
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Upload size={14} className="text-foreground" />
          <span>Arraste ou selecione um arquivo para converter</span>
        </div>

        <Button size="sm" variant="secondary" className="h-7 text-xs font-semibold rounded-lg">
          Abrir Conversor
        </Button>
      </div>
    </div>
  );
}
