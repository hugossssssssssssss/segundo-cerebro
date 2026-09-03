import { createRoot } from "react-dom/client";
import { useState, useEffect, useRef } from "react";
import { MemoryRouter } from "react-router-dom";
import cssGlobal from "@/index.css?inline";
import { HeaderNativoKlaus } from "./HeaderNativoKlaus";
import { TooltipProvider } from "@/components/ui/tooltip";

declare const chrome: any;

function AppExtensao() {
  const [visivel, setVisivel] = useState(false);
  const [modalAberto, setModalAberto] = useState(false);
  const timerFecharRef = useRef<any>(null);

  // Monitora cursor do mouse no topo de qualquer página (16px)
  useEffect(() => {
    const aoMoverMouse = (e: MouseEvent) => {
      if (e.clientY <= 16) {
        clearTimeout(timerFecharRef.current);
        setVisivel(true);
      } else if (e.clientY > 64 && !modalAberto) {
        clearTimeout(timerFecharRef.current);
        timerFecharRef.current = setTimeout(() => {
          setVisivel(false);
        }, 320);
      }
    };

    window.addEventListener("mousemove", aoMoverMouse, { capture: true, passive: true });
    return () => window.removeEventListener("mousemove", aoMoverMouse, { capture: true } as any);
  }, [modalAberto]);

  // Atalho Option+K / Alt+K e mensagens da extensão
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

  const estaAberto = visivel || modalAberto;

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
      {/* Zona de Gatilho de Hover Superior (16px) */}
      <div
        onMouseEnter={() => {
          clearTimeout(timerFecharRef.current);
          setVisivel(true);
        }}
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          width: "100vw",
          height: "16px",
          zIndex: 2147483646,
          background: "transparent",
          pointerEvents: "auto",
        }}
      />

      {/* Alça visual com gradiente oficial do Klaus no topo central */}
      {!estaAberto && (
        <div
          onClick={() => setVisivel(true)}
          onMouseEnter={() => {
            clearTimeout(timerFecharRef.current);
            setVisivel(true);
          }}
          style={{
            position: "fixed",
            top: 0,
            left: "50%",
            transform: "translateX(-50%)",
            width: "60px",
            height: "4px",
            background: "linear-gradient(90deg, #6366F1, #8B5CF6, #D946EF)",
            borderBottomLeftRadius: "6px",
            borderBottomRightRadius: "6px",
            zIndex: 2147483646,
            cursor: "pointer",
            boxShadow: "0 2px 10px rgba(99, 102, 241, 0.4)",
            pointerEvents: "auto",
            transition: "height 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
          }}
          title="Klaus — Passe o mouse ou clique (Option+K)"
        />
      )}

      {/* Header Oficial do Klaus */}
      <div
        onMouseEnter={() => {
          clearTimeout(timerFecharRef.current);
          setVisivel(true);
        }}
        onMouseLeave={() => {
          if (!modalAberto) {
            clearTimeout(timerFecharRef.current);
            timerFecharRef.current = setTimeout(() => {
              setVisivel(false);
            }, 320);
          }
        }}
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          width: "100vw",
          zIndex: 2147483647,
          transform: estaAberto ? "translateY(0)" : "translateY(-105%)",
          opacity: estaAberto ? 1 : 0,
          transition: "transform 0.24s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.18s ease",
          pointerEvents: estaAberto ? "auto" : "none",
          boxShadow: estaAberto ? "0 10px 30px -10px rgba(0, 0, 0, 0.5)" : "none",
        }}
      >
        <HeaderNativoKlaus
          aoMudarEstadoModal={setModalAberto}
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

  // Injeta o CSS compilado completo diretamente na tag style inline (instantâneo e à prova de falhas de CSP)
  const styleEl = document.createElement("style");
  styleEl.textContent = `
    :host {
      all: initial;
      --background: 240 21% 12%;
      --foreground: 226 64% 88%;
      --card: 240 21% 15%;
      --card-foreground: 226 64% 88%;
      --popover: 240 20% 18%;
      --popover-foreground: 226 64% 88%;
      --primary: 267 84% 81%;
      --primary-foreground: 240 23% 9%;
      --secondary: 240 16% 23%;
      --secondary-foreground: 226 64% 88%;
      --muted: 240 16% 23%;
      --muted-foreground: 228 24% 72%;
      --accent: 240 16% 23%;
      --accent-foreground: 226 64% 88%;
      --destructive: 343 81% 75%;
      --destructive-foreground: 240 23% 9%;
      --success: hsl(115 54% 76%);
      --warning: hsl(41 86% 83%);
      --border: 240 16% 23%;
      --input: 240 16% 23%;
      --ring: 230 97% 85%;
      --radius: 0.5rem;
      font-size: 16px !important;
      line-height: 1.5 !important;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important;
      color-scheme: dark !important;
      display: block !important;
    }
    ${cssGlobal}
  `;
  shadow.appendChild(styleEl);

  const container = document.createElement("div");
  container.className = "dark";
  container.style.cssText = "all: initial; font-size: 16px !important; line-height: 1.5 !important; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important; display: block !important;";
  shadow.appendChild(container);

  const root = createRoot(container);
  root.render(
    <MemoryRouter>
      <TooltipProvider>
        <AppExtensao />
      </TooltipProvider>
    </MemoryRouter>
  );

  console.log("%c[Klaus]%c Header Oficial autêntico ativo no navegador!", "color: #6366f1; font-weight: bold;", "color: inherit;");
})();
