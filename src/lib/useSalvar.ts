/**
 * Hook de salvamento otimista e não bloqueante do app.
 *
 * TODA tela usa este hook para gravar e apagar. Ele garante Optimistic UI:
 *   1. Salva a tarefa na fila em background (Sync Queue)
 *   2. Atualiza o cache local na memória imediatamente com um SHA (real ou temporário)
 *   3. Dispara o evento "acervo-atualizado" instantaneamente
 *   4. Retorna sucesso imediato sem bloquear a interface do usuário
 *
 * A sincronização real com o GitHub ocorre em segundo plano na fila de sync.
 */

import { useState, useEffect } from "react";
import { atualizarCacheLocal, removerDoCacheLocal, obterCacheExistente } from "./repo";
import { lerMarkdown, escreverMarkdown, mesclarFrontmatter } from "./markdown";
import { notificarOutrasAbas } from "./syncChannel";
import { toast } from "./toast";
import { formatarNomeAmigavel } from "./utils";
import {
  salvarRascunhoLocal,
  obterRascunhosLocais,
  sincronizarFilaOffline,
  limparRascunhosComErro,
} from "./offlineQueue";
import { lerConfig, configCompleta, type Settings } from "./settings";
import { dispararAtualizacaoAcervo, EVENTO_ACERVO_ATUALIZADO } from "./eventos";
import { moverParaLixeira, PASTA_LIXEIRA } from "./lixeira";
import { marcarItemComoVistoLocal } from "./inbox";

export type EstadoSalvar = {
  /**
   * Grava um arquivo localmente na fila e atualiza o cache local na hora.
   * Retorna o SHA (real ou temporário).
   */
  salvarTexto: (
    caminho: string,
    texto: string,
    sha?: string,
    mensagemCommit?: string,
    silencioso?: boolean,
  ) => Promise<string>;

  /**
   * Apaga um arquivo, movendo-o para a Lixeira Soberana para permitir recuperação.
   */
  apagarItem: (caminho: string, sha: string, silencioso?: boolean) => Promise<void>;

  /**
   * Exclui um arquivo definitivamente sem enviar para a lixeira.
   */
  apagarDefinitivoItem: (caminho: string, sha: string, silencioso?: boolean) => Promise<void>;

  /**
   * Move um arquivo para a Lixeira Soberana (.lixeira/) com reversibilidade total.
   */
  moverParaLixeiraItem: (caminho: string, sha: string, silencioso?: boolean) => Promise<void>;

  salvando: boolean;
  erro: string;
  /** Limpa o erro atual. */
  limparErro: () => void;
};

