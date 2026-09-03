document.addEventListener("DOMContentLoaded", () => {
  const inputKlausUrl = document.getElementById("klausUrl");
  const checkFixada = document.getElementById("barraFixada");
  const btnSalvar = document.getElementById("btnSalvar");
  const statusMsg = document.getElementById("statusMsg");

  // Carregar dados salvos
  chrome.storage.sync.get(["klausUrl", "barraFixada"], (res) => {
    inputKlausUrl.value = res.klausUrl || "https://hugossssssssssssss.github.io/segundo-cerebro";
    checkFixada.checked = !!res.barraFixada;
  });

  btnSalvar.addEventListener("click", () => {
    chrome.storage.sync.set(
      {
        klausUrl: inputKlausUrl.value.trim(),
        barraFixada: checkFixada.checked,
      },
      () => {
        statusMsg.textContent = "Configurações salvas!";
        setTimeout(() => {
          statusMsg.textContent = "";
        }, 2000);
      }
    );
  });
});
