/**
 * Limpeza e Exclusão em Lote de Arquivos Residuais de Processos / CRM.
 *
 * Permite varrer o repositório de dados, identificar arquivos criados anteriormente
 * na pasta `processos/` e excluí-los em lote do GitHub.
 */

import type { ItemRepo } from "./repo";
import { removerDoCacheLocal, invalidarCache } from "./repo";
import { apagar, conferir } from "./github";
import type { Settings } from "./settings";
import { dispararAtualizacaoAcervo } from "./eventos";
import { notificarOutrasAbas } from "./syncChannel";

const BASE = "https://api.github.com";

function cabecalhos(cfg: Settings): HeadersInit {
  return {
    Authorization: `Bearer ${cfg.githubToken.trim()}`,
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
  };
}

/**
 * Identifica todos os arquivos markdown ou dados na pasta processos/ e suas subpastas.
 */
export function identificarArquivosProcessos(itens: ItemRepo[]): ItemRepo[] {
  return itens.filter((i) => i.caminho.startsWith("processos/"));
}

/**
 * Tenta apagar múltiplos arquivos em um único commit atômico usando a Git Trees API do GitHub.
 */
async function apagarViaGitTrees(
  cfg: Settings,
  itens: Array<{ caminho: string; sha: string }>,
): Promise<boolean> {
  try {
    const branch = encodeURIComponent(cfg.branch || "main");
    const repoPath = `${BASE}/repos/${cfg.repoOwner}/${cfg.repoName}`;

    // 1. Obter o commit atual da branch
    const refRes = await fetch(`${repoPath}/git/ref/heads/${branch}`, {
      headers: cabecalhos(cfg),
    });
    await conferir(refRes);
    const refData = await refRes.json();
    const parentCommitSha = refData.object.sha;

    // 2. Obter a árvore do commit base
    const commitRes = await fetch(`${repoPath}/git/commits/${parentCommitSha}`, {
      headers: cabecalhos(cfg),
    });
    await conferir(commitRes);
    const commitData = await commitRes.json();
    const baseTreeSha = commitData.tree.sha;

    // 3. Criar nova árvore com sha: null para cada arquivo deletado
    // No Git Trees API do GitHub, definir sha: null remove a entrada da árvore
    const treeEntries = itens.map((item) => ({
      path: item.caminho,
      mode: "100644" as const,
      type: "blob" as const,
      sha: null,
    }));

    const treeRes = await fetch(`${repoPath}/git/trees`, {
      method: "POST",
      headers: { ...cabecalhos(cfg), "Content-Type": "application/json" },
      body: JSON.stringify({
        base_tree: baseTreeSha,
        tree: treeEntries,
      }),
    });
    await conferir(treeRes);
    const treeData = await treeRes.json();
    const newTreeSha = treeData.sha;

    // 4. Criar o commit de deleção em lote
    const newCommitRes = await fetch(`${repoPath}/git/commits`, {
      method: "POST",
      headers: { ...cabecalhos(cfg), "Content-Type": "application/json" },
      body: JSON.stringify({
        message: `chore: remover ${itens.length} arquivo(s) residuais de processos e CRM`,
        tree: newTreeSha,
        parents: [parentCommitSha],
      }),
    });
    await conferir(newCommitRes);
    const newCommitData = await newCommitRes.json();
    const newCommitSha = newCommitData.sha;

    // 5. Atualizar a referência da branch
    const updateRefRes = await fetch(`${repoPath}/git/refs/heads/${branch}`, {
      method: "PATCH",
      headers: { ...cabecalhos(cfg), "Content-Type": "application/json" },
      body: JSON.stringify({
        sha: newCommitSha,
        force: false,
      }),
    });
    await conferir(updateRefRes);

    return true;
  } catch {
    return false;
  }
}

/**
 * Exclui todos os arquivos de processos informados do GitHub.
 * Utiliza commit em lote atômico ou fallback sequencial/concorrente.
 */
export async function apagarArquivosProcessosEmLote(
  cfg: Settings,
  itens: Array<{ caminho: string; sha: string }>,
  onProgresso?: (atual: number, total: number, mensagem: string) => void,
): Promise<{ sucessos: number; falhas: string[] }> {
  if (itens.length === 0) return { sucessos: 0, falhas: [] };

  if (onProgresso) {
    onProgresso(0, itens.length, "Iniciando exclusão atômica no GitHub...");
  }

  // Tenta exclusão em bloco rápido via Git Trees API
  const sucessoTrees = await apagarViaGitTrees(cfg, itens);
  if (sucessoTrees) {
    for (const item of itens) {
      removerDoCacheLocal(item.caminho);
    }
    invalidarCache();
    dispararAtualizacaoAcervo();
    notificarOutrasAbas();
    if (onProgresso) {
      onProgresso(itens.length, itens.length, "Todos os arquivos foram removidos com sucesso!");
    }
    return { sucessos: itens.length, falhas: [] };
  }

  // Fallback: exclusão arquivo a arquivo caso a Git Trees API falhe
  let sucessos = 0;
  const falhas: string[] = [];

  for (let i = 0; i < itens.length; i++) {
    const item = itens[i];
    if (onProgresso) {
      onProgresso(i + 1, itens.length, `Excluindo: ${item.caminho}`);
    }

    try {
      await apagar(cfg, item.caminho, item.sha);
      removerDoCacheLocal(item.caminho);
      sucessos++;
    } catch {
      falhas.push(item.caminho);
    }
  }

  if (sucessos > 0) {
    invalidarCache();
    dispararAtualizacaoAcervo();
    notificarOutrasAbas();
  }

  return { sucessos, falhas };
}
