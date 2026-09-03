import { createRoot } from "react-dom/client";
import { useState, useEffect } from "react";
import "@/index.css";
import { HeaderExtensao } from "./HeaderExtensao";

declare const chrome: any;

function AppExtensao() {
  const [visivel, setVisivel] = useState(false);
  const [fixado, setFixado] = useState(() => {
    try {
      return localStorage.getItem("klaus_barra_fixada") === "true";
    } catch {
      return false;
    }
  });
  const [modalAberto, setModalAberto] = useState(false);

  // Monitora o cursor do mouse no topo de QUALQUER site com captura global de evento
  useEffect(() => {
    let timerFechar: any = null;

    const aoMoverMouse = (e: MouseEvent) => {
      if (e.clientY <= 10) {
        clearTimeout(timerFechar);
        setVisivel(true);
      } else if (e.clientY > 75 && !fixado && !modalAberto) {
        clearTimeout(timerFechar);
        timerFechar = setTimeout(() => {
          setVisivel(false);
        }, 220);
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
    try {
      localStorage.setItem("klaus_barra_fixada", String(novo));
    } catch {}
    if (novo) setVisivel(true);
  };

  const estaAberto = visivel || fixado || modalAberto;

  return (
    <>
      {/* Zona de Gatilho no Topo (12px de altura no topo da janela) */}
      <div
        onMouseEnter={() => setVisivel(true)}
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          width: "100vw",
          height: "12px",
          zIndex: 2147483646,
          background: "transparent",
          pointerEvents: "auto",
        }}
      />

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
        <HeaderExtensao
          estaFixado={fixado}
          aoAlternarFixar={alternarFixar}
          onModalStateChange={setModalAberto}
        />
      </div>
    </>
  );
}

// Inicializa no documento
(function iniciarExtensao() {
  if (document.getElementById("klaus-hud-extension-root")) return;

  const host = document.createElement("div");
  host.id = "klaus-hud-extension-root";
  document.documentElement.appendChild(host);

  const shadow = host.attachShadow({ mode: "open" });

  const linkCss = document.createElement("link");
  linkCss.rel = "stylesheet";
  linkCss.href = chrome.runtime.getURL("content-bundle.css");
  shadow.appendChild(linkCss);

  const container = document.createElement("div");
  shadow.appendChild(container);

  const root = createRoot(container);
  root.render(<AppExtensao />);
})();
