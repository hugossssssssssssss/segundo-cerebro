import { FilePlus, Scissors, Minimize2, Crop } from "lucide-react";
import { useFerramentasFlutuantes } from "@/components/ContextoFerramentasFlutuantes";

interface WidgetPDFRapidoProps {
  aoAbrirPopup?: (id?: string) => void;
}

export function WidgetPDFRapido({ aoAbrirPopup }: WidgetPDFRapidoProps) {
  const { abrirFerramentaFlutuante } = useFerramentasFlutuantes();

  const acoesPDF = [
    { id: "pdf_juntar", nome: "Juntar PDFs", desc: "Mesclar múltiplos arquivos", icone: FilePlus, cor: "text-red-500 bg-red-500/10" },
    { id: "pdf_dividir", nome: "Dividir PDF", desc: "Extrair páginas ou intervalos", icone: Scissors, cor: "text-blue-500 bg-blue-500/10" },
    { id: "pdf_comprimir", nome: "Comprimir", desc: "Reduzir peso do arquivo", icone: Minimize2, cor: "text-emerald-500 bg-emerald-500/10" },
    { id: "pdf_recortar", nome: "Recortar", desc: "Ajustar margens do PDF", icone: Crop, cor: "text-amber-500 bg-amber-500/10" },
  ];

  const abrirAcao = (id: string) => {
    if (aoAbrirPopup) {
      aoAbrirPopup(id);
    } else {
      abrirFerramentaFlutuante(id);
    }
  };

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 flex-1 items-center">
      {acoesPDF.map((a) => {
        const Icone = a.icone;
        return (
          <button
            key={a.id}
            type="button"
            onClick={() => abrirAcao(a.id)}
            className="p-3 rounded-xl border border-border/60 bg-background/50 hover:bg-secondary/40 hover:border-border transition-all flex flex-col items-center justify-center text-center gap-1.5 cursor-pointer h-full group"
          >
            <div className={`p-2 rounded-lg ${a.cor} transition-transform group-hover:scale-105`}>
              <Icone size={16} />
            </div>
            <div>
              <p className="text-xs font-semibold text-foreground group-hover:text-primary transition-colors">{a.nome}</p>
              <p className="text-[10px] text-muted-foreground line-clamp-1">{a.desc}</p>
            </div>
          </button>
        );
      })}
    </div>
  );
}
