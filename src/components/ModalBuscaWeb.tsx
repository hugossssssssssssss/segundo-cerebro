import { useEffect } from "react";
import { Globe, X } from "lucide-react";
import { WebSearchBar } from "@/components/WebSearchBar";
import { useMotorBuscaWeb, MOTORES_BUSCA } from "@/lib/buscaWeb";

export interface ModalBuscaWebProps {
  aberto: boolean;
  aoFechar: () => void;
}

/**
 * Modal centralizado de Busca Web Externa (aparece no centro da tela
 * com backdrop escurecido, exatamente como a Busca Global do Klaus).
 */
export function ModalBuscaWeb({ aberto, aoFechar }: ModalBuscaWebProps) {
  const [motor, setMotor] = useMotorBuscaWeb();
  const infoMotor = MOTORES_BUSCA.find((m) => m.id === motor) || MOTORES_BUSCA[0];

  useEffect(() => {
    if (!aberto) return;
    const aoTeclar = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        aoFechar();
      }
    };
    document.addEventListener("keydown", aoTeclar);
    return () => document.removeEventListener("keydown", aoTeclar);
  }, [aberto, aoFechar]);

  if (!aberto) return null;

  return (
    <div
      className="fixed inset-0 z-[600] flex items-start justify-center bg-black/60 p-3 pt-12 sm:p-6 sm:pt-20 backdrop-blur-xs animate-in fade-in duration-150 overflow-y-auto"
      onClick={aoFechar}
    >
      <div
        className="flex max-h-[90dvh] w-full max-w-3xl flex-col border border-border bg-card shadow-2xl rounded-3xl overflow-hidden animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabeçalho do Modal */}
        <div className="flex items-center justify-between border-b border-border/60 px-6 py-4 bg-muted/20">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-500">
              <Globe size={20} />
            </div>
            <div>
              <h2 className="font-bold text-base text-foreground flex items-center gap-2">
                Busca Web
                <span className="text-xs font-normal text-muted-foreground">
                  (Buscando via {infoMotor.nome})
                </span>
              </h2>
              <p className="text-xs text-muted-foreground">
                Pesquise na internet com filtros e operadores estruturados
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Seletor discreto do motor de busca */}
            <select
              value={motor}
              onChange={(e) => setMotor(e.target.value as any)}
              className="text-xs rounded-xl bg-muted/60 hover:bg-muted font-medium text-foreground px-2.5 py-1.5 border border-border/60 outline-none cursor-pointer"
              title="Mudar buscador padrão"
            >
              {MOTORES_BUSCA.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.nome}
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={aoFechar}
              className="p-1.5 rounded-xl text-muted-foreground hover:bg-accent hover:text-foreground transition-colors cursor-pointer"
              title="Fechar (Esc)"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Corpo com a Barra e Filtros */}
        <div className="p-6 overflow-y-auto min-h-0 space-y-4">
          <WebSearchBar
            modo="modal"
            autoFocus={true}
            aoSubmeter={() => aoFechar()}
          />
        </div>
      </div>
    </div>
  );
}
