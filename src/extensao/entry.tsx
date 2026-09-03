import { createRoot } from "react-dom/client";
import { useState, useEffect } from "react";
import "@/index.css";
import { HeaderOficialExtensao } from "./HeaderOficialExtensao";
import { TooltipProvider } from "@/components/ui/tooltip";

declare const chrome: any;

function AppExtensao() {
  // Inicialmente aberta para o usuário ver de primeira, podendo desafixar ou recolher
  const [visivel, setVisivel] = useState(() => {
    try {
      const salvo = localStorage.getItem("klaus_barra_fixada");
      return salvo !== null ? salvo === "true" : true;
    } catch {
      return true;
    }
  });

  const [fixado, setFixado] = useState(() => {
    try {
      const salvo = localStorage.getItem("klaus_barra_fixada");
      return salvo !== null ? salvo === "true" : true;
    } catch {
      return true;
    }
  });

  const [modalAberto, setModalAberto] = useState(false);

  // Monitora o cursor do mouse no topo de qualquer site
  useEffect(() => {
    let timerFechar: any = null;

    const aoMoverMouse = (e: MouseEvent) => {
      if (e.clientY <= 12) {
        clearTimeout(timerFechar);
        setVisivel(true);
      } else if (e.clientY > 75 && !fixado && !modalAberto) {
        clearTimeout(timerFechar);
        timerFechar = setTimeout(() => {
          setVisivel(false);
        }, 250);
      }
    };

    window.addEventListener("mousemove", aoMoverMouse, { capture: true, passive: true });
    return () => window.removeEventListener("mousemove", aoMoverMouse, { capture: true } as any);
  }, [fixado, modalAberto]);

  // Atalho Alt+K (ou Option+K no Mac) e mensagens do background
  useEffect(() => {
    const aoDigitar = (e: KeyboardEvent) => {
      if (e.altKey && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setVisivel((prev) => !prev);
      }
    };

    const escutarMensagens = (msg: any) => {
      if (msg && msg.action === "toggle-klaus-bar") {
        setVisivel((prev) => !prev);
      }
    };

    window.addEventListener("keydown", aoDigitar, { capture: true });
    if (typeof chrome !== "undefined" && chrome.runtime?.onMessage) {
      chrome.runtime.onMessage.addListener(escutarMensagens);
    }

    return () => {
      window.removeEventListener("keydown", aoDigitar, { capture: true } as any);
      if (typeof chrome !== "undefined" && chrome.runtime?.onMessage) {
        chrome.runtime.onMessage.removeListener(escutarMensagens);
      }
    };
  }, []);

  const alternarFixar = () => {
    const novo = !fixado;
    setFixado(novo);
    setVisivel(novo || true);
    try {
      localStorage.setItem("klaus_barra_fixada", String(novo));
    } catch {}
  };

  const estaAberto = visivel || fixado || modalAberto;

  return (
    <div
      className="dark text-foreground select-none"
      style={{
        fontSize: "16px",
        fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
        lineHeight: "1.5",
        boxSizing: "border-box",
      }}
    >
      {/* Zona de Gatilho no Topo (14px de altura no topo da janela) */}
      <div
        onMouseEnter={() => setVisivel(true)}
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          width: "100vw",
          height: "14px",
          zIndex: 2147483646,
          background: "transparent",
          pointerEvents: "auto",
        }}
      />

      {/* Alça visual no topo para indicar presença quando recolhido */}
      {!estaAberto && (
        <div
          onClick={() => setVisivel(true)}
          onMouseEnter={() => setVisivel(true)}
          style={{
            position: "fixed",
            top: 0,
            left: "50%",
            transform: "translateX(-50%)",
            width: "54px",
            height: "5px",
            background: "rgba(99, 102, 241, 0.7)",
            borderBottomLeftRadius: "6px",
            borderBottomRightRadius: "6px",
            zIndex: 2147483646,
            cursor: "pointer",
            boxShadow: "0 2px 8px rgba(0,0,0,0.4)",
            pointerEvents: "auto",
            transition: "height 0.2s ease, background 0.2s ease",
          }}
          title="Clique para abrir o Klaus (Option+K)"
        />
      )}

      {/* Barra do Header Oficial Nativo */}
      <div
        onMouseEnter={() => setVisivel(true)}
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          width: "100vw",
          zIndex: 2147483647,
          transform: estaAberto ? "translateY(0)" : "translateY(-105%)",
          opacity: estaAberto ? 1 : 0,
          transition: "transform 0.22s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.18s ease",
          pointerEvents: estaAberto ? "auto" : "none",
        }}
      >
        <HeaderOficialExtensao
          estaFixado={fixado}
          aoAlternarFixar={alternarFixar}
          onModalStateChange={setModalAberto}
        />
      </div>
    </div>
  );
}

// Inicializa no documento
(function iniciarExtensao() {
  if (document.getElementById("klaus-hud-extension-root")) return;

  const host = document.createElement("div");
  host.id = "klaus-hud-extension-root";
  host.style.cssText = "all: initial; position: fixed; top: 0; left: 0; width: 100vw; height: 0; z-index: 2147483647; display: block !important;";
  document.documentElement.appendChild(host);

  const shadow = host.attachShadow({ mode: "open" });

  const linkCss = document.createElement("link");
  linkCss.rel = "stylesheet";
  linkCss.href = chrome.runtime.getURL("content-bundle.css");
  shadow.appendChild(linkCss);

  const container = document.createElement("div");
  container.style.cssText = "all: initial; font-size: 16px !important; line-height: 1.5 !important; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important; color-scheme: dark !important; display: block !important;";
  shadow.appendChild(container);

  const root = createRoot(container);
  root.render(
    <TooltipProvider>
      <AppExtensao />
    </TooltipProvider>
  );

  console.log("%c[Klaus]%c Header Oficial carregado no navegador!", "color: #6366f1; font-weight: bold;", "color: inherit;");
})();