export function useSalvar(cfgProp?: Settings): EstadoSalvar {
  const [erro, setErro] = useState("");
  const [salvando, setSalvando] = useState(false);

  function obterConfigAtual(): Settings {
    return cfgProp && configCompleta(cfgProp) ? cfgProp : lerConfig();
  }

  // Monitora a fila de sincronização em segundo plano para refletir o status de "salvando" de forma informativa
  useEffect(() => {
    const checarStatusFila = () => {
      const rascunhos = obterRascunhosLocais();
      // Se houver algum rascunho com status "sincronizando" ou "pendente", consideramos que está salvando
      const ativo = rascunhos.some((r) => r.status === "sincronizando" || r.status === "pendente");
      setSalvando(ativo);

      // Agrega erros na fila para exibição reativa
      const comErro = rascunhos.find((r) => r.status === "erro" || r.status === "conflito");
      if (comErro) {
        setErro(comErro.ultimoErro || "Erro na sincronização em segundo plano.");
      } else {
        setErro("");
      }
    };

    checarStatusFila();
    window.addEventListener(EVENTO_ACERVO_ATUALIZADO, checarStatusFila);
    return () => window.removeEventListener(EVENTO_ACERVO_ATUALIZADO, checarStatusFila);
  }, []);

  async function salvarTexto(
    caminho: string,
    texto: string,
    sha?: string,
    mensagemCommit?: string,
    silencioso = false,
  ): Promise<string> {
    setErro("");
    try {
      // Se não houver sha (criação), gera um temporário para a Optimistic UI
      const shaFinal = sha || `temp_${Math.random().toString(36).substring(7)}`;

      // 1. Enfileira na Sync Queue local
      salvarRascunhoLocal(caminho, texto, sha, mensagemCommit, false, "gravar");

      // 2. Atualiza o cache local em memória imediatamente
      const doc = lerMarkdown(texto);
      atualizarCacheLocal(caminho, texto, doc, shaFinal);

      // Marca como visto localmente para evitar notificações de não lido para o próprio autor
      marcarItemComoVistoLocal(caminho);

      if (!silencioso) {
        // 3. Notifica atualizações de estado local com agrupamento inteligente
        dispararAtualizacaoAcervo(caminho);
        notificarOutrasAbas(caminho);
      }

      // 4. Dispara a sincronização real com o GitHub em background
      const cfg = lerConfig();
      if (configCompleta(cfg) && navigator.onLine) {
        sincronizarFilaOffline(cfg).catch(() => {});
      }

      return shaFinal;
    } catch (e) {
      const mensagem = e instanceof Error ? e.message : String(e);
      setErro(mensagem);
      throw e;
    }
  }

  async function apagarDefinitivoItem(caminho: string, sha: string, silencioso = false): Promise<void> {
    setErro("");
    try {
      // 1. Enfileira a exclusão na Sync Queue local
      salvarRascunhoLocal(caminho, "", sha, undefined, false, "apagar");

      // 2. Remove do cache local em memória imediatamente
      removerDoCacheLocal(caminho);

      if (!silencioso) {
        // 3. Notifica atualizações de estado local com agrupamento inteligente
        dispararAtualizacaoAcervo(caminho);
        notificarOutrasAbas(caminho);

        const nomeItem = formatarNomeAmigavel(caminho);
        toast(`"${nomeItem}" excluído definitivamente`, { tipo: "info" });
      }

      // 4. Dispara a sincronização real com o GitHub em background
      const cfg = obterConfigAtual();
      if (configCompleta(cfg) && navigator.onLine) {
        sincronizarFilaOffline(cfg).catch(() => {});
      }
    } catch (e) {
      const mensagem = e instanceof Error ? e.message : String(e);
      setErro(mensagem);
      throw e;
    }
  }

  async function moverParaLixeiraItem(caminho: string, sha: string, silencioso = false): Promise<void> {
    setErro("");
    try {
      // 1. Optimistic UI: Imediatamente calcula texto e adiciona na lixeira local em memória
      const cfg = obterConfigAtual();
      const cacheExistente = obterCacheExistente(cfg);
      const itemEmCache = cacheExistente?.itens.find((i) => i.caminho === caminho);
      const texto = itemEmCache?.texto || "";

      if (texto) {
        try {
          const doc = lerMarkdown(texto);
          const caminhoLixeira = `${PASTA_LIXEIRA}/${caminho}`;
          const dadosLixeira = mesclarFrontmatter(doc.dados, {
            apagado_em: new Date().toISOString(),
            caminho_origem: caminho,
          });
          const textoLixeira = escreverMarkdown({ dados: dadosLixeira, corpo: doc.corpo });
          atualizarCacheLocal(caminhoLixeira, textoLixeira, lerMarkdown(textoLixeira), `temp_${Math.random().toString(36).substring(7)}`);
        } catch {}
      }

      // 2. Remove imediatamente do cache local ativo original
      removerDoCacheLocal(caminho);

      // 3. Registra na fila de sincronização como exclusão
      salvarRascunhoLocal(caminho, "", sha, undefined, false, "apagar");

      if (!silencioso) {
        dispararAtualizacaoAcervo(caminho);
        notificarOutrasAbas(caminho);
        const nomeItem = formatarNomeAmigavel(caminho);
        toast(`"${nomeItem}" movido para a Lixeira`, { tipo: "info" });
      }

      // 4. Executa a sincronização segura com GitHub em segundo plano (não-bloqueante)
      if (configCompleta(cfg) && navigator.onLine) {
        moverParaLixeira(cfg, caminho, sha)
          .catch((err) => {
            console.error("Erro ao mover para lixeira em segundo plano:", err);
            sincronizarFilaOffline(cfg).catch(() => {});
          });
      }
    } catch (e) {
      const mensagem = e instanceof Error ? e.message : String(e);
      setErro(mensagem);
      throw e;
    }
  }

  async function apagarItem(caminho: string, sha: string, silencioso = false): Promise<void> {
    // Se o arquivo já estiver na pasta da lixeira, apaga em definitivo
    if (caminho.startsWith(`${PASTA_LIXEIRA}/`)) {
      return apagarDefinitivoItem(caminho, sha, silencioso);
    }
    // Caso contrário, move para a Lixeira Soberana para permitir recuperação
    return moverParaLixeiraItem(caminho, sha, silencioso);
  }

  return {
    salvarTexto,
    apagarItem,
    apagarDefinitivoItem,
    moverParaLixeiraItem,
    salvando,
    erro,
    limparErro: () => {
      setErro("");
      limparRascunhosComErro();
    },
  };
}
