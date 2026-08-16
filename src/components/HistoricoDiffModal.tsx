import { useEffect, useState } from "react";
import ReactDiffViewer from "react-diff-viewer-continued";
import { Modal, Botao, Carregando } from "@/components/ui";
import { lerConfig } from "@/lib/settings";
import { lerOuVazio } from "@/lib/github";

type CommitItem = {
  sha: string;
  commit: {
    message: string;
    author: { date: string; name: string };
  };
};

export function HistoricoDiffModal({
  aberto,
  aoFechar,
  caminho,
  conteudoAtual,
  aoRestaurar,
}: {
  aberto: boolean;
  aoFechar: () => void;
  caminho: string;
  /**
   * O arquivo inteiro como está hoje. Opcional: quem abre o histórico
   * normalmente tem o título e o corpo separados, não o `.md` montado — e
   * remontar na mão só para comparar daria um diff cheio de diferença falsa no
   * frontmatter. Sem este valor, o componente busca a versão salva no GitHub.
   */
  conteudoAtual?: string;
  aoRestaurar?: (textoHistorico: string) => void;
}) {
  const [commits, setCommits] = useState<CommitItem[]>([]);
  const [carregando, setCarregando] = useState(false);
  const [commitSelecionado, setCommitSelecionado] = useState<string | null>(null);
  const [conteudoAntigo, setConteudoAntigo] = useState<string>("");
  /** A versão salva hoje, quando quem abriu não passou `conteudoAtual`. */
  const [conteudoSalvo, setConteudoSalvo] = useState<string>("");
  const [carregandoDiff, setCarregandoDiff] = useState(false);
  const [erro, setErro] = useState("");

  const cfg = lerConfig();

  useEffect(() => {
    if (!aberto || !caminho || !cfg.githubToken) return;
    setCarregando(true);
    setErro("");
    setCommits([]);
    setCommitSelecionado(null);
    setConteudoAntigo("");

    // Buscar histórico de commits do arquivo usando os cabeçalhos corretos do GitHub API v3
    fetch(
      `https://api.github.com/repos/${cfg.repoOwner}/${cfg.repoName}/commits?path=${encodeURIComponent(caminho)}`,
      {
        headers: {
          Authorization: `Bearer ${cfg.githubToken.trim()}`,
          Accept: "application/vnd.github+json",
          "X-GitHub-Api-Version": "2022-11-28",
        },
      },
    )
      .then((res) => {
        if (!res.ok) {
          throw new Error(`Erro do GitHub (${res.status}). Verifique seu token em Ajustes.`);
        }
        return res.json();
      })
      .then((data: CommitItem[]) => {
        if (!Array.isArray(data)) {
          throw new Error("Histórico não retornado no formato esperado.");
        }
        setCommits(data);
        if (data.length > 0) {
          setCommitSelecionado(data[0].sha);
        }
      })
      .catch((e) => setErro(e.message))
      .finally(() => setCarregando(false));
  }, [aberto, caminho, cfg.repoOwner, cfg.repoName, cfg.githubToken]);

  // Carregar o conteúdo do arquivo no commit selecionado
  useEffect(() => {
    if (!commitSelecionado || !caminho) return;
    setCarregandoDiff(true);

    lerOuVazio(cfg, caminho, commitSelecionado)
      .then((txt: string) => setConteudoAntigo(txt))
      .catch(() => setConteudoAntigo(""))
      .finally(() => setCarregandoDiff(false));
  }, [commitSelecionado, caminho, cfg]);

  // Busca a versão salva hoje, quando quem abriu não tinha o arquivo montado.
  useEffect(() => {
    if (!aberto || !caminho || conteudoAtual !== undefined) return;
    lerOuVazio(cfg, caminho)
      .then((txt: string) => setConteudoSalvo(txt))
      .catch(() => setConteudoSalvo(""));
  }, [aberto, caminho, conteudoAtual, cfg]);

  const textoAtual = conteudoAtual ?? conteudoSalvo;

  const ehModoEscuro = document.documentElement.classList.contains("dark");

  return (
    <Modal
      aberto={aberto}
      aoFechar={aoFechar}
      titulo="Histórico de Versões & Alterações (Diff)"
      rodape={
        <Botao variante="neutro" onClick={aoFechar}>
          Fechar
        </Botao>
      }
    >
      <div className="space-y-4">
        {carregando ? (
          <Carregando texto="Carregando histórico do GitHub…" />
        ) : erro ? (
          <p className="text-sm text-destructive">{erro}</p>
        ) : commits.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhuma versão anterior encontrada para este arquivo no GitHub.</p>
        ) : (
          <>
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1">
                Selecione uma versão anterior para comparar:
              </label>
              <select
                value={commitSelecionado || ""}
                onChange={(e) => setCommitSelecionado(e.target.value)}
                className="w-full rounded-lg border border-border bg-background p-2 text-sm text-foreground"
              >
                {commits.map((c) => (
                  <option key={c.sha} value={c.sha}>
                    {new Date(c.commit.author.date).toLocaleString("pt-BR")} — {c.commit.message} ({c.sha.slice(0, 7)})
                  </option>
                ))}
              </select>
            </div>

            {carregandoDiff ? (
              <Carregando texto="Comparando versões…" />
            ) : (
              <div className="space-y-3">
                <div className="overflow-x-auto rounded-lg border border-border text-xs max-h-96 bg-background">
                  <ReactDiffViewer
                    oldValue={conteudoAntigo}
                    newValue={textoAtual}
                    splitView={false}
                    useDarkTheme={ehModoEscuro}
                    leftTitle="Versão Selecionada (Anterior)"
                    rightTitle="Versão Atual no Editor"
                  />
                </div>
                {aoRestaurar && conteudoAntigo && (
                  <div className="flex justify-end pt-2">
                    <Botao
                      variante="primario"
                      tamanho="pequeno"
                      onClick={() => {
                        aoRestaurar(conteudoAntigo);
                        aoFechar();
                      }}
                    >
                      Restaurar esta versão para o editor
                    </Botao>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </Modal>
  );
}
