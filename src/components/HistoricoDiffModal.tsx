import { useEffect, useState } from "react";
import ReactDiffViewer from "@alexbruf/react-diff-viewer";
import { Modal, Botao, Carregando } from "@/components/ui";
import { lerConfig } from "@/lib/settings";
import { lerOuVazio } from "@/lib/github";
import { lerMarkdown } from "@/lib/markdown";
import { cn } from "@/lib/utils";
import { Calendar, Tag, ListTodo, Link as LinkIcon, Clock, FileText, Code } from "lucide-react";

type CommitItem = {
  sha: string;
  commit: {
    message: string;
    author: { date: string; name: string };
  };
};

const CORES_NOTION: Record<string, string> = {
  cinza: "bg-stone-500/15 text-stone-700 dark:text-stone-300 border-stone-500/20",
  azul: "bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/20",
  verde: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/20",
  amarelo: "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/20",
  vermelho: "bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/20",
  roxo: "bg-purple-500/15 text-purple-700 dark:text-purple-300 border-purple-500/20",
  rosa: "bg-pink-500/15 text-pink-700 dark:text-pink-300 border-pink-500/20",
  laranja: "bg-orange-500/15 text-orange-700 dark:text-orange-300 border-orange-500/20",
};

const STATUS_MAP: Record<string, { label: string; cor: string }> = {
  "a-fazer": { label: "A fazer", cor: "cinza" },
  "fazendo": { label: "Fazendo", cor: "azul" },
  "feito": { label: "Feito", cor: "verde" },
};

