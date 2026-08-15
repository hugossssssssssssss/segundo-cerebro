/**
 * Hook de carregamento padrão do app.
 *
 * TODA tela principal deve usar este hook em vez de reimplementar o
 * carregamento do repositório. Não chame `carregarRepo` + `daPasta`
 * diretamente nas telas — use este hook.
 *
 * O hook:
 * - Guarda internamente o `jaCarregouRef` (evita spinner duplo)
 * - Escuta o evento "acervo-atualizado" e recarrega em silêncio
 * - Expõe `recarregar()` para ser chamado após salvar/apagar
 *
 * @example
 * ```tsx
 * const { itens, acervo, carregando, erro, recarregar } = useItemRepo(
 *   cfg,
 *   PASTAS.notas,
 *   (item) => comoNota(item.doc, item.caminho, item.sha, tituloProvavel(item.doc, item.nome)),
 * );
 * ```
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { carregarRepo, daPasta, arquivosIlegiveis, type ItemRepo } from "./repo";
import { tituloProvavel } from "./markdown";
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

  const carregar = useCallback(
    async (silencioso = false) => {
      if (!cfg.githubToken || !cfg.repoOwner || !cfg.repoName) {
        setCarregando(false);
        return;
      }

      if (!silencioso && !jaCarregouRef.current) {
        setCarregando(true);
      }
      setErro("");

      try {
        const todos = await carregarRepo(cfg);
        setIlegiveis(arquivosIlegiveis());
        setAcervo(todos);

        const lista = daPasta(todos, pasta);
        setItens(lista.map(converter));
        setTitulos(
          Object.fromEntries(
            todos.map((i) => [i.caminho, tituloProvavel(i.doc, i.nome)]),
          ),
        );
      } catch (e) {
        setErro(e instanceof Error ? e.message : String(e));
      } finally {
        jaCarregouRef.current = true;
        setCarregando(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [cfg.githubToken, cfg.repoOwner, cfg.repoName, cfg.branch, pasta],
  );

  useEffect(() => {
    carregar();

    const aoAtualizar = () => carregar(true);
    window.addEventListener("acervo-atualizado", aoAtualizar);
    return () => window.removeEventListener("acervo-atualizado", aoAtualizar);
  }, [carregar]);

  const recarregar = useCallback(() => carregar(true), [carregar]);

  return { itens, acervo, titulos, carregando, erro, ilegiveis, recarregar };
}
