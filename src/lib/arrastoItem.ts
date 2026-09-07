export interface ItemArrastavel {
  caminho: string;
  titulo?: string;
  rotuloTipo?: string;
}

export const TIPO_MIME_ITEM_KLAUS = "application/klaus-item";
export const EVENTO_DRAG_INICIADO = "klaus-drag-iniciado";
export const EVENTO_DRAG_FINALIZADO = "klaus-drag-finalizado";

let itemArrastadoAtual: ItemArrastavel | null = null;

export function obterItemArrastadoAtual(): ItemArrastavel | null {
  return itemArrastadoAtual;
}

export function definirItemArrastadoAtual(item: ItemArrastavel | null) {
  itemArrastadoAtual = item;
  if (typeof window !== "undefined") {
    if (item) {
      window.dispatchEvent(new CustomEvent(EVENTO_DRAG_INICIADO, { detail: item }));
    } else {
      window.dispatchEvent(new CustomEvent(EVENTO_DRAG_FINALIZADO));
    }
  }
}

/**
 * Gera propriedades HTML5 nativas de Drag & Drop para qualquer elemento/cartão.
 * Não introduz nenhum ícone adicional, preservando 100% o design existente.
 */
export function gerarPropsArrasto(item: ItemArrastavel) {
  if (!item || !item.caminho) return {};

  return {
    draggable: true,
    onDragStart: (e: React.DragEvent) => {
      definirItemArrastadoAtual(item);
      try {
        e.dataTransfer.setData(TIPO_MIME_ITEM_KLAUS, JSON.stringify(item));
        e.dataTransfer.setData("text/plain", item.caminho);
        e.dataTransfer.effectAllowed = "copyMove";
      } catch {}
    },
    onDragEnd: (_e?: React.DragEvent) => {
      definirItemArrastadoAtual(null);
    },
  };
}
