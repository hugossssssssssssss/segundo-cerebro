/**
 * Gerenciador de Toasts flutuantes nativo e leve.
 */

export type TipoToast = "sucesso" | "erro" | "info" | "aviso";

export type ItemToast = {
  id: string;
  mensagem: string;
  tipo: TipoToast;
  detalhes?: string;
  aoDesfazer?: () => void;
  duracaoMs?: number;
};

type OuvinteToast = (toasts: ItemToast[]) => void;

let listaToasts: ItemToast[] = [];
const ouvintes = new Set<OuvinteToast>();

function notificar() {
  ouvintes.forEach((fn) => fn([...listaToasts]));
}

export function toast(
  mensagem: string,
  opcoes?: { tipo?: TipoToast; detalhes?: string; aoDesfazer?: () => void; duracaoMs?: number }
) {
  const id = `toast_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const tipo = opcoes?.tipo || "sucesso";
  const duracao = opcoes?.duracaoMs ?? (tipo === "erro" ? 8000 : 4500);

  const novo: ItemToast = {
    id,
    mensagem,
    tipo,
    detalhes: opcoes?.detalhes,
    aoDesfazer: opcoes?.aoDesfazer,
    duracaoMs: duracao,
  };

  listaToasts = [novo, ...listaToasts.slice(0, 4)]; // mantém no máximo 5 no topo
  notificar();

  return id;
}

export function removerToast(id: string) {
  listaToasts = listaToasts.filter((t) => t.id !== id);
  notificar();
}

export function inscreverToasts(ouvinte: OuvinteToast): () => void {
  ouvintes.add(ouvinte);
  ouvinte([...listaToasts]);
  return () => {
    ouvintes.delete(ouvinte);
  };
}
