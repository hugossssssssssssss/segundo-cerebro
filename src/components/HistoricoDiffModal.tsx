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
}: {
  aberto: boolean;
  aoFechar: () => void;
  caminho: string;
  conteudoAtual: string;
}) {
  const [commits, setCommits] = useState<CommitItem[]>([]);
  const [carregando, setCarregando] = useState(false);
  const [commitSelecionado, setCommitSelecionado] = useState<string | null>(null);
  const [conteudoAntigo, setConteudoAntigo] = useState<string>("");
  const [carregandoDiff, setCarregandoDiff] = useState(false);
  const [erro, setErro] = useState("");

  const cfg = lerConfig();

  useEffect(() => {
    if (!aberto || !caminho) return;
    setCarregando(true);
    setErro("");
    setCommits([]);
    setCommitSelecionado(null);
    setConteudoAntigo("");

    // Buscar lista de commits do arquivo na API do GitHub
    fetch(
      `https://api.github.com/repos/${cfg.repoOwner}/${cfg.repoName}/commits?path=${encodeURIComponent(caminho)}`,
      {
        headers: {
          Authorization: `token ${cfg.githubToken}`,
          Accept: "application/vnd.github.v3+json",
        },
      },
    )
      .then((res) => {
        if (!res.ok) throw new Error("Não foi possível carregar o histórico de versões");
        return res.json();
      })
      .then((data: CommitItem[]) => {
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
    // As dependências são STRINGS, não o objeto `cfg`: `lerConfig()` devolve
    // um objeto novo a cada render, então incluí-lo aqui fazia o efeito
    // disparar em loop e queimar a cota horária do GitHub em segundos.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [commitSelecionado, caminho, cfg.repoOwner, cfg.repoName, cfg.githubToken]);

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
          <p className="text-sm text-muted-foreground">Nenhuma versão anterior encontrada.</p>
        ) : (
          <>
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1">
                Selecione uma versão anterior para comparar:
              </label>
              <select
                value={commitSelecionado || ""}
                onChange={(e) => setCommitSelecionado(e.target.value)}
                className="w-full rounded-lg border border-border bg-background p-2 text-sm"
              >
                {commits.map((c) => (
                  <option key={c.sha} value={c.sha}>
                    {new Date(c.commit.author.date).toLocaleString()} — {c.commit.message} ({c.sha.slice(0, 7)})
                  </option>
                ))}
              </select>
            </div>

            {carregandoDiff ? (
              <Carregando texto="Comparando versões…" />
            ) : (
              <div className="overflow-x-auto rounded-lg border border-border text-xs max-h-96">
                <ReactDiffViewer
                  oldValue={conteudoAntigo}
                  newValue={conteudoAtual}
                  splitView={false}
                  useDarkTheme={document.documentElement.classList.contains("dark")}
                  leftTitle="Versão do Histórico"
                  rightTitle="Versão Atual"
                />
              </div>
            )}
          </>
        )}
      </div>
    </Modal>
  );
}
