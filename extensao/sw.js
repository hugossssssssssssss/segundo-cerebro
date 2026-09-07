/**
 * Service Worker do Klaus (PWA Offline First)
 *
 * Permite que o Klaus carregue instantaneamente mesmo sem nenhuma conexão com a internet.
 * - Cache de assets estáticos (HTML, JS, CSS, Fontes, SVGs).
 * - Bypass de requisições de API (api.github.com, Gemini, etc.) que já são tratadas pelo offlineQueue.
 */

const NOME_CACHE = "klaus-app-v2.26.0";

const ASSETS_ESSENCIAIS = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./icone.svg",
];

// Instalação do Service Worker e pré-cache dos arquivos essenciais
self.addEventListener("install", (evento) => {
  evento.waitUntil(
    caches
      .open(NOME_CACHE)
      .then((cache) => cache.addAll(ASSETS_ESSENCIAIS))
      .then(() => self.skipWaiting())
  );
});

// Ativação e limpeza de versões antigas do cache
self.addEventListener("activate", (evento) => {
  evento.waitUntil(
    caches
      .keys()
      .then((chaves) =>
        Promise.all(
          chaves
            .filter((chave) => chave.startsWith("klaus-app-") && chave !== NOME_CACHE)
            .map((chave) => caches.delete(chave))
        )
      )
      .then(() => self.clients.claim())
  );
});

// Interceptação de requisições
self.addEventListener("fetch", (evento) => {
  const url = new URL(evento.request.url);

  // Não intercepta chamadas de API externas (GitHub, Gemini, Google, etc.) ou métodos não-GET
  if (evento.request.method !== "GET" || url.origin !== self.location.origin) {
    return;
  }

  // Estratégia Stale-While-Revalidate para navegações e documentos HTML
  if (evento.request.mode === "navigate" || evento.request.destination === "document") {
    evento.respondWith(
      fetch(evento.request)
        .then((respostaRede) => {
          const copia = respostaRede.clone();
          caches.open(NOME_CACHE).then((cache) => cache.put(evento.request, copia));
          return respostaRede;
        })
        .catch(async () => {
          const emCache = await caches.match(evento.request);
          if (emCache) return emCache;
          return caches.match("./index.html") || caches.match("./");
        })
    );
    return;
  }

  // Estratégia Cache First com fallback de rede para arquivos estáticos compilados (JS, CSS, Imagens, Fontes)
  evento.respondWith(
    caches.match(evento.request).then((respostaCache) => {
      if (respostaCache) {
        // Revalida em background
        fetch(evento.request)
          .then((respostaRede) => {
            if (respostaRede && respostaRede.status === 200) {
              const copia = respostaRede.clone();
              caches.open(NOME_CACHE).then((cache) => cache.put(evento.request, copia));
            }
          })
          .catch(() => {});
        return respostaCache;
      }

      return fetch(evento.request)
        .then((respostaRede) => {
          if (!respostaRede || respostaRede.status !== 200 || respostaRede.type !== "basic") {
            return respostaRede;
          }
          const copia = respostaRede.clone();
          caches.open(NOME_CACHE).then((cache) => cache.put(evento.request, copia));
          return respostaRede;
        })
        .catch(async () => {
          // Fallback se não encontrar
          return caches.match(evento.request);
        });
    })
  );
});
