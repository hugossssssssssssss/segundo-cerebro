import { useEffect, useState } from "react";
import { RotateCcw, FileText, History } from "lucide-react";
import { Modal, Botao, Carregando, Aviso } from "@/components/ui";
import { lerConfig } from "@/lib/settings";
import { useSalvar } from "@/lib/useSalvar";

type CommitDeletado = {
  sha: string;
  caminho: string;
  mensagem: string;
  data: string;
};

export function LixeiraGitModal({
  aberto,
  aoFechar,
}: {
  aberto: boolean;
  aoFechar: () => void;
}) {
  const cfg = lerConfig();
  const { salvarTexto } = useSalvar(cfg);

  const [deletados, setDeletados] = useState<CommitDeletado[]>([]);
  const [carregando, setCarregando] = useState(false);
  const [restaurando, setRestaurando] = useState<string | null>(null);
  const [erro, setErro] = useState("");
  const [sucesso, setSucesso] = useState("");

  useEffect(() => {
    if (!aberto) return;

    let cancelado = false;
    setCarregando(true);
    setErro("");
    setSucesso("");

    // Busca commits recentes no repositório
    fetch(`https://api.github.com/repos/${cfg.repoOwner}/${cfg.repoName}/commits?per_page=50`, {
      headers: {
        Authorization: `Bearer ${cfg.githubToken.trim()}`,
        Accept: "application/vnd.github+json",
      },
    })
      .then((res) => (res.ok ? res.json() : []))
      .then(async (commitsArr: any[]) => {
        if (cancelado) return;
        const itensEncontrados: CommitDeletado[] = [];

        // Para cada commit, inspeciona arquivos alterados/deletados
        for (const c of commitsArr.slice(0, 15)) {
          if (cancelado) break;
          try {
            const resCommit = await fetch(
              `https://api.github.com/repos/${cfg.repoOwner}/${cfg.repoName}/commits/${c.sha}`,
              {
                headers: {
                  Authorization: `Bearer ${cfg.githubToken.trim()}`,
                  Accept: "application/vnd.github+json",
                },
              }
            );
            if (!resCommit.ok) continue;
            const dadosCommit = await resCommit.json();
            const files = Array.isArray(dadosCommit.files) ? dadosCommit.files : [];

            for (const f of files) {
              if (f.status === "removed" && f.filename.endsWith(".md")) {
                itensEncontrados.push({
                  sha: c.sha,
                  caminho: f.filename,
                  mensagem: c.commit.message,
                  data: c.commit.author.date,
                });
              }
            }
          } catch {
            // Ignora falhas pontuais de commit
          }
        }

        if (!cancelado) setDeletados(itensEncontrados);
      })
      .catch((e) => !cancelado && setErro("Erro ao buscar histórico da lixeira: " + String(e)))
      .finally(() => !cancelado && setCarregando(false));

    return () => {
      cancelado = true;
    };
  }, [aberto, cfg.repoOwner, cfg.repoName, cfg.githubToken]);

  const restaurarArquivo = async (item: CommitDeletado) => {
    setRestaurando(item.caminho);
    setErro("");
    setSucesso("");
    try {
      // Busca o conteúdo do arquivo no commit anterior (parent commit)
      const resParent = await fetch(
        `https://api.github.com/repos/${cfg.repoOwner}/${cfg.repoName}/contents/${encodeURIComponent(item.caminho)}?ref=${item.sha}~1`,
        {
          headers: {
            Authorization: `Bearer ${cfg.githubToken.trim()}`,
            Accept: "application/vnd.github.raw",
          },
        }
      );

      if (!resParent.ok) {
        throw new Error("Não foi possível recuperar o conteúdo anterior do arquivo.");
      }

      const conteudoOriginal = await resParent.text();
      await salvarTexto(item.caminho, conteudoOriginal, undefined, `restaurar lixeira: ${item.caminho}`);

      setSucesso(`Arquivo "${item.caminho}" restaurado com sucesso!`);
      setDeletados((prev) => prev.filter((d) => d.caminho !== item.caminho));
    } catch (e) {
      setErro("Falha ao restaurar arquivo: " + String(e));
    } finally {
      setRestaurando(null);
    }
  };

  return (
    <Modal aberto={aberto} aoFechar={aoFechar} titulo="🗑️ Lixeira e Histórico Git de Deletados">
      <div className="space-y-4">
        {sucesso && <Aviso tom="sucesso">{sucesso}</Aviso>}
        {erro && <Aviso tom="erro">{erro}</Aviso>}

        {carregando ? (
          <Carregando texto="Buscando histórico de exclusões no Git..." />
        ) : deletados.length === 0 ? (
          <div className="p-6 text-center text-muted-foreground space-y-2">
            <History size={24} className="mx-auto text-muted-foreground/60" />
            <p className="text-sm font-medium">Nenhum arquivo excluído recentemente encontrado no Git.</p>
          </div>
        ) : (
          <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
            {deletados.map((item) => (
              <div
                key={`${item.sha}-${item.caminho}`}
                className="flex items-center justify-between p-3 rounded-xl border border-border bg-card text-xs hover:bg-accent/50 transition-colors"
              >
                <div className="space-y-0.5 min-w-0 pr-2">
                  <p className="font-semibold text-foreground truncate flex items-center gap-1.5">
                    <FileText size={14} className="text-rose-500 shrink-0" />
                    <span>{item.caminho}</span>
                  </p>
                  <p className="text-[11px] text-muted-foreground truncate">
                    Excluído em: {new Date(item.data).toLocaleDateString("pt-BR")} — "{item.mensagem}"
                  </p>
                </div>

                <Botao
                  variante="primario"
                  tamanho="pequeno"
                  onClick={() => restaurarArquivo(item)}
                  disabled={restaurando === item.caminho}
                >
                  <RotateCcw size={13} />
                  {restaurando === item.caminho ? "Restaurando..." : "Restaurar"}
                </Botao>
              </div>
            ))}
          </div>
        )}
      </div>
    </Modal>
  );
}
