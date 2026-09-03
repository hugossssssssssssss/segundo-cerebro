/**
 * Content Script do Klaus para Brave / Chromium
 *
 * Injeta o cabeçalho do Klaus isolado em Shadow DOM no topo da página
 * e exibe a barra automaticamente ao aproximar o mouse do topo da janela.
 */

(function () {
  if (document.getElementById("klaus-extension-host")) return;

  // Cria o elemento hospedeiro do Shadow DOM
  const host = document.createElement("div");
  host.id = "klaus-extension-host";
  document.documentElement.appendChild(host);

  const shadow = host.attachShadow({ mode: "open" });

  // Injeta o CSS dentro do Shadow DOM
  const linkCss = document.createElement("link");
  linkCss.rel = "stylesheet";
  linkCss.href = chrome.runtime.getURL("content.css");
  shadow.appendChild(linkCss);

  // Configuração padrão
  const KLAUS_URL_PADRAO = "https://hugossssssssssssss.github.io/segundo-cerebro";
  let klausUrl = KLAUS_URL_PADRAO;
  let estaFixado = false;
  let timerFechar = null;

  // Cria a estrutura HTML da Barra
  const rootDiv = document.createElement("div");
  rootDiv.innerHTML = `
    <!-- Gatilho de Hover Invisível no Topo -->
    <div class="klaus-hover-trigger" id="klaus-trigger"></div>

    <!-- Barra Superior HUD -->
    <div class="klaus-header-hud" id="klaus-hud">
      <!-- Lado Esquerdo: Logo & Rotas -->
      <div class="klaus-brand-group">
        <a href="${klausUrl}/" target="_blank" class="klaus-logo-btn" title="Abrir Klaus Segundo Cérebro">
          <img src="${chrome.runtime.getURL("icons/icon32.png")}" class="klaus-logo-icon" alt="Logo" />
          <span>Klaus</span>
        </a>

        <nav class="klaus-nav-links">
          <a href="${klausUrl}/#/notas" target="_blank" class="klaus-nav-link" title="Notas">
            <span>📝</span> Notas
          </a>
          <a href="${klausUrl}/#/tarefas" target="_blank" class="klaus-nav-link" title="Tarefas">
            <span>✅</span> Tarefas
          </a>
          <a href="${klausUrl}/#/pdi" target="_blank" class="klaus-nav-link" title="PDI & Metas">
            <span>🎯</span> Metas
          </a>
          <a href="${klausUrl}/#/lousas" target="_blank" class="klaus-nav-link" title="Lousas Visuais">
            <span>🎨</span> Lousas
          </a>
          <a href="${klausUrl}/#/grafo" target="_blank" class="klaus-nav-link" title="Grafo Neural">
            <span>🕸️</span> Grafo
          </a>
          <a href="${klausUrl}/#/inbox" target="_blank" class="klaus-nav-link" title="Inbox & Lembretes">
            <span>📥</span> Inbox
          </a>
        </nav>
      </div>

      <!-- Centro: Barra de Favoritos Dinâmica -->
      <div class="klaus-favs-bar" id="klaus-favs-container">
        <!-- Itens de favoritos injetados dinamicamente -->
      </div>

      <!-- Lado Direito: Ações Rápidas -->
      <div class="klaus-actions-group">
        <button class="klaus-action-btn primario" id="btn-clipar" title="Salvar página atual no Klaus">
          <span>📎</span> Clipar Página
        </button>
        <button class="klaus-action-btn" id="btn-nota-rapida" title="Criar Nota Rápida">
          <span>✍️</span> + Nota
        </button>
        <button class="klaus-action-btn" id="btn-tarefa-rapida" title="Criar Tarefa Rápida">
          <span>📌</span> + Tarefa
        </button>
        <button class="klaus-action-btn" id="btn-fixar" title="Fixar barra sempre visível">
          <span>📌</span>
        </button>
      </div>
    </div>

    <!-- Modal Rápido de Captura / Nota / Tarefa -->
    <div class="klaus-modal-overlay" id="klaus-modal">
      <div class="klaus-modal-header">
        <span class="klaus-modal-title" id="klaus-modal-title">Nova Nota</span>
        <button class="klaus-modal-close" id="btn-modal-close">✕</button>
      </div>
      <input type="text" class="klaus-input" id="modal-input-titulo" placeholder="Título..." />
      <textarea class="klaus-textarea" id="modal-input-corpo" placeholder="Conteúdo em Markdown..."></textarea>
      <div class="klaus-modal-footer">
        <button class="klaus-action-btn" id="btn-modal-cancelar">Cancelar</button>
        <button class="klaus-action-btn primario" id="btn-modal-salvar">Salvar no GitHub</button>
      </div>
    </div>

    <!-- Toast de Feedback -->
    <div class="klaus-toast" id="klaus-toast">
      <span id="toast-icone">✨</span>
      <span id="toast-msg">Salvo com sucesso!</span>
    </div>
  `;

  shadow.appendChild(rootDiv);

  // Elementos do DOM
  const hud = shadow.getElementById("klaus-hud");
  const trigger = shadow.getElementById("klaus-trigger");
  const btnFixar = shadow.getElementById("btn-fixar");
  const btnClipar = shadow.getElementById("btn-clipar");
  const btnNotaRapida = shadow.getElementById("btn-nota-rapida");
  const btnTarefaRapida = shadow.getElementById("btn-tarefa-rapida");
  const modal = shadow.getElementById("klaus-modal");
  const modalTitulo = shadow.getElementById("klaus-modal-title");
  const inputTitulo = shadow.getElementById("modal-input-titulo");
  const inputCorpo = shadow.getElementById("modal-input-corpo");
  const btnModalClose = shadow.getElementById("btn-modal-close");
  const btnModalCancelar = shadow.getElementById("btn-modal-cancelar");
  const btnModalSalvar = shadow.getElementById("btn-modal-salvar");
  const toastEl = shadow.getElementById("klaus-toast");
  const toastMsg = shadow.getElementById("toast-msg");
  const toastIcone = shadow.getElementById("toast-icone");
  const favsContainer = shadow.getElementById("klaus-favs-container");

  let tipoModalAtual = "nota"; // "nota" | "tarefa" | "clip"

  // Feedback Toast
  function exibirToast(mensagem, icone = "✨") {
    toastMsg.textContent = mensagem;
    toastIcone.textContent = icone;
    toastEl.classList.add("ativo");
    setTimeout(() => {
      toastEl.classList.remove("ativo");
    }, 3000);
  }

  // Carregar configurações da extensão
  chrome.storage.sync.get(
    ["klausUrl", "barraFixada", "githubToken", "repoOwner", "repoName", "branch"],
    (res) => {
      if (res.klausUrl) klausUrl = res.klausUrl;
      if (res.barraFixada) {
        estaFixado = true;
        btnFixar.classList.add("fixado");
        hud.classList.add("visivel");
      }
      carregarFavoritos();
    }
  );

  // Carregar Favoritos Locais / Salvos
  function carregarFavoritos() {
    chrome.storage.local.get(["klausFavoritos"], (res) => {
      const favs = res.klausFavoritos || [
        { titulo: "GitHub", url: "https://github.com" },
        { titulo: "Figma", url: "https://figma.com" },
        { titulo: "ChatGPT", url: "https://chatgpt.com" },
        { titulo: "Claude", url: "https://claude.ai" },
      ];

      favsContainer.innerHTML = "";
      favs.forEach((fav) => {
        const a = document.createElement("a");
        a.href = fav.url;
        a.target = "_blank";
        a.className = "klaus-fav-item";
        a.title = fav.titulo;

        let domain = "";
        try {
          domain = new URL(fav.url).hostname;
        } catch {
          domain = fav.url;
        }

        a.innerHTML = `
          <img src="https://www.google.com/s2/favicons?domain=${domain}&sz=32" class="klaus-fav-icon" alt="" />
          <span>${fav.titulo}</span>
        `;
        favsContainer.appendChild(a);
      });
    });
  }

  // Controle de Abertura / Fechamento da Barra
  function abrirBarra() {
    clearTimeout(timerFechar);
    hud.classList.add("visivel");
  }

  function fecharBarra() {
    if (estaFixado || modal.classList.contains("aberto")) return;
    clearTimeout(timerFechar);
    timerFechar = setTimeout(() => {
      hud.classList.remove("visivel");
    }, 250);
  }

  // Eventos de Mouse no Topo da Página
  window.addEventListener("mousemove", (e) => {
    if (e.clientY <= 8) {
      abrirBarra();
    } else if (e.clientY > 55 && !estaFixado && !modal.classList.contains("aberto")) {
      fecharBarra();
    }
  });

  hud.addEventListener("mouseenter", abrirBarra);
  hud.addEventListener("mouseleave", fecharBarra);
  trigger.addEventListener("mouseenter", abrirBarra);

  // Alternar Fixar Barra
  btnFixar.addEventListener("click", () => {
    estaFixado = !estaFixado;
    btnFixar.classList.toggle("fixado", estaFixado);
    chrome.storage.sync.set({ barraFixada: estaFixado });
    if (estaFixado) abrirBarra();
    else fecharBarra();
  });

  // Alternar via Atalho (Alt+K)
  chrome.runtime.onMessage.addListener((msg) => {
    if (msg.action === "toggle-klaus-bar") {
      if (hud.classList.contains("visivel")) {
        hud.classList.remove("visivel");
      } else {
        abrirBarra();
      }
    }
  });

  // Web Clipper da Página Atual
  btnClipar.addEventListener("click", () => {
    const tituloPagina = document.title || "Referência Web";
    const urlPagina = window.location.href;
    const metaDesc =
      document.querySelector('meta[name="description"]')?.getAttribute("content") ||
      document.querySelector('meta[property="og:description"]')?.getAttribute("content") ||
      "";

    tipoModalAtual = "clip";
    modalTitulo.textContent = "Clipar Página para o Klaus";
    inputTitulo.value = tituloPagina;

    const hoje = new Date().toISOString().slice(0, 10);
    inputCorpo.value = `---
titulo: "${tituloPagina.replace(/"/g, '\\"')}"
data: ${hoje}
url: "${urlPagina}"
tipo: referencia
tags:
  - web-clipper
---

# ${tituloPagina}

> **Fonte:** [${urlPagina}](${urlPagina})
> **Capturado em:** ${hoje}

${metaDesc ? `## Resumo\n${metaDesc}\n` : ""}
`;
    modal.classList.add("aberto");
    abrirBarra();
  });

  // Modal Nota Rápida
  btnNotaRapida.addEventListener("click", () => {
    tipoModalAtual = "nota";
    modalTitulo.textContent = "Nova Nota Rápida";
    inputTitulo.value = "";
    inputCorpo.value = "";
    modal.classList.add("aberto");
    abrirBarra();
    inputTitulo.focus();
  });

  // Modal Tarefa Rápida
  btnTarefaRapida.addEventListener("click", () => {
    tipoModalAtual = "tarefa";
    modalTitulo.textContent = "Nova Tarefa Rápida";
    inputTitulo.value = "";
    inputCorpo.value = "";
    modal.classList.add("aberto");
    abrirBarra();
    inputTitulo.focus();
  });

  // Fechar Modal
  const fecharModal = () => {
    modal.classList.remove("aberto");
    if (!estaFixado) fecharBarra();
  };
  btnModalClose.addEventListener("click", fecharModal);
  btnModalCancelar.addEventListener("click", fecharModal);

  // Salvar no GitHub direto via API Contents
  btnModalSalvar.addEventListener("click", async () => {
    const titulo = inputTitulo.value.trim();
    if (!titulo) {
      alert("Por favor, digite um título.");
      return;
    }

    btnModalSalvar.textContent = "Gravando...";
    btnModalSalvar.disabled = true;

    chrome.storage.sync.get(
      ["githubToken", "repoOwner", "repoName", "branch"],
      async (cfg) => {
        if (!cfg.githubToken || !cfg.repoOwner || !cfg.repoName) {
          alert(
            "Configure seu Token e Repositório do GitHub clicando no ícone do Klaus nas extensões do navegador."
          );
          btnModalSalvar.textContent = "Salvar no GitHub";
          btnModalSalvar.disabled = false;
          return;
        }

        const hoje = new Date().toISOString().slice(0, 10);
        const slug = titulo
          .toLowerCase()
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-|-$/g, "");

        let pasta = "notas";
        let conteudo = inputCorpo.value;

        if (tipoModalAtual === "clip") {
          pasta = "referencias";
        } else if (tipoModalAtual === "tarefa") {
          pasta = "tarefas";
          if (!conteudo.includes("---")) {
            conteudo = `---
titulo: "${titulo.replace(/"/g, '\\"')}"
status: pendente
prioridade: media
criado_em: ${hoje}
---

${conteudo || "Tarefa criada via extensão do Klaus."}
`;
          }
        } else {
          pasta = "notas";
          if (!conteudo.includes("---")) {
            conteudo = `---
titulo: "${titulo.replace(/"/g, '\\"')}"
criado_em: ${hoje}
---

# ${titulo}

${conteudo}
`;
          }
        }

        const caminho = `${pasta}/${hoje}-${slug}.md`;
        const branch = cfg.branch || "main";

        try {
          const res = await fetch(
            `https://api.github.com/repos/${cfg.repoOwner}/${cfg.repoName}/contents/${caminho}`,
            {
              method: "PUT",
              headers: {
                Authorization: `Bearer ${cfg.githubToken.trim()}`,
                "Content-Type": "application/json",
                Accept: "application/vnd.github.v3+json",
              },
              body: JSON.stringify({
                message: `criar ${tipoModalAtual} via extensao: ${titulo}`,
                content: btoa(unescape(encodeURIComponent(conteudo))),
                branch,
              }),
            }
          );

          if (res.ok) {
            exibirToast(`"${titulo}" salvo no Klaus!`, "✅");
            fecharModal();
          } else {
            const erro = await res.json();
            alert(`Erro do GitHub: ${erro.message || res.statusText}`);
          }
        } catch (e) {
          alert(`Erro de conexão: ${e.message}`);
        } finally {
          btnModalSalvar.textContent = "Salvar no GitHub";
          btnModalSalvar.disabled = false;
        }
      }
    );
  });
})();
