/**
 * Compilador de Histórico de Atividades e Mapa de Calor (Klaus Activity Pulse)
 *
 * Mapeia todas as ações, criações, edições, conclusões de tarefas e referências
 * visuais por dia para alimentar o mini calendário estilo GitHub em tons de roxo.
 */

import type { ItemRepo } from "./repo";
import { lerMarkdown, tituloProvavel } from "./markdown";
import { extrairLembretesDeTexto } from "./inbox";

export interface AtividadeDia {
  id: string;
  caminho: string;
  titulo: string;
  tipo: "nota" | "tarefa" | "meta" | "entrega" | "referencia" | "lembrete";
  acao: string; // Ex: "Criou nota", "Concluiu tarefa", "Salvou referência"
  dataIso: string; // YYYY-MM-DD
  hora?: string;
  imagem?: string;
  tags?: string[];
  concluido?: boolean;
}

export type MapaAtividadesPorDia = Record<string, AtividadeDia[]>;

/**
 * Normaliza qualquer formato de data/timestamp para YYYY-MM-DD respeitando o fuso local
 */
export function normalizarDataParaIso(valor: any): string | null {
  if (!valor) return null;
  if (typeof valor === "string") {
    const limpo = valor.trim();
    if (!limpo) return null;

    // Se for estritamente uma data pura YYYY-MM-DD (sem horário/sem T), mantém como está
    if (/^\d{4}-\d{2}-\d{2}$/.test(limpo)) {
      return limpo;
    }

    // Se for um timestamp ISO ou contiver horário (ex: "2026-09-04T01:07:00.000Z"),
    // converte para o Date e extrai o dia no fuso horário local do usuário
    const parsed = new Date(limpo);
    if (!isNaN(parsed.getTime())) {
      const y = parsed.getFullYear();
      const m = String(parsed.getMonth() + 1).padStart(2, "0");
      const d = String(parsed.getDate()).padStart(2, "0");
      return `${y}-${m}-${d}`;
    }

    const match = limpo.match(/^(\d{4}-\d{2}-\d{2})/);
    if (match) return match[1];
  }
  if (valor instanceof Date && !isNaN(valor.getTime())) {
    const y = valor.getFullYear();
    const m = String(valor.getMonth() + 1).padStart(2, "0");
    const d = String(valor.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }
  return null;
}

/**
 * Compila todo o histórico de atividades a partir do acervo do repositório
 */
export function compilarHistoricoAtividades(itens: ItemRepo[]): MapaAtividadesPorDia {
  const mapa: MapaAtividadesPorDia = {};

  const registrar = (dataIso: string, atividade: AtividadeDia) => {
    if (!dataIso || !/^\d{4}-\d{2}-\d{2}$/.test(dataIso)) return;
    if (!mapa[dataIso]) {
      mapa[dataIso] = [];
    }
    // Evita duplicatas idênticas no mesmo dia
    if (!mapa[dataIso].some((a) => a.id === atividade.id && a.acao === atividade.acao)) {
      mapa[dataIso].push(atividade);
    }
  };

  for (const item of itens) {
    if (!item.texto && !item.doc) continue;
    const doc = item.doc || lerMarkdown(item.texto);
    const dados = doc.dados || {};
    const titulo = String(dados.titulo || tituloProvavel(doc, item.nome));
    const tags = Array.isArray(dados.tags) ? (dados.tags as string[]) : [];

    // Extrai imagem se houver
    const imagem =
      typeof dados.imagem === "string" && dados.imagem.trim()
        ? dados.imagem.trim()
        : typeof dados.capa === "string" && dados.capa.trim()
        ? dados.capa.trim()
        : (item.caminho.startsWith("referencias/") &&
            (item.texto.match(/!\[.*?\]\((referencias\/imagens\/[^)]+)\)/i)?.[1] ||
             doc.corpo.match(/!\[.*?\]\((referencias\/imagens\/[^)]+)\)/i)?.[1])) ||
          undefined;

    // 1. Data de Criação
    let dataCriacao =
      normalizarDataParaIso(dados.criado_em) ||
      normalizarDataParaIso(dados.criado);

    if (!dataCriacao) {
      const matchNome = item.nome.match(/^(\d{4}-\d{2}-\d{2})/);
      if (matchNome) dataCriacao = matchNome[1];
    }

    // 2. Data de Edição/Atualização
    const dataAtualizacao =
      normalizarDataParaIso(dados.atualizado_em) ||
      normalizarDataParaIso(dados.atualizado);

    // ── Classificação por tipo de item ──────────────────────────────────────
    if (item.caminho.startsWith("tarefas/")) {
      const ehLembrete = dados.tipo === "lembrete" || item.nome.startsWith("lembrete-");
      const concluido = dados.status === "feito";

      if (ehLembrete) {
        if (dataCriacao) {
          registrar(dataCriacao, {
            id: `criou-${item.caminho}`,
            caminho: item.caminho,
            titulo,
            tipo: "lembrete",
            acao: "Criou lembrete",
            dataIso: dataCriacao,
            tags,
          });
        }
      } else {
        if (dataCriacao) {
          registrar(dataCriacao, {
            id: `criou-${item.caminho}`,
            caminho: item.caminho,
            titulo,
            tipo: "tarefa",
            acao: "Criou tarefa",
            dataIso: dataCriacao,
            tags,
            concluido,
          });
        }

        if (concluido) {
          const dataConclusao =
            normalizarDataParaIso(dados.concluida_em) ||
            dataAtualizacao ||
            dataCriacao;

          if (dataConclusao) {
            registrar(dataConclusao, {
              id: `concluiu-${item.caminho}`,
              caminho: item.caminho,
              titulo,
              tipo: "tarefa",
              acao: "Concluiu tarefa",
              dataIso: dataConclusao,
              tags,
              concluido: true,
            });
          }
        }
      }
    } else if (item.caminho.startsWith("pdi/metas/")) {
      const concluido = dados.status === "concluida";
      if (dataCriacao) {
        registrar(dataCriacao, {
          id: `criou-${item.caminho}`,
          caminho: item.caminho,
          titulo,
          tipo: "meta",
          acao: "Criou meta do PDI",
          dataIso: dataCriacao,
          tags,
          concluido,
        });
      }
    } else if (item.caminho.startsWith("pdi/entregas/")) {
      const dataEntrega = normalizarDataParaIso(dados.data) || dataCriacao;
      if (dataEntrega) {
        registrar(dataEntrega, {
          id: `entrega-${item.caminho}`,
          caminho: item.caminho,
          titulo,
          tipo: "entrega",
          acao: "Realizou entrega do PDI",
          dataIso: dataEntrega,
          tags,
          concluido: true,
        });
      }
    } else if (item.caminho.startsWith("referencias/")) {
      if (dataCriacao) {
        registrar(dataCriacao, {
          id: `criou-${item.caminho}`,
          caminho: item.caminho,
          titulo,
          tipo: "referencia",
          acao: "Salvou referência visual",
          dataIso: dataCriacao,
          imagem,
          tags,
        });
      }
    } else {
      // Notas gerais
      if (dataCriacao) {
        registrar(dataCriacao, {
          id: `criou-${item.caminho}`,
          caminho: item.caminho,
          titulo,
          tipo: "nota",
          acao: "Criou nota",
          dataIso: dataCriacao,
          imagem,
          tags,
        });
      }
    }

    // 3. Lembretes inline no texto [⏰ Lembrete: ... | ...]
    const lembretes = extrairLembretesDeTexto(item.texto, item.caminho, titulo);
    for (const l of lembretes) {
      const dataLembrete = normalizarDataParaIso(l.dataHora);
      if (dataLembrete) {
        registrar(dataLembrete, {
          id: l.id,
          caminho: item.caminho,
          titulo: l.titulo,
          tipo: "lembrete",
          acao: "Lembrete agendado",
          dataIso: dataLembrete,
          tags,
        });
      }
    }
  }

  return mapa;
}

/**
 * Calcula o nível de intensidade de 0 a 4 (estilo GitHub) baseado na contagem
 */
export function calcularNivelIntensidade(qtd: number): 0 | 1 | 2 | 3 | 4 {
  if (qtd === 0) return 0;
  if (qtd <= 2) return 1;
  if (qtd <= 4) return 2;
  if (qtd <= 7) return 3;
  return 4;
}
