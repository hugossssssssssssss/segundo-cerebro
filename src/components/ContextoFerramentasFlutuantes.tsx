import { createContext, useContext, useState, useEffect, Suspense, lazy, type ReactNode } from "react";
import { X, Wrench, Loader2 } from "lucide-react";
import { LISTA_FERRAMENTAS_APP } from "@/lib/ferramentasApp";
import { gerenciadorCamadas, NIVEIS_CAMADAS } from "@/lib/camadas";
import type { TipoFerramentaConversor } from "@/pages/Conversor";
import type { AbaILovePDF } from "@/pages/FerramentasPDF";
import type { PlataformaMidia } from "@/lib/baixador";
import { cn } from "@/lib/utils";

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

export interface OpcoesFerramentaFlutuante {
  mensagemInicial?: string;
  [key: string]: any;
}

interface ContextoFerramentasFlutuantesTipo {
  ferramentaAtiva: string | null;
  opcoesAtivas: OpcoesFerramentaFlutuante | null;
  abrirFerramentaFlutuante: (id: string, opcoes?: OpcoesFerramentaFlutuante) => void;
  fecharFerramentaFlutuante: () => void;
}

const ContextoFerramentasFlutuantes = createContext<ContextoFerramentasFlutuantesTipo>({
  ferramentaAtiva: null,
  opcoesAtivas: null,
  abrirFerramentaFlutuante: () => {},
  fecharFerramentaFlutuante: () => {},
});

