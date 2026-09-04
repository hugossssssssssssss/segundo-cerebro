import { useState, useMemo } from "react";
import {
  Tag,
  FileText,
  ListTodo,
  Target,
  Users,
  Image as ImageIcon,
  Layout,
  ExternalLink,
  Calendar,
  Building,
  Briefcase,
  Search,
  Filter,
} from "lucide-react";
import { type ItemRepo, ehArquivoInternoOuSistema } from "@/lib/repo";
import { tituloProvavel } from "@/lib/markdown";
import { Modal, Botao, Selo, Vazio } from "@/components/ui";
import { TagChip } from "@/components/TagChip";
import { CORES_TIPOS_GRAFO, type TipoNoGrafo } from "@/lib/grafo";
import { formatarDataPtBR, cn } from "@/lib/utils";

export interface ItemVinculadoHashtag {
  caminho: string;
  sha: string;
  titulo: string;
  tipo: TipoNoGrafo;
  tipoRotulo: string;
  tags: string[];
  status?: string;
  prazo?: string;
  prioridade?: string;
  empresa?: string;
  cargo?: string;
  corpo?: string;
}

export function obterItensPorHashtag(
  acervo: ItemRepo[],
  tagAlvo: string
): ItemVinculadoHashtag[] {
  if (!tagAlvo || !acervo || acervo.length === 0) return [];

  const tagLimpa = tagAlvo.trim().replace(/^#+/, "").toLowerCase();
  if (!tagLimpa) return [];

  const tagVariantes = new Set([
    tagLimpa,
    tagLimpa.replace(/-/g, " "),
    tagLimpa.replace(/\s+/g, "-"),
    tagLimpa.replace(/_/g, " "),
    tagLimpa.replace(/\s+/g, "_"),
  ]);

  const resultados: ItemVinculadoHashtag[] = [];

  for (const item of acervo) {
    if (
      ehArquivoInternoOuSistema(item.caminho) ||
      item.caminho.startsWith(".lixeira/") ||
      item.caminho.startsWith(".klaus/") ||
      item.caminho.includes("/.klaus/") ||
      item.caminho.includes("templates/") ||
      item.caminho.startsWith("jogos/") ||
      item.caminho.includes("/jogos/") ||
      item.caminho.startsWith("referencias/imagens/")
    ) {
      continue;
    }

    const dados = item.doc?.dados || {};
    const corpo = item.doc?.corpo || "";
    const texto = `${item.texto || ""}\n${corpo}`;

    // 1. Extrai tags do frontmatter
    let tagsDoItem: string[] = [];
    if (Array.isArray(dados.tags)) {
      tagsDoItem = dados.tags.map((t: any) => String(t).trim()).filter(Boolean);
    } else if (typeof dados.tags === "string" && dados.tags.trim()) {
      tagsDoItem = dados.tags.split(",").map((t: string) => t.trim()).filter(Boolean);
    }

    // 2. Extrai hashtags adicionais do corpo markdown (#tag)
    const matchesHashtag = texto.matchAll(/#([a-zA-Z0-9_\u00C0-\u00FF-]+)/g);
    for (const m of matchesHashtag) {
      const h = m[1]?.trim();
      if (h && !tagsDoItem.includes(h)) {
        tagsDoItem.push(h);
      }
    }

    // Verifica se alguma tag coincide com a hashtag buscada
    const possuiTag = tagsDoItem.some((t) => {
      const tNorm = t.replace(/^#+/, "").toLowerCase().trim();
      return (
        tagVariantes.has(tNorm) ||
        tNorm === tagLimpa ||
        tNorm.replace(/-/g, " ") === tagLimpa.replace(/-/g, " ")
      );
    });

    if (!possuiTag) continue;

    // Determina o tipo de documento
    let tipo: TipoNoGrafo = "nota";
    let tipoRotulo = "Nota";

    if (item.caminho.startsWith("tarefas/") || dados.tipo === "tarefa") {
      tipo = "tarefa";
      tipoRotulo = "Tarefa";
    } else if (item.caminho.startsWith("pdi/metas/") || dados.tipo === "meta") {
      tipo = "meta";
      tipoRotulo = "PDI Meta";
    } else if (item.caminho.startsWith("pdi/entregas/") || dados.tipo === "entrega") {
      tipo = "entrega";
      tipoRotulo = "PDI Entrega";
    } else if (item.caminho.startsWith("contatos/") || dados.tipo === "contato") {
      tipo = "contato";
      tipoRotulo = "Contato";
    } else if (item.caminho.startsWith("referencias/") || dados.tipo === "referencia") {
      tipo = "referencia";
      tipoRotulo = "Referência";
    } else if (item.caminho.startsWith("lousas/") || dados.tipo === "lousa") {
      tipo = "lousa";
      tipoRotulo = "Lousa Visual";
    }

    const titulo = String(dados.titulo || tituloProvavel(item.doc, item.nome)).trim();
    if (!titulo || titulo === "{" || titulo === "null" || titulo === "undefined") {
      continue;
    }

    resultados.push({
      caminho: item.caminho,
      sha: item.sha,
      titulo,
      tipo,
      tipoRotulo,
      tags: tagsDoItem,
      status: dados.status ? String(dados.status) : undefined,
      prazo: dados.prazo ? String(dados.prazo) : dados.data ? String(dados.data) : undefined,
      prioridade: dados.prioridade ? String(dados.prioridade) : undefined,
      empresa: dados.empresa ? String(dados.empresa) : undefined,
      cargo: dados.cargo ? String(dados.cargo) : undefined,
      corpo: corpo.slice(0, 180),
    });
  }

  // Ordena por tipo e depois por título
  return resultados.sort((a, b) => {
    if (a.tipo !== b.tipo) return a.tipo.localeCompare(b.tipo);
    return a.titulo.localeCompare(b.titulo);
  });
}

function obterIconeTipo(tipo: TipoNoGrafo) {
  switch (tipo) {
    case "tarefa":
      return <ListTodo size={15} />;
    case "meta":
    case "entrega":
      return <Target size={15} />;
    case "contato":
      return <Users size={15} />;
    case "referencia":
      return <ImageIcon size={15} />;
    case "lousa":
      return <Layout size={15} />;
    default:
      return <FileText size={15} />;
  }
}

interface ModalItensHashtagProps {
  tag: string | null;
  aberto: boolean;
  acervo: ItemRepo[];
  aoFechar: () => void;
  aoAbrirItem: (caminho: string) => void;
  aoFiltrarNoGrafo?: (tag: string) => void;
}

export function ModalItensHashtag({
  tag,
  aberto,
  acervo,
  aoFechar,
  aoAbrirItem,
  aoFiltrarNoGrafo,
}: ModalItensHashtagProps) {
  const [abaTipo, setAbaTipo] = useState<string>("todas");
  const [buscaInterna, setBuscaInterna] = useState("");

  const tagLimpa = tag ? tag.trim().replace(/^#+/, "") : "";

  const itens = useMemo(() => {
    if (!tag) return [];
    return obterItensPorHashtag(acervo, tag);
  }, [acervo, tag]);

  // Contagem por tipo
  const contagens = useMemo(() => {
    const counts: Record<string, number> = { todas: itens.length };
    for (const item of itens) {
      counts[item.tipo] = (counts[item.tipo] || 0) + 1;
    }
    return counts;
  }, [itens]);

  // Itens filtrados pela aba e pela busca interna
  const itensFiltrados = useMemo(() => {
    return itens.filter((item) => {
      if (abaTipo !== "todas" && item.tipo !== abaTipo) {
        return false;
      }
      if (buscaInterna.trim()) {
        const termo = buscaInterna.toLowerCase().trim();
        const coincideTitulo = item.titulo.toLowerCase().includes(termo);
        const coincideCaminho = item.caminho.toLowerCase().includes(termo);
        const coincideCorpo = item.corpo?.toLowerCase().includes(termo);
        return coincideTitulo || coincideCaminho || coincideCorpo;
      }
      return true;
    });
  }, [itens, abaTipo, buscaInterna]);

  if (!aberto || !tag) return null;

  const abasDisponiveis = [
    { id: "todas", rotulo: "Tudo", total: contagens.todas || 0 },
    { id: "nota", rotulo: "Notas", total: contagens.nota || 0 },
    { id: "tarefa", rotulo: "Tarefas", total: contagens.tarefa || 0 },
    { id: "contato", rotulo: "Contatos", total: contagens.contato || 0 },
    { id: "meta", rotulo: "Metas", total: contagens.meta || 0 },
    { id: "entrega", rotulo: "Entregas", total: contagens.entrega || 0 },
    { id: "referencia", rotulo: "Referências", total: contagens.referencia || 0 },
    { id: "lousa", rotulo: "Lousas", total: contagens.lousa || 0 },
  ].filter((a) => a.id === "todas" || a.total > 0);

  return (
    <Modal
      aberto={aberto}
      aoFechar={aoFechar}
      tamanho="largo"
      titulo={
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10 text-primary border border-primary/20">
            <Tag size={16} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-base text-foreground">#{tagLimpa}</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-secondary text-muted-foreground font-medium">
                {itens.length} {itens.length === 1 ? "documento" : "documentos"}
              </span>
            </div>
          </div>
        </div>
      }
      rodape={
        <div className="flex items-center justify-between w-full gap-2">
          {aoFiltrarNoGrafo ? (
            <Botao
              variante="neutro"
              tamanho="pequeno"
              onClick={() => {
                aoFiltrarNoGrafo(tagLimpa);
                aoFechar();
              }}
              className="text-xs flex items-center gap-1.5"
            >
              <Filter size={13} /> Focar #{tagLimpa} no Grafo
            </Botao>
          ) : (
            <div />
          )}

          <Botao variante="primario" tamanho="pequeno" onClick={aoFechar}>
            Fechar
          </Botao>
        </div>
      }
    >
      <div className="space-y-4 text-xs">
        {/* Barra de Filtros e Busca Rápida */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 pb-1">
          {/* Tabs por Tipo de Documento */}
          <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
            {abasDisponiveis.map((aba) => (
              <button
                key={aba.id}
                onClick={() => setAbaTipo(aba.id)}
                className={cn(
                  "px-2.5 py-1 rounded-lg text-xs font-medium transition-all shrink-0 flex items-center gap-1.5 cursor-pointer border",
                  abaTipo === aba.id
                    ? "bg-primary text-primary-foreground border-primary font-semibold shadow-xs"
                    : "bg-secondary/60 text-muted-foreground border-border/60 hover:bg-accent hover:text-foreground"
                )}
              >
                <span>{aba.rotulo}</span>
                <span
                  className={cn(
                    "text-[10px] px-1.5 py-0.2 rounded-full",
                    abaTipo === aba.id ? "bg-primary-foreground/20 text-primary-foreground" : "bg-background/80 text-muted-foreground"
                  )}
                >
                  {aba.total}
                </span>
              </button>
            ))}
          </div>

          {/* Campo de Busca Interna */}
          {itens.length > 3 && (
            <div className="flex items-center gap-2 bg-secondary/50 px-2.5 py-1.5 rounded-xl border border-border/70 max-w-xs w-full sm:w-56">
              <Search size={13} className="text-muted-foreground shrink-0" />
              <input
                type="text"
                value={buscaInterna}
                onChange={(e) => setBuscaInterna(e.target.value)}
                placeholder="Filtrar nesta tag..."
                className="w-full bg-transparent border-0 outline-none text-xs text-foreground placeholder:text-muted-foreground focus:ring-0 p-0"
              />
            </div>
          )}
        </div>

        {/* Lista de Documentos Vinculados */}
        {itensFiltrados.length === 0 ? (
          <div className="py-8">
            <Vazio
              icone={<Tag size={32} className="text-muted-foreground/60" />}
              titulo="Nenhum documento encontrado"
              descricao={`Nenhum arquivo encontrado para o filtro selecionado na tag #${tagLimpa}.`}
            />
          </div>
        ) : (
          <div className="grid gap-2.5 max-h-[60vh] overflow-y-auto pr-1">
            {itensFiltrados.map((item) => {
              const corTipo = CORES_TIPOS_GRAFO[item.tipo] || "#89b4fa";

              return (
                <div
                  key={item.caminho}
                  onClick={() => {
                    aoAbrirItem(item.caminho);
                    aoFechar();
                  }}
                  className="group p-3 rounded-xl bg-card border border-border/80 hover:border-primary/50 hover:bg-accent/40 transition-all cursor-pointer shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="flex items-start gap-3 min-w-0 flex-1">
                    {/* Ícone com Cor Temática do Grafo */}
                    <div
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg shadow-2xs transition-transform group-hover:scale-105"
                      style={{
                        backgroundColor: `${corTipo}22`,
                        color: corTipo,
                        borderColor: `${corTipo}44`,
                        borderWidth: 1,
                      }}
                    >
                      {obterIconeTipo(item.tipo)}
                    </div>

                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="font-semibold text-sm text-foreground group-hover:text-primary transition-colors truncate">
                          {item.titulo}
                        </h4>
                        <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-secondary/80 text-muted-foreground border border-border/50">
                          {item.tipoRotulo}
                        </span>
                      </div>

                      {/* Metadados contextuais */}
                      <div className="flex items-center gap-2 text-[11px] text-muted-foreground flex-wrap">
                        <span className="truncate opacity-80">{item.caminho}</span>

                        {item.status && (
                          <span className="flex items-center gap-1">
                            • <Selo tom="primario">{item.status}</Selo>
                          </span>
                        )}

                        {item.prioridade && (
                          <span className="flex items-center gap-1">
                            • <Selo tom="aviso">{item.prioridade}</Selo>
                          </span>
                        )}

                        {item.prazo && (
                          <span className="flex items-center gap-1">
                            • <Calendar size={11} className="opacity-70" /> {formatarDataPtBR(item.prazo)}
                          </span>
                        )}

                        {item.empresa && (
                          <span className="flex items-center gap-1">
                            • <Building size={11} className="opacity-70" /> {item.empresa}
                          </span>
                        )}

                        {item.cargo && (
                          <span className="flex items-center gap-1">
                            • <Briefcase size={11} className="opacity-70" /> {item.cargo}
                          </span>
                        )}
                      </div>

                      {/* Tags associadas */}
                      {item.tags.length > 0 && (
                        <div className="flex items-center gap-1 flex-wrap pt-1">
                          {item.tags.slice(0, 5).map((t) => (
                            <TagChip
                              key={t}
                              tag={t}
                              ativa={t.replace(/^#+/, "").toLowerCase() === tagLimpa.toLowerCase()}
                              className="text-[10px] py-0.5 px-1.5"
                            />
                          ))}
                          {item.tags.length > 5 && (
                            <span className="text-[10px] text-muted-foreground font-medium">
                              +{item.tags.length - 5}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Botão de Ação Rápida */}
                  <div className="flex items-center gap-1.5 self-end sm:self-center shrink-0">
                    <span className="text-xs text-primary font-medium opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                      Abrir <ExternalLink size={12} />
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </Modal>
  );
}
