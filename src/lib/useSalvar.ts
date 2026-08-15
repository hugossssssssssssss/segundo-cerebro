/**
 * Hook de salvamento padrão do app.
 *
 * TODA tela usa este hook para gravar e apagar. Ele garante, NA ORDEM CERTA:
 *   1. gravar() no GitHub
 *   2. atualizarCacheLocal() com o SHA REAL devolvido pelo GitHub
 *   3. invalidarCache()
 *   4. dispatchEvent("acervo-atualizado") — outras telas abertas sincronizam
 *
 * Não chame gravar() + invalidarCache() diretamente nas telas.
 * Não atualize o cache ANTES de gravar() retornar — o sha antigo envenena o mapa.
 *
 * @example
 * ```tsx
 * const { salvarTexto, apagarItem, salvando, erro } = useSalvar(cfg);
 *
 * // Para gravar:
 * const doc = { dados: notaParaArquivo(nota).dados, corpo: nota.corpo };
 * const novaSha = await salvarTexto(nota.caminho, escreverMarkdown(doc), nota.sha);
 *
 * // Para apagar:
 * await apagarItem(nota.caminho, nota.sha);
 * ```
 */

import { useState } from "react";
import { gravar, apagar } from "./github";
import { atualizarCacheLocal, invalidarCache } from "./repo";
import { lerMarkdown } from "./markdown";
import { notificarOutrasAbas } from "./syncChannel";
import { toast } from "./toast";
import type { Settings } from "./settings";

export type EstadoSalvar = {
  /**
   * Grava um arquivo e atualiza o cache local.
   * Retorna o novo SHA devolvido pelo GitHub.
   * Lança erro (que fica em `erro`) se a gravação falhar.
   */
  salvarTexto: (
    caminho: string,
    texto: string,
    sha?: string,
    mensagemCommit?: string,
  ) => Promise<string>;

  /**
   * Apaga um arquivo e invalida o cache.
   * Lança erro (que fica em `erro`) se a operação falhar.
   */
  apagarItem: (caminho: string, sha: string) => Promise<void>;

  salvando: boolean;
  erro: string;
  /** Limpa o erro atual — útil ao abrir um novo item ou fechar o painel. */
  limparErro: () => void;
};

export function useSalvar(cfg: Settings): EstadoSalvar {
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");

  async function salvarTexto(
    caminho: string,
    texto: string,
    sha?: string,
    mensagemCommit?: string,
  ): Promise<string> {
    setSalvando(true);
    setErro("");
    try {
      const novaSha = await gravar(cfg, caminho, texto, sha, mensagemCommit);

      // Atualiza DEPOIS de gravar, com o sha REAL. Nunca antes.
      const doc = lerMarkdown(texto);
      atualizarCacheLocal(caminho, texto, doc, novaSha);
      invalidarCache();

      // Sinaliza para a aba atual e outras abas abertas que o acervo mudou.
      window.dispatchEvent(new CustomEvent("acervo-atualizado"));
      notificarOutrasAbas(caminho);

      const nomeItem = caminho.split("/").pop() || "Item";
      toast(`"${nomeItem}" salvo no GitHub!`, { tipo: "sucesso" });

      return novaSha;
    } catch (e) {
      const mensagem = e instanceof Error ? e.message : String(e);
      setErro(mensagem);
      toast(mensagem, { tipo: "erro" });
      throw e; // repassa para quem chamou decidir o que fazer com a UI
    } finally {
      setSalvando(false);
    }
  }

  async function apagarItem(caminho: string, sha: string): Promise<void> {
    setSalvando(true);
    setErro("");
    try {
      await apagar(cfg, caminho, sha);
      invalidarCache();
      window.dispatchEvent(new CustomEvent("acervo-atualizado"));
      notificarOutrasAbas(caminho);

      const nomeItem = caminho.split("/").pop() || "Item";
      toast(`"${nomeItem}" removido.`, { tipo: "info" });
    } catch (e) {
      const mensagem = e instanceof Error ? e.message : String(e);
      setErro(mensagem);
      toast(mensagem, { tipo: "erro" });
      throw e;
    } finally {
      setSalvando(false);
    }
  }

  return {
    salvarTexto,
    apagarItem,
    salvando,
    erro,
    limparErro: () => setErro(""),
  };
}
