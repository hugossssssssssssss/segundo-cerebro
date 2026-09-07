import { useState, useEffect } from "react";
import { toast } from "@/lib/toast";

/**
 * Módulo de Controle do PWA e Status de Rede do Klaus.
 *
 * Registra o Service Worker e monitora a conectividade online/offline.
 */

/**
 * Registra o Service Worker da aplicação em ambientes de produção ou navegadores compatíveis.
 */
export function registrarServiceWorker(): void {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
    return;
  }

  window.addEventListener("load", () => {
    // Usa caminho relativo para suportar hospedagem no GitHub Pages (/segundo-cerebro/)
    navigator.serviceWorker
      .register("./sw.js")
      .then((registro) => {
        // Verifica se há uma atualização pronta
        registro.addEventListener("updatefound", () => {
          const novoWorker = registro.installing;
          if (novoWorker) {
            novoWorker.addEventListener("statechange", () => {
              if (novoWorker.state === "installed" && navigator.serviceWorker.controller) {
                toast("Nova versão do Klaus disponível! Recarregue a página para atualizar.", {
                  tipo: "info",
                  duracaoMs: 8000,
                });
              }
            });
          }
        });
      })
      .catch((err) => {
        console.warn("Não foi possível registrar o Service Worker:", err);
      });
  });
}

/**
 * Hook do React para monitorar a conectividade em tempo real.
 */
export function useStatusRede(): { online: boolean } {
  const [online, setOnline] = useState<boolean>(() => {
    return typeof navigator !== "undefined" ? navigator.onLine : true;
  });

  useEffect(() => {
    if (typeof window === "undefined") return;

    const aoFicarOnline = () => {
      setOnline(true);
      toast("Conexão restabelecida! Sincronizando rascunhos...", { tipo: "sucesso" });
    };

    const aoFicarOffline = () => {
      setOnline(false);
      toast("Você está offline. As alterações serão salvas localmente.", { tipo: "aviso" });
    };

    window.addEventListener("online", aoFicarOnline);
    window.addEventListener("offline", aoFicarOffline);

    return () => {
      window.removeEventListener("online", aoFicarOnline);
      window.removeEventListener("offline", aoFicarOffline);
    };
  }, []);

  return { online };
}
