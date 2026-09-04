/**
 * Schemas de validação não-bloqueante com Zod.
 *
 * REGRA INEGOCIÁVEL:
 * 1. Todos os schemas usam `.passthrough()` para nunca descartar campos
 *    desconhecidos ou customizados gravados no YAML por outras ferramentas/IAs.
 * 2. Validação é estritamente passiva: devolve lista de alertas e registra
 *    aviso em logger, NUNCA dispara exceção nem impede o ciclo de leitura/escrita.
 */

import { z } from "zod";
import { logger } from "./logger";

export const AlertaSchemaItem = z.object({
  campo: z.string(),
  mensagem: z.string(),
});
export type AlertaSchema = z.infer<typeof AlertaSchemaItem>;

const RegexDataIso = /^\d{4}-\d{2}-\d{2}$/;

export const NotaSchema = z
  .object({
    id: z.string().optional(),
    titulo: z.string().optional(),
    tipo: z.enum(["nota", "referencia", "rascunho"]).optional(),
    subtipo: z.enum(["nota", "reuniao", "briefing", "rascunho"]).optional(),
    tags: z.union([z.array(z.string()), z.string()]).optional(),
    criado_em: z.string().optional(),
    atualizado_em: z.string().optional(),
    data_reuniao: z.string().optional(),
    participantes: z.array(z.string()).optional(),
    relacionamentos: z.array(z.string()).optional(),
    ia_sugeriu: z.boolean().optional(),
  })
  .passthrough();

export const TarefaSchema = z
  .object({
    id: z.string().optional(),
    titulo: z.string().optional(),
    tipo: z.literal("tarefa").optional(),
    status: z.enum(["a-fazer", "fazendo", "feito"]).optional(),
    prazo: z.string().regex(RegexDataIso, "Prazo deve estar no formato AAAA-MM-DD").optional(),
    prioridade: z.enum(["baixa", "media", "alta", "urgente"]).optional(),
    tags: z.union([z.array(z.string()), z.string()]).optional(),
    pomodoros_estimados: z.number().nonnegative().optional(),
    pomodoros_realizados: z.number().nonnegative().optional(),
    criado_em: z.string().optional(),
    atualizado_em: z.string().optional(),
    relacionamentos: z.array(z.string()).optional(),
    ia_sugeriu: z.boolean().optional(),
  })
  .passthrough();

export const MetaSchema = z
  .object({
    id: z.string().optional(),
    titulo: z.string().optional(),
    tipo: z.literal("meta").optional(),
    status: z.enum(["a-fazer", "em-andamento", "concluida"]).optional(),
    prazo: z.string().regex(RegexDataIso, "Prazo deve estar no formato AAAA-MM-DD").optional(),
    indicador: z.string().optional(),
    tags: z.union([z.array(z.string()), z.string()]).optional(),
    criado_em: z.string().optional(),
    atualizado_em: z.string().optional(),
    ia_sugeriu: z.boolean().optional(),
  })
  .passthrough();

export const EntregaSchema = z
  .object({
    id: z.string().optional(),
    titulo: z.string().optional(),
    tipo: z.literal("entrega").optional(),
    data: z.string().regex(RegexDataIso, "Data deve estar no formato AAAA-MM-DD").optional(),
    metas: z.union([z.array(z.string()), z.string()]).optional(),
    ia_sugeriu: z.boolean().optional(),
    impacto: z.string().optional(),
    elogio: z.string().optional(),
    autor_elogio: z.string().optional(),
    colaboracao: z.union([z.array(z.string()), z.string()]).optional(),
    tags: z.union([z.array(z.string()), z.string()]).optional(),
    criado_em: z.string().optional(),
    atualizado_em: z.string().optional(),
  })
  .passthrough();

export const ContatoSchema = z
  .object({
    id: z.string().optional(),
    titulo: z.string().optional(),
    cargo: z.string().optional(),
    empresa: z.string().optional(),
    email: z.string().email("E-mail com formato inválido").or(z.string()).optional(),
    telefone: z.string().optional(),
    pai_id: z.string().optional(),
    tags: z.union([z.array(z.string()), z.string()]).optional(),
    atualizado: z.string().optional(),
  })
  .passthrough();

export const ReferenciaSchema = z
  .object({
    id: z.string().optional(),
    titulo: z.string().optional(),
    tipo: z.literal("referencia").optional(),
    imagem: z.string().optional(),
    fonte: z.string().url("Fonte deve ser uma URL válida").or(z.string()).optional(),
    tags: z.union([z.array(z.string()), z.string()]).optional(),
    paleta: z.union([z.array(z.string()), z.string()]).optional(),
    porque: z.string().optional(),
    criado_em: z.string().optional(),
  })
  .passthrough();

/**
 * Validação passiva e não-bloqueante de frontmatter.
 * Retorna alertas de formato sem nunca interromper a execução.
 */
export function validarSchemaPassivo(
  schema: z.ZodTypeAny,
  dados: unknown,
  caminho?: string,
): AlertaSchema[] {
  if (!dados || typeof dados !== "object") return [];

  const resultado = schema.safeParse(dados);
  if (resultado.success) return [];

  const alertas: AlertaSchema[] = resultado.error.issues.map((issue) => ({
    campo: issue.path.join("."),
    mensagem: issue.message,
  }));

  if (alertas.length > 0 && caminho) {
    logger.warn(`Avisos de schema em ${caminho}:`, alertas);
  }

  return alertas;
}
