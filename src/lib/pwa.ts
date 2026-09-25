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
  if (typeof window === "undefined" || !navigator?.serviceWorker?.register) {
    return;
  }

  // Se um novo controller assumir, recarrega a página automaticamente para o usuário sempre ver a versão atualizada
  let recarregando = false;
  if (typeof navigator.serviceWorker.addEventListener === "function") {
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (!recarregando) {
        recarregando = true;
        window.location.reload();
      }
    });
  }

  const executarRegistro = () => {
    navigator.serviceWorker
      .register("./sw.js")
      .then((registro) => {
        // Se já houver um worker esperando, força ele a assumir imediatamente
        if (registro.waiting) {
          registro.waiting.postMessage({ type: "SKIP_WAITING" });
        }

        // Ao detectar atualização em andamento
        registro.addEventListener("updatefound", () => {
          const novoWorker = registro.installing;
          if (novoWorker) {
            novoWorker.addEventListener("statechange", () => {
              if (novoWorker.state === "installed" && navigator.serviceWorker.controller) {
                // Força o novo worker a assumir imediatamente sem exigir refresh manual
                novoWorker.postMessage({ type: "SKIP_WAITING" });
              }
            });
          }
        });

        // Verifica novas versões automaticamente quando o usuário volta para o app ou foca a tela
        document.addEventListener("visibilitychange", () => {
          if (document.visibilityState === "visible") {
            registro.update().catch(() => {});
          }
        });

        window.addEventListener("focus", () => {
          registro.update().catch(() => {});
        });

        // Checagem periódica a cada 10 minutos
        setInterval(() => {
          registro.update().catch(() => {});
        }, 10 * 60 * 1000);
      })
      .catch((err) => {
        console.warn("Não foi possível registrar o Service Worker:", err);
      });
  };

  window.addEventListener("load", executarRegistro);
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
