import { type ItemRepo } from "./repo";
import { type Alvo } from "./links";
import { tituloProvavel } from "./markdown";
import { prepararSnippetPreview } from "./markdownInline";
import { type DefinicaoPropriedade, type RegraFiltro, filtrarItensPorRegras } from "@/components/BarraFiltrosAvancados";

export type CategoriaDocumento =
  | "notas"
  | "tarefas"
  | "pdi"
  | "contatos"
  | "referencias"
  | "lousas";

export interface DocumentoVinculavel {
  caminho: string;
  titulo: string;
  categoria: CategoriaDocumento;
  categoriaRotulo: string;
  subpastaOuStatus: string;
  subpastaOuStatusRotulo: string;
  tags: string[];
  data?: string;
  subtexto?: string;
  snippet?: string;
  corpo?: string;
}

export interface PastaNavegacao {
  id: string;
  titulo: string;
  categoria: CategoriaDocumento;
  total: number;
  subpastas?: {
    id: string;
    titulo: string;
    valorFiltro: string;
    total: number;
  }[];
}

export const DEFINICOES_FILTRO_DOCUMENTOS: DefinicaoPropriedade[] = [
  {
    id: "categoria",
    rotulo: "Localização",
    tipo: "status",
    opcoes: ["tarefas", "notas", "pdi", "contatos", "referencias", "lousas"],
  },
  {
    id: "status",
    rotulo: "Status",
    tipo: "status",
    opcoes: ["a_fazer", "fazendo", "concluida", "metas_ativas", "metas_concluidas", "entregas"],
  },
  {
    id: "tags",
    rotulo: "Tags",
    tipo: "tags",
  },
  {
    id: "data",
    rotulo: "Data",
    tipo: "data",
  },
];

/**
 * Normaliza e categoriza um conjunto de itens do repositório em documentos vinculáveis
 */
export function indexarDocumentosVinculaveis(itens: ItemRepo[] = []): DocumentoVinculavel[] {
  const lista: DocumentoVinculavel[] = [];

  for (const item of itens) {
    if (!item || !item.caminho) continue;
    const caminho = item.caminho;
    if (caminho.startsWith(".github/") || caminho.startsWith("caixa-entrada/")) continue;

    const doc = item.doc || { dados: {}, corpo: "" };
    const dados = (doc.dados || {}) as Record<string, any>;
    const titulo = String(dados.titulo || tituloProvavel(doc, item.nome) || item.nome.replace(/\.md$/, ""));
    const dataDoc = (dados.data as string) || (dados.prazo as string) || (dados.criado_em as string) || undefined;
    const snippetFormatado = doc.corpo ? prepararSnippetPreview(doc.corpo, 120) : undefined;

    if (caminho.startsWith("tarefas/")) {
      const statusRaw = String(dados.status || "a_fazer").toLowerCase();
      let statusKey = "a_fazer";
      let statusRotulo = "A Fazer";

      if (statusRaw === "fazendo" || statusRaw === "em_andamento" || statusRaw === "em andamento") {
        statusKey = "fazendo";
        statusRotulo = "Em Andamento";
      } else if (statusRaw === "concluida" || statusRaw === "concluída" || statusRaw === "feito") {
        statusKey = "concluida";
        statusRotulo = "Concluída";
      }

      lista.push({
        caminho,
        titulo,
        categoria: "tarefas",
        categoriaRotulo: "Tarefa",
        subpastaOuStatus: statusKey,
        subpastaOuStatusRotulo: statusRotulo,
        tags: Array.isArray(dados.tags) ? (dados.tags as string[]) : [],
        data: dataDoc,
        subtexto: `Tarefa • ${statusRotulo}`,
        snippet: snippetFormatado,
        corpo: doc.corpo,
      });
    } else if (caminho.startsWith("notas/")) {
      const partes = caminho.split("/");
      let pasta = typeof dados.pasta === "string" ? dados.pasta : (partes.length > 2 ? partes[1] : "Geral");
      if (!pasta) pasta = "Geral";

      lista.push({
        caminho,
        titulo,
        categoria: "notas",
        categoriaRotulo: "Nota",
        subpastaOuStatus: String(pasta),
        subpastaOuStatusRotulo: String(pasta),
        tags: Array.isArray(dados.tags) ? (dados.tags as string[]) : [],
        data: dataDoc,
        subtexto: `Nota • ${pasta}`,
        snippet: snippetFormatado,
        corpo: doc.corpo,
      });
    } else if (caminho.startsWith("pdi/")) {
      const ehMeta = caminho.startsWith("pdi/metas/");
      const statusRaw = String(dados.status || "ativa").toLowerCase();
      let statusKey = ehMeta ? (statusRaw === "concluida" ? "metas_concluidas" : "metas_ativas") : "entregas";
      let statusRotulo = ehMeta ? (statusRaw === "concluida" ? "Metas Concluídas" : "Metas Ativas") : "Entregas";

      lista.push({
        caminho,
        titulo,
        categoria: "pdi",
        categoriaRotulo: ehMeta ? "Meta PDI" : "Entrega PDI",
        subpastaOuStatus: String(statusKey),
        subpastaOuStatusRotulo: String(statusRotulo),
        tags: Array.isArray(dados.tags) ? (dados.tags as string[]) : [],
        data: dataDoc,
        subtexto: `PDI • ${statusRotulo}`,
        snippet: snippetFormatado,
        corpo: doc.corpo,
      });
    } else if (caminho.startsWith("contatos/")) {
      const cargo = typeof dados.cargo === "string" ? dados.cargo : typeof dados.empresa === "string" ? dados.empresa : "Contato";
      lista.push({
        caminho,
        titulo,
        categoria: "contatos",
        categoriaRotulo: "Contato",
        subpastaOuStatus: "todos",
        subpastaOuStatusRotulo: "Contatos",
        tags: Array.isArray(dados.tags) ? (dados.tags as string[]) : [],
        data: dataDoc,
        subtexto: `Contato • ${cargo}`,
        snippet: snippetFormatado,
        corpo: doc.corpo,
      });
    } else if (caminho.startsWith("referencias/")) {
      const partes = caminho.split("/");
      let pasta = typeof dados.pasta === "string" ? dados.pasta : (partes.length > 2 ? partes[1] : "Geral");
      lista.push({
        caminho,
        titulo,
        categoria: "referencias",
        categoriaRotulo: "Referência Visual",
        subpastaOuStatus: String(pasta),
        subpastaOuStatusRotulo: String(pasta),
        tags: Array.isArray(dados.tags) ? (dados.tags as string[]) : [],
        data: dataDoc,
        subtexto: `Referência • ${pasta}`,
        snippet: snippetFormatado,
        corpo: doc.corpo,
      });
    } else if (caminho.startsWith("lousas/") || caminho.endsWith(".excalidraw")) {
      lista.push({
        caminho,
        titulo,
        categoria: "lousas",
        categoriaRotulo: "Mapa Mental / Lousa",
        subpastaOuStatus: "todos",
        subpastaOuStatusRotulo: "Lousas",
        tags: Array.isArray(dados.tags) ? (dados.tags as string[]) : [],
        data: dataDoc,
        subtexto: "Lousa Visual",
        corpo: doc.corpo,
      });
    }
  }

  return lista;
}

