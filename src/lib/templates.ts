/**
 * Gerenciador de Modelos (Templates) para Notas e Tarefas.
 *
 * ## Arquitetura
 *
 * Os templates vivem em **dois lugares**:
 *
 * 1. `MODELOS_PADRAO` — hard-coded neste arquivo, não podem ser apagados.
 * 2. `.klaus/templates/*.md` — arquivos Markdown no repositório de dados.
 *    Cada arquivo é um template com frontmatter e corpo.
 *
 * ## Migração do localStorage
 *
 * Na versão anterior, templates customizados ficavam no `localStorage`.
 * A função `migrarModelosDoLocalStorage` move esses templates para o
 * repositório de dados automaticamente. Depois de migrar, limpa o
 * `localStorage`.
 *
 * ## Modelo padrão
 *
 * O ID do modelo padrão (aquele que é aplicado ao clicar "Nova Nota")
 * continua no localStorage porque é uma preferência de UI, não dados.
 */

import type { Settings } from "./settings";
import { escreverMarkdown, nomeLivre } from "./markdown";

export const PASTA_TEMPLATES = ".klaus/templates";

export type TemplateItem = {
  id: string;
  titulo: string;
  categoria: "design" | "reuniao" | "tarefa" | "pdi";
  descricao: string;
  frontmatter: Record<string, any>;
  corpoPadrao: string;
  /** Caminho no repositório. Vazio para modelos padrão (hard-coded). */
  caminho?: string;
  /** SHA do arquivo no repositório. */
  sha?: string;
};

export type TemplateCategoria = TemplateItem["categoria"];

export const MODELOS_PADRAO: TemplateItem[] = [
  {
    id: "briefing-design",
    titulo: "Briefing de Identidade Visual",
    categoria: "design",
    descricao: "Estrutura completa para alinhamento de projeto de marca/design com cliente",
    frontmatter: {
      id: "briefing-design",
      tipo: "nota",
      subtipo: "briefing",
      tags: ["briefing", "design", "cliente"],
    },
    corpoPadrao: `## Objetivo do Projeto
Descreva o que o cliente precisa alcançar com este projeto.

## Público-Alvo e Persona
- **Idade / Perfil:**
- **Dores do público:**
- **Estilo visual desejado:**

## Entregáveis
- [ ] Logotipo Principal e Variações
- [ ] Paleta de Cores (HEX/RGB)
- [ ] Guia Tipográfico
- [ ] Assets para Redes Sociais

## Referências Visuais
Mencione referências ou salve em @referencias.
`,
  },
  {
    id: "ata-reuniao",
    titulo: "Ata de Reunião",
    categoria: "reuniao",
    descricao: "Modelo para organizar decisões, próximos passos e contexto de reuniões",
    frontmatter: {
      id: "ata-reuniao",
      tipo: "nota",
      subtipo: "reuniao",
      tags: ["reuniao", "decisoes"],
    },
    corpoPadrao: `## Participantes
-
-

## Decisões Tomadas
- [ ] 

## Próximos Passos
- [ ] 

## Contexto e Observações
`,
  },
  {
    id: "checklist-entrega",
    titulo: "Checklist de Entrega de Projeto",
    categoria: "tarefa",
    descricao: "Passos de verificação de qualidade antes do envio final ao cliente",
    frontmatter: {
      id: "checklist-entrega",
      tipo: "tarefa",
      status: "a-fazer",
      prioridade: "alta",
      pomodoros_estimados: 1,
      pomodoros_realizados: 0,
      tags: ["checklist", "entrega", "qualidade"],
    },
    corpoPadrao: `- [ ] Revisar exportação em vetor (SVG/EPS/PDF)
- [ ] Verificar contraste e acessibilidade de cores
- [ ] Testar aplicação em fundo claro e escuro
- [ ] Exportar em alta resolução (PNG 300 DPI)
- [ ] Gerar arquivo ZIP organizado para o cliente
`,
  },
];

const CHAVE_MODELO_PADRAO = "klaus_modelo_padrao_id";
const CHAVE_MODELOS_CUSTOM_LEGADO = "klaus_modelos_personalizados";

// ── API síncrona (modelos padrão + cache de repo) ──────────────────────────

