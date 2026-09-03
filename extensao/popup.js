const KLAUS_URL = "https://hugossssssssssssss.github.io/segundo-cerebro/";

document.getElementById("btn-toggle-hud").addEventListener("click", async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab?.id) {
    chrome.tabs.sendMessage(tab.id, { action: "toggle-klaus-bar" });
    window.close();
  }
});

document.getElementById("btn-abrir-klaus").addEventListener("click", () => {
  chrome.tabs.create({ url: KLAUS_URL });
  window.close();
});
