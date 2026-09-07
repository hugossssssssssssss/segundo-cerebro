import type { Tarefa } from "@/lib/tarefas";
import { lerSubtarefas } from "@/lib/tarefas";

/**
 * Utilitário de Compartilhamento Nativo (Web Share API) para Android, iOS e Web.
 *
 * Permite enviar notas, tarefas e referências do Klaus diretamente para outros
 * aplicativos instalados no aparelho do usuário (WhatsApp, Telegram, E-mail, Notion, etc.).
 *
 * Se o navegador/aparelho não suportar a Web Share API, fornece fallback automático
 * copiando o conteúdo formatado para a área de transferência.
 */

export interface DadosCompartilhamento {
  titulo?: string;
  texto?: string;
  url?: string;
}

/** Verifica se a Web Share API está disponível no navegador atual */
export function suportaCompartilhamento(): boolean {
  return typeof navigator !== "undefined" && typeof navigator.share === "function";
}

/**
 * Dispara a folha de compartilhamento nativa do sistema operacional
 * ou copia o texto para o clipboard como alternativa.
 */
export async function compartilhar(dados: DadosCompartilhamento): Promise<{ sucesso: boolean; metodo: "nativo" | "copiado" }> {
  const textoCompleto = [dados.titulo, dados.texto, dados.url].filter(Boolean).join("\n\n");

  if (suportaCompartilhamento()) {
    try {
      await navigator.share({
        title: dados.titulo,
        text: dados.texto,
        url: dados.url,
      });
      return { sucesso: true, metodo: "nativo" };
    } catch (err: unknown) {
      // Se o usuário cancelou a folha de compartilhamento nativa (AbortError), não é falha
      if (err instanceof Error && err.name === "AbortError") {
        return { sucesso: false, metodo: "nativo" };
      }
      // Fallback para cópia se der outro erro
    }
  }

  // Fallback: cópia para a área de transferência
  try {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      await navigator.clipboard.writeText(textoCompleto);
      return { sucesso: true, metodo: "copiado" };
    }
  } catch {
    // Falha silenciosa se permissão de clipboard falhar
  }

  return { sucesso: false, metodo: "copiado" };
}

/**
 * Formata e compartilha uma Nota do Klaus.
 */
export async function compartilharNota(titulo: string, corpo: string): Promise<{ sucesso: boolean; metodo: "nativo" | "copiado" }> {
  return compartilhar({
    titulo,
    texto: corpo,
  });
}

/**
 * Formata e compartilha uma Tarefa do Klaus (com status, checklist e prazo).
 */
export async function compartilharTarefa(tarefa: Tarefa): Promise<{ sucesso: boolean; metodo: "nativo" | "copiado" }> {
  const statusEmoji = tarefa.status === "feito" ? "✅" : tarefa.status === "fazendo" ? "⏳" : "📋";
  const prioridadeTexto = tarefa.prioridade ? ` | Prioridade: ${tarefa.prioridade}` : "";
  const prazoTexto = tarefa.prazo ? ` | Prazo: ${tarefa.prazo}` : "";

  let texto = `${statusEmoji} ${tarefa.titulo}${prioridadeTexto}${prazoTexto}`;

  const subtarefas = lerSubtarefas(tarefa.corpo || "");
  if (subtarefas.length > 0) {
    const itens = subtarefas
      .map((st) => `  ${st.feita ? "[x]" : "[ ]"} ${st.texto}`)
      .join("\n");
    texto += `\n\nSubtarefas:\n${itens}`;
  }

  if (tarefa.corpo && tarefa.corpo.trim()) {
    texto += `\n\n${tarefa.corpo.trim()}`;
  }

  return compartilhar({
    titulo: tarefa.titulo,
    texto,
  });
}

/**
 * Formata e compartilha uma Referência visual ou Link do Klaus.
 */
export async function compartilharReferencia(
  titulo: string,
  urlOuFonte?: string,
  anotacoes?: string
): Promise<{ sucesso: boolean; metodo: "nativo" | "copiado" }> {
  return compartilhar({
    titulo: `Referência: ${titulo}`,
    texto: anotacoes,
    url: urlOuFonte,
  });
}
