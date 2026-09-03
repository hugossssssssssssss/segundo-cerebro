/**
 * Service Worker da Extensão Klaus (Manifest V3)
 *
 * Injeta o content script em abas ativas e escuta cliques no ícone ou atalhos.
 */

// Ao clicar no ícone da extensão, alterna a visibilidade do header
chrome.action.onClicked.addListener(async (tab) => {
  if (tab && tab.id) {
    chrome.tabs.sendMessage(tab.id, { action: "toggle-klaus-bar" }).catch(() => {
      if (chrome.scripting && chrome.scripting.executeScript) {
        chrome.scripting.executeScript({
          target: { tabId: tab.id },
          files: ["content.js"],
        }).catch(() => {});
      }
    });
  }
});

// Ao pressionar o atalho de teclado (Alt+K / Option+K)
chrome.commands.onCommand.addListener(async (command) => {
  if (command === "toggle-klaus-bar") {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab && tab.id) {
      chrome.tabs.sendMessage(tab.id, { action: "toggle-klaus-bar" }).catch(() => {
        if (chrome.scripting && chrome.scripting.executeScript) {
          chrome.scripting.executeScript({
            target: { tabId: tab.id },
            files: ["content.js"],
          }).catch(() => {});
        }
      });
    }
  }
});

// Auto-injeção ao instalar ou recarregar a extensão
chrome.runtime.onInstalled.addListener(async () => {
  try {
    const tabs = await chrome.tabs.query({ url: ["http://*/*", "https://*/*"] });
    for (const tab of tabs) {
      if (tab.id && chrome.scripting && chrome.scripting.executeScript) {
        chrome.scripting.executeScript({
          target: { tabId: tab.id },
          files: ["content.js"],
        }).catch(() => {});
      }
    }
  } catch {}
});
