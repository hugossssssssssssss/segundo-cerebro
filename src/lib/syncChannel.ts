/**
 * Canal de sincronização inter-abas (BroadcastChannel).
 *
 * Notifica outras abas abertas no mesmo navegador quando uma gravação,
 * exclusão ou alteração de acervo ocorre, acionando o evento "acervo-atualizado"
 * sem precisar de nova requisição ao servidor.
 */

import { dispararAtualizacaoAcervo } from "./eventos";

const CANAL_NOME = "klaus-sync-channel";

type MensagemSync =
  | { tipo: "ACERVO_ATUALIZADO"; caminho?: string }
  | { tipo: "INVALIDAR_CACHE" };

let channel: BroadcastChannel | null = null;

if (typeof window !== "undefined" && "BroadcastChannel" in window) {
  try {
    channel = new BroadcastChannel(CANAL_NOME);
    channel.onmessage = (e: MessageEvent<MensagemSync>) => {
      if (!e.data || !e.data.tipo) return;

      if (e.data.tipo === "ACERVO_ATUALIZADO" || e.data.tipo === "INVALIDAR_CACHE") {
        const caminho = "caminho" in e.data ? e.data.caminho : undefined;
        dispararAtualizacaoAcervo(caminho);
      }
    };
  } catch {
    channel = null;
  }
}

/** Notifica todas as outras abas sobre mudanças no acervo */
export function notificarOutrasAbas(caminho?: string) {
  if (!channel) return;
  try {
    channel.postMessage({ tipo: "ACERVO_ATUALIZADO", caminho });
  } catch {
    // ignora falha de envio
  }
}
