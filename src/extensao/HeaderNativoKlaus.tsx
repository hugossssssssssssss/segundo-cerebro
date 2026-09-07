import { useState, useEffect } from "react";
import { BarraFavoritos } from "@/components/BarraFavoritos";
import { LogoKlaus } from "@/components/LogoKlaus";
import { HeaderAcoesOrdenaveis } from "@/components/HeaderAcoesOrdenaveis";
import { CapturaRapida } from "@/components/CapturaRapida";
import { Busca } from "@/components/Busca";
import { ModalBuscaWeb } from "@/components/ModalBuscaWeb";
import { lerFavoritosLocal, salvarFavoritosLocal, FAVORITOS_PADRAO_KLAUS } from "@/lib/favoritos";

export function HeaderNativoKlaus({
  aoMudarEstadoModal,
}: {
  aoMudarEstadoModal?: (aberto: boolean) => void;
}) {
  const [capturando, setCapturando] = useState(false);
  const [buscando, setBuscando] = useState(false);
  const [buscandoWeb, setBuscandoWeb] = useState(false);
  const [textoCompartilhado, setTextoCompartilhado] = useState("");

  // Som Ambiente
  const [somAmbiente, setSomAmbiente] = useState<string | null>(() => {
    try {
      return localStorage.getItem("klaus_som_ambiente");
    } catch {
      return null;
    }
  });
  const [somAmbienteTocando, setSomAmbienteTocando] = useState(false);
  const [volumeSomAmbiente, setVolumeSomAmbiente] = useState(0.4);
  const [somMenuAberto, setSomMenuAberto] = useState(false);

  // Inicializa com os atalhos reais do Klaus se o storage estiver vazio
  useEffect(() => {
    try {
      const locais = lerFavoritosLocal();
      if (!locais || locais.length === 0) {
        salvarFavoritosLocal(FAVORITOS_PADRAO_KLAUS);
      }
    } catch {}
  }, []);

  // Notifica o container se algum modal está aberto
  useEffect(() => {
    const modalAberto = capturando || buscando || buscandoWeb || somMenuAberto;
    aoMudarEstadoModal?.(modalAberto);
  }, [capturando, buscando, buscandoWeb, somMenuAberto, aoMudarEstadoModal]);

  const dispararCaptura = () => {
    const tituloDoc = typeof document !== "undefined" ? document.title || "" : "";
    const urlDoc = typeof window !== "undefined" ? window.location.href || "" : "";
    const selecao = typeof window !== "undefined" && window.getSelection ? window.getSelection()?.toString().trim() || "" : "";

    const partes: string[] = [];
    if (tituloDoc) partes.push(tituloDoc);
    if (urlDoc) partes.push(urlDoc);
    if (selecao) {
      partes.push("");
      partes.push(`> ${selecao}`);
    }

    setTextoCompartilhado(partes.join("\n"));
    setCapturando(true);
  };

  // Atalhos de teclado oficiais
  useEffect(() => {
    const aoDigitar = (e: KeyboardEvent) => {
      const meta = e.metaKey || e.ctrlKey;
      if (meta && e.key.toLowerCase() === "j") {
        e.preventDefault();
        dispararCaptura();
      } else if (meta && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setBuscando(true);
      }
    };
    window.addEventListener("keydown", aoDigitar);
    return () => window.removeEventListener("keydown", aoDigitar);
  }, []);

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/90 backdrop-blur shrink-0 w-full select-none">
      <div className="flex items-center justify-between transition-all w-full px-3.5 sm:px-6 h-14">
        {/* Lado Esquerdo: Logo do Klaus + Barra de Favoritos Autêntica */}
        <div className="flex items-center gap-2 min-w-0 mr-2 flex-1">
          <a
            href="https://hugossssssssssssss.github.io/segundo-cerebro/"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 font-bold tracking-tight text-sm hover:opacity-90 transition-opacity shrink-0 cursor-pointer"
            title="Abrir Klaus"
          >
            <LogoKlaus tamanho={24} />
            <span>Klaus</span>
          </a>

          <BarraFavoritos className="flex-1 min-w-0" />
        </div>

          {/* Ações do Header Reordenáveis via Drag and Drop */}
          <HeaderAcoesOrdenaveis
            onAbrirCaptura={dispararCaptura}
            onAbrirBusca={() => setBuscando(true)}
            onAbrirBuscaWeb={() => setBuscandoWeb(true)}
            somAmbiente={somAmbiente}
            somAmbienteTocando={somAmbienteTocando}
            setSomAmbiente={setSomAmbiente}
            setSomAmbienteTocando={setSomAmbienteTocando}
            setSomMenuAberto={setSomMenuAberto}
            somMenuAberto={somMenuAberto}
            volumeSomAmbiente={volumeSomAmbiente}
            setVolumeSomAmbiente={setVolumeSomAmbiente}
          />
        </div>

      {/* Modais Oficiais do Klaus */}
      <CapturaRapida
        aberta={capturando}
        textoInicial={textoCompartilhado}
        aoFechar={() => {
          setCapturando(false);
          setTextoCompartilhado("");
        }}
      />
      <Busca
        aberta={buscando}
        aoFechar={() => setBuscando(false)}
      />
      <ModalBuscaWeb
        aberta={buscandoWeb}
        aoFechar={() => setBuscandoWeb(false)}
      />
    </header>
  );
}
