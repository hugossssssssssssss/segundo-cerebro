import { useMemo, useState, useEffect } from "react";
import { ExternalLink } from "lucide-react";
import { lerMarkdown } from "@/lib/markdown";
import { lerConfig } from "@/lib/settings";
import { lerOuVazio } from "@/lib/github";
import { Carregando, Botao } from "@/components/ui";
import type { ItemRepo } from "@/lib/repo";

type Props = {
  item: ItemRepo;
  onAbrirEditor?: () => void;
};

export function MapaMentalEmbed({ item, onAbrirEditor }: Props) {
  const [conteudoTexto, setConteudoTexto] = useState(item.texto || "");
  const [svgHtml, setSvgHtml] = useState<string>("");
  const [carregandoSvg, setCarregandoSvg] = useState(true);

  useEffect(() => {
    if (!conteudoTexto && item.caminho) {
      const cfg = lerConfig();
      lerOuVazio(cfg, item.caminho, item.sha)
        .then((txt) => {
          if (txt) setConteudoTexto(txt);
        })
        .catch(() => {});
    }
  }, [item.caminho, item.sha, conteudoTexto]);

  const docParsed = useMemo(() => {
    return item.doc && item.doc.corpo ? item.doc : lerMarkdown(conteudoTexto || "");
  }, [item, conteudoTexto]);

  const titulo = (docParsed.dados?.titulo as string) || item.nome.replace(/\.md$/, "");
  const ehModoEscuro = typeof document !== "undefined" && document.documentElement.classList.contains("dark");

  useEffect(() => {
    let cancelado = false;
    setCarregandoSvg(true);

    async function gerarSvg() {
      // Se o frontmatter já tem o SVG pré-renderizado, usa direto
      if (docParsed.dados?.svg && typeof docParsed.dados.svg === "string") {
        setSvgHtml(docParsed.dados.svg);
        setCarregandoSvg(false);
        return;
      }

      try {
        const corpoLimpo = docParsed.corpo ? docParsed.corpo.trim() : (conteudoTexto.trim().startsWith("{") ? conteudoTexto.trim() : "");
        let elements: any[] = [];
        let appState: any = {};
        let files: any = {};

        if (corpoLimpo.startsWith("{")) {
          const parsed = JSON.parse(corpoLimpo);
          if (Array.isArray(parsed)) {
            elements = parsed;
          } else if (parsed && typeof parsed === "object") {
            elements = parsed.elements || [];
            appState = parsed.appState || {};
            files = parsed.files || {};
          }
        }

        if (elements.length > 0) {
          const { exportToSvg } = await import("@excalidraw/excalidraw");
          const svgEl = await exportToSvg({
            elements: elements.filter((el) => !el.isDeleted),
            appState: {
              ...appState,
              exportWithDarkMode: ehModoEscuro,
              exportBackground: true,
              viewBackgroundColor: appState?.viewBackgroundColor || (ehModoEscuro ? "#121212" : "#ffffff"),
            },
            files,
          });
          if (!cancelado && svgEl) {
            svgEl.setAttribute("width", "100%");
            svgEl.setAttribute("height", "100%");
            svgEl.style.maxWidth = "100%";
            svgEl.style.maxHeight = "360px";
            setSvgHtml(svgEl.outerHTML);
          }
        }
      } catch {
        // ignora falha
      } finally {
        if (!cancelado) setCarregandoSvg(false);
      }
    }

    gerarSvg();
    return () => {
      cancelado = true;
    };
  }, [docParsed, conteudoTexto, ehModoEscuro]);

  const abrirNoExcalidraw = () => {
    if (onAbrirEditor) {
      onAbrirEditor();
    } else {
      window.location.hash = `#/lousas?abrir=${encodeURIComponent(item.caminho)}`;
      window.dispatchEvent(new HashChangeEvent("hashchange"));
    }
  };

  return (
    <div className="my-4 w-full rounded-2xl border border-indigo-500/30 bg-card overflow-hidden shadow-lg transition-all hover:border-indigo-500/50">
      <div className="flex items-center justify-between px-4 py-2.5 bg-indigo-500/10 dark:bg-indigo-950/40 border-b border-indigo-500/20">
        <div className="flex items-center gap-2">
          <span className="text-base">🗺️</span>
          <span className="font-bold text-sm text-indigo-700 dark:text-indigo-300">
            Mapa Mental: {titulo}
          </span>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-800 dark:text-indigo-200 font-medium">
            Excalidraw Visual
          </span>
        </div>
        <Botao
          variante="fantasma"
          tamanho="pequeno"
          onClick={abrirNoExcalidraw}
          className="text-xs text-indigo-600 dark:text-indigo-400 hover:bg-indigo-500/20 flex items-center gap-1.5"
        >
          <span>Abrir no Editor Excalidraw</span>
          <ExternalLink size={13} />
        </Botao>
      </div>

      <div
        onClick={abrirNoExcalidraw}
        className="w-full min-h-[220px] max-h-[380px] p-4 bg-background/50 dark:bg-neutral-950/50 flex items-center justify-center cursor-pointer hover:bg-accent/40 transition-colors relative overflow-hidden group"
        title="Clique para abrir e editar no Excalidraw em Tela Cheia"
      >
        {carregandoSvg ? (
          <Carregando texto="Gerando visualização do mapa mental..." />
        ) : svgHtml ? (
          <div
            className="w-full h-full flex items-center justify-center pointer-events-none group-hover:scale-[1.01] transition-transform"
            dangerouslySetInnerHTML={{ __html: svgHtml }}
          />
        ) : (
          <div className="text-center text-sm text-muted-foreground p-6">
            <span>🗺️ Mapa Mental sem elementos desenhados ainda.</span>
            <div className="mt-2 text-xs text-indigo-500 font-semibold underline">Clique aqui para abrir e desenhar no Excalidraw</div>
          </div>
        )}
      </div>
    </div>
  );
}
