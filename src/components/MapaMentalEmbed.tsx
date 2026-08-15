import { lazy, Suspense, useMemo, useState, useEffect } from "react";
import { ExternalLink } from "lucide-react";
import { lerMarkdown } from "@/lib/markdown";
import { lerConfig } from "@/lib/settings";
import { lerOuVazio } from "@/lib/github";
import { Carregando, Botao } from "@/components/ui";
import type { ItemRepo } from "@/lib/repo";

const ExcalidrawComp = lazy(() =>
  import("@excalidraw/excalidraw").then((m) => ({ default: m.Excalidraw }))
);

type Props = {
  item: ItemRepo;
  onAbrirEditor?: () => void;
};

export function MapaMentalEmbed({ item, onAbrirEditor }: Props) {
  const [conteudoTexto, setConteudoTexto] = useState(item.texto || "");

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

  const cenaParsed = useMemo(() => {
    try {
      const doc = item.doc && item.doc.corpo ? item.doc : lerMarkdown(conteudoTexto || "");
      const corpoLimpo = doc.corpo ? doc.corpo.trim() : (conteudoTexto.trim().startsWith("{") ? conteudoTexto.trim() : "");
      if (corpoLimpo.startsWith("{")) {
        const parsed = JSON.parse(corpoLimpo);
        if (Array.isArray(parsed)) return { elements: parsed };
        if (parsed && typeof parsed === "object") return parsed;
      }
    } catch {
      // ignora falha de parse
    }
    return { elements: [] };
  }, [item, conteudoTexto]);

  const titulo = (item.doc?.dados?.titulo as string) || item.nome.replace(/\.md$/, "");
  const ehModoEscuro = typeof document !== "undefined" && document.documentElement.classList.contains("dark");

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
            Excalidraw
          </span>
        </div>
        <Botao
          variante="fantasma"
          tamanho="pequeno"
          onClick={abrirNoExcalidraw}
          className="text-xs text-indigo-600 dark:text-indigo-400 hover:bg-indigo-500/20 flex items-center gap-1.5"
        >
          <span>Editar no Excalidraw</span>
          <ExternalLink size={13} />
        </Botao>
      </div>

      <div className="w-full h-[380px] bg-background relative overflow-hidden">
        <Suspense fallback={<Carregando texto="Carregando desenho do mapa mental..." />}>
          <ExcalidrawComp
            key={`embed-${item.caminho}`}
            viewModeEnabled={true}
            zenModeEnabled={true}
            gridModeEnabled={false}
            theme={ehModoEscuro ? "dark" : "light"}
            initialData={{
              elements: cenaParsed.elements || [],
              appState: {
                ...(cenaParsed.appState || {}),
                viewBackgroundColor: cenaParsed.appState?.viewBackgroundColor || (ehModoEscuro ? "#121212" : "#ffffff"),
                zoom: { value: 0.8 },
              },
              files: cenaParsed.files || {},
            }}
            UIOptions={{
              canvasActions: {
                changeViewBackgroundColor: false,
                clearCanvas: false,
                loadScene: false,
                saveToActiveFile: false,
                toggleTheme: false,
              },
            }}
          />
        </Suspense>
      </div>
    </div>
  );
}
