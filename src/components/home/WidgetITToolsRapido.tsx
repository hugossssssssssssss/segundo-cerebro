import { Ruler, Maximize2, Eye, Type, QrCode, Sparkles } from "lucide-react";

interface WidgetITToolsRapidoProps {
  aoAbrirPopup: (id?: string) => void;
}

export function WidgetITToolsRapido({ aoAbrirPopup }: WidgetITToolsRapidoProps) {
  const acoes = [
    { id: "it_unidades", nome: "px ⇄ rem", desc: "Conversor de medidas", icone: Ruler, cor: "text-amber-500" },
    { id: "it_aspect_ratio", nome: "Aspect Ratio", desc: "16:9, 4:3, 1:1, 9:16", icone: Maximize2, cor: "text-blue-500" },
    { id: "it_contraste", nome: "Contraste WCAG", desc: "Acessibilidade de cores", icone: Eye, cor: "text-emerald-500" },
    { id: "it_cases", nome: "Cases & Slugs", desc: "kebab, snake, camelCase", icone: Type, cor: "text-purple-500" },
    { id: "it_qr_code", nome: "QR Code", desc: "Gerador SVG e PNG", icone: QrCode, cor: "text-pink-500" },
    { id: "it_lorem", nome: "Lorem Ipsum", desc: "Texto de preenchimento", icone: Sparkles, cor: "text-indigo-500" },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 flex-1 items-center">
      {acoes.map((a) => {
        const Icone = a.icone;
        return (
          <button
            key={a.id}
            type="button"
            onClick={() => aoAbrirPopup(a.id)}
            className="p-3 rounded-xl border border-border/60 bg-background/50 hover:bg-secondary/40 hover:border-border transition-all flex flex-col items-center justify-center text-center gap-1.5 cursor-pointer h-full group"
          >
            <div className="p-2 rounded-lg bg-secondary text-foreground group-hover:scale-105 transition-transform">
              <Icone size={16} className={a.cor} />
            </div>
            <div>
              <p className="text-xs font-semibold text-foreground">{a.nome}</p>
              <p className="text-[10px] text-muted-foreground line-clamp-1">{a.desc}</p>
            </div>
          </button>
        );
      })}
    </div>
  );
}
