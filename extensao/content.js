/**
 * Content Script da Extensão Klaus para Brave & Chromium
 *
 * Injeta o cabeçalho oficial do Klaus (empacotado via build local na extensão)
 * no topo de qualquer página da web, garantindo funcionamento 100% offline,
 * sem bloqueios de CSP ou CORS de sites externos.
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

  let estaFixado = false;
  let modalAberto = false;
  let timerFechar = null;

  // Carrega o Header diretamente da build empacotada na extensão
  const hudUrl = chrome.runtime.getURL("dist/index.html#/header-hud");

  const rootDiv = document.createElement("div");
  rootDiv.innerHTML = `
    <!-- Gatilho de Hover Invisível no Topo -->
    <div class="klaus-hover-trigger" id="klaus-trigger"></div>

    <!-- Container do Header Oficial do Klaus via Iframe Local -->
    <div class="klaus-header-hud" id="klaus-hud">
      <iframe
        id="klaus-frame"
        src="${hudUrl}"
        allow="clipboard-read; clipboard-write; autoplay"
      ></iframe>
    </div>
  `;

  shadow.appendChild(rootDiv);

  const hud = shadow.getElementById("klaus-hud");
  const trigger = shadow.getElementById("klaus-trigger");
  const iframe = shadow.getElementById("klaus-frame");

  // Envia contexto da aba atual (URL, Título e Texto Selecionado) para o Klaus
  function enviarContextoPagina() {
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
  }

  // Carrega preferências salvas
  chrome.storage.sync.get(["barraFixada"], (res) => {
    if (res.barraFixada) {
      estaFixado = true;
      hud.classList.add("visivel");
    }
  });

  function abrirBarra() {
    clearTimeout(timerFechar);
    hud.classList.add("visivel");
    enviarContextoPagina();
  }

  function fecharBarra() {
    if (estaFixado || modalAberto) return;
    clearTimeout(timerFechar);
    timerFechar = setTimeout(() => {
      hud.classList.remove("visivel");
    }, 250);
  }

  // Detecção de mouse no topo da tela em QUALQUER site
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

  // Escuta mensagens do HeaderHUD interno
  window.addEventListener("message", (e) => {
    if (!e.data) return;

    if (e.data.type === "klaus-pedir-contexto") {
      enviarContextoPagina();
    } else if (e.data.type === "klaus-redimensionar") {
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