export function ProvedorFerramentasFlutuantes({ children }: { children: ReactNode }) {
  const [ferramentaAtiva, setFerramentaAtiva] = useState<string | null>(null);
  const [opcoesAtivas, setOpcoesAtivas] = useState<OpcoesFerramentaFlutuante | null>(null);

  const abrirFerramentaFlutuante = (id: string, opcoes?: OpcoesFerramentaFlutuante) => {
    setFerramentaAtiva(id);
    setOpcoesAtivas(opcoes || null);
  };

  const fecharFerramentaFlutuante = () => {
    setFerramentaAtiva(null);
    setOpcoesAtivas(null);
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

  // Identificação de Ferramentas e Modo Focado
  const ehFerramentaPDF =
    ferramentaAtiva?.startsWith("pdf_juntar") ||
    ferramentaAtiva?.startsWith("pdf_dividir") ||
    ferramentaAtiva?.startsWith("pdf_comprimir") ||
    ferramentaAtiva?.startsWith("pdf_recortar") ||
    ferramentaAtiva?.startsWith("pdf_desbloquear") ||
    ferramentaAtiva?.startsWith("pdf_organizar") ||
    ferramentaAtiva === "ferramentas_pdf";

  const abaPDF = ehFerramentaPDF
    ? (ferramentaAtiva?.replace(/^pdf_/, "") as AbaILovePDF)
    : undefined;

  const ehConversor =
    ferramentaAtiva?.startsWith("pdf_para_") ||
    ferramentaAtiva?.startsWith("img_para_") ||
    ferramentaAtiva?.startsWith("epub_") ||
    ferramentaAtiva === "texto_para_md" ||
    ferramentaAtiva === "conversor";

  const ferramentaConversor = ehConversor && ferramentaAtiva !== "conversor"
    ? (ferramentaAtiva as TipoFerramentaConversor)
    : undefined;

  const ehBaixador =
    ferramentaAtiva?.startsWith("baixador_") ||
    ferramentaAtiva === "baixador" ||
    ferramentaAtiva === "baixador_midia";

  const abaBaixador = ehBaixador && ferramentaAtiva !== "baixador_midia" && ferramentaAtiva !== "baixador"
    ? (ferramentaAtiva?.replace(/^baixador_/, "") as PlataformaMidia)
    : undefined;

  const ehITTool =
    ferramentaAtiva?.startsWith("it_") ||
    ferramentaAtiva === "it_tools";

  const ferramentaIT = ehITTool && ferramentaAtiva !== "it_tools"
    ? (ferramentaAtiva === "it_unidades" ? "conversor_unidades"
      : ferramentaAtiva === "it_aspect_ratio" ? "aspect_ratio"
      : ferramentaAtiva === "it_contraste" ? "contraste_wcag"
      : ferramentaAtiva === "it_cases" ? "case_converter"
      : ferramentaAtiva === "it_estatisticas" ? "estatisticas_texto"
      : ferramentaAtiva === "it_limpador" ? "limpador_texto"
      : ferramentaAtiva === "it_qr_code" ? "qr_code"
      : ferramentaAtiva === "it_lorem" ? "lorem_ipsum"
      : ferramentaAtiva === "it_json" ? "json_formatter"
      : ferramentaAtiva === "it_hash_base64" ? "hash_base64"
      : ferramentaAtiva?.replace(/^it_/, ""))
    : undefined;

  const ehChat = ferramentaAtiva === "chat_ia" || ferramentaAtiva === "chat";

  return (
    <ContextoFerramentasFlutuantes.Provider
      value={{ ferramentaAtiva, opcoesAtivas, abrirFerramentaFlutuante, fecharFerramentaFlutuante }}
    >
      {children}

      {ferramentaAtiva && (
        <div
          style={{ zIndex: 300 }}
          className={cn(
            "fixed inset-0 flex bg-black/70 p-2 sm:p-4 backdrop-blur-xs animate-in fade-in duration-150",
            ehChat ? "items-end sm:items-center justify-end sm:justify-center" : "items-center justify-center"
          )}
          onClick={fecharFerramentaFlutuante}
        >
          <div
            className={cn(
              "flex flex-col border border-border bg-background shadow-2xl overflow-hidden transition-all",
              ehChat
                ? "h-[88vh] sm:h-[650px] w-full max-w-2xl rounded-2xl sm:mr-4 sm:mb-2"
                : "h-[90vh] sm:h-auto max-h-[92vh] w-full max-w-4xl rounded-2xl"
            )}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Topo do Modal Focado */}
            <div className="flex shrink-0 items-center justify-between border-b border-border bg-card/95 backdrop-blur-md px-4 py-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary border border-primary/20">
                  <IconeComp size={18} />
                </div>
                <div className="min-w-0">
                  <h2 className="font-bold text-sm text-foreground tracking-tight truncate">
                    {infoFerramenta?.titulo || "Ferramenta"}
                  </h2>
                  <p className="text-xs text-muted-foreground truncate">
                    {infoFerramenta?.descricao || "Execução rápida e focada"}
                  </p>
                </div>
              </div>

              <button
                onClick={fecharFerramentaFlutuante}
                className="rounded-lg p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors cursor-pointer shrink-0 ml-2"
                aria-label="Fechar janela da ferramenta"
              >
                <X size={20} />
              </button>
            </div>

            {/* Conteúdo da Ferramenta Focada */}
            <div className="min-h-0 flex-1 overflow-y-auto bg-background p-3 sm:p-5">
              <Suspense
                fallback={
                  <div className="flex h-64 items-center justify-center gap-2 text-muted-foreground">
                    <Loader2 size={20} className="animate-spin text-primary" />
                    <span className="text-sm">Carregando ferramenta...</span>
                  </div>
                }
              >
                {ehFerramentaPDF ? (
                  <FerramentasPDF modoFocado={Boolean(abaPDF)} abaInicial={abaPDF} />
                ) : ehConversor ? (
                  <Conversor modoFocado={Boolean(ferramentaConversor)} ferramentaInicial={ferramentaConversor} />
                ) : ehBaixador ? (
                  <BaixadorMidia modoFocado={Boolean(abaBaixador)} abaInicial={abaBaixador} />
                ) : ehITTool ? (
                  <ITTools modoFocado={Boolean(ferramentaIT)} ferramentaInicial={ferramentaIT} />
                ) : ehChat ? (
                  <Chat
                    modoFlutuante={true}
                    mensagemInicial={opcoesAtivas?.mensagemInicial}
                    aoFechar={fecharFerramentaFlutuante}
                  />
                ) : ferramentaAtiva === "pesquisa_livros" ? (
                  <PesquisaLivros />
                ) : ferramentaAtiva === "sons" ? (
                  <Sons />
                ) : ferramentaAtiva === "transcritor" ? (
                  <Transcritor />
                ) : ferramentaAtiva === "configuracoes" ? (
                  <Configuracoes />
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
