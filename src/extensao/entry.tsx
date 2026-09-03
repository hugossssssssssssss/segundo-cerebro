import { createRoot } from "react-dom/client";
import { useState, useEffect } from "react";
import "@/index.css";
import { HeaderExtensao } from "./HeaderExtensao";

declare const chrome: any;

function AppExtensao() {
  const [visivel, setVisivel] = useState(false);
  const [fixado, setFixado] = useState(() => {
    return localStorage.getItem("klaus_barra_fixada") === "true";
  });
  const [modalAberto, setModalAberto] = useState(false);

  // Monitora o cursor do mouse no topo de qualquer site
  useEffect(() => {
    let timerFechar: any = null;

    const aoMoverMouse = (e: MouseEvent) => {
      if (e.clientY <= 8) {
        clearTimeout(timerFechar);
        setVisivel(true);
      } else if (e.clientY > 65 && !fixado && !modalAberto) {
        clearTimeout(timerFechar);
        timerFechar = setTimeout(() => {
          setVisivel(false);
        }, 250);
      }
    };

    window.addEventListener("mousemove", aoMoverMouse);
    return () => window.removeEventListener("mousemove", aoMoverMouse);
  }, [fixado, modalAberto]);

  // Atalho Alt+K (ou Option+K no Mac)
  useEffect(() => {
    const aoDigitar = (e: KeyboardEvent) => {
      if (e.altKey && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setVisivel((prev) => !prev);
      }
    };
    window.addEventListener("keydown", aoDigitar);
    return () => window.removeEventListener("keydown", aoDigitar);
  }, []);

  const alternarFixar = () => {
    const novo = !fixado;
    setFixado(novo);
    localStorage.setItem("klaus_barra_fixada", String(novo));
    if (novo) setVisivel(true);
  };

  const estaAberto = visivel || fixado || modalAberto;

  return (
    <>
      {/* Zona de Gatilho no Topo */}
      <div
        onMouseEnter={() => setVisivel(true)}
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          width: "100vw",
          height: "8px",
          zIndex: 2147483646,
          background: "transparent",
        }}
      />

      {/* Barra do Header Nativo */}
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
          transition: "transform 0.24s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.2s ease",
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

// Inicializa no documento se ainda não existir
(function iniciarExtensao() {
  if (document.getElementById("klaus-hud-extension-root")) return;

  const host = document.createElement("div");
  host.id = "klaus-hud-extension-root";
  document.documentElement.appendChild(host);

  const shadow = host.attachShadow({ mode: "open" });

  // Injeta o CSS compilado do Tailwind/Klaus dentro do Shadow DOM
  const linkCss = document.createElement("link");
  linkCss.rel = "stylesheet";
  linkCss.href = chrome.runtime.getURL("content-bundle.css");
  shadow.appendChild(linkCss);

  const container = document.createElement("div");
  shadow.appendChild(container);

  const root = createRoot(container);
  root.render(<AppExtensao />);
})();
