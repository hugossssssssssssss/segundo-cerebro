/**
 * Klaus — Extensão Oficial para Chromium & Brave
 * Header e Barra de Favoritos HUD Nativa
 */

(function inicializarKlausExtensao() {
  if (document.getElementById("klaus-hud-extension-root")) return;

  const KLAUS_APP_URL = "https://hugossssssssssssss.github.io/segundo-cerebro/";

  const FAVORITOS_INICIAIS = [
    { id: "fav-notas", nome: "Notas", url: `${KLAUS_APP_URL}#/notas`, icone: "📝" },
    { id: "fav-tarefas", nome: "Tarefas", url: `${KLAUS_APP_URL}#/tarefas`, icone: "✅" },
    { id: "fav-lousas", nome: "Lousas", url: `${KLAUS_APP_URL}#/lousas`, icone: "🎨" },
    { id: "fav-grafo", nome: "Grafo", url: `${KLAUS_APP_URL}#/grafo`, icone: "🕸️" },
    { id: "fav-pdi", nome: "PDI", url: `${KLAUS_APP_URL}#/pdi`, icone: "🎯" },
    { id: "fav-inbox", nome: "Inbox", url: `${KLAUS_APP_URL}#/inbox`, icone: "📥" },
    { id: "fav-chat", nome: "Chat", url: `${KLAUS_APP_URL}#/chat`, icone: "💬" },
  ];

  // Cria o elemento host com Shadow DOM isolado
  const host = document.createElement("div");
  host.id = "klaus-hud-extension-root";
  host.style.cssText = "all: initial; position: fixed; top: 0; left: 0; width: 100vw; height: 0; z-index: 2147483647; display: block !important;";
  document.documentElement.appendChild(host);

  const shadow = host.attachShadow({ mode: "open" });

  // Estilos isolados com design system autêntico do Klaus (Dark & Frosted Glass)
  const style = document.createElement("style");
  style.textContent = `
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      -webkit-font-smoothing: antialiased;
    }

    .klaus-trigger {
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 16px;
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
      box-shadow: 0 2px 10px rgba(99, 102, 241, 0.4);
      pointer-events: auto;
      transition: height 0.2s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.2s ease;
    }

    .klaus-alca:hover {
      height: 6px;
    }

    .klaus-header-bar {
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 48px;
      background: rgba(15, 17, 23, 0.92);
      backdrop-filter: blur(16px);
      -webkit-backdrop-filter: blur(16px);
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 16px;
      gap: 12px;
      color: #f1f5f9;
      z-index: 2147483647;
      transform: translateY(-105%);
      opacity: 0;
      transition: transform 0.24s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.18s ease;
      box-shadow: 0 10px 30px -10px rgba(0, 0, 0, 0.6);
      user-select: none;
      pointer-events: none;
    }

    .klaus-header-bar.visivel {
      transform: translateY(0);
      opacity: 1;
      pointer-events: auto;
    }

    .klaus-lado-esq {
      display: flex;
      align-items: center;
      gap: 12px;
      flex: 1;
      min-width: 0;
      height: 100%;
    }

    .klaus-logo {
      display: flex;
      align-items: center;
      gap: 7px;
      text-decoration: none;
      color: #ffffff;
      font-weight: 700;
      font-size: 13.5px;
      letter-spacing: -0.02em;
      flex-shrink: 0;
      transition: opacity 0.15s ease;
    }

    .klaus-logo:hover {
      opacity: 0.85;
    }

    .klaus-favoritos-lista {
      display: flex;
      align-items: center;
      gap: 4px;
      flex: 1;
      min-width: 0;
      overflow-x: auto;
      scrollbar-width: none;
      height: 32px;
    }

    .klaus-favoritos-lista::-webkit-scrollbar {
      display: none;
    }

    .klaus-fav-item {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 5px 9px;
      border-radius: 7px;
      font-size: 12px;
      font-weight: 500;
      color: #94a3b8;
      text-decoration: none;
      background: transparent;
      border: 1px solid transparent;
      transition: all 0.14s ease;
      white-space: nowrap;
      cursor: pointer;
      flex-shrink: 0;
    }

    .klaus-fav-item:hover {
      background: rgba(255, 255, 255, 0.07);
      color: #f8fafc;
      border-color: rgba(255, 255, 255, 0.08);
    }

    .klaus-fav-icone {
      width: 14px;
      height: 14px;
      border-radius: 3px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 11px;
    }

    .klaus-fav-img {
      width: 14px;
      height: 14px;
      border-radius: 3px;
      object-fit: contain;
    }

    .klaus-btn-add-fav {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 26px;
      height: 26px;
      border-radius: 6px;
      background: transparent;
      border: 1px dashed rgba(255, 255, 255, 0.2);
      color: #94a3b8;
      cursor: pointer;
      transition: all 0.15s ease;
      flex-shrink: 0;
    }

    .klaus-btn-add-fav:hover {
      background: rgba(99, 102, 241, 0.15);
      border-color: #6366f1;
      color: #a5b4fc;
    }

    .klaus-lado-dir {
      display: flex;
      align-items: center;
      gap: 4px;
      flex-shrink: 0;
    }

    .klaus-btn-acao {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 32px;
      height: 32px;
      border-radius: 8px;
      background: transparent;
      border: none;
      color: #94a3b8;
      cursor: pointer;
      transition: all 0.15s ease;
    }

    .klaus-btn-acao:hover {
      background: rgba(255, 255, 255, 0.08);
      color: #f8fafc;
    }

    .klaus-btn-destaque {
      background: rgba(99, 102, 241, 0.15);
      color: #818cf8;
      border: 1px solid rgba(99, 102, 241, 0.3);
    }

    .klaus-btn-destaque:hover {
      background: rgba(99, 102, 241, 0.25);
      color: #a5b4fc;
      border-color: rgba(99, 102, 241, 0.5);
    }

    /* Menu de contexto customizado */
    .klaus-context-menu {
      position: fixed;
      background: #181b26;
      border: 1px solid rgba(255, 255, 255, 0.12);
      border-radius: 10px;
      padding: 4px;
      box-shadow: 0 10px 25px rgba(0, 0, 0, 0.5);
      z-index: 2147483647;
      display: none;
      min-width: 160px;
    }

    .klaus-context-item {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 7px 10px;
      font-size: 12px;
      color: #cbd5e1;
      border-radius: 6px;
      cursor: pointer;
      transition: background 0.12s ease;
    }

    .klaus-context-item:hover {
      background: rgba(255, 255, 255, 0.08);
      color: #ffffff;
    }

    .klaus-context-item.danger:hover {
      background: rgba(239, 68, 68, 0.15);
      color: #f87171;
    }

    /* Modal de Captura Rápida */
    .klaus-modal-overlay {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.65);
      backdrop-filter: blur(4px);
      display: none;
      align-items: center;
      justify-content: center;
      z-index: 2147483647;
      pointer-events: auto;
    }

    .klaus-modal-overlay.aberto {
      display: flex;
    }

    .klaus-modal-box {
      width: 480px;
      max-width: 90vw;
      background: #131620;
      border: 1px solid rgba(255, 255, 255, 0.12);
      border-radius: 14px;
      padding: 18px;
      box-shadow: 0 20px 40px rgba(0, 0, 0, 0.7);
      animation: modalFadeIn 0.18s ease;
    }

    @keyframes modalFadeIn {
      from { opacity: 0; transform: scale(0.96) translateY(-8px); }
      to { opacity: 1; transform: scale(1) translateY(0); }
    }

    .klaus-modal-title {
      font-size: 14px;
      font-weight: 600;
      color: #ffffff;
      margin-bottom: 12px;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .klaus-input {
      width: 100%;
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 8px;
      padding: 8px 12px;
      color: #f1f5f9;
      font-size: 13px;
      outline: none;
      margin-bottom: 10px;
      transition: border-color 0.15s ease;
    }

    .klaus-input:focus {
      border-color: #6366f1;
    }

    .klaus-modal-actions {
      display: flex;
      justify-content: flex-end;
      gap: 8px;
      margin-top: 8px;
    }

    .klaus-btn {
      padding: 7px 14px;
      border-radius: 8px;
      font-size: 12px;
      font-weight: 500;
      cursor: pointer;
      border: none;
      transition: all 0.14s ease;
    }

    .klaus-btn-secundario {
      background: rgba(255, 255, 255, 0.08);
      color: #94a3b8;
    }

    .klaus-btn-secundario:hover {
      background: rgba(255, 255, 255, 0.14);
      color: #f1f5f9;
    }

    .klaus-btn-primario {
      background: #6366f1;
      color: #ffffff;
    }

    .klaus-btn-primario:hover {
      background: #4f46e5;
    }
  `;

  shadow.appendChild(style);

  // Estrutura HTML do Header
  const wrapper = document.createElement("div");
  wrapper.innerHTML = `
    <!-- Gatilho de Topo -->
    <div class="klaus-trigger" id="klaus-trigger"></div>

    <!-- Alça Visual no Topo -->
    <div class="klaus-alca" id="klaus-alca" title="Klaus (Option+K)"></div>

    <!-- Header Principal -->
    <header class="klaus-header-bar" id="klaus-header">
      <div class="klaus-lado-esq">
        <a href="${KLAUS_APP_URL}" target="_blank" class="klaus-logo" title="Abrir Klaus Segundo Cérebro">
          <svg width="22" height="22" viewBox="0 0 64 64" fill="none">
            <defs>
              <linearGradient id="klaus-bg" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stop-color="#6366F1"></stop>
                <stop offset="50%" stop-color="#8B5CF6"></stop>
                <stop offset="100%" stop-color="#D946EF"></stop>
              </linearGradient>
              <linearGradient id="klaus-k" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stop-color="#FFFFFF"></stop>
                <stop offset="100%" stop-color="#F1F5F9"></stop>
              </linearGradient>
            </defs>
            <rect width="64" height="64" rx="16" fill="url(#klaus-bg)"></rect>
            <rect x="16" y="16" width="8" height="32" rx="4" fill="url(#klaus-k)"></rect>
            <path d="M 21 31 L 39.5 16.5 C 41.5 15 44 17 42.5 19 L 27 33.5 Z" fill="url(#klaus-k)"></path>
            <path d="M 23 30 L 41.5 45 C 43.5 46.5 41.5 49 39.5 47.5 L 21 32.5 Z" fill="url(#klaus-k)"></path>
            <circle cx="45" cy="18" r="3" fill="#FFFFFF" opacity="0.9"></circle>
          </svg>
          <span>Klaus</span>
        </a>

        <!-- Lista de Favoritos Dinâmica -->
        <div class="klaus-favoritos-lista" id="klaus-fav-container"></div>

        <!-- Botão Adicionar Página Atual aos Favoritos -->
        <button class="klaus-btn-add-fav" id="klaus-add-fav" title="Adicionar esta página aos favoritos">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <line x1="12" y1="5" x2="12" y2="19"></line>
            <line x1="5" y1="12" x2="19" y2="12"></line>
          </svg>
        </button>
      </div>

      <!-- Lado Direito: Ações Rápidas -->
      <div class="klaus-lado-dir">
        <!-- Captura Rápida (⌘J) -->
        <button class="klaus-btn-acao klaus-btn-destaque" id="klaus-btn-captura" title="Capturar nota rápida (⌘J)">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 5v14M5 12h14"/>
          </svg>
        </button>

        <!-- Busca em Tudo (⌘K) -->
        <button class="klaus-btn-acao" id="klaus-btn-busca" title="Buscar no Klaus (⌘K)">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          </svg>
        </button>
      </div>
    </header>

    <!-- Menu de Contexto do Favorito -->
    <div class="klaus-context-menu" id="klaus-context-menu">
      <div class="klaus-context-item" id="klaus-ctx-abrir">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
          <polyline points="15 3 21 3 21 9"></polyline>
          <line x1="10" y1="14" x2="21" y2="3"></line>
        </svg>
        <span>Abrir em nova guia</span>
      </div>
      <div class="klaus-context-item danger" id="klaus-ctx-excluir">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="3 6 5 6 21 6"></polyline>
          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
        </svg>
        <span>Excluir favorito</span>
      </div>
    </div>

    <!-- Modal de Adicionar Favorito -->
    <div class="klaus-modal-overlay" id="klaus-modal-add">
      <div class="klaus-modal-box">
        <div class="klaus-modal-title">
          <span>Adicionar aos Favoritos do Klaus</span>
        </div>
        <input type="text" class="klaus-input" id="klaus-input-nome" placeholder="Nome do site" />
        <input type="text" class="klaus-input" id="klaus-input-url" placeholder="https://..." />
        <div class="klaus-modal-actions">
          <button class="klaus-btn klaus-btn-secundario" id="klaus-btn-cancelar-add">Cancelar</button>
          <button class="klaus-btn klaus-btn-primario" id="klaus-btn-salvar-add">Salvar Favorito</button>
        </div>
      </div>
    </div>
  `;

  shadow.appendChild(wrapper);

  // Elementos
  const header = shadow.getElementById("klaus-header");
  const trigger = shadow.getElementById("klaus-trigger");
  const alca = shadow.getElementById("klaus-alca");
  const favContainer = shadow.getElementById("klaus-fav-container");
  const btnAddFav = shadow.getElementById("klaus-add-fav");
  const btnCaptura = shadow.getElementById("klaus-btn-captura");
  const btnBusca = shadow.getElementById("klaus-btn-busca");
  const ctxMenu = shadow.getElementById("klaus-context-menu");
  const ctxAbrir = shadow.getElementById("klaus-ctx-abrir");
  const ctxExcluir = shadow.getElementById("klaus-ctx-excluir");

  const modalAdd = shadow.getElementById("klaus-modal-add");
  const inputNome = shadow.getElementById("klaus-input-nome");
  const inputUrl = shadow.getElementById("klaus-input-url");
  const btnCancelarAdd = shadow.getElementById("klaus-btn-cancelar-add");
  const btnSalvarAdd = shadow.getElementById("klaus-btn-salvar-add");

  let favoritos = [...FAVORITOS_INICIAIS];
  let timerFechar = null;
  let modalAberto = false;
  let itemSelecionadoId = null;

  // Carrega favoritos salvos do chrome.storage ou localStorage
  function carregarFavoritos() {
    try {
      if (typeof chrome !== "undefined" && chrome?.storage?.local) {
        chrome.storage.local.get(["klaus_favoritos"], (res) => {
          if (res && Array.isArray(res.klaus_favoritos) && res.klaus_favoritos.length > 0) {
            favoritos = res.klaus_favoritos;
            renderizarFavoritos();
          } else {
            renderizarFavoritos();
          }
        });
        return;
      }
    } catch {}

    renderizarFavoritos();
  }

  function salvarFavoritos() {
    try {
      if (typeof chrome !== "undefined" && chrome?.storage?.local) {
        chrome.storage.local.set({ klaus_favoritos: favoritos });
      }
    } catch {}
    renderizarFavoritos();
  }

  function obterFaviconUrl(url) {
    try {
      const u = new URL(url.startsWith("http") ? url : `https://${url}`);
      return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(u.hostname)}&sz=64`;
    } catch {
      return "";
    }
  }

  function renderizarFavoritos() {
    favContainer.innerHTML = "";

    favoritos.forEach((fav) => {
      const a = document.createElement("a");
      a.className = "klaus-fav-item";
      a.href = fav.url;
      a.title = `${fav.nome || fav.url} (${fav.url})`;

      const ehKlaus = fav.url.includes("hugossssssssssssss.github.io") || fav.url.startsWith("#") || fav.url.startsWith("/");
      
      if (ehKlaus) {
        a.target = "_blank";
      }

      // Ícone ou Favicon
      if (fav.icone) {
        const spanIcone = document.createElement("span");
        spanIcone.className = "klaus-fav-icone";
        spanIcone.textContent = fav.icone;
        a.appendChild(spanIcone);
      } else {
        const img = document.createElement("img");
        img.className = "klaus-fav-img";
        img.src = obterFaviconUrl(fav.url);
        img.alt = "";
        img.onerror = () => {
          img.style.display = "none";
        };
        a.appendChild(img);
      }

      const spanNome = document.createElement("span");
      spanNome.textContent = fav.nome || fav.url.replace(/^https?:\/\//, "");
      a.appendChild(spanNome);

      // Clique com botão direito para abrir menu de contexto
      a.addEventListener("contextmenu", (e) => {
        e.preventDefault();
        e.stopPropagation();
        itemSelecionadoId = fav.id;
        ctxMenu.style.left = `${e.clientX}px`;
        ctxMenu.style.top = `${e.clientY + 8}px`;
        ctxMenu.style.display = "block";
      });

      favContainer.appendChild(a);
    });
  }

  function abrirHeader() {
    clearTimeout(timerFechar);
    header.classList.add("visivel");
    alca.style.opacity = "0";
  }

  function fecharHeader() {
    if (modalAberto) return;
    clearTimeout(timerFechar);
    timerFechar = setTimeout(() => {
      header.classList.remove("visivel");
      alca.style.opacity = "1";
      ctxMenu.style.display = "none";
    }, 320);
  }

  // Hover inteligente no topo (16px)
  window.addEventListener("mousemove", (e) => {
    if (e.clientY <= 16) {
      abrirHeader();
    } else if (e.clientY > 54 && !modalAberto) {
      fecharHeader();
    }
  }, { capture: true, passive: true });

  header.addEventListener("mouseenter", abrirHeader);
  header.addEventListener("mouseleave", fecharHeader);
  trigger.addEventListener("mouseenter", abrirHeader);
  alca.addEventListener("mouseenter", abrirHeader);
  alca.addEventListener("click", abrirHeader);

  // Fecha menu de contexto ao clicar fora
  window.addEventListener("click", () => {
    ctxMenu.style.display = "none";
  });

  // Ações do menu de contexto
  ctxAbrir.addEventListener("click", () => {
    const item = favoritos.find((f) => f.id === itemSelecionadoId);
    if (item) window.open(item.url, "_blank");
    ctxMenu.style.display = "none";
  });

  ctxExcluir.addEventListener("click", () => {
    favoritos = favoritos.filter((f) => f.id !== itemSelecionadoId);
    salvarFavoritos();
    ctxMenu.style.display = "none";
  });

  // Botão Adicionar Favorito Atual (+)
  btnAddFav.addEventListener("click", () => {
    inputNome.value = document.title || "";
    inputUrl.value = window.location.href || "";
    modalAberto = true;
    modalAdd.classList.add("aberto");
    abrirHeader();
  });

  btnCancelarAdd.addEventListener("click", () => {
    modalAberto = false;
    modalAdd.classList.remove("aberto");
  });

  btnSalvarAdd.addEventListener("click", () => {
    const url = inputUrl.value.trim();
    const nome = inputNome.value.trim() || url;
    if (url) {
      favoritos.push({
        id: `fav-${Date.now()}`,
        nome,
        url,
      });
      salvarFavoritos();
    }
    modalAberto = false;
    modalAdd.classList.remove("aberto");
  });

  // Botão Captura Rápida: abre o Klaus no modal de captura
  btnCaptura.addEventListener("click", () => {
    const titulo = encodeURIComponent(document.title || "");
    const url = encodeURIComponent(window.location.href || "");
    const selecao = encodeURIComponent(window.getSelection ? window.getSelection().toString().trim() : "");
    window.open(`${KLAUS_APP_URL}?titulo=${titulo}&url=${url}&texto=${selecao}#/tarefas`, "_blank");
  });

  // Botão Busca Global: abre o Klaus com foco na busca
  btnBusca.addEventListener("click", () => {
    window.open(`${KLAUS_APP_URL}#/notas`, "_blank");
  });

  // Atalho Option+K / Alt+K
  window.addEventListener("keydown", (e) => {
    if (e.altKey && e.key.toLowerCase() === "k") {
      e.preventDefault();
      if (header.classList.contains("visivel")) {
        fecharHeader();
      } else {
        abrirHeader();
      }
    } else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "j") {
      e.preventDefault();
      btnCaptura.click();
    }
  }, { capture: true });

  // Mensagens da extensão
  if (typeof chrome !== "undefined" && chrome?.runtime?.onMessage) {
    chrome.runtime.onMessage.addListener((msg) => {
      if (msg && msg.action === "toggle-klaus-bar") {
        if (header.classList.contains("visivel")) {
          fecharHeader();
        } else {
          abrirHeader();
        }
      }
    });
  }

  // Inicializa favoritos
  carregarFavoritos();

  console.log("%c[Klaus]%c Header e Barra de Favoritos HUD ativos no navegador!", "color: #6366f1; font-weight: bold;", "color: inherit;");
})();
