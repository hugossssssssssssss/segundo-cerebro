/**
 * Service Worker da Extensão Klaus (Manifest V3)
 *
 * Escuta comandos de teclado globais (ex: Alt+K / Option+K) e repassa
 * para o content script da aba ativa alternar a visibilidade da barra.
 */

chrome.commands.onCommand.addListener(async (command) => {
  if (command === "toggle-klaus-bar") {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab && tab.id) {
      chrome.tabs.sendMessage(tab.id, { action: "toggle-klaus-bar" }).catch(() => {
        // Ignora erros em abas protegidas como chrome:// ou brave://
      });
    }
  }
});
