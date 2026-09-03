/**
 * Content Script Oficial do Klaus para Chromium & Brave
 *
 * Injeta o cabeçalho autêntico do Klaus no topo de qualquer site da web,
 * com todos os favoritos, tokens, temas e modais originais do aplicativo.
 */

(function iniciarKlausHUD() {
  if (document.getElementById("klaus-hud-host")) return;

  const host = document.createElement("div");
  host.id = "klaus-hud-host";
  host.style.cssText = "all: initial; position: fixed; top: 0; left: 0; width: 100vw; height: 0; z-index: 2147483647; display: block !important;";
  document.documentElement.appendChild(host);

  const shadow = host.attachShadow({ mode: "open" });

  let visivel = false;
  let modalAberto = false;
  let timerFechar = null;

  const KLAUS_URL = "https://hugossssssssssssss.github.io/segundo-cerebro/#/header-hud";

  // Cria estrutura HTML no Shadow DOM
  const rootDiv = document.createElement("div");
  rootDiv.innerHTML = `
    <style>
      :host {
        all: initial;
      }
      .klaus-trigger {
        position: fixed;
        top: 0;
        left: 0;
        width: 100vw;
        height: 18px;
        z-index: 2147483646;
        background: transparent;
        pointer-events: auto;
      }
      .klaus-alca {
        position: fixed;
        top: 0;
        left: 50%;
        transform: translateX(-50%);
        width: 64px;
        height: 4px;
        background: linear-gradient(90deg, #6366F1, #8B5CF6, #D946EF);
        border-bottom-left-radius: 6px;
        border-bottom-right-radius: 6px;
        z-index: 2147483646;
        cursor: pointer;
        box-shadow: 0 2px 10px rgba(99, 102, 241, 0.5);
        pointer-events: auto;
        transition: height 0.2s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.2s ease;
      }
      .klaus-alca:hover {
        height: 6px;
      }
      .klaus-container {
        position: fixed;
        top: 0;
        left: 0;
        width: 100vw;
        height: 56px;
        z-index: 2147483647;
        transform: translateY(-105%);
        opacity: 0;
        transition: transform 0.26s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.2s ease, height 0.2s ease;
        pointer-events: none;
      }
      .klaus-container.visivel {
        transform: translateY(0);
        opacity: 1;
        pointer-events: auto;
        box-shadow: 0 10px 30px -10px rgba(0, 0, 0, 0.5);
      }
      .klaus-frame {
        width: 100%;
        height: 100%;
        border: none;
        background: transparent;
        display: block;
        color-scheme: dark light;
      }
    </style>

    <!-- Zona de Gatilho de Hover Superior (18px) -->
    <div class="klaus-trigger" id="klaus-trigger"></div>

    <!-- Alça Visual no Topo -->
    <div class="klaus-alca" id="klaus-alca" title="Klaus — Passe o mouse ou clique (Option+K)"></div>

    <!-- Container do Header com Iframe do Klaus Oficial -->
    <div class="klaus-container" id="klaus-container">
      <iframe
        id="klaus-iframe"
        class="klaus-frame"
        src="${KLAUS_URL}"
        allow="clipboard-read; clipboard-write; autoplay"
      ></iframe>
    </div>
  `;

  shadow.appendChild(rootDiv);

  const container = shadow.getElementById("klaus-container");
  const trigger = shadow.getElementById("klaus-trigger");
  const alca = shadow.getElementById("klaus-alca");
  const iframe = shadow.getElementById("klaus-iframe");

  function enviarContextoPagina() {
    try {
      const selecao = window.getSelection ? window.getSelection().toString().trim() : "";
      iframe.contentWindow?.postMessage(
        {
          type: "klaus-contexto-pagina",
          titulo: document.title || "",
          url: window.location.href || "",
          selecao,
        },
        "*"
      );
    } catch {}
  }

  function abrir() {
    clearTimeout(timerFechar);
    visivel = true;
    container.classList.add("visivel");
    alca.style.opacity = "0";
    enviarContextoPagina();
  }

  function fechar() {
    if (modalAberto) return;
    clearTimeout(timerFechar);
    timerFechar = setTimeout(() => {
      visivel = false;
      container.classList.remove("visivel");
      alca.style.opacity = "1";
    }, 320); // Debounce fluido
  }

  // Monitora aproximação do cursor no topo de qualquer site
  window.addEventListener("mousemove", (e) => {
    if (e.clientY <= 18) {
      abrir();
    } else if (e.clientY > 68 && !modalAberto) {
      fechar();
    }
  }, { capture: true, passive: true });

  container.addEventListener("mouseenter", abrir);
  container.addEventListener("mouseleave", fechar);
  trigger.addEventListener("mouseenter", abrir);
  alca.addEventListener("mouseenter", abrir);
  alca.addEventListener("click", abrir);

  // Escuta mensagens do HeaderHUD interno
  window.addEventListener("message", (e) => {
    if (!e.data) return;

    if (e.data.type === "klaus-pedir-contexto") {
      enviarContextoPagina();
    } else if (e.data.type === "klaus-redimensionar") {
      modalAberto = !!e.data.expandido;
      if (e.data.altura) {
        container.style.height = `${e.data.altura}px`;
      }
      if (modalAberto) {
        abrir();
      }
    }
  });

  // Atalho Option+K / Alt+K
  window.addEventListener("keydown", (e) => {
    if (e.altKey && e.key.toLowerCase() === "k") {
      e.preventDefault();
      if (container.classList.contains("visivel")) {
        fechar();
      } else {
        abrir();
      }
    }
  }, { capture: true });

  // Mensagens do background worker
  if (typeof chrome !== "undefined" && chrome.runtime?.onMessage) {
    chrome.runtime.onMessage.addListener((msg) => {
      if (msg && msg.action === "toggle-klaus-bar") {
        if (container.classList.contains("visivel")) {
          fechar();
        } else {
          abrir();
        }
      }
    });
  }

  console.log("%c[Klaus]%c Extensão Oficial pronta no navegador!", "color: #6366f1; font-weight: bold;", "color: inherit;");
})();
