/**
 * Hook de carregamento padrão do app com suporte a SWR (Stale-While-Revalidate).
 *
 * TODA tela principal deve usar este hook em vez de reimplementar o
 * carregamento do repositório. Não chame `carregarRepo` + `daPasta`
 * diretamente nas telas — use este hook.
 *
 * O hook:
 * - Se os dados estiverem em cache local, renderiza-os imediatamente (0ms)
 * - Valida e atualiza o acervo silenciosamente no GitHub em background
 * - Mescla alterações da fila offline (e oculta exclusões pendentes)
 * - Escuta o evento "acervo-atualizado" e recarrega em silêncio
 * - Expõe `recarregar()` para ser chamado após salvar/apagar
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { carregarRepo, daPasta, arquivosIlegiveis, obterCacheExistente, type ItemRepo } from "./repo";
import { tituloProvavel, lerMarkdown } from "./markdown";
import { obterRascunhosLocais } from "./offlineQueue";
import { useAoAtualizarAcervo } from "./eventos";
import type { Settings } from "./settings";
import type { Pasta } from "./tipos";

export type EstadoRepo<T> = {
  /** Itens da pasta pedida, já convertidos para o tipo da tela. */
  itens: T[];
  /** Repositório inteiro — use para resolver menções e relacionamentos. */
  acervo: ItemRepo[];
  /** Mapa de caminho → título para todas as entidades. */
  titulos: Record<string, string>;
  carregando: boolean;
  erro: string;
  /** Arquivos que não puderam ser lidos (apareça em aviso na tela). */
  ilegiveis: string[];
  /**
   * Força nova leitura do GitHub.
   * Chame depois de salvar ou apagar para a lista atualizar.
   * O hook já chama internamente quando recebe o evento "acervo-atualizado".
   */
  recarregar: () => void;
};

export function useItemRepo<T>(
  cfg: Settings,
  pasta: Pasta,
  converter: (item: ItemRepo) => T,
  opcoes?: { recursivo?: boolean },
): EstadoRepo<T> {
  const [itens, setItens] = useState<T[]>([]);
  const [acervo, setAcervo] = useState<ItemRepo[]>([]);
  const [titulos, setTitulos] = useState<Record<string, string>>({});
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");
  const [ilegiveis, setIlegiveis] = useState<string[]>([]);

  /**
   * Guardado num ref, não derivado de `itens.length`: se estivesse nas
   * dependências do callback, cada item criado recriaria o callback e
   * dispararia um carregamento extra do repositório.
   */
  const jaCarregouRef = useRef(false);
  const converterRef = useRef(converter);
  converterRef.current = converter;

  const carregar = useCallback(
    async (silencioso = false, forcar = false) => {
      if (!cfg.githubToken || !cfg.repoOwner || !cfg.repoName) {
        setCarregando(false);
        return;
      }

      // Tenta recuperar cache local síncrono para Optimistic UI e SWR (0ms delay)
      const cacheValido = obterCacheExistente(cfg);
      if (cacheValido) {
        const rascunhos = obterRascunhosLocais();
        let todos = [...cacheValido.itens];

        if (rascunhos.length > 0) {
          const mapaRascunhos = new Map(rascunhos.map((r) => [r.caminho, r]));

          todos = todos.map((item) => {
            const rascunho = mapaRascunhos.get(item.caminho);
            if (rascunho) {
              mapaRascunhos.delete(item.caminho);
              if (rascunho.acao === "apagar") {
                return null; // Oculta o arquivo imediatamente (Optimistic Delete)
              }
              const docRascunho = lerMarkdown(rascunho.texto);
              return {
                ...item,
                texto: rascunho.texto,
                doc: docRascunho,
              };
            }
            return item;
          }).filter((i): i is NonNullable<typeof i> => i !== null);

          for (const rascunho of mapaRascunhos.values()) {
            if (rascunho.acao === "apagar") continue;
            const docRascunho = lerMarkdown(rascunho.texto);
            const nome = rascunho.caminho.split("/").pop() || "rascunho.md";
            todos.push({
              caminho: rascunho.caminho,
              nome,
              sha: rascunho.sha || "",
              tamanho: rascunho.texto.length,
              texto: rascunho.texto,
              doc: docRascunho,
            });
          }
        }

        setIlegiveis(arquivosIlegiveis());
        setAcervo(todos);

        const lista = daPasta(todos, pasta, Boolean(opcoes?.recursivo));
        setItens(lista.map(converterRef.current));
        setTitulos(
          Object.fromEntries(
            todos.map((i) => [i.caminho, tituloProvavel(i.doc, i.nome)]),
          ),
        );
        
        setCarregando(false);
        jaCarregouRef.current = true;
      } else if (!silencioso && !jaCarregouRef.current) {
        setCarregando(true);
      }
      
      setErro("");

      try {
        // Se já mostramos os dados locais, esta chamada à rede ocorre de forma silenciosa
        const todosBase = await carregarRepo(cfg, {
          memoria: forcar ? 0 : 15_000,
          forcarRede: forcar,
        });
        const rascunhos = obterRascunhosLocais();

        let todos = [...todosBase];
        if (rascunhos.length > 0) {
          const mapaRascunhos = new Map(rascunhos.map((r) => [r.caminho, r]));

          todos = todos.map((item) => {
            const rascunho = mapaRascunhos.get(item.caminho);
            if (rascunho) {
              mapaRascunhos.delete(item.caminho);
              if (rascunho.acao === "apagar") {
                return null; // Oculta o arquivo imediatamente (Optimistic Delete)
              }
              const docRascunho = lerMarkdown(rascunho.texto);
              return {
                ...item,
                texto: rascunho.texto,
                doc: docRascunho,
              };
            }
            return item;
          }).filter((i): i is NonNullable<typeof i> => i !== null);

          for (const rascunho of mapaRascunhos.values()) {
            if (rascunho.acao === "apagar") continue;
            const docRascunho = lerMarkdown(rascunho.texto);
            const nome = rascunho.caminho.split("/").pop() || "rascunho.md";
            todos.push({
              caminho: rascunho.caminho,
              nome,
              sha: rascunho.sha || "",
              tamanho: rascunho.texto.length,
              texto: rascunho.texto,
              doc: docRascunho,
            });
          }
        }

        setIlegiveis(arquivosIlegiveis());
        setAcervo(todos);

        const lista = daPasta(todos, pasta, Boolean(opcoes?.recursivo));
        setItens(lista.map(converterRef.current));
        setTitulos(
          Object.fromEntries(
            todos.map((i) => [i.caminho, tituloProvavel(i.doc, i.nome)]),
          ),
        );
      } catch (e) {
        // Só exibe o erro se não tínhamos nada em cache, para evitar alertas intrusivos ao usuário
        if (!cacheValido) {
          setErro(e instanceof Error ? e.message : String(e));
        }
      } finally {
        jaCarregouRef.current = true;
        setCarregando(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [cfg.githubToken, cfg.repoOwner, cfg.repoName, cfg.branch, pasta, opcoes?.recursivo],
  );

  useEffect(() => {
    carregar();
  }, [carregar]);

  // Escuta atualizações do acervo de forma inteligente (com filtro por pasta para eliminar re-renders desnecessários)
  useAoAtualizarAcervo(() => carregar(true), pasta);

  const recarregar = useCallback(() => carregar(true, true), [carregar]);

  return { itens, acervo, titulos, carregando, erro, ilegiveis, recarregar };
}
