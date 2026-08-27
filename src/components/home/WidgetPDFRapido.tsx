import { FilePlus, Scissors, Minimize2, Crop } from "lucide-react";

interface WidgetPDFRapidoProps {
  aoAbrirPopup: () => void;
}

export function WidgetPDFRapido({ aoAbrirPopup }: WidgetPDFRapidoProps) {
  const acoesPDF = [
    { nome: "Juntar PDFs", desc: "Mesclar múltiplos arquivos", icone: FilePlus },
    { nome: "Dividir PDF", desc: "Extrair páginas ou intervalos", icone: Scissors },
    { nome: "Comprimir", desc: "Reduzir tamanho do arquivo", icone: Minimize2 },
    { nome: "Recortar", desc: "Ajustar margens do PDF", icone: Crop },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 flex-1 items-center">
      {acoesPDF.map((a, i) => {
        const Icone = a.icone;
        return (
          <button
            key={i}
            type="button"
            onClick={aoAbrirPopup}
            className="p-3 rounded-xl border border-border/60 bg-background/50 hover:bg-secondary/40 hover:border-border transition-colors flex flex-col items-center justify-center text-center gap-1.5 cursor-pointer h-full"
          >
            <div className="p-2 rounded-lg bg-secondary text-foreground">
              <Icone size={16} />
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