function normalizarStatus(val: string): string {
  if (val === "a_fazer") return "a-fazer";
  if (val === "em_andamento") return "fazendo";
  if (val === "concluida") return "feito";
  if (val === "pausada") return "a-fazer";
  if (val === "cancelada") return "a-fazer";
  return val || "a-fazer";
}

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
  conteudoAtual?: string;
  aoRestaurar?: (textoHistorico: string) => void;
}) {
  const [commits, setCommits] = useState<CommitItem[]>([]);
  const [carregando, setCarregando] = useState(false);
  const [commitSelecionado, setCommitSelecionado] = useState<string | null>(null);
  const [conteudoAntigo, setConteudoAntigo] = useState<string>("");
  const [conteudoSalvo, setConteudoSalvo] = useState<string>("");
  const [carregandoDiff, setCarregandoDiff] = useState(false);
  const [erro, setErro] = useState("");
  const [modoVisualizacao, setModoVisualizacao] = useState<"leitura" | "diff">("leitura");

  const cfg = lerConfig();

  useEffect(() => {
    if (!aberto || !caminho || !cfg.githubToken) return;
    setCarregando(true);
    setErro("");
    setCommits([]);
    setCommitSelecionado(null);
    setConteudoAntigo("");

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

  useEffect(() => {
    if (!commitSelecionado || !caminho) return;
    setCarregandoDiff(true);

    lerOuVazio(cfg, caminho, commitSelecionado)
      .then((txt: string) => setConteudoAntigo(txt))
      .catch(() => setConteudoAntigo(""))
      .finally(() => setCarregandoDiff(false));
  }, [commitSelecionado, caminho, cfg.repoOwner, cfg.repoName, cfg.githubToken]);

  useEffect(() => {
    if (!aberto || !caminho || conteudoAtual !== undefined) return;
    lerOuVazio(cfg, caminho)
      .then((txt: string) => setConteudoSalvo(txt))
      .catch(() => setConteudoSalvo(""));
  }, [aberto, caminho, conteudoAtual, cfg.repoOwner, cfg.repoName, cfg.githubToken]);

  const textoAtual = conteudoAtual ?? conteudoSalvo;
  const ehModoEscuro = document.documentElement.classList.contains("dark");

  // Parse do conteúdo antigo para visualização formatada
  const parsedAntigo = conteudoAntigo ? lerMarkdown(conteudoAntigo) : { dados: {} as Record<string, any>, corpo: "" };
  const dadosAntigos = parsedAntigo.dados;
  const corpoAntigo = parsedAntigo.corpo;

  // Filtragem e mapeamento de chaves do frontmatter para exibição limpa
  const chavesExcluidas = ["titulo", "tipo", "atualizado", "criado", "autor", "criado_em", "criado_por", "ultima_edicao", "id", "esquema", "_visibilidade", "_coresTags", "_rotulos", "subtipo", "fixado", "demo", "ia_sugeriu"];
  const chavesExtras = Object.keys(dadosAntigos).filter(
    (k) =>
      !chavesExcluidas.includes(k) &&
      k !== "status" &&
      k !== "prazo" &&
      k !== "tags" &&
      k !== "relacionamentos" &&
      k !== "relacao"
  );

  // Mapeamento de tags
  const tagsArray = Array.isArray(dadosAntigos.tags)
    ? dadosAntigos.tags
    : typeof dadosAntigos.tags === "string"
    ? dadosAntigos.tags.split(",").map((t: string) => t.trim()).filter(Boolean)
    : [];

  // Mapeamento de relacionamentos
  const relacaoArray = Array.isArray(dadosAntigos.relacionamentos)
    ? dadosAntigos.relacionamentos
    : Array.isArray(dadosAntigos.relacao)
    ? dadosAntigos.relacao
    : [];

  return (
    <Modal
      aberto={aberto}
      aoFechar={aoFechar}
      titulo="Histórico de Versões"
      rodape={
        <div className="flex justify-between w-full">
          {aoRestaurar && conteudoAntigo && (
            <Botao
              variante="primario"
              onClick={() => {
                aoRestaurar(conteudoAntigo);
                aoFechar();
              }}
            >
              Restaurar esta versão
            </Botao>
          )}
          <Botao variante="neutro" onClick={aoFechar}>
            Fechar
          </Botao>
        </div>
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
                Selecione uma versão anterior para visualizar:
              </label>
              <select
                value={commitSelecionado || ""}
                onChange={(e) => setCommitSelecionado(e.target.value)}
                className="w-full rounded-lg border border-border bg-background p-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              >
                {commits.map((c) => (
                  <option key={c.sha} value={c.sha}>
                    {new Date(c.commit.author.date).toLocaleString("pt-BR")} — {c.commit.message} ({c.sha.slice(0, 7)})
                  </option>
                ))}
              </select>
            </div>

            {/* Alternador de Modo de Visualização */}
            <div className="flex border-b border-border/80 overflow-x-auto">
              <button
                onClick={() => setModoVisualizacao("leitura")}
                className={cn(
                  "flex items-center gap-1.5 px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium border-b-2 transition-all duration-150 focus:outline-none whitespace-nowrap cursor-pointer",
                  modoVisualizacao === "leitura"
                    ? "border-primary text-primary font-semibold"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                )}
              >
                <FileText size={14} className="shrink-0" />
                <span>Visualização Limpa</span>
              </button>
              <button
                onClick={() => setModoVisualizacao("diff")}
                className={cn(
                  "flex items-center gap-1.5 px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium border-b-2 transition-all duration-150 focus:outline-none whitespace-nowrap cursor-pointer",
                  modoVisualizacao === "diff"
                    ? "border-primary text-primary font-semibold"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                )}
              >
                <Code size={14} className="shrink-0" />
                <span>Comparação (Diff)</span>
              </button>
            </div>

            {carregandoDiff ? (
              <Carregando texto="Processando versão selecionada…" />
            ) : (
              <div className="space-y-4">
                {modoVisualizacao === "leitura" ? (
                  /* ABA 1: VISUALIZAÇÃO LIMPA E FORMATADA */
                  <div className="space-y-4">
                    {/* Cabeçalho do Documento */}
                    <div className="pb-3 border-b border-border/60">
                      <h2 className="text-xl font-bold text-foreground">
                        {dadosAntigos.titulo || "Sem título"}
                      </h2>
                    </div>

                    {/* Grade de Propriedades do Notion */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 bg-muted/20 dark:bg-muted/5 rounded-xl border border-border/60 text-sm">
                      {/* Tipo */}
                      {dadosAntigos.tipo && (
                        <div className="space-y-1">
                          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">Tipo</span>
                          <span className="text-foreground capitalize">{dadosAntigos.tipo}</span>
                        </div>
                      )}

                      {/* Status */}
                      {dadosAntigos.status !== undefined && (
                        <div className="space-y-1">
                          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">Status</span>
                          {(() => {
                            const statusNormalizado = normalizarStatus(String(dadosAntigos.status));
                            const conf = STATUS_MAP[statusNormalizado] || { label: String(dadosAntigos.status), cor: "cinza" };
                            return (
                              <span className={cn(
                                "inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium border",
                                CORES_NOTION[conf.cor]
                              )}>
                                <ListTodo size={12} />
                                {conf.label}
                              </span>
                            );
                          })()}
                        </div>
                      )}

                      {/* Prazo */}
                      {dadosAntigos.prazo && (
                        <div className="space-y-1">
                          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">Prazo</span>
                          <span className="inline-flex items-center gap-1 text-foreground">
                            <Calendar size={13} className="text-muted-foreground" />
                            {typeof dadosAntigos.prazo === "string"
                              ? new Date(dadosAntigos.prazo + "T12:00:00").toLocaleDateString("pt-BR", {
                                  day: "numeric",
                                  month: "short",
                                  year: "numeric"
                                })
                              : String(dadosAntigos.prazo)}
                          </span>
                        </div>
                      )}

                      {/* Tags */}
                      {tagsArray.length > 0 && (
                        <div className="space-y-1 col-span-1 sm:col-span-2">
                          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">Tags</span>
                          <div className="flex flex-wrap gap-1.5 mt-1">
                            {tagsArray.map((tag: string, i: number) => (
                              <span
                                key={i}
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium border bg-stone-500/10 text-stone-700 dark:text-stone-300 border-stone-500/20"
                              >
                                <Tag size={10} />
                                {tag}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Relacionamentos */}
                      {relacaoArray.length > 0 && (
                        <div className="space-y-1 col-span-1 sm:col-span-2">
                          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">Relacionamentos</span>
                          <div className="flex flex-wrap gap-1.5 mt-1">
                            {relacaoArray.map((rel: string, i: number) => (
                              <span
                                key={i}
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs border bg-primary/10 text-primary border-primary/20"
                              >
                                <LinkIcon size={10} />
                                {rel}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Outras propriedades dinâmicas adicionais */}
                      {chavesExtras.map((chave) => (
                        <div key={chave} className="space-y-1">
                          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block capitalize">
                            {chave.replace(/_/g, " ")}
                          </span>
                          <span className="text-foreground">{String(dadosAntigos[chave])}</span>
                        </div>
                      ))}

                      {/* Metadados de Auditoria */}
                      {(dadosAntigos.criado || dadosAntigos.criado_em) && (
                        <div className="space-y-1">
                          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">Criado em</span>
                          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                            <Clock size={12} />
                            {(() => {
                              const d = String(dadosAntigos.criado || dadosAntigos.criado_em);
                              return d.includes("T") ? new Date(d).toLocaleString("pt-BR") : d;
                            })()}
                          </span>
                        </div>
                      )}

                      {(dadosAntigos.atualizado || dadosAntigos.ultima_edicao) && (
                        <div className="space-y-1">
                          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">Modificado em</span>
                          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                            <Clock size={12} />
                            {(() => {
                              const d = String(dadosAntigos.atualizado || dadosAntigos.ultima_edicao);
                              return d.includes("T") ? new Date(d).toLocaleString("pt-BR") : d;
                            })()}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Divisória e Conteúdo */}
                    <div className="space-y-2">
                      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">Corpo do Texto</span>
                      <div className="rounded-xl border border-border bg-card dark:bg-card/40 p-4 max-h-[350px] overflow-y-auto font-sans leading-relaxed text-foreground/90 text-sm whitespace-pre-wrap">
                        {corpoAntigo.trim() ? (
                          corpoAntigo.trim()
                        ) : (
                          <span className="text-muted-foreground italic">Esta versão não possui corpo de texto.</span>
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  /* ABA 2: COMPARAÇÃO TÉCNICA (DIFF BRUTO) */
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