/** Cache em memória dos templates carregados do repositório */
let _cacheTemplatesRepo: TemplateItem[] = [];

/**
 * Retorna todos os modelos (padrão + repositório + legado localStorage).
 * Se o repositório ainda não foi carregado, inclui os do localStorage como fallback.
 */
export function obterTodosModelos(): TemplateItem[] {
  let customLegado: TemplateItem[] = [];
  try {
    const salvo = localStorage.getItem(CHAVE_MODELOS_CUSTOM_LEGADO);
    if (salvo) customLegado = JSON.parse(salvo);
  } catch { /* vazio */ }

  // IDs que já existem no cache do repo (evitar duplicatas)
  const idsRepo = new Set(_cacheTemplatesRepo.map((t) => t.id));
  const legadosFiltrados = customLegado.filter((t) => !idsRepo.has(t.id));

  return [...MODELOS_PADRAO, ..._cacheTemplatesRepo, ...legadosFiltrados];
}

export function obterModeloPadraoId(): string | null {
  return localStorage.getItem(CHAVE_MODELO_PADRAO);
}

export function definirModeloPadraoId(id: string | null): void {
  if (!id) {
    localStorage.removeItem(CHAVE_MODELO_PADRAO);
  } else {
    localStorage.setItem(CHAVE_MODELO_PADRAO, id);
  }
}

export function obterModeloPadrao(): TemplateItem | undefined {
  const id = obterModeloPadraoId();
  if (!id) return undefined;
  return obterTodosModelos().find((m) => m.id === id);
}

export function ehModeloCustom(id: string): boolean {
  return id.startsWith("custom_") || id.startsWith("repo_");
}

export function ehModeloPadrao(id: string): boolean {
  return MODELOS_PADRAO.some((m) => m.id === id);
}

// ── API assíncrona (repositório) ────────────────────────────────────────────

/**
 * Carrega templates do repositório (.klaus/templates/*.md).
 * Atualiza o cache em memória e retorna todos os modelos.
 */
export async function carregarTemplatesDoRepo(cfg: Settings): Promise<TemplateItem[]> {
  if (!cfg.githubToken || !cfg.repoOwner || !cfg.repoName) {
    return obterTodosModelos();
  }

  try {
    const { carregarRepo, daPasta } = await import("./repo");
    const todos = await carregarRepo(cfg);
    const itens = daPasta(todos, PASTA_TEMPLATES);

    _cacheTemplatesRepo = itens.map((item): TemplateItem => {
      const doc = item.doc;
      const dados: Record<string, any> = doc.dados || {};
      return {
        id: `repo_${item.caminho}`,
        titulo: (dados.titulo as string) || item.nome.replace(/\.md$/, ""),
        categoria: (dados.categoria as TemplateItem["categoria"]) || "design",
        descricao: (dados.descricao as string) || "Modelo personalizado",
        frontmatter: {
          tipo: (dados.tipo as string) || "nota",
          tags: (dados.tags as string[]) || [],
          ...dados,
        },
        corpoPadrao: doc.corpo || "",
        caminho: item.caminho,
        sha: item.sha,
      };
    });

    return obterTodosModelos();
  } catch {
    // Silencioso — pasta pode não existir
    return obterTodosModelos();
  }
}

/**
 * Salva um template como arquivo .md no repositório.
 */
export async function salvarTemplateNoRepo(
  cfg: Settings,
  template: TemplateItem,
): Promise<string> {
  const { gravar } = await import("./github");
  const { invalidarCache } = await import("./repo");

  const dados = {
    titulo: template.titulo,
    categoria: template.categoria,
    descricao: template.descricao,
    tipo: template.frontmatter.tipo || "nota",
    tags: template.frontmatter.tags || [],
  };

  const texto = escreverMarkdown({ dados, corpo: template.corpoPadrao });

  const caminho = template.caminho || nomeLivre(
    PASTA_TEMPLATES,
    template.titulo,
    _cacheTemplatesRepo.map((t) => t.caminho || ""),
  );

  const res = await gravar(cfg, caminho, texto, template.sha, `template: ${template.titulo}`);
  invalidarCache();

  const novoItem: TemplateItem = {
    ...template,
    id: `repo_${caminho}`,
    caminho,
    sha: res || `temp_${Date.now()}`,
  };

  const idx = _cacheTemplatesRepo.findIndex((t) => t.caminho === caminho);
  if (idx >= 0) {
    _cacheTemplatesRepo[idx] = novoItem;
  } else {
    _cacheTemplatesRepo.push(novoItem);
  }

  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("klaus-templates-atualizados"));
  }

  return caminho;
}