/**
 * Converte lista de Alvos (caso não haja lista completa de itens com corpo) em documentos vinculáveis
 */
export function alvosParaDocumentosVinculaveis(alvos: Alvo[] = []): DocumentoVinculavel[] {
  return alvos.map((alvo) => {
    const caminho = alvo.caminho;
    let categoria: CategoriaDocumento = "notas";
    let categoriaRotulo = "Nota";
    let subpastaOuStatus = "geral";
    let subpastaOuStatusRotulo = "Geral";

    if (caminho.startsWith("tarefas/")) {
      categoria = "tarefas";
      categoriaRotulo = "Tarefa";
      subpastaOuStatus = "a_fazer";
      subpastaOuStatusRotulo = "Tarefas";
    } else if (caminho.startsWith("pdi/")) {
      categoria = "pdi";
      categoriaRotulo = "Meta / Entrega";
      subpastaOuStatus = "metas_ativas";
      subpastaOuStatusRotulo = "PDI";
    } else if (caminho.startsWith("contatos/")) {
      categoria = "contatos";
      categoriaRotulo = "Contato";
      subpastaOuStatus = "todos";
      subpastaOuStatusRotulo = "Contatos";
    } else if (caminho.startsWith("referencias/")) {
      categoria = "referencias";
      categoriaRotulo = "Referência";
      subpastaOuStatus = "geral";
      subpastaOuStatusRotulo = "Referências";
    } else if (caminho.startsWith("lousas/")) {
      categoria = "lousas";
      categoriaRotulo = "Lousa";
      subpastaOuStatus = "todos";
      subpastaOuStatusRotulo = "Lousas";
    }

    return {
      caminho,
      titulo: alvo.titulo,
      categoria,
      categoriaRotulo,
      subpastaOuStatus,
      subpastaOuStatusRotulo,
      tags: [],
      subtexto: categoriaRotulo,
    };
  });
}

/**
 * Monta a estrutura de pastas e subpastas para navegação hierárquica
 */
