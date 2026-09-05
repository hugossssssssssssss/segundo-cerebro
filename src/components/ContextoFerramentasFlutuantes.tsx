import { createContext, useContext, useState, useEffect, Suspense, lazy, type ReactNode } from "react";
import { X, Wrench, Loader2 } from "lucide-react";
import { LISTA_FERRAMENTAS_APP } from "@/lib/ferramentasApp";
import { gerenciadorCamadas, NIVEIS_CAMADAS } from "@/lib/camadas";

const Conversor = lazy(() => import("@/pages/Conversor"));
const Transcritor = lazy(() => import("@/pages/Transcritor"));
const Configuracoes = lazy(() => import("@/pages/Configuracoes"));
const Chat = lazy(() => import("@/pages/Chat"));
const TestadorHardware = lazy(() => import("@/pages/TestadorHardware"));
const FerramentasPDF = lazy(() => import("@/pages/FerramentasPDF"));
const PesquisaLivros = lazy(() => import("@/pages/PesquisaLivros"));
const Sons = lazy(() => import("@/pages/Sons"));
const ITTools = lazy(() => import("@/pages/ITTools"));
const BaixadorMidia = lazy(() => import("@/pages/BaixadorMidia"));

interface ContextoFerramentasFlutuantesTipo {
  ferramentaAtiva: string | null;
  abrirFerramentaFlutuante: (id: string) => void;
  fecharFerramentaFlutuante: () => void;
}

const ContextoFerramentasFlutuantes = createContext<ContextoFerramentasFlutuantesTipo>({
  ferramentaAtiva: null,
  abrirFerramentaFlutuante: () => {},
  fecharFerramentaFlutuante: () => {},
});

export function ProvedorFerramentasFlutuantes({ children }: { children: ReactNode }) {
  const [ferramentaAtiva, setFerramentaAtiva] = useState<string | null>(null);

  const abrirFerramentaFlutuante = (id: string) => {
    setFerramentaAtiva(id);
  };

  const fecharFerramentaFlutuante = () => {
    setFerramentaAtiva(null);
  };

  // Registro da camada no gerenciador central do Klaus
  useEffect(() => {
    if (!ferramentaAtiva) return;
    const limpar = gerenciadorCamadas.registrar({
      id: `ferramenta-${ferramentaAtiva}`,
      nivel: NIVEIS_CAMADAS.FERRAMENTAS_APP,
      temBackdrop: true,
      aoFechar: fecharFerramentaFlutuante,
    });
    return () => limpar();
  }, [ferramentaAtiva]);

  const infoFerramenta = LISTA_FERRAMENTAS_APP.find((f) => f.id === ferramentaAtiva);
  const IconeComp = infoFerramenta?.icone || Wrench;

  const ehPDF =
    ferramentaAtiva?.startsWith("pdf_") ||
    ferramentaAtiva === "ferramentas_pdf";

  return (
    <ContextoFerramentasFlutuantes.Provider
      value={{ ferramentaAtiva, abrirFerramentaFlutuante, fecharFerramentaFlutuante }}
    >
      {children}

      {ferramentaAtiva && (
        <div
          style={{ zIndex: 300 }}
          className="fixed inset-0 flex items-center justify-center bg-black/70 p-2 sm:p-4 backdrop-blur-xs animate-in fade-in duration-150"
          onClick={fecharFerramentaFlutuante}
        >
          <div
            className="flex h-[92vh] w-full max-w-5xl flex-col border border-border bg-background shadow-2xl rounded-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Topo do Modal Flutuante */}
            <div className="flex shrink-0 items-center justify-between border-b border-border bg-card px-4 py-3">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <IconeComp size={18} />
                </div>
                <div>
                  <h2 className="font-bold text-sm text-foreground tracking-tight">
                    {infoFerramenta?.titulo || "Ferramenta Flutuante"}
                  </h2>
                  <p className="text-xs text-muted-foreground line-clamp-1">
                    {infoFerramenta?.descricao || "Uso rápido em janela flutuante"}
                  </p>
                </div>
              </div>

              <button
                onClick={fecharFerramentaFlutuante}
                className="rounded-lg p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors cursor-pointer"
                aria-label="Fechar janela da ferramenta"
              >
                <X size={20} />
              </button>
            </div>

            {/* Conteúdo da Ferramenta */}
            <div className="min-h-0 flex-1 overflow-y-auto bg-background p-2 sm:p-4">
              <Suspense
                fallback={
                  <div className="flex h-64 items-center justify-center gap-2 text-muted-foreground">
                    <Loader2 size={20} className="animate-spin text-primary" />
                    <span className="text-sm">Carregando ferramenta...</span>
                  </div>
                }
              >
                {ehPDF ? (
                  <FerramentasPDF />
                ) : ferramentaAtiva?.startsWith("baixador") ? (
                  <BaixadorMidia />
                ) : ferramentaAtiva?.startsWith("it_") || ferramentaAtiva === "it_tools" ? (
                  <ITTools />
                ) : ferramentaAtiva === "pesquisa_livros" ? (
                  <PesquisaLivros />
                ) : ferramentaAtiva === "sons" ? (
                  <Sons />
                ) : ferramentaAtiva === "transcritor" ? (
                  <Transcritor />
                ) : ferramentaAtiva === "configuracoes" ? (
                  <Configuracoes />
                ) : ferramentaAtiva === "chat_ia" ? (
                  <Chat />
                ) : ferramentaAtiva === "testador_hardware" ? (
                  <TestadorHardware />
                ) : (
                  <Conversor />
                )}
              </Suspense>
            </div>
          </div>
        </div>
      )}
    </ContextoFerramentasFlutuantes.Provider>
  );
}

export function useFerramentasFlutuantes() {
  return useContext(ContextoFerramentasFlutuantes);
}
