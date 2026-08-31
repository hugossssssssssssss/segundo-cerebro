/**
 * Hook de Mutação de Alto Nível para Entidades do Klaus.
 *
 * Encapsula:
 * 1. Optimistic UI imediata
 * 2. Debounce seguro para digitação contínua (com limpeza e flush de timers)
 * 3. Notificação coordenada ao Batched Event Bus
 * 4. Tratamento unificado de erros e estado salvando
 */

import { useCallback, useEffect, useRef } from "react";
import { useSalvar } from "./useSalvar";
import { escreverMarkdown, type Documento } from "./markdown";
import { lerConfig, type Settings } from "./settings";
import type { ItemBase } from "./tipos";

export interface OpcoesMutacao<T extends ItemBase> {
  serializar: (item: T) => Documento;
  debounceMs?: number;
  aoSalvarSucesso?: (novoSha: string, item: T) => void;
  aoSalvarErro?: (erro: string) => void;
}

export interface RetornoMutacao<T extends ItemBase> {
  mutar: (item: T, commitMsg?: string, imediato?: boolean) => Promise<string>;
  apagar: (caminho: string, sha: string, silencioso?: boolean) => Promise<void>;
  salvando: boolean;
  erro: string;
  limparErro: () => void;
}

export function useMutacaoItem<T extends ItemBase>(
  opcoes: OpcoesMutacao<T>,
  cfgCustom?: Settings,
): RetornoMutacao<T> {
  const cfg = cfgCustom || lerConfig();
  const { salvarTexto, apagarItem, salvando, erro, limparErro } = useSalvar(cfg);

  const timersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const itensPendentesRef = useRef<Map<string, { item: T; commitMsg?: string }>>(new Map());
  const opcoesRef = useRef(opcoes);
  opcoesRef.current = opcoes;
  const salvarTextoRef = useRef(salvarTexto);
  salvarTextoRef.current = salvarTexto;

  // Limpa e executa qualquer gravação pendente ao desmontar o componente
  useEffect(() => {
    return () => {
      for (const [caminho, timer] of timersRef.current.entries()) {
        clearTimeout(timer);
        const pendente = itensPendentesRef.current.get(caminho);
        if (pendente) {
          const doc = opcoesRef.current.serializar(pendente.item);
          const texto = escreverMarkdown(doc);
          salvarTextoRef.current(pendente.item.caminho, texto, pendente.item.sha || undefined, pendente.commitMsg, true).catch(
            () => {},
          );
        }
      }
      timersRef.current.clear();
      itensPendentesRef.current.clear();
    };
  }, []);

  const mutar = useCallback(
    async (item: T, commitMsg?: string, imediato = false): Promise<string> => {
      const doc = opcoes.serializar(item);
      const texto = escreverMarkdown(doc);

      const executar = async (): Promise<string> => {
        try {
          const novoSha = await salvarTexto(item.caminho, texto, item.sha || undefined, commitMsg);
          opcoes.aoSalvarSucesso?.(novoSha, item);
          return novoSha;
        } catch (err: any) {
          const msg = err instanceof Error ? err.message : String(err);
          opcoes.aoSalvarErro?.(msg);
          throw err;
        }
      };

      if (imediato || !opcoes.debounceMs || opcoes.debounceMs <= 0) {
        // Cancela timer pendente se houver
        if (timersRef.current.has(item.caminho)) {
          clearTimeout(timersRef.current.get(item.caminho)!);
          timersRef.current.delete(item.caminho);
          itensPendentesRef.current.delete(item.caminho);
        }
        return await executar();
      }

      // Guarda pendência para debounce
      itensPendentesRef.current.set(item.caminho, { item, commitMsg });

      if (timersRef.current.has(item.caminho)) {
        clearTimeout(timersRef.current.get(item.caminho)!);
      }

      return new Promise<string>((resolve) => {
        const timer = setTimeout(async () => {
          timersRef.current.delete(item.caminho);
          itensPendentesRef.current.delete(item.caminho);
          try {
            const sha = await executar();
            resolve(sha);
          } catch {
            resolve(item.sha || "");
          }
        }, opcoes.debounceMs);

        timersRef.current.set(item.caminho, timer);
      });
    },
    [opcoes, salvarTexto],
  );

  return {
    mutar,
    apagar: apagarItem,
    salvando,
    erro,
    limparErro,
  };
}