export function montarEstruturaPastas(documentos: DocumentoVinculavel[]): PastaNavegacao[] {
  const contagens: Record<CategoriaDocumento, number> = {
    notas: 0,
    tarefas: 0,
    pdi: 0,
    contatos: 0,
    referencias: 0,
    lousas: 0,
  };

  const subpastasPorCategoria: Record<CategoriaDocumento, Map<string, { titulo: string; total: number }>> = {
    notas: new Map(),
    tarefas: new Map(),
    pdi: new Map(),
    contatos: new Map(),
    referencias: new Map(),
    lousas: new Map(),
  };

  // Inicializa subpastas padrão de Tarefas para sempre ter as 3 colunas do Kanban
  subpastasPorCategoria.tarefas.set("a_fazer", { titulo: "A Fazer", total: 0 });
  subpastasPorCategoria.tarefas.set("fazendo", { titulo: "Em Andamento", total: 0 });
  subpastasPorCategoria.tarefas.set("concluida", { titulo: "Feito / Concluídas", total: 0 });

  // Inicializa subpastas padrão de PDI
  subpastasPorCategoria.pdi.set("metas_ativas", { titulo: "Metas Ativas", total: 0 });
  subpastasPorCategoria.pdi.set("metas_concluidas", { titulo: "Metas Concluídas", total: 0 });
  subpastasPorCategoria.pdi.set("entregas", { titulo: "Entregas", total: 0 });

  for (const doc of documentos) {
    contagens[doc.categoria] = (contagens[doc.categoria] || 0) + 1;

    const mapaSub = subpastasPorCategoria[doc.categoria];
    if (mapaSub) {
      const atual = mapaSub.get(doc.subpastaOuStatus) || {
        titulo: doc.subpastaOuStatusRotulo || doc.subpastaOuStatus,
        total: 0,
      };
      atual.total += 1;
      mapaSub.set(doc.subpastaOuStatus, atual);
    }
  }

  const pastas: PastaNavegacao[] = [
    {
      id: "notas",
      titulo: "Notas",
      categoria: "notas",
      total: contagens.notas,
      subpastas: Array.from(subpastasPorCategoria.notas.entries()).map(([k, v]) => ({
        id: k,
        titulo: v.titulo,
        valorFiltro: k,
        total: v.total,
      })),
    },
    {
      id: "tarefas",
      titulo: "Tarefas",
      categoria: "tarefas",
      total: contagens.tarefas,
      subpastas: Array.from(subpastasPorCategoria.tarefas.entries()).map(([k, v]) => ({
        id: k,
        titulo: v.titulo,
        valorFiltro: k,
        total: v.total,
      })),
    },
    {
      id: "pdi",
      titulo: "Metas & PDI",
      categoria: "pdi",
      total: contagens.pdi,
      subpastas: Array.from(subpastasPorCategoria.pdi.entries()).map(([k, v]) => ({
        id: k,
        titulo: v.titulo,
        valorFiltro: k,
        total: v.total,
      })),
    },
    {
      id: "contatos",
      titulo: "Contatos",
      categoria: "contatos",
      total: contagens.contatos,
    },
    {
      id: "referencias",
      titulo: "Referências",
      categoria: "referencias",
      total: contagens.referencias,
      subpastas: Array.from(subpastasPorCategoria.referencias.entries()).map(([k, v]) => ({
        id: k,
        titulo: v.titulo,
        valorFiltro: k,
        total: v.total,
      })),
    },
    {
      id: "lousas",
      titulo: "Lousas",
      categoria: "lousas",
      total: contagens.lousas,
    },
  ];

  return pastas;
}

/**
 * Filtra documentos por categoria, subpasta, termo de busca e regras avançadas
 */
export function filtrarDocumentosVinculaveis(
  documentos: DocumentoVinculavel[],
  opcoes: {
    categoria?: CategoriaDocumento | "todas";
    subpastaOuStatus?: string;
    termo?: string;
    regras?: RegraFiltro[];
    limite?: number;
  }
): DocumentoVinculavel[] {
  const { categoria = "todas", subpastaOuStatus, termo = "", regras = [], limite = 50 } = opcoes;
  const termoNorm = termo.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();

  let filtrados = documentos;

  if (categoria !== "todas") {
    filtrados = filtrados.filter((d) => d.categoria === categoria);
  }

  if (subpastaOuStatus && subpastaOuStatus !== "todos") {
    filtrados = filtrados.filter(
      (d) => d.subpastaOuStatus.toLowerCase() === subpastaOuStatus.toLowerCase()
    );
  }

  if (regras.length > 0) {
    filtrados = filtrarItensPorRegras(filtrados, regras, (doc, propId) => {
      switch (propId) {
        case "categoria":
          return doc.categoria;
        case "status":
          return doc.subpastaOuStatus;
        case "tags":
          return doc.tags;
        case "data":
          return doc.data;
        default:
          return (doc as any)[propId];
      }
    });
  }

  if (termoNorm) {
    filtrados = filtrados.filter((d) => {
      const titNorm = d.titulo.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
      if (titNorm.includes(termoNorm)) return true;

      const subNorm = (d.subtexto || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
      if (subNorm.includes(termoNorm)) return true;

      const tagsNorm = d.tags.join(" ").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
      if (tagsNorm.includes(termoNorm)) return true;

      return false;
    });
  }

  return filtrados.slice(0, limite);
}
