const KLAUS_URL = "https://hugossssssssssssss.github.io/segundo-cerebro/";

document.getElementById("btn-toggle-hud").addEventListener("click", async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab?.id) {
    chrome.tabs.sendMessage(tab.id, { action: "toggle-klaus-bar" });
    window.close();
  }
});

document.getElementById("btn-sincronizar").addEventListener("click", async () => {
  // Procura uma aba aberta com o Klaus para obter os favoritos atuais
  const tabs = await chrome.tabs.query({ url: "*://hugossssssssssssss.github.io/segundo-cerebro/*" });
  if (tabs.length > 0 && tabs[0].id) {
    chrome.scripting.executeScript({
      target: { tabId: tabs[0].id },
      func: () => {
        const favs = localStorage.getItem("klaus_favoritos");
        const enc = localStorage.getItem("segundo-cerebro:config:enc");
        const salt = localStorage.getItem("segundo-cerebro:device-salt");
        return {
          klaus_favoritos: favs ? JSON.parse(favs) : null,
          klaus_settings_enc: enc || null,
          klaus_device_salt: salt || null,
        };
      },
    }).then((results) => {
      const data = results?.[0]?.result;
      if (data) {
        const payload = {};
        if (data.klaus_favoritos) payload.klaus_favoritos = data.klaus_favoritos;
        if (data.klaus_settings_enc) payload.klaus_settings_enc = data.klaus_settings_enc;
        if (data.klaus_device_salt) payload.klaus_device_salt = data.klaus_device_salt;
        chrome.storage.local.set(payload, () => {
          const statusEl = document.getElementById("status-sinc");
          if (statusEl) {
            statusEl.style.display = "block";
            setTimeout(() => window.close(), 1200);
          }
        });
      }
    }).catch(() => {});
  } else {
    // Se a aba do Klaus não estiver aberta, abre uma aba em background para sincronizar
    chrome.tabs.create({ url: KLAUS_URL, active: false }, (newTab) => {
      const statusEl = document.getElementById("status-sinc");
      if (statusEl) {
        statusEl.textContent = "✓ Klaus aberto para sincronização!";
        statusEl.style.display = "block";
        setTimeout(() => window.close(), 1500);
      }
    });
  }
});

document.getElementById("btn-abrir-klaus").addEventListener("click", () => {
  chrome.tabs.create({ url: KLAUS_URL });
  window.close();
});
