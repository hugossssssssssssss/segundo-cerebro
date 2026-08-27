import { useState, useEffect } from "react";
import { Share2, PlusSquare, Check, Download } from "lucide-react";
import { Modal, Botao } from "@/components/ui";
import { LogoKlaus } from "./LogoKlaus";

interface ModalInstalarPwaProps {
  aberta: boolean;
  aoFechar: () => void;
}

export function ModalInstalarPwa({ aberta, aoFechar }: ModalInstalarPwaProps) {
  const [ehIos, setEhIos] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [instalado, setInstalado] = useState(false);

  useEffect(() => {
    // Detecta se é iOS (iPhone/iPad)
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
    setEhIos(isIosDevice);

    // Verifica se já está rodando em modo standalone / PWA instalado
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as any).standalone === true;
    setInstalado(isStandalone);

    // Captura evento de instalação do Chrome / Android
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    return () => window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
  }, []);

  const instalarAndroid = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setInstalado(true);
      aoFechar();
    }
    setDeferredPrompt(null);
  };

  return (
    <Modal aberto={aberta} aoFechar={aoFechar} titulo="Instalar Klaus no Celular">
      <div className="space-y-4 text-xs sm:text-sm">
        {/* Cabeçalho do App */}
        <div className="flex items-center gap-3 p-3 bg-secondary/30 rounded-2xl border border-border">
          <LogoKlaus tamanho={40} />
          <div>
            <h4 className="font-bold text-foreground text-sm">Klaus (Segundo Cérebro)</h4>
            <p className="text-xs text-muted-foreground">
              Acesso instantâneo em tela cheia e sem barras do navegador.
            </p>
          </div>
        </div>

        {instalado ? (
          <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 flex items-center gap-2.5">
            <Check size={18} className="shrink-0" />
            <span>O Klaus já está instalado como aplicativo neste dispositivo!</span>
          </div>
        ) : ehIos ? (
          /* Instruções para iPhone / iPad (Safari) */
          <div className="space-y-3">
            <p className="text-muted-foreground leading-relaxed">
              No iPhone ou iPad (Safari), siga estes 2 passos simples:
            </p>
            <ol className="space-y-2.5 pl-1">
              <li className="flex items-start gap-2.5">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                  1
                </span>
                <div className="leading-snug">
                  Toque no botão de <strong>Compartilhar</strong>{" "}
                  <Share2 size={14} className="inline mx-1 text-primary" /> na barra inferior do Safari.
                </div>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                  2
                </span>
                <div className="leading-snug">
                  Role a lista e selecione <strong>"Adicionar à Tela de Início"</strong>{" "}
                  <PlusSquare size={14} className="inline mx-1 text-primary" />.
                </div>
              </li>
            </ol>
          </div>
        ) : (
          /* Instruções para Android / Chrome */
          <div className="space-y-3">
            {deferredPrompt ? (
              <Botao
                variante="primario"
                onClick={instalarAndroid}
                className="w-full justify-center gap-2 py-2.5 text-xs font-bold"
              >
                <Download size={16} />
                <span>Instalar Agora no Celular</span>
              </Botao>
            ) : (
              <div className="space-y-2.5">
                <p className="text-muted-foreground leading-relaxed">
                  No Android (Google Chrome):
                </p>
                <ol className="space-y-2 pl-1">
                  <li className="flex items-start gap-2.5">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                      1
                    </span>
                    <span className="leading-snug">
                      Toque no menu de três pontos <strong>(⋮)</strong> no canto superior do Chrome.
                    </span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                      2
                    </span>
                    <span className="leading-snug">
                      Toque em <strong>"Instalar aplicativo"</strong> ou <strong>"Adicionar à tela inicial"</strong>.
                    </span>
                  </li>
                </ol>
              </div>
            )}
          </div>
        )}

        <div className="pt-2 border-t border-border flex justify-end">
          <Botao variante="neutro" onClick={aoFechar} className="text-xs">
            Entendi
          </Botao>
        </div>
      </div>
    </Modal>
  );
}
