/**
 * Motor de Automações Client-Side para Processos e Pipelines no Klaus.
 *
 * Avalia regras configuradas ("Se isso → Faça aquilo") e atualiza os cartões
 * automaticamente ao marcar checklists, trocar etapas ou criar projetos.
 */

import type { Processo, CardProcesso, ComentarioCard } from "./tipos";

export interface ResultadoAutomacao {
  cardAtualizado: CardProcesso;
  modificado: boolean;
  mensagens: string[];
}

/**
 * Avalia regras do processo quando um checklist de um cartão é marcado ou desmarcado.
 */
export function executarRegrasAoChecklist(
  card: CardProcesso,
  processo: Processo,
  checklistId: string,
  concluido: boolean
): ResultadoAutomacao {
  let modificado = false;
  let cardAtual = { ...card, checklists: { ...card.checklists, [checklistId]: concluido } };
  const mensagens: string[] = [];

  if (!concluido) {
    return { cardAtualizado: cardAtual, modificado: true, mensagens: [] };
  }

  for (const regra of processo.regras) {
    if (regra.gatilho === "ao_concluir_checklist" && regra.condicao?.checklistId === checklistId) {
      if (regra.acao === "mudar_etapa" && regra.parametros.etapaDestinoId) {
        cardAtual = { ...cardAtual, etapaId: regra.parametros.etapaDestinoId };
        modificado = true;
        mensagens.push(`Automação: Cartão movido para a etapa '${regra.parametros.etapaDestinoId}'.`);
      } else if (regra.acao === "marcar_urgente") {
        cardAtual = { ...cardAtual, urgente: true };
        modificado = true;
        mensagens.push("Automação: Cartão marcado como urgente.");
      } else if (regra.acao === "adicionar_comentario" && regra.parametros.mensagemComentario) {
        const novoComentario: ComentarioCard = {
          id: `com_${Date.now()}`,
          data: new Date().toISOString(),
          autor: "Automação Klaus",
          texto: regra.parametros.mensagemComentario,
        };
        cardAtual = { ...cardAtual, comentarios: [novoComentario, ...cardAtual.comentarios] };
        modificado = true;
        mensagens.push(`Automação: Comentário gerado '${regra.parametros.mensagemComentario}'.`);
      }
    }
  }

  return { cardAtualizado: cardAtual, modificado, mensagens };
}

/**
 * Avalia regras do processo quando um cartão muda de etapa.
 */
export function executarRegrasAoMudarEtapa(
  card: CardProcesso,
  processo: Processo,
  etapaOrigemId: string,
  etapaDestinoId: string
): ResultadoAutomacao {
  let modificado = true;
  let cardAtual = { ...card, etapaId: etapaDestinoId };
  const mensagens: string[] = [];

  // Registrar histórico no cartão
  const etapaOrigemObj = processo.etapas.find((e) => e.id === etapaOrigemId);
  const etapaDestinoObj = processo.etapas.find((e) => e.id === etapaDestinoId);
  const nomeOrigem = etapaOrigemObj?.nome || etapaOrigemId;
  const nomeDestino = etapaDestinoObj?.nome || etapaDestinoId;

  const historicoComentario: ComentarioCard = {
    id: `com_${Date.now()}`,
    data: new Date().toISOString(),
    autor: "Klaus Bot",
    texto: `Cartão movido de '${nomeOrigem}' para '${nomeDestino}'.`,
  };
  cardAtual = { ...cardAtual, comentarios: [historicoComentario, ...cardAtual.comentarios] };

  for (const regra of processo.regras) {
    if (regra.gatilho === "ao_mudar_etapa") {
      const matchOrigem = !regra.condicao?.etapaOrigemId || regra.condicao.etapaOrigemId === etapaOrigemId;
      if (matchOrigem) {
        if (regra.acao === "marcar_urgente") {
          cardAtual = { ...cardAtual, urgente: true };
          mensagens.push("Automação: Cartão marcado como urgente.");
        } else if (regra.acao === "adicionar_comentario" && regra.parametros.mensagemComentario) {
          const com: ComentarioCard = {
            id: `com_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
            data: new Date().toISOString(),
            autor: "Automação Klaus",
            texto: regra.parametros.mensagemComentario,
          };
          cardAtual = { ...cardAtual, comentarios: [com, ...cardAtual.comentarios] };
          mensagens.push(`Automação: ${regra.parametros.mensagemComentario}`);
        }
      }
    }
  }

  return { cardAtualizado: cardAtual, modificado, mensagens };
}
