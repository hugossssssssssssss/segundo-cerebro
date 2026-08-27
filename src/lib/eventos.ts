/**
 * Barramento de Eventos Agrupados (Batched Event Bus) do Klaus.
 *
 * Evita a "tempestade de re-renders" quando múltiplas operações em lote
 * (como sync offline, mover 10 notas ou importar modelos) acontecem no mesmo tick.
 * Utiliza `queueMicrotask` para despachar um único evento consolidado contendo
 * a lista de caminhos e pastas modificadas.
 */

import { useEffect, useRef } from "react";

export const EVENTO_ACERVO_ATUALIZADO = "acervo-atualizado";

export type DetalheEventoAcervo = {
  caminhosModificados: string[];
  pastasAfetadas: string[];
};

let caminhosPendentes = new Set<string>();
let microtaskAgendada = false;

/**
 * Dispara a notificação de acervo atualizado com agrupamento automático via microtask.
 * Múltiplas chamadas no mesmo ciclo síncrono resultam em apenas 1 evento no DOM.
 */
export function dispararAtualizacaoAcervo(caminhos?: string | string[]): void {
  if (typeof window === "undefined") return;

  if (caminhos) {
    if (Array.isArray(caminhos)) {
      for (const c of caminhos) if (c) caminhosPendentes.add(c);
    } else {
      caminhosPendentes.add(caminhos);
    }
  }

  if (!microtaskAgendada) {
    microtaskAgendada = true;
    queueMicrotask(() => {
      microtaskAgendada = false;
      const caminhosLista = Array.from(caminhosPendentes);
      const pastasLista = Array.from(
        new Set(
          caminhosLista
            .map((c) => {
              const partes = c.split("/");
              return partes.length > 1 ? partes[0] : "";
            })
            .filter(Boolean),
        ),
      );

      const detalhe: DetalheEventoAcervo = {
        caminhosModificados: caminhosLista,
        pastasAfetadas: pastasLista,
      };

      window.dispatchEvent(
        new CustomEvent<DetalheEventoAcervo>(EVENTO_ACERVO_ATUALIZADO, {
          detail: detalhe,
        }),
      );

      caminhosPendentes.clear();
    });
  }
}

/**
 * Hook utilitário para assinar atualizações do acervo com suporte a filtro opcional por pasta.
 */
export function useAoAtualizarAcervo(
  callback: (detalhe?: DetalheEventoAcervo) => void,
  pastaFiltro?: string,
): void {
  const cbRef = useRef(callback);
  cbRef.current = callback;

  useEffect(() => {
    const handler = (e: Event) => {
      const detalhe = (e as CustomEvent<DetalheEventoAcervo>)?.detail;

      // Se foi especificado um filtro de pasta e o evento tem pastas afetadas definidas
      if (pastaFiltro && detalhe?.pastasAfetadas?.length) {
        const pastaLimpa = pastaFiltro.split("/")[0];
        // Se a pasta do hook não foi afetada por esta mutação nem há arquivos genéricos, ignora
        const relevante = detalhe.pastasAfetadas.includes(pastaLimpa) || detalhe.pastasAfetadas.length === 0;
        if (!relevante) return;
      }

      cbRef.current(detalhe);
    };

    window.addEventListener(EVENTO_ACERVO_ATUALIZADO, handler);
    return () => window.removeEventListener(EVENTO_ACERVO_ATUALIZADO, handler);
  }, [pastaFiltro]);
}
