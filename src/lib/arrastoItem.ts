export interface ItemArrastavel {
  caminho: string;
  titulo?: string;
  rotuloTipo?: string;
}

export const TIPO_MIME_ITEM_KLAUS = "application/klaus-item";
export const EVENTO_SOLTAR_ITEM = "klaus-soltar-item-posicao";

/**
 * Determina o slot de destino com base na posição X do mouse na tela.
 * - Esquerda: X < 35% da largura da janela
 * - Direita: X > 65% da largura da janela
 * - Pop-up: X entre 35% e 65% (região central)
 */
export function calcularSlotPorCoordenadas(
  clientX: number,
  larguraJanela: number = typeof window !== "undefined" ? window.innerWidth : 1200
): "esquerda" | "direita" | "popup" {
  if (clientX < larguraJanela * 0.35) return "esquerda";
  if (clientX > larguraJanela * 0.65) return "direita";
  return "popup";
}

/**
 * Gera propriedades HTML5 nativas de Drag & Drop para qualquer elemento/cartão.
 * Não adiciona nenhum ícone na tela nem abre overlays intrusivos.
 * Ao soltar (dragend), detecta a posição e abre o documento no slot correto.
 */
export function gerarPropsArrasto(
  item: ItemArrastavel,
  aoAbrirSlot?: (caminho: string, slot: "esquerda" | "direita" | "popup") => void
) {
  if (!item || !item.caminho) return {};

  return {
    draggable: true,
    onDragStart: (e: React.DragEvent) => {
      try {
        e.dataTransfer.setData(TIPO_MIME_ITEM_KLAUS, JSON.stringify(item));
        e.dataTransfer.setData("text/plain", item.caminho);
        e.dataTransfer.effectAllowed = "copyMove";
      } catch {}
    },
    onDragEnd: (e: React.DragEvent) => {
      // Se soltou fora da tela ou cancelou
      if (typeof window === "undefined") return;
      if (e.clientX === 0 && e.clientY === 0) return;

      const slot = calcularSlotPorCoordenadas(e.clientX, window.innerWidth);
      if (aoAbrirSlot) {
        aoAbrirSlot(item.caminho, slot);
      } else {
        window.dispatchEvent(
          new CustomEvent(EVENTO_SOLTAR_ITEM, {
            detail: { caminho: item.caminho, slot },
          })
        );
      }
    },
  };
}
