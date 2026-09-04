/**
 * Gerador e Limpador de Dados de Demonstração Expandido (Mega Mock / Demo Pack)
 *
 * Popula o Klaus com um ecossistema completo de mais de 75 arquivos
 * interconectados (notas, tarefas, metas, entregas, referências e contatos),
 * cobrindo todas as funcionalidades: menções, pomodoros, kanban, árvore hierárquica,
 * brag document, filtros avançados, grafo neural e lembretes.
 */

import type { Settings } from "./settings";
import { escreverMarkdown } from "./markdown";
import { gravar, apagar } from "./github";
import { invalidarCache, type ItemRepo } from "./repo";
import { PASTAS } from "./tipos";
import { hojeISO } from "./utils";
import { format, addDays, subDays } from "date-fns";

export interface ItemDemo {
  caminho: string;
  mensagemCommit: string;
  conteudo: string;
}

export function gerarItensDemo(nomeUsuario?: string): ItemDemo[] {
  const agora = new Date().toISOString();
  const hoje = new Date();
  const dataHojeStr = hojeISO();
  const dataAmanhaStr = format(addDays(hoje, 1), "yyyy-MM-dd");
  const dataEm2DiasStr = format(addDays(hoje, 2), "yyyy-MM-dd");
  const dataEm3DiasStr = format(addDays(hoje, 3), "yyyy-MM-dd");
  const dataEm4DiasStr = format(addDays(hoje, 4), "yyyy-MM-dd");
  const dataEm5DiasStr = format(addDays(hoje, 5), "yyyy-MM-dd");
  const dataEm7DiasStr = format(addDays(hoje, 7), "yyyy-MM-dd");
  const dataEm14DiasStr = format(addDays(hoje, 14), "yyyy-MM-dd");
  const dataOntemStr = format(subDays(hoje, 1), "yyyy-MM-dd");
  const data2DiasAtrasStr = format(subDays(hoje, 2), "yyyy-MM-dd");
  const data3DiasAtrasStr = format(subDays(hoje, 3), "yyyy-MM-dd");
  const dataSemanaPassadaStr = format(subDays(hoje, 7), "yyyy-MM-dd");
  const data2SemanasAtrasStr = format(subDays(hoje, 14), "yyyy-MM-dd");
  const dataMesPassadoStr = format(subDays(hoje, 30), "yyyy-MM-dd");

  const autor = nomeUsuario?.trim() || "Hugo Silva";
  const itens: ItemDemo[] = [];

  // =========================================================================
  // 1. NOTAS (20 notas com subtipos, menções, lembretes e tags)
  // =========================================================================
  const notasDef = [
    {
      titulo: "Guia de Identidade Visual Tech",
      subtipo: "nota",
      fixado: true,
      tags: ["design", "branding", "guideline", "demo"],
      corpo: `## Diretrizes da Nova Identidade Visual

Este documento consolida os princípios visuais da marca, paletas cromáticas e aplicações digitais.

---

### Princípios de Design
1. **Clareza e Precisão**: Uso rigoroso de grids suíços e proporções matemáticas.
2. **Contraste Dinâmico**: Tipografia sem serifa expressiva combinada a fundos escuros refinados.
3. **Escalabilidade**: Compatível com o projeto de @Evolucao em Design Ops e Tokens.

### Responsáveis
- Direção de Arte: @Mariana Costa
- UI & Prototipagem: @Lucas Ferreira e @Camila Duarte

### Tarefas Relacionadas
- @Criar prototipo de alta fidelidade no Figma
- @Revisar contraste e acessibilidade das cores

[⏰ Lembrete: ${dataAmanhaStr} 10:00 | Validar cores primárias com diretoria]
`,
    },
    {
      titulo: "Pesquisa de Tipografia Suíça",
      subtipo: "nota",
      fixado: true,
      tags: ["tipografia", "design", "editorial", "demo"],
      corpo: `## O Estilo Tipográfico Internacional (Design Suíço)

Notas de estudo sobre a aplicação contemporânea dos conceitos desenvolvidos por Josef Müller-Brockmann e Armin Hofmann.

---

### Fundamentos
- **Grid Modular**: Estrutura invisível que ancora todos os elementos visuais.
- **Tipografia Grotesca**: Preferência por famílias neo-grotescas neutras e legíveis (Inter, Neue Haas Grotesk, Helvetica).
- **Espaço Negativo Ativo**: O respiro tem tanta importância quanto a forma.

Veja também a referência visual @Grid Editorial Suico Minimalista.
`,
    },
    {
      titulo: "Briefing Campanha Q4",
      subtipo: "briefing",
      fixado: false,
      tags: ["campanha", "marketing", "q4", "demo"],
      corpo: `## Campanha de Final de Ano: Lançamento de Produto

### Objetivos Principais
- Aumentar o reconhecimento da marca em 25% no segmento tech.
- Apresentar as novas ferramentas integradas de fluxo criativo.

### Entregáveis
- 3 landing pages responsivas
- Kit completo de peças digitais para redes sociais
- Key visual para anúncios e apresentações

Alinhamento com o time de engenharia liderado por @Rodrigo Silva.
`,
    },
    {
      titulo: "Estratégia de Design Tokens",
      subtipo: "nota",
      fixado: true,
      tags: ["design-tokens", "design-system", "demo"],
      corpo: `## Arquitetura de Tokens Multiplataforma

### Níveis de Tokens
1. **Global Tokens**: Cores primitivas, escalas tipográficas puras, espaçamentos base.
2. **Semantic Tokens**: \`--color-background-primary\`, \`--color-text-muted\`, etc.
3. **Component Tokens**: \`--btn-primary-bg\`, \`--card-border-radius\`.

Esta iniciativa suporta diretamente a entrega @Lancamento do Design System V2.
`,
    },
    {
      titulo: "Anotações Kickoff Projeto Alpha",
      subtipo: "reuniao",
      fixado: false,
      data_reuniao: dataHojeStr,
      participantes: ["Hugo Silva", "Mariana Costa", "Rodrigo Silva"],
      tags: ["reuniao", "projeto-alpha", "demo"],
      corpo: `## Pauta da Reunião
- Apresentação do cronograma e marcos do trimestre
- Definição de papéis e responsabilidades
- Validação do escopo técnico com @Rodrigo Silva

### Próximos Passos
- [ ] @Alinhar briefing com a diretoria de arte
- [ ] @Criar prototipo de alta fidelidade no Figma
`,
    },
    {
      titulo: "Resumo do Livro A Psicologia das Cores",
      subtipo: "nota",
      fixado: false,
      tags: ["livros", "estudos", "cores", "demo"],
      corpo: `## Principais Aprendizados de Eva Heller

- **Azul**: Confiança, estabilidade, razão e harmonia. Cor mais apreciada no ambiente corporativo e fintechs.
- **Verde**: Crescimento, saúde, sustentabilidade e renovação.
- **Amarelo**: Otimismo, energia e alerta. Excelente para pontos focais sutis.
- **Roxo/Violeta**: Criatividade, sofisticação, tecnologia e imaginação.

Conectar com a referência @Dashboard Dark Glassmorphism.
`,
    },
    {
      titulo: "Arquitetura da Informação e Taxonomia",
      subtipo: "nota",
      fixado: false,
      tags: ["ux", "arquitetura-informacao", "demo"],
      corpo: `## Reestruturação da Navegação do Produto

### Árvore de Menus Proposta
1. **Dashboard Principal**: Visão consolidada de KPIs.
2. **Gestão de Projetos**: Kanbans e cronogramas interativos.
3. **Repositório Criativo**: Moodboards e galerias de assets.

Feedback coletado em sessão com @Beatriz Mendes.
`,
    },
    {
      titulo: "Ata da Sprint Review #42",
      subtipo: "reuniao",
      fixado: false,
      data_reuniao: dataOntemStr,
      participantes: ["Hugo Silva", "Lucas Ferreira", "Gabriel Santos"],
      tags: ["sprint", "agil", "reuniao", "demo"],
      corpo: `## O que foi entregue na Sprint 42
- Conclusão da tarefa @Exportar icones SVG e assets para frontend
- Teste de carga de imagens no componente de galeria
- Correção de 4 bugs de contraste em campos de formulário

### Impedimentos Superados
Aguardávamos aprovação do layout mobile por @Mariana Costa.
`,
    },
    {
      titulo: "Checklist de Pré-Lançamento de Landing Page",
      subtipo: "nota",
      fixado: false,
      tags: ["checklist", "qa", "deploy", "demo"],
      corpo: `## Checklist de Qualidade

- [ ] Validação de links e tags OpenGraph no Twitter/LinkedIn
- [ ] Otimização de imagens com formato WebP / AVIF
- [ ] Teste em dispositivos iOS e Android de telas pequenas
- [ ] Verificação de tempo de carregamento no PageSpeed Insights
- [ ] Configuração de eventos de conversão no analytics
`,
    },
    {
      titulo: "Diretrizes de Micro-Interações e Feedback Tátil",
      subtipo: "nota",
      fixado: false,
      tags: ["motion", "ux", "interacao", "demo"],
      corpo: `## Princípios de Animação em UI

- **Duração Ideal**: Micro-interações entre 150ms e 300ms.
- **Curvas de Easing**: \`cubic-bezier(0.16, 1, 0.3, 1)\` para entradas suaves e naturais.
- **Feedback Imediato**: Resposta visual em menos de 50ms após o clique.

Vinculado à meta @Dominio de Ferramentas de Motion e Prototipagem.
`,
    },
    {
      titulo: "1 on 1 com Lucas Ferreira (Alinhamento de Carreira)",
      subtipo: "reuniao",
      fixado: false,
      data_reuniao: dataSemanaPassadaStr,
      participantes: ["Hugo Silva", "Lucas Ferreira"],
      tags: ["1on1", "lideranca", "pdi", "demo"],
      corpo: `## Pontos Discutidos
- Revisão dos projetos do trimestre e papel de liderança técnica
- Planejamento do próximo workshop interno de design
- Metas de evolução em Design Ops

Próxima conversa agendada para daqui a 15 dias.
`,
    },
    {
      titulo: "Especificação de Grid Responsivo (8pt Grid System)",
      subtipo: "nota",
      fixado: false,
      tags: ["grid", "layout", "design-system", "demo"],
      corpo: `## Sistema de Espaçamentos Base 8px

| Token | Valor | Aplicação |
|---|---|---|
| \`space-1\` | 4px | Margens internas de tags e chips |
| \`space-2\` | 8px | Espaçamento entre ícone e texto |
| \`space-3\` | 12px | Padding interno de botões compactos |
| \`space-4\` | 16px | Padding padrão de cartões |
| \`space-6\` | 24px | Espaçamento entre seções principais |
| \`space-8\` | 32px | Gutter de grids e colunas |
`,
    },
    {
      titulo: "Estudo Comparativo de Ferramentas de IA para Designers",
      subtipo: "nota",
      fixado: false,
      tags: ["ia", "produtividade", "ferramentas", "demo"],
      corpo: `## Panorama de IA Generativa no Design
- **Midjourney / DALL-E**: Geração de texturas, conceitos e ilustrações abstratas.
- **Gemini / Claude**: Estruturação de briefings, arquitetura de informação e copy UX.
- **Figma AI**: Automação de auto-layout e renomeação de layers.
`,
    },
    {
      titulo: "Plano de Estudos em Web Typography Avançada",
      subtipo: "nota",
      fixado: false,
      tags: ["estudos", "tipografia", "css", "demo"],
      corpo: `## Tópicos de Aprendizado
- Fontes variáveis (\`font-variation-settings\`)
- Otimização de fontes com \`font-display: swap\` e subsetting de glifos
- Ritmo vertical com unidades relativas (\`ch\`, \`rem\`, \`cqw\`)
`,
    },
    {
      titulo: "Roteiro de Workshop de Acessibilidade Digital",
      subtipo: "briefing",
      fixado: false,
      tags: ["acessibilidade", "workshop", "treinamento", "demo"],
      corpo: `## Estrutura do Treinamento para o Time
1. **Introdução à WCAG**: Princípios Perceptível, Operável, Compreensível e Robusto.
2. **Contraste de Cores**: Uso de ferramentas de auditoria e plugins no Figma.
3. **Navegação por Teclado**: Hierarquia de foco (\`tabindex\`) e skip-links.
4. **Laboratório Prático**: Refatoração de um modal inacessível.
`,
    },
    {
      titulo: "Glossário de Termos de Design Ops",
      subtipo: "nota",
      fixado: false,
      tags: ["design-ops", "glossario", "demo"],
      corpo: `## Definições Essenciais
- **Token**: Par nome/valor agnóstico de plataforma.
- **Component Registry**: Catálogo vivo sincronizado entre código e design.
- **Design Lint**: Verificação automatizada de conformidade de estilos.
`,
    },
    {
      titulo: "Ideias para Próximo Artigo no Medium",
      subtipo: "rascunho",
      fixado: false,
      tags: ["artigo", "conteudo", "escrita", "demo"],
      corpo: `## Título Provisório: Como o Segundo Cérebro Transformou Meu Processo Criativo

### Estrutura do Artigo
- O caos das abas abertas e arquivos espalhados
- Por que Markdown puro e repositório próprio são imbatíveis
- Como conectar notas, tarefas e referências visuais com menções vivas
`,
    },
    {
      titulo: "Anotações sobre Design Emocional (Don Norman)",
      subtipo: "nota",
      fixado: false,
      tags: ["livros", "ux", "psicologia", "demo"],
      corpo: `## Os Três Níveis de Processamento
1. **Visceral**: Reação instintiva à estética inicial e acabamento visual.
2. **Comportamental**: Prazer e eficácia na usabilidade real.
3. **Reflexivo**: Memória, significado e identidade associada ao produto.
`,
    },
    {
      titulo: "Template de Documentação de Hand-off para Engenharia",
      subtipo: "nota",
      fixado: false,
      tags: ["handoff", "engenharia", "processos", "demo"],
      corpo: `## O que incluir em todo Hand-off
- Links para o arquivo no Figma com frames organizados
- Especificação de comportamentos responsivos (breakpoint 360px, 768px, 1280px)
- Estados de erro, loading e estados vazios (Empty States)
`,
    },
    {
      titulo: "Planejamento de Metas Pessoais e Hábitos 2026",
      subtipo: "nota",
      fixado: true,
      tags: ["pessoal", "habitos", "planejamento", "demo"],
      corpo: `## Hábitos de Alta Produtividade
- 4 ciclos Pomodoro focados por manhã (sem notificações)
- Leitura de 1 artigo técnico ou capítulo de livro por dia
- Revisão semanal de tarefas e Inbox toda sexta-feira às 17h
`,
    },
  ];

  for (const n of notasDef) {
    itens.push({
      caminho: `${PASTAS.notas}/${n.titulo}.md`,
      mensagemCommit: `docs(demo): nota ${n.titulo.toLowerCase()}`,
      conteudo: escreverMarkdown({
        dados: {
          id: n.titulo.toLowerCase().replace(/[^a-z0-9]/g, "-"),
          tipo: "nota",
          subtipo: n.subtipo,
          titulo: n.titulo,
          fixado: n.fixado,
          criado_em: agora,
          atualizado_em: agora,
          criado_por: autor,
          data_reuniao: (n as any).data_reuniao,
          participantes: (n as any).participantes,
          tags: n.tags,
          demo: true,
        },
        corpo: n.corpo,
      }),
    });
  }

  // =========================================================================
  // 2. TAREFAS (25 tarefas cobrindo todos os status, prioridades e prazos)
  // =========================================================================
  const tarefasDef = [
    {
      titulo: "Criar protótipo de alta fidelidade no Figma",
      status: "em-progresso",
      prioridade: "alta",
      prazo: dataEm2DiasStr,
      pomodoros_estimados: 4,
      pomodoros_realizados: 2,
      tags: ["figma", "ui", "prototipo", "demo"],
      corpo: `Montar fluxo interativo de ponta a ponta com auto-layout e variáveis.

- [x] Estruturar wireframes de baixa fidelidade
- [x] Aplicar componentes do design system
- [ ] Criar micro-interações de botões e transições
- [ ] Testar fluxo no Figma Mirror mobile
`,
    },
    {
      titulo: "Revisar contraste e acessibilidade das cores",
      status: "a-fazer",
      prioridade: "media",
      prazo: dataEm4DiasStr,
      pomodoros_estimados: 2,
      pomodoros_realizados: 0,
      tags: ["acessibilidade", "wcag", "cores", "demo"],
      corpo: `Garantir conformidade com as diretrizes WCAG 2.1 nível AA.

- [ ] Checar contraste de textos secundários no modo escuro
- [ ] Validar estados de foco dos campos de formulário
- [ ] Gerar relatório de conformidade
`,
    },
    {
      titulo: "Exportar ícones SVG e assets para frontend",
      status: "feito",
      prioridade: "baixa",
      pomodoros_estimados: 2,
      pomodoros_realizados: 2,
      concluida_em: dataHojeStr,
      tags: ["assets", "svg", "frontend", "demo"],
      corpo: `Otimizar SVGs com SVGO e subir para o repositório de ícones.

- [x] Limpar layers desnecessárias no Figma
- [x] Exportar conjunto com 48 ícones em 24px
- [x] Validar rendering no browser
`,
    },
    {
      titulo: "Alinhar briefing com a diretoria de arte",
      status: "a-fazer",
      prioridade: "urgente",
      prazo: dataAmanhaStr,
      pomodoros_estimados: 1,
      pomodoros_realizados: 0,
      tags: ["reuniao", "alinhamento", "demo"],
      corpo: `Revisar os pontos críticos do @Briefing Campanha Q4 junto com @Mariana Costa.
`,
    },
    {
      titulo: "Documentar componentes de formulário no Zeroheight",
      status: "em-progresso",
      prioridade: "media",
      prazo: dataEm7DiasStr,
      pomodoros_estimados: 3,
      pomodoros_realizados: 1,
      tags: ["documentacao", "design-system", "demo"],
      corpo: `Escrever especificações de uso, dos and don'ts, e estados (hover, active, disabled, error).
`,
    },
    {
      titulo: "Aprovar paleta com equipe de marketing",
      status: "bloqueada",
      prioridade: "urgente",
      prazo: dataOntemStr, // Atrasada de propósito para testar alertas na Inbox!
      pomodoros_estimados: 2,
      pomodoros_realizados: 1,
      tags: ["marketing", "cores", "urgente", "demo"],
      corpo: `Aguardando retorno do comitê de marca sobre a tonalidade do roxo primário.

- [x] Enviar prancha de aplicação visual
- [ ] Receber parecer final de @Mariana Costa
`,
    },
    {
      titulo: "Configurar variáveis de tema claro e escuro no Tailwind",
      status: "feito",
      prioridade: "alta",
      pomodoros_estimados: 3,
      pomodoros_realizados: 3,
      concluida_em: dataOntemStr,
      tags: ["tailwind", "css", "dev", "demo"],
      corpo: `Mapear tokens semânticos no arquivo de configuração do Tailwind CSS.
`,
    },
    {
      titulo: "Criar animação de onboarding em Lottie",
      status: "em-progresso",
      prioridade: "media",
      prazo: dataEm5DiasStr,
      pomodoros_estimados: 4,
      pomodoros_realizados: 2,
      tags: ["motion", "lottie", "animacao", "demo"],
      corpo: `Construir ilustração animada no After Effects e exportar via plugin Bodymovin.
`,
    },
    {
      titulo: "Realizar testes de usabilidade com 5 usuários",
      status: "a-fazer",
      prioridade: "alta",
      prazo: dataEm7DiasStr,
      pomodoros_estimados: 5,
      pomodoros_realizados: 0,
      tags: ["pesquisa", "ux", "testes", "demo"],
      corpo: `Recrutar participantes externos para navegar pelo fluxo de checkout reformulado.
`,
    },
    {
      titulo: "Refatorar modal de confirmação de exclusão",
      status: "feito",
      prioridade: "media",
      pomodoros_estimados: 1,
      pomodoros_realizados: 1,
      concluida_em: data2DiasAtrasStr,
      tags: ["ui", "refactor", "demo"],
      corpo: `Substituir diálogos nativos do navegador por modais consistentes com o design system.
`,
    },
    {
      titulo: "Escrever artigo sobre Design Ops para o blog técnico",
      status: "a-fazer",
      prioridade: "baixa",
      prazo: dataEm14DiasStr,
      pomodoros_estimados: 3,
      pomodoros_realizados: 0,
      tags: ["blog", "conteudo", "escrita", "demo"],
      corpo: `Estruturar case sobre a criação do @Lancamento do Design System V2.
`,
    },
    {
      titulo: "Auditar biblioteca de componentes no Figma",
      status: "feito",
      prioridade: "alta",
      pomodoros_estimados: 4,
      pomodoros_realizados: 4,
      concluida_em: data3DiasAtrasStr,
      tags: ["figma", "auditoria", "design-system", "demo"],
      corpo: `Verificar se todas as variantes de botões e cartões utilizam as variáveis globais.
`,
    },
    {
      titulo: "Organizar pastas de referências e inspirações",
      status: "a-fazer",
      prioridade: "baixa",
      pomodoros_estimados: 1,
      pomodoros_realizados: 0,
      prazo: dataEm3DiasStr,
      tags: ["organizacao", "referencias", "demo"],
      corpo: `Categorizar prints de interfaces, pôsteres e paletas salvas durante a semana.
`,
    },
    {
      titulo: "Implementar suporte a atalhos de teclado ⌘K e ⌘J",
      status: "feito",
      prioridade: "alta",
      pomodoros_estimados: 2,
      pomodoros_realizados: 2,
      concluida_em: dataSemanaPassadaStr,
      tags: ["produtividade", "atalhos", "dev", "demo"],
      corpo: `Facilitar a busca global e captura rápida de pensamentos em qualquer tela do app.
`,
    },
    {
      titulo: "Validar protótipo responsivo no tablet e mobile",
      status: "em-progresso",
      prioridade: "urgente",
      prazo: dataHojeStr,
      pomodoros_estimados: 2,
      pomodoros_realizados: 1,
      tags: ["mobile", "responsividade", "qa", "demo"],
      corpo: `Garantir touch targets mínimos de 44x44px em botões e menus móveis.
`,
    },
    {
      titulo: "Definir paleta cromática para o modo de foco (Zen Mode)",
      status: "a-fazer",
      prioridade: "media",
      prazo: dataEm5DiasStr,
      pomodoros_estimados: 2,
      pomodoros_realizados: 0,
      tags: ["zen", "cores", "foco", "demo"],
      corpo: `Selecionar tons dessaturados para diminuir a fadiga visual em sessões longas.
`,
    },
    {
      titulo: "Configurar monitoramento de métricas no PostHog",
      status: "bloqueada",
      prioridade: "media",
      prazo: dataEm4DiasStr,
      pomodoros_estimados: 2,
      pomodoros_realizados: 0,
      tags: ["analytics", "metricas", "demo"],
      corpo: `Aguardando liberação de chave de API pelo time de infraestrutura.
`,
    },
    {
      titulo: "Criar prancha de moodboard para a nova marca",
      status: "feito",
      prioridade: "alta",
      pomodoros_estimados: 3,
      pomodoros_realizados: 3,
      concluida_em: dataSemanaPassadaStr,
      tags: ["moodboard", "branding", "demo"],
      corpo: `Compilar referências de estética brutalista elegante e tipografia suíça.
`,
    },
    {
      titulo: "Revisar microcópia de mensagens de erro",
      status: "a-fazer",
      prioridade: "baixa",
      prazo: dataEm7DiasStr,
      pomodoros_estimados: 1,
      pomodoros_realizados: 0,
      tags: ["ux-writing", "copy", "demo"],
      corpo: `Tornar os textos de falha mais humanos, instrutivos e empáticos.
`,
    },
    {
      titulo: "Estruturar árvore de decisão para escolha de fontes",
      status: "feito",
      prioridade: "media",
      pomodoros_estimados: 2,
      pomodoros_realizados: 2,
      concluida_em: data2SemanasAtrasStr,
      tags: ["tipografia", "processos", "demo"],
      corpo: `Documento guia para ajudar designers juniores a parear famílias tipográficas.
`,
    },
    {
      titulo: "Integrar feedback de usuários beta no Kanban",
      status: "em-progresso",
      prioridade: "alta",
      prazo: dataEm3DiasStr,
      pomodoros_estimados: 3,
      pomodoros_realizados: 1,
      tags: ["feedback", "beta", "kanban", "demo"],
      corpo: `Triar sugestões recebidas por email e transformar em cards de melhoria.
`,
    },
    {
      titulo: "Atualizar biblioteca de ícones para formato Phosphor",
      status: "feito",
      prioridade: "baixa",
      pomodoros_estimados: 2,
      pomodoros_realizados: 2,
      concluida_em: dataMesPassadoStr,
      tags: ["icones", "design-system", "demo"],
      corpo: `Substituir ícones antigos por traços consistentes com peso regular e duotone.
`,
    },
    {
      titulo: "Criar componente de mapa mental interativo",
      status: "a-fazer",
      prioridade: "media",
      prazo: dataEm14DiasStr,
      pomodoros_estimados: 5,
      pomodoros_realizados: 0,
      tags: ["lousa", "excalidraw", "mapa-mental", "demo"],
      corpo: `Explorar canvas livre para brainstorm e estruturação de ideias complexas.
`,
    },
    {
      titulo: "Ajustar espaçamento da barra lateral colapsada",
      status: "feito",
      prioridade: "urgente",
      pomodoros_estimados: 1,
      pomodoros_realizados: 1,
      concluida_em: dataHojeStr,
      tags: ["bugfix", "sidebar", "ui", "demo"],
      corpo: `Remover scrollbar cinza e centralizar perfeitamente os ícones em 40x40px.
`,
    },
    {
      titulo: "Revisar backlog de entregas para o ciclo de avaliação",
      status: "em-progresso",
      prioridade: "alta",
      prazo: dataAmanhaStr,
      pomodoros_estimados: 2,
      pomodoros_realizados: 1,
      tags: ["pdi", "carreira", "avaliacao", "demo"],
      corpo: `Consolidar impactos e depoimentos na aba de PDI para apresentação à diretoria.
`,
    },
  ];

  for (const t of tarefasDef) {
    itens.push({
      caminho: `${PASTAS.tarefas}/${t.titulo}.md`,
      mensagemCommit: `tarefa(demo): ${t.titulo.toLowerCase()}`,
      conteudo: escreverMarkdown({
        dados: {
          id: t.titulo.toLowerCase().replace(/[^a-z0-9]/g, "-"),
          tipo: "tarefa",
          titulo: t.titulo,
          status: t.status,
          prioridade: t.prioridade,
          prazo: t.prazo,
          pomodoros_estimados: t.pomodoros_estimados,
          pomodoros_realizados: t.pomodoros_realizados,
          criado_em: dataSemanaPassadaStr,
          concluida_em: t.concluida_em,
          atualizado_em: agora,
          tags: t.tags,
          demo: true,
        },
        corpo: t.corpo,
      }),
    });
  }

  // =========================================================================
  // 3. METAS PDI (8 metas)
  // =========================================================================
  const metasDef = [
    {
      titulo: "Evolução em Design Ops e Tokens",
      status: "em-andamento",
      indicador: "Tokens 100% integrados no Figma e código com documentação ativa",
      prazo: "2026-12-31",
      tags: ["pdi", "design-ops", "tokens", "demo"],
      corpo: `Consolidar a esteira de Design Ops, automatizando a sincronização de variáveis do Figma para tokens CSS/JSON.`,
    },
    {
      titulo: "Liderança Técnica e Mentorias de Design",
      status: "em-andamento",
      indicador: "Realizar 6 sessões de mentoria e 2 workshops de design",
      prazo: "2026-11-30",
      tags: ["pdi", "lideranca", "mentoria", "demo"],
      corpo: `Apoiar o crescimento do time através de 1:1s focadas em carreira, boas práticas de UI e arquitetura visual.`,
    },
    {
      titulo: "Domínio de Ferramentas de Motion e Prototipagem",
      status: "concluida",
      indicador: "Publicar 3 micro-animações completas no produto",
      prazo: "2026-08-30",
      tags: ["pdi", "motion", "prototipagem", "demo"],
      corpo: `Aprofundar em princípios de animação para interfaces (easing curves, timing, feedback tátil).`,
    },
    {
      titulo: "Conformidade Total com Acessibilidade (WCAG AA)",
      status: "em-andamento",
      indicador: "100% dos componentes certificados com nota máxima em contraste e navegação por teclado",
      prazo: "2026-10-31",
      tags: ["pdi", "acessibilidade", "qualidade", "demo"],
      corpo: `Elevar a acessibilidade a pilar inegociável em todos os novos fluxos desenvolvidos.`,
    },
    {
      titulo: "Produção de Conteúdo e Autoridade Técnica",
      status: "em-andamento",
      indicador: "Publicar 4 artigos aprofundados no Medium e LinkedIn",
      prazo: "2026-12-15",
      tags: ["pdi", "artigos", "comunidade", "demo"],
      corpo: `Compartilhar aprendizados práticos sobre o uso do Segundo Cérebro e design systems com a comunidade.`,
    },
    {
      titulo: "Otimização de Performance e Assets Digitais",
      status: "concluida",
      indicador: "Reduzir o peso total de carregamento das páginas em 40%",
      prazo: "2026-07-31",
      tags: ["pdi", "performance", "web", "demo"],
      corpo: `Adotar formatos modernos de compressão de imagem (AVIF/WebP) e SVGs otimizados.`,
    },
    {
      titulo: "Pesquisa Contínua com Usuários e Métricas UX",
      status: "em-andamento",
      indicador: "Conduzir 10 testes de usabilidade gravados com relatórios estruturados",
      prazo: "2026-11-15",
      tags: ["pdi", "pesquisa", "ux", "demo"],
      corpo: `Fundamentar todas as decisões de layout em dados reais de navegação e atrito de usuário.`,
    },
    {
      titulo: "Exploração de IA Generativa Aplicada ao Design",
      status: "pausada",
      indicador: "Criar pipeline de geração de moodboards automatizados com Gemini",
      prazo: "2026-12-31",
      tags: ["pdi", "ia", "inovacao", "demo"],
      corpo: `Integrar ferramentas de IA para acelerar a fase divergente de ideação visual.`,
    },
  ];

  for (const m of metasDef) {
    itens.push({
      caminho: `${PASTAS.metas}/${m.titulo}.md`,
      mensagemCommit: `pdi(demo): meta ${m.titulo.toLowerCase()}`,
      conteudo: escreverMarkdown({
        dados: {
          id: m.titulo.toLowerCase().replace(/[^a-z0-9]/g, "-"),
          tipo: "meta",
          titulo: m.titulo,
          status: m.status,
          indicador: m.indicador,
          prazo: m.prazo,
          criado_em: data2SemanasAtrasStr,
          atualizado_em: agora,
          criado_por: autor,
          tags: m.tags,
          demo: true,
        },
        corpo: m.corpo,
      }),
    });
  }

  // =========================================================================
  // 4. ENTREGAS PDI / BRAG DOCUMENT (12 entregas com métricas e elogios)
  // =========================================================================
  const entregasDef = [
    {
      titulo: "Lançamento do Design System V2",
      data: "2026-08-15",
      metas: ["Evolução em Design Ops e Tokens"],
      conquista: "Lançamento oficial da biblioteca de componentes V2 para 4 squads de produto",
      impacto: "Redução de 40% no tempo de criação de novas telas e zero divergência de estilos",
      elogio: "A nova versão dos componentes elevou absurdamente o padrão visual e a velocidade do time.",
      autor_elogio: "Mariana Costa",
      tags: ["design-system", "design-ops", "demo"],
      corpo: `Entrega de alta relevância que unificou a linguagem visual entre mobile e web.`,
    },
    {
      titulo: "Workshop de Acessibilidade para Desenvolvedores",
      data: "2026-08-28",
      metas: ["Liderança Técnica e Mentorias de Design", "Conformidade Total com Acessibilidade (WCAG AA)"],
      conquista: "Workshop prático ministrado para 15 desenvolvedores frontend e QA",
      impacto: "Criação de testes automatizados de acessibilidade no pipeline de CI",
      elogio: "O workshop mudou a nossa forma de codificar componentes. Excelente didática!",
      autor_elogio: "Rodrigo Silva",
      tags: ["workshop", "acessibilidade", "mentoria", "demo"],
      corpo: `Treinamento com foco em ARIA attributes, navegação por teclado e testes com leitores de tela.`,
    },
    {
      titulo: "Redesign da Experiência de Checkout Mobile",
      data: "2026-09-01",
      metas: ["Pesquisa Contínua com Usuários e Métricas UX"],
      conquista: "Redesign completo do fluxo de compra em 3 passos simplificados",
      impacto: "+18% na taxa de conversão final e queda de 30% no abandono de carrinho",
      elogio: "Os clientes elogiaram muito a facilidade de finalizar pedidos pelo celular.",
      autor_elogio: "Beatriz Mendes",
      tags: ["checkout", "ux", "mobile", "demo"],
      corpo: `Eliminação de campos redundantes e implementação de preenchimento automático.`,
    },
    {
      titulo: "Publicação do Guia de Micro-Interações em Lottie",
      data: "2026-08-10",
      metas: ["Domínio de Ferramentas de Motion e Prototipagem"],
      conquista: "Biblioteca de 20 animações prontas e documentadas para o time de frontend",
      impacto: "Sensação premium de polimento e feedback visual imediato em cliques",
      elogio: "As animações deixaram o produto muito mais fluido e agradável de usar.",
      autor_elogio: "Lucas Ferreira",
      tags: ["motion", "lottie", "animacao", "demo"],
      corpo: `Animações vetoriais ultraleves com menos de 15kb cada.`,
    },
    {
      titulo: "Otimização Global de Imagens e Assets",
      data: "2026-07-25",
      metas: ["Otimização de Performance e Assets Digitais"],
      conquista: "Implementação de pipeline automático de conversão para WebP/AVIF",
      impacto: "Economia de 60% de banda nos servidores e carregamento 2x mais rápido",
      tags: ["performance", "assets", "dev", "demo"],
      corpo: `Redução drástica no tempo de renderização em conexões 3G/4G.`,
    },
    {
      titulo: "Mentoria de UI Design para Designers Juniores",
      data: "2026-08-05",
      metas: ["Liderança Técnica e Mentorias de Design"],
      conquista: "Ciclo de 8 encontros semanais individuais sobre grids, tipografia e auto-layout",
      impacto: "Aceleração no tempo de onboarding de 2 novos designers do time",
      elogio: "A mentoria do Hugo foi fundamental para eu ganhar confiança nas entregas de UI.",
      autor_elogio: "Camila Duarte",
      tags: ["mentoria", "lideranca", "onboarding", "demo"],
      corpo: `Apoio contínuo e feedbacks detalhados em pranchas de projeto.`,
    },
    {
      titulo: "Palestra Interna sobre Tipografia Suíça e Grids Modulares",
      data: "2026-07-15",
      metas: ["Produção de Conteúdo e Autoridade Técnica"],
      conquista: "Apresentação para 40 profissionais das áreas de design, produto e engenharia",
      impacto: "Alinhamento conceitual sobre a importância da estrutura visual matemática",
      elogio: "Uma das melhores apresentações conceituais que já tivemos na empresa!",
      autor_elogio: "Mariana Costa",
      tags: ["palestra", "tipografia", "design", "demo"],
      corpo: `Exemplos práticos de aplicação de proporções áureas e grids responsivos.`,
    },
    {
      titulo: "Mapeamento Completo de Tokens no Figma e Código",
      data: "2026-08-20",
      metas: ["Evolução em Design Ops e Tokens"],
      conquista: "Mais de 180 tokens de cores, tipografia, elevações e raios de borda mapeados",
      impacto: "Troca de tema (dark/light) instantânea em qualquer tela da plataforma",
      tags: ["design-tokens", "figma", "dev", "demo"],
      corpo: `Sincronização bidirecional entre Figma Variables e arquivos de estilo do repositório.`,
    },
    {
      titulo: "Redesign do Painel Administrativo",
      data: "2026-06-30",
      metas: ["Pesquisa Contínua com Usuários e Métricas UX"],
      conquista: "Novo layout de tabelas de dados com filtros rápidos e visualização em grade",
      impacto: "Redução de 50% no tempo gasto por operadores para localizar registros",
      tags: ["dashboard", "admin", "ui", "demo"],
      corpo: `Interface compacta de alta densidade de dados com contraste otimizado.`,
    },
    {
      titulo: "Artigo: A Revolução dos Design Tokens na Prática",
      data: "2026-08-01",
      metas: ["Produção de Conteúdo e Autoridade Técnica"],
      conquista: "Artigo publicado com mais de 3.500 leituras e 400 aplausos no Medium",
      impacto: "Fortalecimento do employer branding da equipe de design",
      tags: ["artigo", "medium", "conteudo", "demo"],
      corpo: `Artigo detalhado com diagramas e trechos de código práticos.`,
    },
    {
      titulo: "Auditoria Completa de Componentes Obsoletos",
      data: "2026-07-10",
      metas: ["Evolução em Design Ops e Tokens"],
      conquista: "Remoção de 35 componentes legados e duplicados da base de código",
      impacto: "Redução de 120kb no bundle JavaScript final",
      tags: ["refactoring", "limpeza", "qualidade", "demo"],
      corpo: `Unificação de botões e cartões sob os novos padrões globais.`,
    },
    {
      titulo: "Kit de Boas-Vindas e Onboarding Interativo",
      data: "2026-08-25",
      metas: ["Liderança Técnica e Mentorias de Design"],
      conquista: "Criação de cofre modelo com tutoriais práticos no Segundo Cérebro",
      impacto: "Novos colaboradores aprendem o fluxo de trabalho em menos de 2 dias",
      tags: ["onboarding", "documentacao", "demo"],
      corpo: `Checklist passo a passo cobrindo ferramentas, repositórios e cultura da empresa.`,
    },
  ];

  for (const e of entregasDef) {
    const slug = e.titulo.toLowerCase().replace(/[^a-z0-9]/g, "-");
    itens.push({
      caminho: `${PASTAS.entregas}/${e.data}-${slug}.md`,
      mensagemCommit: `pdi(demo): entrega ${e.titulo.toLowerCase()}`,
      conteudo: escreverMarkdown({
        dados: {
          id: slug,
          tipo: "entrega",
          titulo: e.titulo,
          data: e.data,
          metas: e.metas,
          conquista: e.conquista,
          impacto: e.impacto,
          elogio: e.elogio,
          autor_elogio: e.autor_elogio,
          criado_em: e.data,
          atualizado_em: agora,
          tags: e.tags,
          demo: true,
        },
        corpo: e.corpo,
      }),
    });
  }

  // =========================================================================
  // 5. CONTATOS (12 contatos organizados em árvore hierárquica rica)
  // =========================================================================
  const contatosDef = [
    // Nível 1: Diretoria Executiva
    {
      id: "mariana-costa",
      titulo: "Mariana Costa",
      cargo: "Diretora de Criação & Marca",
      empresa: "Studio Alpha",
      email: "mariana.costa@studioalpha.com",
      telefone: "+55 11 98888-1111",
      tags: ["diretoria", "design", "lideranca", "executivo", "demo"],
      corpo: `Líder da área criativa e membro do conselho executivo. Responsável pelo posicionamento global da marca.`,
    },
    {
      id: "fernando-albuquerque",
      titulo: "Fernando Albuquerque",
      cargo: "VP de Produto & Tecnologia",
      empresa: "Studio Alpha",
      email: "fernando.a@studioalpha.com",
      telefone: "+55 11 98888-2222",
      tags: ["diretoria", "produto", "tech", "executivo", "demo"],
      corpo: `Líder das operações de produto, dados e engenharia da organização.`,
    },

    // Nível 2: Liderança Técnica e Gerência (subordinados a Mariana ou Fernando)
    {
      id: "lucas-ferreira",
      titulo: "Lucas Ferreira",
      cargo: "Lead Product Designer",
      empresa: "Studio Alpha",
      email: "lucas.ferreira@studioalpha.com",
      telefone: "+55 11 97777-1111",
      pai_id: "mariana-costa",
      tags: ["design", "lead", "ui", "design-ops", "demo"],
      corpo: `Responsável pela squad de Core Experience e arquitetura do Design System.`,
    },
    {
      id: "rodrigo-silva",
      titulo: "Rodrigo Silva",
      cargo: "Tech Lead Frontend",
      empresa: "Studio Alpha",
      email: "rodrigo.silva@studioalpha.com",
      telefone: "+55 11 97777-2222",
      pai_id: "fernando-albuquerque",
      tags: ["tech", "frontend", "lead", "engenharia", "demo"],
      corpo: `Ponto focal técnico para implementação de tokens, micro-frontends e performance web.`,
    },
    {
      id: "beatriz-mendes",
      titulo: "Beatriz Mendes",
      cargo: "Group Product Manager (GPM)",
      empresa: "Studio Alpha",
      email: "beatriz.mendes@studioalpha.com",
      telefone: "+55 11 97777-3333",
      pai_id: "fernando-albuquerque",
      tags: ["produto", "pm", "estrategia", "demo"],
      corpo: `Gerencia a estratégia e os roadmaps dos squads de crescimento e conversão.`,
    },

    // Nível 3: Especialistas e Designers Seniores/Plenos
    {
      id: "camila-duarte",
      titulo: "Camila Duarte",
      cargo: "Senior UI & Motion Designer",
      empresa: "Studio Alpha",
      email: "camila.duarte@studioalpha.com",
      telefone: "+55 11 96666-1111",
      pai_id: "lucas-ferreira",
      tags: ["ui", "motion", "design", "senior", "demo"],
      corpo: `Especialista em animações Lottie, iconografia e micro-interações de interface.`,
    },
    {
      id: "gabriel-santos",
      titulo: "Gabriel Santos",
      cargo: "Senior Product Designer (UX)",
      empresa: "Studio Alpha",
      email: "gabriel.santos@studioalpha.com",
      telefone: "+55 11 96666-2222",
      pai_id: "lucas-ferreira",
      tags: ["ux", "pesquisa", "testes", "senior", "demo"],
      corpo: `Conduz pesquisas qualitativas com usuários e protótipos de teste de usabilidade.`,
    },
    {
      id: "juliana-paiva",
      titulo: "Juliana Paiva",
      cargo: "Senior Frontend Engineer",
      empresa: "Studio Alpha",
      email: "juliana.paiva@studioalpha.com",
      telefone: "+55 11 96666-3333",
      pai_id: "rodrigo-silva",
      tags: ["frontend", "react", "typescript", "demo"],
      corpo: `Desenvolvedora especialista em React, acessibilidade web (A11y) e design systems.`,
    },
    {
      id: "andre-martins",
      titulo: "André Martins",
      cargo: "Product Marketing Manager",
      empresa: "Studio Alpha",
      email: "andre.martins@studioalpha.com",
      telefone: "+55 11 96666-4444",
      pai_id: "beatriz-mendes",
      tags: ["marketing", "pmm", "lancamentos", "demo"],
      corpo: `Coordena as campanhas de lançamento de produto e comunicação com clientes beta.`,
    },

    // Nível 4: Designers em Desenvolvimento e Parceiros Externos
    {
      id: "tiago-lima",
      titulo: "Tiago Lima",
      cargo: "Junior Product Designer",
      empresa: "Studio Alpha",
      email: "tiago.lima@studioalpha.com",
      telefone: "+55 11 95555-1111",
      pai_id: "camila-duarte",
      tags: ["junior", "ui", "design", "demo"],
      corpo: `Designer em mentoria focado em expansão de telas secundárias e documentação de componentes.`,
    },
    {
      id: "larissa-rocha",
      titulo: "Larissa Rocha",
      cargo: "Design Researcher",
      empresa: "Studio Alpha",
      email: "larissa.rocha@studioalpha.com",
      telefone: "+55 11 95555-2222",
      pai_id: "gabriel-santos",
      tags: ["pesquisa", "ux", "entrevistas", "demo"],
      corpo: `Apoia a aplicação de questionários, análise de heatmaps e síntese de feedbacks de clientes.`,
    },
    {
      id: "victor-hugo-freelancer",
      titulo: "Victor Hugo (3D Artist)",
      cargo: "Artista 3D & Ilustrador Externo",
      empresa: "Freelance Creative",
      email: "victor.3d@freelance.art",
      telefone: "+55 21 99999-8888",
      tags: ["3d", "ilustracao", "freelance", "parceiro", "demo"],
      corpo: `Parceiro criativo externo responsável pelas ilustrações conceituais da campanha de fim de ano.`,
    },
  ];

  for (const c of contatosDef) {
    itens.push({
      caminho: `${PASTAS.contatos}/${c.id}.md`,
      mensagemCommit: `contato(demo): ${c.titulo.toLowerCase()}`,
      conteudo: escreverMarkdown({
        dados: {
          id: c.id,
          tipo: "contato",
          titulo: c.titulo,
          cargo: c.cargo,
          empresa: c.empresa,
          email: c.email,
          telefone: c.telefone,
          pai_id: (c as any).pai_id || "",
          tags: c.tags,
          criado_em: agora,
          atualizado_em: agora,
          demo: true,
        },
        corpo: c.corpo,
      }),
    });
  }

  // =========================================================================
  // 6. REFERÊNCIAS VISUAIS (10 referências com paletas ricas)
  // =========================================================================
  const referenciasDef = [
    {
      titulo: "Pôster Bauhaus Geométrico",
      autor: "Herbert Bayer",
      paleta: ["#D9381E", "#0F4C81", "#F5DF4D", "#1C1C1C", "#F4F4F0"],
      tags: ["bauhaus", "poster", "geometria", "classico", "demo"],
      corpo: `Estudo clássico de composição assimétrica e cores primárias com forte peso tipográfico.`,
    },
    {
      titulo: "Grid Editorial Suíço Minimalista",
      autor: "Josef Müller-Brockmann",
      paleta: ["#E5E5E5", "#111111", "#FF3300", "#777777", "#FFFFFF"],
      tags: ["suico", "grid", "editorial", "minimalismo", "demo"],
      corpo: `Referência para estruturação de diagramações modulares com ritmo e harmonia visual.`,
    },
    {
      titulo: "Dashboard Dark Glassmorphism",
      autor: "Studio Alpha Design",
      paleta: ["#0B0E14", "#1F2430", "#73B7F2", "#8A5CF6", "#F07178"],
      tags: ["ui", "dark", "glassmorphism", "dashboard", "demo"],
      corpo: `Inspiração de interface com camadas translúcidas, desfoque de fundo e bordas sutis luminosas.`,
    },
    {
      titulo: "Paleta Retrô Futurista Cyberpunk",
      autor: "Syd Mead Tribute",
      paleta: ["#0D0221", "#0F084B", "#26408B", "#A6CFD5", "#C2E7D9"],
      tags: ["cyberpunk", "retro", "neon", "cores", "demo"],
      corpo: `Gradientes profundos de azul e ciano sobre fundos escuros de alto contraste.`,
    },
    {
      titulo: "Design de Embalagem Orgânica Japonesa",
      autor: "Kenya Hara",
      paleta: ["#F5F2EB", "#D8C3A5", "#8E8D8A", "#E98074", "#E85A4F"],
      tags: ["japones", "minimalismo", "embalagem", "organico", "demo"],
      corpo: `Texturas naturais de papel artesanal, tons terrosos suaves e tipografia vertical sutil.`,
    },
    {
      titulo: "Identidade Visual Monocromática com Destaque Neon",
      autor: "Pentagram NYC",
      paleta: ["#000000", "#1A1A1A", "#333333", "#CCFF00", "#FFFFFF"],
      tags: ["branding", "neon", "monocromatico", "editorial", "demo"],
      corpo: `Uso inteligente do verde-limão neon como único ponto focal sobre base preta e branca.`,
    },
    {
      titulo: "Ilustração Isométrica em 3D Minimalista",
      autor: "Peter Tarka",
      paleta: ["#FFE5D9", "#FFCAD4", "#B5E2FA", "#0FA3B1", "#F7A072"],
      tags: ["3d", "isometrico", "ilustracao", "pastel", "demo"],
      corpo: `Volumes geométricos limpos com iluminação difusa suave e cores pastel acolhedoras.`,
    },
    {
      titulo: "Tipografia Cinética e Motion Posters",
      autor: "Dia Studio",
      paleta: ["#000000", "#FFFFFF", "#FF0055", "#00FF66", "#0066FF"],
      tags: ["motion", "tipografia", "cinetica", "poster", "demo"],
      corpo: `Letras distorcidas dinamicamente por algoritmos de física e ondas sonoras.`,
    },
    {
      titulo: "Design de Interface Brutalista para Web3",
      autor: "Bento Studio",
      paleta: ["#E0E0E0", "#000000", "#FF4400", "#222222", "#AAAAAA"],
      tags: ["brutalismo", "web3", "ui", "bold", "demo"],
      corpo: `Bordas pretas espessas, fontes monoespaçadas cruas e sombras duras sem desfoque.`,
    },
    {
      titulo: "Composição Fotográfica Editorial com Alto Contraste",
      autor: "Vivian Maier Archive",
      paleta: ["#0A0A0A", "#262626", "#525252", "#A3A3A3", "#F5F5F5"],
      tags: ["fotografia", "pretoebranco", "editorial", "demo"],
      corpo: `Equilíbrio impecável de luzes e sombras em fotografia de rua em preto e branco.`,
    },
  ];

  for (const r of referenciasDef) {
    itens.push({
      caminho: `${PASTAS.referencias}/${r.titulo}.md`,
      mensagemCommit: `ref(demo): ${r.titulo.toLowerCase()}`,
      conteudo: escreverMarkdown({
        dados: {
          id: r.titulo.toLowerCase().replace(/[^a-z0-9]/g, "-"),
          tipo: "referencia",
          titulo: r.titulo,
          autor: r.autor,
          paleta: r.paleta,
          tags: r.tags,
          criado_em: agora,
          atualizado_em: agora,
          demo: true,
        },
        corpo: r.corpo,
      }),
    });
  }

  return itens;
}

