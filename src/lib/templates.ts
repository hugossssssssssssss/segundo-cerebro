/**
 * Gerenciador de Modelos (Templates) Pré-definidos para Notas e Tarefas.
 */

export type TemplateItem = {
  id: string;
  titulo: string;
  categoria: "design" | "reuniao" | "tarefa" | "pdi";
  descricao: string;
  frontmatter: Record<string, any>;
  corpoPadrao: string;
};

export const MODELOS_PADRAO: TemplateItem[] = [
  {
    id: "briefing-design",
    titulo: "Briefing de Identidade Visual",
    categoria: "design",
    descricao: "Estrutura completa para alinhamento de projeto de marca/design com cliente",
    frontmatter: {
      tipo: "nota",
      tags: ["briefing", "design", "cliente"],
      status: "em-andamento",
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
      tipo: "nota",
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
      tipo: "tarefa",
      status: "a-fazer",
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

const CHAVE_MODELOS_CUSTOM = "klaus_modelos_personalizados";
const CHAVE_MODELO_PADRAO = "klaus_modelo_padrao_id";

export function obterTodosModelos(): TemplateItem[] {
  try {
    const salvo = localStorage.getItem(CHAVE_MODELOS_CUSTOM);
    if (!salvo) return MODELOS_PADRAO;
    const custom = JSON.parse(salvo) as TemplateItem[];
    return [...MODELOS_PADRAO, ...custom];
  } catch {
    return MODELOS_PADRAO;
  }
}

export function salvarModelosPersonalizados(custom: TemplateItem[]): void {
  localStorage.setItem(CHAVE_MODELOS_CUSTOM, JSON.stringify(custom));
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
