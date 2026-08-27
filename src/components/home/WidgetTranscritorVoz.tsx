import { Mic, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

interface WidgetTranscritorVozProps {
  aoAbrirPopup: () => void;
}

export function WidgetTranscritorVoz({ aoAbrirPopup }: WidgetTranscritorVozProps) {
  return (
    <div className="flex flex-col items-center justify-center text-center p-4 gap-3 h-full">
      <div className="p-3 rounded-2xl bg-secondary text-foreground">
        <Mic size={22} />
      </div>
      <div>
        <p className="text-xs font-bold text-foreground">Transcrever Áudio</p>
        <p className="text-[11px] text-muted-foreground mt-0.5 max-w-[240px]">
          Converta gravações de voz ou arquivos de áudio em texto formatado com IA Whisper.
        </p>
      </div>

      <Button
        size="sm"
        onClick={aoAbrirPopup}
        className="text-xs font-semibold h-8 rounded-lg gap-1.5 cursor-pointer"
      >
        <Sparkles size={13} />
        <span>Abrir Transcritor</span>
      </Button>
    </div>
  );
}
