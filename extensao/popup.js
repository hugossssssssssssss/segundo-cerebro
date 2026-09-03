document.addEventListener("DOMContentLoaded", () => {
  const inputToken = document.getElementById("githubToken");
  const inputOwner = document.getElementById("repoOwner");
  const inputRepo = document.getElementById("repoName");
  const inputKlausUrl = document.getElementById("klausUrl");
  const checkFixada = document.getElementById("barraFixada");
  const btnSalvar = document.getElementById("btnSalvar");
  const statusMsg = document.getElementById("statusMsg");

  const inputFavTitulo = document.getElementById("novoFavTitulo");
  const inputFavUrl = document.getElementById("novoFavUrl");
  const btnAddFav = document.getElementById("btnAdicionarFav");
  const listaFavs = document.getElementById("listaFavoritos");

  let favoritos = [];

  // Carregar dados salvos
  chrome.storage.sync.get(
    ["githubToken", "repoOwner", "repoName", "klausUrl", "barraFixada"],
    (res) => {
      if (res.githubToken) inputToken.value = res.githubToken;
      inputOwner.value = res.repoOwner || "hugossssssssssssss";
      inputRepo.value = res.repoName || "segundo-cerebro-dados";
      inputKlausUrl.value = res.klausUrl || "https://hugossssssssssssss.github.io/segundo-cerebro";
      checkFixada.checked = !!res.barraFixada;
    }
  );

  chrome.storage.local.get(["klausFavoritos"], (res) => {
    favoritos = res.klausFavoritos || [
      { titulo: "GitHub", url: "https://github.com" },
      { titulo: "Figma", url: "https://figma.com" },
      { titulo: "ChatGPT", url: "https://chatgpt.com" },
      { titulo: "Claude", url: "https://claude.ai" },
    ];
    renderizarFavoritos();
  });

  function renderizarFavoritos() {
    listaFavs.innerHTML = "";
    favoritos.forEach((fav, idx) => {
      const li = document.createElement("li");
      li.className = "fav-item";
      li.innerHTML = `
        <span style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 260px;">
          <strong>${fav.titulo}</strong> — ${fav.url}
        </span>
        <button class="btn-del-fav" data-idx="${idx}">✕</button>
      `;
      listaFavs.appendChild(li);
    });

    listaFavs.querySelectorAll(".btn-del-fav").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const index = parseInt(e.target.getAttribute("data-idx"), 10);
        favoritos.splice(index, 1);
        chrome.storage.local.set({ klausFavoritos: favoritos });
        renderizarFavoritos();
      });
    });
  }

  btnAddFav.addEventListener("click", () => {
    const tit = inputFavTitulo.value.trim();
    let url = inputFavUrl.value.trim();
    if (!tit || !url) return;

    if (!url.startsWith("http://") && !url.startsWith("https://")) {
      url = "https://" + url;
    }

    favoritos.push({ titulo: tit, url });
    chrome.storage.local.set({ klausFavoritos: favoritos });
    inputFavTitulo.value = "";
    inputFavUrl.value = "";
    renderizarFavoritos();
  });

  btnSalvar.addEventListener("click", () => {
    chrome.storage.sync.set(
      {
        githubToken: inputToken.value.trim(),
        repoOwner: inputOwner.value.trim(),
        repoName: inputRepo.value.trim(),
        klausUrl: inputKlausUrl.value.trim(),
        barraFixada: checkFixada.checked,
      },
      () => {
        statusMsg.textContent = "Configurações salvas com sucesso!";
        setTimeout(() => {
          statusMsg.textContent = "";
        }, 2500);
      }
    );
  });
});
