import { useState, useEffect } from "react";
import { ExternalLink } from "lucide-react";
import { BarraFavoritos } from "@/components/BarraFavoritos";
import { LogoKlaus } from "@/components/LogoKlaus";
import { HeaderAcoesOrdenaveis } from "@/components/HeaderAcoesOrdenaveis";
import { CapturaRapida } from "@/components/CapturaRapida";
import { Busca } from "@/components/Busca";
import { ModalBuscaWeb } from "@/components/ModalBuscaWeb";

export default function HeaderHUD() {
  const [capturando, setCapturando] = useState(false);
  const [buscando, setBuscando] = useState(false);
  const [buscandoWeb, setBuscandoWeb] = useState(false);

  // Contexto da página capturada do navegador
  const [contextoPagina, setContextoPagina] = useState<{
    titulo: string;
    url: string;
    selecao: string;
  }>({ titulo: "", url: "", selecao: "" });

  // Sons de fundo
  const [somAmbiente, setSomAmbiente] = useState<string | null>(() => localStorage.getItem("klaus_som_ambiente"));
  const [somAmbienteTocando, setSomAmbienteTocando] = useState(false);
  const [volumeSomAmbiente, setVolumeSomAmbiente] = useState(0.4);
  const [somMenuAberto, setSomMenuAberto] = useState(false);

  // Escuta contexto da página enviado pela extensão
  useEffect(() => {
    const escutarMensagem = (e: MessageEvent) => {
      if (e.data && e.data.type === "klaus-contexto-pagina") {
        setContextoPagina({
          titulo: e.data.titulo || "",
          url: e.data.url || "",
          selecao: e.data.selecao || "",
        });
      }
    };

    window.addEventListener("message", escutarMensagem);
    // Solicita contexto inicial para a extensão
    window.parent.postMessage({ type: "klaus-pedir-contexto" }, "*");
    return () => window.removeEventListener("message", escutarMensagem);
  }, []);

  // Notifica a extensão para expandir a altura ao abrir modais/popovers
  useEffect(() => {
    const expandir = capturando || buscando || buscandoWeb || somMenuAberto;
    window.parent.postMessage(
      {
        type: "klaus-redimensionar",
        altura: expandir ? 650 : 54,
        expandido: expandir,
      },
      "*"
    );
  }, [capturando, buscando, buscandoWeb, somMenuAberto]);

  // Monta texto inicial para o modal de captura rápida
  const textoInicialCaptura = (() => {
    if (!contextoPagina.url) return "";
    const linhas: string[] = [];
    if (contextoPagina.titulo) linhas.push(contextoPagina.titulo);
    linhas.push(contextoPagina.url);
    if (contextoPagina.selecao) {
      linhas.push("");
      linhas.push(`> ${contextoPagina.selecao}`);
    }
    return linhas.join("\n");
  })();

  return (
    <div className="w-full bg-background/95 backdrop-blur-md border-b border-border text-foreground select-none overflow-visible">
      <div className="flex items-center justify-between px-3.5 sm:px-6 h-13 sm:h-14 gap-2 w-full">
        {/* Lado Esquerdo: Logo do Klaus e Barra de Favoritos */}
        <div className="flex items-center gap-2.5 flex-1 min-w-0 mr-2">
          <a
            href="https://hugossssssssssssss.github.io/segundo-cerebro/"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 font-bold tracking-tight text-sm hover:opacity-90 transition-opacity shrink-0 group cursor-pointer"
            title="Abrir Klaus Segundo Cérebro em nova aba"
          >
            <LogoKlaus tamanho={24} />
            <span className="hidden xs:inline">Klaus</span>
            <ExternalLink size={12} className="text-muted-foreground group-hover:text-foreground transition-colors hidden sm:inline" />
          </a>

          <BarraFavoritos className="flex-1 min-w-0" />
        </div>

        {/* Lado Direito: Ações Rápidas Oficiais do Klaus */}
        <div className="flex items-center gap-0.5 sm:gap-1 shrink-0">
          {/* Ações do Header Reordenáveis via Drag and Drop */}
          <HeaderAcoesOrdenaveis
            onAbrirCaptura={() => setCapturando(true)}
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
            aoNotificar={false}
          />
        </div>
      </div>

      {/* Modais Integrados Oficiais */}
      <CapturaRapida
        aberta={capturando}
        textoInicial={textoInicialCaptura}
        aoFechar={() => setCapturando(false)}
      />
      <Busca aberta={buscando} aoFechar={() => setBuscando(false)} />
      <ModalBuscaWeb aberta={buscandoWeb} aoFechar={() => setBuscandoWeb(false)} />
    </div>
  );
}