/**
 * Exclui um template do repositório.
 */
export async function excluirTemplateDoRepo(
  cfg: Settings,
  caminho: string,
  sha: string,
): Promise<void> {
  const { apagar } = await import("./github");
  const { invalidarCache } = await import("./repo");

  await apagar(cfg, caminho, sha);
  invalidarCache();

  // Remover do cache
  _cacheTemplatesRepo = _cacheTemplatesRepo.filter((t) => t.caminho !== caminho);

  // Se era o modelo padrão, limpar
  const padraoId = obterModeloPadraoId();
  if (padraoId === `repo_${caminho}`) {
    definirModeloPadraoId(null);
  }
}

/**
 * Migra templates do localStorage para o repositório.
 * Chamado uma vez — depois limpa o localStorage.
 */
export async function migrarModelosDoLocalStorage(cfg: Settings): Promise<number> {
  const salvo = localStorage.getItem(CHAVE_MODELOS_CUSTOM_LEGADO);
  if (!salvo) return 0;

  let custom: TemplateItem[] = [];
  try {
    custom = JSON.parse(salvo);
  } catch {
    localStorage.removeItem(CHAVE_MODELOS_CUSTOM_LEGADO);
    return 0;
  }

  if (!Array.isArray(custom) || custom.length === 0) {
    localStorage.removeItem(CHAVE_MODELOS_CUSTOM_LEGADO);
    return 0;
  }

  let migrados = 0;
  for (const tmpl of custom) {
    try {
      await salvarTemplateNoRepo(cfg, tmpl);
      migrados++;
    } catch {
      // Falha silenciosa — tenta os outros
    }
  }

  // Limpar localStorage após migração bem-sucedida
  if (migrados > 0) {
    localStorage.removeItem(CHAVE_MODELOS_CUSTOM_LEGADO);
  }

  return migrados;
}

// ── Wrappers legados (compatibilidade com código existente) ──────────────

/** @deprecated Use salvarTemplateNoRepo */
export function salvarModelosPersonalizados(custom: TemplateItem[]): void {
  // Fallback para localStorage se não tiver cfg
  localStorage.setItem(CHAVE_MODELOS_CUSTOM_LEGADO, JSON.stringify(custom));
}

/** @deprecated Use obterTodosModelos */
export function obterModelosPersonalizados(): TemplateItem[] {
  return obterTodosModelos().filter((m) => ehModeloCustom(m.id));
}

/** @deprecated Use salvarTemplateNoRepo */
export function criarModeloPersonalizado(
  dados: Omit<TemplateItem, "id">,
): TemplateItem {
  const novo: TemplateItem = {
    ...dados,
    id: `custom_${Date.now()}`,
  };
  const custom = obterModelosPersonalizados();
  salvarModelosPersonalizados([...custom, novo]);
  return novo;
}

/** @deprecated Use salvarTemplateNoRepo */
export function editarModeloPersonalizado(
  id: string,
  dados: Partial<Omit<TemplateItem, "id">>,
): boolean {
  if (!ehModeloCustom(id)) return false;
  const custom = obterModelosPersonalizados();
  const idx = custom.findIndex((m) => m.id === id);
  if (idx < 0) return false;
  custom[idx] = { ...custom[idx], ...dados, id };
  salvarModelosPersonalizados(custom);
  return true;
}

/** @deprecated Use excluirTemplateDoRepo */
export function removerModeloPersonalizado(id: string): boolean {
  if (!ehModeloCustom(id)) return false;
  const custom = obterModelosPersonalizados().filter((m) => m.id !== id);
  salvarModelosPersonalizados(custom);
  if (obterModeloPadraoId() === id) {
    definirModeloPadraoId(null);
  }
  return true;
}