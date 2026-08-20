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
import { gravar, ler, apagar, ErroGitHub } from "./github";
import { atualizarCacheLocal, invalidarCache, removerDoCacheLocal } from "./repo";
import { lerMarkdown } from "./markdown";
import { notificarOutrasAbas } from "./syncChannel";
import { toast } from "./toast";
import { formatarNomeAmigavel } from "./utils";
import { salvarRascunhoLocal } from "./offlineQueue";
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
    silencioso?: boolean,
  ) => Promise<string>;

  /**
   * Apaga um arquivo e invalida o cache.
   * Lança erro (que fica em `erro`) se a operação falhar.
   */
  apagarItem: (caminho: string, sha: string, silencioso?: boolean) => Promise<void>;

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
    silencioso = false,
  ): Promise<string> {
    setSalvando(true);
    setErro("");
    try {
      let novaSha: string;
      try {
        novaSha = await gravar(cfg, caminho, texto, sha, mensagemCommit);
      } catch (err: any) {
        const status = err instanceof ErroGitHub ? err.status : err?.status;
        const msg = err instanceof Error ? err.message : String(err);
        if (status === 409 || msg.includes("409") || msg.includes("conflito")) {
          // Em caso de descompasso de SHA (409), recupera o SHA atual no GitHub e tenta salvar novamente
          const { sha: remoteSha } = await ler(cfg, caminho);
          novaSha = await gravar(cfg, caminho, texto, remoteSha, mensagemCommit);
        } else {
          throw err;
        }
      }

      // Atualiza DEPOIS de gravar, com o sha REAL. Nunca antes.
      const doc = lerMarkdown(texto);
      atualizarCacheLocal(caminho, texto, doc, novaSha);
      
      if (!silencioso) {
        // Espera um curto período para a árvore do Git no GitHub atualizar (evita cache inconsistente por eventual consistency)
        await new Promise((r) => setTimeout(r, 800));

        invalidarCache();

        // Sinaliza para a aba atual e outras abas abertas que o acervo mudou.
        window.dispatchEvent(new CustomEvent("acervo-atualizado"));
        notificarOutrasAbas(caminho);

        const nomeItem = formatarNomeAmigavel(caminho);
        toast(`"${nomeItem}" salvo`, { tipo: "sucesso" });
      }

      return novaSha;
    } catch (e) {
      const mensagem = e instanceof Error ? e.message : String(e);
      setErro(mensagem);

      const status = e instanceof ErroGitHub ? e.status : undefined;
      const ehRede =
        status === 0 ||
        !navigator.onLine ||
        mensagem.includes("sem internet") ||
        mensagem.includes("Não consegui falar");

      const nomeItem = formatarNomeAmigavel(caminho);
      if (ehRede) {
        // Salva rascunho local apenas em caso de falha real de conexão
        const res = salvarRascunhoLocal(caminho, texto, sha, mensagemCommit, false);
        if (res.ok) {
          toast(`Sem conexão: "${nomeItem}" salvo localmente como rascunho.`, { tipo: "aviso" });
        } else {
          toast(`Sem conexão e espaço local cheio: não foi possível guardar o rascunho. COPIE SEU TEXTO antes de sair!`, { tipo: "erro", detalhes: mensagem });
        }
      } else {
        // Para erros de autenticação (401/403), conflito (409) ou dados (422), reporta a falha real
        toast(`Erro ao salvar "${nomeItem}": ${mensagem}`, { tipo: "erro", detalhes: mensagem });
      }
      throw e;
    } finally {
      setSalvando(false);
    }
  }

  async function apagarItem(caminho: string, sha: string, silencioso = false): Promise<void> {
    setSalvando(true);
    setErro("");
    try {
      try {
        await apagar(cfg, caminho, sha);
      } catch (err: any) {
        const status = err instanceof ErroGitHub ? err.status : err?.status;
        const msg = err instanceof Error ? err.message : String(err);
        
        if (status === 404) {
          // Arquivo já foi excluído no GitHub (sucesso silencioso!)
        } else if (status === 409 || msg.includes("409") || msg.includes("conflito")) {
          try {
            // Recupera o SHA atual no GitHub e tenta apagar novamente
            const { sha: remoteSha } = await ler(cfg, caminho);
            await apagar(cfg, caminho, remoteSha);
          } catch (innerErr: any) {
            const innerStatus = innerErr instanceof ErroGitHub ? innerErr.status : innerErr?.status;
            if (innerStatus === 404) {
              // Arquivo já foi excluído, prosseguir como sucesso silencioso
            } else {
              throw innerErr;
            }
          }
        } else {
          throw err;
        }
      }

      removerDoCacheLocal(caminho);

      if (!silencioso) {
        // Espera um curto período para a árvore do Git no GitHub atualizar (evita cache inconsistente por eventual consistency)
        await new Promise((r) => setTimeout(r, 800));

        invalidarCache();
        window.dispatchEvent(new CustomEvent("acervo-atualizado"));
        notificarOutrasAbas(caminho);

        const nomeItem = formatarNomeAmigavel(caminho);
        toast(`"${nomeItem}" removido`, { tipo: "info" });
      }
    } catch (e) {
      const mensagem = e instanceof Error ? e.message : String(e);
      setErro(mensagem);
      const nomeItem = formatarNomeAmigavel(caminho);
      toast(`Erro ao excluir "${nomeItem}": ${mensagem}`, { tipo: "erro", detalhes: mensagem });
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