/**
 * Grava todos os itens de demonstração no repositório GitHub.
 */
export async function popularKlausComDadosDemo(
  cfg: Settings,
  aoProgredir?: (atual: number, total: number, caminho: string) => void
): Promise<{ sucessos: number; falhas: string[] }> {
  const itens = gerarItensDemo(cfg.nomeUsuario);
  let sucessos = 0;
  const falhas: string[] = [];

  for (let i = 0; i < itens.length; i++) {
    const item = itens[i];
    if (aoProgredir) aoProgredir(i + 1, itens.length, item.caminho);

    try {
      await gravar(cfg, item.caminho, item.conteudo, undefined, item.mensagemCommit);
      sucessos++;
    } catch (e: any) {
      falhas.push(`${item.caminho}: ${e?.message || e}`);
    }
  }

  if (sucessos > 0) {
    invalidarCache();
  }

  return { sucessos, falhas };
}

/**
 * Identifica e remove todos os arquivos de demonstração do repositório.
 */
export async function apagarTodosDadosDemo(
  cfg: Settings,
  itensRepo: ItemRepo[],
  aoProgredir?: (atual: number, total: number, caminho: string) => void
): Promise<{ apagados: number; falhas: string[] }> {
  // Localiza itens com a marcação demo no frontmatter ou tags
  const itensParaApagar = itensRepo.filter((item) => {
    if (!item.doc) return false;
    const d = item.doc.dados || {};
    const tags = Array.isArray(d.tags) ? d.tags.map(String) : [];
    return d.demo === true || tags.includes("demo");
  });

  let apagados = 0;
  const falhas: string[] = [];

  for (let i = 0; i < itensParaApagar.length; i++) {
    const item = itensParaApagar[i];
    if (aoProgredir) aoProgredir(i + 1, itensParaApagar.length, item.caminho);

    try {
      await apagar(cfg, item.caminho, item.sha);
      apagados++;
    } catch (e: any) {
      falhas.push(`${item.caminho}: ${e?.message || e}`);
    }
  }

  if (apagados > 0) {
    invalidarCache();
  }

  return { apagados, falhas };
}
