/**
 * Content Script da Extensão Klaus para Brave & Chromium
 *
 * Injeta o cabeçalho oficial do Klaus como barra suspensa no topo de qualquer página web.
 * A barra desliza para baixo ao aproximar o mouse do topo da janela (clientY <= 8px).
 */

(function () {
  if (document.getElementById("klaus-extension-host")) return;

  const host = document.createElement("div");
  host.id = "klaus-extension-host";
  document.documentElement.appendChild(host);

  const shadow = host.attachShadow({ mode: "open" });

  const linkCss = document.createElement("link");
  linkCss.rel = "stylesheet";
  linkCss.href = chrome.runtime.getURL("content.css");
  shadow.appendChild(linkCss);

  const KLAUS_URL_PADRAO = "https://hugossssssssssssss.github.io/segundo-cerebro";
  let klausBaseUrl = KLAUS_URL_PADRAO;
  let estaFixado = false;
  let modalAberto = false;
  let timerFechar = null;

  const rootDiv = document.createElement("div");
  rootDiv.innerHTML = `
    <!-- Gatilho de Hover Invisível no Topo -->
    <div class="klaus-hover-trigger" id="klaus-trigger"></div>

    <!-- Container do Header Oficial do Klaus via Iframe -->
    <div class="klaus-header-hud" id="klaus-hud">
      <iframe
        id="klaus-frame"
        src="${klausBaseUrl}/#/header-hud"
        allow="clipboard-read; clipboard-write"
      ></iframe>
    </div>
  `;

  shadow.appendChild(rootDiv);

  const hud = shadow.getElementById("klaus-hud");
  const trigger = shadow.getElementById("klaus-trigger");
  const iframe = shadow.getElementById("klaus-frame");

  // Carrega configurações da extensão
  chrome.storage.sync.get(["klausUrl", "barraFixada"], (res) => {
    if (res.klausUrl) {
      klausBaseUrl = res.klausUrl.replace(/\/$/, "");
      iframe.src = `${klausBaseUrl}/#/header-hud`;
    }
    if (res.barraFixada) {
      estaFixado = true;
      hud.classList.add("visivel");
    }
  });

  function abrirBarra() {
    clearTimeout(timerFechar);
    hud.classList.add("visivel");
  }

  function fecharBarra() {
    if (estaFixado || modalAberto) return;
    clearTimeout(timerFechar);
    timerFechar = setTimeout(() => {
      hud.classList.remove("visivel");
    }, 250);
  }

  // Detecção de mouse no topo da tela em qualquer site
  window.addEventListener("mousemove", (e) => {
    if (e.clientY <= 8) {
      abrirBarra();
    } else if (e.clientY > 60 && !estaFixado && !modalAberto) {
      fecharBarra();
    }
  });

  hud.addEventListener("mouseenter", abrirBarra);
  hud.addEventListener("mouseleave", fecharBarra);
  trigger.addEventListener("mouseenter", abrirBarra);

  // Escuta mensagens do HeaderHUD interno para expandir tamanho quando abrir Busca/Captura/Modais
  window.addEventListener("message", (e) => {
    if (e.data && e.data.type === "klaus-redimensionar") {
      modalAberto = !!e.data.expandido;
      if (e.data.altura) {
        hud.style.height = `${e.data.altura}px`;
        iframe.style.height = `${e.data.altura}px`;
      }
      if (modalAberto) {
        abrirBarra();
      }
    }
  });

  // Atalho Alt+K
  chrome.runtime.onMessage.addListener((msg) => {
    if (msg.action === "toggle-klaus-bar") {
      if (hud.classList.contains("visivel")) {
        hud.classList.remove("visivel");
      } else {
        abrirBarra();
      }
    }
  });
})();
