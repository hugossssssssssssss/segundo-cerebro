/**
 * Service Worker da Extensão Klaus (Manifest V3)
 *
 * Injeta o content-bundle em abas ativas e escuta cliques no ícone ou atalhos.
 */

// Ao clicar no ícone da extensão, alterna a visibilidade do header
chrome.action.onClicked.addListener(async (tab) => {
  if (tab && tab.id) {
    chrome.tabs.sendMessage(tab.id, { action: "toggle-klaus-bar" }).catch(() => {
      // Se a aba ainda não tinha o content script carregado, injeta na hora!
      chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ["content-bundle.js"],
      }).catch(() => {});
    });
  }
});

// Ao pressionar o atalho de teclado (Alt+K / Option+K)
chrome.commands.onCommand.addListener(async (command) => {
  if (command === "toggle-klaus-bar") {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab && tab.id) {
      chrome.tabs.sendMessage(tab.id, { action: "toggle-klaus-bar" }).catch(() => {
        chrome.scripting.executeScript({
          target: { tabId: tab.id },
          files: ["content-bundle.js"],
        }).catch(() => {});
      });
    }
  }
});

// Auto-injeção ao instalar ou recarregar a extensão
chrome.runtime.onInstalled.addListener(async () => {
  const tabs = await chrome.tabs.query({ url: ["http://*/*", "https://*/*"] });
  for (const tab of tabs) {
    if (tab.id) {
      chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ["content-bundle.js"],
      }).catch(() => {});
    }
  }
});
