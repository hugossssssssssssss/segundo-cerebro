import { useState, useEffect, useCallback } from "react";
import { PanelLeft, PanelRight, Square, Columns2 } from "lucide-react";
import { useItemFlutuante, type SlotPainel } from "@/components/ItemFlutuanteContext";
import {
  TIPO_MIME_ITEM_KLAUS,
  EVENTO_DRAG_INICIADO,
  EVENTO_DRAG_FINALIZADO,
  obterItemArrastadoAtual,
  definirItemArrastadoAtual,
} from "@/lib/arrastoItem";
import { cn } from "@/lib/utils";

export function ZonasArrastoGlobal() {
  const { abrirItemEmSlot } = useItemFlutuante();
  const [arrastando, setArrastando] = useState(false);
  const [zonaAtiva, setZonaAtiva] = useState<"esquerda" | "centro" | "direita" | null>(null);

  // Escutar eventos de início e fim de drag
  useEffect(() => {
    const aoIniciar = () => setArrastando(true);
    const aoFinalizar = () => {
      setArrastando(false);
      setZonaAtiva(null);
    };

    window.addEventListener(EVENTO_DRAG_INICIADO, aoIniciar);
    window.addEventListener(EVENTO_DRAG_FINALIZADO, aoFinalizar);

    const aoDragOverWindow = (e: DragEvent) => {
      if (e.dataTransfer && Array.from(e.dataTransfer.types).includes(TIPO_MIME_ITEM_KLAUS)) {
        e.preventDefault();
        setArrastando(true);
      }
    };

    const aoDropWindow = () => {
      setArrastando(false);
      setZonaAtiva(null);
      definirItemArrastadoAtual(null);
    };

    const aoPointerMoveGlobal = (e: PointerEvent) => {
      if (!obterItemArrastadoAtual()) return;
      const x = e.clientX;
      const w = window.innerWidth;
      if (x < w * 0.35) {
        setZonaAtiva("esquerda");
      } else if (x > w * 0.65) {
        setZonaAtiva("direita");
      } else {
        setZonaAtiva("centro");
      }
    };

    const aoPointerUpGlobal = async (e: PointerEvent) => {
      const atual = obterItemArrastadoAtual();
      if (!atual) return;

      const x = e.clientX;
      const y = e.clientY;
      const w = window.innerWidth;
      const h = window.innerHeight;

      // Se o soltar foi no topo ou nos cantos/centro da tela
      if (y > 40 && y < h - 40) {
        let slot: SlotPainel = "popup";
        if (x < w * 0.35) slot = "esquerda";
        else if (x > w * 0.65) slot = "direita";
        else slot = "popup";

        setArrastando(false);
        setZonaAtiva(null);
        definirItemArrastadoAtual(null);
        await abrirItemEmSlot(atual.caminho, slot);
        return;
      }

      setArrastando(false);
      setZonaAtiva(null);
      definirItemArrastadoAtual(null);
    };

    window.addEventListener("dragover", aoDragOverWindow);
    window.addEventListener("drop", aoDropWindow);
    window.addEventListener("pointermove", aoPointerMoveGlobal);
    window.addEventListener("pointerup", aoPointerUpGlobal);

    return () => {
      window.removeEventListener(EVENTO_DRAG_INICIADO, aoIniciar);
      window.removeEventListener(EVENTO_DRAG_FINALIZADO, aoFinalizar);
      window.removeEventListener("dragover", aoDragOverWindow);
      window.removeEventListener("drop", aoDropWindow);
      window.removeEventListener("pointermove", aoPointerMoveGlobal);
      window.removeEventListener("pointerup", aoPointerUpGlobal);
    };
  }, [abrirItemEmSlot]);

  const lidarDrop = useCallback(
    async (zona: "esquerda" | "centro" | "direita", e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();

      let caminho = "";
      try {
        const rawJson = e.dataTransfer.getData(TIPO_MIME_ITEM_KLAUS);
        if (rawJson) {
          const parsed = JSON.parse(rawJson);
          caminho = parsed.caminho || "";
        }
      } catch {}

      if (!caminho) {
        caminho = e.dataTransfer.getData("text/plain") || "";
      }

      if (!caminho) {
        const atual = obterItemArrastadoAtual();
        caminho = atual?.caminho || "";
      }

      setArrastando(false);
      setZonaAtiva(null);
      definirItemArrastadoAtual(null);

      if (!caminho) return;

      const slot: SlotPainel = zona === "esquerda" ? "esquerda" : zona === "direita" ? "direita" : "popup";
      await abrirItemEmSlot(caminho, slot);
    },
    [abrirItemEmSlot]
  );

  if (!arrastando) return null;

  return (
    <div
      className="fixed inset-0 z-[800] bg-black/50 backdrop-blur-sm flex flex-col p-4 sm:p-8 animate-in fade-in duration-150 select-none pointer-events-auto"
      onDragOver={(e) => e.preventDefault()}
      onDragLeave={(e) => {
        if (e.clientX <= 0 || e.clientY <= 0 || e.clientX >= window.innerWidth || e.clientY >= window.innerHeight) {
          setArrastando(false);
          setZonaAtiva(null);
        }
      }}
    >
      {/* Banner Superior Explicativo */}
      <div className="mx-auto mb-4 px-4 py-1.5 rounded-full bg-card/90 border border-border/80 shadow-lg text-xs font-semibold text-foreground flex items-center gap-2">
        <Columns2 size={14} className="text-primary animate-pulse" />
        <span>Solte o documento na posição desejada</span>
      </div>

      {/* Grid de 3 Zonas de Soltura */}
      <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 min-h-0">
        {/* Zona 1: Esquerda (Lado a Lado Esquerda) */}
        <div
          onDragOver={(e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = "move";
            if (zonaAtiva !== "esquerda") setZonaAtiva("esquerda");
          }}
          onDragLeave={() => {
            if (zonaAtiva === "esquerda") setZonaAtiva(null);
          }}
          onDrop={(e) => lidarDrop("esquerda", e)}
          className={cn(
            "flex flex-col items-center justify-center p-6 rounded-3xl border-2 border-dashed transition-all duration-200 text-center gap-3 cursor-pointer",
            zonaAtiva === "esquerda"
              ? "border-primary bg-primary/15 text-primary scale-[1.02] shadow-2xl shadow-primary/20 ring-4 ring-primary/20"
              : "border-border/80 bg-card/70 text-muted-foreground hover:border-primary/50 hover:bg-card/90"
          )}
        >
          <div
            className={cn(
              "h-16 w-16 rounded-2xl flex items-center justify-center transition-all duration-200",
              zonaAtiva === "esquerda"
                ? "bg-primary text-primary-foreground scale-110 shadow-lg"
                : "bg-secondary text-muted-foreground"
            )}
          >
            <PanelLeft size={32} />
          </div>
          <div className="space-y-1">
            <h3 className="font-bold text-base sm:text-lg text-foreground">Abrir à Esquerda</h3>
            <p className="text-xs text-muted-foreground">Modo Lado a Lado (Split View)</p>
          </div>
        </div>

        {/* Zona 2: Centro (Pop-up Central) */}
        <div
          onDragOver={(e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = "move";
            if (zonaAtiva !== "centro") setZonaAtiva("centro");
          }}
          onDragLeave={() => {
            if (zonaAtiva === "centro") setZonaAtiva(null);
          }}
          onDrop={(e) => lidarDrop("centro", e)}
          className={cn(
            "flex flex-col items-center justify-center p-6 rounded-3xl border-2 border-dashed transition-all duration-200 text-center gap-3 cursor-pointer",
            zonaAtiva === "centro"
              ? "border-amber-500 bg-amber-500/15 text-amber-500 scale-[1.02] shadow-2xl shadow-amber-500/20 ring-4 ring-amber-500/20"
              : "border-border/80 bg-card/70 text-muted-foreground hover:border-amber-500/50 hover:bg-card/90"
          )}
        >
          <div
            className={cn(
              "h-16 w-16 rounded-2xl flex items-center justify-center transition-all duration-200",
              zonaAtiva === "centro"
                ? "bg-amber-500 text-white scale-110 shadow-lg"
                : "bg-secondary text-muted-foreground"
            )}
          >
            <Square size={32} />
          </div>
          <div className="space-y-1">
            <h3 className="font-bold text-base sm:text-lg text-foreground">Abrir no Centro</h3>
            <p className="text-xs text-muted-foreground">Modo Pop-up Centralizado</p>
          </div>
        </div>

        {/* Zona 3: Direita (Lado a Lado Direita) */}
        <div
          onDragOver={(e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = "move";
            if (zonaAtiva !== "direita") setZonaAtiva("direita");
          }}
          onDragLeave={() => {
            if (zonaAtiva === "direita") setZonaAtiva(null);
          }}
          onDrop={(e) => lidarDrop("direita", e)}
          className={cn(
            "flex flex-col items-center justify-center p-6 rounded-3xl border-2 border-dashed transition-all duration-200 text-center gap-3 cursor-pointer",
            zonaAtiva === "direita"
              ? "border-primary bg-primary/15 text-primary scale-[1.02] shadow-2xl shadow-primary/20 ring-4 ring-primary/20"
              : "border-border/80 bg-card/70 text-muted-foreground hover:border-primary/50 hover:bg-card/90"
          )}
        >
          <div
            className={cn(
              "h-16 w-16 rounded-2xl flex items-center justify-center transition-all duration-200",
              zonaAtiva === "direita"
                ? "bg-primary text-primary-foreground scale-110 shadow-lg"
                : "bg-secondary text-muted-foreground"
            )}
          >
            <PanelRight size={32} />
          </div>
          <div className="space-y-1">
            <h3 className="font-bold text-base sm:text-lg text-foreground">Abrir à Direita</h3>
            <p className="text-xs text-muted-foreground">Modo Lado a Lado (Split View)</p>
          </div>
        </div>
      </div>
    </div>
  );
}
